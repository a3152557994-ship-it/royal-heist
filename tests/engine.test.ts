import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  calculateWatchResolution,
  computeSuddenDeathRiskPercent,
  createAuditEncounter,
  DECK_POOL,
  drawHandCards,
  evaluateImperialExcuse,
  LORDS,
} from '../src/engine/gameData.ts';
import {
  createDefaultProfile,
  exportSaveTransferCode,
  importSaveTransferCode,
  verifyOpcLicenseToken,
} from '../src/utils/licenseAndSave.ts';

async function runTests() {
  console.log('1. Testing opening protection & sudden death curve...');
  assert.equal(computeSuddenDeathRiskPercent(100, 1), 0, 'Turn 1 full incense must have 0% cheap RNG death');
  assert.equal(computeSuddenDeathRiskPercent(0, 3), 100, '0% incense must be 100% death');
  assert.ok(computeSuddenDeathRiskPercent(25, 5) > 45, 'Low incense should carry high risk');

  console.log('2. Testing Balatro-style abacus synergy & consort multiplier math...');
  const duke = LORDS.find((l) => l.id === 'duke')!;
  const saltCard = DECK_POOL.find((c) => c.id === 'c_salt_ticket')!;
  const wildCard = DECK_POOL.find((c) => c.id === 'w_boil_inlaw')!;
  const coverCard = DECK_POOL.find((c) => c.id === 's_ginseng')!;

  const res = calculateWatchResolution({
    selectedCards: [saltCard, wildCard, coverCard],
    lord: duke,
    relicIds: ['rel_duke_harmony', 'con_princess', 'con_dancer'],
    greedStreakMult: 0.55,
    currentIncense: 80,
    currentWanted: 2.0,
    estateLevel: 2,
    lang: 'zh',
  });
  assert.ok(res.gainedSilverWan > 500, `Expected explosive combo > 500 wan, got ${res.gainedSilverWan}`);
  assert.ok(res.steps.length >= 5, 'Should log card + consort synergy steps');

  console.log('3. Testing Buckshot-Roulette Audit encounter & deterministic rhetorical combat...');
  const enc = createAuditEncounter(4.5, 4);
  assert.equal(enc.scrolls.length, 3);
  assert.equal(enc.scrolls.filter((s) => s.isDeadly).length, 2, 'High wanted should spawn 2 deadly scrolls');

  const censorBribe = evaluateImperialExcuse('给御史大人十万两黄金喝茶', 'censor');
  assert.equal(censorBribe.dismissedAll, false, 'Iron Censor must reject blatant bribes');
  assert.ok(censorBribe.wantedDelta > 0);

  const censorDuty = evaluateImperialExcuse('此乃暗中筹措的辽东前线军饷，皆为黎民百姓', 'censor');
  assert.equal(censorDuty.dismissedAll, true, 'Iron Censor should be moved by frontier defense duty');

  const eunuchBribe = evaluateImperialExcuse('给公公马车上备了三成白银干股孝敬', 'eunuch');
  assert.equal(eunuchBribe.dismissedAll, true, 'Greedy Eunuch should accept profit share');

  console.log('4. Testing cross-device save transfer checksum integrity...');
  const prof = createDefaultProfile();
  prof.vaultSilverWan = 3880.5;
  prof.estateLevel = 3;
  const code = exportSaveTransferCode(prof);
  const restored = importSaveTransferCode(code);
  assert.equal(restored.ok, true);
  assert.equal(restored.profile?.vaultSilverWan, 3880.5);
  assert.equal(restored.profile?.estateLevel, 3);

  const tamperedSave = importSaveTransferCode(code.slice(0, -2) + 'ZZ');
  assert.equal(tamperedSave.ok, false, 'Tampered save code must be rejected');

  console.log('5. Testing real Ed25519 OPC1. cryptographic license verification...');
  const realToken = execFileSync(
    'node',
    [
      '/Users/wang/OPC/projects/ai-20-matrix/bin/issue-license.mjs',
      '--product',
      'royal-heist',
      '--email',
      'test@royalheist.local',
    ],
    { encoding: 'utf8' }
  ).trim();

  const validCheck = await verifyOpcLicenseToken(realToken);
  assert.equal(validCheck.valid, true, `Valid Ed25519 token should pass: ${JSON.stringify(validCheck)}`);

  const wrongProdToken = execFileSync(
    'node',
    [
      '/Users/wang/OPC/projects/ai-20-matrix/bin/issue-license.mjs',
      '--product',
      'other-app',
      '--email',
      'test@royalheist.local',
    ],
    { encoding: 'utf8' }
  ).trim();
  const wrongCheck = await verifyOpcLicenseToken(wrongProdToken);
  assert.equal(wrongCheck.valid, false, 'Token for another product must be rejected');

  const forgedToken = realToken.slice(0, -4) + 'AAAA';
  const forgedCheck = await verifyOpcLicenseToken(forgedToken);
  assert.equal(forgedCheck.valid, false, 'Forged signature must be rejected');

  // Ensure hand draw respects relic slot caps
  const drawn = drawHandCards(['rel_duke_harmony', 'con_princess', 'con_dancer', 'con_assassin', 'con_merchant'], 5, 5);
  assert.equal(drawn.some((c) => Boolean(c.grantsRelicId)), false, 'Full relic slots should not draw duplicate relic cards');

  console.log('✅ ALL 11/11 ENGINE, MATH, SAVE & ED25519 LICENSE TESTS PASSED!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
