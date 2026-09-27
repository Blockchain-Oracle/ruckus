import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import {
  float,
  mix,
  pass,
  saturation,
  screenUV,
  smoothstep,
  toonOutlinePass,
  uniform,
  vec4,
} from 'three/tsl';
import {
  ACESFilmicToneMapping,
  type Camera,
  Color,
  NeutralToneMapping,
  PCFShadowMap,
  RenderPipeline,
  type Scene,
  type WebGPURenderer,
} from 'three/webgpu';

import { POST } from './config.ts';
import { type Tier, useLookQuality } from './quality.ts';
import type { StadiumLook } from './stadium.ts';
import { flash, useStadium } from './store.ts';

type Grade = ReturnType<typeof makeGrade>;

function makeGrade() {
  return {
    saturation: uniform(1),
    vignette: uniform(0),
    flashColor: uniform(new Color('#ffffff')),
    flashAmount: uniform(0),
  };
}

/**
 * scene → (outline) → + bloom → saturation → vignette → hit flash → tone map + sRGB (the
 * pipeline's own output transform, so bloom adds in linear HDR before the curve).
 */
function buildPipeline(
  renderer: WebGPURenderer,
  scene: Scene,
  camera: Camera,
  look: StadiumLook | null,
  tier: Tier,
  grade: Grade,
) {
  if (!look) return null;
  const { outline, bloom: glow } = look.post;
  // The outline is the cartoon read of a character, so it survives even the `off` tier.
  if (tier === 'off' && !outline) return null;

  const samples = tier === 'high' ? POST.msaaSamples : 0;
  const scenePass = outline
    ? toonOutlinePass(scene, camera, new Color(outline.color), outline.thickness)
    : pass(scene, camera, { samples });
  if (outline) scenePass.options = { ...scenePass.options, samples };

  let rgb = scenePass.rgb;
  if (glow && tier !== 'off') {
    const b = bloom(scenePass, glow.strength, glow.radius, glow.threshold);
    b.setResolutionScale(tier === 'high' ? POST.bloomScaleHigh : POST.bloomScaleLow);
    rgb = rgb.add(b.rgb);
  }
  rgb = saturation(rgb, grade.saturation);
  // 0 at the centre, ~1.41 in the corners.
  const r = screenUV.sub(0.5).length().mul(2);
  rgb = rgb.mul(
    float(1).sub(smoothstep(POST.vignetteInner, POST.vignetteOuter, r).mul(grade.vignette)),
  );
  const edge = mix(float(POST.flashCentre), float(1), smoothstep(0, POST.vignetteOuter, r));
  rgb = mix(rgb, grade.flashColor, grade.flashAmount.mul(edge));

  return new RenderPipeline(renderer, vec4(rgb, 1));
}

/**
 * Owns the frame: at priority 1 R3F stops auto-rendering, so every scene draws through here.
 * Also the only writer of renderer-wide state (tone mapping, exposure, shadows), set from the
 * mounted look, so games never mutate the renderer and a game switch can't leak settings.
 */
export function StadiumPost() {
  const { gl, scene, camera } = useThree();
  const renderer = gl as unknown as WebGPURenderer;
  const look = useStadium((s) => s.look);
  const tier = useLookQuality((s) => s.tier);
  const grade = useMemo(makeGrade, []);

  useLayoutEffect(() => {
    renderer.toneMapping =
      look?.toneMapping === 'aces' ? ACESFilmicToneMapping : NeutralToneMapping;
    renderer.toneMappingExposure = look?.exposure ?? 1;
    renderer.shadowMap.enabled =
      tier === 'high' && look?.key?.kind === 'spot' && look.key.shadow !== undefined;
    renderer.shadowMap.type = PCFShadowMap;
    grade.saturation.value = look?.post.saturation ?? 1;
    grade.vignette.value = look?.post.vignette ?? 0;
  }, [renderer, look, tier, grade]);

  const pipeline = useMemo(
    () => buildPipeline(renderer, scene, camera, look, tier, grade),
    [renderer, scene, camera, look, tier, grade],
  );
  useEffect(() => () => pipeline?.dispose(), [pipeline]);

  useFrame((_, delta) => {
    flash.amount *= Math.exp(-POST.flashDecayPerS * delta);
    if (flash.amount < POST.flashFloor) flash.amount = 0;
    grade.flashAmount.value = flash.amount;
    grade.flashColor.value.copy(flash.color);
    if (pipeline) pipeline.render();
    else renderer.render(scene, camera);
  }, 1);

  return null;
}
