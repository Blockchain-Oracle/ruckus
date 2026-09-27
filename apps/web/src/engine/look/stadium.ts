type Vec3 = readonly [number, number, number];

/** Fill lights: everything except the key. None of them cast shadows. */
export type FillLight =
  | { kind: 'ambient'; color: string; intensity: number }
  | { kind: 'directional'; position: Vec3; color: string; intensity: number }
  | {
      kind: 'point';
      position: Vec3;
      color: string;
      intensity: number;
      distance: number;
      decay?: number;
    };

/** The one floodlight: the only light allowed a shadow, and only on the high tier. */
export type KeyLight =
  | { kind: 'directional'; position: Vec3; color: string; intensity: number; shadow?: false }
  | {
      kind: 'spot';
      position: Vec3;
      color: string;
      intensity: number;
      angle: number;
      penumbra: number;
      distance: number;
      decay: number;
      shadow?: { mapSize: number; bias: number; normalBias: number };
    };

export type Bloom = {
  strength: number;
  radius: number;
  /** Linear luminance where bloom starts; unlit neon (`toneMapped={false}`) sits at ~1. */
  threshold: number;
};

/**
 * A game's whole lighting and grade, as data. Games declare one in their own config; StadiumRig
 * mounts the scene half and StadiumPost applies the renderer half, so no game touches the renderer.
 */
export type StadiumLook = {
  background: string;
  fog?: {
    color: string;
    near: number;
    far: number;
    /** Fog rides out with the camera (distance past it) when attract pulls far back. */
    follow?: { nearPast: number; farPast: number };
  };
  hemisphere?: { sky: string; ground: string; intensity: number };
  key?: KeyLight;
  fills?: readonly FillLight[];
  /** Reflections: the shared studio room, or a game's own map passed to StadiumRig. */
  environment?: { source: 'room' | 'custom'; intensity: number };
  toneMapping: 'neutral' | 'aces';
  exposure: number;
  post: {
    bloom?: Bloom;
    /** 0 = none; darkening at the corners. */
    vignette: number;
    /** 1 = unchanged. */
    saturation: number;
    /** Cartoon outline on toon materials (screen-space thickness). */
    outline?: { color: string; thickness: number };
  };
};
