/* @ts-self-types="./chickenz_sim.d.ts" */

export class Sim {
    static __wrap(ptr) {
        const obj = Object.create(Sim.prototype);
        obj.__wbg_ptr = ptr;
        SimFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SimFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sim_free(ptr, 0);
    }
    /**
     * @param {number} slot
     */
    clear_bot(slot) {
        wasm.sim_clear_bot(this.__wbg_ptr, slot);
    }
    /**
     * FNV-1a 64 state fingerprint (BigInt in JS).
     * @returns {bigint}
     */
    hash() {
        const ret = wasm.sim_hash(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * The input a slot used last tick (bots included), e.g. for replays and netcode.
     * @param {number} slot
     * @returns {number}
     */
    input_of(slot) {
        const ret = wasm.sim_input_of(this.__wbg_ptr, slot);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    match_over() {
        const ret = wasm.sim_match_over(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {number} seed
     * @param {number} player_count
     * @param {number} map_id
     */
    constructor(seed, player_count, map_id) {
        const ret = wasm.sim_new(seed, player_count, map_id);
        this.__wbg_ptr = ret;
        SimFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Two-bird tutorial sandbox: tutorial map, 99 lives, no clock (see `tutorial.rs`).
     * @param {number} seed
     * @returns {Sim}
     */
    static new_tutorial(seed) {
        const ret = wasm.sim_new_tutorial(seed);
        return Sim.__wrap(ret);
    }
    /**
     * Platforms as [x, y, w, h] px quads (non-empty only), for the renderer's terrain bake.
     * @returns {Int32Array}
     */
    platforms() {
        const ret = wasm.sim_platforms(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Replace the state from a snapshot; false (state untouched) if the bytes are invalid.
     * @param {Uint8Array} bytes
     * @returns {boolean}
     */
    restore(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sim_restore(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    round_ticks() {
        const ret = wasm.sim_round_ticks(this.__wbg_ptr);
        return ret;
    }
    /**
     * Hand a slot to the deterministic bot (difficulty 0–100).
     * @param {number} slot
     * @param {number} difficulty
     */
    set_bot(slot, difficulty) {
        wasm.sim_set_bot(this.__wbg_ptr, slot, difficulty);
    }
    /**
     * @param {number} slot
     * @param {number} buttons
     * @param {number} aim_x
     * @param {number} aim_y
     */
    set_input(slot, buttons, aim_x, aim_y) {
        wasm.sim_set_input(this.__wbg_ptr, slot, buttons, aim_x, aim_y);
    }
    /**
     * @returns {Uint8Array}
     */
    snapshot() {
        const ret = wasm.sim_snapshot(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Bots decide from the pre-step state, then everyone moves together.
     */
    step() {
        wasm.sim_step(this.__wbg_ptr);
    }
    /**
     * @param {number} ticks
     */
    step_many(ticks) {
        wasm.sim_step_many(this.__wbg_ptr, ticks);
    }
    /**
     * @returns {number}
     */
    sudden_death_tick() {
        const ret = wasm.sim_sudden_death_tick(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    tick() {
        const ret = wasm.sim_tick(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} slot
     */
    tutorial_banish(slot) {
        wasm.sim_tutorial_banish(this.__wbg_ptr, slot);
    }
    /**
     * @param {number} student
     * @param {number} target
     */
    tutorial_kill(student, target) {
        wasm.sim_tutorial_kill(this.__wbg_ptr, student, target);
    }
    /**
     * @param {number} slot
     */
    tutorial_pin_health(slot) {
        wasm.sim_tutorial_pin_health(this.__wbg_ptr, slot);
    }
    /**
     * @param {number} victim
     * @param {number} rider
     */
    tutorial_stomp(victim, rider) {
        wasm.sim_tutorial_stomp(this.__wbg_ptr, victim, rider);
    }
    /**
     * Fill `out` (length `view_len()`) with the render view.
     * @param {Int32Array} out
     */
    view(out) {
        var ptr0 = passArray32ToWasm0(out, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.sim_view(this.__wbg_ptr, ptr0, len0, out);
    }
    /**
     * @returns {Int32Array}
     */
    weapon_spawns() {
        const ret = wasm.sim_weapon_spawns(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    winner() {
        const ret = wasm.sim_winner(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) Sim.prototype[Symbol.dispose] = Sim.prototype.free;

/**
 * Back-a-Bird class of slot 0 for a bank seed (the backed hero is always drawn into slot 0).
 * @param {number} seed
 * @param {number} map_id
 * @param {Int32Array} difficulties
 * @returns {number}
 */
export function back_bird_class(seed, map_id, difficulties) {
    const ptr0 = passArray32ToWasm0(difficulties, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.back_bird_class(seed, map_id, ptr0, len0);
    return ret;
}

/**
 * Headless all-bot round → [winner, ticks, kills×4, died_at×4, health×4, hash_hi, hash_lo].
 * @param {number} seed
 * @param {number} map_id
 * @param {Int32Array} difficulties
 * @returns {Int32Array}
 */
export function run_bot_round(seed, map_id, difficulties) {
    const ptr0 = passArray32ToWasm0(difficulties, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.run_bot_round(seed, map_id, ptr0, len0);
    var v2 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * @returns {Int32Array}
 */
export function view_layout() {
    const ret = wasm.view_layout();
    var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_copy_to_typed_array_88899a52af046901: function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        },
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./chickenz_sim_bg.js": import0,
    };
}

const SimFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_sim_free(ptr, 1));

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.byteLength === 0) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedInt32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('chickenz_sim_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
