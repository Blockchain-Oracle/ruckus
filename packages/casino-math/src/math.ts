import { keccak_256 } from '@noble/hashes/sha3.js';

import { type BetTable, type BetType, BPS, getBetTable } from './tables.ts';

const UINT256_MAX = (1n << 256n) - 1n;
const BYTES32_HEX_LENGTH = 64;

export function denominator(table: BetTable): bigint {
  return table.classes.reduce((sum, outcome) => sum + outcome.weight, 0n);
}

export function topClassIndex(table: BetTable): number {
  let top = 0;
  table.classes.forEach((outcome, index) => {
    const current = table.classes[top];
    if (current && outcome.multiplierBps > current.multiplierBps) top = index;
  });
  return top;
}

/** Mirror of `RuckusGame._payout` — the one payout function. */
export function payout(wager: bigint, betType: BetType, classIndex: number): bigint {
  const outcome = getBetTable(betType).classes[classIndex];
  if (!outcome) throw new RangeError(`class ${classIndex} not in bet type ${betType}`);
  return (wager * outcome.multiplierBps) / BPS;
}

export function maxPayout(wager: bigint, betType: BetType): bigint {
  return payout(wager, betType, topClassIndex(getBetTable(betType)));
}

export function maxReservedProfit(wager: bigint, betType: BetType): bigint {
  const top = maxPayout(wager, betType);
  return top > wager ? top - wager : 0n;
}

/** Highest multiplier of a bet type, as a plain number, for `computeMaxWager({ maxMultiplierX })`. */
export function maxMultiplierX(betType: BetType): number {
  const table = getBetTable(betType);
  const top = table.classes[topClassIndex(table)];
  return Number(top?.multiplierBps ?? 0n) / Number(BPS);
}

function hexToBytes32(hex: `0x${string}`): Uint8Array {
  const clean = hex.slice(2).padStart(BYTES32_HEX_LENGTH, '0');
  const bytes = new Uint8Array(BYTES32_HEX_LENGTH / 2);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesToBigint(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

/**
 * Mirror of `RuckusGame.drawClass`: rejection-sample the VRF word below the largest multiple of the
 * table denominator (re-hashing with keccak256 on rejection), then pick by cumulative weight.
 */
export function drawClass(randomness: `0x${string}`, table: BetTable): number {
  const total = denominator(table);
  const excess = ((UINT256_MAX % total) + 1n) % total;
  let seed = hexToBytes32(randomness);
  while (excess !== 0n && bytesToBigint(seed) > UINT256_MAX - excess) seed = keccak_256(seed);

  const ticket = bytesToBigint(seed) % total;
  let cumulative = 0n;
  for (const [index, outcome] of table.classes.entries()) {
    cumulative += outcome.weight;
    if (ticket < cumulative) return index;
  }
  throw new Error('unreachable: ticket is below the denominator');
}

/** Exact RTP in basis points, as a rational numerator/denominator pair (no floating point). */
export function rtp(table: BetTable): { numeratorBps: bigint; denominator: bigint } {
  const weighted = table.classes.reduce((sum, o) => sum + o.weight * o.multiplierBps, 0n);
  return { numeratorBps: weighted, denominator: denominator(table) };
}
