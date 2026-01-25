import React, { useState } from 'react';
import { ALL_LOOT_DEFINITIONS } from '../constants';
import { TEXT } from '../locales';
import { LootType } from '../types';

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
    // @ts-ignore
    const info = t.items[itemId];
    if (info) return info;
    return { name: fallbackName, desc: '...' };
  };

  const filteredItems = ALL_LOOT_DEFINITIONS.filter(item => {
    if (filter === 'ALL') return true;
    return item.type === filter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6">
      <div className="bg-cyber-dark border-2 border-cyber-cyan w-full max-w-4xl p-4 sm:p-6 shadow-[0_0_30px_rgba(0,243,255,0.3)] flex flex-col h-[85vh] sm:h-[80vh] crt">
        
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 border-b border-cyber-cyan pb-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-cyber-cyan glitch-text">{t.codex}</h2>
          <button onClick={onClose} className="self-start sm:self-auto text-cyber-cyan hover:text-white font-bold text-lg sm:text-xl">[{t.close}]</button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
          {(['ALL', LootType.FISH, LootType.TRASH, LootType.SPECIAL] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm sm:text-base border ${filter === f ? 'bg-cyber-cyan text-black border-cyber-cyan' : 'border-gray-600 text-gray-500 hover:text-cyber-cyan'}`}
            >
              {f === 'ALL' ? 'ALL' : f}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-2">
          {filteredItems.map((item) => {
            const isUnlocked = unlockedItems.includes(item.itemId!);
            const info = getItemInfo(item.itemId!, item.name!);
            const count = catchStats[item.itemId!] || 0;

            return (
              <div 
                key={item.itemId} 
                className={`border p-4 flex flex-col gap-2 transition-colors relative overflow-hidden
                  ${isUnlocked 
                    ? 'border-cyber-green bg-black/50' 
                    : 'border-gray-800 bg-gray-900/50 grayscale opacity-70'}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`font-bold text-base sm:text-lg ${isUnlocked ? 'text-cyber-yellow' : 'text-gray-600'}`}>
                    {isUnlocked ? info.name : '???'}
                  </span>
                  {isUnlocked && (
                    <span className="text-xs bg-cyber-gray px-1 text-white border border-gray-600">
                      ${item.value}
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-400 min-h-[40px]">
                  {isUnlocked ? info.desc : t.locked}
                </div>

                {/* Footer: Rarity & Stats */}
                <div className="flex justify-between items-end mt-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full 
                      ${item.rarity === 'legendary' ? 'bg-cyber-yellow shadow-[0_0_5px_yellow]' : 
                        item.rarity === 'rare' ? 'bg-cyber-pink' :
                        item.rarity === 'uncommon' ? 'bg-cyber-cyan' : 'bg-gray-500'}`} 
                    />
                    <span className="text-xs uppercase text-gray-500">{t.rarity[item.rarity as keyof typeof t.rarity]}</span>
                  </div>
                  
                  {isUnlocked && (
                    <div className="text-xs text-cyber-green text-right">
                       {t.timesCaught}: {count}
                    </div>
                  )}
                </div>

                {/* Visual Icon Placeholder (Emoji) */}
                <div className="absolute bottom-2 right-2 text-4xl opacity-20 pointer-events-none">
                  {item.type === LootType.FISH ? '🐠' : item.type === LootType.SPECIAL ? '🎁' : '📄'}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 text-xs text-center text-gray-600">
          DATABASE_VER_2.5 // TOTAL_ENTRIES: {ALL_LOOT_DEFINITIONS.length} // UNLOCKED: {unlockedItems.filter(id => !id.startsWith('char')).length}
        </div>

      </div>
    </div>
  );
};

export default Encyclopedia;
