import React, { useState } from 'react';
import { LootItem, LootType, Upgrades } from '../types';
import { BYTE_FISH_COST, UPGRADE_CONFIGS } from '../constants';
import { TEXT } from '../locales';
import { EQUIPMENT_ART, LOOT_ART } from '../assets/generated/manifest';

interface ShopProps {
  credits: number;
  upgrades: Upgrades;
  inventory: LootItem[];
  onBuy: (upgradeId: keyof Upgrades, cost: number) => void;
  onSell: (item: LootItem) => void;
  onBuyByteFish: (char: string, cost: number) => void;
  onBuySpace: (cost: number) => void;
  spaceCost: number;
  onClose: () => void;
  lang: 'en' | 'zh';
}

const Shop: React.FC<ShopProps> = ({ credits, upgrades, inventory, onBuy, onSell, onBuyByteFish, onBuySpace, spaceCost, onClose, lang }) => {
  const t = TEXT[lang];
  const sellableItems = inventory.filter(item => item.type === LootType.FISH || item.type === LootType.SPECIAL);
  const getSellValue = (item: LootItem) => item.sellValue ?? item.value;
  const byteChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
  const [selectedByte, setSelectedByte] = useState(byteChars[0]);

  const getItemName = (item: LootItem) => {
    if (item.itemId) {
      const translation = (t.items as Record<string, { name: string; desc: string }>)[item.itemId];
      if (translation) return translation.name;
    }
    return item.name;
  };

  const getItemArt = (item: LootItem) => {
    if (item.type === LootType.CHAR) return LOOT_ART.char_byte;
    return LOOT_ART[item.itemId] || LOOT_ART.fish_neon_guppy;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/78 backdrop-blur-sm p-3 sm:p-6">
      <div className="ui-panel w-full max-w-2xl p-4 sm:p-6 crt relative max-h-[90dvh] overflow-y-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
          <h2 className="ui-section-title text-2xl sm:text-3xl text-center sm:text-left">{t.shopTitle}</h2>
          <button onClick={onClose} className="ui-button self-center sm:self-auto shrink-0 px-3 py-1 text-sm">
            {t.close}
          </button>
        </div>
        
        <div className="mb-6 sm:mb-8 flex justify-center">
          <div className="ui-badge px-4 py-2 text-center">
            <span className="text-sm">{t.availableCredits}:</span>
            <span className="ml-2 text-xl sm:text-2xl">${credits}</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="ui-section-title text-lg sm:text-xl mb-3">{t.equipment}</h3>
          <div className="grid gap-4">
          {UPGRADE_CONFIGS.map(config => {
            const currentLevel = upgrades[config.id];
            const isMaxed = currentLevel >= config.maxLevel;
            const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLevel - 1));
            const canAfford = credits >= cost;
            const safeLevel = Math.max(1, Math.min(5, currentLevel)) as 1 | 2 | 3 | 4 | 5;
            const equipmentArt = EQUIPMENT_ART[config.id][safeLevel];

            // Localization for upgrades
            const upgradeText = t.upgrades[config.id];

            return (
              <div key={config.id} className="ui-panel-soft p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 transition-colors">
                <div className="flex gap-3">
                  <img
                    src={equipmentArt}
                    alt=""
                    draggable={false}
                    className="h-14 w-14 shrink-0 object-contain [image-rendering:pixelated] drop-shadow-[0_0_12px_rgba(0,243,255,0.5)]"
                  />
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-cyber-cyan">{upgradeText.name} <span className="text-sm text-cyber-yellow">{t.lvl} {currentLevel}</span></h3>
                    <p className="text-sm text-cyber-cyan/75">{upgradeText.desc}</p>
                    <div className="flex gap-1 mt-2">
                      {[...Array(config.maxLevel)].map((_, i) => (
                        <div key={i} className={`h-2 w-8 rounded-full ${i < currentLevel ? 'bg-cyber-green' : 'bg-cyber-cyan/15'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                
                {isMaxed ? (
                  <button disabled className="ui-button px-4 py-2 w-full sm:w-auto">
                    {t.maxed}
                  </button>
                ) : (
                  <button 
                    onClick={() => onBuy(config.id, cost)}
                    disabled={!canAfford}
                    className={`ui-button px-4 py-2 w-full sm:w-auto min-w-[120px]
                      ${canAfford 
                        ? '' 
                        : 'cursor-not-allowed opacity-50'}`}
                  >
                    {t.buy} ${cost}
                  </button>
                )}
              </div>
            );
          })}
          </div>
        </div>

        <div className="border-t border-cyber-cyan/50 pt-4">
          <h3 className="ui-section-title text-lg sm:text-xl mb-3">{t.fishmart}</h3>
          <div className="rounded-md border border-cyber-cyan/50 bg-[#05070d]/65 p-3 sm:p-4 mb-4">
            <h4 className="text-sm sm:text-base text-cyber-yellow font-bold mb-2">{t.sellFish}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sellableItems.map(item => (
                <div key={item.id} className="flex justify-between items-center gap-2 rounded-md bg-cyber-cyan/8 p-2 border border-cyber-cyan/35 hover:border-cyber-green group">
                  <div className="flex min-w-0 items-center gap-2">
                    <img
                      src={getItemArt(item)}
                      alt=""
                      draggable={false}
                      className="h-8 w-8 shrink-0 object-contain [image-rendering:pixelated]"
                    />
                    <span className={`truncate ${item.perfect ? 'text-cyber-yellow' : item.rarity === 'legendary' ? 'text-cyber-yellow' : 'text-cyber-cyan'}`}>{getItemName(item)}</span>
                  </div>
                  <button
                    onClick={() => onSell(item)}
                    className="ui-button shrink-0 px-2 py-1 text-xs"
                  >
                    {t.sell} ${getSellValue(item)}
                  </button>
                </div>
              ))}
              {sellableItems.length === 0 && <div className="text-cyber-cyan/55 italic">{t.noFish}</div>}
            </div>
          </div>

          <div className="rounded-md border border-cyber-pink/50 bg-[#05070d]/65 p-3 sm:p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-lg sm:text-xl text-cyber-yellow font-bold">{t.byteFish}</h4>
                <p className="text-sm text-cyber-cyan/70">{t.byteFishDesc}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <label className="sr-only" htmlFor="byte-fish-select">{t.chooseByte}</label>
                <select
                  id="byte-fish-select"
                  value={selectedByte}
                  onChange={(e) => setSelectedByte(e.target.value)}
                  className="rounded-md bg-[#05070d] border-2 border-cyber-cyan text-cyber-cyan px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-cyber-yellow"
                >
                  {byteChars.map(char => (
                    <option key={char} value={char}>{char}</option>
                  ))}
                </select>
                <button
                  onClick={() => onBuyByteFish(selectedByte, BYTE_FISH_COST)}
                  disabled={credits < BYTE_FISH_COST}
                  className={`ui-button px-4 py-2 w-full sm:w-auto min-w-[120px]
                    ${credits >= BYTE_FISH_COST
                      ? ''
                      : 'cursor-not-allowed opacity-50'}`}
                >
                  {t.buy} ${BYTE_FISH_COST}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-cyber-yellow/50 bg-[#05070d]/65 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-lg sm:text-xl text-cyber-yellow font-bold">{t.buySpace}</h4>
              <p className="text-sm text-cyber-cyan/70">{t.spaceDesc}</p>
            </div>
            <button
              onClick={() => onBuySpace(spaceCost)}
              disabled={credits < spaceCost}
              className={`ui-button px-4 py-2 w-full sm:w-auto min-w-[120px]
                ${credits >= spaceCost
                  ? ''
                  : 'cursor-not-allowed opacity-50'}`}
            >
              {t.buy} ${spaceCost}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
