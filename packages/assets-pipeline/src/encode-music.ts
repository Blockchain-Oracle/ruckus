#!/usr/bin/env node
/**
 * Music tracks: loudness-normalise (music sits under SFX at -18 LUFS, -1 dBTP) and encode to
 * Opus/WebM + AAC/M4A. Loops are decoded whole and looped by the engine (no MP3 padding gaps).
 *
 * encode-music <in.mp3> <out/base-name>
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const LUFS = -18;
const TRUE_PEAK_DB = -1;
const OPUS_KBPS = 96;
const AAC_KBPS = 128;

const [input, outBase] = process.argv.slice(2);
if (!input || !outBase) {
  console.error('usage: encode-music <in> <out/base>');
  process.exit(1);
}
mkdirSync(dirname(resolve(outBase)), { recursive: true });
const filter = `loudnorm=I=${LUFS}:TP=${TRUE_PEAK_DB}:LRA=11`;
const ff = (args: string[]) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
ff([
  '-i',
  input,
  '-af',
  filter,
  '-ar',
  '48000',
  '-c:a',
  'libopus',
  '-b:a',
  `${OPUS_KBPS}k`,
  `${outBase}.webm`,
]);
ff([
  '-i',
  input,
  '-af',
  filter,
  '-ar',
  '48000',
  '-c:a',
  'aac',
  '-b:a',
  `${AAC_KBPS}k`,
  `${outBase}.m4a`,
]);
console.info(`encoded ${outBase}.{webm,m4a}`);
