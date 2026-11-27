import * as THREE from 'three';

export interface PalaceTextureBank {
  courtyard: THREE.Texture;
  carpet: THREE.Texture;
  water: THREE.Texture;
  roof: THREE.Texture;
  palaceWall: THREE.CanvasTexture;
  screenArt: THREE.CanvasTexture;
  secretWall: THREE.CanvasTexture;
  woodDeck: THREE.CanvasTexture;
  marbleBase: THREE.CanvasTexture;
  softGlow: THREE.CanvasTexture;
  smokePuff: THREE.CanvasTexture;
  dispose: () => void;
}

function configureRepeatingTexture(tex: THREE.Texture, repeatX: number, repeatY: number, anisotropy: number) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
}

/**
 * Rich Qing Forbidden-City vermilion plaster wall with upper carved eaves frieze & subtle weathering
 */
function createPalaceWallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Base imperial vermilion gradient (darker moisture near bottom plinth)
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#5A1B16');
  g.addColorStop(0.16, '#7C231C');
  g.addColorStop(0.75, '#6B1C16');
  g.addColorStop(1, '#3B120F');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle vertical plaster patina & aged brick courses
  ctx.strokeStyle = 'rgba(25, 6, 4, 0.22)';
  ctx.lineWidth = 1.5;
  for (let y = 44; y < 230; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
    const off = ((y / 22) % 2) * 32;
    for (let x = off; x < 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 22);
      ctx.stroke();
    }
  }

  // Painted dark-teal & gold Qing DouGong eaves beam band at the top
  ctx.fillStyle = '#18302E';
  ctx.fillRect(0, 0, 512, 34);
  ctx.fillStyle = '#D99B38';
  ctx.fillRect(0, 32, 512, 5);
  ctx.fillRect(0, 4, 512, 3);

  // Repeating gold key-fret / lotus architrave motifs
  ctx.strokeStyle = '#E5B454';
  ctx.lineWidth = 2;
  for (let x = 16; x < 512; x += 64) {
    ctx.strokeRect(x, 10, 32, 18);
    ctx.fillStyle = '#8F261D';
    ctx.fillRect(x + 6, 14, 20, 10);
    ctx.fillStyle = '#F3C969';
    ctx.fillRect(x + 13, 17, 6, 4);
  }

  // Carved grey stone dado strip along bottom
  ctx.fillStyle = '#4B4E56';
  ctx.fillRect(0, 224, 512, 32);
  ctx.fillStyle = '#6D717C';
  ctx.fillRect(0, 224, 512, 5);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Ornate gilded Qing folding screen panel (crimson lacquer border + golden cloud/mountain ink relief)
 */
function createScreenArtTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Lacquer wood surround
  ctx.fillStyle = '#2B110D';
  ctx.fillRect(0, 0, 512, 256);

  // 4 Folding panels
  const pw = 114;
  for (let i = 0; i < 4; i++) {
    const x0 = 12 + i * 124;
    // Silk gold-ochre backdrop
    const sg = ctx.createLinearGradient(x0, 16, x0, 240);
    sg.addColorStop(0, '#3C2819');
    sg.addColorStop(0.55, '#593C22');
    sg.addColorStop(1, '#2D1D12');
    ctx.fillStyle = sg;
    ctx.fillRect(x0, 16, pw, 224);

    // Inner gold frame
    ctx.strokeStyle = '#DFAA46';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0 + 4, 20, pw - 8, 216);

    // Stylized golden mountains & pine silhouettes
    ctx.fillStyle = 'rgba(235, 185, 84, 0.32)';
    ctx.beginPath();
    ctx.moveTo(x0 + 8, 228);
    ctx.lineTo(x0 + pw * 0.35, 130 - (i % 2) * 28);
    ctx.lineTo(x0 + pw * 0.72, 168);
    ctx.lineTo(x0 + pw - 8, 108 + (i % 2) * 24);
    ctx.lineTo(x0 + pw - 8, 228);
    ctx.closePath();
    ctx.fill();

    // Moon / cloud emblem
    ctx.strokeStyle = 'rgba(251, 211, 121, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x0 + pw / 2, 74 + (i % 2) * 14, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Brass hinge accents
    ctx.fillStyle = '#E8B84B';
    ctx.fillRect(x0 - 5, 55, 6, 14);
    ctx.fillRect(x0 - 5, 185, 6, 14);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Breakable Gilded Nanmu Secret Vault Wall (金丝楠木夹墙 with glowing golden fracture seams & brass dragon studs)
 */
function createSecretWallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Golden Nanmu wood base
  const g = ctx.createLinearGradient(0, 0, 512, 256);
  g.addColorStop(0, '#5A3416');
  g.addColorStop(0.5, '#7A471E');
  g.addColorStop(1, '#4A2910');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  // Vertical wood planks & recessed gilded frames
  for (let x = 0; x < 512; x += 64) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, 0, 3, 256);
    ctx.strokeStyle = '#C99335';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 8, 18, 48, 220);
  }

  // Heavy gold border + central seal emblem
  ctx.strokeStyle = '#F5B94B';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 240);

  // Luminous golden fracture cracks hinting it can be pried open!
  ctx.strokeStyle = '#FDE047';
  ctx.shadowColor = '#F59E0B';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(256, 8);
  ctx.lineTo(244, 72);
  ctx.lineTo(268, 128);
  ctx.lineTo(248, 190);
  ctx.lineTo(260, 248);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(268, 128);
  ctx.lineTo(318, 108);
  ctx.moveTo(244, 72);
  ctx.lineTo(192, 96);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Brass door studs
  ctx.fillStyle = '#FBBF24';
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 8; col++) {
      ctx.beginPath();
      ctx.arc(32 + col * 64, 52 + r * 76, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Weathered wooden pier deck planks for the canal escape dock
 */
function createWoodDeckTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#3E281B';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = y % 64 === 0 ? '#4B3121' : '#3A2518';
    ctx.fillRect(0, y + 2, 256, 28);
    ctx.fillStyle = '#1D120C';
    ctx.fillRect(0, y, 256, 3);
    // Nail heads
    ctx.fillStyle = '#7C6958';
    ctx.fillRect(14, y + 12, 4, 4);
    ctx.fillRect(236, y + 12, 4, 4);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Carved White Marble Plinth (汉白玉须弥座)
 */
function createMarbleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#D7D5CE');
  g.addColorStop(0.5, '#BAB7AE');
  g.addColorStop(1, '#8F8D86');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);

  ctx.strokeStyle = 'rgba(70, 68, 62, 0.45)';
  ctx.lineWidth = 3;
  for (let x = 0; x < 256; x += 64) {
    ctx.strokeRect(x + 6, 14, 52, 100);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft radial glow sprite texture for lanterns, braziers, fireflies, and aura decals
 */
function createSoftGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.28, 'rgba(255,235,190,0.75)');
  g.addColorStop(0.62, 'rgba(255,170,60,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Fluffy painterly wuxia incense smoke puff texture (replaces solid geometric spheres!)
 */
function createSmokePuffTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const lobes = [
    [128, 128, 86, 0.42],
    [94, 118, 62, 0.32],
    [164, 122, 60, 0.3],
    [126, 92, 58, 0.28],
    [120, 158, 56, 0.26],
  ];
  for (const [x, y, r, a] of lobes) {
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, `rgba(218, 228, 244, ${a})`);
    g.addColorStop(0.5, `rgba(148, 168, 198, ${a * 0.55})`);
    g.addColorStop(1, 'rgba(90, 110, 140, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPalaceTextureBank(renderer: THREE.WebGLRenderer): PalaceTextureBank {
  const loader = new THREE.TextureLoader();
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const courtyard = loader.load('./assets/tile_courtyard.webp');
  configureRepeatingTexture(courtyard, 14, 11, maxAniso);

  const carpet = loader.load('./assets/tile_carpet.webp');
  configureRepeatingTexture(carpet, 3, 2, maxAniso);

  const water = loader.load('./assets/tile_water.webp');
  configureRepeatingTexture(water, 10, 4, maxAniso);

  const roof = loader.load('./assets/tile_roof.webp');
  configureRepeatingTexture(roof, 4, 1, maxAniso);

  const palaceWall = createPalaceWallTexture();
  palaceWall.anisotropy = maxAniso;

  const screenArt = createScreenArtTexture();
  screenArt.anisotropy = maxAniso;

  const secretWall = createSecretWallTexture();
  secretWall.anisotropy = maxAniso;

  const woodDeck = createWoodDeckTexture();
  woodDeck.repeat.set(3, 2);
  woodDeck.anisotropy = maxAniso;

  const marbleBase = createMarbleTexture();
  marbleBase.anisotropy = maxAniso;

  const softGlow = createSoftGlowTexture();
  const smokePuff = createSmokePuffTexture();

  return {
    courtyard,
    carpet,
    water,
    roof,
    palaceWall,
    screenArt,
    secretWall,
    woodDeck,
    marbleBase,
    softGlow,
    smokePuff,
    dispose() {
      [
        courtyard,
        carpet,
        water,
        roof,
        palaceWall,
        screenArt,
        secretWall,
        woodDeck,
        marbleBase,
        softGlow,
        smokePuff,
      ].forEach((t) => t.dispose());
    },
  };
}
