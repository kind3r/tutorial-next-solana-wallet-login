"use client"

import { useCallback, useEffect, useState } from "react";
import { useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import { createNonce, isAuthorized, validateAuthorization } from "@/lib/authorization";
import { TransactionAndBlockHash } from "@/lib/solana";
import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

type AuthorizationProps = {
  // The user will be asked to sign a message or transaction in order to prove wallet ownership.
  proofRequired?: boolean;
  children: React.ReactNode;
}

export default function Authorization({ proofRequired, children }: AuthorizationProps) {
  const [checkingAuthorization, setCheckingAuthorization] = useState<boolean>(false);
  const [showAuthorization, setShowAuthorization] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [isUsingLedger, setIsUsingLedger] = useState<boolean>(false);

  const wallet = useWallet();

  // Check if the user session is still valid and ask for proof if required
  const checkAuthorization = useCallback(async (wallet: WalletContextState) => {
    setCheckingAuthorization(true);

    // check if current token is still valid and matches connected wallet
    const validSession = await isAuthorized(wallet.publicKey?.toBase58() || "");
    if (validSession === true) {
      setShowAuthorization(false);
    } else {
      setShowAuthorization(true);
    }

    setCheckingAuthorization(false);
  }, []);

  // Perform authorization by fetching a message (or transaction) to sign and verifying the signature
  const performAuthorization = useCallback(async (wallet: WalletContextState, usingLedger: boolean) => {
    setBusy(true);
    if (wallet.connected === true && wallet.publicKey !== null) {
      const nonce = await createNonce(wallet.publicKey.toBase58(), usingLedger);

      let signature: string | undefined;
      let blockHash: string | undefined;
      try {
        if (usingLedger === true) {
          // sign transaction
          if (typeof wallet.signTransaction !== "undefined") {
            const txAndBlockhash = JSON.parse(nonce) as TransactionAndBlockHash;
            const transaction = VersionedTransaction.deserialize(new Uint8Array(txAndBlockhash.transaction));
            const signedTransaction = await wallet.signTransaction(transaction);
            signature = bs58.encode(signedTransaction.signatures[0]);
            blockHash = txAndBlockhash.blockHash;
          }
        } else {
          // sign message
          if (typeof wallet.signMessage !== "undefined") {
            signature = bs58.encode(await wallet.signMessage(Buffer.from(nonce, "utf8")));
          }
        }
      } catch (error) {
        console.error(error);
      }

      if (typeof signature !== "undefined") {
        await validateAuthorization(wallet.publicKey.toBase58(), usingLedger, signature, blockHash);
      }

      // await sessionCreate(wallet.publicKey?.toBase58() || "");
      await checkAuthorization(wallet);
    }
    setBusy(false);
  }, [checkAuthorization]);

  // Check if wallet is connected and if proof is required
  useEffect(() => {
    if (proofRequired === true && wallet.connected === true && wallet.publicKey !== null) {
      checkAuthorization(wallet);
    }
  }, [wallet, proofRequired, checkAuthorization]);

  return (
    <>
      {wallet.connected === true ? (
        <>
          {proofRequired === true ? (
            <>
              {checkingAuthorization === true ? (
                <>
                  Checking authorization...
                </>
              ) : (
                <>
                  {showAuthorization === true ? (
                    <>
                      <h2 className="text-center font-bold py-8 text-2xl">Please login by signing the message</h2>
                      <div className="text-center">
                        <input className="" type="checkbox" role="switch" id="isUsingLedger" name="isUsingLedger"
                          checked={isUsingLedger}
                          onChange={() => {
                            setIsUsingLedger(!isUsingLedger);
                          }}
                        />
                        <label className="ps-2" htmlFor="isUsingLedger">Using Ledger ?</label>
                      </div>
                      <div className="text-center py-8">
                        <button className="font-bold rounded-lg text-lg px-8 py-2 bg-[#3160aa] hover:bg-[#3160aa]/90 text-[#ffffff] justify-center"
                          disabled={busy}
                          onClick={() => performAuthorization(wallet, isUsingLedger)}
                        >
                          Login
                          {busy ? (
                            <span className="" role="status" aria-hidden="true"></span>
                          ) : ""}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {children}
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {children}
            </>
          )}
        </>
      ) : (
        <>
          Please connect a Solana wallet.
        </>
      )}
    </>
  )
}