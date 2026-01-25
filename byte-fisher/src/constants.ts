import { LootItem, LootType, UpgradeConfig } from './types';
import { createId } from './utils/id';

export const COLORS = {
  black: '#050505',
  green: '#39ff14',
  pink: '#ff00ff',
  cyan: '#00f3ff',
  yellow: '#fdfd00',
};

export const INITIAL_CREDITS = 0;
export const SPACE_BYTE_COST = 150;

export const UPGRADE_CONFIGS: UpgradeConfig[] = [
  {
    id: 'barSize',
    name: 'Signal Amplifier',
    description: 'Increases capture bar size. Visual: Upgrades Backpack/Antenna.',
    baseCost: 100,
    costMultiplier: 1.8,
    maxLevel: 5,
  },
  {
    id: 'stability',
    name: 'Noise Filter',
    description: 'Stabilizes bar bounce. Visual: Upgrades Boots/Mobility.',
    baseCost: 75,
    costMultiplier: 1.5,
    maxLevel: 5,
  },
  {
    id: 'luck',
    name: 'Encryption Key',
    description: 'Increases rare drop chance. Visual: Upgrades Headgear.',
    baseCost: 200,
    costMultiplier: 2.0,
    maxLevel: 5,
  },
  {
    id: 'netStrength',
    name: 'Download Booster',
    description: 'Increases capture speed. Visual: Upgrades Fishing Rod.',
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
  createLoot('fish_binary_bass', 'Binary Bass', 50, 'uncommon', LootType.FISH),
  createLoot('fish_glitch_trout', 'Glitch Trout', 75, 'uncommon', LootType.FISH),
  createLoot('fish_cyber_koi', 'Cyber Koi', 150, 'rare', LootType.FISH),
  createLoot('fish_mainframe_shark', 'Mainframe Shark', 300, 'legendary', LootType.FISH),
];

export const SPECIAL_LOOT_DEFINITIONS = [
  createLoot('special_treasure_chest', 'Encrypted Cache', 1000, 'legendary', LootType.SPECIAL),
];

// Re-export as the arrays used by game logic
export const TRASH_LOOT = TRASH_LOOT_DEFINITIONS;
export const FISH_LOOT = FISH_LOOT_DEFINITIONS;
export const SPECIAL_LOOT = SPECIAL_LOOT_DEFINITIONS;

// Master list for Codex
export const ALL_LOOT_DEFINITIONS = [
  ...TRASH_LOOT_DEFINITIONS, 
  ...FISH_LOOT_DEFINITIONS,
  ...SPECIAL_LOOT_DEFINITIONS
];

// Generates a random character loot
export const generateCharLoot = (luckLevel: number): LootItem => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?@#$%&*';
  const char = chars.charAt(Math.floor(Math.random() * chars.length));
  
  // Rarity based on type of char roughly
  let rarity: LootItem['rarity'] = 'common';
  let value = 10;
  
  if (/[A-Z]/.test(char)) { value = 20; rarity = 'uncommon'; }
  if (/[!@#$%&*]/.test(char)) { value = 50; rarity = 'rare'; }
  
  return {
    id: createId(),
    itemId: 'char_byte', // Generic ID for chars
    name: `Byte: '${char}'`,
    type: LootType.CHAR,
    value,
    rarity,
    char
  };
};

export const createSpaceCharLoot = (): LootItem => ({
  id: createId(),
  itemId: 'char_byte',
  name: "Byte: ' '",
  type: LootType.CHAR,
  value: 0,
  rarity: 'common',
  char: ' '
});

export const MOCK_LEADERBOARD = [
  { id: '1', name: 'Neo', message: 'Wake up...', timestamp: Date.now() - 100000 },
  { id: '2', name: 'Morpheus', message: 'Free your mind.', timestamp: Date.now() - 200000 },
  { id: '3', name: 'Trinity', message: 'Dodge this.', timestamp: Date.now() - 300000 },
  { id: '4', name: 'CrashOverride', message: 'HACK THE PLANET!', timestamp: Date.now() - 400000 },
];
