/**
 * 角色渲染器
 *
 * 负责绘制模块化的角色，支持像素艺术和精灵图两种模式
 */

import {
  CharacterSkeleton,
  CharacterPart,
  EquipmentLevel,
  bootsRenderers,
  headgearRenderers,
  rodRenderers,
  colorThemes
} from './characterParts';

export interface CharacterRenderOptions {
  // 装备等级
  bootsLevel: EquipmentLevel;
  headLevel: EquipmentLevel;
  backpackLevel: EquipmentLevel;
  rodLevel: EquipmentLevel;

  // 动画参数
  time: number;
  armAngle: number;
  floatOffset: number;

  // 颜色主题
  colorTheme?: 'default' | 'dark' | 'neon';

  // 发光效果强度
  glowIntensities?: {
    boots: number;
    head: number;
    backpack: number;
    rod: number;
  };
}

export class CharacterRenderer {
  private ctx: CanvasRenderingContext2D;
  private skeleton: CharacterSkeleton;

  constructor(ctx: CanvasRenderingContext2D, skeleton: CharacterSkeleton) {
    this.ctx = ctx;
    this.skeleton = skeleton;
  }

  /**
   * 绘制单个部件
   */
  private drawPart(part: CharacterPart, options: CharacterRenderOptions) {
    if (part.visible === false) return;

    const { ctx } = this;
    const { centerX, centerY, scale } = this.skeleton;
    const colors = colorThemes[options.colorTheme || 'default'];

    ctx.save();

    // 移动到部件位置
    const x = centerX + part.x;
    const y = centerY + part.y + options.floatOffset;
    ctx.translate(x, y);

    // 应用旋转
    if (part.rotation !== undefined) {
      ctx.rotate(part.rotation);
    }

    // 应用翻转
    if (part.flipX || part.flipY) {
      ctx.scale(part.flipX ? -1 : 1, part.flipY ? -1 : 1);
    }

    // 应用锚点偏移
    const anchorX = part.anchorX !== undefined ? part.anchorX : 0.5;
    const anchorY = part.anchorY !== undefined ? part.anchorY : 0.5;
    const offsetX = -part.width * anchorX;
    const offsetY = -part.height * anchorY;

    // 绘制精灵图或像素艺术
    if (part.image) {
      // 绘制精灵图
      ctx.drawImage(
        part.image,
        part.sx || 0,
        part.sy || 0,
        part.sw || part.image.width,
        part.sh || part.image.height,
        offsetX,
        offsetY,
        part.width,
        part.height
      );
    } else if (part.pixelArt) {
      // 绘制像素艺术
      ctx.translate(offsetX, offsetY);
      part.pixelArt(ctx, scale, colors);
    }

    ctx.restore();
  }

  /**
   * 绘制发光效果
   */
  private drawGlow(x: number, y: number, size: number, color: string, intensity: number) {
    if (intensity <= 0) return;

    const { ctx } = this;
    ctx.save();
    ctx.shadowBlur = size * intensity;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = intensity * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * 绘制角色阴影
   */
  private drawShadow(dockY: number, options: CharacterRenderOptions) {
    const { ctx } = this;
    const { centerX } = this.skeleton;
    const scale = this.skeleton.scale;
    const s = scale * 4;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';

    // 根据靴子等级调整阴影
    let shadowSize = 60 * s;
    if (options.bootsLevel >= 5) {
      // 悬浮时阴影更小且动态
      shadowSize = 40 * s + Math.sin(options.time * 3) * 5 * s;
    }

    ctx.fillRect(centerX - shadowSize / 2, dockY, shadowSize, 5 * s);
  }

  /**
   * 绘制码头
   */
  private drawDock() {
    const { ctx } = this;
    const { centerY, scale } = this.skeleton;
    const s = scale * 4;
    const dockY = centerY + 24 * s;
    const canvasWidth = ctx.canvas.width;
    const dockHeight = 30 * scale;

    // 支柱
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, dockY, canvasWidth, dockHeight);

    // 平台
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, dockY + 5 * scale, canvasWidth, 18 * scale);
    ctx.fillStyle = '#00f3ff';
    for (let py = dockY + 7 * scale; py < dockY + dockHeight; py += 9 * scale) {
      ctx.fillRect(0, py, canvasWidth, 2 * scale);
    }
    ctx.fillStyle = '#ff00ff';
    for (let px = 16 * scale; px < canvasWidth; px += 64 * scale) {
      ctx.fillRect(px, dockY + 3 * scale, 6 * scale, dockHeight - 6 * scale);
    }

    return dockY;
  }

  /**
   * 绘制装备特效
   */
  private drawEquipmentEffects(options: CharacterRenderOptions) {
    const { centerX, centerY } = this.skeleton;
    const s = this.skeleton.scale * 4;
    const y = centerY + options.floatOffset;
    const glowIntensities = options.glowIntensities || { boots: 0, head: 0, backpack: 0, rod: 0 };

    // 靴子发光
    if (options.bootsLevel >= 3) {
      const renderer = bootsRenderers[options.bootsLevel];
      if (renderer.glowColor && glowIntensities.boots > 0) {
        this.drawGlow(
          centerX,
          y + 64 * s,
          25 * s,
          renderer.glowColor,
          glowIntensities.boots * (renderer.glowIntensity || 1)
        );
      }
    }

    // 头部装备发光
    if (options.headLevel >= 3) {
      const renderer = headgearRenderers[options.headLevel];
      if (renderer.glowColor && glowIntensities.head > 0) {
        this.drawGlow(
          centerX,
          y - 8 * s,
          20 * s,
          renderer.glowColor,
          glowIntensities.head * (renderer.glowIntensity || 1)
        );
      }
    }

    // 钓竿发光（在竿尖位置）
    if (options.rodLevel >= 3) {
      const renderer = rodRenderers[options.rodLevel];
      if (renderer.glowColor && glowIntensities.rod > 0) {
        const rodLen = 100 * this.skeleton.scale;
        const tipX = centerX + 12 * s + Math.cos(options.armAngle) * rodLen;
        const tipY = y + 16 * s + Math.sin(options.armAngle) * rodLen;

        this.drawGlow(
          tipX,
          tipY,
          30 * s,
          renderer.glowColor,
          glowIntensities.rod * (renderer.glowIntensity || 1)
        );
      }
    }
  }

  /**
   * 绘制手臂和钓竿
   */
  private drawArmAndRod(options: CharacterRenderOptions) {
    const { ctx } = this;
    const { centerX, centerY, scale } = this.skeleton;
    const s = scale * 4;
    const y = centerY + options.floatOffset;

    const shoulderX = centerX + 12 * s;
    const shoulderY = y + 16 * s;

    // 绘制上臂
    ctx.strokeStyle = colorThemes[options.colorTheme || 'default'].skin;
    ctx.lineWidth = 12 * s;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(
      shoulderX + Math.cos(options.armAngle) * 20 * scale,
      shoulderY + Math.sin(options.armAngle) * 20 * scale
    );
    ctx.stroke();

    // 绘制钓竿
    const rodLen = 100 * scale;
    const tipX = shoulderX + Math.cos(options.armAngle) * rodLen;
    const tipY = shoulderY + Math.sin(options.armAngle) * rodLen;

    const renderer = rodRenderers[options.rodLevel];

    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(tipX, tipY);

    if (renderer.pixelArt) {
      renderer.pixelArt(ctx, scale, options.time, colorThemes[options.colorTheme || 'default']);
    }

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // 绘制卷线器
    if (options.rodLevel >= 2) {
      const reelX = shoulderX + Math.cos(options.armAngle) * 10 * scale;
      const reelY = shoulderY + Math.sin(options.armAngle) * 10 * scale;
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(reelX, reelY, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    return { tipX, tipY };
  }

  /**
   * 绘制篮子
   */
  private drawBasket(dockY: number) {
    const { ctx } = this;
    const { centerX, scale } = this.skeleton;

    const basketX = centerX + 50 * scale;
    const basketY = dockY - 20 * scale;

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(basketX, basketY, 30 * scale, 20 * scale);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(basketX, basketY, 30 * scale, 20 * scale);
  }

  /**
   * 完整绘制角色
   */
  public render(options: CharacterRenderOptions) {
    const { parts } = this.skeleton;

    // 1. 绘制码头
    const dockY = this.drawDock();

    // 2. 绘制阴影
    this.drawShadow(dockY, options);

    // 3. 按层级绘制部件
    const sortedParts = Object.values(parts).sort((a, b) => a.layer - b.layer);

    for (const part of sortedParts) {
      // 跳过特殊处理的部件
      if (['rod', 'rodReel', 'rodTip', 'armUpper', 'armLower', 'hand'].includes(part.id)) {
        continue;
      }

      // 根据装备等级决定是否绘制和使用哪个渲染器
      if (part.id === 'boots') {
        const renderer = bootsRenderers[options.bootsLevel];
        if (renderer.pixelArt) {
          this.ctx.save();
          this.ctx.translate(this.skeleton.centerX, this.skeleton.centerY + options.floatOffset + 56 * this.skeleton.scale * 4);
          renderer.pixelArt(this.ctx, this.skeleton.scale, options.time, colorThemes[options.colorTheme || 'default']);
          this.ctx.restore();
        }
        continue;
      }

      if (part.id === 'headgear' && options.headLevel >= 1) {
        const renderer = headgearRenderers[options.headLevel];
        if (renderer.pixelArt) {
          this.ctx.save();
          this.ctx.translate(this.skeleton.centerX, this.skeleton.centerY + options.floatOffset - 8 * this.skeleton.scale * 4);
          renderer.pixelArt(this.ctx, this.skeleton.scale, options.time, colorThemes[options.colorTheme || 'default']);
          this.ctx.restore();
        }
        continue;
      }

      this.drawPart(part, options);
    }

    // 4. 绘制手臂和钓竿
    this.drawArmAndRod(options);

    // 5. 绘制装备发光效果
    this.drawEquipmentEffects(options);

    // 6. 绘制篮子
    this.drawBasket(dockY);
  }
}

/**
 * 精灵图资源管理器
 */
export class SpriteManager {
  private sprites: Map<string, HTMLImageElement> = new Map();
  private loading: Map<string, Promise<HTMLImageElement>> = new Map();

  /**
   * 加载精灵图
   */
  async loadSprite(id: string, url: string): Promise<HTMLImageElement> {
    if (this.sprites.has(id)) {
      return this.sprites.get(id)!;
    }

    if (this.loading.has(id)) {
      return this.loading.get(id)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.sprites.set(id, img);
        this.loading.delete(id);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });

    this.loading.set(id, promise);
    return promise;
  }

  /**
   * 获取精灵图
   */
  getSprite(id: string): HTMLImageElement | undefined {
    return this.sprites.get(id);
  }

  /**
   * 批量加载精灵图
   */
  async loadSprites(sprites: Record<string, string>): Promise<void> {
    await Promise.all(
      Object.entries(sprites).map(([id, url]) => this.loadSprite(id, url))
    );
  }
}
