import byteFish from './byte_fish.png';
import charByte from './char_byte.png';
import environmentDigitalOcean from './environment_digital_ocean.png';
import fisherCharacter from './fisher_character.png';
import minigameTarget from './minigame_target.png';
import specialTreasureChest from './special_treasure_chest.png';
import tilePier from './tile_pier.png';
import tileWater from './tile_water.png';
import equipmentBackpackLv2 from './equipment_backpack_lv2.png';
import equipmentBackpackLv1 from './equipment_backpack_lv1.png';
import equipmentBackpackLv3 from './equipment_backpack_lv3.png';
import equipmentBackpackLv4 from './equipment_backpack_lv4.png';
import equipmentBackpackLv5 from './equipment_backpack_lv5.png';
import equipmentBootsLv1 from './equipment_boots_lv1.png';
import equipmentBootsLv2 from './equipment_boots_lv2.png';
import equipmentBootsLv3 from './equipment_boots_lv3.png';
import equipmentBootsLv4 from './equipment_boots_lv4.png';
import equipmentBootsLv5 from './equipment_boots_lv5.png';
import equipmentHeadgearLv1 from './equipment_headgear_lv1.png';
import equipmentHeadgearLv2 from './equipment_headgear_lv2.png';
import equipmentHeadgearLv3 from './equipment_headgear_lv3.png';
import equipmentHeadgearLv4 from './equipment_headgear_lv4.png';
import equipmentHeadgearLv5 from './equipment_headgear_lv5.png';
import equipmentRodLv1 from './equipment_rod_lv1.png';
import equipmentRodLv2 from './equipment_rod_lv2.png';
import equipmentRodLv3 from './equipment_rod_lv3.png';
import equipmentRodLv4 from './equipment_rod_lv4.png';
import equipmentRodLv5 from './equipment_rod_lv5.png';
import fishBinaryBass from './fish_binary_bass.png';
import fishCyberKoi from './fish_cyber_koi.png';
import fishGlitchTrout from './fish_glitch_trout.png';
import fishChromeManta from './fish_chrome_manta.png';
import fishFirewallAngelfish from './fish_firewall_angelfish.png';
import fishLaserEel from './fish_laser_eel.png';
import fishMainframeShark from './fish_mainframe_shark.png';
import fishNeonGuppy from './fish_neon_guppy.png';
import fishPacketPuffer from './fish_packet_puffer.png';
import fishPrismTetra from './fish_prism_tetra.png';
import fishSpace from './fish_space.png';
import fishVoidRay from './fish_void_ray.png';
import trash404 from './trash_404.png';
import trashCorrupted from './trash_corrupted.png';
import trashDeprecated from './trash_deprecated.png';
import trashNull from './trash_null.png';
import trashSpaghetti from './trash_spaghetti.png';

export const LOOT_ART: Record<string, string> = {
  byte_fish: byteFish,
  char_byte: charByte,
  fish_binary_bass: fishBinaryBass,
  fish_chrome_manta: fishChromeManta,
  fish_cyber_koi: fishCyberKoi,
  fish_firewall_angelfish: fishFirewallAngelfish,
  fish_glitch_trout: fishGlitchTrout,
  fish_laser_eel: fishLaserEel,
  fish_mainframe_shark: fishMainframeShark,
  fish_neon_guppy: fishNeonGuppy,
  fish_packet_puffer: fishPacketPuffer,
  fish_prism_tetra: fishPrismTetra,
  fish_space: fishSpace,
  fish_void_ray: fishVoidRay,
  special_treasure_chest: specialTreasureChest,
  trash_404: trash404,
  trash_corrupted: trashCorrupted,
  trash_deprecated: trashDeprecated,
  trash_null: trashNull,
  trash_spaghetti: trashSpaghetti,
};

export const EQUIPMENT_ART = {
  barSize: {
    1: equipmentBackpackLv1,
    2: equipmentBackpackLv2,
    3: equipmentBackpackLv3,
    4: equipmentBackpackLv4,
    5: equipmentBackpackLv5,
  },
  stability: {
    1: equipmentBootsLv1,
    2: equipmentBootsLv2,
    3: equipmentBootsLv3,
    4: equipmentBootsLv4,
    5: equipmentBootsLv5,
  },
  luck: {
    1: equipmentHeadgearLv1,
    2: equipmentHeadgearLv2,
    3: equipmentHeadgearLv3,
    4: equipmentHeadgearLv4,
    5: equipmentHeadgearLv5,
  },
  netStrength: {
    1: equipmentRodLv1,
    2: equipmentRodLv2,
    3: equipmentRodLv3,
    4: equipmentRodLv4,
    5: equipmentRodLv5,
  },
} as const;

export const ENVIRONMENT_ART = {
  backdrop: environmentDigitalOcean,
  pierTile: tilePier,
  waterTile: tileWater,
};

export const CHARACTER_ART = {
  fisher: fisherCharacter,
};

export const UI_ART = {
  minigameTarget,
};
