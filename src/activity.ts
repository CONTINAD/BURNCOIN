import * as fs from "fs";
import * as path from "path";

export interface CycleEvent {
  ts: number;
  type:
    | "info"
    | "claim"
    | "forward"
    | "buyback"
    | "burn"
    | "marketing"
    | "error";
  message: string;
  txSignature?: string;
  amountSol?: number;
  amountTokens?: number;
}

/**
 * Live burn payload — the dashboard polls this to play the buy → burn
 * inferno animation in real time.
 */
export interface LiveBurn {
  startedAt: number;
  cycle: number;
  status: "buying" | "burning" | "done" | "failed";
  solAmount: number;
  tokensBurnedUi?: number;
  buyTx?: string;
  burnTx?: string;
  error?: string;
}

export interface BurnRecord {
  ts: number;
  cycle: number;
  solSpent: number;
  tokensBurnedUi: number;
  buyTx: string;
  burnTx: string;
}

export interface DashboardState {
  status: "idle" | "running" | "buying" | "burning" | "error" | "stopped" | "watching";
  startedAt: number;
  lastCycleAt: number;
  nextCycleAt: number;
  cycleCount: number;

  creatorWallet: string;
  buyerWallet: string;
  marketingWallet: string;
  burnMint: string;
  totalSupplyUi: number;     // current on-chain supply of $BURN (decrements as we burn)
  decimals: number;

  totals: {
    solClaimed: number;
    solToBuybacks: number;
    solToMarketing: number;
    tokensBurnedUi: number;
    burnCount: number;
  };

  // Bot's spendable budget. Only grows from measured claim deltas; only shrinks
  // from real spends. Decoupled from on-chain wallet balance so the dev's own
  // SOL is provably never spent.
  claimPoolLamports: number;
  lastClaimLamports: number;
  lastClaimAt: number;
  lastTopupApplied?: string;

  current: {
    creatorSol: number;
    buyerSol: number;
    holderCount: number;
  };

  // Top holders snapshot (sorted desc by balance). Excludes the dev/buyer
  // wallets and the bonding curve / LP so the leaderboard reflects actual
  // community holders.
  topHolders: Array<{ owner: string; uiBalance: number; share: number }>;
  lastHolderSnapshotAt: number;

  // Maintenance mode = the bot can't run (usually missing wallet key). The
  // dashboard still renders but shows a banner explaining what to fix.
  maintenance: boolean;
  maintenanceReason: string;

  liveBurn?: LiveBurn;
  lastBurn?: BurnRecord;

  events: CycleEvent[];
  burns: BurnRecord[];
}

const DATA_DIR = process.env.STATE_DIR || path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const MAX_EVENTS = 500;
const MAX_BURNS = 500;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function emptyState(): DashboardState {
  return {
    status: "idle",
    startedAt: Date.now(),
    lastCycleAt: 0,
    nextCycleAt: 0,
    cycleCount: 0,
    creatorWallet: "",
    buyerWallet: "",
    marketingWallet: "",
    burnMint: "",
    totalSupplyUi: 0,
    decimals: 6,
    totals: {
      solClaimed: 0,
      solToBuybacks: 0,
      solToMarketing: 0,
      tokensBurnedUi: 0,
      burnCount: 0,
    },
    claimPoolLamports: 0,
    lastClaimLamports: 0,
    lastClaimAt: 0,
    current: { creatorSol: 0, buyerSol: 0, holderCount: 0 },
    topHolders: [],
    lastHolderSnapshotAt: 0,
    maintenance: false,
    maintenanceReason: "",
    events: [],
    burns: [],
  };
}

function loadState(): DashboardState {
  if (!fs.existsSync(STATE_FILE)) return emptyState();
  let parsed: Partial<DashboardState> | null = null;
  try {
    parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    try {
      parsed = JSON.parse(fs.readFileSync(STATE_FILE + ".tmp", "utf-8"));
    } catch {
      return emptyState();
    }
  }
  if (!parsed || typeof parsed !== "object") return emptyState();
  const base = emptyState();
  return {
    ...base,
    ...parsed,
    totals: { ...base.totals, ...(parsed.totals || {}) },
    current: { ...base.current, ...(parsed.current || {}) },
    events: Array.isArray(parsed.events) ? parsed.events : [],
    burns: Array.isArray(parsed.burns) ? parsed.burns : [],
  };
}

class Tracker {
  private state: DashboardState;

  constructor() {
    ensureDir();
    this.state = loadState();
  }

  private persist() {
    try {
      const tmp = STATE_FILE + ".tmp";
      const fd = fs.openSync(tmp, "w");
      try {
        fs.writeSync(fd, JSON.stringify(this.state, null, 2));
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmp, STATE_FILE);
    } catch {
      /* best-effort */
    }
  }

  private push(event: CycleEvent) {
    this.state.events.push(event);
    if (this.state.events.length > MAX_EVENTS) {
      this.state.events = this.state.events.slice(-MAX_EVENTS);
    }
  }

  setIdentity(p: { creatorWallet: string; buyerWallet: string; marketingWallet: string; burnMint: string }) {
    Object.assign(this.state, p);
    this.persist();
  }

  setSupply(uiAmount: number, decimals: number) {
    this.state.totalSupplyUi = uiAmount;
    this.state.decimals = decimals;
    this.persist();
  }

  resetIfWalletChanged(currentCreatorWallet: string): boolean {
    const persisted = this.state.creatorWallet;
    if (persisted && persisted !== currentCreatorWallet) {
      this.state = emptyState();
      this.persist();
      return true;
    }
    return false;
  }

  forceReset() {
    this.state = emptyState();
    this.persist();
  }

  applyPoolTopup(envValue: string | undefined): { applied: boolean; lamports: number } {
    const v = (envValue || "").trim();
    if (!v || v === "0") {
      this.state.lastTopupApplied = v || "0";
      this.persist();
      return { applied: false, lamports: 0 };
    }
    if (this.state.lastTopupApplied === v) return { applied: false, lamports: 0 };
    const lamports = Math.max(0, Math.floor(Number(v)));
    if (!Number.isFinite(lamports) || lamports <= 0) return { applied: false, lamports: 0 };
    this.state.claimPoolLamports += lamports;
    this.state.lastTopupApplied = v;
    this.persist();
    return { applied: true, lamports };
  }

  setStatus(status: DashboardState["status"]) {
    this.state.status = status;
    this.persist();
  }

  setMaintenance(maintenance: boolean, reason: string = "") {
    this.state.maintenance = maintenance;
    this.state.maintenanceReason = reason;
    this.persist();
  }

  setNextCycleAt(t: number) {
    this.state.nextCycleAt = t;
    this.persist();
  }

  updateBalances(p: { creatorSol: number; buyerSol: number }) {
    this.state.current.creatorSol = p.creatorSol;
    this.state.current.buyerSol = p.buyerSol;
    this.persist();
  }

  /**
   * Refresh the holder snapshot. Excludes the dev/buyer wallets so the
   * leaderboard reflects community holders only.
   */
  setHolders(rows: Array<{ owner: string; uiBalance: number }>, excluded: Set<string>, maxTop = 100) {
    const filtered = rows.filter((r) => !excluded.has(r.owner) && r.uiBalance > 0);
    const total = filtered.reduce((sum, r) => sum + r.uiBalance, 0) || 1;
    this.state.current.holderCount = filtered.length;
    this.state.topHolders = filtered.slice(0, maxTop).map((r) => ({
      owner: r.owner,
      uiBalance: r.uiBalance,
      share: r.uiBalance / total,
    }));
    this.state.lastHolderSnapshotAt = Date.now();
    this.persist();
  }

  cycleStart() {
    this.state.cycleCount++;
    this.state.lastCycleAt = Date.now();
    this.state.status = "running";
    this.push({ ts: Date.now(), type: "info", message: `🔥 Cycle #${this.state.cycleCount} — kindling the furnace` });
    this.persist();
  }

  recordClaim(solAmount: number, txSignature: string) {
    this.state.totals.solClaimed += solAmount;
    this.state.lastClaimLamports = Math.floor(solAmount * 1e9);
    this.state.lastClaimAt = Date.now();
    this.push({ ts: Date.now(), type: "claim", message: `Claimed ${solAmount.toFixed(6)} SOL of creator fees`, txSignature, amountSol: solAmount });
    this.persist();
  }

  creditClaimPool(lamports: number) {
    this.state.claimPoolLamports += lamports;
    this.persist();
  }

  debitClaimPool(lamports: number) {
    this.state.claimPoolLamports = Math.max(0, this.state.claimPoolLamports - lamports);
    this.persist();
  }

  getClaimPool(): number {
    return this.state.claimPoolLamports;
  }

  recordForward(solAmount: number, txSignature: string) {
    this.push({ ts: Date.now(), type: "forward", message: `Forwarded ${solAmount.toFixed(6)} SOL → buyer`, txSignature, amountSol: solAmount });
    this.persist();
  }

  startBurnAnimation(solAmount: number) {
    this.state.status = "buying";
    this.state.liveBurn = {
      startedAt: Date.now(),
      cycle: this.state.cycleCount,
      status: "buying",
      solAmount,
    };
    this.push({
      ts: Date.now(), type: "buyback",
      message: `🔥 Buying back ${solAmount.toFixed(6)} SOL of $BURN — fuel inbound`,
      amountSol: solAmount,
    });
    this.persist();
  }

  markBurnPhase(buyTx: string) {
    this.state.status = "burning";
    if (this.state.liveBurn) {
      this.state.liveBurn.status = "burning";
      this.state.liveBurn.buyTx = buyTx;
    }
    this.persist();
  }

  recordBurn(p: {
    solSpent: number;
    tokensBurnedUi: number;
    buyTx: string;
    burnTx: string;
  }) {
    this.state.totals.solToBuybacks += p.solSpent;
    this.state.totals.tokensBurnedUi += p.tokensBurnedUi;
    this.state.totals.burnCount += 1;

    // Optimistic supply update — gets reconciled with on-chain getTokenSupply
    // each cycle, so any drift is corrected within ~2 minutes.
    this.state.totalSupplyUi = Math.max(0, this.state.totalSupplyUi - p.tokensBurnedUi);

    const rec: BurnRecord = {
      ts: Date.now(),
      cycle: this.state.cycleCount,
      solSpent: p.solSpent,
      tokensBurnedUi: p.tokensBurnedUi,
      buyTx: p.buyTx,
      burnTx: p.burnTx,
    };
    this.state.burns.push(rec);
    if (this.state.burns.length > MAX_BURNS) {
      this.state.burns = this.state.burns.slice(-MAX_BURNS);
    }
    this.state.lastBurn = rec;

    if (this.state.liveBurn) {
      this.state.liveBurn.status = "done";
      this.state.liveBurn.tokensBurnedUi = p.tokensBurnedUi;
      this.state.liveBurn.burnTx = p.burnTx;
    }

    this.push({
      ts: Date.now(), type: "burn",
      message: `🔥 Incinerated ${p.tokensBurnedUi.toLocaleString(undefined, { maximumFractionDigits: 2 })} $BURN — supply down forever`,
      txSignature: p.burnTx,
      amountSol: p.solSpent,
      amountTokens: p.tokensBurnedUi,
    });
    this.persist();
  }

  markBurnFailed(reason: string) {
    if (this.state.liveBurn) {
      this.state.liveBurn.status = "failed";
      this.state.liveBurn.error = reason;
    }
    this.push({ ts: Date.now(), type: "error", message: `Buyback/burn failed: ${reason}` });
    this.persist();
  }

  recordMarketing(solAmount: number, txSignature: string) {
    this.state.totals.solToMarketing += solAmount;
    this.push({
      ts: Date.now(), type: "marketing",
      message: `📣 Marketing slice ${solAmount.toFixed(6)} SOL routed`,
      txSignature, amountSol: solAmount,
    });
    this.persist();
  }

  recordInfo(message: string) {
    this.push({ ts: Date.now(), type: "info", message });
    this.persist();
  }

  recordError(message: string) {
    this.state.status = "error";
    this.push({ ts: Date.now(), type: "error", message });
    this.persist();
  }

  snapshot(): DashboardState {
    return this.state;
  }
}

export const tracker = new Tracker();
