import dotenv from "dotenv";
dotenv.config();

function req(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

const isAuto = (v: string | undefined) =>
  !v || v.trim() === "" || v.trim().toLowerCase() === "auto";

// CREATOR_WALLET_PRIVATE_KEY is INTENTIONALLY non-fatal at boot.
// If it's missing or still the placeholder, the bot loop just won't start —
// but the dashboard still boots so the user can see what to fix.
const rawCreatorKey = process.env.CREATOR_WALLET_PRIVATE_KEY?.trim() || "";
const placeholderDetected = rawCreatorKey.includes("PASTE_DEV_WALLET");
const creatorKey = placeholderDetected ? "" : rawCreatorKey;
const buyerKey = process.env.BUYER_WALLET_PRIVATE_KEY?.trim() || creatorKey;

let configError: string | null = null;
if (!creatorKey) {
  configError = placeholderDetected
    ? "CREATOR_WALLET_PRIVATE_KEY is still the .env placeholder — paste your dev wallet's base58 private key in Railway → Variables."
    : "CREATOR_WALLET_PRIVATE_KEY is not set — paste your dev wallet's base58 private key in Railway → Variables.";
}

const burnMintRaw = process.env.BURN_MINT?.trim();

// SOLANA_RPC_URL: also non-fatal — falls back to public mainnet (rate-limited
// but enough to render the dashboard with a config-error banner).
const rpcUrl = process.env.SOLANA_RPC_URL?.trim() || "https://api.mainnet-beta.solana.com";
if (!process.env.SOLANA_RPC_URL?.trim() && !configError) {
  configError = "SOLANA_RPC_URL not set — using public RPC (rate-limited). Paste a Helius/QuickNode URL in Railway → Variables.";
}

export const config = {
  rpcUrl,

  creatorPrivateKey: creatorKey,
  buyerPrivateKey: buyerKey,
  singleWalletMode: !creatorKey ? false : buyerKey === creatorKey,

  // True only when the bot has everything it needs to actually run.
  // If false, the dashboard still boots but the claim/burn loop is parked.
  botReady: !!creatorKey,
  configError,

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
