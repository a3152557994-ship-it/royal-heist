import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  Crown,
  Download,
  Eye,
  Feather,
  Flame,
  HardDriveDownload,
  Infinity as InfinityIcon,
  KeyRound,
  Package,
  RotateCcw,
  Sailboat,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { MapId, RaiderProfile, RaidSummary } from './types/raid';
import { RAID_MAPS } from './engine/raidMaps';
import { RARITY_META, TREASURES } from './engine/lootCatalog';
import { getTreasureSrc, preloadGameAtlas } from './engine/spriteAtlas';
import { formatSilver } from './engine/gameData';
import {
  exportRaiderSaveCode,
  importRaiderSaveCode,
  IS_PURE_PLATFORM_MODE,
  loadRaiderProfile,
  saveRaiderProfile,
  UPGRADE_TIERS,
  verifyOpcLicenseToken,
} from './utils/raiderSave';
import { RaidScene3D } from './engine3d/RaidScene3D';
import { Raid3DView } from './components/Raid3DView';
import { renderRaidLootPoster } from './utils/raidPoster';
import { sound } from './audio/soundEngine';

const MAP_BADGES: Record<MapId, { tag: string; short: string; ring: string }> = {
  salt_office: {
    tag: '新手爽摸 · 8箱珍宝',
    short: '两淮盐运司',
    ring: 'border-sky-400/70 bg-sky-950/55',
  },
  heshen_manor: {
    tag: '🔥 王牌爆红 · 锡晋斋夹墙',
    short: '和大人王府',
    ring: 'border-amber-400/90 bg-amber-950/60 ring-1 ring-amber-400/40',
  },
  forbidden_vault: {
    tag: '🐉 炼狱皇库 · 满地传国玺',
    short: '紫禁皇库',
    ring: 'border-rose-500/80 bg-rose-950/55',
  },
};

const ALL_TREASURE_IDS = [
  'imperial_seal',
  'gold_buddha',
  'phoenix_crown',
  'emerald_cabbage',
  'dragon_cup',
  'gold_abacus',
  'jade_ruyi',
  'secret_ledger',
  'night_pearl',
  'porcelain_vase',
  'guard_token',
  'silver_ingot',
];

const AntiqueBadge: React.FC<{ defId: string; size?: number }> = ({ defId, size = 42 }) => {
  const def = TREASURES[defId];
  return (
    <img
      src={getTreasureSrc(defId)}
      alt={def?.name || defId}
      style={{ width: size, height: size }}
      className="shrink-0 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)]"
    />
  );
};

export const App: React.FC = () => {
  const [profile, setProfile] = useState<RaiderProfile>(() => loadRaiderProfile());
  const [view, setView] = useState<'lobby' | 'raid' | 'outcome'>('lobby');
  const [activeMapId, setActiveMapId] = useState<MapId>('heshen_manor');
  const [raidKey, setRaidKey] = useState(1);
  const [lastSummary, setLastSummary] = useState<RaidSummary | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterRewardClaimed, setPosterRewardClaimed] = useState(false);

  const [muted, setMuted] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);

  const [saveInput, setSaveInput] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [licenseInput, setLicenseInput] = useState('');
  const [licenseFeedback, setLicenseFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const lobby3dMountRef = useRef<HTMLDivElement | null>(null);
  const isPro = !IS_PURE_PLATFORM_MODE && Boolean(profile.proLicenseToken);

  // Preload 12 museum-grade painted antique icons for Tetris Backpack & Share Poster
  useEffect(() => {
    preloadGameAtlas();
  }, []);

  // Persist profile automatically
  useEffect(() => {
    saveRaiderProfile(profile);
  }, [profile]);

  // Strictly re-verify stored Ed25519 token on mount to prevent localStorage spoofing
  useEffect(() => {
    if (IS_PURE_PLATFORM_MODE || !profile.proLicenseToken) return;
    let cancelled = false;
    verifyOpcLicenseToken(profile.proLicenseToken).then((res) => {
      if (cancelled) return;
      if (!res.valid) {
        setProfile((prev) => ({
          ...prev,
          proLicenseToken: null,
          proActivatedAt: null,
          godMode: {
            xrayMythicVision: false,
            featherWeight: false,
            infiniteTools: false,
          },
        }));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live 3D Moonlit Royal Palace Backdrop right inside the Lobby (100% outside/inside parity!)
  useEffect(() => {
    if (view !== 'lobby') return;
    const container = lobby3dMountRef.current;
    if (!container) return;

    const preview = new RaidScene3D({
      container,
      mode: 'lobby_preview',
      mapId: activeMapId,
      profile,
      isPro,
    });
    return () => {
      preview.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeMapId]);

  const startRaid = (mapId: MapId) => {
    sound.playTap();
    setActiveMapId(mapId);
    setShopOpen(false);
    setCodexOpen(false);
    setRaidKey((k) => k + 1);
    setPosterUrl(null);
    setPosterRewardClaimed(false);
    setView('raid');
  };

  const handleFinishRaid = (summary: RaidSummary) => {
    setLastSummary(summary);
    setProfile((prev) => {
      const nextVault = summary.escaped
        ? Math.round((prev.vaultSilverWan + summary.totalValueWan) * 10) / 10
        : prev.vaultSilverWan;
      return {
        ...prev,
        vaultSilverWan: nextVault,
        totalRaids: prev.totalRaids + 1,
        totalEscapes: prev.totalEscapes + (summary.escaped ? 1 : 0),
        bestRaidWan: summary.escaped
          ? Math.max(prev.bestRaidWan, summary.totalValueWan)
          : prev.bestRaidWan,
        mythicsFound: prev.mythicsFound + (summary.escaped ? summary.mythicCount : 0),
      };
    });
    setView('outcome');

    if (summary.escaped) {
      confetti({
        particleCount: summary.mythicCount > 0 ? 110 : 65,
        spread: 76,
        origin: { y: 0.6 },
        colors: ['#FBBF24', '#F43F5E', '#34D399', '#FEF08A'],
      });
    }
  };

  const handleConsumeRevivePill = (): boolean => {
    if (isPro) return true;
    if (profile.freeRevivePills <= 0) return false;
    setProfile((prev) => ({
      ...prev,
      freeRevivePills: Math.max(0, prev.freeRevivePills - 1),
    }));
    return true;
  };

  const handleBuyUpgrade = (track: keyof typeof UPGRADE_TIERS) => {
    const curLv = profile.upgrades[track];
    const tiers = UPGRADE_TIERS[track];
    if (curLv >= tiers.length - 1) return;
    const nextTier = tiers[curLv + 1];
    if (profile.vaultSilverWan < nextTier.costWan) {
      sound.playGuardAlert();
      return;
    }
    sound.playLootReveal('legendary');
    setProfile((prev) => ({
      ...prev,
      vaultSilverWan: Math.round((prev.vaultSilverWan - nextTier.costWan) * 10) / 10,
      upgrades: {
        ...prev.upgrades,
        [track]: curLv + 1,
      },
    }));
  };

  const handleGeneratePoster = async () => {
    if (!lastSummary) return;
    sound.playCashOutGong();
    const dataUrl = await renderRaidLootPoster(lastSummary, profile);
    setPosterUrl(dataUrl);
    if (!posterRewardClaimed) {
      setPosterRewardClaimed(true);
      setProfile((prev) => ({
        ...prev,
        freeRevivePills: prev.freeRevivePills + 1,
      }));
    }
  };

  const handleActivateLicense = async () => {
    if (IS_PURE_PLATFORM_MODE) return;
    sound.playTap();
    const res = await verifyOpcLicenseToken(licenseInput);
    if (!res.valid) {
      sound.playGuardAlert();
      setLicenseFeedback({ ok: false, msg: res.reason || '激活码无效' });
      return;
    }
    sound.playCashOutGong();
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.55 } });
    setProfile((prev) => ({
      ...prev,
      proLicenseToken: licenseInput.trim(),
      proActivatedAt: Date.now(),
      godMode: {
        xrayMythicVision: true,
        featherWeight: true,
        infiniteTools: true,
      },
    }));
    setLicenseFeedback({ ok: true, msg: '✅ 大内总管金手指已永久激活！三大特权已全部开启！' });
    setLicenseInput('');
  };

  const toggleGodSwitch = (key: keyof RaiderProfile['godMode']) => {
    if (!isPro) return;
    sound.playTap();
    setProfile((prev) => ({
      ...prev,
      godMode: {
        ...prev.godMode,
        [key]: !prev.godMode[key],
      },
    }));
  };

  const handleCopySaveCode = async () => {
    sound.playTap();
    const code = exportRaiderSaveCode(profile);
    try {
      await navigator.clipboard.writeText(code);
      setSaveFeedback({ ok: true, msg: '✅ 跨端存档码已复制！换手机/电脑粘贴即可无损恢复金库与装备。' });
    } catch {
      setSaveInput(code);
      setSaveFeedback({ ok: true, msg: '已生成存档码，请长按输入框全选复制。' });
    }
  };

  const handleImportSaveCode = async () => {
    sound.playTap();
    const res = await importRaiderSaveCode(saveInput);
    if (!res.ok || !res.profile) {
      sound.playGuardAlert();
      setSaveFeedback({ ok: false, msg: res.error || '存档恢复失败' });
      return;
    }
    sound.playCashOutGong();
    setProfile(res.profile);
    setSaveFeedback({ ok: true, msg: '✅ 存档恢复成功！金库银两与神装等级已同步。' });
    setSaveInput('');
  };

  const selectedMap = RAID_MAPS[activeMapId];
  const anyUpgradeAffordable = (Object.keys(UPGRADE_TIERS) as Array<keyof typeof UPGRADE_TIERS>).some(
    (k) => {
      const lv = profile.upgrades[k];
      const tiers = UPGRADE_TIERS[k];
      return lv < tiers.length - 1 && profile.vaultSilverWan >= tiers[lv + 1].costWan;
    }
  );

  return (
    <div
      className={`${
        view === 'outcome' ? 'min-h-dvh' : 'h-dvh overflow-hidden'
      } flex flex-col bg-[#080b14] text-amber-50`}
    >
      {/* TOP BAR (Exact 52px height for seamless 3D viewport calculation) */}
      <header className="h-[52px] shrink-0 px-2.5 sm:px-3 border-b border-amber-500/25 bg-[#0c0e16]/90 backdrop-blur-md flex items-center justify-between gap-1.5 z-30">
        <button
          onClick={() => {
            sound.playTap();
            setView('lobby');
          }}
          className="flex items-center gap-2 text-left cursor-pointer min-w-0"
        >
          <span className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-amber-400 to-rose-600 flex items-center justify-center text-black font-black text-sm shadow">
            夜
          </span>
          <div className="leading-tight whitespace-nowrap">
            <div className="text-xs sm:text-sm font-extrabold text-amber-200 tracking-wide flex items-center gap-1.5">
              <span className="sm:hidden">夜探王府</span>
              <span className="hidden sm:inline">夜探王府：摸金撤离</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 hidden md:inline">
                3D实时光影 · 潜行搜打撤
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Permanent Vault Silver */}
          <div className="px-2 py-1 rounded-lg bg-black/70 border border-amber-500/35 text-[11px] sm:text-xs flex items-center gap-1 whitespace-nowrap">
            <span className="text-stone-400 hidden md:inline">金库:</span>
            <b className="text-amber-300 font-mono">{formatSilver(profile.vaultSilverWan)}</b>
            <span className="text-[10px] text-emerald-300 border-l border-stone-700 pl-1">
              💊{isPro ? '∞' : profile.freeRevivePills}
            </span>
          </div>

          {/* Save Backup Button */}
          <button
            onClick={() => {
              sound.playTap();
              setSaveFeedback(null);
              setSaveModalOpen(true);
            }}
            className="px-2 py-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="跨设备存档备份"
          >
            <HardDriveDownload className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">存档</span>
          </button>

          {/* Pro God-Mode Button (Strictly omitted in Pure Mode builds) */}
          {!IS_PURE_PLATFORM_MODE && (
            <button
              onClick={() => {
                sound.playTap();
                setLicenseFeedback(null);
                setProModalOpen(true);
              }}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow whitespace-nowrap ${
                isPro
                  ? 'bg-gradient-to-r from-amber-300 to-amber-500 text-black'
                  : 'bg-gradient-to-r from-rose-600 to-amber-500 text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">{isPro ? '已开' : '金手指'}</span>
              <span className="hidden sm:inline">{isPro ? '金手指已开' : '总管金手指'}</span>
            </button>
          )}

          {/* Audio Mute */}
          <button
            onClick={() => setMuted(sound.toggleMute())}
            className="p-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-300 cursor-pointer shrink-0"
            aria-label="切换音效"
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
          </button>
        </div>
      </header>

      {/* ==================== VIEW 1: LIVE 3D PALACE TITLE & MAP LOBBY ==================== */}
      {view === 'lobby' && (
        <main className="relative flex-1 w-full overflow-hidden">
          {/* LIVE 60FPS THREE.JS 3D ROYAL PALACE STAGE */}
          <div ref={lobby3dMountRef} className="absolute inset-0 w-full h-full" />

          {/* Subtle cinematic edge gradients so UI stays razor-sharp while middle 3D palace gleams */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#070a12]/70 via-transparent via-45% to-[#070a12]/90" />

          {/* Floating Overlay Layout: scrollable safety on short mobile screens + 3-col compact map bar! */}
          <div className="absolute inset-0 z-10 overflow-y-auto">
            <div className="min-h-full max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-5 flex flex-col justify-between gap-3 pointer-events-none">
              {/* TOP HERO TITLE + QUICK DRAWERS */}
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="space-y-1 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] sm:text-[11px] font-extrabold text-amber-200 backdrop-blur-md">
                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
                    <span>实时 3D 光影引擎 · 实机画面即所见</span>
                  </div>
                  <h1 className="font-serif-cn text-2xl sm:text-5xl font-black text-white tracking-wider whitespace-nowrap drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                    夜探王府<span className="text-amber-400">·</span>摸金撤离
                  </h1>
                  <p className="hidden sm:block text-sm text-amber-100/90 max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                    潜入月夜清代王府，避开提灯锦衣卫、撬破锡晋斋夹墙、开龙柜爆传世大红，登乌篷快船落袋为安！
                  </p>
                </div>

                {/* Right Quick Drawers (Black Market & Antique Codex) */}
                <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => {
                      sound.playTap();
                      setShopOpen(true);
                    }}
                    className="relative px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-black/70 hover:bg-black/90 border border-amber-400/55 text-amber-200 text-[11px] sm:text-xs font-extrabold flex items-center gap-1 sm:gap-1.5 backdrop-blur-md shadow-xl cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                    <span>鬼市升级</span>
                    {anyUpgradeAffordable && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute -top-1 -right-1" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      sound.playTap();
                      setCodexOpen(true);
                    }}
                    className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-black/70 hover:bg-black/90 border border-rose-400/45 text-rose-200 text-[11px] sm:text-xs font-extrabold flex items-center gap-1 sm:gap-1.5 backdrop-blur-md shadow-xl cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                    <span>大红图鉴</span>
                  </button>
                </div>
              </div>

              {/* BOTTOM FLOATING MAP SELECTOR + INSTANT PLAY DOCK */}
              <div className="pointer-events-auto space-y-2 sm:space-y-3">
                {/* 3 Interactive Live-Preview Map Cards (3-col compact on mobile so CTA NEVER clips!) */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                  {(Object.keys(RAID_MAPS) as MapId[]).map((mId) => {
                    const m = RAID_MAPS[mId];
                    const meta = MAP_BADGES[mId];
                    const selected = activeMapId === mId;
                    return (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setActiveMapId(mId);
                        }}
                        className={`text-left rounded-xl sm:rounded-2xl p-2 sm:p-3 border backdrop-blur-md transition cursor-pointer ${
                          selected
                            ? `${meta.ring} shadow-[0_0_24px_rgba(251,191,36,0.28)] scale-[1.01]`
                            : 'bg-black/60 hover:bg-black/75 border-stone-700/75 text-stone-300'
                        }`}
                      >
                        <div className="hidden sm:flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-amber-300">{meta.tag}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-rose-200 border border-rose-500/35">
                            {m.escapeRateLabel}
                          </span>
                        </div>
                        <div className="sm:mt-1 flex items-baseline justify-between gap-1">
                          <span className="text-xs sm:text-base font-black text-white truncate">
                            <span className="sm:hidden">{meta.short}</span>
                            <span className="hidden sm:inline">{m.name}</span>
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-mono text-amber-300 shrink-0">{m.durationSec}s</span>
                        </div>
                        <div className="mt-0.5 sm:mt-1 text-[9px] sm:text-[11px] text-stone-300/90 truncate">
                          <span className="sm:hidden">{m.escapeRateLabel.replace('全服撤离率 ', '撤离')}</span>
                          <span className="hidden sm:inline">📦 {m.chests.length}处宝箱 · 🏮 {m.guards.length}名提灯侍卫 · 🔨 密室暗墙</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Primary Launch Bar */}
                <div className="rounded-2xl bg-black/75 border border-amber-500/40 backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shadow-2xl">
                  <div className="space-y-0.5">
                    <div className="text-xs font-extrabold text-amber-200">
                      目标：<span className="text-white">{selectedMap.name}</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-stone-400">
                      撤离 <b className="text-amber-300">{profile.totalEscapes}/{profile.totalRaids}</b> 局 ·
                      最高 <b className="text-amber-300">{formatSilver(profile.bestRaidWan)}</b> ·
                      大红 <b className="text-rose-300">{profile.mythicsFound}</b> 件
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => startRaid(activeMapId)}
                    className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-110 text-black font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(245,158,11,0.5)] cursor-pointer active:scale-[0.98]"
                  >
                    <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>夜行潜入 · 立即开摸</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ==================== VIEW 2: 60FPS 3D STEALTH-EXTRACTION GAMEPLAY ==================== */}
      {view === 'raid' && (
        <Raid3DView
          key={raidKey}
          mapId={activeMapId}
          profile={profile}
          isPro={isPro}
          externalPaused={saveModalOpen || proModalOpen}
          onFinishRaid={handleFinishRaid}
          onConsumeRevivePill={handleConsumeRevivePill}
          onOpenProModal={() => setProModalOpen(true)}
          onAbortToLobby={() => setView('lobby')}
        />
      )}

      {/* ==================== VIEW 3: RAID OUTCOME & SHARE POSTER ==================== */}
      {view === 'outcome' && lastSummary && (
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-4">
          <div
            className={`rounded-2xl p-5 space-y-4 text-center ${
              lastSummary.escaped ? 'wood-panel gold-border-glow' : 'bg-[#170909] crimson-danger-glow'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-amber-400/30 text-xs font-bold text-amber-200">
              <span>{lastSummary.mapName}</span>
              <span>·</span>
              <span>用时 {lastSummary.timeUsedSec}s</span>
              <span>·</span>
              <span>敲晕侍卫 {lastSummary.guardsKnockedOut} 名</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {lastSummary.escaped
                ? lastSummary.mythicCount > 0
                  ? `🔥 摸出 ${lastSummary.mythicCount} 件传世大红安全登船！`
                  : '⛵ 满载奇珍 · 乌篷快船安全撤离！'
                : '💀 贪心恋战 · 满包奇珍散落王府'}
            </h2>

            <div
              className={`text-4xl sm:text-5xl font-black font-mono ${
                lastSummary.escaped ? 'text-amber-400' : 'text-red-400 line-through'
              }`}
            >
              {formatSilver(lastSummary.totalValueWan)}
            </div>

            {!lastSummary.escaped && lastSummary.failReason && (
              <p className="text-xs text-red-200/90">{lastSummary.failReason}</p>
            )}

            {/* Extracted Loot Visual Grid */}
            {lastSummary.itemsExtracted.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-left">
                {lastSummary.itemsExtracted.map((it) => {
                  const def = TREASURES[it.defId];
                  if (!def) return null;
                  const meta = RARITY_META[def.rarity];
                  return (
                    <div
                      key={it.uid}
                      className="rounded-xl p-2 border flex items-center gap-2"
                      style={{ background: meta.bg, borderColor: meta.border }}
                    >
                      <AntiqueBadge defId={def.id} size={36} />
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-white truncate">{def.name}</div>
                        <div className="text-[10px] font-mono text-amber-200">
                          {meta.label} · {formatSilver(def.valueWan)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Share Poster Preview */}
            {posterUrl && (
              <div className="pt-2 space-y-2">
                <img
                  src={posterUrl}
                  alt="晒包战报海报"
                  className="w-64 mx-auto rounded-xl border-2 border-amber-400 shadow-2xl"
                />
                <a
                  href={posterUrl}
                  download={`royal-heist-raid-${Date.now()}.png`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>保存高清晒红背包图到相册</span>
                </a>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={handleGeneratePoster}
                className="py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-400/50 text-amber-200 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  {posterRewardClaimed
                    ? '重新生成晒红背包战报'
                    : '晒背包战报（免费领 +1 金蝉替身丹💊）'}
                </span>
              </button>

              <button
                onClick={() => startRaid(lastSummary.mapId)}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black text-sm flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>再来一局 · 继续摸大红</span>
              </button>
            </div>

            <button
              onClick={() => setView('lobby')}
              className="w-full py-2.5 rounded-xl bg-stone-950 hover:bg-stone-900 border border-stone-800 text-stone-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sailboat className="w-4 h-4 text-emerald-400" />
              <span>返回 3D 王府大厅 · 用银两升级大包袱与快靴</span>
            </button>
          </div>
        </main>
      )}

      {/* ==================== MODAL: BLACK-MARKET GEAR UPGRADE SHOP ==================== */}
      {shopOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl wood-panel gold-border-glow p-5 space-y-4 max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-amber-300 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>鬼市夜行黑店 · 永久强化夜行神装</span>
                </h3>
                <div className="text-xs text-stone-400 mt-0.5">
                  当前可用金库银两：<b className="text-amber-300 font-mono">{formatSilver(profile.vaultSilverWan)}</b>
                </div>
              </div>
              <button
                onClick={() => setShopOpen(false)}
                className="p-1.5 rounded-lg bg-stone-900 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { key: 'bagLevel', title: '🎒 乾坤扩容包袱', icon: Package },
                  { key: 'bootsLevel', title: '🥾 踏雪神行快靴', icon: Feather },
                  { key: 'armorLevel', title: '🛡️ 天蚕护心内甲', icon: Shield },
                  { key: 'gloveLevel', title: '🧤 发丘秒开巧钳', icon: Zap },
                ] as const
              ).map(({ key, title }) => {
                const lv = profile.upgrades[key];
                const tiers = UPGRADE_TIERS[key];
                const maxed = lv >= tiers.length - 1;
                const next = maxed ? null : tiers[lv + 1];
                const canAfford = next ? profile.vaultSilverWan >= next.costWan : false;

                return (
                  <div
                    key={key}
                    className="rounded-xl bg-stone-950/90 border border-stone-800 p-3.5 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-amber-200">{title}</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                          Lv.{lv}/{tiers.length - 1}
                        </span>
                      </div>
                      <div className="text-xs text-stone-300 mt-1.5">{tiers[lv].label}</div>
                      {next && (
                        <div className="text-[11px] text-emerald-300/90 mt-1">
                          下一级：{next.label}
                        </div>
                      )}
                    </div>

                    {maxed ? (
                      <div className="py-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-center text-xs font-bold text-emerald-300">
                        ✨ 已升至满级宗师神装
                      </div>
                    ) : (
                      <button
                        onClick={() => handleBuyUpgrade(key)}
                        disabled={!canAfford}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-black shadow'
                            : 'bg-stone-900 text-stone-500 border border-stone-800 cursor-not-allowed'
                        }`}
                      >
                        消耗 {formatSilver(next!.costWan)} 立即升级
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: MUSEUM ANTIQUE TREASURE CODEX ==================== */}
      {codexOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl wood-panel gold-border-glow p-5 space-y-4 max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-rose-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>王府秘库 · 十二大传世古玩图鉴</span>
              </h3>
              <button
                onClick={() => setCodexOpen(false)}
                className="p-1.5 rounded-lg bg-stone-900 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ALL_TREASURE_IDS.map((id) => {
                const t = TREASURES[id];
                const meta = RARITY_META[t.rarity];
                return (
                  <div
                    key={id}
                    className="rounded-xl p-2.5 border flex items-center gap-2.5"
                    style={{ background: meta.bg, borderColor: meta.border }}
                  >
                    <AntiqueBadge defId={id} size={44} />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">{t.name}</div>
                      <div className="text-[10px] font-mono text-amber-200">
                        {formatSilver(t.valueWan)}
                      </div>
                      <div className="text-[10px] text-stone-200/80">
                        {meta.label} · {t.gridW}×{t.gridH}格 · {t.weightKg}kg
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CROSS-DEVICE SAVE TRANSFER (RHSAVE2.) ==================== */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl wood-panel gold-border-glow p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-amber-300 flex items-center gap-1.5">
                <HardDriveDownload className="w-4 h-4" />
                <span>跨设备无损存档码 (RHSAVE2.)</span>
              </h3>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="p-1 rounded-lg bg-stone-900 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-300">
              本游戏无需注册账号，双槽自动保存。如需更换手机或电脑，一键复制下方防篡改存档码即可完整迁移金库银两与黑市神装：
            </p>

            <button
              onClick={handleCopySaveCode}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer"
            >
              📋 一键复制当前存档码
            </button>

            <div className="space-y-2 pt-1">
              <textarea
                value={saveInput}
                onChange={(e) => setSaveInput(e.target.value)}
                placeholder="在此粘贴以 RHSAVE2. 开头的跨端存档码..."
                rows={3}
                className="w-full rounded-xl bg-stone-950 border border-stone-700 p-2.5 text-xs font-mono text-amber-100 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleImportSaveCode}
                disabled={!saveInput.trim()}
                className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-200 font-bold text-xs cursor-pointer"
              >
                📥 校验并恢复存档
              </button>
            </div>

            {saveFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold ${
                  saveFeedback.ok ? 'bg-emerald-950/80 text-emerald-300' : 'bg-red-950/80 text-red-300'
                }`}
              >
                {saveFeedback.msg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: PRO GOD-MODE & ED25519 LICENSE (WEB/ITCH ONLY) ==================== */}
      {!IS_PURE_PLATFORM_MODE && proModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl wood-panel gold-border-glow p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-amber-300 flex items-center gap-1.5">
                <Crown className="w-5 h-5 text-amber-400" />
                <span>大内总管 · 摸金宗师金手指买断版</span>
              </h3>
              <button
                onClick={() => setProModalOpen(false)}
                className="p-1 rounded-lg bg-stone-900 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {(
                [
                  {
                    key: 'xrayMythicVision',
                    icon: Eye,
                    title: '👁️ 透视大红天眼',
                    desc: '隔墙直接亮起传世大红与大金冲天光柱，直奔传国玉玺不走冤枉路！',
                  },
                  {
                    key: 'featherWeight',
                    icon: Feather,
                    title: '🪶 无视负重水上漂',
                    desc: '哪怕背满 3800万两纯金千手佛与玉玺也绝不减速，遛着锦衣卫满院飞奔！',
                  },
                  {
                    key: 'infiniteTools',
                    icon: InfinityIcon,
                    title: '♾️ 6×5宗师巨囊 + 无限烟雾/撒银/闷棍/金蝉复活',
                    desc: '包袱直升满格 30 格，战术迷魂烟、碎银、闷棍与局内金蝉替身丹全部无限次爽用！',
                  },
                ] as const
              ).map(({ key, icon: Icon, title, desc }) => {
                const active = isPro && profile.godMode[key];
                return (
                  <div
                    key={key}
                    onClick={() => toggleGodSwitch(key)}
                    className={`rounded-xl p-3 border flex items-start justify-between gap-3 transition ${
                      isPro ? 'cursor-pointer' : 'opacity-90'
                    } ${
                      active
                        ? 'bg-amber-500/15 border-amber-400/70'
                        : 'bg-stone-950/85 border-stone-800'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold text-amber-200 flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{title}</span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-relaxed">{desc}</p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${
                        active
                          ? 'bg-emerald-400 text-black'
                          : isPro
                          ? 'bg-stone-800 text-stone-300'
                          : 'bg-stone-900 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {active ? '已开启' : isPro ? '已关闭' : '待解锁'}
                    </span>
                  </div>
                );
              })}
            </div>

            {!isPro ? (
              <div className="space-y-2.5 pt-1 border-t border-stone-800">
                <div className="rounded-xl bg-amber-950/40 border border-amber-500/30 p-2.5 text-[11px] text-amber-100 leading-relaxed">
                  💡 <b>全地图零门槛免费畅玩！</b> 如想爽开上方三大【总管金手指】特权：在 <b>闲鱼 / 小红书</b> 搜索
                  <b className="text-amber-300">「夜探王府总管版」</b>（一杯奶茶钱 <b>¥12.9</b> 永久买断，24h自动秒发
                  <code className="px-1 bg-black/50 rounded">OPC1.</code> 离线防伪激活码）。
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder="粘贴 OPC1. 开头的官方防伪激活码"
                    className="flex-1 rounded-xl bg-stone-950 border border-stone-700 px-3 py-2 text-xs font-mono text-amber-100 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleActivateLicense}
                    disabled={!licenseInput.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 disabled:opacity-40 text-black font-black text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>验签激活</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 p-2.5 text-center text-xs font-bold text-emerald-300">
                👑 尊贵的大内总管：您的 Ed25519 防伪授权已永久生效（点击上方卡片可随时自由开关金手指）
              </div>
            )}

            {licenseFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold ${
                  licenseFeedback.ok ? 'bg-emerald-950/80 text-emerald-300' : 'bg-red-950/80 text-red-300'
                }`}
              >
                {licenseFeedback.msg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
