import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ContractConfig, GameState, LootItem, PlayerStats, Upgrades, LootType, HistoryEvent } from './types';
import { CAST_ANIMATION_MS, CONTRACTS, INITIAL_CREDITS, TRASH_LOOT, FISH_LOOT, SPECIAL_LOOT, UPGRADE_CONFIGS, generateCharLoot, createSpaceCharLoot, createByteFishLoot, SPACE_BYTE_COST } from './constants';
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
import GameHud from './components/GameHud';
import { LOOT_ART } from './assets/generated/manifest';

const readSavedJson = <T,>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

const fishRarityWeights: Record<LootItem['rarity'], number> = {
  common: 100,
  uncommon: 48,
  rare: 18,
  legendary: 4,
};

const selectWeightedFish = (luckLevel: number, perfect: boolean): Partial<LootItem> => {
  const normalizedLuck = Math.max(1, Math.min(5, luckLevel || 1));
  const weighted = FISH_LOOT.map(fish => {
    const rarity = fish.rarity || 'common';
    const luckBoost = rarity === 'legendary'
      ? normalizedLuck * 1.6
      : rarity === 'rare'
      ? normalizedLuck * 3.5
      : rarity === 'uncommon'
      ? normalizedLuck * 2
      : 0;
    const perfectBoost = perfect && (rarity === 'rare' || rarity === 'legendary') ? 8 : 0;
    return { fish, weight: fishRarityWeights[rarity] + luckBoost + perfectBoost };
  });
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.fish;
  }
  return weighted[0].fish;
};

const App: React.FC = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [lang, setLang] = useState<'en' | 'zh'>(() => localStorage.getItem('bytefisher_lang') === 'en' ? 'en' : 'zh');
  useEffect(() => { localStorage.setItem('bytefisher_lang', lang); document.documentElement.lang = lang; }, [lang]);
  
  // Shared ref for minigame progress to sync Canvas visuals
  const minigameProgressRef = useRef(0);

  const getInitialStats = () => {
    const parsed = readSavedJson<Partial<PlayerStats>>('bytefisher_stats', {});
    return { 
      credits: INITIAL_CREDITS, 
      inventory: [], 
      caughtCount: 0,
      unlockedItems: [], // Default empty
      catchStats: {}, // Default empty
      completedContracts: [],
      ...parsed // Overwrite with saved
    };
  };

  const getInitialUpgrades = () => {
    const parsed = readSavedJson<Partial<Upgrades>>('bytefisher_upgrades', {});
    const level = (key: keyof Upgrades) => {
      const value = Number(parsed?.[key]);
      return Number.isFinite(value) ? Math.max(1, Math.min(5, Math.floor(value))) : 1;
    };
    return { barSize: level('barSize'), stability: level('stability'), luck: level('luck'), netStrength: level('netStrength') };
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
  const [history, setHistory] = useState<HistoryEvent[]>(() => {
    return readSavedJson<HistoryEvent[]>('bytefisher_history', []);
  });

  // Notifications
  const [lastCaught, setLastCaught] = useState<LootItem | null>(null);
  const [catchReady, setCatchReady] = useState(false);
  const handleCatchLanded = useCallback(() => setCatchReady(true), []);
  const [contractToast, setContractToast] = useState<ContractConfig | null>(null);

  const fishmartAudioRef = useRef<HTMLAudioElement | null>(null);
  const reelAudioRef = useRef<HTMLAudioElement | null>(null);
  const swimAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmFadeOutRef = useRef(false);
  const fadeTimersRef = useRef(new Map<HTMLAudioElement, number>());
  const castTimerRef = useRef<number | null>(null);
  const biteTimerRef = useRef<number | null>(null);
  const contractToastTimerRef = useRef<number | null>(null);
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
    fishmart.preload = 'none';
    fishmart.volume = 0;
    fishmartAudioRef.current = fishmart;

    const reel = new Audio(reelAudio);
    reel.loop = true;
    reel.preload = 'none';
    reel.volume = 0;
    reelAudioRef.current = reel;

    const swim = new Audio(swimAudio);
    swim.loop = true;
    swim.preload = 'none';
    swim.volume = 0;
    swimAudioRef.current = swim;

    const bgm = new Audio(bgmAudio);
    bgm.loop = false;
    bgm.preload = 'none';
    bgm.volume = 0;
    bgmAudioRef.current = bgm;

    return () => {
      fadeTimersRef.current.forEach(timerId => window.clearInterval(timerId));
      fadeTimersRef.current.clear();
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

  const clearFishingTimers = useCallback(() => {
    if (castTimerRef.current) {
      window.clearTimeout(castTimerRef.current);
      castTimerRef.current = null;
    }
    if (biteTimerRef.current) {
      window.clearTimeout(biteTimerRef.current);
      biteTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearFishingTimers, [clearFishingTimers]);

  useEffect(() => {
    return () => {
      if (contractToastTimerRef.current) {
        window.clearTimeout(contractToastTimerRef.current);
      }
    };
  }, []);

  // Helper to get item name
  const getItemName = (item: LootItem) => {
    if (item.itemId === 'char_byte') return item.name;
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

  const getCatalogItemName = (itemId: string) => {
    const translation = (t.items as Record<string, { name: string; desc: string }>)[itemId];
    return translation?.name || itemId;
  };

  const showContractToast = useCallback((contract: ContractConfig) => {
    setContractToast(contract);
    if (contractToastTimerRef.current) {
      window.clearTimeout(contractToastTimerRef.current);
    }
    contractToastTimerRef.current = window.setTimeout(() => {
      setContractToast(null);
      contractToastTimerRef.current = null;
    }, 2600);
  }, []);

  const applyContractRewards = useCallback((nextStats: PlayerStats): PlayerStats => {
    const completed = new Set(nextStats.completedContracts || []);
    const newlyCompleted = CONTRACTS.filter(contract => {
      const progress = nextStats.catchStats?.[contract.itemId] || 0;
      return progress >= contract.target && !completed.has(contract.id);
    });

    if (newlyCompleted.length === 0) return nextStats;

    newlyCompleted.forEach(contract => completed.add(contract.id));
    const reward = newlyCompleted.reduce((sum, contract) => sum + contract.reward, 0);
    queueMicrotask(() => showContractToast(newlyCompleted[0]));
    return {
      ...nextStats,
      credits: nextStats.credits + reward,
      completedContracts: Array.from(completed),
    };
  }, [showContractToast]);

  const pushHistory = (event: Omit<HistoryEvent, 'id' | 'at'>) => {
    setHistory(prev => {
      const next = [{ id: createId(), at: Date.now(), ...event }, ...prev];
      return next.slice(0, 200);
    });
  };

  const resetSave = () => {
    clearFishingTimers();
    if (contractToastTimerRef.current) {
      window.clearTimeout(contractToastTimerRef.current);
      contractToastTimerRef.current = null;
    }
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
  };

  // --- GAMEPLAY LOGIC ---

  const startBiteTimer = () => {
    if (biteTimerRef.current) window.clearTimeout(biteTimerRef.current);
    const waitTime = Math.random() * 5000 + 2000; // 2-7s
    biteTimerRef.current = window.setTimeout(() => {
      biteTimerRef.current = null;
      // Need to check if we are still waiting (player didn't cancel)
      setGameState(prev => prev === GameState.WAITING ? GameState.MINIGAME : prev);
    }, waitTime);
  };

  const handleCast = () => {
    if (gameState !== GameState.IDLE) return;
    clearFishingTimers();
    setGameState(GameState.CASTING);
    minigameProgressRef.current = 15;
    castTimerRef.current = window.setTimeout(() => {
      castTimerRef.current = null;
      setGameState(prev => {
        if (prev !== GameState.CASTING) return prev;
        startBiteTimer();
        return GameState.WAITING;
      });
    }, CAST_ANIMATION_MS);
  };

  const handleMinigameSuccess = (perfect: boolean) => {
    const roll = Math.random();
    let item: LootItem;
    const luckLevel = upgrades.luck || 1;
    const treasureChance = Math.min(0.03, 0.01 + (luckLevel - 1) * 0.004);
    const trashChance = Math.max(0.04, 0.12 - (luckLevel - 1) * 0.015) * (perfect ? 0.55 : 1);
    const charChance = Math.min(0.28, 0.13 + (luckLevel - 1) * 0.035);

    if (roll < treasureChance) {
      const tmpl = SPECIAL_LOOT[0]; // Currently only one special item
      item = { ...tmpl, id: createId(), type: LootType.SPECIAL } as LootItem;
    } else if (roll < treasureChance + trashChance) {
      const tmpl = TRASH_LOOT[Math.floor(Math.random() * TRASH_LOOT.length)];
      item = { ...tmpl, id: createId(), type: LootType.TRASH } as LootItem;
    } else if (roll < treasureChance + trashChance + charChance) {
      item = generateCharLoot(luckLevel);
    } else {
      const tmpl = selectWeightedFish(luckLevel, perfect);
      item = { ...tmpl, id: createId(), type: LootType.FISH } as LootItem;
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

      return applyContractRewards({
        ...prev,
        inventory: [...prev.inventory, itemWithPrice],
        caughtCount: prev.caughtCount + 1,
        unlockedItems: Array.from(newUnlocked),
        catchStats: newCatchStats
      });
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
    setCatchReady(false);
    setGameState(GameState.CAUGHT);
  };

  const handleMinigameFail = () => {
    setGameState(GameState.IDLE);
  };

  const claimCatch = () => {
    setCatchReady(false);
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
    const config = UPGRADE_CONFIGS.find(item => item.id === id);
    if (stats.credits >= cost && config && upgrades[id] < config.maxLevel) {
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
    setStats(prev => applyContractRewards({
      ...prev,
      credits: prev.credits - cost,
      inventory: [...prev.inventory, spaceItem],
      unlockedItems: Array.from(new Set([...(prev.unlockedItems || []), 'fish_space'])),
      catchStats: {
        ...(prev.catchStats || {}),
        fish_space: ((prev.catchStats || {}).fish_space || 0) + 1
      }
    }));
    pushHistory({
      type: 'buy_space',
      data: { char: ' ', value: cost }
    });
  };

  const handleBuyByteFish = (char: string, cost: number) => {
    if (stats.credits < cost) return;
    if (!/^[A-Z0-9]$/.test(char)) return;
    const byteItem = createByteFishLoot(char);
    setStats(prev => applyContractRewards({
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
  ].includes(gameState);

  useEffect(() => {
    if (showHud) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.querySelector<HTMLButtonElement>('[data-testid="close-dialog"]')?.focus();
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGameState(GameState.IDLE);
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector('[role="dialog"]');
      const controls = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, textarea, [tabindex="0"]') || []).filter(el => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', handleDialogKey);
    return () => { window.removeEventListener('keydown', handleDialogKey); previousFocus?.focus(); };
  }, [showHud]);

  const activeContract = CONTRACTS.find(contract => !(stats.completedContracts || []).includes(contract.id));
  const activeContractProgress = activeContract
    ? Math.min(activeContract.target, (stats.catchStats || {})[activeContract.itemId] || 0)
    : 0;

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

  const gameStateLabels: Record<GameState, { en: string; zh: string }> = {
    [GameState.IDLE]: { en: 'Signal dock', zh: '信号码头' },
    [GameState.CASTING]: { en: 'Casting probe', zh: '抛出探针' },
    [GameState.WAITING]: { en: 'Scanning stream', zh: '扫描数据流' },
    [GameState.MINIGAME]: { en: 'Signal lock', zh: '锁定信号' },
    [GameState.CAUGHT]: { en: 'Packet captured', zh: '封包捕获' },
    [GameState.SHOP]: { en: 'Black Market', zh: '黑市终端' },
    [GameState.TERMINAL]: { en: 'Terminal Log', zh: '终端日志' },
    [GameState.CODEX]: { en: 'Data Codex', zh: '数据图鉴' },
    [GameState.GUIDEBOOK]: { en: 'Protocol Guide', zh: '协议指南' },
  };
  const zhGameStateLabels: Record<GameState, string> = {
    [GameState.IDLE]: '\u4fe1\u53f7\u7801\u5934',
    [GameState.CASTING]: '\u629b\u51fa\u63a2\u9488',
    [GameState.WAITING]: '\u626b\u63cf\u6570\u636e\u6d41',
    [GameState.MINIGAME]: '\u9501\u5b9a\u4fe1\u53f7',
    [GameState.CAUGHT]: '\u5c01\u5305\u6355\u83b7',
    [GameState.SHOP]: '\u9ed1\u5e02\u7ec8\u7aef',
    [GameState.TERMINAL]: '\u7ec8\u7aef\u65e5\u5fd7',
    [GameState.CODEX]: '\u6570\u636e\u56fe\u9274',
    [GameState.GUIDEBOOK]: '\u534f\u8bae\u6307\u5357',
  };
  const displayedGameState = lang === 'zh'
    ? zhGameStateLabels[gameState]
    : (gameStateLabels[gameState]?.en ?? gameState);

  return (
    <div className="relative w-screen h-[100dvh] min-h-[100svh] overflow-hidden bg-transparent text-cyber-cyan font-sans select-none">
      
      {/* Background Canvas */}
      <VoidCanvas 
        gameState={gameState} 
        lastCaught={lastCaught} 
        minigameProgressRef={minigameProgressRef}
        upgrades={upgrades}
        onCatchLanded={handleCatchLanded}
      />

      {showHud && <GameHud
        lang={lang} state={gameState} credits={displayCredits} catches={stats.caughtCount}
        muted={audioMuted} status={displayedGameState}
        onLanguage={() => setLang(prev => prev === 'en' ? 'zh' : 'en')}
        onAudio={() => setAudioMuted(prev => !prev)}
        onNavigate={setGameState} onCast={handleCast}
        onCancel={() => { clearFishingTimers(); setGameState(GameState.IDLE); }}
        contract={activeContract ? <>{t.contract}: {getCatalogItemName(activeContract.itemId)} <strong>{activeContractProgress}/{activeContract.target}</strong> <span>+{activeContract.reward} cr</span></> : t.contractsComplete}
      />}
      {showHud && contractToast && <div className="contract-toast" role="status">
        {t.contractComplete}: {getCatalogItemName(contractToast.itemId)} +{contractToast.reward} cr
      </div>}

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
      {gameState === GameState.CAUGHT && lastCaught && catchReady && (
        <div data-testid="catch-result" className="absolute inset-0 z-50 flex items-center justify-center bg-[#05070d]/78 backdrop-blur-sm animate-fade-in p-4" onClick={claimCatch}>
           <div className={`ui-panel w-full max-w-md border-4 p-5 sm:p-8 text-center animate-bounce-in relative overflow-hidden
             ${lastCaught.rarity === 'legendary' || lastCaught.type === LootType.SPECIAL
               ? 'border-cyber-yellow'
               : lastCaught.rarity === 'rare'
               ? 'border-cyber-pink'
               : lastCaught.rarity === 'uncommon'
               ? 'border-cyber-cyan'
               : 'border-cyber-green'
             }`}>
              <div className="absolute inset-x-0 top-0 h-2 bg-cyber-yellow/70"></div>
              <h2 className="text-2xl text-cyber-yellow mb-3 relative z-10 font-black">{t.signalAcquired}</h2>
              <img
                src={getItemArt(lastCaught)}
                alt=""
                draggable={false}
                className="relative z-10 mx-auto h-24 w-24 object-contain [image-rendering:pixelated] drop-shadow-[0_0_16px_rgba(0,243,255,0.55)]"
              />
              <div className={`text-3xl sm:text-4xl my-4 font-black relative z-10 break-words ${
                lastCaught.rarity === 'legendary' || lastCaught.type === LootType.SPECIAL
                  ? 'text-cyber-yellow'
                  : lastCaught.rarity === 'rare'
                  ? 'text-cyber-pink'
                  : lastCaught.rarity === 'uncommon'
                  ? 'text-cyber-cyan'
                  : 'text-cyber-green'
              }`}>{getItemName(lastCaught)}</div>
              <div className="ui-panel-soft mb-6 relative z-10 mx-auto w-fit px-4 py-2 text-sm">{t.rarity[lastCaught.rarity]} | {t.value}: ${lastCaught.sellValue ?? lastCaught.value}</div>
              <button type="button" onClick={claimCatch} className="ui-button px-6 py-2 relative z-10" autoFocus>{t.clickContinue}</button>
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

    </div>
  );
};

export default App;
