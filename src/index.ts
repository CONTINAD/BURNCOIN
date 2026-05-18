import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { config } from "./config";
import {
  loadCreatorWallet,
  loadBuyerWallet,
  getSolBalance,
  getMintSupplyUi,
  connection,
} from "./wallet";
import { RewardsClaimer } from "./claim-rewards";
import { forwardLamports } from "./forwarder";
import { BuybackBurner } from "./buyback";
import { tracker } from "./activity";
import { startDashboard } from "./dashboard";
import { waitForCreatedMint } from "./mint-watcher";
import { logger } from "./logger";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  logger.info("=== $BURN — claim → buyback → INCINERATE → repeat ===");

  const creator = loadCreatorWallet();
  const buyer = loadBuyerWallet();

  logger.info(`Creator wallet:    ${creator.publicKey.toBase58()}`);
  logger.info(`Buyer wallet:      ${buyer.publicKey.toBase58()}${config.singleWalletMode ? "  (same — single-wallet mode)" : ""}`);
  logger.info(`Marketing wallet:  ${config.marketingWallet || "(unset — 100% burn)"}`);
  logger.info(`Cycle:             every ${config.cycleIntervalSeconds}s`);
  logger.info(
    `Split:             ${config.buybackPercent}% buyback+burn 🔥 · ${config.marketingPercent}% marketing`
  );

  if (tracker.resetIfWalletChanged(creator.publicKey.toBase58())) {
    logger.info("Creator wallet differs from persisted state — wiped dashboard counters for a fresh start.");
  }

  if (process.env.RESET_STATE === "1") {
    tracker.forceReset();
    logger.info("RESET_STATE=1 — wiped all persisted state. Unset this env var now or it will wipe again on every boot.");
  }

  {
    const topup = tracker.applyPoolTopup(process.env.TOPUP_POOL_LAMPORTS);
    if (topup.applied) {
      logger.info(`TOPUP_POOL_LAMPORTS applied: +${topup.lamports} lamports (${(topup.lamports / 1e9).toFixed(4)} SOL) added to claim pool.`);
    }
  }

  let burnMintStr = config.burnMint;
  const cached = tracker.snapshot().burnMint;
  if (!burnMintStr && cached && cached.length > 32) {
    burnMintStr = cached;
    logger.info(`Resuming with previously detected $BURN: ${burnMintStr}`);
  }

  tracker.setIdentity({
    creatorWallet: creator.publicKey.toBase58(),
    buyerWallet: buyer.publicKey.toBase58(),
    marketingWallet: config.marketingWallet || creator.publicKey.toBase58(),
    burnMint: burnMintStr || "",
  });

  startDashboard();
  logger.info(`Dashboard live at http://localhost:${config.port}`);

  if (!burnMintStr) {
    tracker.setStatus("watching");
    tracker.recordInfo(`Watching ${creator.publicKey.toBase58()} for pump.fun $BURN launch…`);
    logger.info(`Auto-detect mode: polling for token creation every ${config.mintWatchPollSeconds}s`);
    burnMintStr = await waitForCreatedMint(
      connection,
      creator.publicKey,
      config.mintWatchPollSeconds,
      (n) => {
        if (n === 1 || n % 5 === 0) tracker.recordInfo(`Still watching for token creation… (poll #${n})`);
      }
    );
    tracker.recordInfo(`Detected $BURN mint: ${burnMintStr} — the furnace is lit.`);
    tracker.setIdentity({
      creatorWallet: creator.publicKey.toBase58(),
      buyerWallet: buyer.publicKey.toBase58(),
      marketingWallet: config.marketingWallet || creator.publicKey.toBase58(),
      burnMint: burnMintStr,
    });
  }

  const burnMint = new PublicKey(burnMintStr);
  logger.info(`$BURN mint:        ${burnMint.toBase58()}`);

  const claimer = new RewardsClaimer(creator);
  const burner = new BuybackBurner(buyer, burnMint);
  const marketingPubkey = config.marketingWallet
    ? new PublicKey(config.marketingWallet)
    : creator.publicKey;

  const updateBalances = async () => {
    const [creatorSol, buyerSol] = await Promise.all([
      getSolBalance(creator.publicKey),
      getSolBalance(buyer.publicKey),
    ]);
    tracker.updateBalances({ creatorSol, buyerSol });
    return { creatorSol, buyerSol };
  };

  const refreshSupply = async () => {
    try {
      const s = await getMintSupplyUi(burnMint);
      tracker.setSupply(s.uiAmount, s.decimals);
    } catch {
      /* swallow — next cycle will retry */
    }
  };

  await updateBalances();
  await refreshSupply();

  const runCycle = async () => {
    try {
      tracker.cycleStart();

      // ── 1. Claim creator fees ────────────────────────────────────────────
      // Measure exact lamports gained via a before/after balance read on the
      // creator wallet. This is the ONLY money the bot will touch this cycle.
      const balBeforeLamports = Math.floor(
        (await getSolBalance(creator.publicKey)) * LAMPORTS_PER_SOL
      );
      const claimSig = await claimer.claim();
      let claimedLamports = 0;

      if (claimSig) {
        await sleep(3000);
        const balAfterLamports = Math.floor(
          (await getSolBalance(creator.publicKey)) * LAMPORTS_PER_SOL
        );
        claimedLamports = Math.max(0, balAfterLamports - balBeforeLamports);
        if (claimedLamports > 0) {
          const claimedSol = claimedLamports / LAMPORTS_PER_SOL;
          tracker.recordClaim(claimedSol, claimSig);
          tracker.creditClaimPool(claimedLamports);
          logger.info(`Claim pool now: ${(tracker.getClaimPool() / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
        } else {
          tracker.recordInfo("Claim tx submitted but no SOL delta detected.");
        }
      } else {
        tracker.recordInfo("No creator fees to claim this cycle.");
      }

      // ── 2. Forward EXACTLY the claimed lamports to the buyer ─────────────
      // The creator wallet's pre-existing SOL is never touched. Single-wallet
      // mode skips the forward entirely (same wallet does buyback).
      if (claimedLamports > 0 && !config.singleWalletMode) {
        const fwd = await forwardLamports(creator, buyer.publicKey, claimedLamports);
        if (fwd.signature) tracker.recordForward(fwd.lamports / LAMPORTS_PER_SOL, fwd.signature);
      } else if (claimedLamports > 0) {
        tracker.recordInfo("Single-wallet mode — claimed SOL stays in the same wallet (no forward needed).");
      }

      await updateBalances();

      // ── 3. Split the claim pool ──────────────────────────────────────────
      const pool = tracker.getClaimPool();
      const totalPct = Math.max(1, config.buybackPercent + config.marketingPercent);
      const buybackPct = Math.max(0, Math.min(100, config.buybackPercent));
      let buybackLamports = Math.floor((pool * buybackPct) / totalPct);
      let marketingLamports = pool - buybackLamports;

      const buybackSol = buybackLamports / LAMPORTS_PER_SOL;
      const marketingSol = marketingLamports / LAMPORTS_PER_SOL;
      logger.info(
        `Pool ${(pool / LAMPORTS_PER_SOL).toFixed(6)} SOL · ` +
        `buyback ${buybackSol.toFixed(6)} (${config.buybackPercent}%) 🔥 · ` +
        `marketing ${marketingSol.toFixed(6)} (${config.marketingPercent}%)`
      );

      // ── 4. Marketing routing (if configured) ─────────────────────────────
      const shouldRouteMarketing =
        marketingLamports > 0 &&
        config.marketingWallet &&
        !config.singleWalletMode &&
        !marketingPubkey.equals(buyer.publicKey);
      if (shouldRouteMarketing) {
        const fwd = await forwardLamports(buyer, marketingPubkey, marketingLamports);
        if (fwd.signature) {
          tracker.recordMarketing(fwd.lamports / LAMPORTS_PER_SOL, fwd.signature);
          tracker.debitClaimPool(marketingLamports);
        } else {
          tracker.recordInfo(`Marketing send failed — slice stays in buyer wallet, will retry next cycle.`);
        }
      } else if (marketingLamports > 0) {
        // Either no marketing wallet set OR single-wallet mode — slice just
        // stays put and we deduct it from the pool.
        tracker.debitClaimPool(marketingLamports);
      }

      // ── 5. Buyback + INCINERATE ──────────────────────────────────────────
      if (buybackLamports <= 0) {
        tracker.recordInfo("No buyback slice this cycle (pool empty).");
        return;
      }
      if (buybackSol < config.minBuybackSol) {
        tracker.recordInfo(
          `Buyback slice ${buybackSol.toFixed(6)} SOL below min ${config.minBuybackSol} — carrying over.`
        );
        return;
      }

      tracker.startBurnAnimation(buybackSol);
      try {
        const result = await burner.buybackAndBurn(buybackSol);
        tracker.markBurnPhase(result.buyTx);
        tracker.recordBurn({
          solSpent: result.solSpent,
          tokensBurnedUi: result.tokensBurnedUi,
          buyTx: result.buyTx,
          burnTx: result.burnTx,
        });
        // Debit pool by ACTUAL SOL spent (delta), capped at the slice we
        // allocated — leftover stays in the pool for next cycle.
        const spentLamports = Math.floor(result.solSpent * LAMPORTS_PER_SOL);
        tracker.debitClaimPool(Math.min(spentLamports, buybackLamports));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error(`Buyback/burn failed: ${msg}`);
        tracker.markBurnFailed(msg);
        // Pool not debited — buyback slice carries over to next cycle.
      }

      await updateBalances();
      await refreshSupply();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error && e.stack ? `\n${e.stack}` : "";
      tracker.recordError(`Cycle error: ${msg}`);
      logger.error(`Cycle error: ${msg}${stack}`);
    } finally {
      tracker.setStatus("idle");
      const next = Date.now() + config.cycleIntervalSeconds * 1000;
      tracker.setNextCycleAt(next);
    }
  };

  let stopping = false;
  const loop = async () => {
    while (!stopping) {
      await runCycle();
      await sleep(config.cycleIntervalSeconds * 1000);
    }
  };
  loop().catch((e) => logger.error(`Loop crashed: ${e instanceof Error ? e.message : e}`));

  process.on("SIGINT", () => {
    stopping = true;
    tracker.setStatus("stopped");
    logger.info("Shutting down...");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stopping = true;
    tracker.setStatus("stopped");
    process.exit(0);
  });
}

main().catch((e) => {
  logger.error(`Fatal: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
