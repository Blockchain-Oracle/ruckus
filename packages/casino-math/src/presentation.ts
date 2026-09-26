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

/**
 * keccak256 of the bank in canonical form (compact JSON of the parsed file), published so anyone
 * can check the bank. Canonical, so reformatting the committed file never changes the hash.
 */
export function bankHash(json: string): `0x${string}` {
  const digest = keccak_256(ascii(JSON.stringify(JSON.parse(json))));
  return `0x${Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Presentation for a call-style round (Call the Finish, Call the Wipeout). The contract settles
 * make or miss for the call; the same VRF word, under the round's own domain, then picks *which*
 * ending shows among the endings the outcome allows, weighted by the declared table (so over many
 * rounds every ending appears at its declared rate), and a bank seed that ends exactly that way.
 */
function coverPresentation(
  domain: Uint8Array,
  bank: SeedBank,
  randomness: `0x${string}`,
  covers: readonly number[],
  outcomeClass: number,
  weights: readonly number[],
): { ending: number; seed: number } {
  const made = outcomeClass === 0;
  const allowed = weights.map((w, i) => ({ i, w })).filter(({ i }) => covers.includes(i) === made);
  const total = allowed.reduce((sum, a) => sum + a.w, 0);
  if (total <= 0) throw new Error('No ending fits that outcome');
  const n = BigInt(total);
  const limit = UINT256_SPAN - (UINT256_SPAN % n);
  const input = new Uint8Array(32 + domain.length);
  input.set(toBytes(randomness));
  input.set(domain, 32);
  let word = keccak_256(input);
  while (toBigint(word) >= limit) word = keccak_256(word);
  // Walk the cumulative weights to the drawn point.
  let pick = Number(toBigint(word) % n);
  let chosen = allowed[allowed.length - 1];
  for (const a of allowed) {
    if (pick < a.w) {
      chosen = a;
      break;
    }
    pick -= a.w;
  }
  if (!chosen) throw new Error('unreachable: allowed is non-empty');
  return { ending: chosen.i, seed: presentationSeed(bank, randomness, chosen.i) };
}

const FINISH_DOMAIN = ascii('finish');
/** "Call the Finish": which golden-goal finish shows, and the bank match that ends that way. */
export function finishPresentation(
  bank: SeedBank,
  randomness: `0x${string}`,
  covers: readonly number[],
  outcomeClass: number,
  weights: readonly number[],
): { finish: number; seed: number } {
  const { ending, seed } = coverPresentation(
    FINISH_DOMAIN,
    bank,
    randomness,
    covers,
    outcomeClass,
    weights,
  );
  return { finish: ending, seed };
}

const WIPEOUT_DOMAIN = ascii('wipeout');
/** "Call the Wipeout": which gauntlet ending shows, and the bank run that ends that way. */
export function wipeoutPresentation(
  bank: SeedBank,
  randomness: `0x${string}`,
  covers: readonly number[],
  outcomeClass: number,
  weights: readonly number[],
): { ending: number; seed: number } {
  return coverPresentation(WIPEOUT_DOMAIN, bank, randomness, covers, outcomeClass, weights);
}
