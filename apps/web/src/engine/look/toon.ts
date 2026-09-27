import {
  dot,
  float,
  max,
  min,
  mix,
  normalView,
  positionViewDirection,
  pow,
  smoothstep,
  step,
  texture,
  uniform,
} from 'three/tsl';
import {
  Color,
  DataTexture,
  MeshToonNodeMaterial,
  NearestFilter,
  type Node,
  RedFormat,
  type Texture,
} from 'three/webgpu';

/**
 * Three flat light bands: the one cartoon read every RUCKUS character shares (ADR-008). Soft for
 * textured characters (feathers read grainy under hard steps); hard for flat-coloured props.
 */
const BANDS = { soft: [150, 205, 255], hard: [90, 170, 255] } as const;
const gradients = new Map<keyof typeof BANDS, DataTexture>();
export function toonGradient(bands: keyof typeof BANDS = 'soft') {
  const cached = gradients.get(bands);
  if (cached) return cached;
  const tones = BANDS[bands];
  const g = new DataTexture(new Uint8Array(tones), tones.length, 1, RedFormat);
  g.minFilter = NearestFilter;
  g.magFilter = NearestFilter;
  g.generateMipmaps = false;
  g.needsUpdate = true;
  gradients.set(bands, g);
  return g;
}

/** Near-white, unsaturated texels take the player colour; beak, feet, comb and goggles keep theirs. */
const TINT_SAT_MAX = 0.3;
const TINT_SAT_SOFT = 0.12;
const TINT_LUM_MIN = 0.45;
const TINT_LUM_FULL = 0.75;
/** A stepped Fresnel rim: a toon edge light that also feeds the emissive (bloom) channel. */
const RIM_POWER = 3;
const RIM_EDGE = 0.55;
const RIM_STRENGTH = 0.16;

type ToonOptions = {
  map?: Texture | null;
  /** Player colour; the white areas of `map` are multiplied by it. */
  tint?: string;
  rim?: string;
};

/**
 * The shared toon material: three-band shading, an optional texture whose white areas take the
 * player colour (one GLB serves every player), and a stepped rim light. TSL, so it runs the same on
 * WebGPU and the WebGL2 fallback.
 */
export function makeToonMaterial({ map = null, tint, rim = '#c9b6ff' }: ToonOptions = {}) {
  const mat = new MeshToonNodeMaterial({ gradientMap: toonGradient() });
  const tintColor = uniform(new Color(tint ?? '#ffffff'));
  if (map) {
    const base = texture(map);
    const hi = max(base.r, max(base.g, base.b));
    const lo = min(base.r, min(base.g, base.b));
    const sat = hi.sub(lo).div(hi.add(1e-4));
    // Function form on purpose: TSL's method form `x.smoothstep(a, b)` takes x as the low edge.
    const mask = smoothstep(TINT_SAT_SOFT, TINT_SAT_MAX, sat)
      .oneMinus()
      .mul(smoothstep(TINT_LUM_MIN, TINT_LUM_FULL, hi));
    mat.colorNode = tint ? mix(base.rgb, base.rgb.mul(tintColor), mask) : base.rgb;
  } else {
    mat.colorNode = tintColor;
  }
  const fresnel = pow(dot(normalView, positionViewDirection).oneMinus().clamp(), float(RIM_POWER));
  // NodeMaterial.setupLighting reads emissiveNode for every node material; the typings only
  // declare it on MeshStandardNodeMaterial.
  (mat as MeshToonNodeMaterial & { emissiveNode: Node | null }).emissiveNode = uniform(
    new Color(rim),
  )
    .mul(step(float(RIM_EDGE), fresnel))
    .mul(RIM_STRENGTH);
  return Object.assign(mat, { tint: tintColor });
}
