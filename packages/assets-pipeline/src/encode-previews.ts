#!/usr/bin/env node
/**
 * Hub landing previews: crops, trims and encodes each game's recorded attract (from
 * tooling/browser-checks/src/capture-previews.ts) into a short muted loop: VP9 WebM first, H.264
 * MP4 for older Safari, plus a JPEG poster so the card paints before the video loads.
 *
 *   node src/encode-previews.ts <rawDir> <outDir>
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Source is 1280×720; each crop is 16:9 around where that game's action sits. */
const CROPS = {
  chickenz: { w: 960, h: 540, x: 240, y: 110 },
  pool: { w: 880, h: 495, x: 240, y: 150 },
  soccer: { w: 1152, h: 648, x: 64, y: 72 },
  runner: { w: 1024, h: 576, x: 128, y: 100 },
} as const;
/** Skip the load and the dolly; keep a stretch of settled attract. */
const START_S = 7;
const LENGTH_S = 8;
const FADE_S = 0.3;
const OUT = { w: 640, h: 360, fps: 30 } as const;

const [rawDir, outDir] = process.argv.slice(2);
if (!rawDir || !outDir) {
  console.error('usage: encode-previews <rawDir> <outDir>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const ffmpeg = (args: string[]) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

for (const [id, c] of Object.entries(CROPS)) {
  const input = join(rawDir, `${id}.webm`);
  // Soft in/out so the loop's seam reads as a cut between shots, not a glitch.
  const vf = [
    `crop=${c.w}:${c.h}:${c.x}:${c.y}`,
    `scale=${OUT.w}:${OUT.h}:flags=lanczos`,
    `fps=${OUT.fps}`,
    `fade=t=in:st=0:d=${FADE_S}`,
    `fade=t=out:st=${LENGTH_S - FADE_S}:d=${FADE_S}`,
  ].join(',');
  const trim = ['-ss', String(START_S), '-t', String(LENGTH_S), '-i', input, '-an', '-vf', vf];
  const webm = join(outDir, `${id}.webm`);
  const mp4 = join(outDir, `${id}.mp4`);
  const jpg = join(outDir, `${id}.jpg`);
  ffmpeg([
    ...trim,
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '42',
    '-row-mt',
    '1',
    '-deadline',
    'good',
    webm,
  ]);
  ffmpeg([
    ...trim,
    '-c:v',
    'libx264',
    '-crf',
    '27',
    '-preset',
    'slow',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    mp4,
  ]);
  const still = vf.split(',fade')[0] ?? vf;
  ffmpeg([
    '-ss',
    String(START_S + 1),
    '-i',
    input,
    '-frames:v',
    '1',
    '-vf',
    still,
    '-q:v',
    '4',
    jpg,
  ]);
  const kb = (p: string) => Math.round(statSync(p).size / 1024);
  console.info(`${id}: webm ${kb(webm)} KB · mp4 ${kb(mp4)} KB · poster ${kb(jpg)} KB`);
}
