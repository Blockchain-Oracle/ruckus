/* tslint:disable */
/* eslint-disable */

export class Sim {
    free(): void;
    [Symbol.dispose](): void;
    clear_bot(slot: number): void;
    /**
     * FNV-1a 64 state fingerprint (BigInt in JS).
     */
    hash(): bigint;
    /**
     * The input a slot used last tick (bots included), e.g. for replays and netcode.
     */
    input_of(slot: number): number;
    match_over(): boolean;
    constructor(seed: number, player_count: number, map_id: number);
    /**
     * Platforms as [x, y, w, h] px quads (non-empty only), for the renderer's terrain bake.
     */
    platforms(): Int32Array;
    /**
     * Replace the state from a snapshot; false (state untouched) if the bytes are invalid.
     */
    restore(bytes: Uint8Array): boolean;
    round_ticks(): number;
    /**
     * Hand a slot to the deterministic bot (difficulty 0–100).
     */
    set_bot(slot: number, difficulty: number): void;
    set_input(slot: number, buttons: number, aim_x: number, aim_y: number): void;
    snapshot(): Uint8Array;
    /**
     * Bots decide from the pre-step state, then everyone moves together.
     */
    step(): void;
    step_many(ticks: number): void;
    sudden_death_tick(): number;
    tick(): number;
    /**
     * Fill `out` (length `view_len()`) with the render view.
     */
    view(out: Int32Array): void;
    weapon_spawns(): Int32Array;
    winner(): number;
}

/**
 * Headless all-bot round → [winner, ticks, kills×4, died_at×4, hash_hi, hash_lo].
 */
export function run_bot_round(seed: number, map_id: number, difficulties: Int32Array): Int32Array;

export function view_layout(): Int32Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_sim_free: (a: number, b: number) => void;
    readonly run_bot_round: (a: number, b: number, c: number, d: number) => [number, number];
    readonly sim_clear_bot: (a: number, b: number) => void;
    readonly sim_hash: (a: number) => bigint;
    readonly sim_input_of: (a: number, b: number) => number;
    readonly sim_match_over: (a: number) => number;
    readonly sim_new: (a: number, b: number, c: number) => number;
    readonly sim_platforms: (a: number) => [number, number];
    readonly sim_restore: (a: number, b: number, c: number) => number;
    readonly sim_round_ticks: (a: number) => number;
    readonly sim_set_bot: (a: number, b: number, c: number) => void;
    readonly sim_set_input: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly sim_snapshot: (a: number) => [number, number];
    readonly sim_step: (a: number) => void;
    readonly sim_step_many: (a: number, b: number) => void;
    readonly sim_sudden_death_tick: (a: number) => number;
    readonly sim_tick: (a: number) => number;
    readonly sim_view: (a: number, b: number, c: number, d: any) => void;
    readonly sim_weapon_spawns: (a: number) => [number, number];
    readonly sim_winner: (a: number) => number;
    readonly view_layout: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
