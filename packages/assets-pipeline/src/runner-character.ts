#!/usr/bin/env node
/**
 * Builds the runner's character: Quaternius's CC0 mannequin with only the clips the runner plays,
 * merged from Universal Animation Library 1 and 2 (same 65-joint rig), then resampled, quantized
 * and meshopt-compressed.
 *
 *   node src/runner-character.ts <UAL1_Standard.glb> <UAL2_Standard.glb> <out.glb>
 */
import { type Animation, type Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { meshopt, prune, resample } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

/** Clip name in the source → the name the game plays it by. */
const FROM_UAL1 = {
  Idle_Loop: 'idle',
  Sprint_Loop: 'run',
  Jump_Start: 'jumpStart',
  Jump_Loop: 'jumpAir',
  Jump_Land: 'jumpLand',
  Roll: 'roll',
  Hit_Chest: 'hit',
  Death01: 'wipeout',
  Dance_Loop: 'dance',
} as const;
const FROM_UAL2 = {
  Slide_Start: 'slideStart',
  Slide_Loop: 'slide',
  Slide_Exit: 'slideExit',
  Hit_Knockback: 'knockback',
  Yes: 'cheer',
} as const;

const [ual1Path, ual2Path, outPath] = process.argv.slice(2);
if (!ual1Path || !ual2Path || !outPath) {
  console.error('usage: runner-character <UAL1.glb> <UAL2.glb> <out.glb>');
  process.exit(1);
}

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read(ual1Path);
const donor = await io.read(ual2Path);

keepClips(doc, FROM_UAL1);
copyClips(donor, doc, FROM_UAL2);
const dropped = dropRestTracks(doc);

await doc.transform(prune(), resample(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
doc.createExtension(EXTMeshoptCompression).setRequired(true);
await io.write(outPath, doc);

const clips = doc
  .getRoot()
  .listAnimations()
  .map((a) => a.getName());
console.info(
  `${outPath}: ${clips.length} clips (${clips.join(', ')}), ${dropped} rest tracks dropped`,
);

function keepClips(d: Document, wanted: Record<string, string>) {
  for (const anim of d.getRoot().listAnimations()) {
    const rename = wanted[anim.getName()];
    if (rename) anim.setName(rename);
    else disposeAnimation(anim);
  }
}

/**
 * Tracks that hold a joint at its rest pose for the whole clip carry nothing: three's mixer blends
 * an unanimated joint back to its rest value. They are most of the data (all the scale tracks).
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

/** Copies clips across documents, retargeting channels to the same-named joints. */
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
