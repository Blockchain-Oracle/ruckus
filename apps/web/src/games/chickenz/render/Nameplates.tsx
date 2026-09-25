import { useFrame } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import type { Group, Mesh, MeshBasicMaterial } from 'three/webgpu';

import { ALIVE_FLAG, H, MAX_HEALTH_HP, P, playerBase } from '@arena/sim-chickenz';

import { DEPTH, MAP_H_PX, TILE_PX } from '../config.ts';
import type { ChickenzDriver } from '../sim/driver.ts';
import { lerpPx } from './lerp.ts';
import { loadPixelFont, type PixelText, pixelText } from './pixelText.ts';

/** Chickenz `drawPlayerOverlay` (GameScene.ts:2164-2221), in sim pixels from the body's top-left. */
const BODY_W_PX = 24;
const BODY_H_PX = 32;
const NAME_GAP_PX = 6;
const NAME_SIZE_PX = 10;
const BAR_TOP_PX = -3;
const BAR_H_PX = 4;
const SHAKE_BAR_H_PX = 3;
const SHAKE_GAP_PX = 2;
const ALERT_SIZE_PX = 7;
const ALERT_GAP_PX = 6;
const SHAKE_FULL = 100;
/** Alert alpha pulses `sin(tick·0.2)·0.3 + 0.7`. */
const PULSE_RATE = 0.2;
const PULSE_DEPTH = 0.3;
const HP_HIGH = 0.5;
const HP_LOW = 0.25;
const HP_COLORS = { high: '#66bb6a', mid: '#ffa726', low: '#ef5350' } as const;
/** Above every bird, rider or victim, so a stomped bird's bar is never hidden (GameScene.ts:2172). */
const Z = DEPTH.bird + 0.1;

/**
 * Plates always draw over the world, ordered among themselves (yours last, so on top) rather than
 * by depth: thin layers a hair apart z-fight at play-camera distance.
 */
export const OVERLAY = {
  transparent: true,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
} as const;
const PLATE_ORDER = 100;
const PLATE_ORDER_STEP = 10;
const FRONT_ORDER = PLATE_ORDER + PLATE_ORDER_STEP * 5;

const u = (px: number) => px / TILE_PX;

type Props = {
  slot: number;
  name: string;
  color: string;
  driver: ChickenzDriver;
  /** Your own plate wins when plates overlap in a scrum. */
  front?: boolean;
};

/** Name, HP bar and the stomp escape prompt riding above (and below) one bird. */
export function Nameplate({ slot, name, color, driver, front = false }: Props) {
  const group = useRef<Group>(null);
  const fill = useRef<Mesh>(null);
  const shake = useRef<Group>(null);
  const shakeFill = useRef<Mesh>(null);
  const alert = useRef<Mesh>(null);
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    void loadPixelFont().then(() => setFontReady(true));
  }, []);

  const label = useMemo<PixelText | null>(
    () =>
      fontReady
        ? pixelText(name.toUpperCase(), {
            sizePx: NAME_SIZE_PX,
            color,
            shadow: { dx: 1, dy: 1, color: '#000000' },
          })
        : null,
    [name, color, fontReady],
  );
  const alertText = useMemo<PixelText | null>(
    () =>
      fontReady
        ? pixelText('SHAKE HIM OFF!', {
            sizePx: ALERT_SIZE_PX,
            color: '#ffffff',
            stroke: { width: 2, color: '#000000' },
          })
        : null,
    [fontReady],
  );
  useEffect(() => () => label?.texture.dispose(), [label]);
  useEffect(() => () => alertText?.texture.dispose(), [alertText]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { prev, curr, alpha } = driver;
    const base = playerBase(slot);
    const alive = ((curr[base + P.flags] ?? 0) & ALIVE_FLAG) !== 0;
    g.visible = alive && slot < (curr[H.playerCount] ?? 0);
    if (!g.visible) return;
    const x = lerpPx(prev, curr, base + P.x, alpha);
    const y = lerpPx(prev, curr, base + P.y, alpha);
    // The group origin is the body's top centre; children offset in sim pixels (y down → -y up).
    g.position.set(u(x + BODY_W_PX / 2), u(MAP_H_PX - y), Z);

    const hp = Math.max(0, Math.min(1, (curr[base + P.health] ?? 0) / MAX_HEALTH_HP));
    const f = fill.current;
    if (f) {
      f.scale.x = Math.max(hp, 1e-4);
      f.position.x = u(-BODY_W_PX / 2) + (u(BODY_W_PX) * hp) / 2;
      const color = hp > HP_HIGH ? HP_COLORS.high : hp > HP_LOW ? HP_COLORS.mid : HP_COLORS.low;
      (f.material as MeshBasicMaterial).color.set(color);
    }

    const stomped = (curr[base + P.stompedBy] ?? -1) >= 0;
    const progress = Math.min(1, (curr[base + P.shakeProgress] ?? 0) / SHAKE_FULL);
    const sh = shake.current;
    if (sh) sh.visible = stomped && progress > 0;
    const sf = shakeFill.current;
    if (sf && stomped && progress > 0) {
      sf.scale.x = progress;
      sf.position.x = u(-BODY_W_PX / 2) + (u(BODY_W_PX) * progress) / 2;
    }
    const a = alert.current;
    if (a && alertText) {
      a.visible = stomped;
      const below = BODY_H_PX + SHAKE_GAP_PX + (progress > 0 ? ALERT_GAP_PX : 0);
      a.position.y = -u(below + alertText.heightPx / 2);
      const pulse = Math.sin((curr[H.tick] ?? 0) * PULSE_RATE) * PULSE_DEPTH + 1 - PULSE_DEPTH;
      (a.material as MeshBasicMaterial).opacity = pulse;
    }
  });

  const order = front ? FRONT_ORDER : PLATE_ORDER + slot * PLATE_ORDER_STEP;
  const barY = -u(BAR_TOP_PX + BAR_H_PX / 2);
  const shakeY = -u(BODY_H_PX + SHAKE_GAP_PX + SHAKE_BAR_H_PX / 2);
  return (
    <group ref={group} visible={false}>
      {label && (
        <mesh position={[0, u(NAME_GAP_PX + label.heightPx / 2), 0]} renderOrder={order + 3}>
          <planeGeometry args={[u(label.widthPx), u(label.heightPx)]} />
          <meshBasicMaterial map={label.texture} {...OVERLAY} />
        </mesh>
      )}
      <Bar
        y={barY}
        h={BAR_H_PX}
        track="#333333"
        fillRef={fill}
        fillColor={HP_COLORS.high}
        order={order}
      />
      <group ref={shake} position={[0, shakeY, 0]} visible={false}>
        <Bar
          y={0}
          h={SHAKE_BAR_H_PX}
          track="#444444"
          fillRef={shakeFill}
          fillColor="#ffee58"
          order={order}
        />
      </group>
      {alertText && (
        <mesh ref={alert} visible={false} renderOrder={order + 4}>
          <planeGeometry args={[u(alertText.widthPx), u(alertText.heightPx)]} />
          <meshBasicMaterial map={alertText.texture} {...OVERLAY} />
        </mesh>
      )}
    </group>
  );
}

/** Chickenz bars: a 1 px black frame round a dark track, filled from the left. */
function Bar({
  y,
  h,
  track,
  fillRef,
  fillColor,
  order,
}: {
  y: number;
  h: number;
  track: string;
  fillRef: RefObject<Mesh | null>;
  fillColor: string;
  order: number;
}) {
  return (
    <group position={[0, y, 0]}>
      <mesh renderOrder={order}>
        <planeGeometry args={[u(BODY_W_PX + 2), u(h + 2)]} />
        <meshBasicMaterial color="#000000" {...OVERLAY} />
      </mesh>
      <mesh renderOrder={order + 1}>
        <planeGeometry args={[u(BODY_W_PX), u(h)]} />
        <meshBasicMaterial color={track} {...OVERLAY} />
      </mesh>
      <mesh ref={fillRef} renderOrder={order + 2}>
        <planeGeometry args={[u(BODY_W_PX), u(h)]} />
        <meshBasicMaterial color={fillColor} {...OVERLAY} />
      </mesh>
    </group>
  );
}
