import {
  drawTreasureIcon,
  getBagDimensions,
  itemFootprint,
  RARITY_META,
  TREASURES,
} from '../engine/lootCatalog';
import { formatSilver } from '../engine/gameData';
import { RaiderProfile, RaidSummary } from '../types/raid';
import { IS_PURE_PLATFORM_MODE } from './raiderSave';

export async function renderRaidLootPoster(
  summary: RaidSummary,
  profile: RaiderProfile
): Promise<string> {
  const W = 1080;
  const H = 1560;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, summary.escaped ? '#1A1008' : '#220808');
  grad.addColorStop(1, '#080504');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = summary.escaped ? '#F5B94B' : '#EF4444';
  ctx.lineWidth = 5;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  // Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 30px "PingFang SC", sans-serif';
  ctx.fillText(`《夜探王府：摸金撤离》实机搜打撤晒包战报 ｜ UID:${profile.playerUid}`, W / 2, 115);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px "PingFang SC", sans-serif';
  ctx.fillText(
    summary.escaped
      ? summary.mythicCount > 0
        ? `🔥 摸出 ${summary.mythicCount} 件传世大红安全登船！`
        : '⛵ 满载奇珍金蝉脱壳！'
      : '💀 贪心恋战 · 满包大金爆了一地',
    W / 2,
    215
  );

  ctx.fillStyle = summary.escaped ? '#FBBF24' : '#F87171';
  ctx.font = 'bold 92px "PingFang SC", sans-serif';
  ctx.fillText(formatSilver(summary.totalValueWan), W / 2, 335);

  ctx.fillStyle = '#D6D3D1';
  ctx.font = '28px "PingFang SC", sans-serif';
  ctx.fillText(
    `潜入地图：${summary.mapName} ｜ 用时 ${summary.timeUsedSec}s ｜ 敲晕侍卫 ${summary.guardsKnockedOut} 名`,
    W / 2,
    395
  );

  // Draw Actual Visual Tetris Backpack Loot Grid right on the Share Poster!
  const isPro = Boolean(profile.proLicenseToken);
  const { cols, rows } = getBagDimensions(profile.upgrades.bagLevel, isPro && profile.godMode.infiniteTools);
  const cell = Math.min(130, Math.floor(760 / Math.max(cols, rows)));
  const gridW = cols * cell;
  const gridH = rows * cell;
  const gx0 = Math.round((W - gridW) / 2);
  const gy0 = 455;

  ctx.fillStyle = '#0D0806';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 4;
  ctx.fillRect(gx0 - 12, gy0 - 12, gridW + 24, gridH + 24);
  ctx.strokeRect(gx0 - 12, gy0 - 12, gridW + 24, gridH + 24);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.strokeStyle = 'rgba(120, 113, 108, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx0 + c * cell, gy0 + r * cell, cell, cell);
    }
  }

  for (const it of summary.itemsExtracted) {
    const def = TREASURES[it.defId];
    if (!def) continue;
    const fp = itemFootprint(it);
    const meta = RARITY_META[def.rarity];
    const x = gx0 + it.gx * cell + 4;
    const y = gy0 + it.gy * cell + 4;
    const w = fp.w * cell - 8;
    const h = fp.h * cell - 8;

    ctx.fillStyle = meta.bg;
    ctx.strokeStyle = meta.border;
    ctx.lineWidth = 3;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    drawTreasureIcon(ctx, def.iconType, x + w / 2, y + h / 2 - 10, Math.min(w, h) * 0.65);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "PingFang SC", sans-serif';
    ctx.fillText(def.name.slice(0, 5), x + w / 2, y + h - 14);
  }

  // Footer
  const footY = gy0 + gridH + 95;
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 34px "PingFang SC", sans-serif';
  ctx.fillText(
    `南洋永久金库总资产：${formatSilver(profile.vaultSilverWan)}`,
    W / 2,
    footY
  );

  if (!IS_PURE_PLATFORM_MODE) {
    ctx.fillStyle = '#A8A29E';
    ctx.font = '28px "PingFang SC", sans-serif';
    ctx.fillText(
      '手机电脑免下载秒玩：a3152557994-ship-it.github.io/royal-heist',
      W / 2,
      footY + 62
    );
  }

  return canvas.toDataURL('image/png');
}
