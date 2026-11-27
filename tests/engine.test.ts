import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  canPlaceInBag,
  computeBagTotals,
  findAutoFitSlot,
  getBagDimensions,
  rollTreasureForChest,
  TREASURES,
} from '../src/engine/lootCatalog.ts';
import {
  castVisionRay,
  hasLineOfSight,
  RAID_MAPS,
  resolveCircleWalls,
} from '../src/engine/raidMaps.ts';
import {
  createDefaultRaider,
  exportRaiderSaveCode,
  importRaiderSaveCode,
  verifyOpcLicenseToken,
} from '../src/utils/raiderSave.ts';
import type { BagItem, RectWall } from '../src/types/raid.ts';

async function runTests() {
  console.log('1. Testing Spatial Tetris Backpack placement, rotation & encumbrance math...');
  const dims0 = getBagDimensions(0, false);
  assert.deepEqual(dims0, { cols: 4, rows: 4 }, 'Lv.0 bag must be 4x4');
  const dimsGod = getBagDimensions(0, true);
  assert.deepEqual(dimsGod, { cols: 6, rows: 5 }, 'God-mode bag must expand to 6x5');

  const bag: BagItem[] = [
    { uid: 'u1', defId: 'imperial_seal', gx: 0, gy: 0, rotated: false }, // 2x2 at (0,0)
  ];
  assert.equal(
    canPlaceInBag(bag, 4, 4, { defId: 'gold_abacus', gx: 1, gy: 1, rotated: false }),
    false,
    'Overlapping 2x2 seal must be rejected'
  );
  assert.equal(
    canPlaceInBag(bag, 4, 4, { defId: 'gold_abacus', gx: 2, gy: 0, rotated: false }),
    true,
    '2x1 gold abacus should fit cleanly at (2,0)'
  );

  // Test 90-degree auto-rotation fit: leave only a 1x3 vertical column at x=3 in a 4x4 grid
  const almostFullBag: BagItem[] = [
    { uid: 'a1', defId: 'gold_buddha', gx: 0, gy: 0, rotated: false }, // 2x3 at x=0..1, y=0..2
    { uid: 'a2', defId: 'porcelain_vase', gx: 2, gy: 0, rotated: false }, // 1x2 at x=2, y=0..1
    { uid: 'a3', defId: 'jade_ruyi', gx: 0, gy: 3, rotated: false }, // 2x1 at x=0..1, y=3
    { uid: 'a4', defId: 'jade_ruyi', gx: 2, gy: 3, rotated: false }, // 2x1 at x=2..3, y=3
    { uid: 'a5', defId: 'silver_ingot', gx: 2, gy: 2, rotated: false }, // 1x1 at x=2, y=2
  ];
  // jade_ruyi is 2x1 by default, so it CANNOT fit horizontally anywhere, MUST auto-rotate to 1x2 at x=3, y=0!
  const rotFit = findAutoFitSlot(almostFullBag, 4, 4, 'jade_ruyi');
  assert.ok(rotFit !== null, 'Auto-fit must find rotated 1x2 slot in remaining column x=3');
  assert.equal(rotFit!.gx, 3);
  assert.equal(rotFit!.rotated, true, '2x1 item must be rotated 90 degrees to fit vertical slot');

  const totals = computeBagTotals(bag);
  assert.equal(totals.totalValueWan, TREASURES.imperial_seal.valueWan);
  assert.equal(totals.mythicCount, 1);

  for (let i = 0; i < 30; i++) {
    const rolled = rollTreasureForChest('dragon_vault', 2);
    assert.ok(TREASURES[rolled], `Unknown rolled treasure: ${rolled}`);
  }

  console.log('2. Testing 2D Stealth Maps, Wall Collision Sliding & Raycast Lantern LOS...');
  for (const mapKey of Object.keys(RAID_MAPS) as Array<keyof typeof RAID_MAPS>) {
    const m = RAID_MAPS[mapKey];
    assert.ok(m.chests.length >= 8, `${mapKey} should have rich chest density`);
    assert.ok(m.guards.length >= 3, `${mapKey} should have active patrolling guards`);
    assert.ok(m.walls.some((w) => w.kind === 'secret_wall'), `${mapKey} must have a pryable secret vault wall`);

    // Regression check #1: Holding 'S' (walking straight south from spawn for 2 full seconds) must stop cleanly at dock!
    let walkPos = { x: m.spawn.x, y: m.spawn.y };
    for (let f = 0; f < 120; f++) {
      walkPos = resolveCircleWalls({ x: walkPos.x, y: walkPos.y + 220 * (1 / 60) }, 16, m.walls);
    }
    assert.ok(
      walkPos.y <= m.height - 50,
      `${mapKey} south dock must block walking off bottom edge (got y=${walkPos.y}, height=${m.height})`
    );

    // Regression check #2: Simulate 30s of every guard's patrol loop at 60fps to guarantee ZERO wall deadlocks!
    for (let gi = 0; gi < m.guards.length; gi++) {
      const gCfg = m.guards[gi];
      let gx = gCfg.waypoints[0].x;
      let gy = gCfg.waypoints[0].y;
      let wpIdx = 1 % gCfg.waypoints.length;
      let waypointTransitions = 0;
      const dt = 1 / 60;
      for (let step = 0; step < 60 * 30; step++) {
        const tgt = gCfg.waypoints[wpIdx];
        const dx = tgt.x - gx;
        const dy = tgt.y - gy;
        const dist = Math.hypot(dx, dy);
        if (dist > 8) {
          const moved = resolveCircleWalls(
            { x: gx + (dx / dist) * gCfg.speed * dt, y: gy + (dy / dist) * gCfg.speed * dt },
            17,
            m.walls
          );
          gx = moved.x;
          gy = moved.y;
        } else {
          wpIdx = (wpIdx + 1) % gCfg.waypoints.length;
          waypointTransitions += 1;
        }
      }
      assert.ok(
        waypointTransitions >= 2,
        `${mapKey} guard #${gi} got stuck on a wall (only ${waypointTransitions} waypoint transitions in 30s)`
      );
    }
  }

  const testWalls: RectWall[] = [
    { id: 'screen1', x: 100, y: 80, w: 40, h: 120, kind: 'screen' },
    { id: 'canal', x: 300, y: 80, w: 60, h: 120, kind: 'water' },
  ];
  // Circle collision pushes player out of solid screen
  const pushed = resolveCircleWalls({ x: 92, y: 120 }, 16, testWalls);
  assert.ok(pushed.x <= 84.01, `Player circle should be pushed left of wall x=100, got ${pushed.x}`);

  // Screen blocks guard LOS; water does NOT block guard LOS!
  assert.equal(
    hasLineOfSight({ x: 50, y: 120 }, { x: 200, y: 120 }, testWalls),
    false,
    'Carved screen must block guard lantern Line-of-Sight'
  );
  assert.equal(
    hasLineOfSight({ x: 260, y: 120 }, { x: 400, y: 120 }, testWalls),
    true,
    'Water canal must NOT block Line-of-Sight'
  );

  // Broken secret wall stops blocking LOS & movement
  const secretWall: RectWall[] = [
    { id: 'sec', x: 100, y: 80, w: 40, h: 40, kind: 'secret_wall', broken: true },
  ];
  assert.equal(
    hasLineOfSight({ x: 50, y: 100 }, { x: 200, y: 100 }, secretWall),
    true,
    'Pried-open secret wall must allow passage and sight'
  );

  const clippedHit = castVisionRay({ x: 50, y: 120 }, 0, 250, testWalls);
  assert.ok(clippedHit.x < 145, `Vision ray must clip against screen at x=100..140, got ${clippedHit.x}`);

  console.log('3. Testing RHSAVE2. Cross-Device Save Checksum & Anti-Forged-Pro Guard...');
  const raider = createDefaultRaider();
  raider.vaultSilverWan = 6880;
  raider.upgrades.bagLevel = 2;
  const saveCode = exportRaiderSaveCode(raider);
  assert.ok(saveCode.startsWith('RHSAVE2.'), 'v2 save code must use RHSAVE2. prefix');

  const restored = await importRaiderSaveCode(saveCode);
  assert.equal(restored.ok, true);
  assert.equal(restored.profile?.vaultSilverWan, 6880);
  assert.equal(restored.profile?.upgrades.bagLevel, 2);

  const tampered = await importRaiderSaveCode(saveCode.slice(0, -2) + 'ZZ');
  assert.equal(tampered.ok, false, 'Tampered RHSAVE2 checksum must be rejected');

  const spoofRaider = createDefaultRaider();
  spoofRaider.proLicenseToken = 'OPC1.forged.signature';
  const spoofCode = exportRaiderSaveCode(spoofRaider);
  const spoofCheck = await importRaiderSaveCode(spoofCode);
  assert.equal(spoofCheck.ok, false, 'RHSAVE2 containing forged proLicenseToken must be rejected');

  console.log('4. Testing Real Ed25519 OPC1. License Minting & Verification...');
  const realToken = execFileSync(
    'node',
    [
      '/Users/wang/OPC/projects/ai-20-matrix/bin/issue-license.mjs',
      '--product',
      'royal-heist',
      '--email',
      'raider@royalheist.local',
    ],
    { encoding: 'utf8' }
  ).trim();

  const validRes = await verifyOpcLicenseToken(realToken);
  assert.equal(validRes.valid, true, 'Authentic Ed25519 royal-heist token must pass');

  // Save code WITH a genuine Ed25519 token MUST restore cleanly!
  const genuineProRaider = createDefaultRaider();
  genuineProRaider.proLicenseToken = realToken;
  const genuineProSave = exportRaiderSaveCode(genuineProRaider);
  const genuineRestore = await importRaiderSaveCode(genuineProSave);
  assert.equal(genuineRestore.ok, true, 'RHSAVE2 with authentic Ed25519 token must restore cleanly');

  const wrongProductToken = execFileSync(
    'node',
    [
      '/Users/wang/OPC/projects/ai-20-matrix/bin/issue-license.mjs',
      '--product',
      'other-game',
      '--email',
      'raider@royalheist.local',
    ],
    { encoding: 'utf8' }
  ).trim();
  assert.equal((await verifyOpcLicenseToken(wrongProductToken)).valid, false);
  assert.equal((await verifyOpcLicenseToken(realToken.slice(0, -4) + 'AAAA')).valid, false);

  console.log('✅ ALL v2.0 STEALTH ENGINE, TETRIS BAG, RAYCAST LOS, RHSAVE2 & ED25519 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
