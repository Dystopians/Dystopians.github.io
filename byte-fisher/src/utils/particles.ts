// Particle System for Visual Effects
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'circle' | 'square' | 'star' | 'spark' | 'ring';
  rotation?: number;
  rotationSpeed?: number;
}

export class ParticleSystem {
  particles: Particle[] = [];

  update() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // Gravity
      p.life--;
      p.alpha = p.life / p.maxLife;
      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed;
      }
      return p.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      if (p.rotation !== undefined) {
        ctx.rotate(p.rotation);
      }

      switch (p.type) {
        case 'circle':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'square':
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
          break;

        case 'star':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * p.size;
            const y = Math.sin(angle) * p.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;

        case 'spark':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(-p.size * 2, 0);
          ctx.lineTo(p.size * 2, 0);
          ctx.stroke();
          break;

        case 'ring':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.stroke();
          break;
      }

      ctx.restore();
    });
  }

  // Preset Effects
  createExplosion(x: number, y: number, color: string, count = 20, size = 4) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        size: size * (0.5 + Math.random() * 0.5),
        color,
        alpha: 1,
        type: 'circle'
      });
    }
  }

  createSparkles(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2,
        vy: -2 - Math.random() * 2,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1,
        type: 'star',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  createWaterSplash(x: number, y: number, count = 15) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI/2;
      const speed = 3 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 20,
        maxLife: 40,
        size: 2 + Math.random() * 2,
        color: '#00f3ff',
        alpha: 1,
        type: 'circle'
      });
    }
  }

  createShockwave(x: number, y: number, color: string, maxSize = 50, duration = 30) {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.particles.push({
          x, y,
          vx: 0, vy: 0,
          life: duration,
          maxLife: duration,
          size: 5 + (maxSize / 3) * i,
          color,
          alpha: 1,
          type: 'ring'
        });
      }, i * 100);
    }
  }

  createTrail(x: number, y: number, color: string) {
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      life: 15,
      maxLife: 15,
      size: 3,
      color,
      alpha: 1,
      type: 'circle'
    });
  }

  createLegendaryBeam(x: number, y: number, screenHeight: number) {
    // Golden beam from bottom to top
    const beamCount = Math.max(30, Math.min(80, Math.floor(screenHeight / 18)));
    const beamStep = screenHeight / beamCount;
    for (let i = 0; i < beamCount; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y - i * beamStep,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -1,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        size: 3 + Math.random() * 2,
        color: i % 2 === 0 ? '#fdfd00' : '#00f3ff',
        alpha: 1,
        type: 'star',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1
      });
    }
  }

  clear() {
    this.particles = [];
  }
}
