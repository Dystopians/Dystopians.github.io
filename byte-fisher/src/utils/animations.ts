// Animation Utilities
export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const easeOutBounce = (t: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export interface ScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
}

export class ScreenShakeManager {
  shake: ScreenShake | null = null;

  start(intensity: number, duration: number) {
    this.shake = { intensity, duration, elapsed: 0 };
  }

  update(dt: number): { x: number; y: number } {
    if (!this.shake) return { x: 0, y: 0 };

    // Convert dt from seconds to milliseconds to match duration units
    this.shake.elapsed += dt * 1000;
    if (this.shake.elapsed >= this.shake.duration) {
      this.shake = null;
      return { x: 0, y: 0 };
    }

    const progress = this.shake.elapsed / this.shake.duration;
    const currentIntensity = this.shake.intensity * (1 - progress);

    return {
      x: (Math.random() - 0.5) * currentIntensity * 2,
      y: (Math.random() - 0.5) * currentIntensity * 2
    };
  }

  stop() {
    this.shake = null;
  }
}

export class NumberCounter {
  current: number;
  target: number;
  speed: number;

  constructor(initial: number, speed = 0.1) {
    this.current = initial;
    this.target = initial;
    this.speed = speed;
  }

  setTarget(value: number) {
    this.target = value;
  }

  update(): boolean {
    const diff = this.target - this.current;
    if (Math.abs(diff) < 0.1) {
      this.current = this.target;
      return false;
    }
    this.current += diff * this.speed;
    return true;
  }

  getValue(): number {
    return Math.round(this.current);
  }
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class FloatingTextManager {
  texts: FloatingText[] = [];

  add(text: string, x: number, y: number, color: string, size = 20) {
    this.texts.push({
      text,
      x,
      y,
      vy: -2,
      life: 60,
      maxLife: 60,
      color,
      size
    });
  }

  update() {
    this.texts = this.texts.filter(t => {
      t.y += t.vy;
      t.vy *= 0.95; // Decelerate
      t.life--;
      return t.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D, scale: number) {
    this.texts.forEach(t => {
      const alpha = t.life / t.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${t.size * scale}px monospace`;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3 * scale;
      ctx.textAlign = 'center';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });
  }
}

// Equipment glow effect
export class GlowEffect {
  intensity: number = 0;
  targetIntensity: number = 0;
  pulseSpeed: number = 2;

  setPulse(target: number) {
    this.targetIntensity = target;
  }

  update(time: number) {
    // Smooth transition
    this.intensity += (this.targetIntensity - this.intensity) * 0.1;
    // Add pulse
    return this.intensity + Math.sin(time * this.pulseSpeed) * 0.2 * this.intensity;
  }
}
