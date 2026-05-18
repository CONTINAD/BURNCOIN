import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { connection } from "./wallet";
import { logger } from "./logger";

export interface HolderEntry {
  owner: string;
  uiBalance: number;
}

/**
 * Snapshot every wallet currently holding $BURN. Requires a paid RPC
 * (Helius/QuickNode/Triton) because free RPCs disable getProgramAccounts.
 * Sums balances per owner across multiple token accounts.
 */
export async function snapshotHolders(mintBase58: string): Promise<HolderEntry[]> {
  const mint = new PublicKey(mintBase58);
  const owner = await detectOwner(mint);
  const programs = owner ? [owner] : [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];

  const merged = new Map<string, number>();
  for (const program of programs) {
    try {
      const accs = await connection.getParsedProgramAccounts(program, {
        filters: [
          { dataSize: program.equals(TOKEN_2022_PROGRAM_ID) ? 182 : 165 },
          { memcmp: { offset: 0, bytes: mint.toBase58() } },
        ],
      });
      for (const acc of accs) {
        const data = acc.account.data as { parsed?: { info?: { owner?: string; tokenAmount?: { uiAmount?: number } } } };
        const info = data?.parsed?.info;
        const ownerStr = info?.owner;
        const ui = info?.tokenAmount?.uiAmount ?? 0;
        if (!ownerStr || ui <= 0) continue;
        merged.set(ownerStr, (merged.get(ownerStr) || 0) + ui);
      }
    } catch (e) {
      logger.warn(
        `Holder snapshot via ${program.toBase58().slice(0, 4)}… failed: ${e instanceof Error ? e.message : e}`
      );
    }
  }

  return Array.from(merged.entries())
    .map(([owner, uiBalance]) => ({ owner, uiBalance }))
    .sort((a, b) => b.uiBalance - a.uiBalance);
}

async function detectOwner(mint: PublicKey): Promise<PublicKey | null> {
  try {
    const info = await connection.getParsedAccountInfo(mint);
    return info.value ? info.value.owner : null;
  } catch {
    return null;
  }
}
