import { NeutralToneMapping, WebGPURenderer } from 'three/webgpu';

import { FORCE_WEBGL_PARAM } from './config.ts';

type RendererProps = NonNullable<ConstructorParameters<typeof WebGPURenderer>[0]>;

/**
 * WebGL2 unless WebGPU is known-good here. `?forceWebGL` forces it for QA. Firefox's WebGPU is
 * still rolling out (and differs by OS/GPU), so Firefox renders through WebGL2, which three's
 * WebGPURenderer drives with the same TSL materials.
 */
export const forceWebGL = () =>
  new URLSearchParams(window.location.search).has(FORCE_WEBGL_PARAM) ||
  /firefox/i.test(navigator.userAgent);

async function build(props: RendererProps, webgl: boolean) {
  const renderer = new WebGPURenderer({
    ...props,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    forceWebGL: webgl,
  });
  await renderer.init();
  renderer.toneMapping = NeutralToneMapping;
  return renderer;
}

/**
 * One code path for both backends. If WebGPU exists but fails to initialise (driver, blocklist,
 * sandbox), fall back to WebGL2 on a fresh canvas rather than showing a dead backdrop.
 */
export async function createRenderer(props: object): Promise<WebGPURenderer> {
  const p = props as RendererProps;
  if (forceWebGL()) return build(p, true);
  try {
    return await build(p, false);
  } catch (error) {
    console.warn('WebGPU unavailable, using WebGL2', error);
    return build(p, true);
  }
}

export const backendName = (renderer: unknown) =>
  (renderer as { backend?: { isWebGPUBackend?: boolean } }).backend?.isWebGPUBackend
    ? 'webgpu'
    : 'webgl2';
