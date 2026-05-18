import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "./config";

export const connection = new Connection(config.rpcUrl, "confirmed");

function decodeKey(secret: string): Keypair {
  const trimmed = secret.trim();
  if (!trimmed) {
    throw new Error("Wallet private key is empty — set CREATOR_WALLET_PRIVATE_KEY in Railway → Variables.");
  }
  if (trimmed.startsWith("[")) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
  }
  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

export function loadCreatorWallet(): Keypair {
  return decodeKey(config.creatorPrivateKey);
}

export function loadBuyerWallet(): Keypair {
  return decodeKey(config.buyerPrivateKey);
}

export async function getSolBalance(pk: PublicKey): Promise<number> {
  return (await connection.getBalance(pk)) / LAMPORTS_PER_SOL;
}

export async function getTokenBalanceRaw(
  owner: PublicKey,
  mint: PublicKey
): Promise<bigint> {
  try {
    const accs = await connection.getParsedTokenAccountsByOwner(owner, { mint });
    if (accs.value.length === 0) return 0n;
    return BigInt(accs.value[0].account.data.parsed.info.tokenAmount.amount);
  } catch {
    return 0n;
  }
}

export async function getMintSupplyUi(mint: PublicKey): Promise<{
  uiAmount: number;
  decimals: number;
}> {
  try {
    const s = await connection.getTokenSupply(mint);
    return {
      uiAmount: s.value.uiAmount ?? 0,
      decimals: s.value.decimals,
    };
  } catch {
    return { uiAmount: 0, decimals: 6 };
  }
}
