import { toast } from 'sonner';

import {
  COUNTDOWN_S,
  decodeRun,
  encodeRun,
  newWorld,
  type Recording,
  recordedInput,
  step,
  TICK_HZ,
} from '@arena/sim-runner';

/** Links carry the run (`run`) and who ran it (`by`); nothing is stored anywhere. */
const RUN_PARAM = 'run';
const BY_PARAM = 'by';
const MAX_NAME = 16;
/** No honest race is longer than this; anything bigger is junk. */
const MAX_FRAMES = 400 * TICK_HZ;

export type Challenge = {
  run: Recording;
  by: string;
  /** Their result, recomputed from the run itself (a link can't claim a time it didn't run). */
  finishTicks: number;
  coins: number;
};

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
const fromBase64Url = (s: string) => {
  try {
    const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
};

/** Replays a run on its own course to find how it ends. */
export function replayResult(run: Recording) {
  const w = newWorld(run.seed, [-1]);
  const r = w.runners[0];
  if (!r) return null;
  while (w.phase !== 'over' && w.tick < MAX_FRAMES) {
    r.input = recordedInput(run, w.tick);
    step(w);
  }
  return r.finished >= 0
    ? { finishTicks: r.finished - COUNTDOWN_S * TICK_HZ, coins: r.coins }
    : null;
}

let cached: Challenge | null | undefined;
/** The challenge in this page's link, if it holds a real finished run. */
export function readChallenge(): Challenge | null {
  if (cached !== undefined) return cached;
  cached = null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(RUN_PARAM);
  const bytes = raw ? fromBase64Url(raw) : null;
  const run = bytes ? decodeRun(bytes, MAX_FRAMES) : null;
  const result = run ? replayResult(run) : null;
  if (run && result) {
    const by = (params.get(BY_PARAM) ?? 'A friend').slice(0, MAX_NAME) || 'A friend';
    cached = { run, by, ...result };
  }
  return cached;
}

/** Once raced (or declined), the link's challenge stops offering itself. */
export function clearChallenge() {
  cached = null;
  const url = new URL(window.location.href);
  url.searchParams.delete(RUN_PARAM);
  url.searchParams.delete(BY_PARAM);
  window.history.replaceState(null, '', url);
}

export function challengeLink(run: Recording, by: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('game', 'runner');
  url.searchParams.set(RUN_PARAM, toBase64Url(encodeRun(run)));
  url.searchParams.set(BY_PARAM, by.slice(0, MAX_NAME));
  return url.toString();
}

/** Share sheet on phones, clipboard elsewhere, the raw link if both are blocked (iframes). */
export async function shareChallenge(run: Recording, by: string, time: string) {
  const url = challengeLink(run, by);
  const text = `I ran Neon Dash in ${time}. Beat my run!`;
  try {
    // Phones get the share sheet; desktops copy (a share sheet there is an odd detour).
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: 'Neon Dash challenge', text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success('Challenge link copied', { description: text });
  } catch (error) {
    if ((error as Error).name === 'AbortError') return;
    toast.info(url, { description: 'Copy this link to challenge a friend', duration: 12_000 });
  }
}

export const raceClock = (ticks: number) => {
  const s = ticks / TICK_HZ;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
};
