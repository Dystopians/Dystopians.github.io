/**
 * 角色部件系统 - 模块化设计
 *
 * 坐标系说明：
 * - 所有坐标相对于角色中心点（胸部中心）
 * - X轴：向右为正
 * - Y轴：向下为正
 * - 单位：像素（会被 scale 缩放）
 */

export interface PartTransform {
  x: number;          // 相对X坐标
  y: number;          // 相对Y坐标
  width: number;      // 宽度
  height: number;     // 高度
  anchorX?: number;   // 锚点X (0-1)，默认0.5
  anchorY?: number;   // 锚点Y (0-1)，默认0.5
  rotation?: number;  // 旋转角度（弧度）
  flipX?: boolean;    // 水平翻转
  flipY?: boolean;    // 垂直翻转
}

export interface PartSprite {
  image?: HTMLImageElement;  // 精灵图（如果有）
  sx?: number;               // 精灵图源X
  sy?: number;               // 精灵图源Y
  sw?: number;               // 精灵图源宽度
  sh?: number;               // 精灵图源高度
}

export interface CharacterPart extends PartTransform, PartSprite {
  id: string;                // 部件ID
  layer: number;             // 绘制层级（越小越先绘制）
  visible?: boolean;         // 是否可见
  pixelArt?: (ctx: CanvasRenderingContext2D, scale: number, colors: Record<string, string>) => void; // 像素绘制函数
}

/**
 * 角色骨架定义
 */
export interface CharacterSkeleton {
  // 基础位置
  centerX: number;
  centerY: number;
  scale: number;

  // 身体部件
  parts: {
    // 头部
    head: CharacterPart;
    headgear: CharacterPart;      // 帽子/头盔（LUCK装备）
    visor: CharacterPart;          // 护目镜/面罩

    // 躯干
    torso: CharacterPart;
    torsoDetail: CharacterPart;    // 躯干装饰

    // 背部装备
    backpack: CharacterPart;       // 背包（BAR_SIZE装备）
    antenna: CharacterPart;        // 天线/无人机

    // 手臂
    armUpper: CharacterPart;       // 上臂
    armLower: CharacterPart;       // 下臂
    hand: CharacterPart;           // 手

    // 腿部
    legUpper: CharacterPart;       // 大腿
    legLower: CharacterPart;       // 小腿

    // 鞋子（STABILITY装备）
    boots: CharacterPart;

    // 钓竿（NET_STRENGTH装备）
    rod: CharacterPart;
    rodReel: CharacterPart;        // 卷线器
    rodTip: CharacterPart;         // 竿尖
  };
}

/**
 * 创建默认角色骨架
 */
export const createDefaultSkeleton = (centerX: number, centerY: number, scale: number): CharacterSkeleton => {
  const s = scale * 4; // 像素单位

  return {
    centerX,
    centerY,
    scale,
    parts: {
      // === 头部 ===
      head: {
        id: 'head',
        layer: 5,
        x: 0,
        y: -8 * s,
        width: 24 * s,
        height: 24 * s,
        anchorX: 0.5,
        anchorY: 0.5,
        pixelArt: (ctx, scale, colors) => {
          const s = scale * 4;
          const px = -12 * s;
          const py = -12 * s;
          // 头部基础
          ctx.fillStyle = colors.skin || '#f0d0b0';
          ctx.fillRect(px, py, 24 * s, 24 * s);
          // 眼睛
          ctx.fillStyle = '#000';
          ctx.fillRect(px + 6 * s, py + 10 * s, 4 * s, 4 * s);
          ctx.fillRect(px + 14 * s, py + 10 * s, 4 * s, 4 * s);
          // 嘴巴
          ctx.fillRect(px + 8 * s, py + 16 * s, 8 * s, 2 * s);
        }
      },

      headgear: {
        id: 'headgear',
        layer: 6,
        x: 0,
        y: -16 * s,
        width: 32 * s,
        height: 8 * s,
        visible: true
      },

      visor: {
        id: 'visor',
        layer: 7,
        x: 0,
        y: -6 * s,
        width: 28 * s,
        height: 8 * s,
        visible: false
      },

      // === 躯干 ===
      torso: {
        id: 'torso',
        layer: 4,
        x: 0,
        y: 6 * s,
        width: 32 * s,
        height: 40 * s,
        pixelArt: (ctx, scale, colors) => {
          const s = scale * 4;
          const px = -16 * s;
          const py = -14 * s;
          // 外套
          ctx.fillStyle = colors.jacket || '#0a2a0a';
          ctx.fillRect(px, py, 32 * s, 40 * s);
        }
      },

      torsoDetail: {
        id: 'torsoDetail',
        layer: 5,
        x: 0,
        y: 6 * s,
        width: 16 * s,
        height: 32 * s,
        pixelArt: (ctx, scale, colors) => {
          const s = scale * 4;
          const px = -8 * s;
          const py = -10 * s;
          // 内衣/装饰
          ctx.fillStyle = colors.shirt || '#39ff14';
          ctx.fillRect(px, py, 16 * s, 32 * s);
        }
      },

      // === 背部装备 ===
      backpack: {
        id: 'backpack',
        layer: 3,
        x: -20 * s,
        y: 6 * s,
        width: 8 * s,
        height: 24 * s,
        visible: false
      },

      antenna: {
        id: 'antenna',
        layer: 10,
        x: -20 * s,
        y: -20 * s,
        width: 16 * s,
        height: 40 * s,
        visible: false
      },

      // === 手臂（右侧，持竿） ===
      armUpper: {
        id: 'armUpper',
        layer: 4,
        x: 12 * s,
        y: 0,
        width: 12 * s,
        height: 20 * s,
        anchorX: 0.5,
        anchorY: 0,
        pixelArt: (ctx, scale, colors) => {
          const s = scale * 4;
          ctx.fillStyle = colors.skin || '#f0d0b0';
          ctx.fillRect(-6 * s, 0, 12 * s, 20 * s);
        }
      },

      armLower: {
        id: 'armLower',
        layer: 4,
        x: 12 * s,
        y: 20 * s,
        width: 12 * s,
        height: 20 * s,
        anchorX: 0.5,
        anchorY: 0
      },

      hand: {
        id: 'hand',
        layer: 4,
        x: 12 * s,
        y: 40 * s,
        width: 12 * s,
        height: 12 * s
      },

      // === 腿部 ===
      legUpper: {
        id: 'legUpper',
        layer: 3,
        x: -8 * s,
        y: 32 * s,
        width: 12 * s,
        height: 24 * s,
        pixelArt: (ctx, scale, colors) => {
          const s = scale * 4;
          ctx.fillStyle = colors.pants || '#1a1a1a';
          ctx.fillRect(0, 0, 12 * s, 24 * s);
        }
      },

      legLower: {
        id: 'legLower',
        layer: 3,
        x: 4 * s,
        y: 32 * s,
        width: 12 * s,
        height: 24 * s,
        pixelArt: (ctx, scale, colors) => {
          const s = scale * 4;
          ctx.fillStyle = colors.pants || '#1a1a1a';
          ctx.fillRect(0, 0, 12 * s, 24 * s);
        }
      },

      // === 靴子 ===
      boots: {
        id: 'boots',
        layer: 3,
        x: 0,
        y: 56 * s,
        width: 32 * s,
        height: 16 * s
      },

      // === 钓竿 ===
      rod: {
        id: 'rod',
        layer: 9,
        x: 12 * s,
        y: 16 * s,
        width: 400,
        height: 12 * s,
        anchorX: 0,
        anchorY: 0.5
      },

      rodReel: {
        id: 'rodReel',
        layer: 10,
        x: 20 * s,
        y: 16 * s,
        width: 20 * s,
        height: 20 * s
      },

      rodTip: {
        id: 'rodTip',
        layer: 9,
        x: 400,
        y: 16 * s,
        width: 8 * s,
        height: 8 * s
      }
    }
  };
};

/**
 * 装备渲染器映射
 */
export type EquipmentLevel = 1 | 2 | 3 | 4 | 5;

export interface EquipmentRenderer {
  pixelArt?: (ctx: CanvasRenderingContext2D, scale: number, time: number, colors: Record<string, string>) => void;
  sprite?: PartSprite;
  glowColor?: string;
  glowIntensity?: number;
  particleColor?: string;
}

/**
 * 靴子装备渲染器
 */
export const bootsRenderers: Record<EquipmentLevel, EquipmentRenderer> = {
  1: {
    pixelArt: (ctx, scale, time, colors) => {
      const s = scale * 4;
      // 基础鞋子
      ctx.fillStyle = '#333';
      ctx.fillRect(-20 * s, 0, 16 * s, 8 * s);
      ctx.fillRect(4 * s, 0, 16 * s, 8 * s);
    }
  },
  2: {
    pixelArt: (ctx, scale, time, colors) => {
      const s = scale * 4;
      // 重型靴子
      ctx.fillStyle = '#555';
      ctx.fillRect(-20 * s, -4 * s, 16 * s, 16 * s);
      ctx.fillRect(4 * s, -4 * s, 16 * s, 16 * s);
      // 金属装饰
      ctx.fillStyle = '#888';
      ctx.fillRect(-20 * s, 4 * s, 16 * s, 4 * s);
      ctx.fillRect(4 * s, 4 * s, 16 * s, 4 * s);
    }
  },
  3: {
    pixelArt: (ctx, scale, time, colors) => {
      const s = scale * 4;
      // 活塞靴
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(-24 * s, -8 * s, 20 * s, 24 * s);
      ctx.fillRect(8 * s, -8 * s, 20 * s, 24 * s);
      // 活塞杆
      ctx.fillStyle = '#777';
      ctx.fillRect(-24 * s, 8 * s, 24 * s, 8 * s);
      ctx.fillRect(8 * s, 8 * s, 24 * s, 8 * s);
    },
    glowColor: '#777',
    glowIntensity: 0.8
  },
  4: {
    pixelArt: (ctx, scale, time, colors) => {
      const s = scale * 4;
      // 喷射靴主体
      ctx.fillStyle = '#fff';
      ctx.fillRect(-24 * s, -8 * s, 20 * s, 24 * s);
      ctx.fillRect(8 * s, -8 * s, 20 * s, 24 * s);
      // 喷射口
      ctx.fillStyle = '#333';
      ctx.fillRect(-20 * s, 12 * s, 12 * s, 4 * s);
      ctx.fillRect(12 * s, 12 * s, 12 * s, 4 * s);
      // 动态火焰
      if (Math.random() > 0.5) {
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(-20 * s, 16 * s, 12 * s, 8 * s);
        ctx.fillRect(12 * s, 16 * s, 12 * s, 8 * s);
      }
    },
    glowColor: '#ff6600',
    glowIntensity: 1.2,
    particleColor: '#ffaa00'
  },
  5: {
    pixelArt: (ctx, scale, time, colors) => {
      const s = scale * 4;
      // 反重力平台
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(-24 * s, 8 * s, 56 * s, 8 * s);
      // 悬浮装置
      ctx.fillStyle = '#333';
      ctx.fillRect(-16 * s, -8 * s, 40 * s, 16 * s);
      // 能量线
      ctx.fillStyle = 'rgba(0, 243, 255, 0.5)';
      ctx.fillRect(-32 * s, 16 * s, 72 * s, 4 * s);
    },
    glowColor: '#00f3ff',
    glowIntensity: 1.5,
    particleColor: '#00f3ff'
  }
};

/**
 * 头部装备渲染器
 */
export const headgearRenderers: Record<EquipmentLevel, EquipmentRenderer> = {
  1: {
    pixelArt: (ctx, scale, time, colors) => {
      const s = scale * 4;
      // 基础帽子
      ctx.fillStyle = '#333';
      ctx.fillRect(-16 * s, 0, 32 * s, 8 * s);
      // 帽檐
      ctx.fillRect(8 * s, 4 * s, 8 * s, 4 * s);
    }
  },
  2: {
    pixelArt: (ctx, scale, time, colors) => {
      const s = scale * 4;
      // VR护目镜
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(-12 * s, 0, 28 * s, 8 * s);
      // 镜片
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(-8 * s, 2 * s, 8 * s, 4 * s);
      ctx.fillRect(8 * s, 2 * s, 8 * s, 4 * s);
    }
  },
  3: {
    pixelArt: (ctx, scale, time, colors) => {
      const s = scale * 4;
      // 金色护目镜
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-12 * s, 0, 28 * s, 8 * s);
      // 闪光效果
      if (Math.random() > 0.9) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(8 * s, 2 * s, 4 * s, 4 * s);
      }
    },
    glowColor: '#ffd700',
    glowIntensity: 1.0
  },
  4: {
    pixelArt: (ctx, scale, time, colors) => {
      const s = scale * 4;
      // 赛博眼镜
      ctx.fillStyle = '#000';
      ctx.fillRect(-12 * s, 0, 28 * s, 8 * s);
      // 绿色LED
      ctx.fillStyle = '#0f0';
      ctx.fillRect(-4 * s, 2 * s, 4 * s, 4 * s);
      ctx.fillRect(8 * s, 2 * s, 4 * s, 4 * s);
    },
    glowColor: '#0f0',
    glowIntensity: 1.0
  },
  5: {
    pixelArt: (ctx, scale, time, colors) => {
      const s = scale * 4;
      // 全息眼睛
      ctx.fillStyle = '#fff';
      ctx.fillRect(-12 * s, 0, 28 * s, 8 * s);
      // 光环
      ctx.strokeStyle = '#fdfd00';
      ctx.lineWidth = 8;
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#fdfd00';
      ctx.beginPath();
      ctx.ellipse(0, -16 * s, 24 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    },
    glowColor: '#fdfd00',
    glowIntensity: 1.5,
    particleColor: '#fdfd00'
  }
};

/**
 * 钓竿装备渲染器
 */
export const rodRenderers: Record<EquipmentLevel, EquipmentRenderer> = {
  1: {
    pixelArt: (ctx, scale, time, colors) => {
      // 竹竿
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 12;
    }
  },
  2: {
    pixelArt: (ctx, scale, time, colors) => {
      // 钢竿
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 16;
    }
  },
  3: {
    pixelArt: (ctx, scale, time, colors) => {
      // 霓虹竿
      const hue = (time * 50) % 360;
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.lineWidth = 12;
      ctx.shadowBlur = 20;
      ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
    },
    particleColor: 'rainbow'
  },
  4: {
    pixelArt: (ctx, scale, time, colors) => {
      // 等离子竿
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 16;
      ctx.shadowBlur = 60;
      ctx.shadowColor = '#ff00ff';
    },
    glowColor: '#ff00ff',
    glowIntensity: 1.5,
    particleColor: '#ff00ff'
  },
  5: {
    pixelArt: (ctx, scale, time, colors) => {
      // 量子竿
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 12;
      ctx.setLineDash([20, 20]);
      ctx.shadowBlur = 80;
      ctx.shadowColor = '#00f3ff';
    },
    glowColor: '#00f3ff',
    glowIntensity: 2.0,
    particleColor: '#00f3ff'
  }
};

/**
 * 颜色主题
 */
export const colorThemes = {
  default: {
    skin: '#f0d0b0',
    jacket: '#0a2a0a',
    shirt: '#39ff14',
    pants: '#1a1a1a'
  },
  dark: {
    skin: '#8b7355',
    jacket: '#1a1a1a',
    shirt: '#00f3ff',
    pants: '#0a0a0a'
  },
  neon: {
    skin: '#ffd0a0',
    jacket: '#ff00ff',
    shirt: '#fdfd00',
    pants: '#00f3ff'
  }
};
