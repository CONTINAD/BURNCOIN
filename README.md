# $BURN — The Supply Only Goes Down

Pump.fun coin with an automated **claim → buyback → incinerate** loop.

Every `CYCLE_INTERVAL_SECONDS` (default **120s** = 2 min):

1. Bot claims pump.fun creator fees from the dev wallet.
2. Measures the exact SOL delta credited to the wallet.
3. Spends `BUYBACK_PERCENT` of that delta buying back $BURN on pump.fun.
4. Burns 100% of the tokens it just bought via on-chain SPL burn — `mint.supply` literally decrements.

The bot's spendable budget is decoupled from the wallet's on-chain balance — only measured claim deltas can be spent, so the dev's principal is **never** touched.

A real-time dashboard at `/` shows the furnace, live burn animation, total $BURN incinerated, % of supply burned, every buy + burn tx signature, and a live event feed.

## Deploy

### Local

```bash
npm install
cp .env.example .env
# paste your dev wallet's base58 private key into CREATOR_WALLET_PRIVATE_KEY
npm run build
npm start
# dashboard at http://localhost:3000
```

### Railway

1. **New Project → Deploy from GitHub repo** → pick `CONTINAD/BURNCOIN`.
2. **Variables** — set at minimum:
   - `SOLANA_RPC_URL` — a paid Helius/QuickNode/Triton URL
   - `CREATOR_WALLET_PRIVATE_KEY` — base58 secret key of the dev wallet
3. **(Optional) Volume** — mount a Volume at `/data` and add `STATE_DIR=/data` so the dashboard counters survive redeploys.
4. **Networking → Generate Domain** to expose the dashboard publicly.

See [.env.example](.env.example) for every tunable.

## Architecture

- [src/index.ts](src/index.ts) — cycle loop, claim/forward/buyback/burn orchestration
- [src/claim-rewards.ts](src/claim-rewards.ts) — PumpPortal creator-fee claim with retry + priority-fee escalation
- [src/buyback.ts](src/buyback.ts) — PumpPortal buy with `pool: "auto"` (pre/post-graduation), measures token delta, signs an SPL `BurnChecked` tx for the exact amount bought
- [src/forwarder.ts](src/forwarder.ts) — exact-lamport SOL forward (fee paid from forwarded amount, never touches principal)
- [src/mint-watcher.ts](src/mint-watcher.ts) — auto-detects the pump.fun mint the dev wallet creates
- [src/activity.ts](src/activity.ts) — persistent state, claim-pool ledger, dashboard feed
- [src/dashboard.ts](src/dashboard.ts) — Express server + animated HTML dashboard

## Safety

- Single-wallet mode by default — same wallet claims, buys, and burns.
- `claimPoolLamports` ledger means the bot can only spend SOL it has provably claimed.
- `BurnChecked` SPL instruction with verified decimals — burned amount is measured from on-chain delta, never from the request.
- Retries on every external tx with exponential priority-fee escalation.

Memecoin. Entertainment only. Not financial advice.
