import { BagItem, Rarity, TreasureDef } from '../types/raid';
import { getTreasureImg } from './spriteAtlas';

export const RARITY_META: Record<
  Rarity,
  { label: string; color: string; bg: string; border: string; glow: string }
> = {
  common: {
    label: '凡品',
    color: '#D6D3D1',
    bg: 'rgba(68, 64, 60, 0.72)',
    border: '#78716C',
    glow: 'rgba(168, 162, 158, 0.25)',
  },
  rare: {
    label: '珍品',
    color: '#38BDF8',
    bg: 'rgba(12, 74, 110, 0.72)',
    border: '#0284C7',
    glow: 'rgba(56, 189, 248, 0.4)',
  },
  epic: {
    label: '极品',
    color: '#C084FC',
    bg: 'rgba(88, 28, 135, 0.74)',
    border: '#9333EA',
    glow: 'rgba(192, 132, 252, 0.5)',
  },
  legendary: {
    label: '大金',
    color: '#FBBF24',
    bg: 'rgba(120, 53, 15, 0.82)',
    border: '#F59E0B',
    glow: 'rgba(251, 191, 36, 0.72)',
  },
  mythic: {
    label: '传世大红',
    color: '#FB7185',
    bg: 'rgba(136, 19, 55, 0.88)',
    border: '#F43F5E',
    glow: 'rgba(244, 63, 94, 0.92)',
  },
};

export const TREASURES: Record<string, TreasureDef> = {
  silver_ingot: {
    id: 'silver_ingot',
    name: '官铸纹银锭',
    enName: 'Silver Sycee',
    rarity: 'common',
    gridW: 1,
    gridH: 1,
    valueWan: 15,
    weightKg: 1.5,
    iconType: 'silver_ingot',
  },
  guard_token: {
    id: 'guard_token',
    name: '锦衣卫象牙腰牌',
    enName: 'Guard Ivory Plaque',
    rarity: 'rare',
    gridW: 1,
    gridH: 1,
    valueWan: 48,
    weightKg: 0.8,
    iconType: 'guard_token',
  },
  night_pearl: {
    id: 'night_pearl',
    name: '南海夜明珠',
    enName: 'Luminescent Pearl',
    rarity: 'epic',
    gridW: 1,
    gridH: 1,
    valueWan: 135,
    weightKg: 1.0,
    iconType: 'pearl',
  },
  porcelain_vase: {
    id: 'porcelain_vase',
    name: '宣德青花梅瓶',
    enName: 'Ming Blue Vase',
    rarity: 'rare',
    gridW: 1,
    gridH: 2,
    valueWan: 92,
    weightKg: 3.5,
    iconType: 'porcelain_vase',
  },
  secret_ledger: {
    id: 'secret_ledger',
    name: '百官行贿黑账册',
    enName: 'Secret Bribe Ledger',
    rarity: 'epic',
    gridW: 2,
    gridH: 1,
    valueWan: 210,
    weightKg: 1.8,
    iconType: 'secret_ledger',
  },
  jade_ruyi: {
    id: 'jade_ruyi',
    name: '羊脂白玉如意',
    enName: 'White Jade Ruyi',
    rarity: 'epic',
    gridW: 2,
    gridH: 1,
    valueWan: 260,
    weightKg: 2.8,
    iconType: 'jade_ruyi',
  },
  gold_abacus: {
    id: 'gold_abacus',
    name: '紫金九梁算盘',
    enName: 'Solid Gold Abacus',
    rarity: 'legendary',
    gridW: 2,
    gridH: 1,
    valueWan: 520,
    weightKg: 5.0,
    iconType: 'gold_abacus',
  },
  dragon_cup: {
    id: 'dragon_cup',
    name: '金瓯永固九龙杯',
    enName: 'Golden Dragon Chalice',
    rarity: 'legendary',
    gridW: 1,
    gridH: 2,
    valueWan: 680,
    weightKg: 4.5,
    iconType: 'dragon_cup',
  },
  emerald_cabbage: {
    id: 'emerald_cabbage',
    name: '传世翠玉白菜',
    enName: 'Imperial Jadeite Cabbage',
    rarity: 'legendary',
    gridW: 2,
    gridH: 2,
    valueWan: 1180,
    weightKg: 7.5,
    iconType: 'emerald_cabbage',
  },
  phoenix_crown: {
    id: 'phoenix_crown',
    name: '九龙九凤东珠冠',
    enName: 'Empress Pearl Crown',
    rarity: 'mythic',
    gridW: 2,
    gridH: 2,
    valueWan: 2400,
    weightKg: 6.5,
    iconType: 'phoenix_crown',
  },
  gold_buddha: {
    id: 'gold_buddha',
    name: '纯金嵌宝千手佛',
    enName: 'Solid Gold Buddha',
    rarity: 'mythic',
    gridW: 2,
    gridH: 3,
    valueWan: 3800,
    weightKg: 16.0,
    iconType: 'gold_buddha',
  },
  imperial_seal: {
    id: 'imperial_seal',
    name: '受命于天传国玉玺',
    enName: 'Heirloom Seal of the Realm',
    rarity: 'mythic',
    gridW: 2,
    gridH: 2,
    valueWan: 5200,
    weightKg: 10.0,
    iconType: 'imperial_seal',
  },
};

export function rollTreasureForChest(
  tier: 'wood' | 'rosewood' | 'dragon_vault',
  luckBonus = 0
): string {
  const r = Math.random() + luckBonus * 0.06;
  if (tier === 'wood') {
    if (r > 0.92) return 'night_pearl';
    if (r > 0.68) return 'porcelain_vase';
    return 'silver_ingot';
  }
  if (tier === 'rosewood') {
    if (r > 0.94) return 'emerald_cabbage';
    if (r > 0.78) return 'gold_abacus';
    if (r > 0.55) return 'jade_ruyi';
    if (r > 0.32) return 'secret_ledger';
    return 'night_pearl';
  }
  // dragon_vault: guaranteed high-tier Gold or Mythic Red!
  if (r > 0.82) return 'imperial_seal';
  if (r > 0.60) return 'gold_buddha';
  if (r > 0.36) return 'phoenix_crown';
  if (r > 0.16) return 'emerald_cabbage';
  return 'dragon_cup';
}

export function getBagDimensions(bagLevel: number, isGodMode = false): { cols: number; rows: number } {
  if (isGodMode) return { cols: 6, rows: 5 };
  switch (bagLevel) {
    case 0:
      return { cols: 4, rows: 4 };
    case 1:
      return { cols: 5, rows: 4 };
    case 2:
      return { cols: 5, rows: 5 };
    default:
      return { cols: 6, rows: 5 };
  }
}

export function itemFootprint(item: { defId: string; rotated: boolean }): { w: number; h: number } {
  const def = TREASURES[item.defId];
  if (!def) return { w: 1, h: 1 };
  return item.rotated ? { w: def.gridH, h: def.gridW } : { w: def.gridW, h: def.gridH };
}

export function canPlaceInBag(
  bag: BagItem[],
  cols: number,
  rows: number,
  candidate: { defId: string; gx: number; gy: number; rotated: boolean; ignoreUid?: string }
): boolean {
  const { w, h } = itemFootprint(candidate);
  if (candidate.gx < 0 || candidate.gy < 0 || candidate.gx + w > cols || candidate.gy + h > rows) {
    return false;
  }
  for (const existing of bag) {
    if (candidate.ignoreUid && existing.uid === candidate.ignoreUid) continue;
    const ef = itemFootprint(existing);
    const overlapX = candidate.gx < existing.gx + ef.w && candidate.gx + w > existing.gx;
    const overlapY = candidate.gy < existing.gy + ef.h && candidate.gy + h > existing.gy;
    if (overlapX && overlapY) return false;
  }
  return true;
}

/**
 * Automatically finds the first open slot (trying normal orientation then rotated 90°)
 */
export function findAutoFitSlot(
  bag: BagItem[],
  cols: number,
  rows: number,
  defId: string
): { gx: number; gy: number; rotated: boolean } | null {
  const def = TREASURES[defId];
  if (!def) return null;
  const orientations = def.gridW === def.gridH ? [false] : [false, true];
  for (const rotated of orientations) {
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        if (canPlaceInBag(bag, cols, rows, { defId, gx, gy, rotated })) {
          return { gx, gy, rotated };
        }
      }
    }
  }
  return null;
}

export function computeBagTotals(bag: BagItem[]): { totalValueWan: number; totalWeightKg: number; mythicCount: number } {
  let totalValueWan = 0;
  let totalWeightKg = 0;
  let mythicCount = 0;
  for (const it of bag) {
    const def = TREASURES[it.defId];
    if (!def) continue;
    totalValueWan += def.valueWan;
    totalWeightKg += def.weightKg;
    if (def.rarity === 'mythic') mythicCount += 1;
  }
  return {
    totalValueWan: Math.round(totalValueWan),
    totalWeightKg: Math.round(totalWeightKg * 10) / 10,
    mythicCount,
  };
}

const ICON_TO_DEF_ID: Record<TreasureDef['iconType'], string> = {
  silver_ingot: 'silver_ingot',
  pearl: 'night_pearl',
  jade_ruyi: 'jade_ruyi',
  porcelain_vase: 'porcelain_vase',
  gold_abacus: 'gold_abacus',
  emerald_cabbage: 'emerald_cabbage',
  dragon_cup: 'dragon_cup',
  phoenix_crown: 'phoenix_crown',
  gold_buddha: 'gold_buddha',
  imperial_seal: 'imperial_seal',
  guard_token: 'guard_token',
  secret_ledger: 'secret_ledger',
};

/**
 * Draws real high-resolution painted museum antique art on Canvas (zero geometric placeholder shapes!)
 */
export function drawTreasureIcon(
  ctx: CanvasRenderingContext2D,
  iconType: TreasureDef['iconType'],
  cx: number,
  cy: number,
  size: number
) {
  const defId = ICON_TO_DEF_ID[iconType] || iconType;
  const img = getTreasureImg(defId);
  ctx.save();
  ctx.translate(cx, cy);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  }
  ctx.restore();
}
