import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createBurnCheckedInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { connection, getSolBalance, getTokenBalanceRaw } from "./wallet";
import { config } from "./config";
import { logger } from "./logger";

export interface BuybackResult {
  buyTx: string;
  burnTx: string;
  solSpent: number;
  tokensBurnedRaw: bigint;
  tokensBurnedUi: number;
  decimals: number;
}

export class BuybackBurner {
  constructor(private buyer: Keypair, private mint: PublicKey) {}

  async buybackAndBurn(solAmount: number): Promise<BuybackResult> {
    if (solAmount <= 0) throw new Error(`Refusing buyback of ${solAmount} SOL`);

    const { programId, decimals } = await this.detectTokenProgram();

    const balBeforeSol = await getSolBalance(this.buyer.publicKey);
    const tokensBefore = await getTokenBalanceRaw(this.buyer.publicKey, this.mint);

    const buyTx = await this.sendBuyWithRetries(solAmount);

    // Measure actual deltas — never trust the request amount.
    const balAfterSol = await getSolBalance(this.buyer.publicKey);
    const tokensAfter = await getTokenBalanceRaw(this.buyer.publicKey, this.mint);

    const solSpent = Math.max(0, balBeforeSol - balAfterSol);
    const tokensBoughtRaw = tokensAfter > tokensBefore ? tokensAfter - tokensBefore : 0n;

    if (tokensBoughtRaw <= 0n) {
      throw new Error(`Buy tx ${buyTx} confirmed but no token delta detected.`);
    }

    const tokensBurnedUi = Number(tokensBoughtRaw) / Math.pow(10, decimals);
    logger.info(
      `Bought ${tokensBurnedUi.toFixed(4)} $BURN for ${solSpent.toFixed(6)} SOL — incinerating now.`
    );

    const burnTx = await this.burnAll(tokensBoughtRaw, decimals, programId);
    await this.awaitConfirm(burnTx, "burn");

    logger.info(`🔥 Incinerated ${tokensBurnedUi.toFixed(4)} $BURN — supply reduced. tx ${burnTx}`);

    return {
      buyTx,
      burnTx,
      solSpent,
      tokensBurnedRaw: tokensBoughtRaw,
      tokensBurnedUi,
      decimals,
    };
  }

  private async detectTokenProgram(): Promise<{ programId: PublicKey; decimals: number }> {
    const info = await connection.getParsedAccountInfo(this.mint);
    if (!info.value) throw new Error(`Mint ${this.mint.toBase58()} not found.`);
    const programId = info.value.owner;
    if (
      !programId.equals(TOKEN_PROGRAM_ID) &&
      !programId.equals(TOKEN_2022_PROGRAM_ID)
    ) {
      throw new Error(`Mint owned by unexpected program: ${programId.toBase58()}`);
    }
    const data = info.value.data as { parsed?: { info?: { decimals?: number } } };
    const decimals = data?.parsed?.info?.decimals ?? 6;
    return { programId, decimals };
  }

  /**
   * Buyback retry chain: 6 attempts cycling through pump.fun's venues.
   * pool="auto" handles 99% of cases but during the brief migration window
   * (bonding curve closing, AMM not yet active) it can briefly fail. The
   * explicit pool fallbacks recover from that without manual intervention.
   *
   * Sequence:
   *   1. auto      — let PumpPortal pick (pre OR post-migration tokens)
   *   2. auto      — retry with 2x priority (transient mempool congestion)
   *   3. pump-amm  — PumpSwap explicitly (most graduated tokens)
   *   4. raydium   — Raydium explicitly (older graduated tokens)
   *   5. raydium-cpmm — Raydium CPMM (newer Raydium variant)
   *   6. auto      — one more shot at auto with max priority
   */
  private async sendBuyWithRetries(solAmount: number): Promise<string> {
    const pools = ["auto", "auto", "pump-amm", "raydium", "raydium-cpmm", "auto"] as const;
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= pools.length; attempt++) {
      const pool = pools[attempt - 1];
      const priority = config.priorityFee * Math.pow(2, Math.min(attempt - 1, 5)); // 1×,2×,4×,8×,16×,32×
      try {
        const sig = await this.sendBuyOnce(solAmount, priority, attempt, pool);
        const ok = await this.confirmWithHistoryFallback(sig);
        if (ok) {
          if (attempt > 1) logger.info(`Buy landed on attempt ${attempt}/${pools.length} via pool=${pool}.`);
          return sig;
        }
        logger.warn(`Buy attempt ${attempt}/${pools.length} (pool=${pool}) did not confirm — trying next pool/priority.`);
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        logger.warn(`Buy attempt ${attempt}/${pools.length} (pool=${pool}) threw: ${lastErr.message}`);
      }
      if (attempt < pools.length) await new Promise((r) => setTimeout(r, 1500));
    }
    throw lastErr || new Error(`buy did not confirm after ${pools.length} attempts across all pools`);
  }

  private async sendBuyOnce(
    solAmount: number,
    priority: number,
    attempt: number,
    pool: "auto" | "pump-amm" | "raydium" | "raydium-cpmm" | "pump"
  ): Promise<string> {
    const body = {
      publicKey: this.buyer.publicKey.toBase58(),
      action: "buy" as const,
      mint: this.mint.toBase58(),
      amount: solAmount,
      denominatedInSol: "true",
      slippage: config.buybackSlippagePct,
      priorityFee: priority,
      pool,
    };

    const r = await fetch("https://pumpportal.fun/api/trade-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`PumpPortal buy API ${r.status}: ${txt}`);
    }
    const tx = VersionedTransaction.deserialize(Buffer.from(await r.arrayBuffer()));
    const bh = await connection.getLatestBlockhash("confirmed");
    tx.message.recentBlockhash = bh.blockhash;
    tx.sign([this.buyer]);

    const sig = await connection.sendTransaction(tx, {
      skipPreflight: true,
      maxRetries: 5,
    });
    logger.info(`Buy tx submitted (attempt ${attempt}, pool=${pool}, priority ${priority.toFixed(4)} SOL): ${sig.slice(0, 16)}…`);
    return sig;
  }

  private async confirmWithHistoryFallback(sig: string): Promise<boolean> {
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const s = await connection.getSignatureStatus(sig, { searchTransactionHistory: true });
        const v = s.value;
        if (!v) continue;
        if (v.err) return false;
        if (v.confirmationStatus === "confirmed" || v.confirmationStatus === "finalized") return true;
      } catch {
        /* transient */
      }
    }
    try {
      const s = await connection.getSignatureStatus(sig, { searchTransactionHistory: true });
      const v = s.value;
      if (v && !v.err && (v.confirmationStatus === "confirmed" || v.confirmationStatus === "finalized")) {
        return true;
      }
    } catch {
      /* swallow */
    }
    return false;
  }

  private async burnAll(
    amount: bigint,
    decimals: number,
    programId: PublicKey
  ): Promise<string> {
    const ata = await getAssociatedTokenAddress(
      this.mint,
      this.buyer.publicKey,
      false,
      programId
    );
    const burnIx = createBurnCheckedInstruction(
      ata,
      this.mint,
      this.buyer.publicKey,
      amount,
      decimals,
      [],
      programId
    );

    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 2_000 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      burnIx
    );
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = this.buyer.publicKey;
    tx.sign(this.buyer);

    return await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 5,
    });
  }

  private async awaitConfirm(sig: string, label: string): Promise<void> {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const s = await connection.getSignatureStatus(sig, { searchTransactionHistory: true });
        const v = s.value;
        if (!v) continue;
        if (v.err) throw new Error(`${label} tx on chain with error: ${JSON.stringify(v.err)}`);
        if (v.confirmationStatus === "confirmed" || v.confirmationStatus === "finalized") return;
      } catch (e) {
        if (e instanceof Error && e.message.includes("on chain with error")) throw e;
      }
    }
    throw new Error(`${label} tx ${sig} did not confirm in time.`);
  }
}

export function formatTokens(ui: number): string {
  if (ui >= 1_000_000_000) return `${(ui / 1_000_000_000).toFixed(2)}B`;
  if (ui >= 1_000_000) return `${(ui / 1_000_000).toFixed(2)}M`;
  if (ui >= 1_000) return `${(ui / 1_000).toFixed(2)}K`;
  return ui.toFixed(2);
}
