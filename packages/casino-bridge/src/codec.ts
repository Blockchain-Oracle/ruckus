import { decodeAbiParameters, encodeAbiParameters, type Hex } from 'viem';

import { type BetType, getBetTable } from '@arena/casino-math';

import { PRESENTATION_VERSION } from './constants.ts';

/** Mirrors RuckusGame.CLASS_PENDING — the gameState written before VRF settles the round. */
export const CLASS_PENDING = 255;

const BET_ENVELOPE = [{ type: 'uint8' }, { type: 'uint8' }, { type: 'bytes' }] as const;
const GAME_STATE = [
  { type: 'uint8' },
  { type: 'uint8' },
  { type: 'bytes' },
  { type: 'uint8' },
  { type: 'uint256' },
] as const;

export type DecodedBet = { betType: BetType; presentationVersion: number; params: Hex };
export type DecodedGameState = DecodedBet & { outcomeClass: number | null; payout: bigint };

/** gameData = abi.encode(uint8 betType, uint8 presentationVersion, bytes params) (ADR-004). */
export function encodeBet(betType: BetType, params: Hex): Hex {
  return encodeAbiParameters(BET_ENVELOPE, [betType, PRESENTATION_VERSION, params]);
}

export function encodeBackChickenParams(fighterIndex: number): Hex {
  return encodeAbiParameters([{ type: 'uint8' }], [fighterIndex]);
}

export function decodeBet(gameData: Hex): DecodedBet {
  const [betType, presentationVersion, params] = decodeAbiParameters(BET_ENVELOPE, gameData);
  getBetTable(betType as BetType); // throws for bet types this client does not know
  return { betType: betType as BetType, presentationVersion, params };
}

export function encodeGameState(bet: DecodedBet, outcomeClass: number | null, payout: bigint): Hex {
  return encodeAbiParameters(GAME_STATE, [
    bet.betType,
    bet.presentationVersion,
    bet.params,
    outcomeClass ?? CLASS_PENDING,
    payout,
  ]);
}

export function decodeGameState(gameState: Hex): DecodedGameState {
  const [betType, presentationVersion, params, outcomeClass, payout] = decodeAbiParameters(
    GAME_STATE,
    gameState,
  );
  return {
    betType: betType as BetType,
    presentationVersion,
    params,
    outcomeClass: outcomeClass === CLASS_PENDING ? null : outcomeClass,
    payout,
  };
}
