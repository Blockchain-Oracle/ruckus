#!/usr/bin/env node
/**
 * The crowd chicken: the built cast GLB cut down to a fan (≈700 triangles, a 256² texture, only
 * the stand clips). Derived from chicken.glb rather than the Meshy sources so the fan always
 * matches the shipped cast. The runtime bakes these clips into a vertex-animation texture.
 *
 *   node src/chicken-fan.ts <chicken.glb> <out.glb>
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { meshopt, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

/** Seen from the stands the silhouette carries it. UV seams stop meshopt near ~830 tris; that is fine. */
const TARGET_TRIS = 700;
/** meshopt error bound (fraction of the mesh extent) the simplifier may spend to hit the target. */
const SIMPLIFY_ERROR = 0.05;
const TEXTURE_PX = 256;
/** The stand's repertoire: calm, clapping, cheering, partying. */
const FAN_CLIPS = new Set(['idle', 'clapSit', 'cheer', 'dance']);

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('usage: chicken-fan <chicken.glb> <out.glb>');
  process.exit(1);
}

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});
const doc = await io.read(inPath);

for (const anim of doc.getRoot().listAnimations()) {
  if (FAN_CLIPS.has(anim.getName())) continue;
  for (const s of anim.listSamplers()) s.dispose();
  for (const c of anim.listChannels()) c.dispose();
  anim.dispose();
}

const tris = () =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0);
const before = tris();
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: TARGET_TRIS / before, error: SIMPLIFY_ERROR }),
);

for (const tex of doc.getRoot().listTextures()) {
  const image = tex.getImage();
  if (!image) continue;
  const work = mkdtempSync(join(tmpdir(), 'chicken-fan-'));
  writeFileSync(join(work, 'src.jpg'), image);
  execFileSync('ffmpeg', [
    '-loglevel',
    'error',
    '-y',
    '-i',
    join(work, 'src.jpg'),
    '-vf',
    `scale=${TEXTURE_PX}:${TEXTURE_PX}:flags=lanczos`,
    '-q:v',
    '3',
    join(work, 'out.jpg'),
  ]);
  tex.setImage(readFileSync(join(work, 'out.jpg'))).setMimeType('image/jpeg');
}

await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
doc.createExtension(EXTMeshoptCompression).setRequired(true);
await io.write(outPath, doc);
const clips = doc
  .getRoot()
  .listAnimations()
  .map((a) => a.getName());
console.info(`${outPath}: ${before} → ${tris()} tris; clips ${clips.join(', ')}`);
