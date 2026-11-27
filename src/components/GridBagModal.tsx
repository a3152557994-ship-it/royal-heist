import React, { useEffect, useState } from 'react';
import { RotateCw, Trash2, X, PackageCheck } from 'lucide-react';
import { BagItem } from '../types/raid';
import {
  canPlaceInBag,
  computeBagTotals,
  itemFootprint,
  RARITY_META,
  TREASURES,
} from '../engine/lootCatalog';
import { getTreasureSrc } from '../engine/spriteAtlas';
import { formatSilver } from '../engine/gameData';
import { sound } from '../audio/soundEngine';

interface GridBagModalProps {
  isOpen: boolean;
  cols: number;
  rows: number;
  bag: BagItem[];
  pendingLootDefId: string | null;
  onUpdateBag: (nextBag: BagItem[]) => void;
  onClearPending: (placed: boolean) => void;
  onClose: () => void;
}

const TreasureThumb: React.FC<{ defId: string; size?: number; rotated?: boolean }> = ({
  defId,
  size = 46,
  rotated = false,
}) => {
  const def = TREASURES[defId];
  return (
    <img
      src={getTreasureSrc(defId)}
      alt={def?.name || defId}
      style={{
        width: size,
        height: size,
        transform: rotated ? 'rotate(90deg)' : undefined,
      }}
      className="object-contain pointer-events-none select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)]"
    />
  );
};

export const GridBagModal: React.FC<GridBagModalProps> = ({
  isOpen,
  cols,
  rows,
  bag,
  pendingLootDefId,
  onUpdateBag,
  onClearPending,
  onClose,
}) => {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [pendingRot, setPendingRot] = useState(false);

  useEffect(() => {
    setPendingRot(false);
    setSelectedUid(null);
  }, [pendingLootDefId, isOpen]);

  if (!isOpen) return null;

  const totals = computeBagTotals(bag);
  const selectedItem = bag.find((b) => b.uid === selectedUid) || null;
  const pendingDef = pendingLootDefId ? TREASURES[pendingLootDefId] : null;

  const handleCellTap = (gx: number, gy: number) => {
    sound.playTap();
    // 1. If holding pending newly discovered treasure, try placing it at (gx, gy)!
    if (pendingLootDefId) {
      if (canPlaceInBag(bag, cols, rows, { defId: pendingLootDefId, gx, gy, rotated: pendingRot })) {
        const next: BagItem = {
          uid: `it_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          defId: pendingLootDefId,
          gx,
          gy,
          rotated: pendingRot,
        };
        sound.playLootReveal(TREASURES[pendingLootDefId].rarity);
        onUpdateBag([...bag, next]);
        onClearPending(true);
        return;
      }
    }

    // 2. If moving an existing selected bag item, try relocating it to (gx, gy)
    if (selectedItem) {
      if (
        canPlaceInBag(bag, cols, rows, {
          defId: selectedItem.defId,
          gx,
          gy,
          rotated: selectedItem.rotated,
          ignoreUid: selectedItem.uid,
        })
      ) {
        onUpdateBag(
          bag.map((b) => (b.uid === selectedItem.uid ? { ...b, gx, gy } : b))
        );
        setSelectedUid(null);
      }
    }
  };

  const handleRotateSelected = () => {
    if (!selectedItem) return;
    const nextRot = !selectedItem.rotated;
    if (
      canPlaceInBag(bag, cols, rows, {
        defId: selectedItem.defId,
        gx: selectedItem.gx,
        gy: selectedItem.gy,
        rotated: nextRot,
        ignoreUid: selectedItem.uid,
      })
    ) {
      sound.playTap();
      onUpdateBag(
        bag.map((b) => (b.uid === selectedItem.uid ? { ...b, rotated: nextRot } : b))
      );
    }
  };

  const handleDropSelected = () => {
    if (!selectedItem) return;
    sound.playTap();
    onUpdateBag(bag.filter((b) => b.uid !== selectedItem.uid));
    setSelectedUid(null);
  };

  const cellPx = cols >= 6 ? 46 : 54;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="w-full max-w-md rounded-2xl wood-panel gold-border-glow p-4 space-y-3.5 text-amber-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-amber-300">
              🎒 夜行乾坤包袱 ({cols}×{rows}格)
            </h3>
            <div className="text-xs text-stone-300 mt-0.5">
              当前装袋：<b className="text-amber-400">{formatSilver(totals.totalValueWan)}</b> ｜ 负重：
              <b className={totals.totalWeightKg > 22 ? 'text-red-400' : 'text-emerald-300'}>
                {totals.totalWeightKg} kg
              </b>
            </div>
          </div>
          <button
            onClick={() => {
              if (pendingLootDefId) onClearPending(false);
              onClose();
            }}
            className="p-1.5 rounded-lg bg-stone-900 text-stone-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pending Overflow Treasure Banner */}
        {pendingDef && (
          <div
            className="rounded-xl p-3 border flex items-center justify-between gap-2"
            style={{
              background: RARITY_META[pendingDef.rarity].bg,
              borderColor: RARITY_META[pendingDef.rarity].border,
            }}
          >
            <div className="flex items-center gap-2.5">
              <TreasureThumb defId={pendingDef.id} size={44} />
              <div>
                <div className="text-xs font-extrabold text-white">
                  ✨ 摸出【{pendingDef.name}】({formatSilver(pendingDef.valueWan)})
                </div>
                <div className="text-[11px] text-amber-100/90">
                  占 {pendingRot ? `${pendingDef.gridH}×${pendingDef.gridW}` : `${pendingDef.gridW}×${pendingDef.gridH}`} 格 · 先丢掉便宜银锭再点空格塞入！
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {pendingDef.gridW !== pendingDef.gridH && (
                <button
                  onClick={() => setPendingRot((r) => !r)}
                  className="px-2 py-1.5 rounded-lg bg-black/50 text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  旋转
                </button>
              )}
              <button
                onClick={() => onClearPending(false)}
                className="px-2 py-1.5 rounded-lg bg-stone-900/80 text-stone-300 text-xs cursor-pointer"
              >
                放弃
              </button>
            </div>
          </div>
        )}

        {/* Spatial Grid Matrix */}
        <div className="flex justify-center py-1">
          <div
            className="relative bg-[#0B0705] border-2 border-amber-500/40 rounded-xl p-1.5 shadow-inner"
            style={{
              width: cols * cellPx + 16,
              height: rows * cellPx + 16,
            }}
          >
            {/* Empty Background Cells */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
                gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
              }}
            >
              {Array.from({ length: cols * rows }).map((_, idx) => {
                const gx = idx % cols;
                const gy = Math.floor(idx / cols);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCellTap(gx, gy)}
                    className="border border-stone-800/90 hover:bg-amber-500/15 transition cursor-pointer"
                    style={{ width: cellPx, height: cellPx }}
                  />
                );
              })}
            </div>

            {/* Placed Treasure Blocks */}
            {bag.map((item) => {
              const def = TREASURES[item.defId];
              if (!def) return null;
              const fp = itemFootprint(item);
              const meta = RARITY_META[def.rarity];
              const isSel = selectedUid === item.uid;

              return (
                <button
                  key={item.uid}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playTap();
                    setSelectedUid(isSel ? null : item.uid);
                  }}
                  className={`absolute rounded-lg flex flex-col items-center justify-center p-1 transition cursor-pointer overflow-hidden ${
                    isSel ? 'ring-2 ring-white scale-[1.02] z-20' : 'z-10 hover:brightness-110'
                  }`}
                  style={{
                    left: 6 + item.gx * cellPx + 2,
                    top: 6 + item.gy * cellPx + 2,
                    width: fp.w * cellPx - 4,
                    height: fp.h * cellPx - 4,
                    background: meta.bg,
                    border: `2px solid ${meta.border}`,
                    boxShadow: `0 0 12px ${meta.glow}`,
                  }}
                >
                  <TreasureThumb
                    defId={def.id}
                    size={Math.min(fp.w * cellPx - 10, fp.h * cellPx - 26)}
                    rotated={item.rotated}
                  />
                  <span className="text-[10px] font-extrabold text-white truncate max-w-full leading-tight">
                    {def.name.slice(0, 4)}
                  </span>
                  <span className="text-[9px] font-mono text-amber-200 leading-none">
                    {def.valueWan}万
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Item Actions */}
        {selectedItem && TREASURES[selectedItem.defId] ? (
          <div className="rounded-xl bg-stone-900/90 border border-stone-700 p-2.5 flex items-center justify-between gap-2 text-xs">
            <div>
              <div className="font-bold text-amber-200">
                {TREASURES[selectedItem.defId].name} ({formatSilver(TREASURES[selectedItem.defId].valueWan)})
              </div>
              <div className="text-[11px] text-stone-400">
                点任意空格可挪位置 · 重 {TREASURES[selectedItem.defId].weightKg}kg
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRotateSelected}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                旋转
              </button>
              <button
                onClick={handleDropSelected}
                className="px-2.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                丢弃腾格
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              if (pendingLootDefId) onClearPending(false);
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PackageCheck className="w-4 h-4" />
            <span>扎紧包袱 · 继续潜行撤离</span>
          </button>
        )}
      </div>
    </div>
  );
};
