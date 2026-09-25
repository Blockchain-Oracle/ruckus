import {
  BUSES,
  type Bus,
  DUCK,
  dbToGain,
  GAIN_GLIDE_S,
  LIMITER,
  MAX_VOICES_PER_SOUND,
  SAME_SOUND_COOLDOWN_S,
  TIME_CONSTANT_PER_RAMP,
  VARIATION,
} from './constants.ts';
import { fetchAndDecode, groupVariants, type Sprite, type SpriteMap } from './sprite.ts';
import { installUnlock } from './unlock.ts';

export type PlayOptions = {
  bus?: Bus;
  gainDb?: number;
  /** -1 (left) … 1 (right); the platformer maps screen x to this. */
  pan?: number;
  /** Semitone offset, e.g. rising pitch on combo steps. */
  semitones?: number;
  /** Disable random detune/gain (count-up ticks must stay on-scale). */
  exact?: boolean;
};

type Voice = { source: AudioBufferSourceNode; startedAt: number };

const CENTS_PER_SEMITONE = 100;
const MUSIC_START_LEAD_S = 0.05;

/**
 * The single Web Audio graph for the whole hub:
 *   sources → [ui | sfx | music → duck] → master → limiter → destination
 * One context per page (iOS caps them, and a second one would need its own unlock gesture).
 */
export class AudioEngine {
  readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly buses: Record<Bus, GainNode>;
  private readonly duckNode: GainNode;
  private readonly sprites = new Map<string, Sprite>();
  private readonly soundIndex = new Map<string, { sprite: Sprite; cursor: number }>();
  private readonly voices = new Map<string, Voice[]>();
  private readonly lastPlayed = new Map<string, number>();
  private stems = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>();
  private disposeUnlock: () => void;
  unlocked = false;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = LIMITER.thresholdDb;
    limiter.knee.value = LIMITER.kneeDb;
    limiter.ratio.value = LIMITER.ratio;
    limiter.attack.value = LIMITER.attackS;
    limiter.release.value = LIMITER.releaseS;
    limiter.connect(this.ctx.destination);

    this.master = this.ctx.createGain();
    this.master.connect(limiter);
    this.duckNode = this.ctx.createGain();
    this.duckNode.connect(this.master);

    const make = (bus: Bus) => {
      const g = this.ctx.createGain();
      g.connect(bus === 'music' ? this.duckNode : this.master);
      return g;
    };
    this.buses = Object.fromEntries(BUSES.map((b) => [b, make(b)])) as Record<Bus, GainNode>;
    this.disposeUnlock = installUnlock(this.ctx, () => {
      this.unlocked = true;
    });
  }

  setVolume(target: Bus | 'master', volume: number) {
    const node = target === 'master' ? this.master : this.buses[target];
    node.gain.setTargetAtTime(volume, this.ctx.currentTime, GAIN_GLIDE_S);
  }

  async loadSprite(id: string, urls: readonly string[], map: SpriteMap): Promise<void> {
    const buffer = await fetchAndDecode(this.ctx, urls);
    const sprite: Sprite = { buffer, regions: groupVariants(map) };
    this.sprites.set(id, sprite);
    for (const name of sprite.regions.keys()) this.soundIndex.set(name, { sprite, cursor: 0 });
  }

  has(name: string) {
    return this.soundIndex.has(name);
  }

  play(name: string, opts: PlayOptions = {}): (() => void) | null {
    const entry = this.soundIndex.get(name);
    if (!entry || this.ctx.state !== 'running') return null;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1) < SAME_SOUND_COOLDOWN_S) return null;
    this.lastPlayed.set(name, now);

    const variants = entry.sprite.regions.get(name);
    if (!variants?.length) return null;
    const region = variants[entry.cursor % variants.length];
    entry.cursor += 1;
    if (!region) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = entry.sprite.buffer;
    const jitter = (range: number) => (opts.exact ? 0 : (Math.random() * 2 - 1) * range);
    source.detune.value =
      (opts.semitones ?? 0) * CENTS_PER_SEMITONE + jitter(VARIATION.detuneCents);

    const gain = this.ctx.createGain();
    gain.gain.value = dbToGain((opts.gainDb ?? 0) + jitter(VARIATION.gainDb));
    let tail: AudioNode = gain;
    if (opts.pan !== undefined) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, opts.pan));
      gain.connect(panner);
      tail = panner;
    }
    source.connect(gain);
    tail.connect(this.buses[opts.bus ?? 'sfx']);

    if (region.loop) {
      source.loop = true;
      source.loopStart = region.start;
      source.loopEnd = region.start + region.duration;
      source.start(now, region.start);
    } else {
      source.start(now, region.start, region.duration);
    }
    this.trackVoice(name, source, now);
    return () => {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    };
  }

  /** Oldest-voice stealing keeps dense firefights from turning into mush (and from leaking nodes). */
  private trackVoice(name: string, source: AudioBufferSourceNode, startedAt: number) {
    const list = this.voices.get(name) ?? [];
    list.push({ source, startedAt });
    while (list.length > MAX_VOICES_PER_SOUND) {
      const oldest = list.shift();
      try {
        oldest?.source.stop();
      } catch {
        /* already ended */
      }
    }
    this.voices.set(name, list);
    source.onended = () => {
      const current = this.voices.get(name);
      if (current)
        this.voices.set(
          name,
          current.filter((v) => v.source !== source),
        );
    };
  }

  /**
   * Vertical music layering: all stems start on the same sample so they stay locked, and intensity
   * is just per-stem gain.
   */
  async playStems(stems: Record<string, readonly string[]>, initial: Record<string, number>) {
    this.stopMusic(0);
    const decoded = await Promise.all(
      Object.entries(stems).map(
        async ([layer, urls]) => [layer, await fetchAndDecode(this.ctx, urls)] as const,
      ),
    );
    const at = this.ctx.currentTime + MUSIC_START_LEAD_S;
    const next = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>();
    for (const [layer, buffer] of decoded) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = initial[layer] ?? 0;
      source.connect(gain).connect(this.buses.music);
      source.start(at);
      next.set(layer, { source, gain });
    }
    this.stems = next;
  }

  setLayer(layer: string, volume: number, rampS: number) {
    this.stems
      .get(layer)
      ?.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, rampS * TIME_CONSTANT_PER_RAMP);
  }

  stopMusic(fadeS: number) {
    const end = this.ctx.currentTime + fadeS;
    for (const { source, gain } of this.stems.values()) {
      gain.gain.setTargetAtTime(
        0,
        this.ctx.currentTime,
        Math.max(fadeS, 0.001) * TIME_CONSTANT_PER_RAMP,
      );
      source.stop(end + fadeS);
    }
    this.stems = new Map();
  }

  /** Dip the music bed; `holdS` of 0 means "until unduck()". */
  duck(db: number = DUCK.defaultDb, holdS = 0) {
    const t = this.ctx.currentTime;
    const g = this.duckNode.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(dbToGain(db), t, DUCK.attackS * TIME_CONSTANT_PER_RAMP);
    if (holdS > 0)
      g.setTargetAtTime(1, t + DUCK.attackS + holdS, DUCK.releaseS * TIME_CONSTANT_PER_RAMP);
  }

  unduck() {
    const t = this.ctx.currentTime;
    this.duckNode.gain.cancelScheduledValues(t);
    this.duckNode.gain.setTargetAtTime(1, t, DUCK.releaseS * TIME_CONSTANT_PER_RAMP);
  }

  dispose() {
    this.disposeUnlock();
    void this.ctx.close();
  }
}
