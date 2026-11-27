export type Lang = 'zh' | 'en';

export type LordId = 'heshen' | 'duke' | 'emperor';

export type CardCategory = 'graft' | 'wild' | 'consort' | 'relic' | 'cover';

export type CheatItemId = 'spyglass' | 'scapegoat' | 'bribe_tea' | 'loaded_dice';

export type InquisitorType = 'censor' | 'eunuch' | 'envoy';

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface LordProfile {
  id: LordId;
  name: LocalizedText;
  title: LocalizedText;
  earthUid: string;
  globalEscapeRate: number;
  avatar: string;
  quote: LocalizedText;
  passiveName: LocalizedText;
  passiveDesc: LocalizedText;
  startingIncense: number;
  startingWanted: number; // 0..5
  maxRelicSlots: number;
  startingItems: Record<CheatItemId, number>;
  startingRelicId: string;
  debuffs: LocalizedText[];
}

export interface RelicOrConsort {
  id: string;
  kind: 'consort' | 'relic';
  name: LocalizedText;
  badge: LocalizedText;
  desc: LocalizedText;
  avatar?: string;
  effectCode:
    | 'heshen_tribute'
    | 'duke_harmony'
    | 'emperor_edict'
    | 'princess_whip'
    | 'assassin_edge'
    | 'merchant_interest'
    | 'dancer_triple'
    | 'physician_incense'
    | 'gold_abacus'
    | 'yin_yang_ledger'
    | 'dying_decree'
    | 'tiger_tally';
}

export interface LootCard {
  id: string;
  category: CardCategory;
  name: LocalizedText;
  subtitle: LocalizedText;
  baseSilverWan: number; // in 万两 (10,000 taels)
  multAdd: number;       // e.g. +0.4 means +0.4x to turn mult
  multFactor?: number;   // e.g. 1.5 means *1.5x
  wantedDelta: number;   // -2 to +2.5 stars
  incenseDelta: number;  // negative burns faster, positive heals incense
  grantsRelicId?: string;
  grantsItemId?: CheatItemId;
  tag: 'salt' | 'tribute' | 'raid' | 'court' | 'beauty' | 'scheme';
}

export interface AuditScroll {
  index: number;
  isDeadly: boolean;
  revealed: boolean;
  label: LocalizedText;
}

export interface AuditEncounter {
  inquisitorType: InquisitorType;
  inquisitorName: LocalizedText;
  inquisitorRole: LocalizedText;
  accusation: LocalizedText;
  scrolls: AuditScroll[];
  excuseUsed: boolean;
  excuseFeedback?: LocalizedText;
}

export interface ComboStepLog {
  label: string;
  silverWanAfter: number;
  multAfter: number;
}

export interface RunSnapshot {
  watchTurn: number;
  incenseLeft: number;
  wantedStars: number;
  unbankedSilverWan: number;
  greedStreakMult: number;
  relicIds: string[];
  items: Record<CheatItemId, number>;
  historyTitles: string[];
}

export interface RunOutcome {
  escaped: boolean;
  lordId: LordId;
  watchesSurvived: number;
  silverExtractedWan: number;
  silverConfiscatedWan: number;
  peakWanted: number;
  relicCount: number;
  causeTitle: LocalizedText;
  epitaph: LocalizedText;
  earthReviewMeme: LocalizedText;
  rankPercentile: number;
  canRewind: boolean;
}

export interface EstateTier {
  id: string;
  level: number;
  name: LocalizedText;
  costWan: number;
  perkDesc: LocalizedText;
}

export interface AchievementDef {
  id: string;
  name: LocalizedText;
  clue: LocalizedText;
}

export interface PersistentProfile {
  version: number;
  playerUid: string;
  vaultSilverWan: number; // Safely extracted permanent silver (万两)
  estateLevel: number;    // 0..5
  totalRuns: number;
  totalEscapes: number;
  bestSingleRunWan: number;
  freeRewindPills: number;
  freeExcuseLeftToday: number;
  lastDailyReset: string;
  unlockedAchievements: string[];
  proLicenseToken: string | null;
  proActivatedAt: number | null;
  godModeConfig: {
    bonusStartSilverWan: boolean;
    slowIncense: boolean;
    extraRelicSlot: boolean;
  };
}
