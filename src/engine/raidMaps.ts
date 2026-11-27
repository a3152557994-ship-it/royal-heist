import { MapId, RaidMapConfig, RectWall, Vec2 } from '../types/raid';

export const RAID_MAPS: Record<MapId, RaidMapConfig> = {
  salt_office: {
    id: 'salt_office',
    name: '两淮盐运司衙门',
    subtitle: '新手爽摸图 · 3名打更护院 · 遍地纹银与青花瓷，适合攒第一桶金升级大包袱',
    escapeRateLabel: '全服撤离率 41.6%',
    durationSec: 85,
    width: 1500,
    height: 1200,
    spawn: { x: 750, y: 1080 },
    extractZone: { x: 750, y: 1095, radius: 74 },
    roomLabels: [
      { x: 750, y: 1150, text: '⛵ 后门芦苇暗河撤离点' },
      { x: 380, y: 760, text: '西厢银钱账房' },
      { x: 1120, y: 760, text: '东厢盐引库' },
      { x: 750, y: 290, text: '🔥 盐道密室金库（出大金）' },
    ],
    walls: [
      // Outer boundary walls
      { id: 'b_top', x: 40, y: 40, w: 1420, h: 36, kind: 'wall' },
      { id: 'b_left', x: 40, y: 40, w: 36, h: 1120, kind: 'wall' },
      { id: 'b_right', x: 1424, y: 40, w: 36, h: 1120, kind: 'wall' },
      { id: 'b_bot_l', x: 40, y: 980, w: 560, h: 180, kind: 'water' },
      { id: 'b_bot_r', x: 900, y: 980, w: 560, h: 180, kind: 'water' },
      { id: 'b_bot_dock', x: 600, y: 1148, w: 300, h: 40, kind: 'water' },

      // West & East wing rooms
      { id: 'w_wing_top', x: 140, y: 560, w: 380, h: 28, kind: 'wall' },
      { id: 'w_wing_r', x: 500, y: 560, w: 28, h: 240, kind: 'wall' },
      { id: 'e_wing_top', x: 980, y: 560, w: 380, h: 28, kind: 'wall' },
      { id: 'e_wing_l', x: 972, y: 560, w: 28, h: 240, kind: 'wall' },

      // Courtyard stealth screens (block guard LOS!)
      { id: 'scr_1', x: 640, y: 700, w: 220, h: 24, kind: 'screen', label: '雕花影壁' },
      { id: 'scr_2', x: 420, y: 430, w: 160, h: 24, kind: 'screen' },
      { id: 'scr_3', x: 920, y: 430, w: 160, h: 24, kind: 'screen' },

      // North Inner Vault with Breakable Secret Wall!
      { id: 'vault_l', x: 470, y: 120, w: 28, h: 250, kind: 'wall' },
      { id: 'vault_r', x: 1002, y: 120, w: 28, h: 250, kind: 'wall' },
      { id: 'vault_b1', x: 470, y: 350, w: 190, h: 28, kind: 'wall' },
      { id: 'vault_b2', x: 840, y: 350, w: 190, h: 28, kind: 'wall' },
      { id: 'sec_1', x: 660, y: 350, w: 180, h: 28, kind: 'secret_wall', hp: 100, label: '🔨 楠木暗墙(靠近撬开)' },
    ],
    chests: [
      { id: 'ch_1', x: 230, y: 660, tier: 'wood', searchSeconds: 0.9 },
      { id: 'ch_2', x: 390, y: 840, tier: 'rosewood', searchSeconds: 1.3 },
      { id: 'ch_3', x: 1260, y: 660, tier: 'wood', searchSeconds: 0.9 },
      { id: 'ch_4', x: 1120, y: 840, tier: 'rosewood', searchSeconds: 1.3 },
      { id: 'ch_5', x: 220, y: 240, tier: 'rosewood', searchSeconds: 1.3 },
      { id: 'ch_6', x: 1280, y: 240, tier: 'rosewood', searchSeconds: 1.3 },
      { id: 'ch_7', x: 650, y: 195, tier: 'dragon_vault', searchSeconds: 1.9 },
      { id: 'ch_8', x: 850, y: 195, tier: 'dragon_vault', searchSeconds: 1.9 },
    ],
    guards: [
      {
        elite: false,
        speed: 108,
        visionRange: 235,
        waypoints: [
          { x: 580, y: 860 },
          { x: 580, y: 500 },
          { x: 920, y: 500 },
          { x: 920, y: 860 },
        ],
      },
      {
        elite: false,
        speed: 112,
        visionRange: 240,
        waypoints: [
          { x: 240, y: 490 },
          { x: 380, y: 490 },
          { x: 380, y: 180 },
          { x: 240, y: 180 },
        ],
      },
      {
        elite: true,
        speed: 126,
        visionRange: 265,
        waypoints: [
          { x: 560, y: 405 },
          { x: 940, y: 405 },
          { x: 1220, y: 480 },
          { x: 940, y: 405 },
        ],
      },
    ],
  },

  heshen_manor: {
    id: 'heshen_manor',
    name: '什刹海和大人王府',
    subtitle: '王牌爆红图 · 锡晋斋夹墙藏八亿两秘宝 · 5名提灯锦衣卫巡逻',
    escapeRateLabel: '全服撤离率 12.4%',
    durationSec: 95,
    width: 1760,
    height: 1360,
    spawn: { x: 880, y: 1230 },
    extractZone: { x: 880, y: 1245, radius: 76 },
    roomLabels: [
      { x: 880, y: 1310, text: '⛵ 后海乌篷快船撤离点' },
      { x: 340, y: 880, text: '西路古董多宝阁' },
      { x: 1420, y: 880, text: '东路翡翠账房' },
      { x: 880, y: 670, text: '银安大殿（高危巡逻区）' },
      { x: 880, y: 240, text: '👑 锡晋斋金丝楠木秘窖（必出大金/大红！）' },
    ],
    walls: [
      { id: 'm_top', x: 40, y: 40, w: 1680, h: 36, kind: 'wall' },
      { id: 'm_left', x: 40, y: 40, w: 36, h: 1280, kind: 'wall' },
      { id: 'm_right', x: 1684, y: 40, w: 36, h: 1280, kind: 'wall' },
      { id: 'm_wat_l', x: 40, y: 1130, w: 690, h: 190, kind: 'water' },
      { id: 'm_wat_r', x: 1030, y: 1130, w: 690, h: 190, kind: 'water' },
      { id: 'm_bot_dock', x: 730, y: 1308, w: 300, h: 40, kind: 'water' },

      // Side Pavilions
      { id: 'west_top', x: 130, y: 680, w: 410, h: 28, kind: 'wall' },
      { id: 'west_r', x: 520, y: 680, w: 28, h: 290, kind: 'wall' },
      { id: 'east_top', x: 1220, y: 680, w: 410, h: 28, kind: 'wall' },
      { id: 'east_l', x: 1212, y: 680, w: 28, h: 290, kind: 'wall' },

      // Center Hall Pillars & Screens
      { id: 'sc_a', x: 740, y: 880, w: 280, h: 24, kind: 'screen', label: '汉白玉屏风' },
      { id: 'pil_1', x: 670, y: 580, w: 48, h: 48, kind: 'pillar' },
      { id: 'pil_2', x: 1042, y: 580, w: 48, h: 48, kind: 'pillar' },
      { id: 'sc_b', x: 320, y: 430, w: 200, h: 24, kind: 'screen' },
      { id: 'sc_c', x: 1240, y: 430, w: 200, h: 24, kind: 'screen' },

      // Xijin Hall Double-Secret Vault
      { id: 'xj_l', x: 520, y: 100, w: 30, h: 310, kind: 'wall' },
      { id: 'xj_r', x: 1210, y: 100, w: 30, h: 310, kind: 'wall' },
      { id: 'xj_b1', x: 520, y: 382, w: 250, h: 28, kind: 'wall' },
      { id: 'xj_b2', x: 990, y: 382, w: 250, h: 28, kind: 'wall' },
      { id: 'xj_sec', x: 770, y: 382, w: 220, h: 28, kind: 'secret_wall', hp: 100, label: '🔨 锡晋斋夹墙(撬开爆大红!)' },
    ],
    chests: [
      { id: 'hm_1', x: 220, y: 780, tier: 'rosewood', searchSeconds: 1.2 },
      { id: 'hm_2', x: 360, y: 980, tier: 'wood', searchSeconds: 0.9 },
      { id: 'hm_3', x: 1540, y: 780, tier: 'rosewood', searchSeconds: 1.2 },
      { id: 'hm_4', x: 1380, y: 980, tier: 'wood', searchSeconds: 0.9 },
      { id: 'hm_5', x: 880, y: 600, tier: 'rosewood', searchSeconds: 1.4 },
      { id: 'hm_6', x: 230, y: 220, tier: 'rosewood', searchSeconds: 1.3 },
      { id: 'hm_7', x: 1530, y: 220, tier: 'rosewood', searchSeconds: 1.3 },
      { id: 'hm_8', x: 680, y: 200, tier: 'dragon_vault', searchSeconds: 2.0 },
      { id: 'hm_9', x: 880, y: 175, tier: 'dragon_vault', searchSeconds: 2.2 },
      { id: 'hm_10', x: 1080, y: 200, tier: 'dragon_vault', searchSeconds: 2.0 },
    ],
    guards: [
      {
        elite: false,
        speed: 116,
        visionRange: 250,
        waypoints: [
          { x: 620, y: 980 },
          { x: 620, y: 740 },
          { x: 1140, y: 740 },
          { x: 1140, y: 980 },
        ],
      },
      {
        elite: false,
        speed: 118,
        visionRange: 245,
        waypoints: [
          { x: 200, y: 580 },
          { x: 560, y: 580 },
          { x: 560, y: 980 },
          { x: 200, y: 580 },
        ],
      },
      {
        elite: false,
        speed: 118,
        visionRange: 245,
        waypoints: [
          { x: 1560, y: 580 },
          { x: 1200, y: 580 },
          { x: 1200, y: 980 },
          { x: 1560, y: 580 },
        ],
      },
      {
        elite: true,
        speed: 136,
        visionRange: 280,
        waypoints: [
          { x: 600, y: 465 },
          { x: 1160, y: 465 },
          { x: 1160, y: 640 },
          { x: 600, y: 640 },
        ],
      },
      {
        elite: true,
        speed: 142,
        visionRange: 270,
        waypoints: [
          { x: 620, y: 290 },
          { x: 1140, y: 290 },
        ],
      },
    ],
  },

  forbidden_vault: {
    id: 'forbidden_vault',
    name: '紫禁内务府皇库',
    subtitle: '炼狱富豪图 · 6大龙纹金柜满地传国玉玺 · 大内高手重兵把守',
    escapeRateLabel: '全服撤离率 4.7%',
    durationSec: 100,
    width: 1800,
    height: 1400,
    spawn: { x: 900, y: 1270 },
    extractZone: { x: 900, y: 1285, radius: 76 },
    roomLabels: [
      { x: 900, y: 1350, text: '⛵ 金水河暗渠撤离船' },
      { x: 400, y: 780, text: '西造办处珍宝房' },
      { x: 1400, y: 780, text: '东缎匹金银库' },
      { x: 900, y: 230, text: '🐉 乾清地宫传国玺秘库' },
    ],
    walls: [
      { id: 'f_top', x: 40, y: 40, w: 1720, h: 36, kind: 'wall' },
      { id: 'f_left', x: 40, y: 40, w: 36, h: 1320, kind: 'wall' },
      { id: 'f_right', x: 1724, y: 40, w: 36, h: 1320, kind: 'wall' },
      { id: 'f_wat_l', x: 40, y: 1170, w: 710, h: 190, kind: 'water' },
      { id: 'f_wat_r', x: 1050, y: 1170, w: 710, h: 190, kind: 'water' },
      { id: 'f_bot_dock', x: 750, y: 1348, w: 300, h: 40, kind: 'water' },

      { id: 'f_sc1', x: 750, y: 920, w: 300, h: 26, kind: 'screen' },
      { id: 'f_w1', x: 220, y: 640, w: 360, h: 28, kind: 'wall' },
      { id: 'f_w2', x: 1220, y: 640, w: 360, h: 28, kind: 'wall' },
      { id: 'f_p1', x: 700, y: 600, w: 56, h: 56, kind: 'pillar' },
      { id: 'f_p2', x: 1044, y: 600, w: 56, h: 56, kind: 'pillar' },

      { id: 'fv_l', x: 460, y: 100, w: 30, h: 320, kind: 'wall' },
      { id: 'fv_r', x: 1310, y: 100, w: 30, h: 320, kind: 'wall' },
      { id: 'fv_b1', x: 460, y: 392, w: 320, h: 28, kind: 'wall' },
      { id: 'fv_b2', x: 1020, y: 392, w: 320, h: 28, kind: 'wall' },
      { id: 'fv_sec', x: 780, y: 392, w: 240, h: 28, kind: 'secret_wall', hp: 100, label: '🔨 龙纹石门(撬开夺玉玺)' },
    ],
    chests: [
      { id: 'fc_1', x: 320, y: 780, tier: 'dragon_vault', searchSeconds: 1.9 },
      { id: 'fc_2', x: 1480, y: 780, tier: 'dragon_vault', searchSeconds: 1.9 },
      { id: 'fc_3', x: 240, y: 300, tier: 'rosewood', searchSeconds: 1.3 },
      { id: 'fc_4', x: 1560, y: 300, tier: 'rosewood', searchSeconds: 1.3 },
      { id: 'fc_5', x: 900, y: 700, tier: 'rosewood', searchSeconds: 1.3 },
      { id: 'fc_6', x: 620, y: 200, tier: 'dragon_vault', searchSeconds: 2.1 },
      { id: 'fc_7', x: 900, y: 170, tier: 'dragon_vault', searchSeconds: 2.3 },
      { id: 'fc_8', x: 1180, y: 200, tier: 'dragon_vault', searchSeconds: 2.1 },
    ],
    guards: [
      {
        elite: true,
        speed: 132,
        visionRange: 270,
        waypoints: [
          { x: 640, y: 1020 },
          { x: 1160, y: 1020 },
          { x: 1160, y: 760 },
          { x: 640, y: 760 },
        ],
      },
      {
        elite: true,
        speed: 135,
        visionRange: 270,
        waypoints: [
          { x: 180, y: 520 },
          { x: 620, y: 520 },
          { x: 620, y: 920 },
          { x: 180, y: 920 },
        ],
      },
      {
        elite: true,
        speed: 135,
        visionRange: 270,
        waypoints: [
          { x: 1620, y: 520 },
          { x: 1180, y: 520 },
          { x: 1180, y: 920 },
          { x: 1620, y: 920 },
        ],
      },
      {
        elite: true,
        speed: 148,
        visionRange: 295,
        waypoints: [
          { x: 520, y: 460 },
          { x: 1280, y: 460 },
        ],
      },
      {
        elite: true,
        speed: 152,
        visionRange: 280,
        waypoints: [
          { x: 560, y: 280 },
          { x: 1240, y: 280 },
        ],
      },
    ],
  },
};

/**
 * Circle vs AABB collision resolution for crisp wall sliding
 */
export function resolveCircleWalls(pos: Vec2, radius: number, walls: RectWall[]): Vec2 {
  let x = pos.x;
  let y = pos.y;
  for (const w of walls) {
    if (w.broken) continue;
    const nearestX = Math.max(w.x, Math.min(x, w.x + w.w));
    const nearestY = Math.max(w.y, Math.min(y, w.y + w.h));
    const dx = x - nearestX;
    const dy = y - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < 1e-8) {
      // Circle center is inside the AABB: push cleanly out to the nearest exterior edge + radius!
      const dLeft = x - w.x;
      const dRight = w.x + w.w - x;
      const dTop = y - w.y;
      const dBot = w.y + w.h - y;
      const m = Math.min(dLeft, dRight, dTop, dBot);
      if (m === dLeft) x = w.x - radius;
      else if (m === dRight) x = w.x + w.w + radius;
      else if (m === dTop) y = w.y - radius;
      else y = w.y + w.h + radius;
    } else if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;
      x += (dx / dist) * overlap;
      y += (dy / dist) * overlap;
    }
  }
  return { x, y };
}

function segmentIntersectsRect(p1: Vec2, p2: Vec2, r: RectWall): boolean {
  // Slab method AABB line segment intersection
  let tmin = 0;
  let tmax = 1;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  if (Math.abs(dx) < 1e-6) {
    if (p1.x < r.x || p1.x > r.x + r.w) return false;
  } else {
    const inv = 1 / dx;
    let t1 = (r.x - p1.x) * inv;
    let t2 = (r.x + r.w - p1.x) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }

  if (Math.abs(dy) < 1e-6) {
    if (p1.y < r.y || p1.y > r.y + r.h) return false;
  } else {
    const inv = 1 / dy;
    let t1 = (r.y - p1.y) * inv;
    let t2 = (r.y + r.h - p1.y) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/**
 * Checks if Guard has unobstructed Line-of-Sight to Player (water doesn't block sight; walls/screens/pillars do!)
 */
export function hasLineOfSight(from: Vec2, to: Vec2, walls: RectWall[]): boolean {
  for (const w of walls) {
    if (w.broken || w.kind === 'water') continue;
    if (segmentIntersectsRect(from, to, w)) return false;
  }
  return true;
}

/**
 * Casts a single ray at angle up to maxDist, returning distance to nearest opaque wall for realistic clipped lantern cones!
 */
export function castVisionRay(origin: Vec2, angle: number, maxDist: number, walls: RectWall[]): Vec2 {
  const step = 14;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let d = step; d <= maxDist; d += step) {
    const px = origin.x + cos * d;
    const py = origin.y + sin * d;
    for (const w of walls) {
      if (w.broken || w.kind === 'water') continue;
      if (px >= w.x && px <= w.x + w.w && py >= w.y && py <= w.y + w.h) {
        return { x: px, y: py };
      }
    }
  }
  return { x: origin.x + cos * maxDist, y: origin.y + sin * maxDist };
}
