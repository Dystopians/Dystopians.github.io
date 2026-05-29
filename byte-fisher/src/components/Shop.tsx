import React, { useState } from 'react';
import { LootItem, LootType, Upgrades } from '../types';
import { BYTE_FISH_COST, UPGRADE_CONFIGS } from '../constants';
import { TEXT } from '../locales';

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
  const fish = inventory.filter(item => item.type === LootType.FISH);
  const getSellValue = (item: LootItem) => item.sellValue ?? item.value;
  const byteChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
  const [selectedByte, setSelectedByte] = useState(byteChars[0]);

  const getItemName = (item: LootItem) => {
    if (item.itemId) {
      // @ts-ignore
      const translation = t.items[item.itemId];
      if (translation) return translation.name;
    }
    return item.name;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6">
      <div className="bg-cyber-dark border-2 border-cyber-yellow w-full max-w-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(253,253,0,0.3)] crt relative max-h-[90dvh] overflow-y-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-cyber-yellow text-center sm:text-left">{t.shopTitle}</h2>
          <button onClick={onClose} className="self-center sm:self-auto shrink-0 text-cyber-yellow hover:text-white border border-cyber-yellow px-3 py-1">
            [{t.close}]
          </button>
        </div>
        
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-gray-400">{t.availableCredits}:</span>
          <span className="text-xl sm:text-2xl text-cyber-green ml-2">${credits}</span>
        </div>

        <div className="mb-6">
          <h3 className="text-lg sm:text-xl text-cyber-yellow mb-3">{t.equipment}</h3>
          <div className="grid gap-4">
          {UPGRADE_CONFIGS.map(config => {
            const currentLevel = upgrades[config.id];
            const isMaxed = currentLevel >= config.maxLevel;
            const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLevel - 1));
            const canAfford = credits >= cost;

            // Localization for upgrades
            const upgradeText = t.upgrades[config.id];

            return (
              <div key={config.id} className="border border-cyber-gray p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:bg-white/5 transition-colors">
                <div>
                  <h3 className="text-lg sm:text-xl text-cyber-cyan">{upgradeText.name} <span className="text-sm text-gray-500">{t.lvl} {currentLevel}</span></h3>
                  <p className="text-sm text-gray-400">{upgradeText.desc}</p>
                  <div className="flex gap-1 mt-2">
                    {[...Array(config.maxLevel)].map((_, i) => (
                      <div key={i} className={`h-2 w-8 ${i < currentLevel ? 'bg-cyber-yellow' : 'bg-gray-700'}`} />
                    ))}
                  </div>
                </div>
                
                {isMaxed ? (
                  <button disabled className="px-4 py-2 border border-gray-600 text-gray-600 font-bold w-full sm:w-auto">
                    {t.maxed}
                  </button>
                ) : (
                  <button 
                    onClick={() => onBuy(config.id, cost)}
                    disabled={!canAfford}
                    className={`px-4 py-2 border font-bold w-full sm:w-auto min-w-[120px]
                      ${canAfford 
                        ? 'border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow hover:text-black' 
                        : 'border-red-900 text-red-900 cursor-not-allowed'}`}
                  >
                    {t.buy} ${cost}
                  </button>
                )}
              </div>
            );
          })}
          </div>
        </div>

        <div className="border-t border-cyber-gray pt-4">
          <h3 className="text-lg sm:text-xl text-cyber-yellow mb-3">{t.fishmart}</h3>
          <div className="border border-cyber-gray p-3 sm:p-4 mb-4">
            <h4 className="text-sm sm:text-base text-cyber-cyan mb-2">{t.sellFish}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fish.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-cyber-dark p-2 border border-cyber-gray hover:border-cyber-green group">
                  <span className={`${item.perfect ? 'text-cyber-yellow' : item.rarity === 'legendary' ? 'text-cyber-yellow' : 'text-white'}`}>{getItemName(item)}</span>
                  <button
                    onClick={() => onSell(item)}
                    className="text-xs bg-cyber-gray px-2 py-1 text-white group-hover:bg-cyber-green group-hover:text-black"
                  >
                    {t.sell} ${getSellValue(item)}
                  </button>
                </div>
              ))}
              {fish.length === 0 && <div className="text-gray-500 italic">{t.noFish}</div>}
            </div>
          </div>

          <div className="border border-cyber-gray p-3 sm:p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-lg sm:text-xl text-cyber-cyan">{t.byteFish}</h4>
                <p className="text-sm text-gray-400">{t.byteFishDesc}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <label className="sr-only" htmlFor="byte-fish-select">{t.chooseByte}</label>
                <select
                  id="byte-fish-select"
                  value={selectedByte}
                  onChange={(e) => setSelectedByte(e.target.value)}
                  className="bg-black/60 border border-cyber-gray text-cyber-green px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-cyber-yellow"
                >
                  {byteChars.map(char => (
                    <option key={char} value={char}>{char}</option>
                  ))}
                </select>
                <button
                  onClick={() => onBuyByteFish(selectedByte, BYTE_FISH_COST)}
                  disabled={credits < BYTE_FISH_COST}
                  className={`px-4 py-2 border font-bold w-full sm:w-auto min-w-[120px]
                    ${credits >= BYTE_FISH_COST
                      ? 'border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow hover:text-black'
                      : 'border-red-900 text-red-900 cursor-not-allowed'}`}
                >
                  {t.buy} ${BYTE_FISH_COST}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-lg sm:text-xl text-cyber-cyan">{t.buySpace}</h4>
              <p className="text-sm text-gray-400">{t.spaceDesc}</p>
            </div>
            <button
              onClick={() => onBuySpace(spaceCost)}
              disabled={credits < spaceCost}
              className={`px-4 py-2 border font-bold w-full sm:w-auto min-w-[120px]
                ${credits >= spaceCost
                  ? 'border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow hover:text-black'
                  : 'border-red-900 text-red-900 cursor-not-allowed'}`}
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
