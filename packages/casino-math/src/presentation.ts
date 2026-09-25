import { keccak_256 } from '@noble/hashes/sha3.js';

/**
 * Seed-bank presentation (ADR-001 §4). The contract settles the class; the client turns the same
 * VRF word into *which* pre-mined round to show, so the fight is reproducible by anyone:
 *   seed = bank.classes[class][uniform(keccak256(randomness ‖ "present"), K)]
 */
export type SeedBank = {
  version: number;
  game: string;
  betType: number;
  players: number;
  difficulty: number;
  mapRule: string;
  backedSlot: number;
  firstSeed: number;
  scanned: number;
  perClass: number;
  classes: number[][];
};

/** ASCII-only encoder: pure packages have no DOM lib, and every input here is ASCII. */
function ascii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) throw new Error('Expected ASCII input');
    out[i] = code;
  }
  return out;
}

const DOMAIN = ascii('present');
const UINT256_SPAN = 1n << 256n;

const toBytes = (hex: `0x${string}`) => {
  const clean = hex.slice(2).padStart(64, '0');
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
};
const toBigint = (bytes: Uint8Array) => bytes.reduce((v, b) => (v << 8n) | BigInt(b), 0n);

/** Unbiased index in [0, k): rejection-sample keccak words below the largest multiple of k. */
export function presentationIndex(randomness: `0x${string}`, k: number): number {
  const n = BigInt(k);
  const limit = UINT256_SPAN - (UINT256_SPAN % n);
  const seed = new Uint8Array(32 + DOMAIN.length);
  seed.set(toBytes(randomness));
  seed.set(DOMAIN, 32);
  let word = keccak_256(seed);
  while (toBigint(word) >= limit) word = keccak_256(word);
  return Number(toBigint(word) % n);
}

export function presentationSeed(
  bank: SeedBank,
  randomness: `0x${string}`,
  classIndex: number,
): number {
  const seeds = bank.classes[classIndex];
  if (!seeds?.length) throw new Error(`Seed bank v${bank.version} has no class ${classIndex}`);
  const seed = seeds[presentationIndex(randomness, seeds.length)];
  if (seed === undefined) throw new Error('unreachable: index below bank length');
  return seed;
}

/** The map a bank seed plays on (`mapRule: "seed % 3"`). */
export const bankMapFor = (seed: number, mapCount = 3) => seed % mapCount;

/** keccak256 of the canonical bank JSON bytes, published so anyone can check the bank. */
export function bankHash(json: string): `0x${string}` {
  const digest = keccak_256(ascii(json));
  return `0x${Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
