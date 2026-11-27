import { formatSilver, LORDS, tText } from '../engine/gameData';
import { Lang, PersistentProfile, RunOutcome } from '../types/game';
import { IS_PURE_PLATFORM_MODE } from './licenseAndSave';

export async function renderBattlePosterDataUrl(
  outcome: RunOutcome,
  profile: PersistentProfile,
  lang: Lang
): Promise<string> {
  const W = 1080;
  const H = 1560;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Imperial Noir Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  if (outcome.escaped) {
    bgGrad.addColorStop(0, '#1B1109');
    bgGrad.addColorStop(0.5, '#0F0A07');
    bgGrad.addColorStop(1, '#080504');
  } else {
    bgGrad.addColorStop(0, '#220909');
    bgGrad.addColorStop(0.5, '#110606');
    bgGrad.addColorStop(1, '#070404');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative double gold border
  const accent = outcome.escaped ? '#F5B94B' : '#EF4444';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(38, 38, W - 76, H - 76);
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.45;
  ctx.strokeRect(52, 52, W - 104, H - 104);
  ctx.globalAlpha = 1;

  // 2. Top Server Telemetry Tag
  ctx.fillStyle = 'rgba(245, 185, 75, 0.14)';
  ctx.fillRect(88, 92, W - 176, 68);
  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  const lord = LORDS.find((l) => l.id === outcome.lordId) || LORDS[0];
  ctx.fillText(
    lang === 'zh'
      ? `地球 ONLINE · 朝堂摸金服 战报鉴证 ｜ UID:${profile.playerUid}`
      : `ROYAL HEIST: CASH OUT · OFFICIAL RECORD ｜ UID:${profile.playerUid}`,
    W / 2,
    136
  );

  // 3. Main Verdict Title
  ctx.fillStyle = '#FFFBEB';
  ctx.font = 'bold 64px "Songti SC", "STSong", "Noto Serif SC", serif';
  ctx.fillText(tText(outcome.causeTitle, lang), W / 2, 265);

  ctx.fillStyle = '#D6C7B2';
  ctx.font = '32px "PingFang SC", sans-serif';
  ctx.fillText(
    `${tText(lord.name, lang)} · ${
      lang === 'zh' ? `熬过 ${outcome.watchesSurvived} 更天` : `Survived ${outcome.watchesSurvived} Watches`
    }`,
    W / 2,
    330
  );

  // 4. Center Hero Silver Box
  ctx.fillStyle = 'rgba(24, 15, 11, 0.92)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.fillRect(88, 385, W - 176, 310);
  ctx.strokeRect(88, 385, W - 176, 310);

  ctx.fillStyle = '#A89F91';
  ctx.font = '30px "PingFang SC", sans-serif';
  ctx.fillText(
    outcome.escaped
      ? lang === 'zh'
        ? '本局安全装船落袋现银'
        : 'SILVER SAFELY EXTRACTED'
      : lang === 'zh'
      ? '贪心晚撤一秒 · 被新皇当场抄没'
      : 'SILVER CONFISCATED BY NEW EMPEROR',
    W / 2,
    455
  );

  ctx.fillStyle = outcome.escaped ? '#FBBF24' : '#F87171';
  ctx.font = 'bold 96px "PingFang SC", sans-serif';
  const mainAmount = outcome.escaped ? outcome.silverExtractedWan : outcome.silverConfiscatedWan;
  ctx.fillText(formatSilver(mainAmount, lang), W / 2, 575);

  ctx.fillStyle = '#E7E5E4';
  ctx.font = 'bold 32px "PingFang SC", sans-serif';
  ctx.fillText(
    lang === 'zh'
      ? `战力排位：击败全服 ${outcome.rankPercentile.toFixed(1)}% 摸金掌柜 ｜ 最高警戒 ${'★'.repeat(Math.round(outcome.peakWanted)) || '☆'}`
      : `Outranked ${outcome.rankPercentile.toFixed(1)}% of Players ｜ Peak Alert ${'★'.repeat(Math.round(outcome.peakWanted)) || '☆'}`,
    W / 2,
    652
  );

  // 5. Epitaph & Earth-OL Sarcastic Player Review Box
  ctx.fillStyle = 'rgba(255, 251, 235, 0.05)';
  ctx.fillRect(88, 740, W - 176, 390);
  ctx.strokeStyle = 'rgba(245, 185, 75, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(88, 740, W - 176, 390);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 30px "PingFang SC", sans-serif';
  ctx.fillText(lang === 'zh' ? '📜 内阁密档判词：' : '📜 Imperial Verdict:', 126, 804);

  ctx.fillStyle = '#F5F5F4';
  ctx.font = '31px "PingFang SC", sans-serif';
  wrapCanvasText(ctx, tText(outcome.epitaph, lang), 126, 858, W - 252, 46);

  ctx.fillStyle = '#FB923C';
  ctx.font = 'bold 28px "PingFang SC", sans-serif';
  ctx.fillText(lang === 'zh' ? '💬 地球OL玩家退服热评：' : '💬 Player Salt Review:', 126, 995);

  ctx.fillStyle = '#D6D3D1';
  ctx.font = 'italic 29px "PingFang SC", sans-serif';
  wrapCanvasText(ctx, tText(outcome.earthReviewMeme, lang), 126, 1045, W - 252, 42);

  // 6. Imperial Seal Stamp (Pro gets Golden Imperial Dragon Jade Seal!)
  ctx.save();
  ctx.translate(W - 235, 395);
  ctx.rotate(-0.14);
  const isPro = Boolean(profile.proLicenseToken);
  ctx.strokeStyle = isPro ? '#F59E0B' : outcome.escaped ? '#DC2626' : '#991B1B';
  ctx.fillStyle = isPro ? 'rgba(245, 158, 11, 0.16)' : 'rgba(220, 38, 38, 0.14)';
  ctx.lineWidth = 6;
  ctx.fillRect(-110, -110, 220, 220);
  ctx.strokeRect(-110, -110, 220, 220);
  ctx.strokeRect(-96, -96, 192, 192);
  ctx.fillStyle = isPro ? '#FBBF24' : '#EF4444';
  ctx.textAlign = 'center';
  ctx.font = 'bold 42px "Songti SC", serif';
  if (outcome.escaped) {
    ctx.fillText(isPro ? '受命于天' : '金蝉脱壳', 0, -18);
    ctx.fillText(isPro ? '至尊总管' : '全身而退', 0, 42);
  } else {
    ctx.fillText('九门封锁', 0, -18);
    ctx.fillText('家产抄没', 0, 42);
  }
  ctx.restore();

  // 7. Bottom Official Benchmark Footer (Anti-clone watermark)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 36px "Songti SC", serif';
  ctx.fillText(
    lang === 'zh' ? '《见好就收：大内第一贪》· 朝堂摸金搜打撤鼻祖' : 'ROYAL HEIST: CASH OUT · COURTROOM EXTRACTION',
    W / 2,
    1245
  );

  ctx.fillStyle = '#A8A29E';
  ctx.font = '28px "PingFang SC", sans-serif';
  if (IS_PURE_PLATFORM_MODE) {
    ctx.fillText(
      lang === 'zh'
        ? `南洋永久总金库累计：${formatSilver(profile.vaultSilverWan, lang)} ｜ 敢来赌你能不能活着撤离？`
        : `Permanent Vault: ${formatSilver(profile.vaultSilverWan, lang)} ｜ Dare to beat this score?`,
      W / 2,
      1315
    );
  } else {
    ctx.fillText(
      lang === 'zh'
        ? '免费秒玩官方入口：a3152557994-ship-it.github.io/royal-heist'
        : 'Play Free Now: a3152557994-ship-it.github.io/royal-heist',
      W / 2,
      1315
    );
    ctx.fillStyle = '#78716C';
    ctx.font = '24px "PingFang SC", sans-serif';
    ctx.fillText(
      lang === 'zh'
        ? `永久金库累计：${formatSilver(profile.vaultSilverWan, lang)} · 截屏发群治治嘴硬懂哥`
        : `Permanent Vault: ${formatSilver(profile.vaultSilverWan, lang)} · Share & challenge your friends`,
      W / 2,
      1375
    );
  }

  return canvas.toDataURL('image/png');
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const chars = Array.from(text);
  let line = '';
  let curY = y;
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, curY);
      line = chars[i];
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}
