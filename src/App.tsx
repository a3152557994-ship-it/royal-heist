import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Sailboat,
  Volume2,
  VolumeX,
  Crown,
  Dices,
  Video,
  Share2,
  RotateCcw,
  Sparkles,
  Building2,
  Languages,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import {
  AuditEncounter,
  CheatItemId,
  ComboStepLog,
  Lang,
  LootCard,
  LordProfile,
  PersistentProfile,
  RunOutcome,
  RunSnapshot,
} from './types/game';
import {
  calculateWatchResolution,
  computeSuddenDeathRiskPercent,
  createAuditEncounter,
  drawHandCards,
  ESTATES,
  evaluateImperialExcuse,
  formatSilver,
  LORDS,
  RELICS_AND_CONSORTS,
  tText,
} from './engine/gameData';
import { loadProfile, saveProfile, IS_PURE_PLATFORM_MODE } from './utils/licenseAndSave';
import { renderBattlePosterDataUrl } from './utils/posterRenderer';
import { sound } from './audio/soundEngine';
import { AuditModal } from './components/AuditModal';
import { VaultModals } from './components/VaultModals';

type ScreenPhase = 'lobby' | 'desk' | 'outcome';
type DeskSubPhase = 'picking' | 'resolving' | 'cashout_prompt';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('zh');
  const [profile, setProfile] = useState<PersistentProfile>(() => loadProfile());
  const [phase, setPhase] = useState<ScreenPhase>('lobby');
  const [subPhase, setSubPhase] = useState<DeskSubPhase>('picking');

  const [selectedLord, setSelectedLord] = useState<LordProfile>(LORDS[0]);
  const [streamerMode, setStreamerMode] = useState(false);
  const [muted, setMuted] = useState(false);

  // Active Run State
  const [watchTurn, setWatchTurn] = useState(1);
  const [incenseLeft, setIncenseLeft] = useState(100);
  const [wantedStars, setWantedStars] = useState(1);
  const [peakWanted, setPeakWanted] = useState(1);
  const [unbankedSilverWan, setUnbankedSilverWan] = useState(0);
  const [greedStreakMult, setGreedStreakMult] = useState(0);
  const [relicIds, setRelicIds] = useState<string[]>([]);
  const [items, setItems] = useState<Record<CheatItemId, number>>({
    spyglass: 1,
    scapegoat: 0,
    bribe_tea: 1,
    loaded_dice: 1,
  });
  const [hand, setHand] = useState<LootCard[]>([]);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [comboLogs, setComboLogs] = useState<ComboStepLog[]>([]);
  const [historyTitles, setHistoryTitles] = useState<string[]>([]);
  const [lastSafeSnapshot, setLastSafeSnapshot] = useState<RunSnapshot | null>(null);

  // Audit Roulette State
  const [audit, setAudit] = useState<AuditEncounter | null>(null);
  const [peekedScrollIdx, setPeekedScrollIdx] = useState<number | null>(null);
  const [scapegoatArmed, setScapegoatArmed] = useState(false);

  // Outcome & Modals
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [shareBonusClaimedThisRun, setShareBonusClaimedThisRun] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultTab, setVaultTab] = useState<'estates' | 'achievements' | 'pro'>('estates');

  const isPro = Boolean(profile.proLicenseToken);

  const syncProfile = (next: PersistentProfile) => {
    setProfile(next);
    saveProfile(next);
  };

  useEffect(() => {
    const danger = Math.max((100 - incenseLeft) / 100, wantedStars / 5);
    sound.setDangerLevel(danger);
  }, [incenseLeft, wantedStars]);

  const maxRelicSlots =
    selectedLord.maxRelicSlots + (isPro && profile.godModeConfig.extraRelicSlot ? 1 : 0);

  // Start a new heist run
  const startHeistRun = (lord: LordProfile) => {
    sound.playSealStamp();
    sound.startVaultAmbience();

    const startSilver =
      (profile.estateLevel >= 4 ? 120 : profile.estateLevel >= 1 ? 25 : 0) +
      (isPro && profile.godModeConfig.bonusStartSilverWan ? 300 : 0);
    const startIncense = Math.round(
      lord.startingIncense * (isPro && profile.godModeConfig.slowIncense ? 1.4 : 1)
    );
    const startItems: Record<CheatItemId, number> = {
      ...lord.startingItems,
      loaded_dice: lord.startingItems.loaded_dice + (profile.estateLevel >= 1 ? 1 : 0),
      spyglass: lord.startingItems.spyglass + (isPro ? 1 : 0),
    };
    const initRelics = [lord.startingRelicId];
    const maxSlots = lord.maxRelicSlots + (isPro && profile.godModeConfig.extraRelicSlot ? 1 : 0);

    setSelectedLord(lord);
    setWatchTurn(1);
    setIncenseLeft(startIncense);
    setWantedStars(lord.startingWanted);
    setPeakWanted(lord.startingWanted);
    setUnbankedSilverWan(startSilver);
    setGreedStreakMult(0);
    setRelicIds(initRelics);
    setItems(startItems);
    setHand(drawHandCards(initRelics, maxSlots, 5));
    setPickedIds([]);
    setComboLogs([]);
    setHistoryTitles([]);
    setLastSafeSnapshot(null);
    setAudit(null);
    setOutcome(null);
    setPosterUrl(null);
    setShareBonusClaimedThisRun(false);
    setSubPhase('picking');
    setPhase('desk');

    syncProfile({
      ...profile,
      totalRuns: profile.totalRuns + 1,
    });
  };

  // Pre-execution risk & reward preview (Rule #6 from competitor teardown!)
  const previewCalc = useMemo(() => {
    const chosen = hand.filter((c) => pickedIds.includes(c.id));
    if (chosen.length === 0) return null;
    return calculateWatchResolution({
      selectedCards: chosen,
      lord: selectedLord,
      relicIds,
      greedStreakMult,
      currentIncense: incenseLeft,
      currentWanted: wantedStars,
      estateLevel: profile.estateLevel,
      lang,
    });
  }, [hand, pickedIds, selectedLord, relicIds, greedStreakMult, incenseLeft, wantedStars, profile.estateLevel, lang]);

  const togglePickCard = (id: string) => {
    sound.playTap();
    setPickedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleRerollHand = () => {
    if (items.loaded_dice <= 0) return;
    sound.playTap();
    setItems((p) => ({ ...p, loaded_dice: p.loaded_dice - 1 }));
    setPickedIds([]);
    setHand(drawHandCards(relicIds, maxRelicSlots, 5));
  };

  // Execute selected cards on the rosewood abacus!
  const handleExecuteWatch = () => {
    const chosen = hand.filter((c) => pickedIds.includes(c.id));
    if (chosen.length === 0) return;

    // Save pre-turn snapshot so Rewind Pill can rescue player cleanly!
    const snapshot: RunSnapshot = {
      watchTurn,
      incenseLeft,
      wantedStars,
      unbankedSilverWan,
      greedStreakMult,
      relicIds: [...relicIds],
      items: { ...items },
      historyTitles: [...historyTitles],
    };
    setLastSafeSnapshot(snapshot);

    const res = calculateWatchResolution({
      selectedCards: chosen,
      lord: selectedLord,
      relicIds,
      greedStreakMult,
      currentIncense: incenseLeft,
      currentWanted: wantedStars,
      estateLevel: profile.estateLevel,
      lang,
    });

    setSubPhase('resolving');
    setComboLogs([]);

    res.steps.forEach((step, idx) => {
      window.setTimeout(() => {
        sound.playAbacusCombo(idx + 1);
        setComboLogs((prev) => [...prev, step]);
      }, idx * 170);
    });

    const totalDelay = res.steps.length * 170 + 220;
    window.setTimeout(() => {
      let nextSilver = Math.round((unbankedSilverWan + res.gainedSilverWan) * 10) / 10;
      const nextRelics = [...relicIds, ...res.grantedRelicIds].slice(0, maxRelicSlots);
      if (nextRelics.includes('con_merchant')) {
        nextSilver = Math.round(nextSilver * 1.15 * 10) / 10;
      }

      const nextItems = { ...items };
      res.grantedItems.forEach((it) => {
        const k = it as CheatItemId;
        nextItems[k] = (nextItems[k] || 0) + 1;
      });

      const nextPeak = Math.max(peakWanted, res.nextWanted);
      setUnbankedSilverWan(nextSilver);
      setRelicIds(nextRelics);
      setItems(nextItems);
      setWantedStars(res.nextWanted);
      setPeakWanted(nextPeak);
      setIncenseLeft(res.nextIncense);
      setHistoryTitles((prev) => [...prev, ...chosen.map((c) => tText(c.name, lang))]);

      // Check if Incense burned out right now!
      if (res.nextIncense <= 0) {
        triggerConfiscation(
          nextSilver,
          nextPeak,
          nextRelics.length,
          {
            zh: '龙涎香断 · 新皇封门抄家',
            en: 'Incense Burned Out · Total Confiscation',
          },
          {
            zh: `乾清宫丧钟骤响！你贪恋最后一笔肥差未及登船，九门提督铁骑已将私邸围得水泄不通，暗格里 ${formatSilver(nextSilver, 'zh')} 尽数充入新皇内库！`,
            en: `The mourning bell tolled before you boarded the boat! Imperial cavalry seized all ${formatSilver(nextSilver, 'en')} in your cellar!`,
          },
          {
            zh: '「差评！就差半炷香我就能把三千万两运去苏州买园子了，结果太医院全是庸医，我跌倒新皇吃撑了！」',
            en: '"1-Star! One more minute and my boat was in Suzhou! Now the new Emperor eats my entire fortune!"',
          }
        );
        return;
      }

      // Check if Snap Audit triggers (Wanted >= 4.5 guaranteed, or probabilistic when Wanted >= 2.3)
      const auditChance =
        res.nextWanted >= 4.5 ? 1.0 : res.nextWanted >= 2.2 ? (res.nextWanted - 1.5) * 0.24 : 0;
      if (Math.random() < auditChance) {
        // Check Princess Ninghua whip immunity!
        if (nextRelics.includes('con_princess') && Math.random() < 0.4) {
          sound.playCashOutGong();
          setComboLogs((prev) => [
            ...prev,
            {
              label:
                lang === 'zh'
                  ? '👑 长公主凤鞭怒抽查账御史！免审过关！'
                  : '👑 Princess Ninghua whipped away the Censor!',
              silverWanAfter: nextSilver,
              multAfter: 1,
            },
          ]);
          setWantedStars(Math.max(0, res.nextWanted - 1.2));
          setSubPhase('cashout_prompt');
          return;
        }

        sound.playAuditAlarm();
        setPeekedScrollIdx(null);
        setScapegoatArmed(false);
        setAudit(createAuditEncounter(res.nextWanted, watchTurn));
        return;
      }

      setSubPhase('cashout_prompt');
    }, totalDelay);
  };

  // Audit Roulette Handlers
  const handleAuditPickScroll = (idx: number) => {
    if (!audit) return;
    const picked = audit.scrolls[idx];
    if (picked.isDeadly) {
      if (scapegoatArmed) {
        sound.playCashOutGong();
        setScapegoatArmed(false);
        setWantedStars((w) => Math.max(0, w - 1.5));
        setAudit(null);
        setSubPhase('cashout_prompt');
        return;
      }
      setAudit(null);
      triggerConfiscation(
        unbankedSilverWan,
        peakWanted,
        relicIds.length,
        {
          zh: '铁证穿帮 · 当堂革职抄没',
          en: 'Deadly Ledger Unsealed · Arrested',
        },
        {
          zh: `火漆拆开竟是江南盐引真账！钦差拍案亮出尚方锁链，你暗格里攒下的 ${formatSilver(unbankedSilverWan, 'zh')} 连夜被抬进国库！`,
          en: `You unsealed the real salt-bribe ledger! Guards stormed your vault and confiscated ${formatSilver(unbankedSilverWan, 'en')}!`,
        },
        {
          zh: '「服了！三选一都能精准摸中死罪真账，早知道刚才花点茶钱把东厂公公打发走了！」',
          en: '"Unbelievable! Hit the 1-in-3 deadly ledger! Should have served the Pearl Bribe Tea!"',
        }
      );
    } else {
      // Survived audit! Bonus greed mult!
      sound.playCashOutGong();
      setGreedStreakMult((m) => Math.round((m + 0.45) * 100) / 100);
      setWantedStars((w) => Math.max(0, Math.round((w - 1.1) * 10) / 10));
      setAudit(null);
      setSubPhase('cashout_prompt');
    }
  };

  const handleAuditSpyglass = () => {
    if (!audit) return;
    if (!isPro) {
      setItems((p) => ({ ...p, spyglass: Math.max(0, p.spyglass - 1) }));
    }
    const firstUnrevealed = audit.scrolls.findIndex((s) => !s.revealed);
    if (firstUnrevealed >= 0) setPeekedScrollIdx(firstUnrevealed);
  };

  const handleAuditScapegoat = () => {
    if (items.scapegoat <= 0) return;
    setItems((p) => ({ ...p, scapegoat: p.scapegoat - 1 }));
    setScapegoatArmed(true);
  };

  const handleAuditBribeTea = () => {
    if (items.bribe_tea <= 0) return;
    const cost = Math.max(5, Math.round(unbankedSilverWan * 0.18 * 10) / 10);
    setItems((p) => ({ ...p, bribe_tea: p.bribe_tea - 1 }));
    setUnbankedSilverWan((s) => Math.max(0, Math.round((s - cost) * 10) / 10));
    setWantedStars((w) => Math.max(0, Math.round((w - 1.6) * 10) / 10));
    sound.playCashOutGong();
    setAudit(null);
    setSubPhase('cashout_prompt');
  };

  const handleAuditExcuse = (text: string) => {
    if (!audit) return;
    const res = evaluateImperialExcuse(text, audit.inquisitorType);
    const nextAch = [...profile.unlockedAchievements];
    if (res.dismissedAll && !nextAch.includes('ach_ silver_tongue')) {
      nextAch.push('ach_ silver_tongue');
    }
    syncProfile({
      ...profile,
      freeExcuseLeftToday: isPro ? profile.freeExcuseLeftToday : Math.max(0, profile.freeExcuseLeftToday - 1),
      unlockedAchievements: nextAch,
    });

    setWantedStars((w) => Math.max(0, Math.min(5, Math.round((w + res.wantedDelta) * 10) / 10)));

    if (res.dismissedAll) {
      sound.playCashOutGong();
      setAudit(null);
      setSubPhase('cashout_prompt');
      return;
    }

    const updatedScrolls = [...audit.scrolls];
    if (res.neutralizedOneDeadly) {
      const deadlyIdx = updatedScrolls.findIndex((s) => s.isDeadly && !s.revealed);
      // Keep at least 1 safe scroll; neutralize deadly if >0
      if (deadlyIdx >= 0) {
        updatedScrolls[deadlyIdx] = { ...updatedScrolls[deadlyIdx], isDeadly: false };
      }
    }

    setAudit({
      ...audit,
      scrolls: updatedScrolls,
      excuseUsed: true,
      excuseFeedback: { zh: res.verdictZh, en: res.verdictEn },
    });
  };

  // Cash Out Safely! (Extraction Win!)
  const handleCashOutEscape = () => {
    sound.playCashOutGong();
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });

    const newVault = Math.round((profile.vaultSilverWan + unbankedSilverWan) * 10) / 10;
    const newBest = Math.max(profile.bestSingleRunWan, unbankedSilverWan);
    const unlocked = new Set(profile.unlockedAchievements);

    unlocked.add('ach_first_escape');
    if (unbankedSilverWan >= 1000) unlocked.add('ach_10m');
    if (unbankedSilverWan >= 10000) unlocked.add('ach_100m');
    if (unbankedSilverWan >= 80000 || newVault >= 80000) unlocked.add('ach_800m_heshen');
    const consortCount = relicIds.filter((id) => RELICS_AND_CONSORTS[id]?.kind === 'consort').length;
    if (consortCount >= 3) unlocked.add('ach_harem_master');
    if (incenseLeft < 15) unlocked.add('ach_edge_runner');

    const nextProfile: PersistentProfile = {
      ...profile,
      vaultSilverWan: newVault,
      totalEscapes: profile.totalEscapes + 1,
      bestSingleRunWan: newBest,
      unlockedAchievements: Array.from(unlocked),
    };
    syncProfile(nextProfile);

    const pct = Math.min(99.8, Math.max(55, 58 + Math.log10(Math.max(10, unbankedSilverWan)) * 11.5));
    const result: RunOutcome = {
      escaped: true,
      lordId: selectedLord.id,
      watchesSurvived: watchTurn,
      silverExtractedWan: unbankedSilverWan,
      silverConfiscatedWan: 0,
      peakWanted,
      relicCount: relicIds.length,
      causeTitle:
        selectedLord.id === 'emperor'
          ? { zh: '天子讨饷功成 · 京师固若金汤', en: 'War Chest Secured · Dynasty Saved' }
          : unbankedSilverWan >= 10000
          ? { zh: '富可敌国 · 携亿万白银逍遥南洋', en: ' Empire of Silver · Clean Getaway' }
          : { zh: '见好就收 · 连夜装船全身而退', en: 'Clean Extraction · Safe in Jiangnan' },
      epitaph:
        selectedLord.id === 'emperor'
          ? {
              zh: `赶在闯军攻城前，你铁腕从满朝勋贵夹墙里抄出 ${formatSilver(unbankedSilverWan, 'zh')} 现银押上九门，边军死战退敌，大明国祚逆天改命！`,
              en: `Before the walls fell, you pried ${formatSilver(unbankedSilverWan, 'en')} from corrupt nobles to fund the garrison and saved the dynasty!`,
            }
          : {
              zh: `老皇上断气前半刻钟，你最后一箱金砖恰好划出护城河暗道！新皇冲进空荡荡的账房气得吐血，而你已在江南画舫听曲数银子！`,
              en: `Minutes before the Old Emperor breathed his last, your loaded treasure barge slipped down the canal—leaving the New Emperor an empty cellar!`,
            },
      earthReviewMeme: {
        zh: `「五星好评！这把稳如老狗果断撤离，净落袋 ${formatSilver(unbankedSilverWan, 'zh')}！奉劝各位贪狗一句：只要船划得够快，抄家圣旨就追不上我！」`,
        en: `"5-Stars! Cashed out ${formatSilver(unbankedSilverWan, 'en')} right before the palace gates locked! Greed kills, timing pays!"`,
      },
      rankPercentile: pct,
      canRewind: false,
    };

    setOutcome(result);
    setPhase('outcome');
    renderBattlePosterDataUrl(result, nextProfile, lang).then(setPosterUrl).catch(() => {});
  };

  // Push Luck! ("再贪下一更！")
  const handlePushGreedNextWatch = () => {
    sound.playTap();
    const suddenDeathPct = computeSuddenDeathRiskPercent(incenseLeft, watchTurn);
    if (Math.random() * 100 < suddenDeathPct) {
      triggerConfiscation(
        unbankedSilverWan,
        peakWanted,
        relicIds.length,
        {
          zh: '贪心晚撤一步 · 太上皇驾崩抄家',
          en: 'One Turn Too Greedy · Emperor Died',
        },
        {
          zh: `你执意再摸最后一更，不料子时刚过乾清宫白幡骤起！九门瞬间落锁，后门乌篷船被铁索截断，${formatSilver(unbankedSilverWan, 'zh')} 现银尽归新皇！`,
          en: `You pushed for one more watch—and the Old Emperor died at midnight! Iron chains blocked the canal and all ${formatSilver(unbankedSilverWan, 'en')} was seized!`,
        },
        {
          zh: `「退游差评！！明明已经揣了 ${formatSilver(unbankedSilverWan, 'zh')} 非要手贱再摸一把，你跌倒新皇吃饱，我真是个纯种大冤种！」`,
          en: `"Rage quit!! Had ${formatSilver(unbankedSilverWan, 'en')} ready on the dock and got greedy for one more turn!"`,
        }
      );
      return;
    }

    const nextWatch = watchTurn + 1;
    setWatchTurn(nextWatch);
    setGreedStreakMult((m) => Math.round((m + 0.55) * 100) / 100);
    setPickedIds([]);
    setComboLogs([]);
    setHand(drawHandCards(relicIds, maxRelicSlots, 5));
    setSubPhase('picking');
  };

  const triggerConfiscation = (
    lostSilverWan: number,
    peakW: number,
    rCount: number,
    causeTitle: { zh: string; en: string },
    epitaph: { zh: string; en: string },
    earthReviewMeme: { zh: string; en: string }
  ) => {
    sound.playConfiscatedCrash();
    // Lv.3 Estate Nanmu Palace secretly rescues 20% even on confiscation!
    const rescuedWan = profile.estateLevel >= 3 ? Math.round(lostSilverWan * 0.2 * 10) / 10 : 0;
    const unlocked = new Set(profile.unlockedAchievements);
    if (lostSilverWan >= 1500) unlocked.add('ach_greedy_fall');

    const nextProfile: PersistentProfile = {
      ...profile,
      vaultSilverWan: Math.round((profile.vaultSilverWan + rescuedWan) * 10) / 10,
      unlockedAchievements: Array.from(unlocked),
    };
    syncProfile(nextProfile);

    const res: RunOutcome = {
      escaped: false,
      lordId: selectedLord.id,
      watchesSurvived: watchTurn,
      silverExtractedWan: rescuedWan,
      silverConfiscatedWan: lostSilverWan,
      peakWanted: peakW,
      relicCount: rCount,
      causeTitle,
      epitaph,
      earthReviewMeme,
      rankPercentile: Math.min(82, Math.max(12, 18 + watchTurn * 7.5)),
      canRewind: lastSafeSnapshot !== null,
    };
    setOutcome(res);
    setPhase('outcome');
    renderBattlePosterDataUrl(res, nextProfile, lang).then(setPosterUrl).catch(() => {});
  };

  // Time-Rewind Pill Rescue!
  const handleUseRewindPill = () => {
    if (!lastSafeSnapshot) return;
    if (!isPro && profile.freeRewindPills <= 0) {
      setVaultTab('pro');
      setVaultModalOpen(true);
      return;
    }
    sound.playCashOutGong();
    if (!isPro) {
      syncProfile({
        ...profile,
        freeRewindPills: Math.max(0, profile.freeRewindPills - 1),
      });
    }
    setWatchTurn(lastSafeSnapshot.watchTurn);
    setIncenseLeft(Math.max(18, lastSafeSnapshot.incenseLeft));
    setWantedStars(Math.max(0, lastSafeSnapshot.wantedStars - 1));
    setUnbankedSilverWan(lastSafeSnapshot.unbankedSilverWan);
    setGreedStreakMult(lastSafeSnapshot.greedStreakMult);
    setRelicIds(lastSafeSnapshot.relicIds);
    setItems(lastSafeSnapshot.items);
    setHistoryTitles(lastSafeSnapshot.historyTitles);
    setOutcome(null);
    setSubPhase('cashout_prompt');
    setPhase('desk');
  };

  // Share Poster & Reward Free Pill (Friendly F2P viral loop!)
  const handleDownloadOrSharePoster = () => {
    sound.playTap();
    if (posterUrl) {
      const a = document.createElement('a');
      a.href = posterUrl;
      a.download = `见好就收战报_${profile.playerUid}.png`;
      a.click();
    }
    if (!shareBonusClaimedThisRun) {
      setShareBonusClaimedThisRun(true);
      syncProfile({
        ...profile,
        freeRewindPills: profile.freeRewindPills + 1,
        freeExcuseLeftToday: profile.freeExcuseLeftToday + 2,
      });
    }
  };

  const suddenRiskPct = computeSuddenDeathRiskPercent(incenseLeft, watchTurn);

  return (
    <div className="min-h-dvh w-full bg-[#080504] text-amber-50 flex flex-col">
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#0D0806]/92 backdrop-blur-md border-b border-amber-500/20 px-3 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => setPhase('lobby')}
            className="flex items-center gap-2 text-left cursor-pointer"
          >
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-700 text-black font-extrabold flex items-center justify-center text-sm shadow">
              贪
            </span>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-amber-200 leading-tight">
                {lang === 'zh' ? '见好就收：大内第一贪' : 'Royal Heist: Cash Out'}
              </div>
              <div className="text-[10px] text-stone-400 hidden sm:block">
                {lang === 'zh' ? '朝堂账房搜打撤 × 权财倍率赌桌' : 'Courtroom Extraction Deckbuilder'}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                sound.playTap();
                setStreamerMode((s) => !s);
              }}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                streamerMode
                  ? 'bg-red-600/30 border-red-400 text-red-200'
                  : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}
              title="主播弹幕公投模式"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'zh' ? '主播公投' : 'Stream'}</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setVaultTab('estates');
                setVaultModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-stone-900 border border-amber-500/35 text-[11px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{formatSilver(profile.vaultSilverWan, lang)}</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setVaultTab('pro');
                setVaultModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{IS_PURE_PLATFORM_MODE ? '存档' : isPro ? '总管Pro' : '金手指'}</span>
            </button>

            <button
              onClick={() => setLang((l) => (l === 'zh' ? 'en' : 'zh'))}
              className="p-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-300 cursor-pointer"
              title="切换中英文"
            >
              <Languages className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setMuted(sound.toggleMute())}
              className="p-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-300 cursor-pointer"
              title="音效开关"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ==================== PHASE 1: LOBBY ==================== */}
      {phase === 'lobby' && (
        <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 py-4 space-y-4">
          {/* Hero Vault Desk Banner */}
          <div className="relative rounded-2xl overflow-hidden gold-border-glow">
            <img
              src="./assets/bg_vault_desk.webp"
              alt="Imperial Secret Vault Desk"
              className="w-full h-48 sm:h-60 object-cover object-center brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090605] via-[#090605]/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/85 text-white text-[11px] font-bold">
                <Flame className="w-3.5 h-3.5" />
                <span>
                  {lang === 'zh'
                    ? '懂哥处刑台：太上皇仅剩一口气，全网仅 7.4% 玩家活着把银子运下江南！'
                    : 'Only 7.4% of players extract their silver before the Old Emperor dies!'}
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold font-serif-cn text-amber-100">
                {lang === 'zh'
                  ? '再摸一把冲八亿两，还是趁夜装船金蝉脱壳？'
                  : 'Skim One Last Fortune, or Escape Before Confiscation?'}
              </h1>
              <p className="text-xs text-stone-300 max-w-2xl">
                {lang === 'zh'
                  ? '凑权术红颜羁绊让算盘倍率暴涨 → 在钦差查账生死轮盘里出千忽悠 → 赶在龙涎香断灭抄家前见好就收！三大名角全免费开放：'
                  : 'Chain Consort & Seal multipliers, bluff Inquisitors in Snap Audit Roulette, and extract to your canal boat before the incense dies!'}
              </p>
            </div>
          </div>

          {/* 3 Free Playable Lords Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {LORDS.map((lord) => (
              <div
                key={lord.id}
                className="rounded-2xl wood-panel p-4 flex flex-col justify-between gap-3 hover:border-amber-400/70 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={lord.avatar}
                      alt={tText(lord.name, lang)}
                      className="w-16 h-16 rounded-xl object-cover border border-amber-400/50 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {lord.earthUid}
                      </span>
                      <h2 className="text-base font-extrabold text-amber-100 mt-1 truncate">
                        {tText(lord.name, lang)}
                      </h2>
                      <p className="text-[11px] text-stone-400 truncate">{tText(lord.title, lang)}</p>
                    </div>
                  </div>

                  <p className="text-xs italic text-amber-200/85 bg-black/40 rounded-lg p-2.5 border border-stone-800">
                    {tText(lord.quote, lang)}
                  </p>

                  <div className="text-xs space-y-1">
                    <div className="font-bold text-emerald-300">{tText(lord.passiveName, lang)}</div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      {tText(lord.passiveDesc, lang)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {lord.debuffs.map((d, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/50"
                      >
                        ⚠️ {tText(d, lang)}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => startHeistRun(lord)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-black font-extrabold text-sm shadow-lg cursor-pointer active:scale-98 transition"
                >
                  {lang === 'zh'
                    ? `升堂入席 · 全服撤离率 ${lord.globalEscapeRate}%`
                    : `Enter Vault · ${lord.globalEscapeRate}% Win Rate`}
                </button>
              </div>
            ))}
          </div>

          {/* Estate Progress Strip */}
          <div className="rounded-xl wood-panel p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-stone-300">
                  {lang === 'zh' ? '当前永久宅邸：' : 'Current Estate: '}
                </span>
                <b className="text-amber-300">{tText(ESTATES[profile.estateLevel].name, lang)}</b>
                <span className="text-stone-400 ml-2">
                  ({tText(ESTATES[profile.estateLevel].perkDesc, lang)})
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setVaultTab('estates');
                setVaultModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold cursor-pointer"
            >
              {lang === 'zh' ? '置办江南大宅 / 查史官暗语 →' : 'Upgrade Estate & Medals →'}
            </button>
          </div>
        </main>
      )}

      {/* ==================== PHASE 2: VAULT TABLETOP ==================== */}
      {phase === 'desk' && (
        <main className="flex-1 max-w-4xl w-full mx-auto px-3 py-3 flex flex-col justify-between gap-3">
          {/* Top Vital Gauges: Dragon Incense + GTA 5-Star Wanted */}
          <div className="rounded-2xl wood-panel p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={selectedLord.avatar}
                  alt="Lord"
                  className="w-9 h-9 rounded-lg object-cover border border-amber-400/50"
                />
                <div>
                  <div className="font-bold text-amber-100">
                    {tText(selectedLord.name, lang)} ·{' '}
                    <span className="text-amber-400">
                      {lang === 'zh' ? `第 ${watchTurn} 更天` : `Watch #${watchTurn}`}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {lang === 'zh'
                      ? `贪婪连击加成：+${greedStreakMult.toFixed(2)}x`
                      : `Greed Streak Bonus: +${greedStreakMult.toFixed(2)}x`}
                  </div>
                </div>
              </div>

              {/* GTA 5-Star Wanted Meter */}
              <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-xl border border-stone-800">
                <span className="text-[11px] text-stone-400">
                  {lang === 'zh' ? '锦衣卫警戒' : 'Wanted'}
                </span>
                <div className="flex items-center gap-0.5 text-base leading-none">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={
                        wantedStars >= star - 0.25
                          ? 'text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                          : 'text-stone-700'
                      }
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-xs font-mono text-red-300">{wantedStars.toFixed(1)}</span>
              </div>
            </div>

            {/* Burning Dragon Incense Stick */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-200 font-semibold flex items-center gap-1">
                  🕯️ {lang === 'zh' ? '太上皇寿元龙涎香' : 'Old Emperor Life Incense'} ({incenseLeft}%)
                </span>
                <span
                  className={`font-bold ${
                    suddenRiskPct >= 35 ? 'text-red-400 animate-pulse' : 'text-stone-400'
                  }`}
                >
                  {lang === 'zh'
                    ? `下更断香驾崩风险：${suddenRiskPct}%`
                    : `Next Watch Collapse Risk: ${suddenRiskPct}%`}
                </span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-stone-900 border border-stone-800 overflow-visible">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-stone-600 via-amber-600 to-orange-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(3, incenseLeft))}%` }}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-orange-400 animate-ember"
                  style={{ left: `calc(${Math.min(98, Math.max(2, incenseLeft))}% - 7px)` }}
                />
              </div>
            </div>
          </div>

          {/* Center Rosewood Desk Scene + Unbanked Stash + Active Consorts/Relics */}
          <div className="relative rounded-2xl overflow-hidden gold-border-glow min-h-[210px] flex flex-col justify-between p-3.5">
            <img
              src="./assets/bg_vault_desk.webp"
              alt="Vault Desk"
              className="absolute inset-0 w-full h-full object-cover brightness-50"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/85" />

            {/* Active Relics & Consorts Shelf (Balatro Joker Bar!) */}
            <div className="relative z-10 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono text-amber-300/80 mr-1">
                {lang === 'zh'
                  ? `后宅红颜&权印 (${relicIds.length}/${maxRelicSlots}):`
                  : `Synergy Slots (${relicIds.length}/${maxRelicSlots}):`}
              </span>
              {relicIds.map((rid) => {
                const r = RELICS_AND_CONSORTS[rid];
                if (!r) return null;
                return (
                  <div
                    key={rid}
                    title={tText(r.desc, lang)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 backdrop-blur-md ${
                      r.kind === 'consort'
                        ? 'bg-rose-950/75 border-rose-400/50 text-rose-200'
                        : 'bg-amber-950/75 border-amber-400/50 text-amber-200'
                    }`}
                  >
                    <span>{r.kind === 'consort' ? '🌸' : '🏺'}</span>
                    <span>{tText(r.name, lang)}</span>
                  </div>
                );
              })}
            </div>

            {/* Live Abacus Combo Feed */}
            {comboLogs.length > 0 && (
              <div className="relative z-10 my-2 flex flex-wrap gap-1.5">
                {comboLogs.map((log, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/60 text-xs font-extrabold text-amber-200 shadow"
                  >
                    ⚡ {log.label} → {log.multAfter}x
                  </span>
                ))}
              </div>
            )}

            {/* Unbanked Stash Display */}
            <div className="relative z-10 flex items-end justify-between gap-2 pt-2">
              <div>
                <div className="text-[11px] text-amber-200/80">
                  {lang === 'zh'
                    ? '📦 桌底暗格未转移现银（断香即全爆清零！）'
                    : '📦 Unbanked Cellar Silver (Lost if Confiscated!)'}
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-tight drop-shadow">
                  {formatSilver(unbankedSilverWan, lang)}
                </div>
              </div>

              {/* Quick Inventory Badges */}
              <div className="flex items-center gap-1.5 text-[11px] bg-black/65 px-2.5 py-1.5 rounded-xl border border-stone-700">
                <span title="西洋窥镜">🔭{items.spyglass}</span>
                <span title="替死鬼门客">🎭{items.scapegoat}</span>
                <span title="东珠封口茶">🍵{items.bribe_tea}</span>
                <span title="重洗骰子">🎲{items.loaded_dice}</span>
              </div>
            </div>
          </div>

          {/* SUBPHASE A: PICK UP TO 3 CARDS */}
          {subPhase === 'picking' && (
            <div className="space-y-3">
              {/* Pre-Action Risk/Reward Bar */}
              <div className="rounded-xl bg-stone-950/90 border border-stone-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                {previewCalc ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-emerald-400 font-bold">
                      预计本更入账：+{formatSilver(previewCalc.gainedSilverWan, lang)}
                    </span>
                    <span className="text-amber-300">
                      香火变化：{previewCalc.nextIncense}%
                    </span>
                    <span className="text-red-300">
                      警戒变化：{previewCalc.nextWanted.toFixed(1)}★
                    </span>
                  </div>
                ) : (
                  <span className="text-stone-400">
                    {lang === 'zh'
                      ? '👇 请从门房呈上的肥差/红颜/狂野牌中挑选 1～3 张拍上算盘结算：'
                      : '👇 Select 1 to 3 cards below to slam onto your abacus:'}
                  </span>
                )}

                <button
                  disabled={items.loaded_dice <= 0}
                  onClick={handleRerollHand}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'zh' ? `重洗牌桌 (${items.loaded_dice})` : `Reroll (${items.loaded_dice})`}
                  </span>
                </button>
              </div>

              {/* 5-Card Hand */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {hand.map((card) => {
                  const selected = pickedIds.includes(card.id);
                  const badgeStyle =
                    card.category === 'wild'
                      ? 'border-red-500/60 bg-gradient-to-b from-red-950/55 to-[#140908]'
                      : card.category === 'consort'
                      ? 'border-rose-400/60 bg-gradient-to-b from-rose-950/50 to-[#14090C]'
                      : card.category === 'relic'
                      ? 'border-purple-400/60 bg-gradient-to-b from-purple-950/45 to-[#110916]'
                      : card.category === 'cover'
                      ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/45 to-[#08130E]'
                      : 'border-amber-500/40 bg-gradient-to-b from-[#23160E] to-[#120B08]';

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => togglePickCard(card.id)}
                      className={`text-left rounded-xl p-3 border transition-all flex flex-col justify-between gap-2 cursor-pointer ${badgeStyle} ${
                        selected
                          ? 'ring-2 ring-amber-400 -translate-y-1.5 shadow-[0_8px_24px_rgba(245,158,11,0.3)]'
                          : 'hover:border-amber-300/70'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/50 text-amber-200">
                            {card.category === 'wild'
                              ? '狂野掀桌'
                              : card.category === 'consort'
                              ? '绝色红颜'
                              : card.category === 'relic'
                              ? '镇宅神印'
                              : card.category === 'cover'
                              ? '化险消星'
                              : '肥差敛财'}
                          </span>
                          {selected && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400 text-black">
                              已盖印
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-extrabold text-amber-50 leading-snug">
                          {tText(card.name, lang)}
                        </div>
                        <p className="text-[11px] text-stone-300 leading-snug">
                          {tText(card.subtitle, lang)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between text-[10px] font-mono gap-1">
                        <span className="text-amber-300 font-bold">+{card.baseSilverWan}万</span>
                        <span className="text-sky-300">+{card.multAdd}x</span>
                        <span className={card.wantedDelta > 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {card.wantedDelta > 0 ? `+${card.wantedDelta}★` : `${card.wantedDelta}★`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={pickedIds.length === 0}
                onClick={handleExecuteWatch}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-110 disabled:opacity-40 text-black font-extrabold text-base shadow-xl cursor-pointer transition"
              >
                {lang === 'zh'
                  ? `🧮 算盘落子 · 结算已选 (${pickedIds.length}/3 张)`
                  : `🧮 Slam Abacus · Resolve (${pickedIds.length}/3 Cards)`}
              </button>
            </div>
          )}

          {/* SUBPHASE B: RESOLVING ANIMATION */}
          {subPhase === 'resolving' && (
            <div className="rounded-2xl wood-panel p-6 text-center space-y-2">
              <div className="text-base font-bold text-amber-300 animate-pulse">
                {lang === 'zh' ? '噼里啪啦——紫金算盘飞速拨算纹银中…' : 'Calculating Synergies & Silver Ingots...'}
              </div>
            </div>
          )}

          {/* SUBPHASE C: EXTRACTION CASH-OUT VS PUSH GREED! */}
          {subPhase === 'cashout_prompt' && (
            <div className="rounded-2xl gold-border-glow bg-[#160D09] p-4 space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <span>
                      {lang === 'zh'
                        ? `第 ${watchTurn} 更摸金完毕！后门乌篷船已备妥，管家颤声请示：`
                        : `Watch #${watchTurn} Complete! Your canal boat awaits at the secret dock:`}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-1">
                    {lang === 'zh'
                      ? `现在收手可 100% 安全带走 ${formatSilver(unbankedSilverWan, lang)}；若再贪下一更，全局倍率再涨 +0.55x，但需硬扛 ${suddenRiskPct}% 断香抄家风险！`
                      : `Extract now to bank ${formatSilver(unbankedSilverWan, lang)} safely, or risk a ${suddenRiskPct}% collapse for +0.55x more multiplier!`}
                  </p>
                </div>
                {streamerMode && (
                  <span className="px-2.5 py-1 rounded-lg bg-red-600/30 border border-red-400 text-xs font-extrabold text-red-200 shrink-0">
                    🎥 弹幕扣1撤 / 扣2贪
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleCashOutEscape}
                  className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Sailboat className="w-5 h-5" />
                  <span>
                    {streamerMode ? '【扣1】' : ''}
                    {lang === 'zh'
                      ? `见好就收 · 带 ${formatSilver(unbankedSilverWan, lang)} 登船撤离！`
                      : `CASH OUT · Bank ${formatSilver(unbankedSilverWan, lang)} Safely!`}
                  </span>
                </button>

                <button
                  onClick={handlePushGreedNextWatch}
                  className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:brightness-110 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Flame className="w-5 h-5" />
                  <span>
                    {streamerMode ? '【扣2】' : ''}
                    {lang === 'zh'
                      ? `富贵险中求 · 再贪下一更 (+0.55x / ${suddenRiskPct}%断香)`
                      : `PUSH LUCK · Next Watch (+0.55x / ${suddenRiskPct}% Risk)`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ==================== PHASE 3: OUTCOME & VIRAL POSTER ==================== */}
      {phase === 'outcome' && outcome && (
        <main className="flex-1 max-w-2xl w-full mx-auto px-3.5 py-5 space-y-4">
          <div
            className={`rounded-2xl p-5 space-y-4 ${
              outcome.escaped ? 'wood-panel gold-border-glow' : 'bg-[#160808] crimson-danger-glow'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`px-2.5 py-1 rounded-md text-xs font-extrabold ${
                  outcome.escaped ? 'bg-amber-400 text-black' : 'bg-red-600 text-white'
                }`}
              >
                {outcome.escaped
                  ? lang === 'zh'
                    ? '⛵ 金蝉脱壳 · 满载落袋'
                    : '⛵ CLEAN EXTRACTION'
                  : lang === 'zh'
                  ? '🚨 晚撤一秒 · 家产抄没'
                  : '🚨 CONFISCATED'}
              </span>
              <span className="text-xs text-stone-400">
                {lang === 'zh'
                  ? `击败全服 ${outcome.rankPercentile.toFixed(1)}% 玩家`
                  : `Beat ${outcome.rankPercentile.toFixed(1)}% of Players`}
              </span>
            </div>

            <h2 className="text-2xl font-extrabold font-serif-cn text-amber-100">
              {tText(outcome.causeTitle, lang)}
            </h2>

            <div className="rounded-xl bg-black/50 p-4 border border-white/10 text-center">
              <div className="text-xs text-stone-400">
                {outcome.escaped
                  ? lang === 'zh'
                    ? '本局成功洗白存入总金库'
                    : 'Silver Added to Permanent Vault'
                  : lang === 'zh'
                  ? '被新皇铁骑当场抄没现银'
                  : 'Unbanked Silver Seized by New Emperor'}
              </div>
              <div
                className={`text-4xl font-extrabold mt-1 ${
                  outcome.escaped ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {formatSilver(
                  outcome.escaped ? outcome.silverExtractedWan : outcome.silverConfiscatedWan,
                  lang
                )}
              </div>
              {!outcome.escaped && outcome.silverExtractedWan > 0 && (
                <div className="text-xs text-emerald-400 mt-1">
                  🛡️ 恭王府楠木夹墙暗格生效：秘密抢救回 {formatSilver(outcome.silverExtractedWan, lang)}！
                </div>
              )}
            </div>

            <p className="text-xs text-stone-200 leading-relaxed">{tText(outcome.epitaph, lang)}</p>
            <p className="text-xs italic text-amber-300/90 bg-black/35 p-3 rounded-xl border border-amber-500/20">
              {tText(outcome.earthReviewMeme, lang)}
            </p>

            {/* LOSS AVERSION TIME-REWIND RESCUE BUTTON! */}
            {!outcome.escaped && outcome.canRewind && (
              <div className="rounded-xl bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-950/80 border border-amber-400/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-amber-300">
                    💊 不甘心几千万两白白充公？吞服【假死金蝉丸】时光倒流回上一更码头！
                  </span>
                  <span className="text-[11px] text-amber-200 font-mono">
                    {isPro ? 'Pro 无限颗' : `剩余免费丸: ${profile.freeRewindPills}`}
                  </span>
                </div>
                <button
                  onClick={handleUseRewindPill}
                  className="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>
                    {isPro || profile.freeRewindPills > 0
                      ? `立即时光回溯 · 抢回 ${formatSilver(outcome.silverConfiscatedWan, lang)} 安全登船！`
                      : '解锁大内总管金手指 · 无限时光回溯悔棋'}
                  </span>
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleDownloadOrSharePoster}
                className="py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>
                  {shareBonusClaimedThisRun
                    ? lang === 'zh'
                      ? '保存 9:16 炫耀战报图（已领赠丸）'
                      : 'Download Battle Poster'
                    : lang === 'zh'
                    ? '保存晒图战报（免费领+1金蝉悔棋丸！）'
                    : 'Save Poster (+1 Free Rewind Pill!)'}
                </span>
              </button>

              <button
                onClick={() => startHeistRun(selectedLord)}
                className="py-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-500/35 text-amber-200 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{lang === 'zh' ? '再开一局 · 冲击八亿两神话' : 'Play Another Heist'}</span>
              </button>
            </div>

            {posterUrl && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] text-center text-stone-400">
                  {lang === 'zh'
                    ? '👇 已自动生成高清防盗战报长图（长按或点击上方按钮保存晒群）：'
                    : '👇 Generated Shareable Record Scroll:'}
                </div>
                <img
                  src={posterUrl}
                  alt="Shareable Battle Report"
                  className="w-full max-w-xs mx-auto rounded-xl border border-amber-500/30 shadow-xl"
                />
              </div>
            )}
          </div>
        </main>
      )}

      {/* Buckshot Roulette Snap Audit Modal */}
      {audit && (
        <AuditModal
          encounter={audit}
          unbankedSilverWan={unbankedSilverWan}
          items={items}
          isPro={isPro}
          freeExcuseLeft={profile.freeExcuseLeftToday}
          scapegoatArmed={scapegoatArmed}
          peekedIndex={peekedScrollIdx}
          streamerMode={streamerMode}
          lang={lang}
          onUseSpyglass={handleAuditSpyglass}
          onUseScapegoat={handleAuditScapegoat}
          onUseBribeTea={handleAuditBribeTea}
          onSubmitExcuse={handleAuditExcuse}
          onPickScroll={handleAuditPickScroll}
        />
      )}

      {/* Permanent Vault, Medals & God-Mode / Save Sync Modal */}
      <VaultModals
        isOpen={vaultModalOpen}
        initialTab={vaultTab}
        profile={profile}
        lang={lang}
        onClose={() => setVaultModalOpen(false)}
        onUpgradeEstate={(level, costWan) => {
          syncProfile({
            ...profile,
            estateLevel: level,
            vaultSilverWan: Math.max(0, Math.round((profile.vaultSilverWan - costWan) * 10) / 10),
          });
        }}
        onActivatePro={(token) => {
          syncProfile({
            ...profile,
            proLicenseToken: token,
            proActivatedAt: Date.now(),
            godModeConfig: {
              bonusStartSilverWan: true,
              slowIncense: true,
              extraRelicSlot: true,
            },
          });
        }}
        onToggleGodMode={(key) => {
          syncProfile({
            ...profile,
            godModeConfig: {
              ...profile.godModeConfig,
              [key]: !profile.godModeConfig[key],
            },
          });
        }}
        onRestoreProfile={(restored) => {
          syncProfile(restored);
        }}
      />
    </div>
  );
};

export default App;
