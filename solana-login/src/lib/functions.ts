"use server"

import { getAuthorizedWallet } from "./authorization";

export async function samplePublicFunction(): Promise<string> {
  return "Hello world from sample public function !";
}

export async function samplePrivateFunction(): Promise<string> {
  const wallet = await getAuthorizedWallet();
  if (wallet !== null) {
    return "Hello world from sample private function !";
  } else {
    return "Unauthorized";
  }
}