import { NeutralToneMapping, WebGPURenderer } from 'three/webgpu';

import { FORCE_WEBGL_PARAM } from './config.ts';

type RendererProps = NonNullable<ConstructorParameters<typeof WebGPURenderer>[0]>;

/** `?forceWebGL` exercises the WebGL2 backend on WebGPU-capable machines (QA for older Safari/Android). */
export const forceWebGL = () => new URLSearchParams(window.location.search).has(FORCE_WEBGL_PARAM);

/**
 * WebGPURenderer picks WebGPU when available and silently falls back to WebGL2, so one code path
 * (TSL materials, RenderPipeline post) serves both.
 */
export async function createRenderer(props: object): Promise<WebGPURenderer> {
  const renderer = new WebGPURenderer({
    ...(props as RendererProps),
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    forceWebGL: forceWebGL(),
  });
  await renderer.init();
  renderer.toneMapping = NeutralToneMapping;
  return renderer;
}

export const backendName = (renderer: unknown) =>
  (renderer as { backend?: { isWebGPUBackend?: boolean } }).backend?.isWebGPUBackend
    ? 'webgpu'
    : 'webgl2';
