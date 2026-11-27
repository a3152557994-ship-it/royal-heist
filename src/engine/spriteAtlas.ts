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
  for (const tid of TREASURE_IMAGE_IDS) {
    jobs.push(loadOne(`tr_${tid}`, `./assets/tr_${tid}.webp`));
  }
  preloadPromise = Promise.all(jobs).then(() => undefined);
  return preloadPromise;
}

export function getTreasureImg(defId: string): HTMLImageElement | null {
  return imageCache.get(`tr_${defId}`) || null;
}

export function getTreasureSrc(defId: string): string {
  return `./assets/tr_${defId}.webp`;
}
