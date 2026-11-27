import React, { useEffect, useRef, useState } from 'react';
import { Backpack, Coins, CloudFog, Sword, Heart, ShieldAlert, Sailboat } from 'lucide-react';
import {
  BagItem,
  ChestEntity,
  DistractionCoin,
  FloatingPop,
  GuardEntity,
  MapId,
  Particle,
  RaiderProfile,
  RaidSummary,
  RectWall,
  SmokeCloud,
  Vec2,
} from '../types/raid';
import {
  castVisionRay,
  hasLineOfSight,
  RAID_MAPS,
  resolveCircleWalls,
} from '../engine/raidMaps';
import {
  computeBagTotals,
  drawTreasureIcon,
  findAutoFitSlot,
  getBagDimensions,
  RARITY_META,
  rollTreasureForChest,
  TREASURES,
} from '../engine/lootCatalog';
import { getSpriteImg, getTilePattern, preloadGameAtlas } from '../engine/spriteAtlas';
import { formatSilver } from '../engine/gameData';
import { sound } from '../audio/soundEngine';
import { GridBagModal } from './GridBagModal';
import { IS_PURE_PLATFORM_MODE } from '../utils/raiderSave';

interface RaidActionViewProps {
  mapId: MapId;
  profile: RaiderProfile;
  isPro: boolean;
  onFinishRaid: (summary: RaidSummary) => void;
  onConsumeRevivePill: () => boolean;
  onOpenProModal: () => void;
  onAbortToLobby: () => void;
}

export const RaidActionView: React.FC<RaidActionViewProps> = ({
  mapId,
  profile,
  isPro,
  onFinishRaid,
  onConsumeRevivePill,
  onOpenProModal,
  onAbortToLobby,
}) => {
  const mapCfg = RAID_MAPS[mapId];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const godInfinite = isPro && profile.godMode.infiniteTools;
  const godFeather = isPro && profile.godMode.featherWeight;
  const godXray = isPro && profile.godMode.xrayMythicVision;

  const { cols: bagCols, rows: bagRows } = getBagDimensions(
    profile.upgrades.bagLevel,
    isPro && profile.godMode.infiniteTools
  );
  const maxHp = 3 + profile.upgrades.armorLevel;

  // React UI state synced cleanly from 60fps loop
  const [bag, setBag] = useState<BagItem[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [pendingLootId, setPendingLootId] = useState<string | null>(null);
  const [hp, setHp] = useState(maxHp);
  const [timeLeft, setTimeLeft] = useState(mapCfg.durationSec);
  const [smokeLeft, setSmokeLeft] = useState(godInfinite ? 99 : 2);
  const [coinsLeft, setCoinsLeft] = useState(godInfinite ? 99 : 3);
  const [daggersLeft, setDaggersLeft] = useState(godInfinite ? 99 : 2);
  const [revivePrompt, setRevivePrompt] = useState<{ reason: string } | null>(null);
  const [extractPct, setExtractPct] = useState(0);
  const [bannerAlert, setBannerAlert] = useState<string | null>('🕹️ 拖动左下方摇杆(或按WASD)潜入王府撬箱摸大金！');

  // Mutable 60fps simulation state in ref so animation loop never stutters
  const simRef = useRef<{
    player: { x: number; y: number; vx: number; vy: number; angle: number; invuln: number; smokeStealth: number };
    hp: number;
    timeLeft: number;
    paused: boolean;
    finished: boolean;
    extractTimer: number;
    curfewTriggered: boolean;
    knockouts: number;
    walls: RectWall[];
    chests: ChestEntity[];
    guards: GuardEntity[];
    coins: DistractionCoin[];
    smokes: SmokeCloud[];
    pops: FloatingPop[];
    particles: Particle[];
    keys: Set<string>;
    joyVec: Vec2;
    bagRef: BagItem[];
  }>({
    player: { x: mapCfg.spawn.x, y: mapCfg.spawn.y, vx: 0, vy: 0, angle: -Math.PI / 2, invuln: 0, smokeStealth: 0 },
    hp: maxHp,
    timeLeft: mapCfg.durationSec,
    paused: false,
    finished: false,
    extractTimer: 0,
    curfewTriggered: false,
    knockouts: 0,
    walls: mapCfg.walls.map((w) => ({ ...w })),
    chests: mapCfg.chests.map((c) => ({
      ...c,
      progress: 0,
      opened: false,
      lootDefId: rollTreasureForChest(c.tier, profile.upgrades.gloveLevel),
    })),
    guards: mapCfg.guards.map((g, i) => ({
      id: `g_${i}`,
      x: g.waypoints[0].x,
      y: g.waypoints[0].y,
      radius: 17,
      angle: 0,
      speed: g.speed,
      visionRange: g.visionRange,
      visionHalfAngle: g.elite ? 0.56 : 0.48,
      elite: g.elite,
      state: 'patrol',
      stateTimer: 0,
      alertMeter: 0,
      waypoints: g.waypoints,
      wpIndex: 1 % g.waypoints.length,
      investigateTarget: null,
      attackCooldown: 0,
    })),
    coins: [],
    smokes: [],
    pops: [],
    particles: [],
    keys: new Set(),
    joyVec: { x: 0, y: 0 },
    bagRef: [],
  });

  // Keep bagRef synced
  useEffect(() => {
    simRef.current.bagRef = bag;
  }, [bag]);

  useEffect(() => {
    simRef.current.paused = bagOpen || revivePrompt !== null;
  }, [bagOpen, revivePrompt]);

  useEffect(() => {
    preloadGameAtlas();
    const t = window.setTimeout(() => setBannerAlert(null), 4200);
    return () => clearTimeout(t);
  }, []);

  // Touch Virtual Joystick State
  const joyTouchId = useRef<number | null>(null);
  const joyOrigin = useRef<Vec2>({ x: 0, y: 0 });
  const [joyVisual, setJoyVisual] = useState<{ active: boolean; ox: number; oy: number; kx: number; ky: number }>({
    active: false,
    ox: 90,
    oy: 0,
    kx: 0,
    ky: 0,
  });

  const addPop = (x: number, y: number, text: string, color = '#FBBF24') => {
    simRef.current.pops.push({
      id: `pop_${Math.random()}`,
      x,
      y,
      text,
      color,
      ttl: 1.35,
      vy: -36,
    });
  };

  const spawnBurst = (x: number, y: number, color: string, count = 18) => {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const spd = 45 + Math.random() * 140;
      simRef.current.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color,
        size: 3 + Math.random() * 4,
        life: 0.55 + Math.random() * 0.35,
        maxLife: 0.9,
      });
    }
  };

  // Tactical Skills
  const triggerSmokeBomb = () => {
    if (smokeLeft <= 0 && !godInfinite) return;
    sound.playSmokeBomb();
    if (!godInfinite) setSmokeLeft((n) => n - 1);
    const s = simRef.current;
    s.smokes.push({
      id: `smk_${Date.now()}`,
      x: s.player.x,
      y: s.player.y,
      radius: 115,
      ttl: 4.5,
    });
    s.player.smokeStealth = 4.5;
    addPop(s.player.x, s.player.y - 24, '💨 迷魂烟隐身加速！', '#C084FC');
  };

  const triggerTossCoin = () => {
    if (coinsLeft <= 0 && !godInfinite) return;
    sound.playCoinToss();
    if (!godInfinite) setCoinsLeft((n) => n - 1);
    const s = simRef.current;
    const tx = s.player.x + Math.cos(s.player.angle) * 145;
    const ty = s.player.y + Math.sin(s.player.angle) * 145;
    s.coins.push({ id: `cn_${Date.now()}`, x: tx, y: ty, ttl: 6.0 });
    spawnBurst(tx, ty, '#FDE047', 10);
    addPop(tx, ty - 14, '🪙 碎银叮当引开侍卫！', '#FDE047');

    // Nearby guards within 340px hear the silver coin and walk over!
    for (const g of s.guards) {
      if (g.state === 'stunned') continue;
      const d = Math.hypot(g.x - tx, g.y - ty);
      if (d <= 350) {
        g.state = 'investigate';
        g.investigateTarget = { x: tx, y: ty };
        g.stateTimer = 4.8;
      }
    }
  };

  const triggerBackstab = () => {
    if (daggersLeft <= 0 && !godInfinite) return;
    const s = simRef.current;
    let target: GuardEntity | null = null;
    let bestD = 76;
    for (const g of s.guards) {
      if (g.state === 'stunned') continue;
      const d = Math.hypot(g.x - s.player.x, g.y - s.player.y);
      if (d < bestD) {
        bestD = d;
        target = g;
      }
    }
    if (!target) {
      addPop(s.player.x, s.player.y - 24, '附近无侍卫可暗算', '#9CA3AF');
      return;
    }
    sound.playBackstab();
    if (!godInfinite) setDaggersLeft((n) => n - 1);
    target.state = 'stunned';
    target.stateTimer = 14.0;
    s.knockouts += 1;
    spawnBurst(target.x, target.y, '#F87171', 16);
    addPop(target.x, target.y - 24, '🗡️ 一击闷棍敲晕！摸走象牙腰牌+48万', '#38BDF8');

    const slot = findAutoFitSlot(s.bagRef, bagCols, bagRows, 'guard_token');
    if (slot) {
      const next = [
        ...s.bagRef,
        {
          uid: `tok_${Date.now()}`,
          defId: 'guard_token',
          gx: slot.gx,
          gy: slot.gy,
          rotated: slot.rotated,
        },
      ];
      s.bagRef = next;
      setBag(next);
    }
  };

  // Keyboard bindings + Action hotkeys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      simRef.current.keys.add(k);
      if (k === 'b' || k === 'tab') {
        e.preventDefault();
        if (!simRef.current.finished && !revivePrompt) setBagOpen((v) => !v);
        return;
      }
      if (simRef.current.paused || simRef.current.finished) return;
      if (k === '1') triggerSmokeBomb();
      if (k === '2') triggerTossCoin();
      if (k === '3' || k === ' ') {
        e.preventDefault();
        triggerBackstab();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      simRef.current.keys.delete(e.key.toLowerCase());
    };
    const onBlur = () => {
      simRef.current.keys.clear();
      simRef.current.joyVec = { x: 0, y: 0 };
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smokeLeft, coinsLeft, daggersLeft, godInfinite, bagCols, bagRows, revivePrompt]);

  // Main 60-FPS Game Loop!
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let uiSyncAccum = 0;

    const step = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const s = simRef.current;

      if (!s.paused && !s.finished) {
        // 1. Timer & Curfew Bell
        s.timeLeft = Math.max(0, s.timeLeft - dt);
        if (s.timeLeft <= 20 && !s.curfewTriggered) {
          s.curfewTriggered = true;
          sound.playGuardAlert();
          setBannerAlert('🔔 五更锁门惊钟已响！侍卫移速暴涨，快冲回南门乌篷船撤离！！');
        }
        if (s.timeLeft <= 0) {
          sound.playPlayerHit();
          setRevivePrompt({ reason: '五更天亮王府落锁，未能及时登船撤离！' });
          s.paused = true;
        }

        // 2. Player Movement & Weight Physics
        let mx = s.joyVec.x;
        let my = s.joyVec.y;
        if (s.keys.has('w') || s.keys.has('arrowup')) my -= 1;
        if (s.keys.has('s') || s.keys.has('arrowdown')) my += 1;
        if (s.keys.has('a') || s.keys.has('arrowleft')) mx -= 1;
        if (s.keys.has('d') || s.keys.has('arrowright')) mx += 1;
        const mLen = Math.hypot(mx, my);
        if (mLen > 1) {
          mx /= mLen;
          my /= mLen;
        }

        const { totalWeightKg } = computeBagTotals(s.bagRef);
        const bootBonus = 1 + profile.upgrades.bootsLevel * 0.14;
        const weightPenalty = godFeather
          ? 1
          : Math.max(0.56, 1 - Math.max(0, totalWeightKg - 6) * (0.014 - profile.upgrades.bootsLevel * 0.0025));
        const smokeSpeed = s.player.smokeStealth > 0 ? 1.32 : 1.0;
        const moveSpeed = 195 * bootBonus * weightPenalty * smokeSpeed;

        if (mLen > 0.05) {
          s.player.angle = Math.atan2(my, mx);
        }
        s.player.vx = mx * moveSpeed;
        s.player.vy = my * moveSpeed;
        // Kick up subtle courtyard dust puffs while sprinting
        if (mLen > 0.25 && Math.random() < 0.28) {
          s.particles.push({
            x: s.player.x + (Math.random() - 0.5) * 12,
            y: s.player.y + 22,
            vx: -mx * 24 + (Math.random() - 0.5) * 16,
            vy: -my * 18 - Math.random() * 12,
            color: 'rgba(214, 211, 209, 0.35)',
            size: 3 + Math.random() * 3,
            life: 0.32,
            maxLife: 0.32,
          });
        }
        const nextPos = resolveCircleWalls(
          {
            x: Math.max(56, Math.min(mapCfg.width - 56, s.player.x + mx * moveSpeed * dt)),
            y: Math.max(56, Math.min(mapCfg.height - 46, s.player.y + my * moveSpeed * dt)),
          },
          16,
          s.walls
        );
        s.player.x = Math.max(56, Math.min(mapCfg.width - 56, nextPos.x));
        s.player.y = Math.max(56, Math.min(mapCfg.height - 46, nextPos.y));
        if (s.player.invuln > 0) s.player.invuln = Math.max(0, s.player.invuln - dt);
        if (s.player.smokeStealth > 0) s.player.smokeStealth = Math.max(0, s.player.smokeStealth - dt);

        // 3. Auto-Pry Secret Breakable Walls when close!
        const prySpeedMult = 1 + profile.upgrades.gloveLevel * 0.32;
        for (const w of s.walls) {
          if (w.kind === 'secret_wall' && !w.broken) {
            const cx = w.x + w.w / 2;
            const cy = w.y + w.h / 2;
            if (Math.hypot(s.player.x - cx, s.player.y - cy) < 68) {
              w.hp = (w.hp ?? 100) - 95 * prySpeedMult * dt;
              sound.playSearchTick(1 - (w.hp ?? 0) / 100);
              if ((w.hp ?? 0) <= 0) {
                w.broken = true;
                sound.playBackstab();
                spawnBurst(cx, cy, '#F59E0B', 26);
                addPop(cx, cy - 16, '💥 撬开金丝楠木夹墙！发现秘库！', '#FDE047');
              }
            }
          }
        }

        // 4. Radial Chest Search & "出大红了!!" Loot Reveal
        for (const ch of s.chests) {
          if (ch.opened) continue;
          const dist = Math.hypot(s.player.x - ch.x, s.player.y - ch.y);
          if (dist <= 54) {
            ch.progress += dt * prySpeedMult;
            sound.playSearchTick(Math.min(1, ch.progress / ch.searchSeconds));
            if (ch.progress >= ch.searchSeconds) {
              ch.opened = true;
              const def = TREASURES[ch.lootDefId];
              const meta = RARITY_META[def.rarity];
              sound.playLootReveal(def.rarity);
              spawnBurst(ch.x, ch.y, meta.color, def.rarity === 'mythic' ? 38 : 20);
              addPop(
                ch.x,
                ch.y - 26,
                `${def.rarity === 'mythic' ? '🔥出传世大红！！' : '✨摸出'}【${def.name}】+${def.valueWan}万两`,
                meta.color
              );

              const slot = findAutoFitSlot(s.bagRef, bagCols, bagRows, def.id);
              if (slot) {
                const updated: BagItem[] = [
                  ...s.bagRef,
                  {
                    uid: `bag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    defId: def.id,
                    gx: slot.gx,
                    gy: slot.gy,
                    rotated: slot.rotated,
                  },
                ];
                s.bagRef = updated;
                setBag(updated);
              } else {
                // Bag is full! Pop open Spatial Tetris Backpack so player can toss cheap silver & slot the big gold!
                setPendingLootId(def.id);
                setBagOpen(true);
                s.paused = true;
              }
            }
          } else if (ch.progress > 0) {
            ch.progress = Math.max(0, ch.progress - dt * 0.6);
          }
        }

        // 5. Extraction Boat Zone Check (only counts once player has looted >= 1 item!)
        const distDock = Math.hypot(
          s.player.x - mapCfg.extractZone.x,
          s.player.y - mapCfg.extractZone.y
        );
        if (distDock <= mapCfg.extractZone.radius && s.bagRef.length > 0) {
          s.extractTimer += dt;
          sound.playSearchTick(Math.min(1, s.extractTimer / 1.8));
          if (s.extractTimer >= 1.8) {
            s.finished = true;
            sound.playCashOutGong();
            const totals = computeBagTotals(s.bagRef);
            onFinishRaid({
              escaped: true,
              mapId,
              mapName: mapCfg.name,
              timeUsedSec: Math.round(mapCfg.durationSec - s.timeLeft),
              totalValueWan: totals.totalValueWan,
              itemsExtracted: [...s.bagRef],
              mythicCount: totals.mythicCount,
              guardsKnockedOut: s.knockouts,
            });
            return;
          }
        } else {
          s.extractTimer = Math.max(0, s.extractTimer - dt * 2);
        }

        // 6. Guards Patrol, Raycast Vision Cone Detection & Saber Chase!
        const inSmoke = s.smokes.some((sm) => Math.hypot(s.player.x - sm.x, s.player.y - sm.y) <= sm.radius) || s.player.smokeStealth > 0;
        const curfewBoost = s.curfewTriggered ? 1.24 : 1.0;

        for (const g of s.guards) {
          if (g.attackCooldown > 0) g.attackCooldown = Math.max(0, g.attackCooldown - dt);

          if (g.state === 'stunned') {
            g.stateTimer -= dt;
            if (g.stateTimer <= 0) g.state = 'patrol';
            continue;
          }

          // Vision Cone Check
          const dxP = s.player.x - g.x;
          const dyP = s.player.y - g.y;
          const distP = Math.hypot(dxP, dyP);
          let seesPlayer = false;

          if (!inSmoke && distP <= g.visionRange) {
            const angToP = Math.atan2(dyP, dxP);
            let diff = Math.atan2(Math.sin(angToP - g.angle), Math.cos(angToP - g.angle));
            if (Math.abs(diff) <= g.visionHalfAngle || distP < 42) {
              if (hasLineOfSight({ x: g.x, y: g.y }, { x: s.player.x, y: s.player.y }, s.walls)) {
                seesPlayer = true;
              }
            }
          }

          if (seesPlayer) {
            if (g.state !== 'chase') {
              sound.playGuardAlert();
              addPop(g.x, g.y - 26, '❗ 有刺客摸金！拿下！', '#EF4444');
            }
            g.state = 'chase';
            g.stateTimer = 3.8;
            g.investigateTarget = { x: s.player.x, y: s.player.y };
          } else if (g.state === 'chase') {
            g.stateTimer -= dt;
            if (g.stateTimer <= 0) {
              g.state = 'patrol';
            }
          } else if (g.state === 'investigate') {
            g.stateTimer -= dt;
            if (g.stateTimer <= 0) {
              g.state = 'patrol';
              g.investigateTarget = null;
            }
          }

          // Move Guard toward target
          let targetPt = g.waypoints[g.wpIndex];
          let spd = g.speed * curfewBoost;
          if (g.state === 'chase' && g.investigateTarget) {
            targetPt = seesPlayer ? { x: s.player.x, y: s.player.y } : g.investigateTarget;
            spd *= 1.32;
          } else if (g.state === 'investigate' && g.investigateTarget) {
            targetPt = g.investigateTarget;
            spd *= 0.95;
          }

          const gxDiff = targetPt.x - g.x;
          const gyDiff = targetPt.y - g.y;
          const gDist = Math.hypot(gxDiff, gyDiff);
          if (gDist > 8) {
            const desiredAng = Math.atan2(gyDiff, gxDiff);
            // Smooth turn
            const turnDiff = Math.atan2(Math.sin(desiredAng - g.angle), Math.cos(desiredAng - g.angle));
            g.angle += turnDiff * Math.min(1, dt * 8);
            const moved = resolveCircleWalls(
              {
                x: Math.max(56, Math.min(mapCfg.width - 56, g.x + (gxDiff / gDist) * spd * dt)),
                y: Math.max(56, Math.min(mapCfg.height - 46, g.y + (gyDiff / gDist) * spd * dt)),
              },
              g.radius,
              s.walls
            );
            g.x = moved.x;
            g.y = moved.y;
          } else if (g.state === 'patrol') {
            g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
          }

          // Melee Saber Attack if touching player!
          if (!inSmoke && distP <= 31 && g.attackCooldown <= 0 && s.player.invuln <= 0) {
            g.attackCooldown = 1.25;
            s.player.invuln = 1.15;
            s.hp = Math.max(0, s.hp - 1);
            setHp(s.hp);
            sound.playPlayerHit();
            spawnBurst(s.player.x, s.player.y, '#EF4444', 22);
            addPop(s.player.x, s.player.y - 28, '🩸 被锦衣卫绣春刀劈中！-1❤️', '#EF4444');

            // Knockback away from guard
            const kbAng = Math.atan2(dyP, dxP);
            const kbPos = resolveCircleWalls(
              {
                x: Math.max(56, Math.min(mapCfg.width - 56, s.player.x + Math.cos(kbAng) * 38)),
                y: Math.max(56, Math.min(mapCfg.height - 46, s.player.y + Math.sin(kbAng) * 38)),
              },
              16,
              s.walls
            );
            s.player.x = Math.max(56, Math.min(mapCfg.width - 56, kbPos.x));
            s.player.y = Math.max(56, Math.min(mapCfg.height - 46, kbPos.y));

            if (s.hp <= 0) {
              setRevivePrompt({ reason: '被王府锦衣卫围剿砍倒，包袱珍宝即将全爆光！' });
              s.paused = true;
            }
          }
        }

        // 7. Decay Smokes, Coins, Pops & Particles
        s.coins = s.coins.filter((c) => {
          c.ttl -= dt;
          return c.ttl > 0;
        });
        s.smokes = s.smokes.filter((sm) => {
          sm.ttl -= dt;
          return sm.ttl > 0;
        });
        s.pops = s.pops.filter((p) => {
          p.y += p.vy * dt;
          p.ttl -= dt;
          return p.ttl > 0;
        });
        s.particles = s.particles.filter((pt) => {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vx *= 0.92;
          pt.vy *= 0.92;
          pt.life -= dt;
          return pt.life > 0;
        });

        uiSyncAccum += dt;
        if (uiSyncAccum >= 0.12) {
          uiSyncAccum = 0;
          setTimeLeft(Math.ceil(s.timeLeft));
          setExtractPct(Math.min(100, Math.round((s.extractTimer / 1.8) * 100)));
        }
      }

      // ================= RENDER 60FPS 2.5D ORIENTAL NOIR SCENE =================
      const cvs = canvasRef.current;
      if (cvs) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = cvs.getBoundingClientRect();
        if (cvs.width !== Math.round(rect.width * dpr) || cvs.height !== Math.round(rect.height * dpr)) {
          cvs.width = Math.round(rect.width * dpr);
          cvs.height = Math.round(rect.height * dpr);
        }
        const ctx = cvs.getContext('2d')!;
        ctx.save();
        ctx.scale(dpr, dpr);
        const vw = rect.width;
        const vh = rect.height;

        // Smooth camera centered on player
        const camX = Math.max(0, Math.min(mapCfg.width - vw, s.player.x - vw / 2));
        const camY = Math.max(0, Math.min(mapCfg.height - vh, s.player.y - vh / 2));

        ctx.fillStyle = '#0D1015';
        ctx.fillRect(0, 0, vw, vh);

        ctx.save();
        ctx.translate(-camX, -camY);

        // A. Real Seamless Palace Bluestone Courtyard & Imperial Dragon Carpets
        const stonePat = getTilePattern(ctx, 'tile_courtyard');
        if (stonePat) {
          ctx.fillStyle = stonePat;
          ctx.fillRect(0, 0, mapCfg.width, mapCfg.height);
        } else {
          ctx.fillStyle = '#151921';
          ctx.fillRect(0, 0, mapCfg.width, mapCfg.height);
        }

        // Ornate Imperial Dragon Carpet in North Vault & Side Chambers
        const carpetPat = getTilePattern(ctx, 'tile_carpet');
        const drawCarpetZone = (rx: number, ry: number, rw: number, rh: number) => {
          ctx.save();
          if (carpetPat) {
            ctx.fillStyle = carpetPat;
          } else {
            ctx.fillStyle = '#3B0D11';
          }
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = 'rgba(245, 185, 75, 0.55)';
          ctx.lineWidth = 3;
          ctx.strokeRect(rx + 3, ry + 3, rw - 6, rh - 6);
          ctx.restore();
        };
        drawCarpetZone(485, 92, mapCfg.width - 970, 296);
        drawCarpetZone(135, 670, 385, 290);
        drawCarpetZone(mapCfg.width - 520, 670, 385, 290);

        // B. Canal Water & Moored Wupeng Escape Boat
        const waterPat = getTilePattern(ctx, 'tile_water');
        for (const w of s.walls) {
          if (w.kind !== 'water') continue;
          ctx.save();
          ctx.fillStyle = waterPat || '#071923';
          ctx.fillRect(w.x, w.y, w.w, w.h);
          // Carved white-marble quay coping edge along north bank
          ctx.fillStyle = '#292524';
          ctx.fillRect(w.x, w.y, w.w, 10);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
          ctx.lineWidth = 2;
          ctx.strokeRect(w.x, w.y, w.w, 10);
          ctx.restore();
        }

        const ez = mapCfg.extractZone;
        const pulse = 0.72 + 0.28 * Math.sin(ts / 240);
        ctx.save();
        const ezGrad = ctx.createRadialGradient(ez.x, ez.y, 12, ez.x, ez.y, ez.radius);
        if (s.bagRef.length > 0) {
          ezGrad.addColorStop(0, `rgba(16, 185, 129, ${0.32 * pulse})`);
          ezGrad.addColorStop(1, 'rgba(16, 185, 129, 0.03)');
        } else {
          ezGrad.addColorStop(0, 'rgba(245, 158, 11, 0.14)');
          ezGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        }
        ctx.fillStyle = ezGrad;
        ctx.beginPath();
        ctx.arc(ez.x, ez.y, ez.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 6]);
        ctx.strokeStyle = s.bagRef.length > 0 ? '#34D399' : 'rgba(245, 185, 75, 0.45)';
        ctx.stroke();
        ctx.restore();

        // Real Painted Wupeng Escape Boat Sprite with gently bobbing bow lantern
        const boatImg = getSpriteImg('boat');
        const boatBob = Math.sin(ts / 420) * 3.5;
        ctx.save();
        ctx.translate(ez.x, ez.y + 18 + boatBob);
        // Subtle water ripple ring under hull
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.24)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 12, 74 + Math.sin(ts / 320) * 5, 24, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (boatImg) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 8;
          ctx.drawImage(boatImg, -84, -68, 168, 136);
        }
        // Warm golden lantern bloom at boat bow
        const bowGlow = ctx.createRadialGradient(-56, 26, 2, -56, 26, 48);
        bowGlow.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
        bowGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = bowGlow;
        ctx.beginPath();
        ctx.arc(-56, 26, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // C. 2.5D Palace Walls, Tubular Tile Roofs, Vermilion Pillars, Screens & Secret Nanmu Wall
        const roofPat = getTilePattern(ctx, 'tile_roof');
        for (const w of s.walls) {
          if (w.broken || w.kind === 'water') continue;
          ctx.save();
          // Ground ambient drop shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
          ctx.fillRect(w.x + 8, w.y + 10, w.w, w.h);

          if (w.kind === 'pillar') {
            // 2.5D Palace Architectural Square Marble-Base Lacquer Column with Tiled Cap
            ctx.fillStyle = '#57534E';
            ctx.fillRect(w.x - 3, w.y + w.h - 8, w.w + 6, 10);
            ctx.fillStyle = '#7F1D1D';
            ctx.fillRect(w.x + 2, w.y + 10, w.w - 4, w.h - 14);
            ctx.fillStyle = roofPat || '#1E293B';
            ctx.fillRect(w.x, w.y, w.w, w.h - 12);
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(w.x, w.y, w.w, w.h - 12);
            ctx.strokeStyle = '#D97706';
            ctx.strokeRect(w.x + 4, w.y + 4, w.w - 8, w.h - 20);
          } else if (w.kind === 'screen') {
            // 2.5D Palace Carved Shadow-Wall (照壁/影壁) with Dark Tiled Eave & Crimson Silk Relief
            const eaveH = Math.max(12, Math.floor(w.h * 0.52));
            ctx.fillStyle = '#451A03';
            ctx.fillRect(w.x, w.y + eaveH, w.w, w.h - eaveH);
            ctx.fillStyle = '#7F1D1D';
            ctx.fillRect(w.x + 8, w.y + eaveH + 2, w.w - 16, Math.max(4, w.h - eaveH - 4));
            ctx.fillStyle = roofPat || '#1E293B';
            ctx.fillRect(w.x - 2, w.y, w.w + 4, eaveH);
            ctx.strokeStyle = '#B45309';
            ctx.lineWidth = 2;
            ctx.strokeRect(w.x - 2, w.y, w.w + 4, eaveH);
          } else if (w.kind === 'secret_wall') {
            // Pryable Golden Nanmu Secret Vault Door with glowing cracks
            const dmgRatio = 1 - Math.max(0, (w.hp ?? 100) / 100);
            const nwGrad = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
            nwGrad.addColorStop(0, '#78350F');
            nwGrad.addColorStop(1, '#451A03');
            ctx.fillStyle = nwGrad;
            ctx.fillRect(w.x, w.y, w.w, w.h);
            ctx.strokeStyle = '#FBBF24';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
            ctx.setLineDash([]);
            if (dmgRatio > 0.05) {
              ctx.strokeStyle = '#FDE047';
              ctx.lineWidth = 2 + dmgRatio * 3;
              ctx.beginPath();
              ctx.moveTo(w.x + w.w * 0.3, w.y + 2);
              ctx.lineTo(w.x + w.w * 0.5, w.y + w.h * 0.55);
              ctx.lineTo(w.x + w.w * 0.68, w.y + w.h - 2);
              ctx.stroke();
            }
            if (w.label) {
              ctx.fillStyle = 'rgba(15, 10, 6, 0.85)';
              ctx.fillRect(w.x + w.w / 2 - 96, w.y - 28, 192, 22);
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
              ctx.lineWidth = 1;
              ctx.strokeRect(w.x + w.w / 2 - 96, w.y - 28, 192, 22);
              ctx.fillStyle = '#FDE047';
              ctx.font = 'bold 12px "PingFang SC", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(w.label, w.x + w.w / 2, w.y - 13);
            }
          } else {
            // 2.5D Palace Wall with Tubular Clay Roof Cap + Vermilion Facade
            if (w.w >= w.h) {
              const faceH = Math.min(12, Math.floor(w.h * 0.4));
              const roofH = w.h - faceH;
              ctx.fillStyle = roofPat || '#1E293B';
              ctx.fillRect(w.x, w.y, w.w, roofH);
              // Grey stone ridge beam
              ctx.fillStyle = '#475569';
              ctx.fillRect(w.x, w.y + Math.floor(roofH * 0.42), w.w, 4);
              // 3D Vermilion lower wall facade
              ctx.fillStyle = '#6D1B16';
              ctx.fillRect(w.x, w.y + roofH, w.w, faceH);
              ctx.strokeStyle = '#334155';
              ctx.lineWidth = 2;
              ctx.strokeRect(w.x, w.y, w.w, w.h);
            } else {
              ctx.fillStyle = roofPat || '#1E293B';
              ctx.fillRect(w.x, w.y, w.w, w.h);
              ctx.fillStyle = '#475569';
              ctx.fillRect(w.x + Math.floor(w.w * 0.44), w.y, 4, w.h);
              ctx.strokeStyle = '#334155';
              ctx.lineWidth = 2;
              ctx.strokeRect(w.x, w.y, w.w, w.h);
            }
          }
          ctx.restore();
        }

        // Room Plaque Labels
        ctx.font = 'bold 13px "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        for (const rl of mapCfg.roomLabels) {
          const tw = ctx.measureText(rl.text).width + 20;
          ctx.fillStyle = 'rgba(12, 8, 6, 0.72)';
          ctx.fillRect(rl.x - tw / 2, rl.y - 15, tw, 22);
          ctx.strokeStyle = 'rgba(245, 185, 75, 0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(rl.x - tw / 2, rl.y - 15, tw, 22);
          ctx.fillStyle = '#FDE68A';
          ctx.fillText(rl.text, rl.x, rl.y);
        }

        // D. Tossed Distraction Silver Ingots & Smoke Clouds (Ground Layer)
        for (const c of s.coins) {
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 12 + ((6 - c.ttl) * 20) % 38, 0, Math.PI * 2);
          ctx.stroke();
          drawTreasureIcon(ctx, 'silver_ingot', 0, 0, 34);
          ctx.restore();
        }

        // E. Guard Raycasted Lantern Light Cones (Projected from Guard's Handheld Lantern!)
        for (const g of s.guards) {
          if (g.state === 'stunned') continue;
          const facingRight = Math.cos(g.angle) >= -0.05;
          const lx = g.x + (facingRight ? 22 : -22);
          const ly = g.y - 6;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          const rays = 22;
          for (let i = 0; i <= rays; i++) {
            const a = g.angle - g.visionHalfAngle + (g.visionHalfAngle * 2 * i) / rays;
            const hit = castVisionRay({ x: g.x, y: g.y }, a, g.visionRange, s.walls);
            ctx.lineTo(hit.x, hit.y);
          }
          ctx.closePath();
          const coneGrad = ctx.createRadialGradient(lx, ly, 6, lx, ly, g.visionRange);
          if (g.state === 'chase') {
            coneGrad.addColorStop(0, 'rgba(239, 68, 68, 0.52)');
            coneGrad.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
          } else if (g.state === 'investigate') {
            coneGrad.addColorStop(0, 'rgba(250, 204, 21, 0.42)');
            coneGrad.addColorStop(1, 'rgba(250, 204, 21, 0.02)');
          } else {
            coneGrad.addColorStop(0, 'rgba(251, 146, 60, 0.36)');
            coneGrad.addColorStop(1, 'rgba(251, 146, 60, 0.01)');
          }
          ctx.fillStyle = coneGrad;
          ctx.fill();
          ctx.restore();
        }

        // F. Y-Sorted 2.5D Entities (Treasure Chests, Jinyiwei Guards & Night Raider!)
        const bagTotals = computeBagTotals(s.bagRef);
        type RenderItem =
          | { kind: 'chest'; y: number; ch: ChestEntity }
          | { kind: 'guard'; y: number; g: GuardEntity }
          | { kind: 'player'; y: number };

        const renderQueue: RenderItem[] = [
          ...s.chests.map((ch) => ({ kind: 'chest' as const, y: ch.y, ch })),
          ...s.guards.map((g) => ({ kind: 'guard' as const, y: g.y, g })),
          { kind: 'player' as const, y: s.player.y },
        ].sort((a, b) => a.y - b.y);

        for (const item of renderQueue) {
          if (item.kind === 'chest') {
            const ch = item.ch;
            const def = TREASURES[ch.lootDefId];
            ctx.save();
            ctx.translate(ch.x, ch.y);
            // Ground contact shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.beginPath();
            ctx.ellipse(0, 18, 28, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            if (ch.opened) {
              const openImg = getSpriteImg('chest_open');
              if (openImg) {
                ctx.globalAlpha = 0.85;
                ctx.drawImage(openImg, -32, -32, 64, 64);
              }
            } else {
              const glowCol =
                godXray && def.rarity === 'mythic'
                  ? 'rgba(244, 63, 94, 0.65)'
                  : ch.tier === 'dragon_vault'
                  ? 'rgba(251, 191, 36, 0.38)'
                  : ch.tier === 'rosewood'
                  ? 'rgba(192, 132, 252, 0.24)'
                  : 'rgba(251, 191, 36, 0.1)';
              const cGlow = ctx.createRadialGradient(0, 0, 6, 0, 0, ch.tier === 'dragon_vault' ? 44 : 32);
              cGlow.addColorStop(0, glowCol);
              cGlow.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = cGlow;
              ctx.beginPath();
              ctx.arc(0, 0, ch.tier === 'dragon_vault' ? 44 : 32, 0, Math.PI * 2);
              ctx.fill();

              const chestSprite = getSpriteImg(
                ch.tier === 'dragon_vault'
                  ? 'chest_dragon'
                  : ch.tier === 'rosewood'
                  ? 'chest_rosewood'
                  : 'chest_wood'
              );
              const cSize = ch.tier === 'dragon_vault' ? 72 : 62;
              if (chestSprite) {
                ctx.drawImage(chestSprite, -cSize / 2, -cSize / 2 - 4, cSize, cSize);
              }

              if (godXray) {
                ctx.fillStyle = 'rgba(10, 8, 6, 0.85)';
                ctx.fillRect(-52, 24, 104, 18);
                ctx.fillStyle = RARITY_META[def.rarity].color;
                ctx.font = 'bold 11px "PingFang SC", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`👁️${def.name}`, 0, 37);
              }

              if (ch.progress > 0.02) {
                const ratio = Math.min(1, ch.progress / ch.searchSeconds);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
                ctx.beginPath();
                ctx.arc(0, -38, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, -38, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
                ctx.strokeStyle = '#FBBF24';
                ctx.lineWidth = 4;
                ctx.stroke();
              }
            }
            ctx.restore();
          } else if (item.kind === 'guard') {
            const g = item.g;
            const gImg = getSpriteImg(g.elite ? 'elite_guard' : 'guard');
            const facingRight = Math.cos(g.angle) >= -0.05;
            const stridePhase = ts * (g.state === 'chase' ? 0.018 : 0.011) + g.x * 0.02;
            const bobY = g.state === 'stunned' ? 6 : -Math.abs(Math.sin(stridePhase)) * 5;
            const tilt = g.state === 'stunned' ? 0.55 : Math.sin(stridePhase) * 0.055;

            ctx.save();
            ctx.translate(g.x, g.y);
            // Ground shadow under boots
            ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
            ctx.beginPath();
            ctx.ellipse(0, 22, 24, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.translate(0, bobY);
            if (!facingRight) ctx.scale(-1, 1);
            ctx.rotate(tilt);
            if (g.state === 'stunned') ctx.globalAlpha = 0.68;
            const gSize = g.elite ? 92 : 84;
            if (gImg) {
              ctx.drawImage(gImg, -gSize / 2, -gSize / 2 - 10, gSize, gSize);
            }
            ctx.restore();

            // Guard State Badge above Hat
            ctx.font = 'bold 12px "PingFang SC", sans-serif';
            ctx.textAlign = 'center';
            if (g.state === 'stunned') {
              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.fillRect(-34, -56, 68, 20);
              ctx.fillStyle = '#38BDF8';
              ctx.fillText('💫闷棍晕厥', 0, -42);
            } else if (g.state === 'chase') {
              ctx.fillStyle = 'rgba(127, 29, 29, 0.9)';
              ctx.fillRect(-36, -58, 72, 20);
              ctx.fillStyle = '#FCA5A5';
              ctx.fillText('❗拔刀追砍', 0, -44);
            } else if (g.state === 'investigate') {
              ctx.fillStyle = 'rgba(69, 26, 3, 0.88)';
              ctx.fillRect(-36, -56, 72, 20);
              ctx.fillStyle = '#FDE047';
              ctx.fillText('❓上前查探', 0, -42);
            }
            ctx.restore();
          } else {
            // Night Raider Player Sprite with 60fps Martial Stride Animation!
            const rImg = getSpriteImg('raider');
            const spdNow = Math.hypot(s.player.vx, s.player.vy);
            const isMoving = spdNow > 12;
            const facingRight = Math.cos(s.player.angle) >= -0.05;
            const runPhase = ts * 0.019;
            const bobY = isMoving ? -Math.abs(Math.sin(runPhase)) * 6.5 : Math.sin(ts * 0.004) * 1.5;
            const lean = isMoving ? Math.sin(runPhase) * 0.08 + 0.05 : 0;

            ctx.save();
            ctx.translate(s.player.x, s.player.y);

            // Warm subtle night-vision torch aura around Raider
            const pGlow = ctx.createRadialGradient(0, 0, 8, 0, 0, 145);
            pGlow.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
            pGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
            ctx.fillStyle = pGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 145, 0, Math.PI * 2);
            ctx.fill();

            // Ground shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.beginPath();
            ctx.ellipse(0, 22, 22, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            if (s.player.invuln > 0 && Math.floor(ts / 80) % 2 === 0) {
              ctx.globalAlpha = 0.45;
            } else if (s.player.smokeStealth > 0) {
              ctx.globalAlpha = 0.62;
            }

            // Mythic/Legendary Loot Shimmer Aura if carrying big treasure
            if (bagTotals.mythicCount > 0) {
              const mGlow = ctx.createRadialGradient(0, -8, 4, 0, -8, 38);
              mGlow.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
              mGlow.addColorStop(1, 'rgba(244, 63, 94, 0)');
              ctx.fillStyle = mGlow;
              ctx.beginPath();
              ctx.arc(0, -8, 38, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.save();
            ctx.translate(0, bobY);
            if (!facingRight) ctx.scale(-1, 1);
            ctx.rotate(lean);
            if (rImg) {
              ctx.drawImage(rImg, -41, -50, 82, 82);
            }
            ctx.restore();
            ctx.restore();
          }
        }

        // G. Volumetric Purple Smoke Clouds (Foreground Stealth Cover)
        for (const sm of s.smokes) {
          const g = ctx.createRadialGradient(sm.x, sm.y, 12, sm.x, sm.y, sm.radius);
          g.addColorStop(0, 'rgba(126, 34, 206, 0.62)');
          g.addColorStop(0.65, 'rgba(88, 28, 135, 0.34)');
          g.addColorStop(1, 'rgba(59, 7, 100, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // H. Particles & Floating Loot Pops
        for (const pt of s.particles) {
          ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.font = 'bold 14px "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        for (const pop of s.pops) {
          const pw = ctx.measureText(pop.text).width + 18;
          ctx.fillStyle = 'rgba(9, 7, 6, 0.82)';
          ctx.fillRect(pop.x - pw / 2, pop.y - 15, pw, 22);
          ctx.fillStyle = pop.color;
          ctx.fillText(pop.text, pop.x, pop.y);
        }

        // Extraction Progress Bar right above Boat
        if (s.extractTimer > 0.05) {
          ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
          ctx.fillRect(ez.x - 108, ez.y - 74, 216, 26);
          ctx.strokeStyle = '#34D399';
          ctx.lineWidth = 2;
          ctx.strokeRect(ez.x - 108, ez.y - 74, 216, 26);
          ctx.fillStyle = '#A7F3D0';
          ctx.font = 'bold 14px "PingFang SC", sans-serif';
          ctx.fillText(
            `⛵ 正在登船撤离 ${Math.min(100, Math.round((s.extractTimer / 1.8) * 100))}%...`,
            ez.x,
            ez.y - 56
          );
        }

        ctx.restore();

        // Atmospheric Palace Night Vignette around Viewport Edges
        const vig = ctx.createRadialGradient(
          vw / 2,
          vh / 2,
          Math.min(vw, vh) * 0.34,
          vw / 2,
          vh / 2,
          Math.max(vw, vh) * 0.76
        );
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vig.addColorStop(1, 'rgba(4, 5, 10, 0.58)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, vw, vh);

        ctx.restore();
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, bagCols, bagRows, godFeather, godXray]);

  // Touch / Mouse Virtual Joystick Handlers
  const onPointerDownCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== canvasRef.current) return;
    if (e.clientX > window.innerWidth * 0.62) return; // Right side reserved for skill buttons
    joyTouchId.current = e.pointerId;
    joyOrigin.current = { x: e.clientX, y: e.clientY };
    setJoyVisual({ active: true, ox: e.clientX, oy: e.clientY, kx: 0, ky: 0 });
  };

  const onPointerMoveCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyTouchId.current !== e.pointerId) return;
    const dx = e.clientX - joyOrigin.current.x;
    const dy = e.clientY - joyOrigin.current.y;
    const maxR = 48;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(maxR, dist);
    const nx = dist > 2 ? dx / dist : 0;
    const ny = dist > 2 ? dy / dist : 0;
    simRef.current.joyVec = { x: nx * (clamped / maxR), y: ny * (clamped / maxR) };
    setJoyVisual((v) => ({ ...v, kx: nx * clamped, ky: ny * clamped }));
  };

  const onPointerUpCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyTouchId.current !== e.pointerId) return;
    joyTouchId.current = null;
    simRef.current.joyVec = { x: 0, y: 0 };
    setJoyVisual((v) => ({ ...v, active: false, kx: 0, ky: 0 }));
  };

  const bagTotals = computeBagTotals(bag);

  // Handle Revive or Accept Loss
  const handleRevive = () => {
    const ok = onConsumeRevivePill();
    if (!ok) {
      if (!IS_PURE_PLATFORM_MODE) onOpenProModal();
      return;
    }
    sound.playCashOutGong();
    const s = simRef.current;
    s.hp = maxHp;
    setHp(maxHp);
    s.timeLeft = Math.max(s.timeLeft, 30);
    s.player.invuln = 3.5;
    s.player.smokeStealth = 4.0;
    // Stun nearby guards so player escapes cleanly!
    for (const g of s.guards) {
      if (Math.hypot(g.x - s.player.x, g.y - s.player.y) < 280) {
        g.state = 'stunned';
        g.stateTimer = 7.0;
      }
    }
    setRevivePrompt(null);
    s.paused = false;
  };

  const handleGiveUpRaid = () => {
    const s = simRef.current;
    s.finished = true;
    onFinishRaid({
      escaped: false,
      mapId,
      mapName: mapCfg.name,
      timeUsedSec: Math.round(mapCfg.durationSec - s.timeLeft),
      totalValueWan: bagTotals.totalValueWan,
      itemsExtracted: [...bag],
      mythicCount: bagTotals.mythicCount,
      guardsKnockedOut: s.knockouts,
      failReason: revivePrompt?.reason || '潜行败露，所携珍宝尽数散落王府！',
    });
  };

  return (
    <div
      className="relative flex-1 w-full h-[calc(100dvh-52px)] overflow-hidden select-none touch-none bg-[#090706]"
      onPointerDown={onPointerDownCanvas}
      onPointerMove={onPointerMoveCanvas}
      onPointerUp={onPointerUpCanvas}
      onPointerCancel={onPointerUpCanvas}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* TOP HUD OVERLAY */}
      <div className="absolute top-2.5 inset-x-2.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Hearts + Map Name */}
        <div className="px-3 py-1.5 rounded-xl bg-black/75 border border-amber-500/30 backdrop-blur-md flex items-center gap-2.5 pointer-events-auto">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: maxHp }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${i < hp ? 'text-red-500 fill-red-500' : 'text-stone-700'}`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-amber-200 hidden sm:inline">{mapCfg.name}</span>
          <button
            onClick={onAbortToLobby}
            className="text-[11px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 hover:text-white cursor-pointer"
          >
            撤回大厅
          </button>
        </div>

        {/* Countdown Timer */}
        <div
          className={`px-3.5 py-1.5 rounded-xl border font-mono font-extrabold text-sm backdrop-blur-md ${
            timeLeft <= 20
              ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
              : 'bg-black/75 border-amber-500/30 text-amber-300'
          }`}
        >
          🕯️ 锁门倒计时 {timeLeft}s
        </div>

        {/* Live Loot Value & Bag Button */}
        <button
          onClick={() => {
            sound.playTap();
            setBagOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg pointer-events-auto cursor-pointer"
        >
          <Backpack className="w-4 h-4" />
          <span>{formatSilver(bagTotals.totalValueWan)}</span>
          <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">
            {bag.length}件 / {bagTotals.totalWeightKg}kg
          </span>
        </button>
      </div>

      {/* Center Top Alert Toast */}
      {bannerAlert && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-extrabold shadow-lg whitespace-nowrap">
          {bannerAlert}
        </div>
      )}

      {/* Extraction Ready Guide */}
      {bagTotals.totalValueWan > 0 && extractPct === 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-emerald-950/85 border border-emerald-400/50 text-emerald-300 text-[11px] font-bold pointer-events-none flex items-center gap-1">
          <Sailboat className="w-3.5 h-3.5" />
          <span>已摸得 {formatSilver(bagTotals.totalValueWan)}！随时可冲回最下方绿圈登船落袋！</span>
        </div>
      )}

      {/* Left Virtual Joystick Visual */}
      <div
        className="absolute z-20 pointer-events-none"
        style={{
          left: joyVisual.active ? joyVisual.ox - 52 : 34,
          bottom: joyVisual.active ? undefined : 32,
          top: joyVisual.active ? joyVisual.oy - 52 : undefined,
          width: 104,
          height: 104,
        }}
      >
        <div className="w-full h-full rounded-full bg-white/10 border-2 border-amber-400/40 backdrop-blur-xs flex items-center justify-center">
          <div
            className="w-11 h-11 rounded-full bg-amber-400/85 shadow-lg"
            style={{
              transform: `translate(${joyVisual.kx}px, ${joyVisual.ky}px)`,
            }}
          />
        </div>
      </div>

      {/* Right Thumb Tactical Skill Buttons */}
      <div className="absolute bottom-6 right-4 z-20 flex flex-col sm:flex-row items-end gap-2.5 pointer-events-auto">
        <button
          onClick={triggerSmokeBomb}
          disabled={smokeLeft <= 0 && !godInfinite}
          className="w-15 h-15 rounded-2xl bg-purple-950/85 hover:bg-purple-900 border-2 border-purple-400/70 disabled:opacity-35 flex flex-col items-center justify-center text-purple-100 shadow-xl active:scale-95 cursor-pointer"
        >
          <CloudFog className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">烟雾({godInfinite ? '∞' : smokeLeft})</span>
        </button>

        <button
          onClick={triggerTossCoin}
          disabled={coinsLeft <= 0 && !godInfinite}
          className="w-15 h-15 rounded-2xl bg-amber-950/85 hover:bg-amber-900 border-2 border-amber-400/70 disabled:opacity-35 flex flex-col items-center justify-center text-amber-100 shadow-xl active:scale-95 cursor-pointer"
        >
          <Coins className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">撒银({godInfinite ? '∞' : coinsLeft})</span>
        </button>

        <button
          onClick={triggerBackstab}
          disabled={daggersLeft <= 0 && !godInfinite}
          className="w-15 h-15 rounded-2xl bg-sky-950/85 hover:bg-sky-900 border-2 border-sky-400/70 disabled:opacity-35 flex flex-col items-center justify-center text-sky-100 shadow-xl active:scale-95 cursor-pointer"
        >
          <Sword className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">闷棍({godInfinite ? '∞' : daggersLeft})</span>
        </button>
      </div>

      {/* Spatial Grid Backpack Modal */}
      <GridBagModal
        isOpen={bagOpen}
        cols={bagCols}
        rows={bagRows}
        bag={bag}
        pendingLootDefId={pendingLootId}
        onUpdateBag={(next) => setBag(next)}
        onClearPending={() => {
          setPendingLootId(null);
          setBagOpen(false);
        }}
        onClose={() => setBagOpen(false)}
      />

      {/* Mid-Raid Knockdown Second-Chance Revive Modal */}
      {revivePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#180909] crimson-danger-glow p-5 space-y-4 text-center">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
            <h3 className="text-xl font-extrabold text-red-200">{revivePrompt.reason}</h3>
            <p className="text-xs text-stone-300">
              你包袱里正揣着 <b className="text-amber-400 text-sm">{formatSilver(bagTotals.totalValueWan)}</b> 奇珍异宝！一旦倒下将全部散落充公！
            </p>

            <div className="space-y-2.5 pt-1">
              {(isPro || profile.freeRevivePills > 0 || !IS_PURE_PLATFORM_MODE) && (
                <button
                  onClick={handleRevive}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-sm cursor-pointer shadow-lg"
                >
                  {isPro
                    ? '💊 捏碎【总管无限金蝉丹】满血震退追兵继续撤离！'
                    : IS_PURE_PLATFORM_MODE || profile.freeRevivePills > 0
                    ? `💊 捏碎免费【金蝉替身丹】(剩${profile.freeRevivePills}颗) · 满血保住整包大金！`
                    : '👑 解锁大内总管金手指 · 无限金蝉复活保大红'}
                </button>
              )}
              <button
                onClick={handleGiveUpRaid}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 text-xs font-bold cursor-pointer"
              >
                认栽弃包 · 空手退回暗桩
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
