#!/usr/bin/env node
/**
 * Builds the RUCKUS chicken (ADR-008) from the Meshy Pro exports in assets-src/chicken/models:
 * one mesh and rig, every clip the games play (renamed to our verbs), root motion pinned so the sims
 * own position, the PBR maps dropped (toon shading reads the base colour only), the base colour
 * downsized, then resampled and meshopt-compressed.
 *
 *   node src/chicken-character.ts <source dir> <out.glb>
 *
 * The source dir (assets-src/chicken/src) holds the Meshy exports with textures stripped, plus
 * `base-color.jpg`: the retexture of the same model styled from the chosen design sheet (original
 * UVs kept), so it drops straight onto the rig. See docs/assets/chicken-cast.md for task ids.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type Animation, type Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { meshopt, prune, resample } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

/** Meshy clip name → the verb the games play it by. `core` is the base document. */
const CORE = {
  Idle: 'idle',
  RunFast: 'run',
  Regular_Jump: 'jump',
  Hit_Reaction: 'hit',
  Knock_Down: 'ko',
  Run_and_Shoot: 'shoot',
  Kick_a_Soccer_Ball: 'kick',
  slide_light: 'slide',
  Victory_Cheer: 'win',
  Angry_Ground_Stomp: 'lose',
} as const;
const EXTRA = {
  Idle_02: 'idleAlt',
  Run_and_Jump: 'runJump',
  falling_down: 'fall',
  Dead: 'dead',
  Walk_Forward_While_Shooting: 'walkShoot',
  Chest_Pound_Taunt: 'taunt',
  victory: 'winAlt',
  Sitting_Clap: 'clapSit',
  Cheer_with_Both_Hands: 'cheer',
  All_Night_Dance: 'dance',
} as const;
/** The rig task's free clips. */
const WALK = { 'Armature|walking_man|baselayer': 'walk' } as const;
const JOG = { 'Armature|running|baselayer': 'jog' } as const;

const ROOT_JOINT = 'Hips';
/** 1024² keeps the feather detail at phone scale; the 2K source is ~2.6 MB of JPEG. */
const BASE_COLOR_PX = 1024;
const BASE_COLOR_QUALITY = 3; // ffmpeg mjpeg qscale: 2 (best) – 31

const [dir, outPath] = process.argv.slice(2);
if (!dir || !outPath) {
  console.error('usage: chicken-character <models dir> <out.glb>');
  process.exit(1);
}

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const baseColor = readFileSync(join(dir, 'base-color.jpg'));
const doc = await io.read(join(dir, 'anim-core.glb'));
keepClips(doc, CORE);
copyClips(await io.read(join(dir, 'anim-extra.glb')), doc, EXTRA);
copyClips(await io.read(join(dir, 'walk.glb')), doc, WALK);
copyClips(await io.read(join(dir, 'run.glb')), doc, JOG);

const pinned = pinRootMotion(doc);
const dropped = dropRestTracks(doc);
toonMaterial(doc, baseColor);

await doc.transform(prune(), resample(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
doc.createExtension(EXTMeshoptCompression).setRequired(true);
await io.write(outPath, doc);

const clips = doc
  .getRoot()
  .listAnimations()
  .map((a) => a.getName());
console.info(
  `${outPath}: ${clips.length} clips (${clips.join(', ')}); ${pinned} root tracks pinned, ${dropped} rest tracks dropped`,
);

function keepClips(d: Document, wanted: Record<string, string>) {
  for (const anim of d.getRoot().listAnimations()) {
    const rename = wanted[anim.getName()];
    if (rename) anim.setName(rename);
    else disposeAnimation(anim);
  }
}

/**
 * Meshy clips carry travel in the hips (a run moves forward, a knock-down slides back). The sims
 * own position, so horizontal hip translation is pinned to the rest pose; the vertical bob stays.
 */
function pinRootMotion(d: Document) {
  let pinned = 0;
  for (const anim of d.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      if (ch.getTargetPath() !== 'translation' || ch.getTargetNode()?.getName() !== ROOT_JOINT)
        continue;
      const out = ch.getSampler()?.getOutput();
      const values = out?.getArray();
      const rest = ch.getTargetNode()?.getTranslation();
      if (!out || !values || !rest) continue;
      const pinnedValues = values.slice();
      for (let k = 0; k < pinnedValues.length; k += 3) {
        pinnedValues[k] = rest[0];
        pinnedValues[k + 2] = rest[2];
      }
      out.setArray(pinnedValues);
      pinned += 1;
    }
  }
  return pinned;
}

/** Toon shading reads the base colour only: no PBR maps, and the base colour at phone size. */
function toonMaterial(d: Document, image: Uint8Array) {
  for (const mat of d.getRoot().listMaterials()) {
    mat.setNormalTexture(null).setMetallicRoughnessTexture(null).setMetallicFactor(0);
    const tex = d.createTexture('baseColor');
    mat.setBaseColorTexture(tex);
    const work = mkdtempSync(join(tmpdir(), 'chicken-'));
    const src = join(work, 'src.jpg');
    const dst = join(work, 'base.jpg');
    writeFileSync(src, image);
    execFileSync('ffmpeg', [
      '-loglevel',
      'error',
      '-y',
      '-i',
      src,
      '-vf',
      `scale=${BASE_COLOR_PX}:${BASE_COLOR_PX}:flags=lanczos`,
      '-q:v',
      String(BASE_COLOR_QUALITY),
      dst,
    ]);
    tex.setImage(readFileSync(dst)).setMimeType('image/jpeg');
  }
}

/**
 * Tracks that hold a joint at its rest pose for the whole clip carry nothing: three's mixer blends
 * an unanimated joint back to its rest value.
 */
function dropRestTracks(d: Document) {
  const EPS = 1e-4;
  let dropped = 0;
  for (const anim of d.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const node = ch.getTargetNode();
      const path = ch.getTargetPath();
      const out = ch.getSampler()?.getOutput()?.getArray();
      if (!node || !out || (path !== 'translation' && path !== 'rotation' && path !== 'scale'))
        continue;
      const rest =
        path === 'translation'
          ? node.getTranslation()
          : path === 'rotation'
            ? node.getRotation()
            : node.getScale();
      const n = rest.length;
      let still = true;
      for (let k = 0; k < out.length && still; k++)
        still = Math.abs((out[k] ?? 0) - (rest[k % n] ?? 0)) < EPS;
      if (!still) continue;
      const sampler = ch.getSampler();
      ch.dispose();
      sampler?.dispose();
      dropped += 1;
    }
  }
  return dropped;
}

function disposeAnimation(anim: Animation) {
  for (const s of anim.listSamplers()) s.dispose();
  for (const c of anim.listChannels()) c.dispose();
  anim.dispose();
}

/** Copies clips across documents onto the same-named joints (every Meshy export shares the rig). */
function copyClips(from: Document, to: Document, wanted: Record<string, string>) {
  const joints = new Map(
    to
      .getRoot()
      .listNodes()
      .map((n) => [n.getName(), n]),
  );
  const buffer = to.getRoot().listBuffers()[0];
  for (const src of from.getRoot().listAnimations()) {
    const name = wanted[src.getName()];
    if (!name) continue;
    const anim = to.createAnimation(name);
    for (const ch of src.listChannels()) {
      const target = ch.getTargetNode();
      const node = target && joints.get(target.getName());
      const sampler = ch.getSampler();
      const input = sampler?.getInput();
      const output = sampler?.getOutput();
      const path = ch.getTargetPath();
      if (!node || !sampler || !input || !output || !path) continue;
      const copy = (a: typeof input) =>
        to
          .createAccessor()
          .setType(a.getType())
          .setArray(a.getArray()?.slice() ?? null)
          .setBuffer(buffer ?? null);
      const s = to
        .createAnimationSampler()
        .setInput(copy(input))
        .setOutput(copy(output))
        .setInterpolation(sampler.getInterpolation());
      anim.addSampler(s);
      anim.addChannel(
        to.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(s),
      );
    }
  }
}
