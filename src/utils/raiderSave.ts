import { RaiderProfile } from '../types/raid';
import { verifyOpcLicenseToken, IS_PURE_PLATFORM_MODE } from './licenseAndSave';

export { verifyOpcLicenseToken, IS_PURE_PLATFORM_MODE };

const SAVE_KEY = 'royal_heist_action_v2';
const SAVE_BACKUP = 'royal_heist_action_v2_bak';

export const UPGRADE_TIERS = {
  bagLevel: [
    { costWan: 0, label: '4×4 粗布夜行包 (16格)' },
    { costWan: 120, label: '5×4 牛皮暗袋包 (20格)' },
    { costWan: 580, label: '5×5 乾坤百宝囊 (25格)' },
    { costWan: 1800, label: '6×5 搬山宗师巨囊 (30格)' },
  ],
  bootsLevel: [
    { costWan: 0, label: '草编快靴 (标准移速)' },
    { costWan: 90, label: '踏雪软底靴 (移速+14% · 抗负重)' },
    { costWan: 420, label: '神行千里靴 (移速+28% · 大幅抗沉)' },
    { costWan: 1400, label: '水上漂魅影靴 (移速+42% · 背大金如飞)' },
  ],
  armorLevel: [
    { costWan: 0, label: '夜行黑衣 (3颗心❤️)' },
    { costWan: 110, label: '牛皮护心镜 (4颗心❤️)' },
    { costWan: 480, label: '天蚕金丝甲 (5颗心❤️)' },
    { costWan: 1500, label: '大内软猬宝甲 (6颗心❤️)' },
  ],
  gloveLevel: [
    { costWan: 0, label: '铁丝撬针 (标准开箱)' },
    { costWan: 100, label: '鲁班巧手钳 (开箱快25% · 爆率+)' },
    { costWan: 460, label: '发丘探金爪 (开箱快45% · 爆大金+)' },
    { costWan: 1600, label: '摸金校尉圣手 (秒开金柜 · 大红率暴涨)' },
  ],
};

export function createDefaultRaider(): RaiderProfile {
  return {
    version: 2,
    playerUid: String(100000 + Math.floor(Math.random() * 899999)),
    vaultSilverWan: 0,
    totalRaids: 0,
    totalEscapes: 0,
    bestRaidWan: 0,
    mythicsFound: 0,
    freeRevivePills: 2,
    upgrades: {
      bagLevel: 0,
      bootsLevel: 0,
      armorLevel: 0,
      gloveLevel: 0,
    },
    proLicenseToken: null,
    proActivatedAt: null,
    godMode: {
      xrayMythicVision: false,
      featherWeight: false,
      infiniteTools: false,
    },
  };
}

export function loadRaiderProfile(): RaiderProfile {
  const base = createDefaultRaider();
  if (typeof window === 'undefined') return base;
  const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(SAVE_BACKUP);
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<RaiderProfile>;
    return {
      ...base,
      ...parsed,
      upgrades: { ...base.upgrades, ...(parsed.upgrades || {}) },
      godMode: { ...base.godMode, ...(parsed.godMode || {}) },
    };
  } catch {
    return base;
  }
}

export function saveRaiderProfile(p: RaiderProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const s = JSON.stringify(p);
    localStorage.setItem(SAVE_KEY, s);
    localStorage.setItem(SAVE_BACKUP, s);
  } catch {
    // ignore
  }
}

function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

export function exportRaiderSaveCode(p: RaiderProfile): string {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `RHSAVE2.${checksum(b64)}.${b64}`;
}

export async function importRaiderSaveCode(
  code: string
): Promise<{ ok: boolean; profile?: RaiderProfile; error?: string }> {
  const clean = code.trim();
  const parts = clean.split('.');
  if (parts.length !== 3 || parts[0] !== 'RHSAVE2') {
    return { ok: false, error: '存档码格式错误（应以 RHSAVE2. 开头）' };
  }
  const [, sum, b64] = parts;
  if (checksum(b64) !== sum) {
    return { ok: false, error: '存档码校验失败，请完整复制' };
  }
  try {
    const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as RaiderProfile;
    if (typeof parsed.vaultSilverWan !== 'number') {
      return { ok: false, error: '存档内容异常' };
    }
    if (IS_PURE_PLATFORM_MODE) {
      parsed.proLicenseToken = null;
      parsed.proActivatedAt = null;
    } else if (parsed.proLicenseToken) {
      const chk = await verifyOpcLicenseToken(parsed.proLicenseToken);
      if (!chk.valid) {
        return { ok: false, error: '存档内激活码未通过 Ed25519 防伪校验' };
      }
    }
    return { ok: true, profile: { ...createDefaultRaider(), ...parsed } };
  } catch {
    return { ok: false, error: '存档解析失败' };
  }
}
