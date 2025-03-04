"use server"

import { Connection, Keypair, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";


const SOLANA_CONNECTION = new Connection(process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com");

export interface TransactionAndBlockHash {
  transaction: Array<number>;
  blockHash: string;
}

export async function toTransactionAndBlockHash(
  payer: PublicKey,
  instructions: TransactionInstruction[],
  signers?: Keypair[],
  blockHash?: string
): Promise<TransactionAndBlockHash> {
  if (typeof blockHash === "undefined") {
    const latestBlockhash = await SOLANA_CONNECTION.getLatestBlockhash('confirmed');
    blockHash = latestBlockhash.blockhash;
  }
  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockHash,
    instructions: instructions
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);

  if (typeof signers !== "undefined" && signers.length > 0) {
    transaction.sign(signers);
  }

  return {
    transaction: Array.from(transaction.serialize()),
    blockHash: blockHash
  }
}