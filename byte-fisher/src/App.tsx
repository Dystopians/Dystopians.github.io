import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, LootItem, PlayerStats, Upgrades, LootType, HistoryEvent } from './types';
import { BYTE_FISH_COST, INITIAL_CREDITS, TRASH_LOOT, FISH_LOOT, SPECIAL_LOOT, generateCharLoot, createSpaceCharLoot, createByteFishLoot, SPACE_BYTE_COST } from './constants';
import { TEXT } from './locales';
import { createId } from './utils/id';
import { NumberCounter } from './utils/animations';
import fishmartAudio from './assets/sfx/74817__sugu14__carrefours-fish-market.wav';
import reelAudio from './assets/sfx/507099__paulprit__fly-fishing-reel-running_5.wav';
import swimAudio from './assets/sfx/768868__rayo75__fish_swim2.mp3';
import bgmAudio from './assets/music/Waterboot-speder2.mp3';
import VoidCanvas from './components/VoidCanvas';
import Minigame from './components/Minigame';
import Terminal from './components/Terminal';
import Shop from './components/Shop';
import Encyclopedia from './components/Encyclopedia';
import Guidebook from './components/Guidebook';

const App: React.FC = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  
  // Shared ref for minigame progress to sync Canvas visuals
  const minigameProgressRef = useRef(0);

  const getInitialStats = () => {
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
  };

  const getInitialUpgrades = () => {
    const saved = localStorage.getItem('bytefisher_upgrades');
    const parsed = saved ? JSON.parse(saved) : {};
    return { 
      barSize: 1, 
      stability: 1, 
      luck: 1, 
      netStrength: 1,
      ...parsed 
    };
  };

  // Persistence
  const [stats, setStats] = useState<PlayerStats>(getInitialStats);

  const [upgrades, setUpgrades] = useState<Upgrades>(getInitialUpgrades);

  const [playerName, setPlayerName] = useState(() => localStorage.getItem('bytefisher_name') || '');
  const [difficulty, setDifficulty] = useState<'simple' | 'hard' | 'hardcore'>(() => {
    const saved = localStorage.getItem('bytefisher_difficulty');
    if (saved === 'simple' || saved === 'hard' || saved === 'hardcore') return saved;
    return 'hard';
  });
  const [audioMuted, setAudioMuted] = useState(() => localStorage.getItem('bytefisher_mute') === '1');
  const [resetNonce, setResetNonce] = useState(0);
  const [history, setHistory] = useState<HistoryEvent[]>(() => {
    const saved = localStorage.getItem('bytefisher_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Notifications
  const [lastCaught, setLastCaught] = useState<LootItem | null>(null);

  const fishmartAudioRef = useRef<HTMLAudioElement | null>(null);
  const reelAudioRef = useRef<HTMLAudioElement | null>(null);
  const swimAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmFadeOutRef = useRef(false);
  const fadeTimersRef = useRef(new Map<HTMLAudioElement, number>());
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // UI Animation
  const creditsCounterRef = useRef(new NumberCounter(stats.credits, 0.15));
  const [displayCredits, setDisplayCredits] = useState(stats.credits);

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('bytefisher_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    creditsCounterRef.current.setTarget(stats.credits);
  }, [stats.credits]);

  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      if (creditsCounterRef.current.update()) {
        setDisplayCredits(creditsCounterRef.current.getValue());
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    localStorage.setItem('bytefisher_upgrades', JSON.stringify(upgrades));
  }, [upgrades]);

  useEffect(() => {
    localStorage.setItem('bytefisher_name', playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem('bytefisher_difficulty', difficulty);
  }, [difficulty]);

  useEffect(() => {
    localStorage.setItem('bytefisher_mute', audioMuted ? '1' : '0');
  }, [audioMuted]);

  useEffect(() => {
    localStorage.setItem('bytefisher_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const fishmart = new Audio(fishmartAudio);
    fishmart.loop = true;
    fishmart.preload = 'auto';
    fishmart.volume = 0;
    fishmartAudioRef.current = fishmart;

    const reel = new Audio(reelAudio);
    reel.loop = true;
    reel.preload = 'auto';
    reel.volume = 0;
    reelAudioRef.current = reel;

    const swim = new Audio(swimAudio);
    swim.loop = true;
    swim.preload = 'auto';
    swim.volume = 0;
    swimAudioRef.current = swim;

    const bgm = new Audio(bgmAudio);
    bgm.loop = false;
    bgm.preload = 'auto';
    bgm.volume = 0;
    bgmAudioRef.current = bgm;

    return () => {
      [fishmart, reel, swim, bgm].forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => {
      setAudioUnlocked(true);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [audioUnlocked]);

  const t = TEXT[lang];

  // Helper to get item name
  const getItemName = (item: LootItem) => {
    if (item.itemId === 'char_byte') return item.name;
    if (item.itemId) {
      // @ts-ignore
      const translation = t.items[item.itemId];
      if (translation) return translation.name;
    }
    return item.name;
  };

  const pushHistory = (event: Omit<HistoryEvent, 'id' | 'at'>) => {
    setHistory(prev => {
      const next = [{ id: createId(), at: Date.now(), ...event }, ...prev];
      return next.slice(0, 200);
    });
  };

  const resetSave = () => {
    localStorage.removeItem('bytefisher_stats');
    localStorage.removeItem('bytefisher_upgrades');
    localStorage.removeItem('bytefisher_name');
    localStorage.removeItem('bytefisher_history');
    localStorage.removeItem('bytefisher_logs');
    localStorage.removeItem('bytefisher_difficulty');
    localStorage.removeItem('bytefisher_mute');
    localStorage.removeItem('bytefisher_session_id');
    localStorage.removeItem('bytefisher_upload_history');
    localStorage.removeItem('bytefisher_ip');

    setStats(getInitialStats());
    setUpgrades(getInitialUpgrades());
    setPlayerName('');
    setHistory([]);
    setDifficulty('hard');
    setAudioMuted(false);
    setGameState(GameState.IDLE);
    setLastCaught(null);
    setResetNonce(prev => prev + 1);
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

  const handleMinigameSuccess = (perfect: boolean) => {
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

    const baseSellValue = difficulty === 'simple' ? Math.max(0, Math.floor(item.value * 0.5)) : item.value;
    const hardcoreValue = difficulty === 'hardcore' ? baseSellValue * 2 : baseSellValue;
    const isPerfectCatch = perfect && item.type === LootType.FISH;
    const sellValue = isPerfectCatch ? Math.ceil(hardcoreValue * 1.25) : Math.ceil(hardcoreValue);
    const itemWithPrice = { ...item, sellValue, perfect: isPerfectCatch };

    setStats(prev => {
      // Add item ID to unlock list if new
      const newUnlocked = new Set(prev.unlockedItems || []);
      if (item.itemId) newUnlocked.add(item.itemId);
      if (item.type === LootType.CHAR) newUnlocked.add('byte_fish');

      // Update Catch Stats
      const currentCatchStats = prev.catchStats || {};
      const newCatchStats = { ...currentCatchStats };
      if (item.itemId) {
        newCatchStats[item.itemId] = (currentCatchStats[item.itemId] || 0) + 1;
      }
      if (item.type === LootType.CHAR) {
        newCatchStats['byte_fish'] = (currentCatchStats['byte_fish'] || 0) + 1;
      }

      return {
        ...prev,
        inventory: [...prev.inventory, itemWithPrice],
        caughtCount: prev.caughtCount + 1,
        unlockedItems: Array.from(newUnlocked),
        catchStats: newCatchStats
      };
    });

    pushHistory({
      type: 'catch',
      data: {
        itemId: item.itemId,
        itemName: item.name,
        value: sellValue,
      }
    });
    
    setLastCaught(itemWithPrice);
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
    const sellValue = item.sellValue ?? item.value;
    setStats(prev => ({
      ...prev,
      credits: prev.credits + sellValue,
      inventory: prev.inventory.filter(i => i.id !== item.id),
    }));
    pushHistory({
      type: 'sell',
      data: { itemId: item.itemId, itemName: item.name, value: sellValue }
    });
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
      pushHistory({
        type: 'buy_upgrade',
        data: { upgradeId: id, value: cost, level: upgrades[id] + 1 }
      });
    }
  };

  const handleBuySpace = (cost: number) => {
    if (stats.credits < cost) return;
    const spaceItem = createSpaceCharLoot();
    setStats(prev => ({
      ...prev,
      credits: prev.credits - cost,
      inventory: [...prev.inventory, spaceItem],
      unlockedItems: Array.from(new Set([...(prev.unlockedItems || []), 'fish_space']))
    }));
    pushHistory({
      type: 'buy_space',
      data: { char: ' ', value: cost }
    });
  };

  const handleBuyByteFish = (char: string, cost: number) => {
    if (stats.credits < cost) return;
    const byteItem = createByteFishLoot(char);
    setStats(prev => ({
      ...prev,
      credits: prev.credits - cost,
      inventory: [...prev.inventory, byteItem],
      unlockedItems: Array.from(new Set([...(prev.unlockedItems || []), 'byte_fish'])),
      catchStats: {
        ...(prev.catchStats || {}),
        byte_fish: ((prev.catchStats || {}).byte_fish || 0) + 1
      }
    }));
    pushHistory({
      type: 'buy_byte',
      data: { char, value: cost }
    });
  };

  const handlePublishLog = (message: string) => {
    pushHistory({
      type: 'publish',
      data: { message }
    });
  };

  const showHud = ![
    GameState.SHOP,
    GameState.TERMINAL,
    GameState.CODEX,
    GameState.GUIDEBOOK,
    GameState.IMAGE_EDITOR,
    GameState.CHARACTER_EDITOR,
  ].includes(gameState);

  const fadeTo = useCallback((audio: HTMLAudioElement | null, target: number, duration = 600, pauseOnEnd = false) => {
    if (!audio) return;
    const existing = fadeTimersRef.current.get(audio);
    if (existing) window.clearInterval(existing);
    const start = audio.volume;
    const steps = Math.max(1, Math.floor(duration / 40));
    const delta = (target - start) / steps;
    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      audio.volume = Math.max(0, Math.min(1, start + delta * step));
      if (step >= steps) {
        window.clearInterval(id);
        fadeTimersRef.current.delete(audio);
        audio.volume = Math.max(0, Math.min(1, target));
        if (pauseOnEnd && audio.volume === 0) {
          audio.pause();
        }
      }
    }, 40);
    fadeTimersRef.current.set(audio, id);
  }, []);

  useEffect(() => {
    if (!audioUnlocked || audioMuted) return;
    const audio = bgmAudioRef.current;
    if (!audio) return;

    const targetVolume = 0.25;
    const fadeInMs = 1400;
    const fadeOutMs = 1400;

    const startLoop = () => {
      bgmFadeOutRef.current = false;
      audio.currentTime = 0;
      void audio.play().catch(() => {});
      fadeTo(audio, targetVolume, fadeInMs);
    };

    const handleTimeUpdate = () => {
      if (!Number.isFinite(audio.duration) || audio.duration === 0) return;
      const remaining = audio.duration - audio.currentTime;
      if (!bgmFadeOutRef.current && remaining <= fadeOutMs / 1000) {
        bgmFadeOutRef.current = true;
        fadeTo(audio, 0, fadeOutMs);
      }
    };

    const handleEnded = () => {
      startLoop();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    if (audio.paused) {
      startLoop();
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUnlocked, audioMuted, fadeTo]);

  useEffect(() => {
    if (!audioUnlocked || audioMuted) return;

    const inFishmart = gameState === GameState.SHOP;
    const inMinigame = gameState === GameState.MINIGAME;
    const inGameplay = [GameState.IDLE, GameState.CASTING, GameState.WAITING, GameState.CAUGHT].includes(gameState);

    if (fishmartAudioRef.current) {
      if (inFishmart) {
        fishmartAudioRef.current.currentTime = 0;
        void fishmartAudioRef.current.play().catch(() => {});
        fadeTo(fishmartAudioRef.current, 0.4, 500);
      } else {
        fadeTo(fishmartAudioRef.current, 0, 500, true);
      }
    }

    if (reelAudioRef.current) {
      if (inMinigame) {
        reelAudioRef.current.currentTime = 0;
        void reelAudioRef.current.play().catch(() => {});
        fadeTo(reelAudioRef.current, 0.55, 400);
      } else {
        fadeTo(reelAudioRef.current, 0, 400, true);
      }
    }

    if (swimAudioRef.current) {
      if (inGameplay) {
        void swimAudioRef.current.play().catch(() => {});
        fadeTo(swimAudioRef.current, 0.35, 800);
      } else {
        fadeTo(swimAudioRef.current, 0, 600, true);
      }
    }
  }, [gameState, audioUnlocked, audioMuted, fadeTo]);

  useEffect(() => {
    if (!audioMuted) return;
    const all = [
      fishmartAudioRef.current,
      reelAudioRef.current,
      swimAudioRef.current,
      bgmAudioRef.current
    ];
    all.forEach(audio => fadeTo(audio, 0, 300, true));
  }, [audioMuted, fadeTo]);

  return (
    <div className="relative w-screen h-[100dvh] min-h-[100svh] overflow-hidden bg-transparent text-cyber-green font-mono select-none">
      
      {/* Background Canvas */}
      <VoidCanvas 
        gameState={gameState} 
        lastCaught={lastCaught} 
        minigameProgressRef={minigameProgressRef}
        upgrades={upgrades}
      />

      {/* HUD */}
      {showHud && (
      <div className="fixed inset-x-0 top-0 z-30 p-3 sm:p-4 pointer-events-none">
        <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
           <h1 className="inline-block max-w-full truncate text-[clamp(1.05rem,5.8vw,1.5rem)] sm:text-2xl font-bold bg-black/60 px-2 glitch-text border-l-4 border-cyber-pink">BYTE_FISHER_beta0.9.2</h1>
           <div className="mt-1 sm:mt-2 max-w-full w-fit truncate text-xs sm:text-sm bg-black/60 px-2">
             {t.status}: <span className="text-cyber-cyan">{gameState}</span>
           </div>
           <div className="mt-1 pointer-events-auto flex flex-wrap gap-2">
             <button 
               onClick={() => setLang(prev => prev === 'en' ? 'zh' : 'en')}
               className="bg-black/60 border border-cyber-gray text-[0.65rem] sm:text-xs px-2 py-1 hover:border-cyber-green text-gray-400 hover:text-cyber-green transition-colors whitespace-nowrap"
             >
               [{lang === 'en' ? 'EN' : '中文'}] SWITCH LANG
             </button>
             <button
               onClick={() => setAudioMuted(prev => !prev)}
               className="bg-black/60 border border-cyber-gray text-[0.65rem] sm:text-xs px-2 py-1 hover:border-cyber-green text-gray-400 hover:text-cyber-green transition-colors whitespace-nowrap"
             >
               {audioMuted ? t.audioMuted : t.audioOn}
             </button>
           </div>
        </div>
        <div className="shrink-0 pointer-events-auto">
          <div className="bg-cyber-dark/95 border border-cyber-green px-3 sm:px-4 py-2 text-base sm:text-xl font-bold shadow-[0_0_10px_#39ff14] transition-all duration-300">
             ${displayCredits}
          </div>
        </div>
        </div>

          <div className="mt-2 sm:ml-auto grid grid-cols-4 sm:grid-cols-2 gap-1.5 sm:gap-2 w-full sm:w-64 pointer-events-auto">
             <button
               onClick={() => setGameState(GameState.SHOP)}
               className="min-h-9 bg-cyber-yellow text-black px-1 sm:px-2 py-1 text-[0.66rem] sm:text-base leading-tight hover:bg-white hover:scale-105 font-bold transition-all duration-200 hover:shadow-[0_0_15px_#fdfd00] active:scale-95 whitespace-nowrap overflow-hidden text-ellipsis"
             >
               {t.market}
             </button>
             <button
               onClick={() => setGameState(GameState.TERMINAL)}
               className="min-h-9 bg-cyber-pink text-black px-1 sm:px-2 py-1 text-[0.66rem] sm:text-base leading-tight hover:bg-white hover:scale-105 font-bold transition-all duration-200 hover:shadow-[0_0_15px_#ff00ff] active:scale-95 whitespace-nowrap overflow-hidden text-ellipsis"
             >
               {t.terminal}
             </button>
             <button
               onClick={() => setGameState(GameState.CODEX)}
               className="min-h-9 bg-cyber-green text-black px-1 sm:px-2 py-1 text-[0.66rem] sm:text-base leading-tight hover:bg-white hover:scale-105 font-bold transition-all duration-200 hover:shadow-[0_0_15px_#39ff14] active:scale-95 whitespace-nowrap overflow-hidden text-ellipsis"
             >
               {t.codex}
             </button>
             <button
               onClick={() => setGameState(GameState.GUIDEBOOK)}
               className="min-h-9 bg-cyber-cyan text-black px-1 sm:px-2 py-1 text-[0.66rem] sm:text-base leading-tight hover:bg-white hover:scale-105 font-bold transition-all duration-200 hover:shadow-[0_0_15px_#00f3ff] active:scale-95 whitespace-nowrap overflow-hidden text-ellipsis"
             >
               {t.guidebook}
             </button>
          </div>
      </div>
      )}

      {/* Main Action Area */}
      {gameState === GameState.IDLE && (
         <div className="absolute bottom-28 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 animate-pulse">
            <button
              onClick={handleCast}
              className="relative bg-cyber-green text-black text-xl sm:text-2xl px-8 sm:px-12 py-3 sm:py-4 font-bold rounded-sm hover:scale-110 active:scale-90 transition-all duration-300 shadow-[0_0_30px_#39ff14] hover:shadow-[0_0_50px_#39ff14] before:absolute before:inset-0 before:bg-cyber-green before:animate-ping before:opacity-75 before:rounded-sm"
            >
              <span className="relative z-10">{t.castLine}</span>
            </button>
         </div>
      )}

      {gameState === GameState.WAITING && (
         <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-cyber-cyan animate-pulse z-20 font-bold bg-black/60 px-4 py-1 text-center whitespace-nowrap">
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
          difficulty={difficulty}
        />
      )}

      {/* Catch Success Modal */}
      {gameState === GameState.CAUGHT && lastCaught && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4" onClick={claimCatch}>
           <div className={`w-full max-w-md bg-cyber-dark border-4 p-5 sm:p-8 text-center animate-bounce-in relative overflow-hidden
             ${lastCaught.rarity === 'legendary' || lastCaught.type === LootType.SPECIAL
               ? 'border-cyber-yellow shadow-[0_0_80px_#ffd700] animate-pulse'
               : lastCaught.rarity === 'rare'
               ? 'border-cyber-pink shadow-[0_0_60px_#ff00ff]'
               : lastCaught.rarity === 'uncommon'
               ? 'border-cyber-cyan shadow-[0_0_50px_#00f3ff]'
               : 'border-cyber-green shadow-[0_0_40px_#39ff14]'
             }`}>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent animate-shimmer"></div>
              <h2 className="text-2xl text-white mb-2 relative z-10">{t.signalAcquired}</h2>
              <div className={`text-3xl sm:text-4xl my-4 font-bold relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] break-words ${
                lastCaught.rarity === 'legendary' || lastCaught.type === LootType.SPECIAL
                  ? 'text-cyber-yellow animate-pulse'
                  : lastCaught.rarity === 'rare'
                  ? 'text-cyber-pink'
                  : lastCaught.rarity === 'uncommon'
                  ? 'text-cyber-cyan'
                  : 'text-cyber-green'
              }`}>{getItemName(lastCaught)}</div>
              <div className="text-gray-400 mb-6 relative z-10">{t.rarity[lastCaught.rarity]} | {t.value}: ${lastCaught.value}</div>
              <div className="text-sm animate-pulse text-cyber-green relative z-10">{t.clickContinue}</div>
           </div>
        </div>
      )}

      {/* Modals */}
      {gameState === GameState.SHOP && (
        <Shop 
          credits={stats.credits} 
          upgrades={upgrades} 
          inventory={stats.inventory}
          onBuy={handleBuyUpgrade} 
          onSell={handleSell}
          onBuyByteFish={handleBuyByteFish}
          onBuySpace={handleBuySpace}
          spaceCost={SPACE_BYTE_COST}
          onClose={() => setGameState(GameState.IDLE)} 
          lang={lang}
        />
      )}

      {gameState === GameState.TERMINAL && (
        <Terminal 
           inventory={stats.inventory}
           history={history}
           playerName={playerName}
           setPlayerName={setPlayerName}
           onConsume={handleConsume}
           onPublishLog={handlePublishLog}
           difficulty={difficulty}
           setDifficulty={setDifficulty}
           onReset={resetSave}
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

      {gameState === GameState.GUIDEBOOK && (
        <Guidebook
           onClose={() => setGameState(GameState.IDLE)}
           lang={lang}
        />
      )}

      {/* Mobile Controls Hint */}
      {showHud && (
        <div className="fixed bottom-2 w-full text-center text-xs text-gray-600 pointer-events-none z-20">
          beta0.9.2 // SECURITY_UPDATE // GLITCH_PATCHED
        </div>
      )}
    </div>
  );
};

export default App;
