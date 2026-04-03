export enum GameState {
  IDLE = 'IDLE',
  CASTING = 'CASTING',
  WAITING = 'WAITING',
  MINIGAME = 'MINIGAME',
  CAUGHT = 'CAUGHT',
  SHOP = 'SHOP',
  TERMINAL = 'TERMINAL', // Inventory & Leaderboard
  CODEX = 'CODEX', // Fish Encyclopedia
  IMAGE_EDITOR = 'IMAGE_EDITOR', // Image Editor
  GUIDEBOOK = 'GUIDEBOOK', // Tutorial
  CHARACTER_EDITOR = 'CHARACTER_EDITOR', // Character Pixel Editor
}

export enum LootType {
  TRASH = 'TRASH',
  FISH = 'FISH',
  CHAR = 'CHAR',
  SPECIAL = 'SPECIAL',
}

export interface LootItem {
  id: string; // Unique instance ID
  itemId: string; // Type ID for translation/grouping (e.g. 'fish_neon_guppy')
  name: string; // Fallback name
  type: LootType;
  value: number;
  sellValue?: number;
  perfect?: boolean;
  char?: string; // If it's a character
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface PlayerStats {
  credits: number;
  inventory: LootItem[]; 
  caughtCount: number;
  unlockedItems: string[]; // List of itemId's caught
  catchStats: Record<string, number>; // itemId -> quantity caught
}

export interface Upgrades {
  barSize: number; // 1-5
  stability: number; // 1-5
  luck: number; // 1-5
  netStrength: number; // 1-5
}

export interface UpgradeConfig {
  id: keyof Upgrades;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  message: string;
  timestamp: number;
}

export type HistoryEventType =
  | 'catch'
  | 'sell'
  | 'buy_upgrade'
  | 'buy_space'
  | 'buy_byte'
  | 'publish';

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  at: number;
  data: {
    itemId?: string;
    itemName?: string;
    value?: number;
    upgradeId?: keyof Upgrades;
    level?: number;
    char?: string;
    message?: string;
    credits?: number;
  };
}
