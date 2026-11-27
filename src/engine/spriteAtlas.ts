export type SpriteKey =
  | 'raider'
  | 'guard'
  | 'elite_guard'
  | 'boat'
  | 'chest_wood'
  | 'chest_rosewood'
  | 'chest_dragon'
  | 'chest_open'
  | 'tile_courtyard'
  | 'tile_carpet'
  | 'tile_water'
  | 'tile_roof';

const SPRITE_PATHS: Record<SpriteKey, string> = {
  raider: './assets/sp_raider.webp',
  guard: './assets/sp_guard.webp',
  elite_guard: './assets/sp_elite_guard.webp',
  boat: './assets/sp_boat.webp',
  chest_wood: './assets/sp_chest_wood.webp',
  chest_rosewood: './assets/sp_chest_rosewood.webp',
  chest_dragon: './assets/sp_chest_dragon.webp',
  chest_open: './assets/sp_chest_open.webp',
  tile_courtyard: './assets/tile_courtyard.webp',
  tile_carpet: './assets/tile_carpet.webp',
  tile_water: './assets/tile_water.webp',
  tile_roof: './assets/tile_roof.webp',
};

export const TREASURE_IMAGE_IDS = [
  'imperial_seal',
  'gold_buddha',
  'phoenix_crown',
  'emerald_cabbage',
  'dragon_cup',
  'gold_abacus',
  'jade_ruyi',
  'secret_ledger',
  'porcelain_vase',
  'night_pearl',
  'guard_token',
  'silver_ingot',
] as const;

const imageCache = new Map<string, HTMLImageElement>();
const patternCache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern>>();
let preloadPromise: Promise<void> | null = null;

function loadOne(key: string, src: string): Promise<void> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve();
  }
  if (imageCache.has(key)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      imageCache.set(key, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

export function preloadGameAtlas(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  const jobs: Promise<void>[] = [];
  for (const [k, src] of Object.entries(SPRITE_PATHS)) {
    jobs.push(loadOne(k, src));
  }
  for (const tid of TREASURE_IMAGE_IDS) {
    jobs.push(loadOne(`tr_${tid}`, `./assets/tr_${tid}.webp`));
  }
  preloadPromise = Promise.all(jobs).then(() => undefined);
  return preloadPromise;
}

export function getSpriteImg(key: SpriteKey): HTMLImageElement | null {
  return imageCache.get(key) || null;
}

export function getTreasureImg(defId: string): HTMLImageElement | null {
  return imageCache.get(`tr_${defId}`) || null;
}

export function getTreasureSrc(defId: string): string {
  return `./assets/tr_${defId}.webp`;
}

export function getTilePattern(
  ctx: CanvasRenderingContext2D,
  key: 'tile_courtyard' | 'tile_carpet' | 'tile_water' | 'tile_roof'
): CanvasPattern | null {
  const img = getSpriteImg(key);
  if (!img || !img.complete || img.naturalWidth === 0) return null;
  let ctxMap = patternCache.get(ctx);
  if (!ctxMap) {
    ctxMap = new Map();
    patternCache.set(ctx, ctxMap);
  }
  const cached = ctxMap.get(key);
  if (cached) return cached;
  const pat = ctx.createPattern(img, 'repeat');
  if (pat) ctxMap.set(key, pat);
  return pat;
}
