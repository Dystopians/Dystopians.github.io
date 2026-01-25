import React from 'react';
import { Upgrades } from '../types';
import { UPGRADE_CONFIGS } from '../constants';
import { TEXT } from '../locales';

interface ShopProps {
  credits: number;
  upgrades: Upgrades;
  onBuy: (upgradeId: keyof Upgrades, cost: number) => void;
  onBuySpace: (cost: number) => void;
  spaceCost: number;
  onClose: () => void;
  lang: 'en' | 'zh';
}

const Shop: React.FC<ShopProps> = ({ credits, upgrades, onBuy, onBuySpace, spaceCost, onClose, lang }) => {
  const t = TEXT[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6">
      <div className="bg-cyber-dark border-2 border-cyber-yellow w-full max-w-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(253,253,0,0.3)] crt relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-cyber-yellow hover:text-white">
          [{t.close}]
        </button>
        
        <h2 className="text-2xl sm:text-3xl font-bold text-cyber-yellow mb-4 sm:mb-6 text-center">{t.shopTitle}</h2>
        
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-gray-400">{t.availableCredits}:</span>
          <span className="text-xl sm:text-2xl text-cyber-green ml-2">${credits}</span>
        </div>

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

        <div className="mt-6 border-t border-cyber-gray pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl text-cyber-cyan">{t.buySpace}</h3>
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
