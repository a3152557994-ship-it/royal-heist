import * as THREE from 'three';
import { PalaceTextureBank } from './textures3d';

export interface RaiderRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  cape: THREE.Mesh;
  lootSack: THREE.Group;
  slashArc: THREE.Mesh;
  footRing: THREE.Mesh;
  progressRing: THREE.Mesh;
}

export interface GuardRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  lanternPivot: THREE.Group;
  lanternGlow: THREE.Sprite;
  lanternLight: THREE.PointLight | null;
  statusGroup: THREE.Group;
  alertMark: THREE.Group;
  questionMark: THREE.Group;
  stunStars: THREE.Group;
}

export interface ChestRig {
  root: THREE.Group;
  lidPivot: THREE.Group;
  beamMesh: THREE.Mesh;
  innerGlow: THREE.Mesh;
  xrayBeacon: THREE.Mesh;
}

export interface BrazierRig {
  root: THREE.Group;
  flameOuter: THREE.Mesh;
  flameInner: THREE.Mesh;
  glowSprite: THREE.Sprite;
  light: THREE.PointLight | null;
}

function enableShadows(obj: THREE.Object3D, cast = true, receive = true) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Builds the Heroic Articulated 3D Night Raider (夜行摸金客)
 * Features animated legs, arms, flowing assassin cape, conical night hat, twin curved blade, and dynamically swelling loot sack!
 */
export function createRaiderRig(
  textures: PalaceTextureBank,
  armorLevel: number,
  bootsLevel: number
): RaiderRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const tunicMat = new THREE.MeshStandardMaterial({
    color: 0x1a2639,
    roughness: 0.72,
    metalness: 0.12,
  });
  const sashMat = new THREE.MeshStandardMaterial({
    color: 0xc82333,
    roughness: 0.55,
    emissive: 0x3b070c,
    emissiveIntensity: 0.35,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf4b942,
    roughness: 0.28,
    metalness: 0.85,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xdcb898,
    roughness: 0.65,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: bootsLevel >= 2 ? 0x2c2419 : 0x161414,
    roughness: 0.5,
    metalness: bootsLevel >= 2 ? 0.35 : 0.1,
  });

  // Legs
  const makeLeg = (xOff: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xOff, 0.72, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.34, 4, 8), tunicMat);
    thigh.position.y = -0.22;
    pivot.add(thigh);

    const shinWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.095, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0xbcb7ad, roughness: 0.85 })
    );
    shinWrap.position.y = -0.48;
    pivot.add(shinWrap);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.3), bootMat);
    boot.position.set(0, -0.64, 0.05);
    pivot.add(boot);

    if (bootsLevel >= 1) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.32), goldMat);
      trim.position.set(0, -0.58, 0.05);
      pivot.add(trim);
    }
    return pivot;
  };

  const leftLeg = makeLeg(-0.17);
  const rightLeg = makeLeg(0.17);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso + Crimson Waist Sash + Shoulder Pads
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.76, 10), tunicMat);
  torso.position.y = 1.08;
  bodyGroup.add(torso);

  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.275, 0.18, 10), sashMat);
  sash.position.y = 0.79;
  bodyGroup.add(sash);

  // Decorative armor plates if upgraded
  const chestPlateMat = armorLevel >= 1 ? goldMat : new THREE.MeshStandardMaterial({ color: 0x3b4454, metalness: 0.65, roughness: 0.35 });
  const mirrorPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), chestPlateMat);
  mirrorPlate.rotation.x = Math.PI / 2;
  mirrorPlate.position.set(0, 1.18, 0.26);
  bodyGroup.add(mirrorPlate);

  // Flowing Assassin Cloak
  const capeGeo = new THREE.BoxGeometry(0.64, 0.92, 0.05);
  capeGeo.translate(0, -0.44, 0);
  const capeMat = new THREE.MeshStandardMaterial({
    color: 0x151e2e,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const cape = new THREE.Mesh(capeGeo, capeMat);
  cape.position.set(0, 1.4, -0.22);
  cape.rotation.x = 0.26;
  bodyGroup.add(cape);

  // Swelling 3D Loot Sack strapped on the back (starts small, expands as you loot treasures!)
  const lootSack = new THREE.Group();
  lootSack.position.set(0, 1.12, -0.34);
  const sackBody = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.28, 1),
    new THREE.MeshStandardMaterial({
      color: 0x8f5b28,
      roughness: 0.75,
      emissive: 0x2c1604,
      emissiveIntensity: 0.3,
    })
  );
  sackBody.scale.set(1.0, 1.18, 0.85);
  const sackTie = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 6, 12), goldMat);
  sackTie.rotation.x = Math.PI / 2;
  sackTie.position.y = 0.26;
  lootSack.add(sackBody, sackTie);
  lootSack.scale.setScalar(0.45);
  bodyGroup.add(lootSack);

  // Arms
  const makeArm = (xOff: number, withBlade: boolean) => {
    const pivot = new THREE.Group();
    pivot.position.set(xOff, 1.38, 0);
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      armorLevel >= 2 ? goldMat : tunicMat
    );
    pivot.add(shoulder);

    const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.38, 4, 8), tunicMat);
    armMesh.position.y = -0.24;
    pivot.add(armMesh);

    const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.095, 0.16, 8), sashMat);
    bracer.position.y = -0.42;
    pivot.add(bracer);

    if (withBlade) {
      const bladeGroup = new THREE.Group();
      bladeGroup.position.set(0, -0.48, 0.1);
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), goldMat);
      hilt.rotation.x = Math.PI / 2;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.08, 0.72),
        new THREE.MeshStandardMaterial({
          color: 0xd9f2ff,
          metalness: 0.92,
          roughness: 0.15,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.28,
        })
      );
      blade.position.z = 0.4;
      bladeGroup.add(hilt, blade);
      pivot.add(bladeGroup);
    }
    return pivot;
  };

  const leftArm = makeArm(-0.37, false);
  const rightArm = makeArm(0.37, true);
  bodyGroup.add(leftArm, rightArm);

  // Head + Assassin Mask + Iconic Wide Bamboo Conical Night Hat (黑漆斗笠)
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.66;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skinMat);
  headGroup.add(head);

  const mask = new THREE.Mesh(
    new THREE.CylinderGeometry(0.225, 0.21, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: 0x111319, roughness: 0.85 })
  );
  mask.position.y = -0.05;
  headGroup.add(mask);

  // Conical Night Raider Hat (斗笠)
  const hatCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 0.26, 18),
    new THREE.MeshStandardMaterial({
      color: 0x1d232b,
      roughness: 0.48,
      metalness: 0.25,
    })
  );
  hatCone.position.y = 0.21;
  headGroup.add(hatCone);

  const hatRim = new THREE.Mesh(new THREE.TorusGeometry(0.61, 0.025, 6, 20), goldMat);
  hatRim.rotation.x = Math.PI / 2;
  hatRim.position.y = 0.09;
  headGroup.add(hatRim);

  const hatCap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), goldMat);
  hatCap.position.y = 0.34;
  headGroup.add(hatCap);

  bodyGroup.add(headGroup);

  // 3D Backstab Crescent Slash Arc (hidden until strike)
  const slashGeo = new THREE.RingGeometry(0.7, 1.45, 20, 1, -Math.PI * 0.55, Math.PI * 1.1);
  const slashMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const slashArc = new THREE.Mesh(slashGeo, slashMat);
  slashArc.rotation.x = -Math.PI / 2;
  slashArc.position.set(0, 1.05, 0.35);
  root.add(slashArc);

  // Subtle Heroic Foot Locator Ring (helps player stay razor-sharp in moonlight shadows)
  const footRing = new THREE.Mesh(
    new THREE.RingGeometry(0.56, 0.68, 28),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    })
  );
  footRing.rotation.x = -Math.PI / 2;
  footRing.position.y = 0.05;
  root.add(footRing);

  // Diegetic Lockpicking / Wall-Prying Progress Ring around player
  const progressRing = new THREE.Mesh(
    new THREE.RingGeometry(0.78, 0.94, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  progressRing.rotation.x = -Math.PI / 2;
  progressRing.position.y = 0.07;
  root.add(progressRing);

  // Soft ground shadow aura under raider
  const softShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({
      map: textures.softGlow,
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  softShadow.rotation.x = -Math.PI / 2;
  softShadow.position.y = 0.02;
  root.add(softShadow);

  enableShadows(bodyGroup, true, true);

  return {
    root,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    cape,
    lootSack,
    slashArc,
    footRing,
    progressRing,
  };
}

/**
 * Builds an Articulated 3D Jinyiwei Patrol Guard / Elite Imperial Commander (锦衣卫巡逻卫 / 大内精英)
 * Carries an Embroidered Spring Saber & an outstretched swinging glowing 3D Palace Lantern!
 */
export function createGuardRig(textures: PalaceTextureBank, elite: boolean, withLight: boolean): GuardRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const scale = elite ? 1.12 : 1.0;
  bodyGroup.scale.setScalar(scale);

  const robeMat = new THREE.MeshStandardMaterial({
    color: elite ? 0x6b1414 : 0x7c1d24,
    roughness: 0.6,
    metalness: elite ? 0.3 : 0.12,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: elite ? 0xeab308 : 0x4b5563,
    roughness: 0.3,
    metalness: 0.85,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x161212, roughness: 0.75 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a984, roughness: 0.65 });

  // Legs
  const makeLeg = (xOff: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xOff, 0.72, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.125, 0.36, 4, 8), darkMat);
    leg.position.y = -0.24;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.32), darkMat);
    boot.position.set(0, -0.62, 0.05);
    pivot.add(leg, boot);
    return pivot;
  };
  const leftLeg = makeLeg(-0.18);
  const rightLeg = makeLeg(0.18);
  bodyGroup.add(leftLeg, rightLeg);

  // Flying-Fish Robe (飞鱼服) Skirt + Armored Chest
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.62, 12), robeMat);
  skirt.position.y = 0.62;
  bodyGroup.add(skirt);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.72, 12), robeMat);
  torso.position.y = 1.14;
  bodyGroup.add(torso);

  // Golden Brocade Chest Badge (补子 / 金甲)
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.12), armorMat);
  chestPlate.position.set(0, 1.18, 0.25);
  bodyGroup.add(chestPlate);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.31, 0.12, 12), armorMat);
  belt.position.y = 0.85;
  bodyGroup.add(belt);

  // Elite Red Commander Cape
  if (elite) {
    const cape = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 1.05, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 })
    );
    cape.position.set(0, 0.98, -0.28);
    cape.rotation.x = 0.2;
    bodyGroup.add(cape);
  }

  // Left Arm holding Curved Embroidered Spring Saber (绣春刀)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.4, 1.4, 0);
  const lSh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), armorMat);
  const lMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.38, 4, 8), robeMat);
  lMesh.position.y = -0.24;
  const saber = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.1, 0.92),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 })
  );
  saber.position.set(0, -0.45, 0.42);
  leftArm.add(lSh, lMesh, saber);
  bodyGroup.add(leftArm);

  // Right Arm outstretched carrying a Swinging Glowing 3D Palace Lantern!
  const rightArm = new THREE.Group();
  rightArm.position.set(0.4, 1.4, 0);
  const rSh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), armorMat);
  const rMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.36, 4, 8), robeMat);
  rMesh.position.set(0, -0.18, 0.14);
  rMesh.rotation.x = -0.85;

  // Lantern Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6),
    new THREE.MeshStandardMaterial({ color: 0x4b2e19, roughness: 0.8 })
  );
  pole.rotation.x = Math.PI / 2 - 0.18;
  pole.position.set(0.04, -0.22, 0.65);
  rightArm.add(rSh, rMesh, pole);

  // Swinging Hexagonal Paper Lantern
  const lanternPivot = new THREE.Group();
  lanternPivot.position.set(0.04, -0.12, 1.06);

  const lCord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 4), darkMat);
  lCord.position.y = -0.09;
  const lBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.12, 0.28, 6),
    new THREE.MeshStandardMaterial({
      color: elite ? 0xff7b47 : 0xffc864,
      emissive: elite ? 0xff451a : 0xff9d2e,
      emissiveIntensity: 2.2,
      roughness: 0.3,
    })
  );
  lBody.position.y = -0.3;
  const lCapTop = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.08, 6), darkMat);
  lCapTop.position.y = -0.14;
  const lCapBot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.06, 6), darkMat);
  lCapBot.position.y = -0.46;

  const lanternGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.softGlow,
      color: elite ? 0xff6b35 : 0xffb84d,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  lanternGlow.scale.set(1.5, 1.5, 1);
  lanternGlow.position.y = -0.3;

  let lanternLight: THREE.PointLight | null = null;
  if (withLight) {
    lanternLight = new THREE.PointLight(elite ? 0xff6833 : 0xffaa44, 5.2, 9.5, 1.6);
    lanternLight.position.y = -0.32;
    lanternPivot.add(lanternLight);
  }

  lanternPivot.add(lCord, lBody, lCapTop, lCapBot, lanternGlow);
  rightArm.add(lanternPivot);
  bodyGroup.add(rightArm);

  // Head + Iconic Qing Official Conical Helmet & Red Horsehair Tassel (红缨官帽 / 黄金顶盔)
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.72;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
  const hatBase = new THREE.Mesh(
    new THREE.ConeGeometry(0.46, 0.24, 14),
    elite ? armorMat : new THREE.MeshStandardMaterial({ color: 0x261f1f, roughness: 0.5, metalness: 0.35 })
  );
  hatBase.position.y = 0.22;
  const redTassel = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x450a0a,
      roughness: 0.7,
    })
  );
  redTassel.position.y = 0.28;
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.18, 8), armorMat);
  finial.position.y = 0.4;
  headGroup.add(head, hatBase, redTassel, finial);
  bodyGroup.add(headGroup);

  enableShadows(bodyGroup, true, true);

  // 3D Diegetic Status Indicators (! / ? / Stunned Spinning Stars) floating cleanly above guard
  const statusGroup = new THREE.Group();
  statusGroup.position.y = 2.65 * scale;
  root.add(statusGroup);

  // Alert "!"
  const alertMark = new THREE.Group();
  const exclMat = new THREE.MeshBasicMaterial({ color: 0xff2e4c });
  const exclBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.54, 0.16), exclMat);
  exclBar.position.y = 0.34;
  const exclDot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), exclMat);
  exclDot.position.y = 0;
  alertMark.add(exclBar, exclDot);
  alertMark.visible = false;
  statusGroup.add(alertMark);

  // Investigate "?"
  const questionMark = new THREE.Group();
  const qMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const qArc = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 6, 12, Math.PI * 1.4), qMat);
  qArc.position.y = 0.36;
  const qDot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), qMat);
  questionMark.add(qArc, qDot);
  questionMark.visible = false;
  statusGroup.add(questionMark);

  // Stunned orbiting golden stars
  const stunStars = new THREE.Group();
  const starMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  for (let i = 0; i < 3; i++) {
    const ang = (i * Math.PI * 2) / 3;
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), starMat);
    s.position.set(Math.cos(ang) * 0.42, 0, Math.sin(ang) * 0.42);
    stunStars.add(s);
  }
  stunStars.visible = false;
  statusGroup.add(stunStars);

  return {
    root,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    lanternPivot,
    lanternGlow,
    lanternLight,
    statusGroup,
    alertMark,
    questionMark,
    stunStars,
  };
}

/**
 * Builds an Articulated 3D Qing Treasure Chest (木箱 / 紫檀古董箱 / 龙纹金柜)
 * Includes a physically hinged lidPivot, interior golden glow, soaring vertical rarity pillar, and God-Mode X-Ray beacon!
 */
export function createChestRig(
  tier: 'wood' | 'rosewood' | 'dragon_vault',
  rarityHex: number
): ChestRig {
  const root = new THREE.Group();

  const isDragon = tier === 'dragon_vault';
  const isRose = tier === 'rosewood';
  const w = isDragon ? 1.52 : isRose ? 1.24 : 1.06;
  const h = isDragon ? 0.72 : isRose ? 0.58 : 0.52;
  const d = isDragon ? 0.94 : isRose ? 0.8 : 0.72;

  const woodColor = isDragon ? 0x8c1919 : isRose ? 0x451a14 : 0x6b4423;
  const metalColor = isDragon ? 0xfbbf24 : isRose ? 0xd99b38 : 0x64748b;

  const woodMat = new THREE.MeshStandardMaterial({
    color: woodColor,
    roughness: isDragon ? 0.3 : 0.56,
    metalness: isDragon ? 0.32 : 0.12,
    emissive: isDragon ? 0x3b0b08 : isRose ? 0x1e0b05 : 0x140a04,
    emissiveIntensity: isDragon ? 0.55 : 0.32,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: metalColor,
    roughness: 0.22,
    metalness: 0.9,
    emissive: isDragon ? 0x854d0e : 0x3f2606,
    emissiveIntensity: isDragon ? 0.65 : 0.35,
  });

  // Subtle gilded floor aura ring under unopened chest so players spot loot targets immediately
  const floorAura = new THREE.Mesh(
    new THREE.RingGeometry(w * 0.58, w * 0.72, 24),
    new THREE.MeshBasicMaterial({
      color: isDragon ? 0xfbbf24 : isRose ? 0xf59e0b : 0xd97706,
      transparent: true,
      opacity: isDragon ? 0.55 : 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  floorAura.rotation.x = -Math.PI / 2;
  floorAura.position.y = 0.05;
  root.add(floorAura);

  // Pedestal base for Dragon Vault Chest
  if (isDragon) {
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.34, 0.16, d + 0.34),
      new THREE.MeshStandardMaterial({ color: 0x3b120e, roughness: 0.5 })
    );
    plinth.position.y = 0.08;
    root.add(plinth);
  }

  const baseY = isDragon ? 0.16 : 0;

  // Lower Chest Box
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
  body.position.y = baseY + h / 2;
  root.add(body);

  // Brass / Iron Straps
  for (const sx of [-w * 0.35, w * 0.35]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.11, h + 0.02, d + 0.04), metalMat);
    strap.position.set(sx, baseY + h / 2, 0);
    root.add(strap);
  }

  // Front Lock Medallion
  const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), metalMat);
  lock.rotation.x = Math.PI / 2;
  lock.position.set(0, baseY + h - 0.06, d / 2 + 0.02);
  root.add(lock);

  // Glowing Treasure Pile inside box (revealed when lid hinges open!)
  const innerGlow = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.82, 0.16, d * 0.76),
    new THREE.MeshStandardMaterial({
      color: rarityHex,
      emissive: rarityHex,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    })
  );
  innerGlow.position.y = baseY + h - 0.06;
  innerGlow.visible = false;
  root.add(innerGlow);

  // Hinged Lid Pivot (mounted along the back top edge)
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, baseY + h, -d / 2);
  const lidH = isDragon ? 0.28 : 0.22;
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, lidH, d + 0.06), woodMat);
  lidMesh.position.set(0, lidH / 2, d / 2);
  lidPivot.add(lidMesh);

  for (const sx of [-w * 0.35, w * 0.35]) {
    const lStrap = new THREE.Mesh(new THREE.BoxGeometry(0.12, lidH + 0.03, d + 0.09), metalMat);
    lStrap.position.set(sx, lidH / 2, d / 2);
    lidPivot.add(lStrap);
  }
  if (isDragon) {
    const crest = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.09, 0.18), metalMat);
    crest.position.set(0, lidH + 0.04, d / 2);
    lidPivot.add(crest);
  }
  root.add(lidPivot);

  // Soaring Vertical Rarity Light Beam ("出大红冲天光柱!")
  const beamGeo = new THREE.CylinderGeometry(0.24, 0.65, 8.5, 16, 1, true);
  beamGeo.translate(0, 4.25, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: rarityHex,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.y = baseY + h * 0.6;
  beamMesh.visible = false;
  root.add(beamMesh);

  // God-Mode X-Ray Mythic Beacon (thin tall pulsing spire visible over roofs!)
  const xrayGeo = new THREE.CylinderGeometry(0.1, 0.26, 7.2, 10, 1, true);
  xrayGeo.translate(0, 3.6, 0);
  const xrayMat = new THREE.MeshBasicMaterial({
    color: rarityHex,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const xrayBeacon = new THREE.Mesh(xrayGeo, xrayMat);
  xrayBeacon.visible = false;
  root.add(xrayBeacon);

  enableShadows(body, true, true);
  enableShadows(lidPivot, true, true);

  return { root, lidPivot, beamMesh, innerGlow, xrayBeacon };
}

/**
 * Builds a True-3D Qing Palace Wall with White Marble Plinth, Vermilion Plaster Wall,
 * Overhanging Glazed Tiled Sloped Roof (飞檐瓦顶), and Golden Ridge Finials!
 */
export function createPalaceWallMesh(
  w: number,
  d: number,
  textures: PalaceTextureBank
): THREE.Group {
  const group = new THREE.Group();
  const wallH = 2.55;

  // 1. White Marble Base Plinth (汉白玉须弥座)
  const plinthMat = new THREE.MeshStandardMaterial({
    map: textures.marbleBase,
    roughness: 0.65,
    metalness: 0.05,
  });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.36, d + 0.14), plinthMat);
  plinth.position.y = 0.18;
  group.add(plinth);

  // 2. Vermilion Palace Plaster Wall (cloned repeat per wall length so bricks never stretch!)
  const wallTex = textures.palaceWall.clone();
  wallTex.needsUpdate = true;
  wallTex.repeat.set(Math.max(1, Math.round(Math.max(w, d) / 4.2)), 1);
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.72,
    metalness: 0.06,
  });
  const wallBody = new THREE.Mesh(new THREE.BoxGeometry(w, wallH - 0.36, d), wallMat);
  wallBody.position.y = 0.36 + (wallH - 0.36) / 2;
  group.add(wallBody);

  // 3. Sloped Overhanging Qing Glazed Tiled Roof (歇山/硬山瓦顶)
  const isHorizontal = w >= d;
  const overhang = 0.46;
  const roofW = w + overhang * 2;
  const roofD = d + overhang * 2;
  const roofH = 0.82;

  const roofTex = textures.roof.clone();
  roofTex.needsUpdate = true;
  roofTex.repeat.set(
    Math.max(1, Math.round((isHorizontal ? roofW : roofD) / 2.6)),
    Math.max(1, Math.round((isHorizontal ? roofD : roofW) / 2.0))
  );

  const roofMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    color: 0xd0e2f7,
    emissive: 0x162233,
    emissiveIntensity: 0.42,
    roughness: 0.36,
    metalness: 0.28,
  });

  // Lower Eaves Skirt + Tapered Pitched Roof Cap
  const eaves = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.16, roofD), roofMat);
  eaves.position.y = wallH + 0.06;
  group.add(eaves);

  const roofCap = new THREE.Mesh(
    new THREE.BoxGeometry(
      isHorizontal ? roofW - 0.16 : roofW * 0.62,
      roofH * 0.6,
      isHorizontal ? roofD * 0.62 : roofD - 0.16
    ),
    roofMat
  );
  roofCap.position.y = wallH + 0.14 + roofH * 0.28;
  group.add(roofCap);

  // Top Glazed Ridge Beam (正脊) + Upturned End Finials (吻兽)
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0xd9a13b,
    roughness: 0.32,
    metalness: 0.72,
  });
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(
      isHorizontal ? roofW - 0.1 : 0.2,
      0.16,
      isHorizontal ? 0.2 : roofD - 0.1
    ),
    ridgeMat
  );
  ridge.position.y = wallH + 0.14 + roofH * 0.58;
  group.add(ridge);

  // Golden Finials at both ends of the ridge
  const endOffset = (isHorizontal ? roofW : roofD) / 2 - 0.12;
  for (const s of [-1, 1]) {
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 6), ridgeMat);
    finial.position.set(
      isHorizontal ? s * endOffset : 0,
      wallH + 0.14 + roofH * 0.72,
      isHorizontal ? 0 : s * endOffset
    );
    group.add(finial);
  }

  enableShadows(group, true, true);
  return group;
}

/**
 * Ornate 3D Carved Folding Screen (雕花影壁 / 汉白玉屏风)
 */
export function createFoldingScreenMesh(
  w: number,
  d: number,
  textures: PalaceTextureBank
): THREE.Group {
  const group = new THREE.Group();
  const h = 1.85;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.16, 0.24, Math.max(d, 0.75) + 0.2),
    new THREE.MeshStandardMaterial({ map: textures.marbleBase, roughness: 0.6 })
  );
  base.position.y = 0.12;
  group.add(base);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(w, h - 0.24, Math.max(d * 0.6, 0.24)),
    new THREE.MeshStandardMaterial({
      map: textures.screenArt,
      roughness: 0.45,
      metalness: 0.2,
    })
  );
  panel.position.y = 0.24 + (h - 0.24) / 2;
  group.add(panel);

  const topCrest = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.12, 0.16, Math.max(d * 0.85, 0.36)),
    new THREE.MeshStandardMaterial({ color: 0xd99b38, roughness: 0.32, metalness: 0.78 })
  );
  topCrest.position.y = h + 0.04;
  group.add(topCrest);

  enableShadows(group, true, true);
  return group;
}

/**
 * Grand Lacquered Palace Hall Column with Carved Marble Drum Base & Golden Brackets (朱红宫柱)
 */
export function createPalacePillarMesh(
  w: number,
  d: number,
  textures: PalaceTextureBank
): THREE.Group {
  const group = new THREE.Group();
  const radius = Math.max(0.45, Math.min(w, d) * 0.45);
  const h = 3.2;

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.15, radius * 1.28, 0.42, 12),
    new THREE.MeshStandardMaterial({ map: textures.marbleBase, roughness: 0.55 })
  );
  plinth.position.y = 0.21;
  group.add(plinth);

  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.86, radius * 0.94, h - 0.42, 16),
    new THREE.MeshStandardMaterial({
      color: 0x8f1d18,
      roughness: 0.32,
      metalness: 0.18,
    })
  );
  col.position.y = 0.42 + (h - 0.42) / 2;
  group.add(col);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf0b849,
    roughness: 0.28,
    metalness: 0.82,
  });
  const collar = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.9, 0.07, 8, 16), goldMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = h - 0.28;
  group.add(collar);

  const capital = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 2.4, 0.32, radius * 2.4),
    new THREE.MeshStandardMaterial({ color: 0x1f4740, roughness: 0.45 })
  );
  capital.position.y = h + 0.1;
  group.add(capital);

  // Hanging Warm Red Imperial Palace Lantern on South Face of Column
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.72), goldMat);
  bracket.position.set(0, h - 0.38, radius + 0.28);
  group.add(bracket);

  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.18, 0.44, 6),
    new THREE.MeshStandardMaterial({
      color: 0xff5a2c,
      emissive: 0xff4014,
      emissiveIntensity: 2.2,
      roughness: 0.3,
    })
  );
  lantern.position.set(0, h - 0.72, radius + 0.56);
  group.add(lantern);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.softGlow,
      color: 0xff7b38,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(2.4, 2.4, 1);
  glow.position.set(0, h - 0.72, radius + 0.56);
  group.add(glow);

  enableShadows(col, true, true);
  enableShadows(plinth, true, true);
  return group;
}

/**
 * Breakable Gilded Nanmu Secret Vault Wall (锡晋斋金丝楠木夹墙)
 */
export function createSecretWallMesh(
  w: number,
  d: number,
  textures: PalaceTextureBank
): THREE.Group {
  const group = new THREE.Group();
  const h = 2.45;

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, Math.max(d, 0.55)),
    new THREE.MeshStandardMaterial({
      map: textures.secretWall,
      emissive: 0x7a4208,
      emissiveIntensity: 0.48,
      roughness: 0.42,
      metalness: 0.25,
    })
  );
  wall.position.y = h / 2;
  group.add(wall);

  // Brass dragon-ring door knockers on both faces
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x78350f,
    emissiveIntensity: 0.4,
  });
  for (const sx of [-w * 0.16, w * 0.16]) {
    for (const sz of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), goldMat);
      ring.position.set(sx, 1.25, sz * (Math.max(d, 0.55) / 2 + 0.05));
      group.add(ring);
    }
  }

  // Soft golden beckoning strip on floor in front of secret wall
  const floorStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.9, 1.3),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    })
  );
  floorStrip.rotation.x = -Math.PI / 2;
  floorStrip.position.set(0, 0.05, 0.95);
  group.add(floorStrip);

  enableShadows(wall, true, true);
  return group;
}

/**
 * Animated Flickering Bronze Courtyard Brazier (青铜火盆) — signature warm lighting contrast against cool moonlight!
 */
export function createBrazierRig(textures: PalaceTextureBank, withLight: boolean): BrazierRig {
  const root = new THREE.Group();
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x3b3024,
    roughness: 0.45,
    metalness: 0.78,
  });

  // Tripod legs + bowl
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.72, 6), bronzeMat);
    leg.position.set(Math.cos(a) * 0.34, 0.36, Math.sin(a) * 0.34);
    root.add(leg);
  }
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.34, 0.42, 12), bronzeMat);
  bowl.position.y = 0.78;
  root.add(bowl);

  const coals = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.1, 10),
    new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff3b00,
      emissiveIntensity: 2.2,
    })
  );
  coals.position.y = 0.96;
  root.add(coals);

  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.85, 8),
    new THREE.MeshBasicMaterial({
      color: 0xff7b1a,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  flameOuter.position.y = 1.38;
  root.add(flameOuter);

  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.55, 7),
    new THREE.MeshBasicMaterial({
      color: 0xfff0a0,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  flameInner.position.y = 1.28;
  root.add(flameInner);

  const glowSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.softGlow,
      color: 0xff932e,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glowSprite.scale.set(3.2, 3.2, 1);
  glowSprite.position.y = 1.35;
  root.add(glowSprite);

  let light: THREE.PointLight | null = null;
  if (withLight) {
    light = new THREE.PointLight(0xff8c2b, 9.5, 16, 1.5);
    light.position.y = 1.8;
    root.add(light);
  }

  enableShadows(bowl, true, true);
  return { root, flameOuter, flameInner, glowSprite, light };
}

/**
 * Moored 3D Wupeng Escape Boat (乌篷快船) gently bobbing on the moonlit palace canal!
 */
export function createWupengBoatRig(textures: PalaceTextureBank): THREE.Group {
  const boat = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.65 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1b1a1d, roughness: 0.8 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xd99b38, roughness: 0.35, metalness: 0.7 });

  // Elongated wooden hull
  const hull = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.56, 1.55), hullMat);
  hull.position.y = 0.25;
  boat.add(hull);

  // Tapered bow & stern prows
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.88, 1.25, 4), hullMat);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.x = Math.PI / 4;
  bow.position.set(2.65, 0.34, 0);
  boat.add(bow);

  const stern = new THREE.Mesh(new THREE.ConeGeometry(0.88, 1.15, 4), hullMat);
  stern.rotation.z = Math.PI / 2;
  stern.rotation.x = Math.PI / 4;
  stern.position.set(-2.6, 0.34, 0);
  boat.add(stern);

  // Iconic Black Arched Bamboo Canopy (乌篷)
  const canopy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 0.88, 2.4, 14, 1, false, 0, Math.PI),
    canopyMat
  );
  canopy.rotation.z = Math.PI / 2;
  canopy.rotation.x = -Math.PI / 2;
  canopy.position.set(-0.15, 0.52, 0);
  boat.add(canopy);

  // Golden bamboo ribs
  for (const rx of [-1.25, -0.15, 0.95]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.89, 0.04, 6, 16, Math.PI), trimMat);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(rx, 0.52, 0);
    boat.add(rib);
  }

  // Warm Glowing Emerald-Gold Escape Lantern hanging off bow pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.45, 6), hullMat);
  pole.position.set(2.05, 1.0, 0);
  pole.rotation.z = -0.3;
  boat.add(pole);

  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.14, 0.34, 6),
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 2.4,
    })
  );
  lantern.position.set(2.35, 1.42, 0);
  boat.add(lantern);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.softGlow,
      color: 0x34d399,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(2.8, 2.8, 1);
  glow.position.set(2.35, 1.42, 0);
  boat.add(glow);

  const boatLight = new THREE.PointLight(0x34d399, 7.5, 13, 1.5);
  boatLight.position.set(2.2, 1.6, 0);
  boat.add(boatLight);

  enableShadows(hull, true, true);
  enableShadows(canopy, true, true);
  return boat;
}

/**
 * Stylized Moonlit Courtyard Pine Tree for perimeter framing (古松)
 */
export function createPineTreeMesh(): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.36, 2.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a261b, roughness: 0.9 })
  );
  trunk.position.y = 1.3;
  tree.add(trunk);

  const needleMat = new THREE.MeshStandardMaterial({
    color: 0x16382b,
    roughness: 0.85,
  });
  const tiers = [
    { y: 2.6, r: 1.65, h: 1.2 },
    { y: 3.45, r: 1.3, h: 1.1 },
    { y: 4.2, r: 0.85, h: 1.0 },
  ];
  for (const t of tiers) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 9), needleMat);
    cone.position.y = t.y;
    tree.add(cone);
  }
  enableShadows(tree, true, true);
  return tree;
}
