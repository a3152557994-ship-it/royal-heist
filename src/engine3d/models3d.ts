import * as THREE from 'three';
import { cloneRepeatingTexture, PalaceTextureBank } from './textures3d';
import { cloneAssetModel, RoyalAssetBundle } from './assetLoader3d';

export interface RaiderRig {
  root: THREE.Group;
  bodyGroup: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  cape: THREE.Object3D;
  lootSack: THREE.Object3D;
  slashArc: THREE.Mesh;
  footRing: THREE.Mesh;
  progressRing: THREE.Mesh;
}

export interface GuardRig {
  root: THREE.Group;
  bodyGroup: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  lanternPivot: THREE.Object3D;
  lanternGlow: THREE.Sprite;
  lanternLight: THREE.PointLight | null;
  statusGroup: THREE.Group;
  alertMark: THREE.Group;
  questionMark: THREE.Group;
  stunStars: THREE.Group;
}

export interface ChestRig {
  root: THREE.Group;
  lidPivot: THREE.Object3D;
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

function findNode(root: THREE.Object3D, name: string): THREE.Object3D | null {
  return root.getObjectByName(name) || null;
}

function createRaiderOverlays(textures: PalaceTextureBank, root: THREE.Group) {
  const slashGeo = new THREE.RingGeometry(0.7, 1.5, 22, 1, -Math.PI * 0.55, Math.PI * 1.1);
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

  const footRing = new THREE.Mesh(
    new THREE.RingGeometry(0.56, 0.68, 28),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    })
  );
  footRing.rotation.x = -Math.PI / 2;
  footRing.position.y = 0.05;
  root.add(footRing);

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

  const softShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.65, 1.65),
    new THREE.MeshBasicMaterial({
      map: textures.softGlow,
      color: 0x000000,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    })
  );
  softShadow.rotation.x = -Math.PI / 2;
  softShadow.position.y = 0.025;
  root.add(softShadow);

  return { slashArc, footRing, progressRing };
}

/**
 * Builds the Heroic Sculpted 3D Night Raider (夜行摸金客) from Blender 5.2 Raider.glb,
 * wired to live articulated limb/cape/lootSack pivots (with clean lightweight fallback while GLB streams in).
 */
export function createRaiderRig(
  textures: PalaceTextureBank,
  armorLevel: number,
  bootsLevel: number,
  bundle?: RoyalAssetBundle | null
): RaiderRig {
  const root = new THREE.Group();
  const { slashArc, footRing, progressRing } = createRaiderOverlays(textures, root);

  const glb = bundle ? cloneAssetModel(bundle, 'Raider', true) : null;
  if (glb) {
    root.add(glb);
    const bodyGroup = findNode(glb, 'BodyGroup') || glb;
    const leftLeg = findNode(glb, 'LeftLeg') || new THREE.Group();
    const rightLeg = findNode(glb, 'RightLeg') || new THREE.Group();
    const leftArm = findNode(glb, 'LeftArm') || new THREE.Group();
    const rightArm = findNode(glb, 'RightArm') || new THREE.Group();
    const cape = findNode(glb, 'Cape') || new THREE.Group();
    const lootSack = findNode(glb, 'LootSack') || new THREE.Group();

    // Subtle metallic glow upgrade tint when player upgrades armor/boots!
    if (armorLevel >= 1) {
      glb.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && o.name.toLowerCase().includes('pauldron')) {
          m.color.setHex(0xe5b247);
          m.metalness = 0.88;
          m.roughness = 0.25;
        }
      });
    }
    if (bootsLevel >= 2) {
      glb.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && o.name.toLowerCase().includes('boot')) {
          m.emissive.setHex(0x164e63);
          m.emissiveIntensity = 0.35;
        }
      });
    }
    lootSack.scale.setScalar(0.55);
    enableShadows(glb, true, true);

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

  // Brief non-blocking placeholder while GLB finishes streaming (<150ms)
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const placeholderMat = new THREE.MeshStandardMaterial({ color: 0x1a2639, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.9, 4, 8), placeholderMat);
  torso.position.y = 0.95;
  bodyGroup.add(torso);
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const cape = new THREE.Group();
  const lootSack = new THREE.Group();
  bodyGroup.add(leftLeg, rightLeg, leftArm, rightArm, cape, lootSack);
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

function createGuardStatusIndicators(root: THREE.Group, topY: number) {
  const statusGroup = new THREE.Group();
  statusGroup.position.y = topY;
  root.add(statusGroup);

  const alertMark = new THREE.Group();
  const exclMat = new THREE.MeshBasicMaterial({ color: 0xff2e4c });
  const exclBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.54, 0.16), exclMat);
  exclBar.position.y = 0.34;
  const exclDot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), exclMat);
  alertMark.add(exclBar, exclDot);
  alertMark.visible = false;
  statusGroup.add(alertMark);

  const questionMark = new THREE.Group();
  const qMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const qArc = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 6, 12, Math.PI * 1.4), qMat);
  qArc.position.y = 0.36;
  const qDot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), qMat);
  questionMark.add(qArc, qDot);
  questionMark.visible = false;
  statusGroup.add(questionMark);

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

  return { statusGroup, alertMark, questionMark, stunStars };
}

/**
 * Builds a Sculpted 3D Jinyiwei Patrol Guard / Elite Imperial Commander from Blender 5.2 Guard.glb / GuardElite.glb,
 * with live articulated limbs, swinging hexagonal palace lantern, warm lantern glow & dynamic PointLight!
 */
export function createGuardRig(
  textures: PalaceTextureBank,
  elite: boolean,
  withLight: boolean,
  bundle?: RoyalAssetBundle | null
): GuardRig {
  const root = new THREE.Group();

  // Contact shadow disc under feet
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({
      map: textures.softGlow,
      color: 0x000000,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.025;
  root.add(contactShadow);

  const { statusGroup, alertMark, questionMark, stunStars } = createGuardStatusIndicators(
    root,
    elite ? 2.75 : 2.6
  );

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
  lanternGlow.scale.set(1.65, 1.65, 1);

  let lanternLight: THREE.PointLight | null = null;
  if (withLight) {
    lanternLight = new THREE.PointLight(elite ? 0xff6833 : 0xffaa44, 5.8, 10.5, 1.55);
  }

  const glb = bundle ? cloneAssetModel(bundle, elite ? 'GuardElite' : 'Guard', false) : null;
  if (glb) {
    root.add(glb);
    const bodyGroup = findNode(glb, 'BodyGroup') || glb;
    const leftLeg = findNode(glb, 'LeftLeg') || new THREE.Group();
    const rightLeg = findNode(glb, 'RightLeg') || new THREE.Group();
    const leftArm = findNode(glb, 'LeftArm') || new THREE.Group();
    const rightArm = findNode(glb, 'RightArm') || new THREE.Group();
    const lanternPivot = findNode(glb, 'LanternPivot') || rightArm;

    lanternGlow.position.set(0, -0.26, 0);
    lanternPivot.add(lanternGlow);
    if (lanternLight) {
      lanternLight.position.set(0, -0.28, 0);
      lanternPivot.add(lanternLight);
    }
    enableShadows(glb, true, true);

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

  // Brief streaming placeholder
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.26, 0.95, 4, 8),
    new THREE.MeshStandardMaterial({ color: elite ? 0x8b1616 : 0x5f1b22, roughness: 0.65 })
  );
  torso.position.y = 0.98;
  bodyGroup.add(torso);
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const lanternPivot = new THREE.Group();
  lanternPivot.position.set(0.35, 1.15, 0.9);
  lanternPivot.add(lanternGlow);
  if (lanternLight) lanternPivot.add(lanternLight);
  bodyGroup.add(leftLeg, rightLeg, leftArm, rightArm, lanternPivot);

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
 * Builds a Sculpted 3D Qing Treasure Chest (DragonChest.glb / RosewoodChest.glb) with physically hinged LidPivot,
 * interior glowing treasure bed, soaring vertical rarity pillar, and God-Mode X-Ray beacon!
 */
export function createChestRig(
  tier: 'wood' | 'rosewood' | 'dragon_vault',
  rarityHex: number,
  bundle?: RoyalAssetBundle | null
): ChestRig {
  const root = new THREE.Group();
  const isDragon = tier === 'dragon_vault';
  const isRose = tier === 'rosewood';
  const w = isDragon ? 1.52 : isRose ? 1.24 : 1.06;
  const h = isDragon ? 0.82 : isRose ? 0.66 : 0.58;
  const d = isDragon ? 0.94 : isRose ? 0.8 : 0.72;

  const floorAura = new THREE.Mesh(
    new THREE.RingGeometry(w * 0.6, w * 0.74, 28),
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
  floorAura.position.y = 0.045;
  root.add(floorAura);

  const innerGlow = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.76, 0.14, d * 0.68),
    new THREE.MeshStandardMaterial({
      color: rarityHex,
      emissive: rarityHex,
      emissiveIntensity: 2.3,
      roughness: 0.2,
    })
  );
  innerGlow.position.y = h - 0.05;
  innerGlow.visible = false;
  root.add(innerGlow);

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
  beamMesh.position.y = h * 0.65;
  beamMesh.visible = false;
  root.add(beamMesh);

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

  const modelKey = isDragon ? 'DragonChest' : 'RosewoodChest';
  const glb = bundle ? cloneAssetModel(bundle, modelKey, tier === 'wood') : null;
  if (glb) {
    if (tier === 'wood') {
      glb.scale.setScalar(0.88);
      // Warm aged cedar wood tone for basic silver chest tier
      glb.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && m.name.toLowerCase().includes('rosewood')) {
          m.color.setHex(0x6e4726);
          m.roughness = 0.62;
        }
      });
    }
    root.add(glb);
    const lidPivot = findNode(glb, 'LidPivot') || new THREE.Group();
    enableShadows(glb, true, true);
    return { root, lidPivot, beamMesh, innerGlow, xrayBeacon };
  }

  // Fallback box while GLB streams
  const woodMat = new THREE.MeshStandardMaterial({
    color: isDragon ? 0x8c1919 : isRose ? 0x451a14 : 0x6b4423,
    roughness: 0.45,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
  body.position.y = h / 2;
  root.add(body);
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, h, -d / 2);
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.2, d + 0.04), woodMat);
  lidMesh.position.set(0, 0.1, d / 2);
  lidPivot.add(lidMesh);
  root.add(lidPivot);
  enableShadows(body, true, true);
  enableShadows(lidPivot, true, true);
  return { root, lidPivot, beamMesh, innerGlow, xrayBeacon };
}

/**
 * Builds a True-3D Qing Palace Wall with Poly Haven CC0 PBR White Marble Plinth,
 * PBR Normal-Mapped Vermilion Plaster Wall, True Pitched Sloped Glazed Tiled Roof (歇山飞檐瓦顶),
 * and Upturned Gilded Ridge Finials (吻兽翘角)!
 */
export function createPalaceWallMesh(
  w: number,
  d: number,
  textures: PalaceTextureBank
): THREE.Group {
  const group = new THREE.Group();
  const wallH = 2.55;

  // 1. Real PBR Carved White Marble Plinth (Poly Haven marble_01)
  const marbleRep = Math.max(1, Math.round(Math.max(w, d) / 3.2));
  const marbleMap = cloneRepeatingTexture(textures.marblePbr.map, marbleRep, 1);
  const marbleNor = cloneRepeatingTexture(textures.marblePbr.normalMap, marbleRep, 1);
  const plinthMat = new THREE.MeshStandardMaterial({
    map: marbleMap,
    normalMap: marbleNor,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: textures.marblePbr.roughnessMap,
    color: 0xd8d5cc,
    roughness: 0.62,
    metalness: 0.04,
  });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, 0.36, d + 0.18), plinthMat);
  plinth.position.y = 0.18;
  group.add(plinth);

  // 2. Vermilion Palace Wall paired with Real Poly Haven Plaster Normal & Roughness!
  const wallRep = Math.max(1, Math.round(Math.max(w, d) / 4.2));
  const wallTex = cloneRepeatingTexture(textures.palaceWall, wallRep, 1);
  wallTex.wrapT = THREE.ClampToEdgeWrapping;
  const pNor = cloneRepeatingTexture(textures.plasterNor, wallRep * 2, 1);
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    normalMap: pNor,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: textures.plasterArm,
    roughness: 0.78,
    metalness: 0.05,
  });
  const wallBody = new THREE.Mesh(new THREE.BoxGeometry(w, wallH - 0.36, d), wallMat);
  wallBody.position.y = 0.36 + (wallH - 0.36) / 2;
  group.add(wallBody);

  // 3. Real Pitched Sloped Glazed Tiled Roof (Extruded Trapezoidal Eaves + Poly Haven ceramic_roof_01 PBR!)
  const isHorizontal = w >= d;
  const overhang = 0.54;
  const spanLen = (isHorizontal ? w : d) + overhang * 2;
  const spanWid = (isHorizontal ? d : w) + overhang * 2;
  const roofH = 0.96;

  const repU = Math.max(1, Math.round(spanLen / 2.2));
  const repV = Math.max(1, Math.round(spanWid / 1.8));
  const roofDiff = cloneRepeatingTexture(textures.roofPbr.map, repU, repV);
  const roofNor = cloneRepeatingTexture(textures.roofPbr.normalMap, repU, repV);
  const roofArm = cloneRepeatingTexture(textures.roofPbr.roughnessMap, repU, repV);

  const roofMat = new THREE.MeshStandardMaterial({
    map: roofDiff,
    normalMap: roofNor,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: roofArm,
    color: 0x7c93ad, // Luminous moonlit imperial glazed slate-blue tile sheen!
    roughness: 0.36,
    metalness: 0.28,
  });

  // Curved concave Qing roof profile extruded along wall length (replaces flat stacked boxes!)
  const hw = spanWid / 2;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-hw, 0);
  roofShape.quadraticCurveTo(-hw * 0.45, roofH * 0.25, -0.1, roofH);
  roofShape.lineTo(0.1, roofH);
  roofShape.quadraticCurveTo(hw * 0.45, roofH * 0.25, hw, 0);
  roofShape.lineTo(hw, -0.12);
  roofShape.lineTo(-hw, -0.12);
  roofShape.closePath();

  const extrudeGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: spanLen,
    bevelEnabled: false,
    curveSegments: 6,
  });
  extrudeGeo.center();
  const pitchedRoof = new THREE.Mesh(extrudeGeo, roofMat);
  if (isHorizontal) {
    pitchedRoof.rotation.y = Math.PI / 2;
  }
  pitchedRoof.position.y = wallH + roofH * 0.48;
  group.add(pitchedRoof);

  // Dark carved wooden eaves fascia under roof overhang
  const eavesTrim = new THREE.Mesh(
    new THREE.BoxGeometry(
      isHorizontal ? spanLen - 0.14 : spanWid - 0.14,
      0.16,
      isHorizontal ? spanWid - 0.14 : spanLen - 0.14
    ),
    new THREE.MeshStandardMaterial({ color: 0x152c2a, roughness: 0.65, metalness: 0.1 })
  );
  eavesTrim.position.y = wallH + 0.02;
  group.add(eavesTrim);

  // Gilded Imperial Ridge Beam (正脊) + Sculpted Upturned Chiwen Finials (吻兽) + Flying Corner Horns (飞檐翘角)
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0xdca43b,
    roughness: 0.26,
    metalness: 0.84,
  });
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(
      isHorizontal ? spanLen - 0.06 : 0.22,
      0.18,
      isHorizontal ? 0.22 : spanLen - 0.06
    ),
    ridgeMat
  );
  ridge.position.y = wallH + roofH + 0.02;
  group.add(ridge);

  const endOffset = spanLen / 2 - 0.1;
  for (const s of [-1, 1]) {
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.44, 6), ridgeMat);
    finial.position.set(
      isHorizontal ? s * endOffset : 0,
      wallH + roofH + 0.22,
      isHorizontal ? 0 : s * endOffset
    );
    finial.rotation.z = isHorizontal ? -s * 0.22 : 0;
    finial.rotation.x = isHorizontal ? 0 : s * 0.22;
    group.add(finial);

    // Upturned flying eaves corner tips on all 4 corners!
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 5), ridgeMat);
      horn.position.set(
        isHorizontal ? s * (spanLen / 2 + 0.04) : side * (hw + 0.04),
        wallH + 0.16,
        isHorizontal ? side * (hw + 0.04) : s * (spanLen / 2 + 0.04)
      );
      horn.rotation.z = isHorizontal ? -s * 0.65 : -side * 0.45;
      horn.rotation.x = isHorizontal ? side * 0.45 : s * 0.65;
      group.add(horn);
    }
  }

  enableShadows(group, true, true);
  return group;
}

/**
 * Ornate 3D Carved Folding Screen (雕花影壁 / 汉白玉屏风) with Real Marble PBR plinth
 */
export function createFoldingScreenMesh(
  w: number,
  d: number,
  textures: PalaceTextureBank
): THREE.Group {
  const group = new THREE.Group();
  const h = 1.9;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.18, 0.26, Math.max(d, 0.75) + 0.22),
    new THREE.MeshStandardMaterial({
      map: textures.marblePbr.map,
      normalMap: textures.marblePbr.normalMap,
      roughnessMap: textures.marblePbr.roughnessMap,
      color: 0xd8d5cc,
      roughness: 0.58,
    })
  );
  base.position.y = 0.13;
  group.add(base);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(w, h - 0.26, Math.max(d * 0.6, 0.24)),
    new THREE.MeshStandardMaterial({
      map: textures.screenArt,
      normalMap: textures.woodPbr.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.42,
      metalness: 0.22,
    })
  );
  panel.position.y = 0.26 + (h - 0.26) / 2;
  group.add(panel);

  const topCrest = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.16, 0.18, Math.max(d * 0.85, 0.38)),
    new THREE.MeshStandardMaterial({ color: 0xdfa23a, roughness: 0.28, metalness: 0.84 })
  );
  topCrest.position.y = h + 0.05;
  group.add(topCrest);

  enableShadows(group, true, true);
  return group;
}

/**
 * Grand Lacquered Palace Hall Column from Blender 5.2 PalacePillar.glb (汉白玉须弥座 + 斗拱宫柱 + 六角宫灯)
 */
export function createPalacePillarMesh(
  w: number,
  d: number,
  textures: PalaceTextureBank,
  bundle?: RoyalAssetBundle | null
): THREE.Group {
  const group = new THREE.Group();
  const targetSpan = Math.max(1.15, Math.min(w, d));

  const glb = bundle ? cloneAssetModel(bundle, 'PalacePillar', false) : null;
  if (glb) {
    const xzScale = Math.min(1.45, Math.max(0.85, targetSpan / 1.26));
    glb.scale.set(xzScale, 1.0, xzScale);
    group.add(glb);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: textures.softGlow,
        color: 0xff7b38,
        transparent: true,
        opacity: 0.86,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.set(2.4, 2.4, 1);
    glow.position.set(0, 2.28, 1.0 * xzScale);
    group.add(glow);
    return group;
  }

  // Fallback while GLB streams
  const radius = Math.max(0.45, Math.min(w, d) * 0.45);
  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.86, radius * 0.94, 3.1, 14),
    new THREE.MeshStandardMaterial({ color: 0x8f1d18, roughness: 0.35 })
  );
  col.position.y = 1.55;
  group.add(col);
  enableShadows(col, true, true);
  return group;
}

/**
 * Breakable Gilded Nanmu Secret Vault Wall (锡晋斋金丝楠木夹墙) with Wood PBR Normal Relief
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
      normalMap: textures.woodPbr.normalMap,
      normalScale: new THREE.Vector2(0.75, 0.75),
      emissive: 0x7a4208,
      emissiveIntensity: 0.45,
      roughness: 0.42,
      metalness: 0.28,
    })
  );
  wall.position.y = h / 2;
  group.add(wall);

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
 * Animated Flickering Bronze Courtyard Brazier from Blender 5.2 Brazier.glb (青铜三足鼎火盆)
 */
export function createBrazierRig(
  textures: PalaceTextureBank,
  withLight: boolean,
  bundle?: RoyalAssetBundle | null
): BrazierRig {
  const root = new THREE.Group();

  const glb = bundle ? cloneAssetModel(bundle, 'Brazier', false) : null;
  if (glb) {
    root.add(glb);
  } else {
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.34, 0.85, 12),
      new THREE.MeshStandardMaterial({ color: 0x3b3024, roughness: 0.45, metalness: 0.78 })
    );
    bowl.position.y = 0.45;
    root.add(bowl);
  }

  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.86, 9),
    new THREE.MeshBasicMaterial({
      color: 0xff7b1a,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  flameOuter.position.y = 1.42;
  root.add(flameOuter);

  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.56, 8),
    new THREE.MeshBasicMaterial({
      color: 0xfff0a0,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  flameInner.position.y = 1.32;
  root.add(flameInner);

  const glowSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.softGlow,
      color: 0xff932e,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glowSprite.scale.set(3.2, 3.2, 1);
  glowSprite.position.y = 1.4;
  root.add(glowSprite);

  let light: THREE.PointLight | null = null;
  if (withLight) {
    light = new THREE.PointLight(0xff8c2b, 10.5, 17, 1.45);
    light.position.y = 1.85;
    root.add(light);
  }

  return { root, flameOuter, flameInner, glowSprite, light };
}

/**
 * Moored Sculpted 3D Wupeng Escape Boat from Blender 5.2 WupengBoat.glb (江南月夜乌篷快船)
 */
export function createWupengBoatRig(
  textures: PalaceTextureBank,
  bundle?: RoyalAssetBundle | null
): THREE.Group {
  const boat = new THREE.Group();

  const glb = bundle ? cloneAssetModel(bundle, 'WupengBoat', false) : null;
  if (glb) {
    boat.add(glb);
  } else {
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.56, 1.55),
      new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.65 })
    );
    hull.position.y = 0.25;
    boat.add(hull);
  }

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
  glow.position.set(2.68, 1.48, 0);
  boat.add(glow);

  const boatLight = new THREE.PointLight(0x34d399, 8.2, 14, 1.45);
  boatLight.position.set(2.6, 1.65, 0);
  boat.add(boatLight);

  return boat;
}

/**
 * Sculpted Qing Courtyard Ancient Pine from Blender 5.2 PalaceTree.glb (王府月夜古松)
 */
export function createPineTreeMesh(bundle?: RoyalAssetBundle | null): THREE.Group {
  const glb = bundle ? cloneAssetModel(bundle, 'PalaceTree', false) : null;
  if (glb) return glb;

  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.36, 2.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a261b, roughness: 0.9 })
  );
  trunk.position.y = 1.3;
  tree.add(trunk);
  return tree;
}

/**
 * Real Poly Haven CC0 Mossy Garden Boulder from GardenRock.glb (太湖苔藓假山石)
 */
export function createGardenRockMesh(bundle?: RoyalAssetBundle | null): THREE.Group | null {
  return bundle ? cloneAssetModel(bundle, 'GardenRock', false) : null;
}

/**
 * Sculpted Courtyard Stone Lantern from Blender 5.2 StoneLantern.glb (庭院古石灯笼)
 */
export function createStoneLanternMesh(
  textures: PalaceTextureBank,
  bundle?: RoyalAssetBundle | null
): THREE.Group | null {
  const glb = bundle ? cloneAssetModel(bundle, 'StoneLantern', false) : null;
  if (!glb) return null;
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.softGlow,
      color: 0xffb84d,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(2.1, 2.1, 1);
  glow.position.set(0, 1.5, 0);
  glb.add(glow);
  return glb;
}
