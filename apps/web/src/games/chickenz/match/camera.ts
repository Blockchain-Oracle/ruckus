import { ALIVE_FLAG, FP_ONE, H, P, playerBase } from '@arena/sim-chickenz';

import { MAP_H, MAP_H_PX, MAP_W, TILE_PX } from '../config.ts';
import { useChickenzPrefs } from '../prefs.ts';
import { getDriver } from './runtime.ts';

/** Chickenz CameraSystem numbers: 1.3× close, 1.0× past 500 px apart, 1.5× kill-cam, 80 px pad. */
const ZOOM_CLOSE = 1.3;
const ZOOM_FAR = 1;
const CLOSE_PX = 250;
const FAR_PX = 500;
const KILL_CAM_ZOOM = 1.5;
const PAD_PX = 80;
const BODY_W_PX = 24;
const BODY_H_PX = 32;
/** Warmup and tutorial follow your bird at 1.3× (`CameraSystem.ts:60-81`). */
const FOLLOW_ZOOM = 1.3;
/** Your bird counts double when centring, so the camera favours your side of the fight. */
const LOCAL_WEIGHT = 2;

/**
 * Live framing for the CameraDirector while a match or fight plays (world units, zoom 1 = the
 * whole 540 px height). Clamped so the view never shows past the arena walls.
 */
export function chickenzFollow(aspect: number): { x: number; y: number; zoom: number } | null {
  const d = getDriver();
  if (!d || d.kind === 'exhibition') return null;
  // Dynamic Camera off: the play pose already frames the whole arena, fixed.
  if (!useChickenzPrefs.getState().dynamicCamera) return null;
  const v = d.curr;
  const n = v[H.playerCount] ?? 0;
  const local = d.humanSlot;

  if (d.kind === 'tutorial') {
    const b = playerBase(local);
    if (!((v[b + P.flags] ?? 0) & ALIVE_FLAG)) return clamp(MAP_W / 2, MAP_H / 2, ZOOM_FAR, aspect);
    const x = (v[b + P.x] ?? 0) / FP_ONE + BODY_W_PX / 2;
    const y = (v[b + P.y] ?? 0) / FP_ONE + BODY_H_PX / 2;
    return clamp(x / TILE_PX, MAP_H - y / TILE_PX, FOLLOW_ZOOM, aspect);
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let sx = 0;
  let sy = 0;
  let weight = 0;
  let alive = 0;
  let lastAlive = -1;
  for (let slot = 0; slot < n; slot++) {
    const b = playerBase(slot);
    if (!((v[b + P.flags] ?? 0) & ALIVE_FLAG)) continue;
    alive += 1;
    lastAlive = slot;
    const x = (v[b + P.x] ?? 0) / FP_ONE + BODY_W_PX / 2;
    const y = (v[b + P.y] ?? 0) / FP_ONE + BODY_H_PX / 2;
    const w = slot === local ? LOCAL_WEIGHT : 1;
    sx += x * w;
    sy += y * w;
    weight += w;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (alive === 0) return clamp(MAP_W / 2, MAP_H / 2, ZOOM_FAR, aspect);

  let cx = sx / weight;
  let cy = sy / weight;
  let zoom: number;
  const lingering = (v[H.deathLinger] ?? 0) > 0 || (v[H.matchOver] ?? 0) !== 0;
  if (lingering && alive === 1 && lastAlive >= 0) {
    zoom = KILL_CAM_ZOOM;
  } else {
    const spread = Math.hypot(maxX - minX, maxY - minY);
    zoom =
      spread < CLOSE_PX
        ? ZOOM_CLOSE
        : spread > FAR_PX
          ? ZOOM_FAR
          : ZOOM_CLOSE - ((spread - CLOSE_PX) / (FAR_PX - CLOSE_PX)) * (ZOOM_CLOSE - ZOOM_FAR);
    // Everyone alive (plus padding) must fit, like Chickenz's two-player fit.
    const needW = maxX - minX + 2 * PAD_PX;
    const needH = maxY - minY + 2 * PAD_PX;
    const fit = Math.min((MAP_H_PX * aspect) / needW, MAP_H_PX / needH);
    zoom = Math.max(ZOOM_FAR, Math.min(zoom, fit));
    cx = ((minX + maxX) / 2) * 0.5 + cx * 0.5;
    cy = ((minY + maxY) / 2) * 0.5 + cy * 0.5;
  }
  return clamp(cx / TILE_PX, MAP_H - cy / TILE_PX, zoom, aspect);
}

function clamp(x: number, y: number, zoom: number, aspect: number) {
  const halfH = MAP_H / 2 / zoom;
  const halfW = halfH * aspect;
  const cx = halfW * 2 >= MAP_W ? MAP_W / 2 : Math.min(Math.max(x, halfW), MAP_W - halfW);
  const cy = halfH * 2 >= MAP_H ? MAP_H / 2 : Math.min(Math.max(y, halfH), MAP_H - halfH);
  return { x: cx, y: cy, zoom };
}
