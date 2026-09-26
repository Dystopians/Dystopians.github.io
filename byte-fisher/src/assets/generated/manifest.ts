import byteFish from './byte_fish.png';
import charByte from './char_byte.png';
import environmentDigitalOcean from '../harbor/harbor.webp';
import environmentUnderwater from '../harbor/underwater.webp';
import fisherCharacter from '../harbor/angler.png';
import fisherActions from '../harbor/angler-actions.png';
import minigameTarget from '../harbor/fish_neon_guppy.png';
import specialTreasureChest from './special_treasure_chest.png';
import equipmentBackpackLv2 from '../harbor/backpack.png';
import equipmentBackpackLv1 from '../harbor/backpack.png';
import equipmentBackpackLv3 from '../harbor/backpack.png';
import equipmentBackpackLv4 from '../harbor/backpack.png';
import equipmentBackpackLv5 from '../harbor/backpack.png';
import equipmentBootsLv1 from '../harbor/boots.png';
import equipmentBootsLv2 from '../harbor/boots.png';
import equipmentBootsLv3 from '../harbor/boots.png';
import equipmentBootsLv4 from '../harbor/boots.png';
import equipmentBootsLv5 from '../harbor/boots.png';
import equipmentHeadgearLv1 from '../harbor/headgear.png';
import equipmentHeadgearLv2 from '../harbor/headgear.png';
import equipmentHeadgearLv3 from '../harbor/headgear.png';
import equipmentHeadgearLv4 from '../harbor/headgear.png';
import equipmentHeadgearLv5 from '../harbor/headgear.png';
import equipmentRodLv1 from '../harbor/rod.png';
import equipmentRodLv2 from '../harbor/rod.png';
import equipmentRodLv3 from '../harbor/rod.png';
import equipmentRodLv4 from '../harbor/rod.png';
import equipmentRodLv5 from '../harbor/rod.png';
import fishBinaryBass from '../harbor/fish_binary_bass.png';
import fishCyberKoi from '../harbor/fish_cyber_koi.png';
import fishGlitchTrout from '../harbor/fish_glitch_trout.png';
import fishChromeManta from '../harbor/fish_chrome_manta.png';
import fishFirewallAngelfish from '../harbor/fish_firewall_angelfish.png';
import fishLaserEel from '../harbor/fish_laser_eel.png';
import fishMainframeShark from '../harbor/fish_mainframe_shark.png';
import fishNeonGuppy from '../harbor/fish_neon_guppy.png';
import fishPacketPuffer from '../harbor/fish_packet_puffer.png';
import fishPrismTetra from '../harbor/fish_prism_tetra.png';
import fishSpace from '../harbor/fish_space.png';
import fishVoidRay from '../harbor/fish_void_ray.png';
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
  underwater: environmentUnderwater,
};

export const CHARACTER_ART = {
  fisher: fisherCharacter,
  actions: fisherActions,
};

export const UI_ART = {
  minigameTarget,
};
