import { BagItem, Rarity, TreasureDef } from '../types/raid';

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

/**
 * Draws crisp vector treasure art on Canvas (both in-world dropped items, Grid UI, and Share Poster!)
 */
export function drawTreasureIcon(
  ctx: CanvasRenderingContext2D,
  iconType: TreasureDef['iconType'],
  cx: number,
  cy: number,
  size: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size * 0.42;

  switch (iconType) {
    case 'silver_ingot': {
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.2);
      ctx.quadraticCurveTo(-r * 0.6, -r * 0.85, 0, -r * 0.35);
      ctx.quadraticCurveTo(r * 0.6, -r * 0.85, r, -r * 0.2);
      ctx.lineTo(r * 0.72, r * 0.65);
      ctx.lineTo(-r * 0.72, r * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'pearl': {
      const g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r * 0.85);
      g.addColorStop(0, '#FFFFFF');
      g.addColorStop(0.5, '#BAE6FD');
      g.addColorStop(1, '#0284C7');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'porcelain_vase': {
      ctx.fillStyle = '#EFF6FF';
      ctx.strokeStyle = '#1D4ED8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.2, r * 0.58, r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(-r * 0.28, -r * 0.85, r * 0.56, r * 0.34);
      break;
    }
    case 'jade_ruyi': {
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = Math.max(4, size * 0.12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, r * 0.35);
      ctx.quadraticCurveTo(0, -r * 0.45, r * 0.75, -r * 0.15);
      ctx.stroke();
      ctx.fillStyle = '#6EE7B7';
      ctx.beginPath();
      ctx.arc(r * 0.72, -r * 0.2, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'gold_abacus': {
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#FEF3C7';
      ctx.lineWidth = 2;
      ctx.fillRect(-r * 0.9, -r * 0.55, r * 1.8, r * 1.1);
      ctx.strokeRect(-r * 0.9, -r * 0.55, r * 1.8, r * 1.1);
      ctx.fillStyle = '#451A03';
      ctx.fillRect(-r * 0.74, -r * 0.38, r * 1.48, r * 0.76);
      ctx.fillStyle = '#FCD34D';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(i * r * 0.28, -r * 0.14, r * 0.1, 0, Math.PI * 2);
        ctx.arc(i * r * 0.28, r * 0.16, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'emerald_cabbage': {
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.35, r * 0.55, r * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.22, r * 0.45, 0, Math.PI * 2);
      ctx.arc(r * 0.25, -r * 0.18, r * 0.42, 0, Math.PI * 2);
      ctx.arc(0, -r * 0.42, r * 0.44, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'dragon_cup': {
      ctx.fillStyle = '#FBBF24';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.75);
      ctx.lineTo(r * 0.55, -r * 0.75);
      ctx.lineTo(r * 0.32, r * 0.35);
      ctx.lineTo(-r * 0.32, r * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-r * 0.14, r * 0.35, r * 0.28, r * 0.45);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, -r * 0.25, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'phoenix_crown': {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(-r * 0.82, r * 0.45);
      ctx.lineTo(-r * 0.62, -r * 0.45);
      ctx.lineTo(-r * 0.2, 0);
      ctx.lineTo(0, -r * 0.8);
      ctx.lineTo(r * 0.2, 0);
      ctx.lineTo(r * 0.62, -r * 0.45);
      ctx.lineTo(r * 0.82, r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.arc(0, -r * 0.25, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'gold_buddha': {
      ctx.fillStyle = '#FBBF24';
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -r * 0.48, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, r * 0.75);
      ctx.quadraticCurveTo(0, -r * 0.35, r * 0.72, r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'imperial_seal': {
      // Mythic Heirloom Jade Seal with golden dragon knob & crimson stamp base!
      ctx.fillStyle = '#10B981';
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 3;
      ctx.fillRect(-r * 0.72, -r * 0.15, r * 1.44, r * 0.82);
      ctx.strokeRect(-r * 0.72, -r * 0.15, r * 1.44, r * 0.82);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-r * 0.72, r * 0.48, r * 1.44, r * 0.22);
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(0, -r * 0.38, r * 0.42, Math.PI, 0);
      ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(-r * 0.65, -r * 0.5, r * 1.3, r);
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 2;
      ctx.strokeRect(-r * 0.65, -r * 0.5, r * 1.3, r);
      break;
    }
  }
  ctx.restore();
}
