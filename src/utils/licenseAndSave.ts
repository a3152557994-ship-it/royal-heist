import * as ed from '@noble/ed25519';
import { PersistentProfile } from '../types/game';

/**
 * Official OPC-Matrix Ed25519 SPKI Public Key
 * Matches /Users/wang/OPC/projects/ai-20-matrix/bin/issue-license.mjs
 */
export const PUBLIC_SPKI_BASE64 = 'MCowBQYDK2VwAyEAP5NCVP7CT0tgaGLSGMe4r87SjYRWTM6gN6igBZYSXys=';
export const PRODUCT_SLUG = 'royal-heist';

export const IS_PURE_PLATFORM_MODE: boolean = __PURE_MODE__;

const STORAGE_PRIMARY = 'royal_heist_profile_v1';
const STORAGE_BACKUP = 'royal_heist_profile_backup_v1';

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function getRawEd25519PubKey(): Uint8Array {
  const spki = fromBase64Url(PUBLIC_SPKI_BASE64.replace(/\+/g, '-').replace(/\//g, '_'));
  // Ed25519 SubjectPublicKeyInfo is 44 bytes; the last 32 bytes are the raw public key
  return spki.slice(spki.length - 32);
}

export interface LicenseVerifyResult {
  valid: boolean;
  reason?: string;
  payload?: {
    v: number;
    p: string;
    e: string;
    plan: string;
    iat: number;
    exp: number;
  };
}

export async function verifyOpcLicenseToken(token: string): Promise<LicenseVerifyResult> {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'EMPTY' };
  }
  const clean = token.trim();
  const parts = clean.split('.');
  if (parts.length !== 3 || parts[0] !== 'OPC1') {
    return { valid: false, reason: '格式错误：请输入以 OPC1. 开头的官方防伪激活码' };
  }
  try {
    const [, payloadB64, sigB64] = parts;
    const msgBytes = new TextEncoder().encode(`OPC1.${payloadB64}`);
    const sigBytes = fromBase64Url(sigB64);
    const rawPub = getRawEd25519PubKey();

    const ok = await ed.verifyAsync(sigBytes, msgBytes, rawPub);
    if (!ok) {
      return { valid: false, reason: '防伪签名校验未通过，请核对激活码是否完整复制' };
    }

    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(payloadJson);

    if (payload.p !== PRODUCT_SLUG && payload.p !== '*') {
      return { valid: false, reason: `该激活码归属其他产品 (${payload.p})` };
    }
    if (payload.exp && payload.exp > 0 && Math.floor(Date.now() / 1000) > payload.exp) {
      return { valid: false, reason: '该激活码已过期' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: '激活码解析异常，请完整粘贴整串 OPC1. 授权码' };
  }
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function randomUid(): string {
  return String(100000 + Math.floor(Math.random() * 899999));
}

export function createDefaultProfile(): PersistentProfile {
  return {
    version: 1,
    playerUid: randomUid(),
    vaultSilverWan: 0,
    estateLevel: 0,
    totalRuns: 0,
    totalEscapes: 0,
    bestSingleRunWan: 0,
    freeRewindPills: 2,
    freeExcuseLeftToday: 3,
    lastDailyReset: todayStr(),
    unlockedAchievements: [],
    proLicenseToken: null,
    proActivatedAt: null,
    godModeConfig: {
      bonusStartSilverWan: false,
      slowIncense: false,
      extraRelicSlot: false,
    },
  };
}

export function loadProfile(): PersistentProfile {
  const base = createDefaultProfile();
  if (typeof window === 'undefined') return base;
  const raw = localStorage.getItem(STORAGE_PRIMARY) || localStorage.getItem(STORAGE_BACKUP);
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistentProfile>;
    const merged: PersistentProfile = {
      ...base,
      ...parsed,
      godModeConfig: {
        ...base.godModeConfig,
        ...(parsed.godModeConfig || {}),
      },
    };
    if (merged.lastDailyReset !== todayStr()) {
      merged.lastDailyReset = todayStr();
      merged.freeExcuseLeftToday = Math.max(merged.freeExcuseLeftToday, 3);
      merged.freeRewindPills = Math.max(merged.freeRewindPills, 1);
    }
    return merged;
  } catch {
    return base;
  }
}

export function saveProfile(profile: PersistentProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem(STORAGE_PRIMARY, serialized);
    localStorage.setItem(STORAGE_BACKUP, serialized);
  } catch {
    // ignore storage quota errors
  }
}

function checksum32(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

/**
 * Exports a tamper-checked cross-device migration code so players NEVER lose progress
 * (Directly solves the #1 1-star complaint in competitor App Store reviews!)
 */
export function exportSaveTransferCode(profile: PersistentProfile): string {
  const json = JSON.stringify(profile);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const sum = checksum32(b64);
  return `RHSAVE1.${sum}.${b64}`;
}

export async function importSaveTransferCode(
  code: string
): Promise<{ ok: boolean; profile?: PersistentProfile; error?: string }> {
  const clean = code.trim();
  const parts = clean.split('.');
  if (parts.length !== 3 || parts[0] !== 'RHSAVE1') {
    return { ok: false, error: '跨端存档码格式错误（应以 RHSAVE1. 开头）' };
  }
  const [, sum, b64] = parts;
  if (checksum32(b64) !== sum) {
    return { ok: false, error: '存档码校验失败，可能复制漏了末尾字符' };
  }
  try {
    const bytes = fromBase64Url(b64);
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as PersistentProfile;
    if (typeof parsed.vaultSilverWan !== 'number') {
      return { ok: false, error: '存档数据结构无效' };
    }
    // Strictly re-verify Ed25519 signature if proLicenseToken is present to block save-forging bypass!
    if (parsed.proLicenseToken) {
      const licCheck = await verifyOpcLicenseToken(parsed.proLicenseToken);
      if (!licCheck.valid) {
        return { ok: false, error: '存档内附带的授权码未通过 Ed25519 防伪验签，拒绝导入伪造特权' };
      }
    }
    return { ok: true, profile: { ...createDefaultProfile(), ...parsed } };
  } catch {
    return { ok: false, error: '存档码解码失败' };
  }
}
