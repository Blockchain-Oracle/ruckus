/** One region of a packed audio file. Times are seconds, as written by the assets pipeline. */
export type SpriteRegion = { start: number; duration: number; loop?: boolean };
/**
 * Round-robin variants share a base name with a `~n` suffix (`hit~1`, `hit~2`); `play('hit')`
 * cycles through them.
 */
export type SpriteMap = Record<string, SpriteRegion>;

export type Sprite = {
  buffer: AudioBuffer;
  regions: Map<string, SpriteRegion[]>;
};

const VARIANT_SEPARATOR = '~';

export function groupVariants(map: SpriteMap): Map<string, SpriteRegion[]> {
  const groups = new Map<string, SpriteRegion[]>();
  for (const [name, region] of Object.entries(map)) {
    const base = name.split(VARIANT_SEPARATOR)[0] ?? name;
    const list = groups.get(base) ?? [];
    list.push(region);
    groups.set(base, list);
  }
  return groups;
}

/**
 * Opus-in-WebM first (smaller, gapless loops), AAC `.m4a` for Safari builds that can't decode it.
 * We try decoding rather than trusting canPlayType, which lies for decodeAudioData on some Safaris.
 */
export async function fetchAndDecode(
  ctx: BaseAudioContext,
  urls: readonly string[],
): Promise<AudioBuffer> {
  let lastError: unknown = new Error('No audio sources given');
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return await ctx.decodeAudioData(await res.arrayBuffer());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
