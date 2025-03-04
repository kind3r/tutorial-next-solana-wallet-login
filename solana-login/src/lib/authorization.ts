"use server"

import { ComputeBudgetProgram, Keypair, PublicKey, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { randomUUID } from "crypto";
import { toTransactionAndBlockHash } from "./solana";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { sessionCreate, sessionDecrypt } from "./sessions";
import { cookies } from "next/headers";

const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const LEDGER_KEYPAIR = Keypair.fromSecretKey(bs58.decode(process.env.LEDGER_AUTH_PK || ""));

export async function isAuthorized(publicKey: string): Promise<boolean> {
  const encryptedSession = cookies().get('session');
  if (typeof encryptedSession !== "undefined") {
    const session = await sessionDecrypt(encryptedSession.value);
    if (typeof session !== "undefined" && session.w === publicKey) {
      return true;
    }
  }

  return false;
}

export async function getAuthorizedWallet(): Promise<string | null> {
  const encryptedSession = cookies().get('session');
  if (typeof encryptedSession !== "undefined") {
    const session = await sessionDecrypt(encryptedSession.value);
    if (typeof session !== "undefined") {
      return session.w;
    }
  }

  return null;
}

export async function createNonce(
  wallet: string,
  usingLedger: boolean
): Promise<string> {
  // generate a random UUID
  const nonce = randomUUID();
  // store the nonce associated with the wallet in memory cache for 2 minutes
  global.memCache.set(`AUTH.nonce.${wallet}`, nonce, 120);
  if (usingLedger === true) {
    const walletPublicKey = new PublicKey(wallet);
    const instructions: TransactionInstruction[] = [];
    instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 }));
    instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20000 }));
    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: walletPublicKey, isSigner: true, isWritable: false },
        { pubkey: LEDGER_KEYPAIR.publicKey, isSigner: true, isWritable: false }
      ],
      data: Buffer.from("Please sign to confirm wallet ownership.\n" + nonce, "utf-8"),
      programId: MEMO_PROGRAM,
    }));

    const txAndBlockhash = await toTransactionAndBlockHash(walletPublicKey, instructions, [LEDGER_KEYPAIR]);
    return JSON.stringify(txAndBlockhash);
  } else {
    return "Please sign to confirm wallet ownership.\n" + nonce;
  }
}

export async function validateAuthorization(
  wallet: string,
  usingLedger: boolean,
  signature: string,
  blockHash?: string
): Promise<boolean> {
  const nonce = global.memCache.get(`AUTH.nonce.${wallet}`);
  if (typeof nonce !== "undefined" && nonce !== null) {
    const walletPublicKey = new PublicKey(wallet);
    if (usingLedger === true) {
      const instructions: TransactionInstruction[] = [];
      instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 }));
      instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20000 }));
      instructions.push(new TransactionInstruction({
        keys: [
          { pubkey: walletPublicKey, isSigner: true, isWritable: false },
          { pubkey: LEDGER_KEYPAIR.publicKey, isSigner: true, isWritable: false }
        ],
        data: Buffer.from("Please sign to confirm wallet ownership.\n" + nonce, "utf-8"),
        programId: MEMO_PROGRAM,
      }));
      const txAndBlockhash = await toTransactionAndBlockHash(walletPublicKey, instructions, [], blockHash);
      const transaction = VersionedTransaction.deserialize(new Uint8Array(txAndBlockhash.transaction));
      const verified = nacl.sign.detached.verify(transaction.message.serialize(), bs58.decode(signature), walletPublicKey.toBuffer());
      if (verified === true) {
        await sessionCreate(wallet);
        return true;
      }
    } else {
      const verified = nacl.sign.detached.verify(Buffer.from("Please sign to confirm wallet ownership.\n" + nonce), bs58.decode(signature), walletPublicKey.toBuffer());
      if (verified === true) {
        await sessionCreate(wallet);
        return true;
      }
    }
  }
  return false;
}