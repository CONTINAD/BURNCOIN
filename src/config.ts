import dotenv from "dotenv";
dotenv.config();

function req(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

const isAuto = (v: string | undefined) =>
  !v || v.trim() === "" || v.trim().toLowerCase() === "auto";

const creatorKey = req("CREATOR_WALLET_PRIVATE_KEY");
if (creatorKey.includes("PASTE_DEV_WALLET")) {
  throw new Error(
    "CREATOR_WALLET_PRIVATE_KEY is still the placeholder — paste your dev wallet's base58 private key into .env before launching."
  );
}
const buyerKey = process.env.BUYER_WALLET_PRIVATE_KEY?.trim() || creatorKey;

const burnMintRaw = process.env.BURN_MINT?.trim();

export const config = {
  rpcUrl: req("SOLANA_RPC_URL"),

  creatorPrivateKey: creatorKey,
  buyerPrivateKey: buyerKey,
  singleWalletMode: buyerKey === creatorKey,

  marketingWallet: process.env.MARKETING_WALLET?.trim() || "",

  burnMint: isAuto(burnMintRaw) ? "" : burnMintRaw!,
  autoDetectMint: isAuto(burnMintRaw),
  mintWatchPollSeconds: Number(process.env.MINT_WATCH_POLL_SECONDS || "20"),

  pumpPortalApiKey: process.env.PUMPPORTAL_API_KEY || "",

  cycleIntervalSeconds: Number(process.env.CYCLE_INTERVAL_SECONDS || "120"),
  minBuybackSol: Number(process.env.MIN_BUYBACK_SOL || "0.0005"),

  buybackPercent: Number(process.env.BUYBACK_PERCENT || "100"),
  marketingPercent: Number(process.env.MARKETING_PERCENT || "0"),
  // Cosmetic only — what the public website claims. Defaults to the real
  // buyback percent. Set DISPLAY_BUYBACK_PERCENT=100 if you want the site to
  // say "100% buyback" while the real split is 90/10. Math (and on-chain
  // burns) always use the real BUYBACK_PERCENT.
  displayBuybackPercent: Number(
    process.env.DISPLAY_BUYBACK_PERCENT || process.env.BUYBACK_PERCENT || "100"
  ),
  buybackSlippagePct: Number(process.env.BUYBACK_SLIPPAGE_PCT || "20"),

  priorityFee: Number(process.env.PRIORITY_FEE || "0.0005"),

  port: Number(process.env.PORT || "3000"),
  logLevel: process.env.LOG_LEVEL || "info",
} as const;
