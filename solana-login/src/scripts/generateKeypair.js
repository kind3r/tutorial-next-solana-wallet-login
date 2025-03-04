/**
 * Simple script to generate a new keypair
 */

const web3 = require('@solana/web3.js');
const bs58 = require('bs58');

const keyPair = web3.Keypair.generate();

console.log("Public key:", keyPair.publicKey.toBase58());
console.log("Private key:", bs58.default.encode(keyPair.secretKey));

