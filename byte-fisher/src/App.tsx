import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, LootItem, PlayerStats, Upgrades, LootType } from './types';
import { INITIAL_CREDITS, TRASH_LOOT, FISH_LOOT, SPECIAL_LOOT, generateCharLoot } from './constants';
import { TEXT } from './locales';
import { createId } from './utils/id';
import VoidCanvas from './components/VoidCanvas';
import Minigame from './components/Minigame';
import Terminal from './components/Terminal';
import Shop from './components/Shop';
import Encyclopedia from './components/Encyclopedia';

const App: React.FC = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  
  // Shared ref for minigame progress to sync Canvas visuals
  const minigameProgressRef = useRef(0);

  // Persistence
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('bytefisher_stats');
    const parsed = saved ? JSON.parse(saved) : {};
    return { 
      credits: INITIAL_CREDITS, 
      inventory: [], 
      caughtCount: 0,
      unlockedItems: [], // Default empty
      catchStats: {}, // Default empty
      ...parsed // Overwrite with saved
    };
  });

  const [upgrades, setUpgrades] = useState<Upgrades>(() => {
    const saved = localStorage.getItem('bytefisher_upgrades');
    const parsed = saved ? JSON.parse(saved) : {};
    return { 
      barSize: 1, 
      stability: 1, 
      luck: 1, 
      netStrength: 1,
      ...parsed 
    };
  });

  const [playerName, setPlayerName] = useState(() => localStorage.getItem('bytefisher_name') || '');

  // Notifications
  const [lastCaught, setLastCaught] = useState<LootItem | null>(null);

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('bytefisher_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('bytefisher_upgrades', JSON.stringify(upgrades));
  }, [upgrades]);

  useEffect(() => {
    localStorage.setItem('bytefisher_name', playerName);
  }, [playerName]);

  const t = TEXT[lang];

  // Helper to get item name
  const getItemName = (item: LootItem) => {
    if (item.itemId) {
      // @ts-ignore
      const translation = t.items[item.itemId];
      if (translation) return translation.name;
    }
    return item.name;
  };

  // --- GAMEPLAY LOGIC ---

  const handleCast = () => {
    if (gameState !== GameState.IDLE) return;
    setGameState(GameState.CASTING);
    // Reset progress ref
    minigameProgressRef.current = 15; // Start low
    // Animation time for cast
    setTimeout(() => {
      setGameState(GameState.WAITING);
      startBiteTimer();
    }, 1000); 
  };

  const startBiteTimer = () => {
    const waitTime = Math.random() * 5000 + 2000; // 2-7s
    setTimeout(() => {
      // Need to check if we are still waiting (player didn't cancel)
      setGameState(prev => prev === GameState.WAITING ? GameState.MINIGAME : prev);
    }, waitTime);
  };

  const handleMinigameSuccess = () => {
    const roll = Math.random();
    let item: LootItem;
    const luckMod = upgrades.luck * 0.05;

    // 1% Chance for Treasure Chest (LootType.SPECIAL) - Independent of luck modifiers
    if (roll < 0.01) {
      const tmpl = SPECIAL_LOOT[0]; // Currently only one special item
      item = { ...tmpl, id: createId(), type: LootType.SPECIAL } as LootItem;
    } else {
      // Standard loot tables
      if (roll < 0.1 - luckMod) {
        const tmpl = TRASH_LOOT[Math.floor(Math.random() * TRASH_LOOT.length)];
        item = { ...tmpl, id: createId(), type: LootType.TRASH } as LootItem;
      } else if (roll < 0.85) {
        const fishPool = FISH_LOOT; 
        const tmpl = fishPool[Math.floor(Math.random() * fishPool.length)];
        item = { ...tmpl, id: createId(), type: LootType.FISH } as LootItem;
      } else {
        item = generateCharLoot(upgrades.luck);
      }
    }

    setStats(prev => {
      // Add item ID to unlock list if new
      const newUnlocked = new Set(prev.unlockedItems || []);
      if (item.itemId) newUnlocked.add(item.itemId);

      // Update Catch Stats
      const currentCatchStats = prev.catchStats || {};
      const newCount = (currentCatchStats[item.itemId] || 0) + 1;
      const newCatchStats = { ...currentCatchStats, [item.itemId]: newCount };

      return {
        ...prev,
        inventory: [...prev.inventory, item],
        caughtCount: prev.caughtCount + 1,
        unlockedItems: Array.from(newUnlocked),
        catchStats: newCatchStats
      };
    });
    
    setLastCaught(item);
    setGameState(GameState.CAUGHT);
  };

  const handleMinigameFail = () => {
    setGameState(GameState.IDLE);
  };

  const claimCatch = () => {
    setLastCaught(null);
    setGameState(GameState.IDLE);
  };

  // Stable callback for minigame progress updates to prevent re-renders/effect resets in child
  const handleMinigameProgress = useCallback((val: number) => {
    minigameProgressRef.current = val;
  }, []);

  // --- ECONOMY ---
  const handleSell = (item: LootItem) => {
    setStats(prev => ({
      ...prev,
      credits: prev.credits + item.value,
      inventory: prev.inventory.filter(i => i.id !== item.id),
    }));
  };

  const handleConsume = (items: LootItem[]) => {
    const idsToRemove = new Set(items.map(i => i.id));
    setStats(prev => ({
      ...prev,
      inventory: prev.inventory.filter(i => !idsToRemove.has(i.id)),
    }));
  };

  const handleBuyUpgrade = (id: keyof Upgrades, cost: number) => {
    if (stats.credits >= cost) {
      setStats(prev => ({ ...prev, credits: prev.credits - cost }));
      setUpgrades(prev => ({ ...prev, [id]: prev[id] + 1 }));
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-transparent text-cyber-green font-mono select-none">
      
      {/* Background Canvas */}
      <VoidCanvas 
        gameState={gameState} 
        lastCaught={lastCaught} 
        minigameProgressRef={minigameProgressRef}
        upgrades={upgrades}
      />

      {/* HUD */}
      <div className="relative z-10 w-full p-4 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start pointer-events-none">
        <div>
           <h1 className="text-2xl font-bold bg-black/50 px-2 glitch-text border-l-4 border-cyber-pink">BYTE_FISHER_V.1</h1>
           <div className="mt-2 text-sm bg-black/50 inline-block px-2">
             {t.status}: <span className="text-cyber-cyan">{gameState}</span>
           </div>
           <div className="mt-1 pointer-events-auto">
             <button 
               onClick={() => setLang(prev => prev === 'en' ? 'zh' : 'en')}
               className="bg-black/50 border border-cyber-gray text-xs px-2 py-1 hover:border-cyber-green text-gray-400 hover:text-cyber-green transition-colors"
             >
               [{lang === 'en' ? 'EN' : '中文'}] SWITCH LANG
             </button>
           </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2 pointer-events-auto">
          <div className="bg-cyber-dark border border-cyber-green px-4 py-2 text-lg sm:text-xl font-bold shadow-[0_0_10px_#39ff14]">
             ${stats.credits}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 w-full max-w-[18rem] sm:w-64">
             <button 
               onClick={() => setGameState(GameState.SHOP)}
               className="bg-cyber-yellow text-black px-2 py-1 hover:bg-white font-bold"
             >
               {t.market}
             </button>
             <button 
               onClick={() => setGameState(GameState.TERMINAL)}
               className="bg-cyber-pink text-black px-2 py-1 hover:bg-white font-bold"
             >
               {t.terminal}
             </button>
             <button 
               onClick={() => setGameState(GameState.CODEX)}
               className="bg-cyber-green text-black px-2 py-1 hover:bg-white font-bold"
             >
               {t.codex}
             </button>
          </div>
        </div>
      </div>

      {/* Main Action Area */}
      {gameState === GameState.IDLE && (
         <div className="absolute bottom-28 sm:bottom-20 left-1/2 -translate-x-1/2 z-20">
            <button 
              onClick={handleCast}
              className="bg-cyber-green text-black text-xl sm:text-2xl px-8 sm:px-12 py-3 sm:py-4 font-bold rounded-sm hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_#39ff14]"
            >
              {t.castLine}
            </button>
         </div>
      )}

      {gameState === GameState.WAITING && (
         <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-cyber-cyan animate-pulse z-20 font-bold bg-black/50 px-4 py-1">
            {t.scanning}
         </div>
      )}

      {/* Mini Game Overlay */}
      {gameState === GameState.MINIGAME && (
        <Minigame 
          upgrades={upgrades} 
          onSuccess={handleMinigameSuccess} 
          onFail={handleMinigameFail} 
          lang={lang}
          onProgress={handleMinigameProgress}
        />
      )}

      {/* Catch Success Modal */}
      {gameState === GameState.CAUGHT && lastCaught && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={claimCatch}>
           <div className="bg-cyber-dark border-2 border-cyber-cyan p-8 text-center animate-bounce-in shadow-[0_0_50px_#00f3ff]">
              <h2 className="text-2xl text-white mb-2">{t.signalAcquired}</h2>
              <div className="text-4xl my-4 text-cyber-yellow font-bold">{getItemName(lastCaught)}</div>
              <div className="text-gray-400 mb-6">{t.rarity[lastCaught.rarity]} | {t.value}: ${lastCaught.value}</div>
              <div className="text-sm animate-pulse text-cyber-green">{t.clickContinue}</div>
           </div>
        </div>
      )}

      {/* Modals */}
      {gameState === GameState.SHOP && (
        <Shop 
          credits={stats.credits} 
          upgrades={upgrades} 
          onBuy={handleBuyUpgrade} 
          onClose={() => setGameState(GameState.IDLE)} 
          lang={lang}
        />
      )}

      {gameState === GameState.TERMINAL && (
        <Terminal 
           inventory={stats.inventory}
           playerName={playerName}
           setPlayerName={setPlayerName}
           onSell={handleSell}
           onConsume={handleConsume}
           onClose={() => setGameState(GameState.IDLE)}
           lang={lang}
        />
      )}

      {gameState === GameState.CODEX && (
        <Encyclopedia 
           unlockedItems={stats.unlockedItems || []} 
           catchStats={stats.catchStats || {}}
           onClose={() => setGameState(GameState.IDLE)} 
           lang={lang}
        />
      )}

      {/* Mobile Controls Hint */}
      <div className="fixed bottom-2 w-full text-center text-xs text-gray-600 pointer-events-none z-50">
        V 1.1.1 // SECURITY_UPDATE // GLITCH_PATCHED
      </div>
    </div>
  );
};

export default App;
