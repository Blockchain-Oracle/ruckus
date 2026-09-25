import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group, Mesh, MeshBasicMaterial } from 'three/webgpu';

import { ALIVE_FLAG, P, playerBase } from '@arena/sim-chickenz';

import { DEPTH, MAP_H_PX, TILE_PX } from '../config.ts';
import { type ChickenzEmote, EMOTE_TEXT, EMOTES, useEmotes } from '../emotes/emotes.ts';
import type { ChickenzDriver } from '../sim/driver.ts';
import { lerpPx } from './lerp.ts';
import { OVERLAY } from './Nameplates.tsx';
import { loadPixelFont, type PixelText, pixelBubble } from './pixelText.ts';

const BODY_W_PX = 24;
/** Above the nameplate and the "yours" arrow. */
const LIFT_PX = 36;
const RISE_PX = 3;
/** Pop in with a little overshoot, hold long enough to read, then fade. */
const POP_S = 0.12;
const SETTLE_S = 0.08;
const OVERSHOOT = 1.18;
const HOLD_S = 1.9;
const FADE_S = 0.3;
const Z = DEPTH.bird + 0.2;
/** Above every nameplate. */
const BUBBLE_ORDER = 200;

const u = (px: number) => px / TILE_PX;

function scaleAt(t: number) {
  if (t < POP_S) return (t / POP_S) * OVERSHOOT;
  if (t < POP_S + SETTLE_S) return OVERSHOOT - ((t - POP_S) / SETTLE_S) * (OVERSHOOT - 1);
  return 1;
}

/** The quick-chat bubble over one bird. */
export function EmoteBubble({ slot, driver }: { slot: number; driver: ChickenzDriver }) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const bubble = useEmotes((s) => s.bubbles[slot] ?? null);
  const started = useRef({ id: -1, at: 0 });
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    void loadPixelFont().then(() => setFontReady(true));
  }, []);
  const art = useMemo(() => {
    if (!fontReady) return null;
    return Object.fromEntries(EMOTES.map((e) => [e, pixelBubble(EMOTE_TEXT[e])])) as Record<
      ChickenzEmote,
      PixelText
    >;
  }, [fontReady]);
  useEffect(
    () => () => {
      for (const a of Object.values(art ?? {})) a.texture.dispose();
    },
    [art],
  );

  useFrame(({ clock }) => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    if (!bubble || !art) {
      g.visible = false;
      return;
    }
    const now = clock.elapsedTime;
    if (started.current.id !== bubble.id) started.current = { id: bubble.id, at: now };
    const t = now - started.current.at;
    const { prev, curr, alpha } = driver;
    const base = playerBase(slot);
    const alive = ((curr[base + P.flags] ?? 0) & ALIVE_FLAG) !== 0;
    if (t > POP_S + SETTLE_S + HOLD_S + FADE_S || !alive) {
      g.visible = false;
      return;
    }
    const a = art[bubble.emote];
    const material = m.material as MeshBasicMaterial;
    if (material.map !== a.texture) {
      material.map = a.texture;
      material.needsUpdate = true;
    }
    m.scale.set(u(a.widthPx), u(a.heightPx), 1);
    // Anchor at the tail tip so the pop grows out of the bird.
    m.position.y = u(a.heightPx) / 2;
    const fadeFrom = POP_S + SETTLE_S + HOLD_S;
    material.opacity = t > fadeFrom ? 1 - (t - fadeFrom) / FADE_S : 1;
    const x = lerpPx(prev, curr, base + P.x, alpha);
    const y = lerpPx(prev, curr, base + P.y, alpha);
    const rise = Math.min(1, t / (fadeFrom + FADE_S)) * RISE_PX;
    g.visible = true;
    g.position.set(u(x + BODY_W_PX / 2), u(MAP_H_PX - y + LIFT_PX + rise), Z);
    g.scale.setScalar(scaleAt(t));
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={mesh} renderOrder={BUBBLE_ORDER}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial {...OVERLAY} />
      </mesh>
    </group>
  );
}
