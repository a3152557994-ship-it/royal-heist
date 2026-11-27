export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type MapId = 'salt_office' | 'heshen_manor' | 'forbidden_vault';

export interface Vec2 {
  x: number;
  y: number;
}

export interface RectWall {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'wall' | 'pillar' | 'screen' | 'secret_wall' | 'water';
  hp?: number; // for breakable secret_wall
  broken?: boolean;
  label?: string;
}

export interface TreasureDef {
  id: string;
  name: string;
  enName: string;
  rarity: Rarity;
  gridW: number;
  gridH: number;
  valueWan: number; // 万两
  weightKg: number;
  iconType:
    | 'silver_ingot'
    | 'pearl'
    | 'jade_ruyi'
    | 'porcelain_vase'
    | 'gold_abacus'
    | 'emerald_cabbage'
    | 'dragon_cup'
    | 'phoenix_crown'
    | 'gold_buddha'
    | 'imperial_seal'
    | 'guard_token'
    | 'secret_ledger';
}

export interface BagItem {
  uid: string;
  defId: string;
  gx: number;
  gy: number;
  rotated: boolean; // swaps gridW & gridH
}

export interface ChestEntity {
  id: string;
  x: number;
  y: number;
  tier: 'wood' | 'rosewood' | 'dragon_vault';
  searchSeconds: number;
  progress: number;
  opened: boolean;
  lootDefId: string; // pre-rolled so God-Mode X-Ray Vision can preview Mythic Reds through walls!
}

export interface DroppedLoot {
  uid: string;
  defId: string;
  x: number;
  y: number;
}

export type GuardState = 'patrol' | 'investigate' | 'chase' | 'stunned';

export interface GuardEntity {
  id: string;
  x: number;
  y: number;
  radius: number;
  angle: number;
  speed: number;
  visionRange: number;
  visionHalfAngle: number; // radians
  elite: boolean;
  state: GuardState;
  stateTimer: number;
  alertMeter: number; // 0..1
  waypoints: Vec2[];
  wpIndex: number;
  investigateTarget: Vec2 | null;
  attackCooldown: number;
}

export interface DistractionCoin {
  id: string;
  x: number;
  y: number;
  ttl: number;
}

export interface SmokeCloud {
  id: string;
  x: number;
  y: number;
  radius: number;
  ttl: number;
}

export interface FloatingPop {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  ttl: number;
  vy: number;
  scale?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface RaidMapConfig {
  id: MapId;
  name: string;
  subtitle: string;
  escapeRateLabel: string;
  durationSec: number;
  width: number;
  height: number;
  spawn: Vec2;
  extractZone: { x: number; y: number; radius: number };
  roomLabels: { x: number; y: number; text: string }[];
  walls: RectWall[];
  chests: Omit<ChestEntity, 'progress' | 'opened' | 'lootDefId'>[];
  guards: {
    elite: boolean;
    speed: number;
    visionRange: number;
    waypoints: Vec2[];
  }[];
}

export interface RaidSummary {
  escaped: boolean;
  mapId: MapId;
  mapName: string;
  timeUsedSec: number;
  totalValueWan: number;
  itemsExtracted: BagItem[];
  mythicCount: number;
  guardsKnockedOut: number;
  failReason?: string;
}

export interface RaiderProfile {
  version: number;
  playerUid: string;
  vaultSilverWan: number;
  totalRaids: number;
  totalEscapes: number;
  bestRaidWan: number;
  mythicsFound: number;
  freeRevivePills: number;
  upgrades: {
    bagLevel: number;   // 0: 4x4, 1: 5x4, 2: 5x5, 3: 6x5
    bootsLevel: number; // 0..3 (+speed & weight resist)
    armorLevel: number; // 0..3 (+max HP)
    gloveLevel: number; // 0..3 (+search speed & luck)
  };
  proLicenseToken: string | null;
  proActivatedAt: number | null;
  godMode: {
    xrayMythicVision: boolean;
    featherWeight: boolean;
    infiniteTools: boolean;
  };
}
