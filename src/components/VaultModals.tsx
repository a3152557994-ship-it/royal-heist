import React, { useState } from 'react';
import { X, Building2, Award, Crown, Copy, Check, KeyRound, Upload, Sparkles } from 'lucide-react';
import { ACHIEVEMENTS, ESTATES, formatSilver, tText } from '../engine/gameData';
import { Lang, PersistentProfile } from '../types/game';
import {
  exportSaveTransferCode,
  importSaveTransferCode,
  IS_PURE_PLATFORM_MODE,
  verifyOpcLicenseToken,
} from '../utils/licenseAndSave';
import { sound } from '../audio/soundEngine';

interface VaultModalsProps {
  isOpen: boolean;
  initialTab: 'estates' | 'achievements' | 'pro';
  profile: PersistentProfile;
  lang: Lang;
  onClose: () => void;
  onUpgradeEstate: (level: number, costWan: number) => void;
  onActivatePro: (token: string) => void;
  onToggleGodMode: (key: keyof PersistentProfile['godModeConfig']) => void;
  onRestoreProfile: (next: PersistentProfile) => void;
}

export const VaultModals: React.FC<VaultModalsProps> = ({
  isOpen,
  initialTab,
  profile,
  lang,
  onClose,
  onUpgradeEstate,
  onActivatePro,
  onToggleGodMode,
  onRestoreProfile,
}) => {
  const [tab, setTab] = useState<'estates' | 'achievements' | 'pro'>(initialTab);
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseMsg, setLicenseMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedSave, setCopiedSave] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const isPro = Boolean(profile.proLicenseToken);

  const handleVerifyLicense = async () => {
    sound.playTap();
    const res = await verifyOpcLicenseToken(licenseInput);
    if (res.valid) {
      sound.playCashOutGong();
      onActivatePro(licenseInput.trim());
      setLicenseMsg({ ok: true, text: '🎉 传国玉玺防伪验签通过！大内总管终身金手指已永久激活！' });
      setLicenseInput('');
    } else {
      setLicenseMsg({ ok: false, text: res.reason || '激活码无效' });
    }
  };

  const handleCopySave = () => {
    const code = exportSaveTransferCode(profile);
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedSave(true);
    setTimeout(() => setCopiedSave(false), 2500);
  };

  const handleImportSave = () => {
    const res = importSaveTransferCode(importInput);
    if (res.ok && res.profile) {
      sound.playCashOutGong();
      onRestoreProfile(res.profile);
      setImportMsg('✅ 跨端存档与特权已无损恢复！');
      setImportInput('');
    } else {
      setImportMsg(`❌ ${res.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl wood-panel gold-border-glow overflow-hidden my-auto max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-amber-500/20 bg-black/40">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm text-amber-100">
              {lang === 'zh' ? '南洋暗庄金库 · 功勋与跨端密档' : 'Permanent Vault, Relics & Save Sync'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-900 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-stone-950/80 border-b border-stone-800 text-xs font-bold">
          <button
            onClick={() => setTab('estates')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'estates' ? 'bg-amber-500 text-black' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '置办私邸' : 'Estates'}</span>
          </button>
          <button
            onClick={() => setTab('achievements')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'achievements' ? 'bg-amber-500 text-black' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>
              {lang === 'zh' ? '史官图鉴' : 'Medals'} ({profile.unlockedAchievements.length}/{ACHIEVEMENTS.length})
            </span>
          </button>
          <button
            onClick={() => setTab('pro')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'pro' ? 'bg-amber-500 text-black' : 'text-amber-300 hover:text-amber-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{IS_PURE_PLATFORM_MODE ? '跨端存档' : lang === 'zh' ? '金手指&存档' : 'God Mode'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {tab === 'estates' && (
            <>
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-amber-200/70">
                    {lang === 'zh' ? '已安全洗白落袋总金库' : 'Safely Banked Vault Silver'}
                  </div>
                  <div className="text-xl font-extrabold text-amber-400">
                    {formatSilver(profile.vaultSilverWan, lang)}
                  </div>
                </div>
                <div className="text-right text-xs text-stone-300">
                  <div>
                    {lang === 'zh' ? '当前宅邸品阶' : 'Current Estate'}: Lv.{profile.estateLevel}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {lang === 'zh' ? `最高单局：${formatSilver(profile.bestSingleRunWan, lang)}` : `Best Run: ${formatSilver(profile.bestSingleRunWan, lang)}`}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {ESTATES.map((est) => {
                  const owned = profile.estateLevel >= est.level;
                  const isNext = profile.estateLevel + 1 === est.level;
                  const canAfford = profile.vaultSilverWan >= est.costWan;
                  return (
                    <div
                      key={est.id}
                      className={`rounded-xl p-3 border flex items-center justify-between gap-3 ${
                        owned
                          ? 'bg-amber-950/25 border-amber-500/40'
                          : 'bg-stone-900/70 border-stone-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-amber-100 flex items-center gap-2">
                          <span>Lv.{est.level} · {tText(est.name, lang)}</span>
                          {owned && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {lang === 'zh' ? '已置办' : 'Owned'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-300">{tText(est.perkDesc, lang)}</p>
                      </div>
                      {!owned && (
                        <button
                          disabled={!isNext || !canAfford}
                          onClick={() => {
                            sound.playCashOutGong();
                            onUpgradeEstate(est.level, est.costWan);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-black font-bold text-xs shrink-0 cursor-pointer"
                        >
                          {formatSilver(est.costWan, lang)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'achievements' && (
            <div className="grid grid-cols-1 gap-2.5">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = profile.unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl p-3 border ${
                      unlocked
                        ? 'bg-amber-950/30 border-amber-400/50'
                        : 'bg-stone-900/60 border-stone-800 opacity-85'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-100">
                        {unlocked ? '🏆 ' : '🔒 '}
                        {tText(ach.name, lang)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/50 text-stone-400">
                        {unlocked ? (lang === 'zh' ? '已达成' : 'Unlocked') : lang === 'zh' ? '未解锁' : 'Locked'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 mt-1">{tText(ach.clue, lang)}</p>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'pro' && (
            <div className="space-y-4">
              {!IS_PURE_PLATFORM_MODE && (
                <div className="rounded-xl p-3.5 bg-gradient-to-br from-amber-950/50 via-stone-900 to-stone-950 border border-amber-400/45 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-300">
                        {lang === 'zh'
                          ? '👑 大内总管 · 官方金手指终身授权'
                          : '👑 Grand Chamberlain God-Mode Pass'}
                      </h4>
                      <p className="text-[11px] text-stone-300 mt-0.5">
                        {lang === 'zh'
                          ? '主线三大名角 100% 免费畅玩！解锁授权一次买断四大逆天爽感特权：'
                          : 'Core game is 100% free! Unlock lifetime God-Mode perks once & forever:'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-black font-extrabold text-xs shrink-0">
                      {isPro ? (lang === 'zh' ? '已永久激活' : 'ACTIVE') : lang === 'zh' ? '终身买断' : 'LIFETIME'}
                    </span>
                  </div>

                  <ul className="text-xs text-amber-100/90 space-y-1.5 pl-1">
                    <li>✨ <b>无限【金蝉脱壳时光回溯】</b>：断香被抄家瞬间可无限悔棋退回上一更安全装船！</li>
                    <li>✨ <b>官方内置金手指开关</b>：自由开启「开局直拨300万两 / 龙涎香耐烧+40% / 红颜槽+1」！</li>
                    <li>✨ <b>查账轮盘每局赠透视镜 + 无限次亲笔御前忽悠</b>！</li>
                    <li>✨ <b>战报专属【受命于天】鎏金玉玺大印</b>，群聊晒图排面拉满！</li>
                  </ul>

                  {/* God Mode Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {[
                      { key: 'bonusStartSilverWan' as const, label: '开局直拨 300万两' },
                      { key: 'slowIncense' as const, label: '龙涎香耐烧 +40%' },
                      { key: 'extraRelicSlot' as const, label: '红颜神印槽 +1' },
                    ].map((g) => (
                      <button
                        key={g.key}
                        disabled={!isPro}
                        onClick={() => {
                          sound.playTap();
                          onToggleGodMode(g.key);
                        }}
                        className={`p-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          profile.godModeConfig[g.key] && isPro
                            ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                            : 'bg-black/50 border-stone-700 text-stone-400 disabled:opacity-50'
                        }`}
                      >
                        {profile.godModeConfig[g.key] && isPro ? '✅ ' : '⬜ '}
                        {g.label}
                      </button>
                    ))}
                  </div>

                  {!isPro && (
                    <div className="space-y-2 pt-2 border-t border-amber-500/20">
                      <label className="block text-[11px] text-amber-200/80 font-semibold">
                        <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                        粘贴 `OPC1.` 官方 Ed25519 防伪授权码秒激活（闲鱼/小红书自动发货 ¥12.9 ｜ 海外 $4.99）：
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={licenseInput}
                          onChange={(e) => setLicenseInput(e.target.value)}
                          placeholder="OPC1.eyJ2IjoxLCJwIjoicm95YWwtaGVpc3Qi..."
                          className="flex-1 rounded-lg bg-black/70 border border-stone-700 px-2.5 py-1.5 text-xs font-mono text-white"
                        />
                        <button
                          onClick={handleVerifyLicense}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 cursor-pointer"
                        >
                          验签激活
                        </button>
                      </div>
                      {licenseMsg && (
                        <p className={`text-xs ${licenseMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                          {licenseMsg.text}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Cross-Device Anti-Loss Save Backup (Fixes #1 Competitor 1-Star Bug!) */}
              <div className="rounded-xl p-3.5 bg-stone-900/80 border border-stone-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-200">
                    🛡️ 跨手机/电脑永不丢档备份码（毫秒级自动双备份已开启）
                  </h4>
                  <button
                    onClick={handleCopySave}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSave ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSave ? '已复制存档码' : '一键复制存档码'}</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    placeholder="换设备时在此粘贴 RHSAVE1. 开头的存档码无损还原金库与特权…"
                    className="flex-1 rounded-lg bg-black/60 border border-stone-700 px-2.5 py-1.5 text-xs font-mono text-white"
                  />
                  <button
                    onClick={handleImportSave}
                    disabled={!importInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>恢复</span>
                  </button>
                </div>
                {importMsg && <p className="text-xs text-amber-300">{importMsg}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
