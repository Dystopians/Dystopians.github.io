import { ContractConfig, LootItem, LootType, UpgradeConfig } from './types';
import { createId } from './utils/id';

export const COLORS = {
  black: '#05070d',
  green: '#39ff14',
  pink: '#ff00ff',
  cyan: '#00f3ff',
  yellow: '#fdfd00',
};

export const APP_VERSION = 'beta0.10.1';
export const INITIAL_CREDITS = 0;
export const SPACE_BYTE_COST = 150;
export const BYTE_FISH_COST = 500;

export const CONTRACTS: ContractConfig[] = [
  { id: 'guppy_scan', itemId: 'fish_neon_guppy', target: 3, reward: 75 },
  { id: 'bass_packet', itemId: 'fish_binary_bass', target: 2, reward: 125 },
  { id: 'eel_current', itemId: 'fish_laser_eel', target: 2, reward: 160 },
  { id: 'byte_phrase', itemId: 'byte_fish', target: 6, reward: 180 },
  { id: 'puffer_patch', itemId: 'fish_packet_puffer', target: 2, reward: 210 },
  { id: 'koi_trace', itemId: 'fish_cyber_koi', target: 1, reward: 260 },
  { id: 'manta_trace', itemId: 'fish_chrome_manta', target: 1, reward: 340 },
  { id: 'void_ray', itemId: 'fish_void_ray', target: 1, reward: 700 },
  { id: 'cache_hunter', itemId: 'special_treasure_chest', target: 1, reward: 500 },
];

export const UPGRADE_CONFIGS: UpgradeConfig[] = [
  {
    id: 'barSize',
    name: 'Signal Amplifier',
    description: 'Increases capture bar size. Visual: Upgrades backpack and antenna.',
    baseCost: 100,
    costMultiplier: 1.8,
    maxLevel: 5,
  },
  {
    id: 'stability',
    name: 'Noise Filter',
    description: 'Makes the catch bar easier to control. Visual: Upgrades boots.',
    baseCost: 75,
    costMultiplier: 1.5,
    maxLevel: 5,
  },
  {
    id: 'luck',
    name: 'Encryption Key',
    description: 'Increases rare drop chance. Visual: Upgrades headgear.',
    baseCost: 200,
    costMultiplier: 2.0,
    maxLevel: 5,
  },
  {
    id: 'netStrength',
    name: 'Download Booster',
    description: 'Increases capture speed. Visual: Upgrades fishing rod.',
    baseCost: 150,
    costMultiplier: 1.6,
    maxLevel: 5,
  },
];

// Helper to create template
const createLoot = (itemId: string, name: string, value: number, rarity: LootItem['rarity'], type: LootType): Partial<LootItem> => ({
  itemId, name, value, rarity, type
});

export const TRASH_LOOT_DEFINITIONS = [
  createLoot('trash_corrupted', 'Corrupted File', 5, 'common', LootType.TRASH),
  createLoot('trash_404', '404 Error', 8, 'common', LootType.TRASH),
  createLoot('trash_null', 'Null Pointer', 2, 'common', LootType.TRASH),
  createLoot('trash_deprecated', 'Deprecated API', 10, 'common', LootType.TRASH),
  createLoot('trash_spaghetti', 'Spaghetti Code', 1, 'common', LootType.TRASH),
];

export const FISH_LOOT_DEFINITIONS = [
  createLoot('fish_neon_guppy', 'Neon Guppy', 25, 'common', LootType.FISH),
  createLoot('fish_laser_eel', 'Laser Eel', 40, 'common', LootType.FISH),
  createLoot('fish_packet_puffer', 'Packet Puffer', 55, 'common', LootType.FISH),
  createLoot('fish_binary_bass', 'Binary Bass', 50, 'uncommon', LootType.FISH),
  createLoot('fish_glitch_trout', 'Glitch Trout', 75, 'uncommon', LootType.FISH),
  createLoot('fish_prism_tetra', 'Prism Tetra', 90, 'uncommon', LootType.FISH),
  createLoot('fish_firewall_angelfish', 'Firewall Angelfish', 120, 'rare', LootType.FISH),
  createLoot('fish_cyber_koi', 'Cyber Koi', 150, 'rare', LootType.FISH),
  createLoot('fish_chrome_manta', 'Chrome Manta', 220, 'rare', LootType.FISH),
  createLoot('fish_mainframe_shark', 'Mainframe Shark', 300, 'legendary', LootType.FISH),
  createLoot('fish_void_ray', 'Void Ray', 420, 'legendary', LootType.FISH),
];

export const SPECIAL_LOOT_DEFINITIONS = [
  createLoot('special_treasure_chest', 'Encrypted Cache', 1000, 'legendary', LootType.SPECIAL),
];

export const SPACE_FISH_DEFINITION = createLoot('fish_space', 'Spacefish', 0, 'common', LootType.FISH);
export const BYTE_FISH_DEFINITION = createLoot('byte_fish', 'ASCII Byte Fish', 0, 'common', LootType.FISH);


// Re-export as the arrays used by game logic
export const TRASH_LOOT = TRASH_LOOT_DEFINITIONS;
export const FISH_LOOT = FISH_LOOT_DEFINITIONS;
export const SPECIAL_LOOT = SPECIAL_LOOT_DEFINITIONS;

// Master list for Codex
export const ALL_LOOT_DEFINITIONS = [
  ...TRASH_LOOT_DEFINITIONS, 
  ...FISH_LOOT_DEFINITIONS,
  ...SPECIAL_LOOT_DEFINITIONS,
  SPACE_FISH_DEFINITION,
  BYTE_FISH_DEFINITION
];

// Generates a random character loot
export const generateCharLoot = (luckLevel: number): LootItem => {
  const normalizedLuck = Math.max(1, Math.min(5, luckLevel || 1));
  const commonChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const uncommonChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const rareChars = '!?@#$%&*+-=<>[]{}';
  const roll = Math.random();
  const rareChance = 0.06 + normalizedLuck * 0.025;
  const uncommonChance = 0.26 + normalizedLuck * 0.035;
  let pool = commonChars;
  let rarity: LootItem['rarity'] = 'common';
  let value = 10;

  if (roll < rareChance) {
    pool = rareChars;
    rarity = 'rare';
    value = 50;
  } else if (roll < rareChance + uncommonChance) {
    pool = uncommonChars;
    rarity = 'uncommon';
    value = 20;
  }

  const char = pool.charAt(Math.floor(Math.random() * pool.length));
  
  return {
    id: createId(),
    itemId: 'char_byte', // Generic ID for chars
    name: `Byte Fish: '${char}'`,
    type: LootType.CHAR,
    value,
    rarity,
    char
  };
};

export const createSpaceCharLoot = (): LootItem => ({
  id: createId(),
  itemId: 'fish_space',
  name: 'Spacefish',
  type: LootType.CHAR,
  value: 0,
  rarity: 'common',
  char: ' '
});

export const createByteFishLoot = (char: string): LootItem => ({
  id: createId(),
  itemId: 'char_byte',
  name: `Byte Fish: '${char}'`,
  type: LootType.CHAR,
  value: 0,
  rarity: /[A-Z]/.test(char) ? 'uncommon' : 'common',
  char
});

export const MOCK_LEADERBOARD = [
  { id: '1', name: 'Neo', message: 'Wake up...', timestamp: Date.now() - 100000 },
  { id: '2', name: 'Morpheus', message: 'Free your mind.', timestamp: Date.now() - 200000 },
  { id: '3', name: 'Trinity', message: 'Dodge this.', timestamp: Date.now() - 300000 },
  { id: '4', name: 'CrashOverride', message: 'HACK THE PLANET!', timestamp: Date.now() - 400000 },
];
