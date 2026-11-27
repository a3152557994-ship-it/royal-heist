import * as THREE from 'three';
import {
  BagItem,
  ChestEntity,
  GuardEntity,
  MapId,
  RaiderProfile,
  RaidMapConfig,
  RaidSummary,
  RectWall,
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
  findAutoFitSlot,
  getBagDimensions,
  rollTreasureForChest,
  TREASURES,
} from '../engine/lootCatalog';
import { sound } from '../audio/soundEngine';
import { createPalaceTextureBank, PalaceTextureBank } from './textures3d';
import {
  BrazierRig,
  ChestRig,
  createBrazierRig,
  createChestRig,
  createFoldingScreenMesh,
  createGuardRig,
  createPalacePillarMesh,
  createPalaceWallMesh,
  createPineTreeMesh,
  createRaiderRig,
  createSecretWallMesh,
  createWupengBoatRig,
  GuardRig,
  RaiderRig,
} from './models3d';

/** 1 meter in Three.js = 28px in raidMaps.ts coordinate space */
const WORLD_SCALE = 1 / 28;
const S = WORLD_SCALE;

const RARITY_HEX: Record<string, number> = {
  common: 0xd6d3d1,
  rare: 0x38bdf8,
  epic: 0xc084fc,
  legendary: 0xfbbf24,
  mythic: 0xf43f5e,
};

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  timeLeft: number;
  stamina: number;
  smokeCount: number;
  coinCount: number;
  backstabCd: number;
  infiniteTools: boolean;
  bagValueWan: number;
  bagWeightKg: number;
  bagItemCount: number;
  mythicCount: number;
  extractProgress: number;
  nearPrompt: string | null;
  alertCount: number;
  chestsOpened: number;
  chestsTotal: number;
  guardsKnockedOut: number;
  hasMoved: boolean;
  canAttackGuard: boolean;
  guideGoal: 'move' | 'loot' | 'extract';
}

export interface RaidSceneCallbacks {
  onHudUpdate?: (snap: HudSnapshot) => void;
  onLootAutoPacked?: (defId: string, bag: BagItem[]) => void;
  onBagOverflow?: (defId: string, bag: BagItem[]) => void;
  onDamageFlash?: () => void;
  onToast?: (msg: string, tone?: 'gold' | 'red' | 'cyan') => void;
  onNeedReviveOrFail?: (reason: string) => void;
  onFinishRaid?: (summary: RaidSummary) => void;
}

interface BurstParticle3D {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rotVx: number;
  rotVy: number;
  life: number;
  maxLife: number;
  gravity: number;
}

interface SmokeCloud3D {
  x: number;
  y: number;
  radius: number;
  ttl: number;
  maxTtl: number;
  group: THREE.Group;
  puffs: { sprite: THREE.Sprite; ox: number; oz: number; baseY: number; phase: number; baseScale: number }[];
}

interface CoinArc3D {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  flightT: number;
  landed: boolean;
  ttl: number;
  mesh: THREE.Mesh;
}

interface RippleRing3D {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
  maxScale: number;
}

interface GuardVisual {
  entity: GuardEntity;
  rig: GuardRig;
  coneMesh: THREE.Mesh;
  conePositions: Float32Array;
  coneColors: Float32Array;
  coneMat: THREE.MeshBasicMaterial;
  walkPhase: number;
}

interface ChestVisual {
  entity: ChestEntity;
  rig: ChestRig;
  lidAngle: number;
  beamAge: number;
}

const VISION_RAYS = 26;

export class RaidScene3D {
  private container: HTMLElement;
  private mode: 'lobby_preview' | 'playing';
  private mapConfig: RaidMapConfig;
  private profile: RaiderProfile;
  private isPro: boolean;
  private callbacks: RaidSceneCallbacks;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: PalaceTextureBank;

  private walls: RectWall[] = [];
  private secretWallMeshes = new Map<string, THREE.Group>();
  private chestVisuals: ChestVisual[] = [];
  private guardVisuals: GuardVisual[] = [];
  private braziers: BrazierRig[] = [];
  private boatGroup: THREE.Group | null = null;
  private extractRingMesh: THREE.Mesh | null = null;
  private fireflies: THREE.Points | null = null;
  private raiderRig: RaiderRig | null = null;

  // Intuitive 3D guidance & combat-clarity visuals (Click-to-Move beacon, 3D Compass Arrow, Attack Lock Ring)
  private moveTarget: Vec2 | null = null;
  private moveMarkerGroup: THREE.Group | null = null;
  private compassArrow: THREE.Mesh | null = null;
  private targetLockRing: THREE.Mesh | null = null;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private rayHitVec = new THREE.Vector3();
  private hasMoved = false;
  private canAttackGuard = false;
  private moveStuckTimer = 0;

  private particles: BurstParticle3D[] = [];
  private smokeClouds: SmokeCloud3D[] = [];
  private coins: CoinArc3D[] = [];
  private ripples: RippleRing3D[] = [];

  // Simulation state (playing mode)
  private player = {
    x: 0,
    y: 0,
    angle: -Math.PI / 2,
    hp: 3,
    maxHp: 3,
    stamina: 100,
    invulnTimer: 0,
    walkPhase: 0,
    slashTimer: 0,
    stepRippleCd: 0,
  };
  private bag: BagItem[] = [];
  private timeLeft = 90;
  private elapsed = 0;
  private smokeCount = 2;
  private coinCount = 3;
  private backstabCd = 0;
  private extractProgress = 0;
  private guardsKnockedOut = 0;
  private paused = false;
  private finished = false;
  private shakeIntensity = 0;
  private nearPrompt: string | null = null;

  // Input state
  private keys = new Set<string>();
  private joystickVec: Vec2 = { x: 0, y: 0 };
  private touchSprint = false;

  // Minimap canvas ref (optional)
  private minimapCtx: CanvasRenderingContext2D | null = null;

  // Loop management
  private rafId = 0;
  private lastTs = 0;
  private hudEmitAccum = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;
  private camCurrent = new THREE.Vector3();
  private camTarget = new THREE.Vector3();

  // Shared reusable VFX geometries & cached materials (zero per-burst GPU leaks!)
  private particleGeo = new THREE.BoxGeometry(0.18, 0.12, 0.28);
  private sparkGeo = new THREE.OctahedronGeometry(0.12, 0);
  private coinGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12);
  private coinMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    metalness: 0.9,
    roughness: 0.2,
  });
  private burstMatCache = new Map<string, THREE.MeshStandardMaterial>();
  private bagDims: { cols: number; rows: number };

  constructor(opts: {
    container: HTMLElement;
    mode: 'lobby_preview' | 'playing';
    mapId: MapId;
    profile: RaiderProfile;
    isPro: boolean;
    callbacks?: RaidSceneCallbacks;
  }) {
    this.container = opts.container;
    this.mode = opts.mode;
    this.mapConfig = RAID_MAPS[opts.mapId];
    this.profile = opts.profile;
    this.isPro = opts.isPro;
    this.callbacks = opts.callbacks || {};
    this.bagDims = getBagDimensions(
      opts.profile.upgrades.bagLevel,
      opts.isPro && opts.profile.godMode.infiniteTools
    );

    // WebGL Renderer with high-DPI cap, ACES Filmic tone mapping & soft shadows
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const rect = this.container.getBoundingClientRect();
    const initW = Math.max(320, rect.width || window.innerWidth);
    const initH = Math.max(240, rect.height || window.innerHeight);
    this.renderer.setSize(initW, initH);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // Scene & Moonlit Atmospheric Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090e18);
    this.scene.fog = new THREE.FogExp2(0x0a101d, 0.0095);

    this.camera = new THREE.PerspectiveCamera(44, initW / initH, 0.5, 160);
    this.textures = createPalaceTextureBank(this.renderer);

    this.setupLighting();
    this.buildPalaceWorld();
    this.initEntities();

    // Initial camera placement
    const spX = this.mapConfig.spawn.x * S;
    const spZ = this.mapConfig.spawn.y * S;
    if (this.mode === 'playing') {
      this.camCurrent.set(spX, 17.5, spZ + 14.5);
      this.camTarget.set(spX, 0.8, spZ - 1.2);
      this.camera.position.copy(this.camCurrent);
      this.camera.lookAt(this.camTarget);
    } else {
      const cx = (this.mapConfig.width * S) / 2;
      const cz = (this.mapConfig.height * S) * 0.55;
      this.camCurrent.set(cx + 16, 18.5, cz + 18);
      this.camTarget.set(cx, 1.0, cz - 4);
      this.camera.position.copy(this.camCurrent);
      this.camera.lookAt(this.camTarget);
    }

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    window.addEventListener('resize', this.handleResize);

    if (this.mode === 'playing') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      this.renderer.domElement.addEventListener('pointerdown', this.handleCanvasPointerDown);
      this.renderer.domElement.style.cursor = 'pointer';
      this.createGuidanceMeshes();
      this.emitHud();
    }

    this.lastTs = performance.now();
    this.loop(this.lastTs);
  }

  private handleResize = () => {
    if (this.disposed) return;
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(320, rect.width || window.innerWidth);
    const h = Math.max(240, rect.height || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (this.paused || this.finished) return;
    if (k === '1') this.useSmokeBomb();
    else if (k === '2') this.useSilverCoin();
    else if (k === '3' || k === ' ' || k === 'j') {
      e.preventDefault();
      this.useBackstab();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  /**
   * Click or tap anywhere on the 3D floor to walk there smoothly — OR tap a nearby guard directly to strike!
   */
  private handleCanvasPointerDown = (e: PointerEvent) => {
    if (this.paused || this.finished) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.rayHitVec);
    if (!hit) return;

    const wx = Math.max(92, Math.min(this.mapConfig.width - 92, this.rayHitVec.x / S));
    const wy = Math.max(92, Math.min(this.mapConfig.height - 68, this.rayHitVec.z / S));

    // Check if player tapped directly on a non-stunned guard!
    let clickedGuard: GuardEntity | null = null;
    for (const gv of this.guardVisuals) {
      const g = gv.entity;
      if (g.state === 'stunned') continue;
      if (Math.hypot(g.x - wx, g.y - wy) < 52) {
        clickedGuard = g;
        break;
      }
    }

    if (clickedGuard) {
      const distToGuard = Math.hypot(clickedGuard.x - this.player.x, clickedGuard.y - this.player.y);
      if (distToGuard <= 122) {
        this.player.angle = Math.atan2(clickedGuard.y - this.player.y, clickedGuard.x - this.player.x);
        this.moveTarget = null;
        this.useBackstab();
        return;
      }
      // Walk toward guard & tell player clearly when to strike
      this.callbacks.onToast?.('⚔️ 正在贴近侍卫，脚下亮红圈时点【攻击】即可一棒敲晕！', 'cyan');
    }

    this.moveTarget = { x: wx, y: wy };
    this.moveStuckTimer = 0;
    if (this.moveMarkerGroup) {
      this.moveMarkerGroup.position.set(wx * S, 0.1, wy * S);
      this.moveMarkerGroup.visible = true;
    }
    this.spawnRipple3D(wx, wy, 0xfbbf24, 1.8);
  };

  private createGuidanceMeshes() {
    // 1. Click-to-Move Glowing Golden Waypoint Marker
    const mg = new THREE.Group();
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.5, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    outerRing.rotation.x = -Math.PI / 2;
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 16),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      })
    );
    dot.rotation.x = -Math.PI / 2;
    mg.add(outerRing, dot);
    mg.visible = false;
    this.scene.add(mg);
    this.moveMarkerGroup = mg;

    // 2. 3D Floor Compass Chevron orbiting raider's feet (points to nearest chest OR escape boat!)
    const arrowShape = new THREE.ConeGeometry(0.24, 0.52, 3);
    arrowShape.rotateX(Math.PI / 2); // tip points along +Z
    this.compassArrow = new THREE.Mesh(
      arrowShape,
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
    );
    this.compassArrow.position.set(this.player.x * S, 0.18, this.player.y * S);
    this.scene.add(this.compassArrow);

    // 3. Blazing Crimson-Cyan Attack Lock Ring under the nearest strikeable guard!
    this.targetLockRing = new THREE.Mesh(
      new THREE.RingGeometry(0.76, 1.04, 32),
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.targetLockRing.rotation.x = -Math.PI / 2;
    this.targetLockRing.visible = false;
    this.scene.add(this.targetLockRing);
  }

  public setMinimapCanvas(canvas: HTMLCanvasElement | null) {
    this.minimapCtx = canvas ? canvas.getContext('2d') : null;
  }

  public setJoystick(dx: number, dy: number) {
    this.joystickVec.x = dx;
    this.joystickVec.y = dy;
  }

  public setTouchSprint(active: boolean) {
    this.touchSprint = active;
  }

  public setPaused(p: boolean) {
    this.paused = p;
    if (p) this.keys.clear();
  }

  /**
   * Synchronizes mid-raid profile / Pro license / God-Mode updates into the running 3D engine
   * while keeping bag dimensions monotonic (expanding cleanly, never shrinking occupied cells mid-raid!).
   */
  public syncProfile(nextProfile: RaiderProfile, nextIsPro: boolean) {
    this.profile = nextProfile;
    this.isPro = nextIsPro;

    const targetDims = getBagDimensions(
      nextProfile.upgrades.bagLevel,
      nextIsPro && nextProfile.godMode.infiniteTools
    );
    this.bagDims = {
      cols: Math.max(this.bagDims.cols, targetDims.cols),
      rows: Math.max(this.bagDims.rows, targetDims.rows),
    };

    const xrayOn = nextIsPro && nextProfile.godMode.xrayMythicVision;
    for (const cv of this.chestVisuals) {
      if (cv.entity.opened) {
        cv.rig.xrayBeacon.visible = false;
      } else {
        const def = TREASURES[cv.entity.lootDefId];
        cv.rig.xrayBeacon.visible = Boolean(
          xrayOn && (def?.rarity === 'mythic' || def?.rarity === 'legendary')
        );
      }
    }
    this.emitHud();
  }

  public updateBag(nextBag: BagItem[]) {
    this.bag = nextBag;
    this.updateLootSackVisual();
    this.emitHud();
  }

  public getBag(): BagItem[] {
    return this.bag;
  }

  public revivePlayer() {
    this.player.hp = this.player.maxHp;
    this.player.invulnTimer = 2.6;
    this.paused = false;
    this.finished = false;
    this.shakeIntensity = 0.5;

    // Push nearby guards back and briefly stun them so revive is fair!
    for (const gv of this.guardVisuals) {
      const d = Math.hypot(gv.entity.x - this.player.x, gv.entity.y - this.player.y);
      if (d < 240) {
        gv.entity.state = 'stunned';
        gv.entity.stateTimer = 4.5;
        gv.entity.alertMeter = 0;
      }
    }
    this.spawnBurst3D(this.player.x * S, 1.2, this.player.y * S, 0x34d399, 20, false);
    this.callbacks.onToast?.('💊 金蝉替身生效！周遭锦衣卫已被震晕，速撤！', 'cyan');
    this.emitHud();
  }

  public triggerFailSummary(reason: string) {
    if (this.finished) return;
    this.finished = true;
    const totals = computeBagTotals(this.bag);
    this.callbacks.onFinishRaid?.({
      escaped: false,
      mapId: this.mapConfig.id,
      mapName: this.mapConfig.name,
      timeUsedSec: Math.round(this.elapsed),
      totalValueWan: totals.totalValueWan,
      itemsExtracted: this.bag,
      mythicCount: totals.mythicCount,
      guardsKnockedOut: this.guardsKnockedOut,
      failReason: reason,
    });
  }

  private setupLighting() {
    const cx = (this.mapConfig.width * S) / 2;
    const cz = (this.mapConfig.height * S) / 2;

    // 1. Cool Moonlit Sky & Warm Courtyard Bounce Hemisphere
    const hemi = new THREE.HemisphereLight(0xa3cbfc, 0x452d1d, 1.65);
    this.scene.add(hemi);

    // 2. Primary Crisp Silver Moonlight Directional Light with Soft Shadows
    const moon = new THREE.DirectionalLight(0xd6e8ff, 2.15);
    moon.position.set(cx - 24, 38, cz + 20);
    moon.target.position.set(cx, 0, cz);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.near = 5;
    moon.shadow.camera.far = 115;
    const halfSpan = Math.max(this.mapConfig.width, this.mapConfig.height) * S * 0.62;
    moon.shadow.camera.left = -halfSpan;
    moon.shadow.camera.right = halfSpan;
    moon.shadow.camera.top = halfSpan;
    moon.shadow.camera.bottom = -halfSpan;
    moon.shadow.bias = -0.0008;
    this.scene.add(moon, moon.target);

    // 3. Subtle Warm Golden Rim Fill from North Imperial Vault
    const vaultGlow = new THREE.PointLight(0xffb84d, 14.5, 34, 1.35);
    vaultGlow.position.set(cx, 5.2, 230 * S);
    this.scene.add(vaultGlow);
  }

  private buildPalaceWorld() {
    const m = this.mapConfig;
    const worldW = m.width * S;
    const worldD = m.height * S;

    // 1. Vast Outer Night Ground surrounding the palace (no floating black void!)
    const outerGround = new THREE.Mesh(
      new THREE.PlaneGeometry(worldW + 90, worldD + 90),
      new THREE.MeshStandardMaterial({ color: 0x0b1119, roughness: 0.95 })
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.set(worldW / 2, -0.18, worldD / 2);
    outerGround.receiveShadow = true;
    this.scene.add(outerGround);

    // 2. Wet Moonlit Blue-Slate Flagstone Courtyard Floor (real seamless tile_courtyard.webp)
    const courtGeo = new THREE.PlaneGeometry(worldW, worldD);
    const courtMat = new THREE.MeshStandardMaterial({
      map: this.textures.courtyard,
      roughness: 0.56,
      metalness: 0.14,
      color: 0xcbd5e1,
    });
    const courtMesh = new THREE.Mesh(courtGeo, courtMat);
    courtMesh.rotation.x = -Math.PI / 2;
    courtMesh.position.set(worldW / 2, 0, worldD / 2);
    courtMesh.receiveShadow = true;
    this.scene.add(courtMesh);

    // 3. Imperial Crimson-Gold Brocade Carpet inside North Secret Vault + Side Rooms
    const secWall = m.walls.find((w) => w.kind === 'secret_wall');
    if (secWall) {
      const vaultW = (m.id === 'salt_office' ? 510 : m.id === 'heshen_manor' ? 670 : 830) * S;
      const vaultD = (secWall.y - 95) * S;
      const vaultCX = (secWall.x + secWall.w / 2) * S;
      const vaultCZ = (95 + (secWall.y - 95) / 2) * S;

      const carpetTex = this.textures.carpet.clone();
      carpetTex.needsUpdate = true;
      carpetTex.repeat.set(3, 2);

      const vaultCarpet = new THREE.Mesh(
        new THREE.PlaneGeometry(vaultW, vaultD),
        new THREE.MeshStandardMaterial({
          map: carpetTex,
          roughness: 0.65,
          color: 0xffffff,
          emissive: 0x3b120c,
          emissiveIntensity: 0.45,
        })
      );
      vaultCarpet.rotation.x = -Math.PI / 2;
      vaultCarpet.position.set(vaultCX, 0.03, vaultCZ);
      vaultCarpet.receiveShadow = true;
      this.scene.add(vaultCarpet);

      // Golden border frame around Vault Floor
      const borderMat = new THREE.MeshStandardMaterial({
        color: 0xd99b38,
        roughness: 0.35,
        metalness: 0.75,
      });
      const stripN = new THREE.Mesh(new THREE.BoxGeometry(vaultW, 0.05, 0.18), borderMat);
      stripN.position.set(vaultCX, 0.035, vaultCZ - vaultD / 2);
      this.scene.add(stripN);
    }

    // Center Hall Ceremonial Red Carpet Runner
    const runnerW = 6.2;
    const runnerD = 12.5;
    const runnerTex = this.textures.carpet.clone();
    runnerTex.needsUpdate = true;
    runnerTex.repeat.set(1, 2);
    const runner = new THREE.Mesh(
      new THREE.PlaneGeometry(runnerW, runnerD),
      new THREE.MeshStandardMaterial({
        map: runnerTex,
        roughness: 0.68,
        color: 0xffebd6,
        emissive: 0x2c0d09,
        emissiveIntensity: 0.38,
      })
    );
    runner.rotation.x = -Math.PI / 2;
    runner.position.set(worldW / 2, 0.025, worldD * 0.56);
    runner.receiveShadow = true;
    this.scene.add(runner);

    // 4. Shimmering South Canal Water Plane + Stone Embankment + Wooden Extraction Pier!
    const canalTopY = (m.id === 'salt_office' ? 980 : m.id === 'heshen_manor' ? 1130 : 1170) * S;
    const waterDepth = 26;
    const waterMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(worldW + 60, waterDepth),
      new THREE.MeshStandardMaterial({
        map: this.textures.water,
        roughness: 0.18,
        metalness: 0.52,
        color: 0x7cb0d8,
      })
    );
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(worldW / 2, 0.04, canalTopY + waterDepth / 2);
    waterMesh.receiveShadow = true;
    this.scene.add(waterMesh);

    // Carved Stone Embankment Lip along the North Edge of Canal
    const dockHalfW = 148 * S;
    const dockCX = m.extractZone.x * S;
    const dockCZ = (m.extractZone.y - 18) * S;
    const dockD = 6.4;

    const stoneMat = new THREE.MeshStandardMaterial({
      map: this.textures.marbleBase,
      roughness: 0.65,
    });
    const leftBankW = dockCX - dockHalfW - 40 * S;
    if (leftBankW > 0.5) {
      const lb = new THREE.Mesh(new THREE.BoxGeometry(leftBankW, 0.42, 0.7), stoneMat);
      lb.position.set(40 * S + leftBankW / 2, 0.21, canalTopY);
      lb.castShadow = true;
      lb.receiveShadow = true;
      this.scene.add(lb);
    }
    const rightBankStart = dockCX + dockHalfW;
    const rightBankW = (m.width - 40) * S - rightBankStart;
    if (rightBankW > 0.5) {
      const rb = new THREE.Mesh(new THREE.BoxGeometry(rightBankW, 0.42, 0.7), stoneMat);
      rb.position.set(rightBankStart + rightBankW / 2, 0.21, canalTopY);
      rb.castShadow = true;
      rb.receiveShadow = true;
      this.scene.add(rb);
    }

    // Wooden Pier Deck jutting out over the Canal for the Escape Boat
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(dockHalfW * 2, 0.28, dockD),
      new THREE.MeshStandardMaterial({
        map: this.textures.woodDeck,
        roughness: 0.78,
      })
    );
    pier.position.set(dockCX, 0.14, dockCZ);
    pier.receiveShadow = true;
    pier.castShadow = true;
    this.scene.add(pier);

    // Mooring Wooden Posts on Pier Corners
    const postMat = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.8 });
    for (const px of [-dockHalfW + 0.35, dockHalfW - 0.35]) {
      for (const pz of [-dockD / 2 + 0.4, dockD / 2 - 0.4]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 1.15, 8), postMat);
        post.position.set(dockCX + px, 0.55, dockCZ + pz);
        post.castShadow = true;
        this.scene.add(post);
      }
    }

    // Ornate Thin Glowing Emerald-Gold Extraction Ring on the Pier
    const ringRadius = m.extractZone.radius * S;
    this.extractRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(ringRadius * 0.88, ringRadius * 0.96, 40),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.extractRingMesh.rotation.x = -Math.PI / 2;
    this.extractRingMesh.position.set(m.extractZone.x * S, 0.31, m.extractZone.y * S);
    const innerExtractRing = new THREE.Mesh(
      new THREE.RingGeometry(ringRadius * 0.62, ringRadius * 0.66, 36),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.extractRingMesh.add(innerExtractRing);
    this.scene.add(this.extractRingMesh);

    // Moored 3D Wupeng Escape Boat bobbing snug against the wooden pier
    this.boatGroup = createWupengBoatRig(this.textures);
    this.boatGroup.position.set(dockCX, 0.08, dockCZ + dockD / 2 + 1.05);
    this.scene.add(this.boatGroup);

    // 5. Build All 3D Architecture from map walls (Walls, Screens, Pillars, Secret Wall)
    this.walls = m.walls.map((w) => ({ ...w }));
    for (const w of this.walls) {
      if (w.kind === 'water') continue; // water handled by unified shimmering canal plane
      const wx = (w.x + w.w / 2) * S;
      const wz = (w.y + w.h / 2) * S;
      const ww = w.w * S;
      const wd = w.h * S;

      let mesh: THREE.Group;
      if (w.kind === 'wall') {
        mesh = createPalaceWallMesh(ww, wd, this.textures);
      } else if (w.kind === 'screen') {
        mesh = createFoldingScreenMesh(ww, wd, this.textures);
      } else if (w.kind === 'pillar') {
        mesh = createPalacePillarMesh(ww, wd, this.textures);
      } else {
        mesh = createSecretWallMesh(ww, wd, this.textures);
        this.secretWallMeshes.set(w.id, mesh);
      }
      mesh.position.set(wx, 0, wz);
      this.scene.add(mesh);
    }

    // 6. Strategic Warm Bronze Braziers (placed cleanly at safe non-blocking architectural corners!)
    const brazierSpots: [number, number, boolean][] = [
      // Flanking the Pier Entrance
      [m.extractZone.x - 165, canalTopY / S - 36, true],
      [m.extractZone.x + 165, canalTopY / S - 36, true],
      // Flanking the Secret Vault Door
      ...(secWall
        ? ([
            [secWall.x - 28, secWall.y + 42, true],
            [secWall.x + secWall.w + 28, secWall.y + 42, true],
          ] as [number, number, boolean][])
        : []),
      // West & East Courtyard Ambient Fire Bowls (visual glow, no extra heavy lights)
      [130, 140, false],
      [m.width - 130, 140, false],
    ];

    for (const [bx, by, withLight] of brazierSpots) {
      const b = createBrazierRig(this.textures, withLight);
      b.root.position.set(bx * S, 0, by * S);
      this.scene.add(b.root);
      this.braziers.push(b);
    }

    // 7. Perimeter Moonlit Pine Trees outside the Outer Palace Walls (framing depth!)
    const treeCoords: [number, number, number][] = [
      [-60, 220, 1.1],
      [-75, 620, 1.3],
      [-55, 960, 0.95],
      [m.width + 65, 260, 1.2],
      [m.width + 80, 680, 1.05],
      [m.width + 60, 980, 1.25],
      [280, -65, 1.3],
      [m.width / 2, -80, 1.4],
      [m.width - 280, -65, 1.2],
    ];
    for (const [tx, ty, sc] of treeCoords) {
      const tree = createPineTreeMesh();
      tree.position.set(tx * S, 0, ty * S);
      tree.scale.setScalar(sc);
      this.scene.add(tree);
    }

    // 8. Atmospheric Drifting Midnight Fireflies / Gold Embers
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.random() * worldW;
      positions[i * 3 + 1] = 0.6 + Math.random() * 5.2;
      positions[i * 3 + 2] = Math.random() * worldD;
    }
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const ffMat = new THREE.PointsMaterial({
      color: 0xfde68a,
      map: this.textures.softGlow,
      size: 0.42,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.fireflies = new THREE.Points(ffGeo, ffMat);
    this.scene.add(this.fireflies);
  }

  private initEntities() {
    const m = this.mapConfig;
    const luckBonus = this.profile.upgrades.gloveLevel;

    // 1. Spawn 3D Treasure Chests
    this.chestVisuals = m.chests.map((c) => {
      const lootDefId = rollTreasureForChest(c.tier, luckBonus);
      const entity: ChestEntity = {
        ...c,
        progress: 0,
        opened: false,
        lootDefId,
      };
      const def = TREASURES[lootDefId];
      const rarityHex = RARITY_HEX[def?.rarity || 'common'] || 0xfbbf24;
      const rig = createChestRig(c.tier, rarityHex);
      rig.root.position.set(c.x * S, 0, c.y * S);

      // Face chests gracefully toward the south / courtyard center
      if (c.x < m.width * 0.35) rig.root.rotation.y = Math.PI * 0.16;
      else if (c.x > m.width * 0.65) rig.root.rotation.y = -Math.PI * 0.16;

      // Enable God-Mode X-Ray Mythic/Gold Beacons if active
      const xrayOn = this.isPro && this.profile.godMode.xrayMythicVision;
      if (xrayOn && (def?.rarity === 'mythic' || def?.rarity === 'legendary')) {
        rig.xrayBeacon.visible = true;
      }

      this.scene.add(rig.root);
      return { entity, rig, lidAngle: 0, beamAge: 0 };
    });

    // 2. Spawn Articulated 3D Guards with Real-Time Raycast-Clipped Vision Cones
    this.guardVisuals = m.guards.map((g, idx) => {
      const start = g.waypoints[0];
      const next = g.waypoints[1 % g.waypoints.length];
      const initAngle = Math.atan2(next.y - start.y, next.x - start.x);
      const entity: GuardEntity = {
        id: `guard_${idx}`,
        x: start.x,
        y: start.y,
        radius: 17,
        angle: initAngle,
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
      };

      // Give point lights to the first 3 guards to keep WebGL shader uniforms fast & crisp
      const rig = createGuardRig(this.textures, g.elite, idx < 3);
      rig.root.position.set(entity.x * S, 0, entity.y * S);
      rig.root.rotation.y = Math.atan2(Math.cos(initAngle), Math.sin(initAngle));
      this.scene.add(rig.root);

      // Dynamic 3D Fan Vision Cone Mesh with Smooth Radial Vertex-Color Light Falloff!
      const conePositions = new Float32Array(VISION_RAYS * 3 * 3);
      const coneColors = new Float32Array(VISION_RAYS * 3 * 3);
      const coneGeo = new THREE.BufferGeometry();
      coneGeo.setAttribute('position', new THREE.BufferAttribute(conePositions, 3));
      coneGeo.setAttribute('color', new THREE.BufferAttribute(coneColors, 3));
      const coneMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.frustumCulled = false;
      this.scene.add(coneMesh);

      const gv: GuardVisual = {
        entity,
        rig,
        coneMesh,
        conePositions,
        coneColors,
        coneMat,
        walkPhase: idx * 1.4,
      };
      this.updateGuardConeMesh(gv);
      return gv;
    });

    // 3. Spawn Night Raider Hero (in both playing mode & subtle courtyard stance in lobby preview)
    this.raiderRig = createRaiderRig(
      this.textures,
      this.profile.upgrades.armorLevel,
      this.profile.upgrades.bootsLevel
    );
    this.player.x = m.spawn.x;
    this.player.y = m.spawn.y;
    this.player.angle = -Math.PI / 2; // facing north toward palace!
    this.player.maxHp = 3 + this.profile.upgrades.armorLevel;
    this.player.hp = this.player.maxHp;
    this.timeLeft = m.durationSec;

    this.raiderRig.root.position.set(this.player.x * S, 0, this.player.y * S);
    this.raiderRig.root.rotation.y = Math.PI; // facing -Z (North)
    this.scene.add(this.raiderRig.root);
  }

  private updateGuardConeMesh(gv: GuardVisual) {
    const g = gv.entity;
    if (g.state === 'stunned') {
      gv.coneMesh.visible = false;
      return;
    }
    gv.coneMesh.visible = true;

    const pos = gv.conePositions;
    const col = gv.coneColors;
    const ox = g.x * S;
    const oz = g.y * S;
    const y = 0.08;
    const startAng = g.angle - g.visionHalfAngle;
    const stepAng = (g.visionHalfAngle * 2) / VISION_RAYS;

    // Bright warm lantern core -> softly feathered outer beam glow
    let cr = 1.0, cg = 0.76, cb = 0.28;
    if (g.state === 'chase') {
      cr = 1.0; cg = 0.16; cb = 0.26;
      gv.coneMat.opacity = 0.56;
    } else if (g.state === 'investigate' || g.alertMeter > 0.25) {
      cr = 1.0; cg = 0.55; cb = 0.12;
      gv.coneMat.opacity = 0.48;
    } else if (g.elite) {
      cr = 1.0; cg = 0.48; cb = 0.22;
      gv.coneMat.opacity = 0.4;
    } else {
      gv.coneMat.opacity = 0.36;
    }

    const outerFade = 0.14;
    let prev = castVisionRay({ x: g.x, y: g.y }, startAng, g.visionRange, this.walls);
    for (let i = 0; i < VISION_RAYS; i++) {
      const nextAng = startAng + stepAng * (i + 1);
      const curr = castVisionRay({ x: g.x, y: g.y }, nextAng, g.visionRange, this.walls);
      const base = i * 9;
      pos[base] = ox;
      pos[base + 1] = y;
      pos[base + 2] = oz;

      pos[base + 3] = prev.x * S;
      pos[base + 4] = y;
      pos[base + 5] = prev.y * S;

      pos[base + 6] = curr.x * S;
      pos[base + 7] = y;
      pos[base + 8] = curr.y * S;

      // Origin vertex bright, far arc vertices feathered smoothly into darkness
      col[base] = cr;
      col[base + 1] = cg;
      col[base + 2] = cb;

      const d1 = Math.min(1, Math.hypot(prev.x - g.x, prev.y - g.y) / g.visionRange);
      const f1 = Math.max(outerFade, 1 - d1 * 0.84);
      col[base + 3] = cr * f1;
      col[base + 4] = cg * f1;
      col[base + 5] = cb * f1;

      const d2 = Math.min(1, Math.hypot(curr.x - g.x, curr.y - g.y) / g.visionRange);
      const f2 = Math.max(outerFade, 1 - d2 * 0.84);
      col[base + 6] = cr * f2;
      col[base + 7] = cg * f2;
      col[base + 8] = cb * f2;

      prev = curr;
    }
    gv.coneMesh.geometry.attributes.position.needsUpdate = true;
    gv.coneMesh.geometry.attributes.color.needsUpdate = true;
  }

  private updateLootSackVisual() {
    if (!this.raiderRig) return;
    const totals = computeBagTotals(this.bag);
    const ratio = Math.min(1, totals.totalValueWan / 2600);
    const scale = 0.45 + ratio * 0.95;
    this.raiderRig.lootSack.scale.setScalar(scale);

    const sackMesh = this.raiderRig.lootSack.children[0] as THREE.Mesh;
    const mat = sackMesh.material as THREE.MeshStandardMaterial;
    if (totals.mythicCount > 0) {
      mat.color.setHex(0xb91c1c);
      mat.emissive.setHex(0x9f1239);
      mat.emissiveIntensity = 0.55;
    } else if (totals.totalValueWan >= 500) {
      mat.color.setHex(0xc28423);
      mat.emissive.setHex(0x6b3e07);
      mat.emissiveIntensity = 0.4;
    } else {
      mat.color.setHex(0x8f5b28);
      mat.emissive.setHex(0x2c1604);
      mat.emissiveIntensity = 0.25;
    }
  }

  // ==================== TACTILE PLAYER SKILLS ====================

  public useSmokeBomb() {
    if (this.paused || this.finished) return;
    const inf = this.isPro && this.profile.godMode.infiniteTools;
    if (!inf && this.smokeCount <= 0) {
      this.callbacks.onToast?.('迷魂烟已用尽！', 'red');
      return;
    }
    if (!inf) this.smokeCount -= 1;
    sound.playSmokeBomb();

    const group = new THREE.Group();
    const cx = this.player.x * S;
    const cz = this.player.y * S;
    group.position.set(cx, 0, cz);

    const puffs: SmokeCloud3D['puffs'] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + Math.random() * 0.4;
      const dist = i < 5 ? Math.random() * 0.7 : 0.9 + Math.random() * 1.9;
      const mat = new THREE.SpriteMaterial({
        map: this.textures.smokePuff,
        color: i % 3 === 0 ? 0xdbeafe : 0x94a3b8,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const ox = Math.cos(a) * dist;
      const oz = Math.sin(a) * dist;
      const baseY = 0.85 + Math.random() * 1.4;
      const baseScale = 2.6 + Math.random() * 1.8;
      sprite.position.set(ox, baseY, oz);
      sprite.scale.set(baseScale, baseScale, 1);
      group.add(sprite);
      puffs.push({ sprite, ox, oz, baseY, phase: Math.random() * Math.PI * 2, baseScale });
    }
    this.scene.add(group);
    this.smokeClouds.push({
      x: this.player.x,
      y: this.player.y,
      radius: 108,
      ttl: 6.5,
      maxTtl: 6.5,
      group,
      puffs,
    });
    this.spawnRipple3D(this.player.x, this.player.y, 0x94a3b8, 4.4);
    this.callbacks.onToast?.('💨 抛出迷魂烟！烟内可瞬间甩脱锦衣卫视线', 'cyan');
    this.emitHud();
  }

  public useSilverCoin() {
    if (this.paused || this.finished) return;
    const inf = this.isPro && this.profile.godMode.infiniteTools;
    if (!inf && this.coinCount <= 0) {
      this.callbacks.onToast?.('诱饵碎银已用尽！', 'red');
      return;
    }
    if (!inf) this.coinCount -= 1;
    sound.playCoinToss();

    const throwDist = 175;
    const rawTx = this.player.x + Math.cos(this.player.angle) * throwDist;
    const rawTy = this.player.y + Math.sin(this.player.angle) * throwDist;
    const clamped = resolveCircleWalls(
      {
        x: Math.max(70, Math.min(this.mapConfig.width - 70, rawTx)),
        y: Math.max(70, Math.min(this.mapConfig.height - 70, rawTy)),
      },
      14,
      this.walls
    );

    const mesh = new THREE.Mesh(this.coinGeo, this.coinMat);
    mesh.position.set(this.player.x * S, 1.3, this.player.y * S);
    this.scene.add(mesh);

    this.coins.push({
      id: `coin_${Date.now()}_${Math.random()}`,
      startX: this.player.x,
      startY: this.player.y,
      targetX: clamped.x,
      targetY: clamped.y,
      flightT: 0,
      landed: false,
      ttl: 5.5,
      mesh,
    });
    this.emitHud();
  }

  public useBackstab() {
    if (this.paused || this.finished) return;
    const inf = this.isPro && this.profile.godMode.infiniteTools;
    if (!inf && this.backstabCd > 0) return;

    this.moveTarget = null;
    if (this.moveMarkerGroup) this.moveMarkerGroup.visible = false;

    // Auto-aim snap toward nearest non-stunned guard within 122px so combat feels crisp & intuitive!
    let nearestTarget: GuardEntity | null = null;
    let nearestDist = 122;
    for (const gv of this.guardVisuals) {
      const g = gv.entity;
      if (g.state === 'stunned') continue;
      const d = Math.hypot(g.x - this.player.x, g.y - this.player.y);
      if (d <= nearestDist) {
        nearestDist = d;
        nearestTarget = g;
      }
    }
    if (nearestTarget) {
      this.player.angle = Math.atan2(nearestTarget.y - this.player.y, nearestTarget.x - this.player.x);
    }

    this.player.slashTimer = 0.3;
    sound.playBackstab();

    // Sub-stepped forward lunge (4×8.5px) so backstab can NEVER tunnel through thin walls or unbroken secret doors!
    let lx = this.player.x;
    let ly = this.player.y;
    const stepDx = (Math.cos(this.player.angle) * 34) / 4;
    const stepDy = (Math.sin(this.player.angle) * 34) / 4;
    for (let s = 0; s < 4; s++) {
      const stepped = resolveCircleWalls({ x: lx + stepDx, y: ly + stepDy }, 16, this.walls);
      lx = Math.max(92, Math.min(this.mapConfig.width - 92, stepped.x));
      ly = Math.max(92, Math.min(this.mapConfig.height - 68, stepped.y));
    }
    this.player.x = lx;
    this.player.y = ly;

    let knocked = 0;
    for (const gv of this.guardVisuals) {
      const g = gv.entity;
      if (g.state === 'stunned') continue;
      const dist = Math.hypot(g.x - this.player.x, g.y - this.player.y);
      if (dist <= 112) {
        g.state = 'stunned';
        g.stateTimer = 9.5;
        g.alertMeter = 0;
        knocked += 1;
        this.guardsKnockedOut += 1;
        this.spawnBurst3D(g.x * S, 1.3, g.y * S, 0x38bdf8, 22, false);
        this.spawnRipple3D(g.x, g.y, 0x38bdf8, 3.2);
      }
    }

    if (knocked > 0) {
      this.backstabCd = inf ? 0.45 : 3.0;
      this.shakeIntensity = 0.46;
      this.callbacks.onToast?.(`💥 攻击得手！一棒敲晕 ${knocked} 名锦衣卫 (9.5秒)`, 'cyan');
    } else {
      // Short whiff cooldown + crystal-clear player hint so nobody wonders "can I attack?"
      this.backstabCd = inf ? 0.35 : 0.9;
      this.callbacks.onToast?.('⚔️ 空挥！靠近锦衣卫（亮红圈时）按【攻击/Space】可一棒敲晕', 'gold');
    }
    this.emitHud();
  }

  // ==================== VFX HELPERS ====================

  private spawnBurst3D(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
    isWoodDebris: boolean
  ) {
    const cacheKey = `${colorHex}_${isWoodDebris ? 1 : 0}`;
    let mat = this.burstMatCache.get(cacheKey);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: isWoodDebris ? 0x3a1c06 : colorHex,
        emissiveIntensity: isWoodDebris ? 0.3 : 1.1,
        roughness: isWoodDebris ? 0.7 : 0.25,
      });
      this.burstMatCache.set(cacheKey, mat);
    }
    const geo = isWoodDebris ? this.particleGeo : this.sparkGeo;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.5, z + (Math.random() - 0.5) * 0.6);
      mesh.scale.setScalar(isWoodDebris ? 0.9 + Math.random() * 1.1 : 0.7 + Math.random() * 0.8);
      this.scene.add(mesh);

      const ang = Math.random() * Math.PI * 2;
      const spd = (isWoodDebris ? 2.5 : 1.8) + Math.random() * 4.5;
      this.particles.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: 3.5 + Math.random() * 4.5,
        vz: Math.sin(ang) * spd,
        rotVx: (Math.random() - 0.5) * 10,
        rotVy: (Math.random() - 0.5) * 10,
        life: 0,
        maxLife: isWoodDebris ? 1.15 : 0.75,
        gravity: isWoodDebris ? 14 : 9,
      });
    }
  }

  private spawnRipple3D(px: number, py: number, colorHex: number, maxScale: number) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.58, 28),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(px * S, 0.09, py * S);
    this.scene.add(mesh);
    this.ripples.push({ mesh, age: 0, maxAge: 0.75, maxScale });
  }

  // ==================== MAIN 60FPS SIMULATION & RENDER LOOP ====================

  private loop = (ts: number) => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    this.animateEnvironment(dt, ts * 0.001);

    if (this.mode === 'lobby_preview') {
      this.stepLobbyPreview(dt, ts * 0.001);
      this.stepVfx(dt);
    } else if (!this.paused && !this.finished) {
      this.stepGameplay(dt, ts * 0.001);
      this.stepVfx(dt);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.mode === 'playing' && this.minimapCtx) {
      this.renderMinimap(this.minimapCtx);
    }
  };

  private animateEnvironment(dt: number, t: number) {
    // Scroll shimmering dark canal water
    this.textures.water.offset.x = (t * 0.032) % 1;
    this.textures.water.offset.y = Math.sin(t * 0.55) * 0.025;

    // Gentle bobbing Wupeng Escape Boat
    if (this.boatGroup) {
      this.boatGroup.position.y = 0.08 + Math.sin(t * 2.1) * 0.09;
      this.boatGroup.rotation.z = Math.sin(t * 1.7) * 0.035;
      this.boatGroup.rotation.x = Math.cos(t * 1.3) * 0.02;
    }

    // Pulsing emerald extraction dock ring
    if (this.extractRingMesh) {
      const s = 0.96 + Math.sin(t * 3.4) * 0.05;
      this.extractRingMesh.scale.set(s, s, 1);
    }

    // Flickering Bronze Braziers
    for (let i = 0; i < this.braziers.length; i++) {
      const b = this.braziers[i];
      const f = 1 + Math.sin(t * 11 + i * 2.3) * 0.14 + Math.cos(t * 17 + i) * 0.08;
      b.flameOuter.scale.set(0.95 + (f - 1) * 0.4, f, 0.95 + (f - 1) * 0.4);
      b.flameInner.scale.set(1, f * 1.08, 1);
      b.glowSprite.scale.setScalar(3.0 * f);
      if (b.light) b.light.intensity = 9.0 * f;
    }

    // Drifting Midnight Fireflies
    if (this.fireflies) {
      const posAttr = this.fireflies.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += Math.sin(t * 0.6 + i) * dt * 0.35;
        arr[i + 1] += Math.cos(t * 0.9 + i * 0.5) * dt * 0.18;
      }
      posAttr.needsUpdate = true;
    }

    // Smoothly hinge open opened chests & animate soaring rarity pillars
    for (const cv of this.chestVisuals) {
      if (cv.entity.opened) {
        cv.lidAngle = THREE.MathUtils.lerp(cv.lidAngle, -1.95, Math.min(1, dt * 8));
        cv.rig.lidPivot.rotation.x = cv.lidAngle;
        cv.beamAge += dt;
        const beamMat = cv.rig.beamMesh.material as THREE.MeshBasicMaterial;
        const fade = Math.max(0.18, 0.68 - cv.beamAge * 0.09);
        beamMat.opacity = fade * (0.85 + Math.sin(t * 5) * 0.15);
        cv.rig.beamMesh.rotation.y += dt * 0.8;
      } else if (cv.rig.xrayBeacon.visible) {
        const xm = cv.rig.xrayBeacon.material as THREE.MeshBasicMaterial;
        xm.opacity = 0.25 + Math.sin(t * 4.5) * 0.15;
      }
    }
  }

  private stepLobbyPreview(dt: number, t: number) {
    // Patrol guards live in the 3D background of the Lobby so players see real gameplay immediately!
    for (const gv of this.guardVisuals) {
      const g = gv.entity;
      const target = g.waypoints[g.wpIndex];
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) {
        g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
      } else {
        const vx = (dx / dist) * g.speed * 0.85;
        const vy = (dy / dist) * g.speed * 0.85;
        const moved = resolveCircleWalls({ x: g.x + vx * dt, y: g.y + vy * dt }, g.radius, this.walls);
        g.x = moved.x;
        g.y = moved.y;
        g.angle = Math.atan2(vy, vx);
      }
      this.syncGuardRigPose(gv, dt, t, true);
      this.updateGuardConeMesh(gv);
    }

    // Subtle idle breathing on raider at pier
    if (this.raiderRig) {
      this.raiderRig.cape.rotation.x = 0.26 + Math.sin(t * 2.2) * 0.06;
      this.raiderRig.bodyGroup.position.y = Math.sin(t * 2.5) * 0.03;
    }

    // Cinematic gentle aerial sweep over the Moonlit Qing Palace Courtyard!
    const cx = (this.mapConfig.width * S) / 2;
    const cz = (this.mapConfig.height * S) * 0.56;
    const camX = cx + Math.sin(t * 0.18) * 12.5;
    const camZ = cz + 17.5 + Math.cos(t * 0.14) * 5.2;
    const camY = 16.5 + Math.sin(t * 0.22) * 1.4;
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(cx + Math.sin(t * 0.18) * 2.5, 0.8, cz - 5.5);
  }

  private stepGameplay(dt: number, t: number) {
    this.elapsed += dt;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.player.invulnTimer > 0) this.player.invulnTimer = Math.max(0, this.player.invulnTimer - dt);
    if (this.backstabCd > 0) this.backstabCd = Math.max(0, this.backstabCd - dt);
    if (this.player.slashTimer > 0) this.player.slashTimer = Math.max(0, this.player.slashTimer - dt);
    if (this.player.stepRippleCd > 0) this.player.stepRippleCd -= dt;

    if (this.timeLeft <= 0) {
      sound.playPlayerHit();
      this.triggerFailSummary('更鼓响彻王府，大内援兵封锁水门，撤离超时！');
      return;
    }

    // 1. Player Movement (Keyboard WASD/Arrows + Touch Virtual Joystick + Click/Tap-to-Move on 3D Floor!)
    let ix = this.joystickVec.x;
    let iy = this.joystickVec.y;
    if (this.keys.has('w') || this.keys.has('arrowup')) iy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) iy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) ix -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) ix += 1;

    const manualLen = Math.hypot(ix, iy);
    if (manualLen > 0.08) {
      // Manual keyboard/joystick cancels click-to-move waypoint cleanly
      this.moveTarget = null;
      if (this.moveMarkerGroup) this.moveMarkerGroup.visible = false;
    } else if (this.moveTarget) {
      const mdx = this.moveTarget.x - this.player.x;
      const mdy = this.moveTarget.y - this.player.y;
      const mdist = Math.hypot(mdx, mdy);
      if (mdist <= 14) {
        this.moveTarget = null;
        if (this.moveMarkerGroup) this.moveMarkerGroup.visible = false;
      } else {
        ix = mdx / mdist;
        iy = mdy / mdist;
      }
    }

    const len = Math.hypot(ix, iy);
    const moving = len > 0.08;
    const wantsSprint = (this.keys.has('shift') || this.touchSprint) && moving && this.player.stamina > 8;

    if (wantsSprint) {
      this.player.stamina = Math.max(0, this.player.stamina - dt * 34);
    } else {
      this.player.stamina = Math.min(100, this.player.stamina + dt * 22);
    }

    const totals = computeBagTotals(this.bag);
    const bootsBonus = 1 + this.profile.upgrades.bootsLevel * 0.14;
    const weightResist = 1 - this.profile.upgrades.bootsLevel * 0.22;
    const feather = this.isPro && this.profile.godMode.featherWeight;
    const encPenalty = feather ? 0 : Math.min(0.42, (totals.totalWeightKg / 36) * weightResist);
    const speed = 225 * bootsBonus * (1 - encPenalty) * (wantsSprint ? 1.42 : 1.0);

    if (moving) {
      const prevX = this.player.x;
      const prevY = this.player.y;
      const nx = ix / Math.max(1, len);
      const ny = iy / Math.max(1, len);
      const nextPos = resolveCircleWalls(
        { x: this.player.x + nx * speed * dt, y: this.player.y + ny * speed * dt },
        16,
        this.walls
      );
      this.player.x = Math.max(92, Math.min(this.mapConfig.width - 92, nextPos.x));
      this.player.y = Math.max(92, Math.min(this.mapConfig.height - 68, nextPos.y));
      this.player.angle = Math.atan2(ny, nx);

      if (!this.hasMoved && Math.hypot(this.player.x - this.mapConfig.spawn.x, this.player.y - this.mapConfig.spawn.y) > 36) {
        this.hasMoved = true;
      }
      // If click-to-move gets blocked against a wall for >0.45s, clear marker gracefully
      if (this.moveTarget) {
        if (Math.hypot(this.player.x - prevX, this.player.y - prevY) < speed * dt * 0.15) {
          this.moveStuckTimer += dt;
          if (this.moveStuckTimer > 0.45) {
            this.moveTarget = null;
            if (this.moveMarkerGroup) this.moveMarkerGroup.visible = false;
          }
        } else {
          this.moveStuckTimer = 0;
        }
      }

      // Sprint footsteps emit sound ripples & lure close guards!
      if (wantsSprint && this.player.stepRippleCd <= 0) {
        this.player.stepRippleCd = 0.34;
        this.spawnRipple3D(this.player.x, this.player.y, 0xfef08a, 2.6);
        for (const gv of this.guardVisuals) {
          const g = gv.entity;
          if (g.state === 'patrol' && Math.hypot(g.x - this.player.x, g.y - this.player.y) < 210) {
            g.state = 'investigate';
            g.stateTimer = 3.8;
            g.investigateTarget = { x: this.player.x, y: this.player.y };
          }
        }
      }
    }

    // 2. Sync Articulated 3D Raider Pose (Swinging Limbs, Fluttering Cape, Slash Arc)
    if (this.raiderRig) {
      const r = this.raiderRig;
      r.root.position.set(this.player.x * S, 0, this.player.y * S);
      // Map 2D angle (0=+X, +PI/2=+Z) to Three.js Y rotation (0=+Z, +PI/2=+X)
      const targetYaw = Math.atan2(Math.cos(this.player.angle), Math.sin(this.player.angle));
      let diff = targetYaw - r.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      r.root.rotation.y += diff * Math.min(1, dt * 15);

      if (moving) {
        this.player.walkPhase += dt * (wantsSprint ? 15 : 10.5);
        const sw = Math.sin(this.player.walkPhase) * (wantsSprint ? 0.72 : 0.48);
        r.leftLeg.rotation.x = sw;
        r.rightLeg.rotation.x = -sw;
        r.leftArm.rotation.x = -sw * 0.85;
        r.rightArm.rotation.x = sw * 0.85;
        r.bodyGroup.position.y = Math.abs(Math.sin(this.player.walkPhase)) * 0.1;
        r.cape.rotation.x = 0.45 + (wantsSprint ? 0.35 : 0.14) + Math.sin(this.player.walkPhase * 2) * 0.08;
      } else {
        r.leftLeg.rotation.x *= 0.82;
        r.rightLeg.rotation.x *= 0.82;
        r.leftArm.rotation.x *= 0.82;
        r.rightArm.rotation.x *= 0.82;
        r.bodyGroup.position.y = Math.sin(t * 2.8) * 0.025;
        r.cape.rotation.x = 0.22 + Math.sin(t * 2.2) * 0.05;
      }

      // Invulnerability flicker after damage
      r.bodyGroup.visible = this.player.invulnTimer <= 0 || Math.floor(t * 16) % 2 === 0;

      // Backstab Crescent Slash Arc animation
      const slashMat = r.slashArc.material as THREE.MeshBasicMaterial;
      if (this.player.slashTimer > 0) {
        const p = 1 - this.player.slashTimer / 0.28;
        slashMat.opacity = (1 - p) * 0.95;
        r.slashArc.rotation.z = -1.2 + p * 2.6;
        r.slashArc.scale.setScalar(0.9 + p * 0.55);
      } else {
        slashMat.opacity = 0;
      }
    }

    // 3. Interact: Breakable Nanmu Secret Vault Wall Prying
    let activeProgress01 = 0;
    this.nearPrompt = null;
    const gloveMult = 1 + this.profile.upgrades.gloveLevel * 0.35;

    for (const w of this.walls) {
      if (w.kind !== 'secret_wall' || w.broken) continue;
      const cx = w.x + w.w / 2;
      const cy = w.y + w.h / 2;
      const dist = Math.hypot(this.player.x - cx, this.player.y - cy);
      if (dist < Math.max(w.w, w.h) * 0.55 + 48) {
        w.hp = Math.max(0, (w.hp ?? 100) - dt * 62 * gloveMult);
        activeProgress01 = Math.max(activeProgress01, 1 - w.hp / 100);
        this.nearPrompt = `🔨 正在撬开【${w.label?.replace(/^🔨\s*/, '') || '楠木暗墙'}】 ${Math.round((1 - w.hp / 100) * 100)}%`;
        sound.playSearchTick(1 - w.hp / 100);

        const wallObj = this.secretWallMeshes.get(w.id);
        if (wallObj) {
          wallObj.position.x = cx * S + (Math.random() - 0.5) * 0.1;
          if (w.hp <= 0) {
            w.broken = true;
            this.scene.remove(wallObj);
            this.disposeObjectTree(wallObj);
            this.secretWallMeshes.delete(w.id);
            this.shakeIntensity = 0.58;
            sound.playLootReveal('legendary');
            this.spawnBurst3D(cx * S, 1.4, cy * S, 0xb45309, 24, true);
            this.spawnBurst3D(cx * S, 1.6, cy * S, 0xfde047, 16, false);
            this.callbacks.onToast?.('🔥 暗墙已破！秘库龙纹金柜就在眼前，快摸大红！', 'gold');
          }
        }
      }
    }

    // 4. Interact: Chest Lockpicking & Physical 3D Lid Opening + Rarity Pillar Burst
    for (const cv of this.chestVisuals) {
      const c = cv.entity;
      if (c.opened) continue;
      const dist = Math.hypot(this.player.x - c.x, this.player.y - c.y);
      if (dist < 64) {
        c.progress += (dt * gloveMult) / c.searchSeconds;
        activeProgress01 = Math.max(activeProgress01, Math.min(1, c.progress));
        const tierName =
          c.tier === 'dragon_vault' ? '龙纹金柜' : c.tier === 'rosewood' ? '紫檀古董箱' : '银钱木箱';
        this.nearPrompt = `🔓 正在撬锁【${tierName}】 ${Math.min(100, Math.round(c.progress * 100))}%`;
        sound.playSearchTick(c.progress);

        if (c.progress >= 1) {
          c.opened = true;
          c.progress = 1;
          cv.rig.innerGlow.visible = true;
          cv.rig.beamMesh.visible = true;
          cv.rig.xrayBeacon.visible = false;

          const def = TREASURES[c.lootDefId];
          const hex = RARITY_HEX[def?.rarity || 'common'] || 0xfbbf24;
          sound.playLootReveal(def?.rarity || 'common');
          this.spawnBurst3D(c.x * S, 1.0, c.y * S, hex, def?.rarity === 'mythic' ? 32 : 18, false);
          if (def?.rarity === 'mythic' || def?.rarity === 'legendary') {
            this.shakeIntensity = 0.35;
          }

          const { cols, rows } = this.bagDims;
          const fit = findAutoFitSlot(this.bag, cols, rows, c.lootDefId);
          if (fit) {
            const newItem: BagItem = {
              uid: `it_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              defId: c.lootDefId,
              gx: fit.gx,
              gy: fit.gy,
              rotated: fit.rotated,
            };
            this.bag = [...this.bag, newItem];
            this.updateLootSackVisual();
            this.callbacks.onLootAutoPacked?.(c.lootDefId, this.bag);
          } else {
            // Bag is full -> pause & open Tetris Bag Modal so player decides what to drop!
            this.paused = true;
            this.keys.clear();
            this.callbacks.onBagOverflow?.(c.lootDefId, this.bag);
          }
          this.emitHud();
        }
        break;
      } else if (c.progress > 0) {
        c.progress = Math.max(0, c.progress - dt * 0.5);
      }
    }

    // 5. Interact: Canal Escape Boat Extraction Zone
    const ex = this.mapConfig.extractZone;
    const distExtract = Math.hypot(this.player.x - ex.x, this.player.y - ex.y);
    if (distExtract < ex.radius) {
      if (this.bag.length === 0) {
        this.extractProgress = 0;
        this.nearPrompt = '⛵ 乌篷船已备好 · 空手太亏，先摸至少 1 件宝物再来撤离！';
      } else {
        this.extractProgress = Math.min(1, this.extractProgress + dt / 1.5);
        activeProgress01 = Math.max(activeProgress01, this.extractProgress);
        this.nearPrompt = `⛵ 正在登船撤离！坚持住 ${Math.round(this.extractProgress * 100)}%`;
        if (this.extractProgress >= 1) {
          this.finished = true;
          sound.playCashOutGong();
          const finalTotals = computeBagTotals(this.bag);
          this.callbacks.onFinishRaid?.({
            escaped: true,
            mapId: this.mapConfig.id,
            mapName: this.mapConfig.name,
            timeUsedSec: Math.round(this.elapsed),
            totalValueWan: finalTotals.totalValueWan,
            itemsExtracted: this.bag,
            mythicCount: finalTotals.mythicCount,
            guardsKnockedOut: this.guardsKnockedOut,
          });
          return;
        }
      }
    } else {
      this.extractProgress = Math.max(0, this.extractProgress - dt * 1.4);
    }

    // Update diegetic golden progress ring on raider's feet
    if (this.raiderRig) {
      const pm = this.raiderRig.progressRing.material as THREE.MeshBasicMaterial;
      if (activeProgress01 > 0.02) {
        pm.opacity = 0.85;
        pm.color.setHex(this.extractProgress > 0.02 ? 0x34d399 : 0xfbbf24);
        this.raiderRig.progressRing.scale.setScalar(0.65 + activeProgress01 * 0.55);
      } else {
        pm.opacity = 0;
      }
    }

    // 6. Step Guard AI, Detection & Combat
    const playerInSmoke = this.smokeClouds.some(
      (sc) => Math.hypot(this.player.x - sc.x, this.player.y - sc.y) < sc.radius
    );

    for (const gv of this.guardVisuals) {
      const g = gv.entity;
      if (g.attackCooldown > 0) g.attackCooldown = Math.max(0, g.attackCooldown - dt);

      if (g.state === 'stunned') {
        g.stateTimer -= dt;
        if (g.stateTimer <= 0) {
          g.state = 'patrol';
          g.alertMeter = 0;
        }
        this.syncGuardRigPose(gv, dt, t, false);
        this.updateGuardConeMesh(gv);
        continue;
      }

      // Check Vision Cone Detection
      const dxP = this.player.x - g.x;
      const dyP = this.player.y - g.y;
      const distP = Math.hypot(dxP, dyP);
      const effRange = playerInSmoke ? g.visionRange * 0.34 : g.visionRange;
      let canSee = false;

      if (distP < effRange) {
        const angToP = Math.atan2(dyP, dxP);
        let diff = angToP - g.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) <= g.visionHalfAngle || distP < 42) {
          if (hasLineOfSight({ x: g.x, y: g.y }, { x: this.player.x, y: this.player.y }, this.walls)) {
            canSee = true;
          }
        }
      }

      if (canSee) {
        g.alertMeter = Math.min(1, g.alertMeter + dt * (distP < 120 ? 3.2 : 1.75));
        if (g.alertMeter >= 0.72) {
          if (g.state !== 'chase') sound.playGuardAlert();
          g.state = 'chase';
          g.stateTimer = 4.2;
          g.investigateTarget = { x: this.player.x, y: this.player.y };
        }
      } else {
        g.alertMeter = Math.max(0, g.alertMeter - dt * 0.65);
        if (g.state === 'chase') {
          g.stateTimer -= dt;
          if (g.stateTimer <= 0) {
            g.state = 'investigate';
            g.stateTimer = 2.6;
          }
        }
      }

      // Movement Steering
      let moveTarget: Vec2 | null = null;
      let moveSpeed = g.speed;
      if (g.state === 'chase') {
        moveTarget = canSee ? { x: this.player.x, y: this.player.y } : g.investigateTarget;
        moveSpeed = g.speed * 1.44;
      } else if (g.state === 'investigate') {
        g.stateTimer -= dt;
        moveTarget = g.investigateTarget;
        moveSpeed = g.speed * 1.08;
        if (
          g.stateTimer <= 0 ||
          !moveTarget ||
          Math.hypot(moveTarget.x - g.x, moveTarget.y - g.y) < 20
        ) {
          g.state = 'patrol';
          g.investigateTarget = null;
        }
      } else {
        const wp = g.waypoints[g.wpIndex];
        if (Math.hypot(wp.x - g.x, wp.y - g.y) < 12) {
          g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
        }
        moveTarget = g.waypoints[g.wpIndex];
      }

      let guardMoving = false;
      if (moveTarget) {
        const mdx = moveTarget.x - g.x;
        const mdy = moveTarget.y - g.y;
        const md = Math.hypot(mdx, mdy);
        if (md > 6) {
          guardMoving = true;
          const vx = (mdx / md) * moveSpeed;
          const vy = (mdy / md) * moveSpeed;
          const moved = resolveCircleWalls({ x: g.x + vx * dt, y: g.y + vy * dt }, g.radius, this.walls);
          g.x = Math.max(56, Math.min(this.mapConfig.width - 56, moved.x));
          g.y = Math.max(56, Math.min(this.mapConfig.height - 46, moved.y));
          const targetAng = Math.atan2(vy, vx);
          let aDiff = targetAng - g.angle;
          while (aDiff > Math.PI) aDiff -= Math.PI * 2;
          while (aDiff < -Math.PI) aDiff += Math.PI * 2;
          g.angle += aDiff * Math.min(1, dt * 8.5);
        }
      }

      // Guard Saber Strike on Player!
      if (g.state === 'chase' && distP < 38 && g.attackCooldown <= 0 && this.player.invulnTimer <= 0) {
        g.attackCooldown = 1.25;
        this.player.invulnTimer = 1.15;
        this.player.hp = Math.max(0, this.player.hp - 1);
        this.shakeIntensity = 0.65;
        sound.playPlayerHit();
        this.callbacks.onDamageFlash?.();
        this.spawnBurst3D(this.player.x * S, 1.1, this.player.y * S, 0xef4444, 14, false);

        if (this.player.hp <= 0) {
          this.paused = true;
          this.keys.clear();
          this.emitHud();
          this.callbacks.onNeedReviveOrFail?.('被大内锦衣卫绣春刀当场拿下！');
          return;
        }
        this.emitHud();
      }

      this.syncGuardRigPose(gv, dt, t, guardMoving);
      this.updateGuardConeMesh(gv);
    }

    // 6b. Update 3D Guidance Visuals: Target-Lock Attack Ring + Compass Arrow + Waypoint Pulse
    let strikeGuard: GuardEntity | null = null;
    let strikeDist = 122;
    for (const gv of this.guardVisuals) {
      const g = gv.entity;
      if (g.state === 'stunned') continue;
      const d = Math.hypot(g.x - this.player.x, g.y - this.player.y);
      if (d <= strikeDist) {
        strikeDist = d;
        strikeGuard = g;
      }
    }
    this.canAttackGuard = Boolean(strikeGuard);
    if (this.targetLockRing) {
      if (strikeGuard) {
        this.targetLockRing.visible = true;
        this.targetLockRing.position.set(strikeGuard.x * S, 0.12, strikeGuard.y * S);
        const pulse = 0.92 + Math.sin(t * 10) * 0.12;
        this.targetLockRing.scale.set(pulse, pulse, 1);
        if (!this.nearPrompt) {
          this.nearPrompt = '⚔️ 可偷袭攻击！按 [Space] 或点右下【攻击】一棒敲晕侍卫！';
        }
      } else {
        this.targetLockRing.visible = false;
      }
    }

    if (this.moveMarkerGroup && this.moveMarkerGroup.visible) {
      const s = 0.92 + Math.sin(t * 8) * 0.12;
      this.moveMarkerGroup.scale.set(s, 1, s);
    }

    // 3D Floor Compass Arrow around player's feet pointing to nearest chest OR escape boat!
    if (this.compassArrow) {
      const shouldExtract =
        this.bag.length > 0 &&
        (totals.totalValueWan >= 400 ||
          this.timeLeft <= 28 ||
          this.chestVisuals.every((c) => c.entity.opened));
      let goalX = this.mapConfig.extractZone.x;
      let goalY = this.mapConfig.extractZone.y;
      if (!shouldExtract) {
        let bestD = Infinity;
        for (const cv of this.chestVisuals) {
          if (cv.entity.opened) continue;
          const d = Math.hypot(cv.entity.x - this.player.x, cv.entity.y - this.player.y);
          if (d < bestD) {
            bestD = d;
            goalX = cv.entity.x;
            goalY = cv.entity.y;
          }
        }
      }
      const gAng = Math.atan2(goalY - this.player.y, goalX - this.player.x);
      const orbitR = 1.15;
      this.compassArrow.position.set(
        this.player.x * S + Math.cos(gAng) * orbitR,
        0.18 + Math.sin(t * 5) * 0.04,
        this.player.y * S + Math.sin(gAng) * orbitR
      );
      this.compassArrow.rotation.y = Math.atan2(Math.cos(gAng), Math.sin(gAng));
      (this.compassArrow.material as THREE.MeshBasicMaterial).color.setHex(
        shouldExtract ? 0x34d399 : 0xfbbf24
      );
    }

    // 7. Smooth 45° Tactical Follow Camera with Look-Ahead & Impact Shake
    const lookAheadX = Math.cos(this.player.angle) * (moving ? 1.8 : 0.7);
    const lookAheadZ = Math.sin(this.player.angle) * (moving ? 1.8 : 0.7);
    const desiredTarget = new THREE.Vector3(
      this.player.x * S + lookAheadX,
      0.8,
      this.player.y * S + lookAheadZ
    );
    const desiredCam = new THREE.Vector3(
      desiredTarget.x,
      16.2,
      desiredTarget.z + 13.5
    );
    this.camTarget.lerp(desiredTarget, Math.min(1, dt * 7.5));
    this.camCurrent.lerp(desiredCam, Math.min(1, dt * 6.5));

    if (this.shakeIntensity > 0.005) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.9);
      this.camera.position.set(
        this.camCurrent.x + (Math.random() - 0.5) * this.shakeIntensity * 1.2,
        this.camCurrent.y + (Math.random() - 0.5) * this.shakeIntensity * 0.8,
        this.camCurrent.z + (Math.random() - 0.5) * this.shakeIntensity * 1.2
      );
    } else {
      this.camera.position.copy(this.camCurrent);
    }
    this.camera.lookAt(this.camTarget);

    // Emit HUD snapshot ~12 times/sec
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.085) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private syncGuardRigPose(gv: GuardVisual, dt: number, t: number, moving: boolean) {
    const g = gv.entity;
    const r = gv.rig;
    r.root.position.set(g.x * S, 0, g.y * S);
    const yaw = Math.atan2(Math.cos(g.angle), Math.sin(g.angle));
    r.root.rotation.y = yaw;

    if (g.state === 'stunned') {
      // Dramatic knock-out topple on flagstones + spinning blue stars!
      r.bodyGroup.rotation.x = THREE.MathUtils.lerp(r.bodyGroup.rotation.x, Math.PI / 2 - 0.12, dt * 10);
      r.bodyGroup.position.y = THREE.MathUtils.lerp(r.bodyGroup.position.y, 0.24, dt * 10);
      r.lanternGlow.material.opacity = 0.12;
      if (r.lanternLight) r.lanternLight.intensity = 0.5;
      r.alertMark.visible = false;
      r.questionMark.visible = false;
      r.stunStars.visible = true;
      r.stunStars.rotation.y += dt * 4.5;
      r.statusGroup.position.y = 1.45;
      return;
    }

    r.bodyGroup.rotation.x = THREE.MathUtils.lerp(r.bodyGroup.rotation.x, 0, dt * 10);
    r.lanternGlow.material.opacity = g.state === 'chase' ? 1.0 : 0.82;
    if (r.lanternLight) r.lanternLight.intensity = g.state === 'chase' ? 7.2 : 5.0;

    if (moving) {
      gv.walkPhase += dt * (g.state === 'chase' ? 13 : 8.5);
      const sw = Math.sin(gv.walkPhase) * 0.45;
      r.leftLeg.rotation.x = sw;
      r.rightLeg.rotation.x = -sw;
      r.leftArm.rotation.x = -sw * 0.8;
      r.bodyGroup.position.y = Math.abs(Math.sin(gv.walkPhase)) * 0.08;
      // Swinging dangling palace lantern physics!
      r.lanternPivot.rotation.z = Math.sin(gv.walkPhase) * 0.28;
      r.lanternPivot.rotation.x = Math.cos(gv.walkPhase) * 0.18;
    } else {
      r.leftLeg.rotation.x *= 0.85;
      r.rightLeg.rotation.x *= 0.85;
      r.bodyGroup.position.y = 0;
      r.lanternPivot.rotation.z = Math.sin(t * 2.5) * 0.08;
    }

    r.statusGroup.position.y = 2.65 * (g.elite ? 1.12 : 1.0) + Math.sin(t * 6) * 0.08;
    r.alertMark.visible = g.state === 'chase';
    r.questionMark.visible = g.state === 'investigate';
    r.stunStars.visible = false;
  }

  private stepVfx(dt: number) {
    // 1. Burst Particles & Wood Splinters
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.08, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += p.rotVx * dt;
      p.mesh.rotation.y += p.rotVy * dt;
      const remain = 1 - p.life / p.maxLife;
      p.mesh.scale.multiplyScalar(0.97 + remain * 0.03);
    }

    // 2. Volumetric Painterly 3D Smoke Clouds
    for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
      const sc = this.smokeClouds[i];
      sc.ttl -= dt;
      if (sc.ttl <= 0) {
        this.scene.remove(sc.group);
        for (const pf of sc.puffs) pf.sprite.material.dispose();
        this.smokeClouds.splice(i, 1);
        continue;
      }
      const ageRatio = 1 - sc.ttl / sc.maxTtl;
      const fade = Math.min(1, sc.ttl / 1.5);
      for (const pf of sc.puffs) {
        pf.phase += dt * 1.3;
        pf.sprite.position.x = pf.ox + Math.sin(pf.phase) * 0.42;
        pf.sprite.position.y = pf.baseY + ageRatio * 0.7 + Math.sin(pf.phase * 0.8) * 0.16;
        pf.sprite.position.z = pf.oz + Math.cos(pf.phase) * 0.42;
        const grow = pf.baseScale * (0.85 + ageRatio * 0.35);
        pf.sprite.scale.set(grow, grow, 1);
        pf.sprite.material.rotation += dt * 0.28;
        pf.sprite.material.opacity = 0.56 * fade;
      }
    }

    // 3. Ballistic Arcing 3D Silver Distraction Coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (!c.landed) {
        c.flightT = Math.min(1, c.flightT + dt * 2.8);
        const cx = THREE.MathUtils.lerp(c.startX, c.targetX, c.flightT);
        const cy = THREE.MathUtils.lerp(c.startY, c.targetY, c.flightT);
        const arcH = Math.sin(c.flightT * Math.PI) * 3.4 + 0.14;
        c.mesh.position.set(cx * S, arcH, cy * S);
        c.mesh.rotation.x += dt * 14;
        c.mesh.rotation.z += dt * 11;
        if (c.flightT >= 1) {
          c.landed = true;
          this.spawnRipple3D(c.targetX, c.targetY, 0xfde047, 5.2);
          this.spawnBurst3D(c.targetX * S, 0.2, c.targetY * S, 0xfde047, 10, false);
          // Lure guards within 340px!
          for (const gv of this.guardVisuals) {
            const g = gv.entity;
            if (g.state === 'patrol' || g.state === 'investigate') {
              if (Math.hypot(g.x - c.targetX, g.y - c.targetY) < 350) {
                g.state = 'investigate';
                g.stateTimer = 5.2;
                g.investigateTarget = { x: c.targetX, y: c.targetY };
              }
            }
          }
        }
      } else {
        c.ttl -= dt;
        c.mesh.rotation.y += dt * 3;
        if (c.ttl <= 0) {
          this.scene.remove(c.mesh);
          this.coins.splice(i, 1);
        }
      }
    }

    // 4. Expanding Floor Sound / Impact Ripple Rings
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.age += dt;
      if (rp.age >= rp.maxAge) {
        this.scene.remove(rp.mesh);
        rp.mesh.geometry.dispose();
        (rp.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
        continue;
      }
      const k = rp.age / rp.maxAge;
      rp.mesh.scale.setScalar(1 + k * rp.maxScale);
      (rp.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.72;
    }
  }

  private emitHud() {
    if (!this.callbacks.onHudUpdate) return;
    const totals = computeBagTotals(this.bag);
    const alertCount = this.guardVisuals.filter((g) => g.entity.state === 'chase').length;
    const chestsOpened = this.chestVisuals.filter((c) => c.entity.opened).length;

    const guideGoal: HudSnapshot['guideGoal'] =
      !this.hasMoved
        ? 'move'
        : this.bag.length > 0 &&
          (totals.totalValueWan >= 400 || this.timeLeft <= 28 || chestsOpened >= this.chestVisuals.length)
        ? 'extract'
        : 'loot';

    this.callbacks.onHudUpdate({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      timeLeft: this.timeLeft,
      stamina: this.player.stamina,
      smokeCount: this.smokeCount,
      coinCount: this.coinCount,
      backstabCd: this.backstabCd,
      infiniteTools: this.isPro && this.profile.godMode.infiniteTools,
      bagValueWan: totals.totalValueWan,
      bagWeightKg: totals.totalWeightKg,
      bagItemCount: this.bag.length,
      mythicCount: totals.mythicCount,
      extractProgress: this.extractProgress,
      nearPrompt: this.nearPrompt,
      alertCount,
      chestsOpened,
      chestsTotal: this.chestVisuals.length,
      guardsKnockedOut: this.guardsKnockedOut,
      hasMoved: this.hasMoved,
      canAttackGuard: this.canAttackGuard,
      guideGoal,
    });
  }

  /**
   * Renders a razor-sharp corner Tactical Stealth Radar Minimap
   */
  private renderMinimap(ctx: CanvasRenderingContext2D) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const sx = W / this.mapConfig.width;
    const sy = H / this.mapConfig.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10, 14, 24, 0.88)';
    ctx.fillRect(0, 0, W, H);

    // Walls & Water
    for (const w of this.walls) {
      if (w.broken) continue;
      if (w.kind === 'water') ctx.fillStyle = 'rgba(22, 62, 92, 0.75)';
      else if (w.kind === 'secret_wall') ctx.fillStyle = '#F59E0B';
      else if (w.kind === 'screen') ctx.fillStyle = '#92400E';
      else ctx.fillStyle = '#6B221D';
      ctx.fillRect(w.x * sx, w.y * sy, Math.max(2, w.w * sx), Math.max(2, w.h * sy));
    }

    // Extraction Zone
    const ex = this.mapConfig.extractZone;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.beginPath();
    ctx.arc(ex.x * sx, ex.y * sy, Math.max(5, ex.radius * sx), 0, Math.PI * 2);
    ctx.fill();

    // Unopened Chests
    const xray = this.isPro && this.profile.godMode.xrayMythicVision;
    for (const cv of this.chestVisuals) {
      if (cv.entity.opened) continue;
      const def = TREASURES[cv.entity.lootDefId];
      if (xray && def?.rarity === 'mythic') ctx.fillStyle = '#F43F5E';
      else if (cv.entity.tier === 'dragon_vault') ctx.fillStyle = '#FBBF24';
      else ctx.fillStyle = '#D97706';
      ctx.fillRect(cv.entity.x * sx - 2, cv.entity.y * sy - 2, 4, 4);
    }

    // Guards & Vision Cones
    for (const gv of this.guardVisuals) {
      const g = gv.entity;
      if (g.state === 'stunned') continue;
      ctx.fillStyle = g.state === 'chase' ? 'rgba(239,68,68,0.45)' : 'rgba(251,191,36,0.28)';
      ctx.beginPath();
      ctx.moveTo(g.x * sx, g.y * sy);
      ctx.arc(
        g.x * sx,
        g.y * sy,
        g.visionRange * sx,
        g.angle - g.visionHalfAngle,
        g.angle + g.visionHalfAngle
      );
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = g.state === 'chase' ? '#EF4444' : '#FB923C';
      ctx.beginPath();
      ctx.arc(g.x * sx, g.y * sy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Dot + Facing Arrow
    const px = this.player.x * sx;
    const py = this.player.y * sy;
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(px, py, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(this.player.angle) * 7, py + Math.sin(this.player.angle) * 7);
    ctx.stroke();
  }

  private disposeObjectTree(root: THREE.Object3D) {
    const sharedTextures = new Set<THREE.Texture>([
      this.textures.courtyard,
      this.textures.carpet,
      this.textures.water,
      this.textures.roof,
      this.textures.palaceWall,
      this.textures.screenArt,
      this.textures.secretWall,
      this.textures.woodDeck,
      this.textures.marbleBase,
      this.textures.softGlow,
      this.textures.smokePuff,
    ]);
    root.traverse((obj) => {
      const m = obj as THREE.Mesh | THREE.Points | THREE.Sprite;
      if ('geometry' in m && m.geometry) {
        m.geometry.dispose();
      }
      if ('material' in m && m.material) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mt of mats) {
          const std = mt as THREE.MeshStandardMaterial;
          if (std.map && !sharedTextures.has(std.map)) std.map.dispose();
          mt.dispose();
        }
      }
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.handleCanvasPointerDown);

    this.disposeObjectTree(this.scene);
    this.particleGeo.dispose();
    this.sparkGeo.dispose();
    this.coinGeo.dispose();
    this.coinMat.dispose();
    this.burstMatCache.forEach((m) => m.dispose());
    this.burstMatCache.clear();
    this.textures.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
