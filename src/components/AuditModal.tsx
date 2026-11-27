import React, { useEffect, useState } from 'react';
import { Eye, ShieldAlert, MessageSquareWarning, Coins, Sparkles, ScrollText } from 'lucide-react';
import { AuditEncounter, CheatItemId, Lang } from '../types/game';
import { formatSilver, tText } from '../engine/gameData';
import { sound } from '../audio/soundEngine';

interface AuditModalProps {
  encounter: AuditEncounter;
  unbankedSilverWan: number;
  items: Record<CheatItemId, number>;
  isPro: boolean;
  freeExcuseLeft: number;
  scapegoatArmed: boolean;
  peekedIndex: number | null;
  streamerMode: boolean;
  lang: Lang;
  onUseSpyglass: () => void;
  onUseScapegoat: () => void;
  onUseBribeTea: () => void;
  onSubmitExcuse: (text: string) => void;
  onPickScroll: (idx: number) => void;
}

const QUICK_EXCUSES_ZH = [
  '这八百万两是奴才替太上皇攒的修园子体己钱，谁敢动就是抗旨！',
  '公公辛劳，后院马车上备了三成干股孝敬您老人家喝茶！',
  '此乃臣暗中筹措的辽东前线军饷，皆为江山社稷与黎民百姓！',
  '百官行贿礼单全在夹墙里，真掀了桌子满朝王公谁也别想活！',
];

export const AuditModal: React.FC<AuditModalProps> = ({
  encounter,
  unbankedSilverWan,
  items,
  isPro,
  freeExcuseLeft,
  scapegoatArmed,
  peekedIndex,
  streamerMode,
  lang,
  onUseSpyglass,
  onUseScapegoat,
  onUseBribeTea,
  onSubmitExcuse,
  onPickScroll,
}) => {
  const [excuseDraft, setExcuseDraft] = useState('');
  const [pollCountdown, setPollCountdown] = useState(20);

  useEffect(() => {
    if (!streamerMode) return;
    setPollCountdown(20);
    const id = window.setInterval(() => {
      setPollCountdown((p) => (p > 0 ? p - 1 : 20));
    }, 1000);
    return () => clearInterval(id);
  }, [streamerMode, encounter]);

  const deadlyCount = encounter.scrolls.filter((s) => s.isDeadly && !s.revealed).length;
  const safeCount = encounter.scrolls.filter((s) => !s.isDeadly && !s.revealed).length;
  const bribeCostWan = Math.max(5, Math.round(unbankedSilverWan * 0.18 * 10) / 10);
  const canExcuse = !encounter.excuseUsed && (isPro || freeExcuseLeft > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl crimson-danger-glow bg-[#130808] text-amber-50 overflow-hidden shadow-2xl my-auto">
        {/* Top Inquisitor Banner */}
        <div className="relative flex items-center gap-3.5 p-4 bg-gradient-to-r from-red-950/90 via-[#1E0B0B] to-[#130808] border-b border-red-500/30">
          <img
            src="./assets/boss_inquisitor.webp"
            alt="Inquisitor"
            className="w-16 h-16 rounded-xl object-cover border-2 border-red-500/70 shrink-0 shadow-lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded bg-red-600 text-white animate-pulse">
                {lang === 'zh' ? '🚨 踹门突击查账' : '🚨 SNAP AUDIT ROULETTE'}
              </span>
              {streamerMode && (
                <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  🎥 弹幕公投 {pollCountdown}s
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-red-100 mt-1 truncate">
              {tText(encounter.inquisitorName, lang)}
            </h3>
            <p className="text-xs text-amber-200/80 mt-0.5">{tText(encounter.inquisitorRole, lang)}</p>
          </div>
        </div>

        <div className="p-4 space-y-3.5">
          {/* Accusation & Live Odds */}
          <div className="rounded-xl bg-black/45 border border-red-900/60 p-3 text-xs leading-relaxed text-stone-200">
            <p>{tText(encounter.accusation, lang)}</p>
            <div className="mt-2 pt-2 border-t border-red-950 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-red-400">
                💀 {lang === 'zh' ? `死罪铁证：${deadlyCount} 封` : `Deadly Proof: ${deadlyCount}`}
              </span>
              <span className="text-emerald-400">
                🛡️ {lang === 'zh' ? `平安空折：${safeCount} 封` : `Safe Blank: ${safeCount}`}
              </span>
              {scapegoatArmed && (
                <span className="text-amber-300">
                  🎭 {lang === 'zh' ? '替死鬼已顶缸护体！' : 'Scapegoat Active!'}
                </span>
              )}
            </div>
          </div>

          {encounter.excuseFeedback && (
            <div className="rounded-xl bg-amber-950/40 border border-amber-500/40 px-3 py-2 text-xs text-amber-200">
              {tText(encounter.excuseFeedback, lang)}
            </div>
          )}

          {/* 3 Buckshot-Roulette Sealed Scrolls */}
          <div className="grid grid-cols-3 gap-2.5">
            {encounter.scrolls.map((sc, idx) => {
              const isPeeked = peekedIndex === idx;
              return (
                <button
                  key={sc.index}
                  disabled={sc.revealed}
                  onClick={() => {
                    sound.playTap();
                    onPickScroll(idx);
                  }}
                  className={`relative group rounded-xl p-3 border text-center transition-all cursor-pointer ${
                    sc.revealed
                      ? 'opacity-40 bg-stone-900 border-stone-700 cursor-not-allowed'
                      : 'bg-gradient-to-b from-[#2A1210] to-[#170908] border-amber-500/40 hover:border-amber-400 hover:-translate-y-0.5 active:scale-95'
                  }`}
                >
                  {streamerMode && !sc.revealed && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-black font-extrabold text-[10px] whitespace-nowrap">
                      弹幕扣 {idx + 1}
                    </span>
                  )}
                  <ScrollText className="w-7 h-7 mx-auto text-amber-400 mb-1.5 group-hover:scale-110 transition" />
                  <div className="text-xs font-bold text-amber-100">{tText(sc.label, lang)}</div>
                  <div className="text-[10px] text-stone-400 mt-1">
                    {isPeeked ? (
                      <span className={sc.isDeadly ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {sc.isDeadly
                          ? lang === 'zh'
                            ? '【窥破：死罪铁证！】'
                            : '[DEADLY PROOF!]'
                          : lang === 'zh'
                          ? '【窥破：平安空折】'
                          : '[SAFE BLANK]'}
                      </span>
                    ) : lang === 'zh' ? (
                      '点击亲手拆封'
                    ) : (
                      'Tap to Unseal'
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cheat Items Row */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              disabled={(items.spyglass <= 0 && !isPro) || peekedIndex !== null}
              onClick={() => {
                sound.playTap();
                onUseSpyglass();
              }}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-stone-900/90 border border-stone-700 hover:border-amber-400/60 disabled:opacity-40 text-xs cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold text-sky-300">
                <Eye className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '怀表窥镜' : 'Spyglass'}</span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5">
                {isPro ? 'Pro 赠' : `剩余 ${items.spyglass}`}
              </span>
            </button>

            <button
              type="button"
              disabled={items.scapegoat <= 0 || scapegoatArmed}
              onClick={() => {
                sound.playTap();
                onUseScapegoat();
              }}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-stone-900/90 border border-stone-700 hover:border-amber-400/60 disabled:opacity-40 text-xs cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '替死鬼顶罪' : 'Scapegoat'}</span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5">剩余 {items.scapegoat}</span>
            </button>

            <button
              type="button"
              disabled={items.bribe_tea <= 0 || unbankedSilverWan < 8}
              onClick={() => {
                sound.playTap();
                onUseBribeTea();
              }}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-stone-900/90 border border-stone-700 hover:border-amber-400/60 disabled:opacity-40 text-xs cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold text-emerald-300">
                <Coins className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '封口茶退敌' : 'Bribe Tea'}</span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5">
                -{formatSilver(bribeCostWan, lang)} ({items.bribe_tea})
              </span>
            </button>
          </div>

          {/* Written Rhetorical Combat Box */}
          <div className="rounded-xl bg-stone-950/90 border border-amber-500/30 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <MessageSquareWarning className="w-3.5 h-3.5" />
                {lang === 'zh' ? '✍️ 亲笔话术忽悠钦差（对症下药可直接撤案！）' : '✍️ Outtalk the Inquisitor'}
              </span>
              <span className="text-[10px] text-stone-400">
                {isPro ? 'Pro 无限次' : `今日免费 ${freeExcuseLeft} 次`}
              </span>
            </div>

            {lang === 'zh' && !encounter.excuseUsed && (
              <div className="flex flex-wrap gap-1.5">
                {QUICK_EXCUSES_ZH.map((sample, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setExcuseDraft(sample)}
                    className="text-[10px] px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 cursor-pointer truncate max-w-full"
                  >
                    💡 {sample.slice(0, 18)}…
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={excuseDraft}
                disabled={!canExcuse}
                onChange={(e) => setExcuseDraft(e.target.value)}
                placeholder={
                  lang === 'zh'
                    ? '看准钦差弱点输入辩词（搬出皇上/塞干股/百官黑账/前线军饷）…'
                    : 'Type your bluff tailored to the Inquisitor...'
                }
                className="flex-1 rounded-lg bg-black/70 border border-stone-700 px-2.5 py-1.5 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-400 disabled:opacity-40"
              />
              <button
                type="button"
                disabled={!canExcuse || !excuseDraft.trim()}
                onClick={() => {
                  sound.playSealStamp();
                  onSubmitExcuse(excuseDraft);
                  setExcuseDraft('');
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs disabled:opacity-40 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '拍案回怼' : 'Speak'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
