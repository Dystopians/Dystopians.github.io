import React, { useState } from 'react';
import { ALL_LOOT_DEFINITIONS } from '../constants';
import { TEXT } from '../locales';
import { LootType } from '../types';
import { LOOT_ART } from '../assets/generated/manifest';

interface EncyclopediaProps {
  unlockedItems: string[];
  catchStats: Record<string, number>;
  onClose: () => void;
  lang: 'en' | 'zh';
}

const Encyclopedia: React.FC<EncyclopediaProps> = ({ unlockedItems, catchStats, onClose, lang }) => {
  const [filter, setFilter] = useState<LootType | 'ALL'>('ALL');
  const t = TEXT[lang];

  // Helper to get translated item info
  const getItemInfo = (itemId: string, fallbackName: string) => {
    const info = (t.items as Record<string, { name: string; desc: string }>)[itemId];
    if (info) return info;
    return { name: fallbackName, desc: '...' };
  };

  const filteredItems = ALL_LOOT_DEFINITIONS.filter(item => {
    if (filter === 'ALL') return true;
    return item.type === filter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/82 backdrop-blur-md p-3 sm:p-6">
      <div className="ui-panel w-full max-w-4xl p-4 sm:p-6 flex flex-col h-[85vh] sm:h-[80vh] crt">
        
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 border-b border-cyber-cyan/60 pb-3">
          <h2 className="ui-section-title text-2xl sm:text-3xl glitch-text">{t.codex}</h2>
          <button onClick={onClose} className="ui-button self-start sm:self-auto px-3 py-1 text-sm">{t.close}</button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
          {(['ALL', LootType.FISH, LootType.TRASH, LootType.SPECIAL] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`ui-button px-3 py-1 text-sm sm:text-base ${filter === f ? 'ui-button-primary' : ''}`}
            >
              {f === 'ALL' ? 'ALL' : f}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredItems.map((item) => {
            const isUnlocked = unlockedItems.includes(item.itemId!);
            const info = getItemInfo(item.itemId!, item.name!);
            const count = catchStats[item.itemId!] || 0;
            const art = LOOT_ART[item.itemId!] || LOOT_ART.fish_neon_guppy;

            return (
              <div 
                key={item.itemId} 
                className={`rounded-md border-2 p-4 flex flex-col gap-2 transition-colors relative overflow-hidden
                  ${isUnlocked 
                    ? 'border-cyber-cyan bg-[#071322]/92 text-cyber-cyan shadow-[0_0_16px_rgba(0,243,255,0.18)]' 
                    : 'border-cyber-gray/70 bg-[#05070d]/70 grayscale opacity-70'}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`font-black text-base sm:text-lg ${isUnlocked ? 'text-cyber-cyan' : 'text-cyber-cyan/40'}`}>
                    {isUnlocked ? info.name : '???'}
                  </span>
                  {isUnlocked && (
                    <span className="ui-badge px-2 py-0.5 text-xs">
                      ${item.value}
                    </span>
                  )}
                </div>

                <div className={`text-sm min-h-[40px] ${isUnlocked ? 'text-cyber-cyan/80' : 'text-cyber-cyan/45'}`}>
                  {isUnlocked ? info.desc : t.locked}
                </div>

                <div className="flex justify-center py-1">
                  <img
                    src={art}
                    alt=""
                    draggable={false}
                    className={`h-20 w-20 object-contain [image-rendering:pixelated] ${isUnlocked ? 'drop-shadow-[0_0_14px_rgba(57,255,20,0.45)]' : 'brightness-0 opacity-60'}`}
                  />
                </div>

                {/* Footer: Rarity & Stats */}
                <div className="flex justify-between items-end mt-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full 
                      ${item.rarity === 'legendary' ? 'bg-cyber-yellow' : 
                        item.rarity === 'rare' ? 'bg-cyber-pink' :
                        item.rarity === 'uncommon' ? 'bg-cyber-cyan' : 'bg-gray-500'}`} 
                    />
                    <span className={`text-xs uppercase ${isUnlocked ? 'text-cyber-yellow' : 'text-cyber-cyan/40'}`}>{t.rarity[item.rarity as keyof typeof t.rarity]}</span>
                  </div>
                  
                  {isUnlocked && (
                    <div className="text-xs text-cyber-green text-right font-bold">
                       {t.timesCaught}: {count}
                    </div>
                  )}
                </div>
                <img
                  src={art}
                  alt=""
                  draggable={false}
                  className="absolute bottom-1 right-1 h-14 w-14 object-contain opacity-10 [image-rendering:pixelated] pointer-events-none"
                />
              </div>
            );
            })}
          </div>
        </div>
        
        <div className="mt-4 text-xs text-center text-cyber-cyan/65">
          {ALL_LOOT_DEFINITIONS.length} entries · {unlockedItems.filter(id => !id.startsWith('char')).length} found
        </div>

      </div>
    </div>
  );
};

export default Encyclopedia;
