import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Backpack,
  Clock,
  Coins,
  Crown,
  Flame,
  Heart,
  Pill,
  Skull,
  Sparkles,
  Swords,
  Wind,
  Zap,
} from 'lucide-react';
import { BagItem, MapId, RaiderProfile, RaidSummary } from '../types/raid';
import { getBagDimensions, RARITY_META, TREASURES } from '../engine/lootCatalog';
import { getTreasureSrc } from '../engine/spriteAtlas';
import { formatSilver } from '../engine/gameData';
import { IS_PURE_PLATFORM_MODE } from '../utils/raiderSave';
import { sound } from '../audio/soundEngine';
import { HudSnapshot, RaidScene3D } from '../engine3d/RaidScene3D';
import { GridBagModal } from './GridBagModal';

interface Raid3DViewProps {
  mapId: MapId;
  profile: RaiderProfile;
  isPro: boolean;
  externalPaused?: boolean;
  onFinishRaid: (summary: RaidSummary) => void;
  onConsumeRevivePill: () => boolean;
  onOpenProModal: () => void;
  onAbortToLobby: () => void;
}

const INITIAL_HUD: HudSnapshot = {
  hp: 3,
  maxHp: 3,
  timeLeft: 95,
  stamina: 100,
  smokeCount: 2,
  coinCount: 3,
  backstabCd: 0,
  infiniteTools: false,
  bagValueWan: 0,
  bagWeightKg: 0,
  bagItemCount: 0,
  mythicCount: 0,
  extractProgress: 0,
  nearPrompt: null,
  alertCount: 0,
  chestsOpened: 0,
  chestsTotal: 8,
  guardsKnockedOut: 0,
};

export const Raid3DView: React.FC<Raid3DViewProps> = ({
  mapId,
  profile,
  isPro,
  externalPaused = false,
  onFinishRaid,
  onConsumeRevivePill,
  onOpenProModal,
  onAbortToLobby,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<RaidScene3D | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [bag, setBag] = useState<BagItem[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [pendingLootDefId, setPendingLootDefId] = useState<string | null>(null);

  const [lootFlashDefId, setLootFlashDefId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'gold' | 'red' | 'cyan' } | null>(null);
  const [damageFlash, setDamageFlash] = useState(false);
  const [reviveModalReason, setReviveModalReason] = useState<string | null>(null);

  // Virtual joystick visual knob state
  const [joyActive, setJoyActive] = useState(false);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joyOriginRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  const lootTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Monotonic per-raid bag dimensions: expands if Pro activates mid-raid, never shrinks occupied slots!
  const [bagDims, setBagDims] = useState(() =>
    getBagDimensions(profile.upgrades.bagLevel, isPro && profile.godMode.infiniteTools)
  );
  const { cols, rows } = bagDims;

  useEffect(() => {
    const target = getBagDimensions(profile.upgrades.bagLevel, isPro && profile.godMode.infiniteTools);
    setBagDims((prev) => ({
      cols: Math.max(prev.cols, target.cols),
      rows: Math.max(prev.rows, target.rows),
    }));
    sceneRef.current?.syncProfile(profile, isPro);
  }, [profile, isPro]);

  // Unified pause authority (Backpack, Revive Modal, OR Header Save/Pro Modals!)
  useEffect(() => {
    sceneRef.current?.setPaused(bagOpen || Boolean(reviveModalReason) || externalPaused);
  }, [bagOpen, reviveModalReason, externalPaused]);

  // Mount Three.js 3D Stealth Engine
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const engine = new RaidScene3D({
      container: el,
      mode: 'playing',
      mapId,
      profile,
      isPro,
      callbacks: {
        onHudUpdate: (snap) => setHud(snap),
        onLootAutoPacked: (defId, nextBag) => {
          setBag(nextBag);
          setLootFlashDefId(defId);
          if (lootTimerRef.current) window.clearTimeout(lootTimerRef.current);
          lootTimerRef.current = window.setTimeout(() => setLootFlashDefId(null), 2600);
        },
        onBagOverflow: (defId, curBag) => {
          setBag(curBag);
          setPendingLootDefId(defId);
          setBagOpen(true);
        },
        onDamageFlash: () => {
          setDamageFlash(true);
          window.setTimeout(() => setDamageFlash(false), 320);
        },
        onToast: (msg, tone = 'gold') => {
          setToast({ msg, tone });
          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
          toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
        },
        onNeedReviveOrFail: (reason) => {
          setReviveModalReason(reason);
        },
        onFinishRaid: (summary) => {
          onFinishRaid(summary);
        },
      },
    });
    sceneRef.current = engine;
    if (minimapRef.current) {
      engine.setMinimapCanvas(minimapRef.current);
    }

    return () => {
      if (lootTimerRef.current) window.clearTimeout(lootTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      engine.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]);

  // Toggle Bag Hotkey ('b' / 'Escape')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (reviveModalReason || externalPaused) return;
      const k = e.key.toLowerCase();
      if (k === 'b' || k === 'tab') {
        e.preventDefault();
        sound.playTap();
        setBagOpen((prev) => {
          const next = !prev;
          if (!next) setPendingLootDefId(null);
          return next;
        });
      } else if (k === 'escape' && bagOpen) {
        setBagOpen(false);
        setPendingLootDefId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bagOpen, reviveModalReason, externalPaused]);

  const openBagManual = () => {
    if (reviveModalReason || externalPaused) return;
    sound.playTap();
    setBagOpen(true);
  };

  const closeBagModal = () => {
    setBagOpen(false);
    setPendingLootDefId(null);
  };

  const handleBagChange = (nextBag: BagItem[]) => {
    setBag(nextBag);
    sceneRef.current?.updateBag(nextBag);
  };

  const handleClearPending = (placed: boolean) => {
    setPendingLootDefId(null);
    if (placed) {
      setBagOpen(false);
    }
  };

  const handleUseRevive = () => {
    if (onConsumeRevivePill()) {
      sound.playCashOutGong();
      setReviveModalReason(null);
      sceneRef.current?.revivePlayer();
    }
  };

  const handleGiveUp = () => {
    const reason = reviveModalReason || '潜入失利';
    setReviveModalReason(null);
    sceneRef.current?.triggerFailSummary(reason);
  };

  // Virtual Joystick Pointer Handlers
  const onJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bagOpen || reviveModalReason) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    joyOriginRef.current = { x: cx, y: cy, pointerId: e.pointerId };
    setJoyActive(true);
    updateJoystick(e.clientX, e.clientY);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const orig = joyOriginRef.current;
    if (!orig) return;
    const maxR = 44;
    const dx = clientX - orig.x;
    const dy = clientY - orig.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(maxR, dist);
    const nx = dist > 1 ? (dx / dist) * clamped : 0;
    const ny = dist > 1 ? (dy / dist) * clamped : 0;
    setJoyKnob({ x: nx, y: ny });
    sceneRef.current?.setJoystick(nx / maxR, ny / maxR);
  };

  const onJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyOriginRef.current || joyOriginRef.current.pointerId !== e.pointerId) return;
    updateJoystick(e.clientX, e.clientY);
  };

  const onJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyOriginRef.current || joyOriginRef.current.pointerId !== e.pointerId) return;
    joyOriginRef.current = null;
    setJoyActive(false);
    setJoyKnob({ x: 0, y: 0 });
    sceneRef.current?.setJoystick(0, 0);
  };

  const lootFlashDef = lootFlashDefId ? TREASURES[lootFlashDefId] : null;
  const canRevive = isPro || profile.freeRevivePills > 0;

  return (
    <div className="relative flex-1 h-[calc(100dvh-52px)] w-full overflow-hidden bg-[#090e18] select-none">
      {/* 1. REAL-TIME THREE.JS 3D WEBGL CANVAS */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* 2. DAMAGE CRIMSON VIGNETTE */}
      {damageFlash && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(220,38,38,0.68)_100%)] transition-opacity" />
      )}

      {/* 3. TOP-LEFT MINIMALIST TACTICAL STATUS HUD */}
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[calc(100%-164px)]">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              sound.playTap();
              onAbortToLobby();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-black/65 hover:bg-black/85 border border-stone-700/80 text-stone-200 text-xs font-bold flex items-center gap-1 backdrop-blur-md cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">撤回大厅</span>
          </button>

          {/* Health Hearts */}
          <div className="px-2.5 py-1.5 rounded-xl bg-black/65 border border-stone-700/80 backdrop-blur-md flex items-center gap-1">
            {Array.from({ length: hud.maxHp }).map((_, i) => (
              <Heart
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < hud.hp ? 'fill-rose-500 text-rose-400' : 'text-stone-700'
                }`}
              />
            ))}
          </div>

          {/* Countdown Timer */}
          <div
            className={`px-2.5 py-1.5 rounded-xl bg-black/65 border backdrop-blur-md flex items-center gap-1 text-xs font-mono font-black ${
              hud.timeLeft <= 18
                ? 'border-red-500/80 text-red-400 animate-pulse'
                : 'border-amber-500/40 text-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{Math.ceil(hud.timeLeft)}s</span>
          </div>

          {/* Live Bag Silver & Weight */}
          <button
            onClick={openBagManual}
            className="px-2.5 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 border border-amber-400/50 backdrop-blur-md flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <Backpack className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-black text-amber-300">
              {formatSilver(hud.bagValueWan)}
            </span>
            <span className="text-[10px] text-stone-400 hidden sm:inline">
              ({hud.bagWeightKg}kg)
            </span>
          </button>
        </div>

        {/* Stamina & Alert Strip */}
        <div className="flex items-center gap-2">
          <div className="w-28 h-1.5 rounded-full bg-black/70 border border-stone-700/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-100"
              style={{ width: `${Math.round(hud.stamina)}%` }}
            />
          </div>
          {hud.alertCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-black tracking-wide animate-pulse shadow">
              🚨 警报 · {hud.alertCount}名锦衣卫追击!
            </span>
          )}
        </div>
      </div>

      {/* 4. TOP-RIGHT TACTICAL RADAR MINIMAP */}
      <div className="pointer-events-none absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
        <div className="rounded-xl p-1 bg-black/75 border border-amber-500/45 shadow-2xl backdrop-blur-md">
          <canvas
            ref={minimapRef}
            width={136}
            height={104}
            className="block rounded-lg w-[124px] h-[95px] sm:w-[136px] sm:h-[104px]"
          />
          <div className="mt-1 px-1 flex items-center justify-between text-[10px] text-stone-300 font-mono">
            <span>箱 {hud.chestsOpened}/{hud.chestsTotal}</span>
            <span className="text-emerald-300">● 船坞</span>
          </div>
        </div>
      </div>

      {/* 5. REAL MUSEUM ANTIQUE LOOT DISCOVERY TOAST */}
      {lootFlashDef && (
        <div className="pointer-events-none absolute top-32 sm:top-20 left-1/2 -translate-x-1/2 z-30 w-max max-w-[90%] animate-bounce">
          <div
            className="rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 border-2 flex items-center gap-2.5 sm:gap-3 shadow-2xl backdrop-blur-md"
            style={{
              background: RARITY_META[lootFlashDef.rarity].bg,
              borderColor: RARITY_META[lootFlashDef.rarity].border,
              boxShadow: `0 0 28px ${RARITY_META[lootFlashDef.rarity].glow}`,
            }}
          >
            <img
              src={getTreasureSrc(lootFlashDef.id)}
              alt={lootFlashDef.name}
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]"
            />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>
                  {lootFlashDef.rarity === 'mythic'
                    ? '🔥 惊天爆红！传世大红入手！'
                    : `摸出【${RARITY_META[lootFlashDef.rarity].label}】已装袋`}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-white">
                {lootFlashDef.name}{' '}
                <span className="text-amber-300 font-mono">+{formatSilver(lootFlashDef.valueWan)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TACTICAL TOAST */}
      {toast && !lootFlashDef && (
        <div className="pointer-events-none absolute top-32 sm:top-20 left-1/2 -translate-x-1/2 z-20 max-w-[260px] sm:max-w-md text-center">
          <div
            className={`px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold border backdrop-blur-md shadow-xl ${
              toast.tone === 'red'
                ? 'bg-red-950/90 border-red-400/60 text-red-100'
                : toast.tone === 'cyan'
                ? 'bg-sky-950/90 border-sky-400/60 text-sky-100'
                : 'bg-amber-950/90 border-amber-400/60 text-amber-100'
            }`}
          >
            {toast.msg}
          </div>
        </div>
      )}

      {/* 7. CONTEXTUAL INTERACTION PROMPT (Pry Wall / Open Chest / Board Boat) */}
      {hud.nearPrompt && (
        <div className="pointer-events-none absolute bottom-28 sm:bottom-24 left-1/2 -translate-x-1/2 z-20 max-w-[92%]">
          <div className="px-3.5 py-1.5 rounded-full bg-black/80 border border-amber-400/70 text-amber-200 text-[11px] sm:text-xs font-extrabold shadow-2xl backdrop-blur-md text-center">
            {hud.nearPrompt}
          </div>
        </div>
      )}

      {/* 8. BOTTOM-LEFT VIRTUAL JOYSTICK (Zero overlap even on 360px phones: x=8..88px!) */}
      <div
        onPointerDown={onJoyDown}
        onPointerMove={onJoyMove}
        onPointerUp={onJoyUp}
        onPointerCancel={onJoyUp}
        className="touch-none absolute bottom-3 left-2 sm:bottom-4 sm:left-4 z-20 w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-black/35 border border-amber-400/35 backdrop-blur-sm flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border border-dashed border-amber-300/30" />
        <div
          className={`absolute w-9 h-9 sm:w-11 sm:h-11 rounded-full transition-colors flex items-center justify-center shadow-lg ${
            joyActive
              ? 'bg-amber-400/90 border-2 border-white'
              : 'bg-amber-500/55 border border-amber-200/70'
          }`}
          style={{
            transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
          }}
        >
          <span className="text-[9px] sm:text-[10px] font-black text-black">潜行</span>
        </div>
      </div>

      {/* 9. BOTTOM-RIGHT TACTILE SKILL & BACKPACK ACTION BAR (Compact 5×44px = 236px on 360px => 28px+ clear gap!) */}
      <div className="absolute bottom-3 right-2 sm:bottom-4 sm:right-5 z-20 flex items-end gap-1 sm:gap-2">
        {/* Hold to Sprint */}
        <button
          type="button"
          onPointerDown={() => sceneRef.current?.setTouchSprint(true)}
          onPointerUp={() => sceneRef.current?.setTouchSprint(false)}
          onPointerLeave={() => sceneRef.current?.setTouchSprint(false)}
          className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-black/70 hover:bg-stone-900 border border-sky-400/50 backdrop-blur-md flex flex-col items-center justify-center gap-0.5 text-sky-200 shadow-lg cursor-pointer active:scale-95"
          title="Shift 疾跑（脚步声会引来附近侍卫）"
        >
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />
          <span className="text-[9px] sm:text-[10px] font-extrabold">疾跑</span>
          <span className="hidden sm:inline text-[8px] font-mono text-stone-400">Shift</span>
        </button>

        {/* 1: Smoke Bomb */}
        <button
          type="button"
          onClick={() => sceneRef.current?.useSmokeBomb()}
          className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-black/70 hover:bg-stone-900 border border-slate-400/50 backdrop-blur-md flex flex-col items-center justify-center gap-0.5 text-slate-100 shadow-lg cursor-pointer active:scale-95"
        >
          <Wind className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
          <span className="text-[9px] sm:text-[10px] font-extrabold">迷魂烟</span>
          <span className="absolute -top-1.5 -right-1 px-1 sm:px-1.5 py-0.5 rounded-full bg-slate-700 text-[8px] sm:text-[9px] font-mono font-black text-white">
            {hud.infiniteTools ? '∞' : hud.smokeCount}
          </span>
          <span className="hidden sm:inline text-[8px] font-mono text-stone-400">[1]</span>
        </button>

        {/* 2: Distraction Coin */}
        <button
          type="button"
          onClick={() => sceneRef.current?.useSilverCoin()}
          className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-black/70 hover:bg-stone-900 border border-amber-400/50 backdrop-blur-md flex flex-col items-center justify-center gap-0.5 text-amber-100 shadow-lg cursor-pointer active:scale-95"
        >
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
          <span className="text-[9px] sm:text-[10px] font-extrabold">撒碎银</span>
          <span className="absolute -top-1.5 -right-1 px-1 sm:px-1.5 py-0.5 rounded-full bg-amber-600 text-[8px] sm:text-[9px] font-mono font-black text-black">
            {hud.infiniteTools ? '∞' : hud.coinCount}
          </span>
          <span className="hidden sm:inline text-[8px] font-mono text-stone-400">[2]</span>
        </button>

        {/* 3 / Space: Backstab Ambush */}
        <button
          type="button"
          onClick={() => sceneRef.current?.useBackstab()}
          disabled={!hud.infiniteTools && hud.backstabCd > 0}
          className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-b from-cyan-900/85 to-slate-950/90 hover:brightness-110 disabled:opacity-50 border border-cyan-400/70 backdrop-blur-md flex flex-col items-center justify-center gap-0.5 text-cyan-100 shadow-lg cursor-pointer active:scale-95"
        >
          <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
          <span className="text-[9px] sm:text-[10px] font-extrabold">
            {!hud.infiniteTools && hud.backstabCd > 0
              ? `${hud.backstabCd.toFixed(1)}s`
              : '闷棍'}
          </span>
          <span className="hidden sm:inline text-[8px] font-mono text-cyan-300/80">[Space]</span>
        </button>

        {/* B: Open Tetris Spatial Backpack */}
        <button
          type="button"
          onClick={openBagManual}
          className="relative w-11 h-11 sm:w-15 sm:h-15 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black flex flex-col items-center justify-center gap-0.5 shadow-xl cursor-pointer active:scale-95"
        >
          <Backpack className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[9px] sm:text-[10px] font-black">包袱</span>
          <span className="absolute -top-1.5 -right-1 px-1 sm:px-1.5 py-0.5 rounded-full bg-black text-[8px] sm:text-[9px] font-mono font-black text-amber-300 border border-amber-400">
            {hud.bagItemCount}
          </span>
        </button>
      </div>

      {/* Desktop Keyboard Subtle Legend */}
      <div className="pointer-events-none hidden md:flex absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/50 border border-stone-800/80 text-[10px] text-stone-300 gap-3 backdrop-blur-sm">
        <span><b>WASD</b> 潜行移动</span>
        <span><b>Shift</b> 疾跑</span>
        <span><b>1</b> 迷魂烟</span>
        <span><b>2</b> 撒碎银引怪</span>
        <span><b>Space</b> 闷棍击晕</span>
        <span><b>B</b> 整理包袱</span>
      </div>

      {/* 10. SPATIAL TETRIS BACKPACK MODAL */}
      <GridBagModal
        isOpen={bagOpen}
        cols={cols}
        rows={rows}
        bag={bag}
        pendingLootDefId={pendingLootDefId}
        onUpdateBag={handleBagChange}
        onClearPending={handleClearPending}
        onClose={closeBagModal}
      />

      {/* 11. MID-RAID CAPTURED / REVIVE MODAL */}
      {reviveModalReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl wood-panel crimson-danger-glow p-5 space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-950/90 border border-red-500/60 flex items-center justify-center">
              <Skull className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">危急时刻 · 已被锦衣卫合围！</h3>
              <p className="text-xs text-red-200/90 mt-1">{reviveModalReason}</p>
              <div className="mt-2 inline-block px-3 py-1 rounded-full bg-black/60 border border-amber-500/40 text-xs text-amber-300 font-mono">
                当前满包珍宝价值：{formatSilver(hud.bagValueWan)}
              </div>
            </div>

            <div className="space-y-2">
              {canRevive ? (
                <button
                  onClick={handleUseRevive}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-black text-sm flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Pill className="w-4 h-4" />
                  <span>
                    使用金蝉替身丹原地满血复活 ({isPro ? '总管无限' : `剩余 ${profile.freeRevivePills} 颗`})
                  </span>
                </button>
              ) : (
                !IS_PURE_PLATFORM_MODE && (
                  <button
                    onClick={() => {
                      sound.playTap();
                      onOpenProModal();
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-rose-500 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <Crown className="w-4 h-4" />
                    <span>解锁大内总管金手指（无限替身丹 + 透视大红）</span>
                  </button>
                )
              )}

              <button
                onClick={handleGiveUp}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>认栽撤退 · 进入本局复盘</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
