#!/usr/bin/env node
/**
 * Build one audio sprite from a spec:
 *   { "loudnessLufs": -18, "sounds": { "ui.click~1": { "src": "click_a.mp3" }, ... } }
 * Each source is trimmed of leading/trailing silence and loudness-normalised (EBU R128, true peak
 * ≤ -1 dBTP), then all are packed with a silence gap into one file, encoded as Opus/WebM (primary)
 * and AAC/M4A (Safari fallback), plus a JSON map of seconds offsets for @arena/audio.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

type Spec = {
  loudnessLufs?: number;
  sounds: Record<string, { src: string; loop?: boolean }>;
};

const SAMPLE_RATE = 48_000;
const TRUE_PEAK_DB = -1;
const DEFAULT_LUFS = -18;
/** Gap between regions so decoder/resampler smear never bleeds one sound into the next. */
const GAP_S = 0.1;
const SILENCE_THRESHOLD_DB = -50;
const OPUS_KBPS = 96;
const AAC_KBPS = 128;

const ffmpeg = (args: string[]) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const durationOf = (file: string) =>
  Number(
    execFileSync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      file,
    ])
      .toString()
      .trim(),
  );

const [specPath, outBase] = process.argv.slice(2);
if (!specPath || !outBase) {
  console.error('usage: audio-sprite <spec.json> <out/base-name>');
  process.exit(1);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8')) as Spec;
const srcDir = dirname(resolve(specPath));
const work = mkdtempSync(join(tmpdir(), 'audio-sprite-'));
const lufs = spec.loudnessLufs ?? DEFAULT_LUFS;

try {
  const gap = join(work, 'gap.wav');
  ffmpeg(['-f', 'lavfi', '-i', `anullsrc=r=${SAMPLE_RATE}:cl=stereo`, '-t', String(GAP_S), gap]);

  const map: Record<string, { start: number; duration: number; loop?: boolean }> = {};
  const parts: string[] = [];
  let cursor = 0;

  for (const [name, { src, loop }] of Object.entries(spec.sounds)) {
    const out = join(work, `${parts.length}.wav`);
    // Loops keep their exact length (trimming would break the seam).
    const trim = loop
      ? ''
      : `silenceremove=start_periods=1:start_threshold=${SILENCE_THRESHOLD_DB}dB,areverse,silenceremove=start_periods=1:start_threshold=${SILENCE_THRESHOLD_DB}dB,areverse,`;
    ffmpeg([
      '-i',
      join(srcDir, src),
      '-af',
      `${trim}loudnorm=I=${lufs}:TP=${TRUE_PEAK_DB}:LRA=11`,
      '-ar',
      String(SAMPLE_RATE),
      '-ac',
      '2',
      out,
    ]);
    const duration = durationOf(out);
    // Generated takes are occasionally near-silent; trimming then leaves nothing. Fail, don't ship a gap.
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error(`${name}: ${src} is silent after trimming`);
    map[name] = {
      start: Number(cursor.toFixed(4)),
      duration: Number(duration.toFixed(4)),
      ...(loop ? { loop } : {}),
    };
    parts.push(out, gap);
    cursor += duration + GAP_S;
  }

  const list = join(work, 'list.txt');
  writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
  const packed = join(work, 'packed.wav');
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', packed]);

  mkdirSync(dirname(resolve(outBase)), { recursive: true });
  ffmpeg(['-i', packed, '-c:a', 'libopus', '-b:a', `${OPUS_KBPS}k`, `${outBase}.webm`]);
  ffmpeg([
    '-i',
    packed,
    '-c:a',
    'aac',
    '-b:a',
    `${AAC_KBPS}k`,
    '-movflags',
    '+faststart',
    `${outBase}.m4a`,
  ]);
  writeFileSync(`${outBase}.json`, `${JSON.stringify(map, null, 2)}\n`);
  console.info(`${basename(outBase)}: ${Object.keys(map).length} sounds, ${cursor.toFixed(2)} s`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
