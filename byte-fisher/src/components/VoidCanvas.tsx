import React, { useRef, useEffect } from 'react';
import { GameState, LootItem, Upgrades, LootType } from '../types';
import { ParticleSystem } from '../utils/particles';
import { ScreenShakeManager, FloatingTextManager, GlowEffect } from '../utils/animations';

interface VoidCanvasProps {
  gameState: GameState;
  lastCaught: LootItem | null;
  minigameProgressRef?: React.MutableRefObject<number>;
  upgrades?: Upgrades;
}

const VoidCanvas: React.FC<VoidCanvasProps> = ({ gameState, lastCaught, minigameProgressRef, upgrades }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const scaleRef = useRef(1);
  const gameStateRef = useRef(gameState);
  const lastStateRef = useRef(gameState);
  const lastCaughtRef = useRef(lastCaught);
  const upgradesRef = useRef(upgrades);
  const progressRef = useRef<React.MutableRefObject<number> | undefined>(minigameProgressRef);

  // Animation state
  const timeRef = useRef<number>(0);
  const debrisRef = useRef<{x: number, y: number, type: string, speed: number, offset: number, scale: number}[]>([]);
  const bubbleRef = useRef<{x: number, y: number, size: number, speed: number}[]>([]);
  const seaweedRef = useRef<{x: number, height: number, width: number, offset: number, color: string}[]>([]);

  // Character & Rod animation state
  const charPos = useRef({ x: 0.5, y: 0.2 });
  const bobberPos = useRef({ x: 0.5, y: 0.4 });
  const rodTipPos = useRef({ x: 0.5, y: 0.2 });
  const castStartRef = useRef<number | null>(null);
  const landingStartRef = useRef<number | null>(null);
  const landingFromRef = useRef<{ x: number; y: number } | null>(null);

  // New visual effects systems
  const particlesRef = useRef<ParticleSystem>(new ParticleSystem());
  const screenShakeRef = useRef<ScreenShakeManager>(new ScreenShakeManager());
  const floatingTextRef = useRef<FloatingTextManager>(new FloatingTextManager());
  const equipmentGlowRef = useRef<{
    boots: GlowEffect;
    backpack: GlowEffect;
    head: GlowEffect;
    rod: GlowEffect;
  }>({
    boots: new GlowEffect(),
    backpack: new GlowEffect(),
    head: new GlowEffect(),
    rod: new GlowEffect()
  });
  const catchEffectTriggeredRef = useRef(false);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const now = performance.now() / 1000;
    if (gameState === GameState.CASTING && lastStateRef.current !== GameState.CASTING) {
      castStartRef.current = now;
      landingStartRef.current = null;
      landingFromRef.current = null;
      catchEffectTriggeredRef.current = false;
      // Cast effect
      const canvas = canvasRef.current;
      if (canvas) {
        particlesRef.current.createSparkles(
          rodTipPos.current.x,
          rodTipPos.current.y,
          '#39ff14',
          8
        );
      }
    }
    if (gameState === GameState.WAITING && lastStateRef.current === GameState.CASTING) {
      landingStartRef.current = now;
      landingFromRef.current = { ...bobberPos.current };
      castStartRef.current = null;
      // Water splash on landing
      const canvas = canvasRef.current;
      if (canvas) {
        const waterLevel = canvas.height * 0.20 + scaleRef.current * (96 + 20);
        particlesRef.current.createWaterSplash(
          bobberPos.current.x,
          waterLevel + scaleRef.current * 200,
          20
        );
      }
    }
    if (gameState === GameState.CAUGHT && lastStateRef.current !== GameState.CAUGHT) {
      catchEffectTriggeredRef.current = false;
    }
    // Reset on returning to IDLE
    if (gameState === GameState.IDLE && lastStateRef.current !== GameState.IDLE) {
      catchEffectTriggeredRef.current = false;
    }
    lastStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    lastCaughtRef.current = lastCaught;
  }, [lastCaught]);

  useEffect(() => {
    upgradesRef.current = upgrades;
  }, [upgrades]);

  useEffect(() => {
    progressRef.current = minigameProgressRef;
  }, [minigameProgressRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scalePx = (value: number) => value * scaleRef.current;

    // --- Initialization Logic ---
    const buildEntities = () => {
      const H = canvas.height;
      const W = canvas.width;
      const charY = H * 0.20;
      const waterSurfaceY = charY + scalePx(96 + 20); // 24*4 (dock height) + 20 (padding)
      const mudY = H - scalePx(80);
      const waterHeight = Math.max(scalePx(100), mudY - waterSurfaceY); // Ensure strictly positive

      debrisRef.current = [];
      bubbleRef.current = [];
      seaweedRef.current = [];

      const types = ['🐟', '🐟', '🐟', '🐟', '🐠', '🐠', '🐠', '🐡', '🐡', '🦈', '🐳', '🦑', '👞', '📦'];
      for (let i = 0; i < 20; i++) {
        debrisRef.current.push({
          x: Math.random() * W,
          // Spawn randomly within the water column, with 50px padding from surface and mud
          y: waterSurfaceY + scalePx(50) + Math.random() * (waterHeight - scalePx(100)),
          type: types[Math.floor(Math.random() * types.length)],
          speed: (Math.random() - 0.5) * scalePx(1.5),
          offset: Math.random() * 10,
          scale: (0.8 + Math.random() * 0.4) * scaleRef.current
        });
      }

      for (let i = 0; i < 40; i++) {
        bubbleRef.current.push({
          x: Math.random() * W,
          // Bubbles can spawn anywhere in the water
          y: waterSurfaceY + Math.random() * waterHeight,
          size: (Math.random() * 3 + 1) * scaleRef.current,
          speed: (Math.random() * 1 + 0.5) * scaleRef.current
        });
      }

      for (let i = 0; i < 60; i++) {
        seaweedRef.current.push({
          x: Math.random() * W,
          height: scalePx(80 + Math.random() * 150),
          width: scalePx(5 + Math.random() * 10),
          offset: Math.random() * Math.PI * 2,
          color: Math.random() > 0.5 ? '#2e8b57' : '#3cb371'
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      charPos.current = { x: canvas.width * 0.5, y: canvas.height * 0.20 };
      const minDim = Math.min(canvas.width, canvas.height);
      scaleRef.current = Math.min(1, Math.max(0.55, minDim / 700));
      buildEntities();
    };
    window.addEventListener('resize', resize);
    resize();

    // Drawing Helpers
    const drawPixelRect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
    };

    const drawGlow = (x: number, y: number, size: number, color: string, intensity: number) => {
      if (intensity <= 0) return;
      ctx.save();
      ctx.shadowBlur = size * intensity;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = intensity * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawCharacter = (t: number) => {
      const s = scalePx(4); // pixel scale

      const bootsLvl = upgradesRef.current?.stability || 1;
      const backpackLvl = upgradesRef.current?.barSize || 1;
      const headLvl = upgradesRef.current?.luck || 1;
      const rodLvl = upgradesRef.current?.netStrength || 1;

      // Update equipment glow effects based on level
      equipmentGlowRef.current.boots.setPulse(bootsLvl >= 3 ? 0.8 : 0);
      equipmentGlowRef.current.backpack.setPulse(backpackLvl >= 3 ? 0.8 : 0);
      equipmentGlowRef.current.head.setPulse(headLvl >= 3 ? 0.8 : 0);
      equipmentGlowRef.current.rod.setPulse(rodLvl >= 3 ? 0.8 : 0);

      const bootsGlow = equipmentGlowRef.current.boots.update(t);
      const backpackGlow = equipmentGlowRef.current.backpack.update(t);
      const headGlow = equipmentGlowRef.current.head.update(t);
      const rodGlow = equipmentGlowRef.current.rod.update(t);

      // Adjust height if floating (Boots lvl 5)
      let floatOffset = 0;
      if (bootsLvl >= 5) {
        floatOffset = Math.sin(t * 3) * scalePx(5) - scalePx(10);
      }

      const x = charPos.current.x;
      const y = charPos.current.y + floatOffset;

      // Pivot for casting animation
      let armAngle = 0; 
      if (gameStateRef.current === GameState.IDLE) armAngle = -Math.PI / 3; 
      else if (gameStateRef.current === GameState.CASTING) armAngle = -Math.PI / 4 + Math.sin(t * 10) * 1.5; 
      else if (gameStateRef.current === GameState.WAITING) armAngle = 0.4; 
      else if (gameStateRef.current === GameState.MINIGAME) armAngle = -0.2 + Math.sin(t*20)*0.1; 
      else if (gameStateRef.current === GameState.CAUGHT) armAngle = -1.2; 

      // --- Draw Dock (Pier Style) ---
      const dockY = charPos.current.y + 24 * s; // Use original Y for dock
      
      ctx.fillStyle = '#0f0f0f';
      for (let px = 0; px < canvas.width; px += scalePx(100)) {
         ctx.fillRect(px + scalePx(10), dockY, scalePx(10), canvas.height - dockY); 
         ctx.fillStyle = '#1a1a1a';
         ctx.fillRect(px, dockY, scalePx(15), canvas.height - dockY); 
      }
      ctx.fillStyle = '#2a2a2a'; 
      ctx.fillRect(0, dockY, canvas.width, scalePx(20)); 
      ctx.fillStyle = '#3a3a3a'; 
      ctx.fillRect(0, dockY, canvas.width, scalePx(5)); 
      
      // Shadow (dynamic if floating)
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const shadowSize = bootsLvl >= 5 ? scalePx(40) + Math.sin(t * 3) * scalePx(5) : scalePx(60);
      ctx.fillRect(x - shadowSize/2, dockY, shadowSize, scalePx(5)); 

      // --- Draw Boots (STABILITY) ---
      // Legs (Standard)
      drawPixelRect(x - 4*s, y + 12*s, 3*s, 12*s, '#1a1a1a'); 
      drawPixelRect(x + 1*s, y + 12*s, 3*s, 12*s, '#1a1a1a'); 

      if (bootsLvl === 1) {
        // Basic Shoes
        drawPixelRect(x - 5*s, y + 22*s, 4*s, 2*s, '#333'); 
        drawPixelRect(x + 1*s, y + 22*s, 4*s, 2*s, '#333'); 
      } else if (bootsLvl === 2) {
         // Heavy Boots
         drawPixelRect(x - 5*s, y + 20*s, 4*s, 4*s, '#555'); 
         drawPixelRect(x + 1*s, y + 20*s, 4*s, 4*s, '#555'); 
      } else if (bootsLvl === 3) {
         // Piston Boots
         drawPixelRect(x - 6*s, y + 18*s, 5*s, 6*s, '#4a4a4a');
         drawPixelRect(x + 2*s, y + 18*s, 5*s, 6*s, '#4a4a4a');
         drawPixelRect(x - 6*s, y + 22*s, 6*s, 2*s, '#777'); // piston
         drawPixelRect(x + 2*s, y + 22*s, 6*s, 2*s, '#777');
         drawGlow(x - 2*s, y + 22*s, scalePx(15), '#777', bootsGlow);
         drawGlow(x + 4*s, y + 22*s, scalePx(15), '#777', bootsGlow);
      } else if (bootsLvl === 4) {
         // Jet Boots
         drawPixelRect(x - 6*s, y + 18*s, 5*s, 6*s, '#fff');
         drawPixelRect(x + 2*s, y + 18*s, 5*s, 6*s, '#fff');
         // Flames
         if (Math.random() > 0.5) {
             drawPixelRect(x - 5*s, y + 24*s, 3*s, 2*s, '#ffaa00');
             drawPixelRect(x + 3*s, y + 24*s, 3*s, 2*s, '#ffaa00');
         }
         drawGlow(x - 2*s, y + 24*s, scalePx(20), '#ff6600', bootsGlow * 1.2);
         drawGlow(x + 4*s, y + 24*s, scalePx(20), '#ff6600', bootsGlow * 1.2);
      } else if (bootsLvl === 5) {
         // Anti-Grav Base
         drawPixelRect(x - 6*s, y + 22*s, 14*s, 2*s, '#00f3ff');
         drawPixelRect(x - 4*s, y + 18*s, 10*s, 4*s, '#333');
         // Particles
         drawPixelRect(x - 8*s, y + 24*s, 18*s, 1, 'rgba(0, 243, 255, 0.5)');
         drawGlow(x + 1*s, y + 22*s, scalePx(25), '#00f3ff', bootsGlow * 1.5);
         // Add trail particles
         if (Math.random() > 0.7) {
           particlesRef.current.createTrail(x + (Math.random() - 0.5) * 12*s, y + 24*s, '#00f3ff');
         }
      }

      // Torso
      drawPixelRect(x - 4*s, y + 2*s, 8*s, 10*s, '#0a2a0a'); 
      drawPixelRect(x - 2*s, y + 3*s, 4*s, 8*s, '#39ff14'); 

      // --- Draw Backpack/Antenna (BAR SIZE) ---
      if (backpackLvl >= 2) {
         // Base Box
         drawPixelRect(x - 6*s, y + 3*s, 2*s, 6*s, '#333');
         
         if (backpackLvl === 3) {
             // Simple Antenna
             ctx.strokeStyle = '#aaa';
             ctx.lineWidth = scalePx(2);
             ctx.beginPath();
             ctx.moveTo(x - 5*s, y + 3*s);
             ctx.lineTo(x - 5*s, y - 5*s);
             ctx.stroke();
             if (Math.floor(t * 5) % 2 === 0) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(x - 6*s, y - 6*s, 2*s, 2*s);
                drawGlow(x - 5*s, y - 6*s, scalePx(10), '#ff0000', backpackGlow * 1.5);
             }
         } else if (backpackLvl === 4) {
             // Satellite Dish
             ctx.fillStyle = '#ccc';
             ctx.beginPath();
             ctx.arc(x - 6*s, y - 2*s, 3*s, 0.5, Math.PI * 1.5);
             ctx.fill();
             // Signal waves
             if (Math.floor(t * 8) % 3 === 0) {
                 ctx.strokeStyle = '#00ff00';
                 ctx.beginPath();
                 ctx.arc(x - 6*s, y - 2*s, 5*s, 3, 5);
                 ctx.stroke();
             }
             drawGlow(x - 6*s, y - 2*s, scalePx(15), '#00ff00', backpackGlow);
         } else if (backpackLvl === 5) {
             // Hover Drone
             const dx = x - 15*s + Math.sin(t*2)*scalePx(5);
             const dy = y - 5*s + Math.cos(t*3)*scalePx(3);
             drawPixelRect(dx, dy, 4*s, 2*s, '#fff'); // body
             drawPixelRect(dx-1*s, dy-1*s, 6*s, 1*s, '#00f3ff'); // rotors
             drawGlow(dx + 2*s, dy, scalePx(20), '#00f3ff', backpackGlow * 1.5);
             // Beam
             ctx.fillStyle = 'rgba(0, 243, 255, 0.1)';
             ctx.beginPath();
             ctx.moveTo(dx + 2*s, dy + 2*s);
             ctx.lineTo(x, y + 5*s);
             ctx.lineTo(x + 2*s, y + 5*s);
             ctx.fill();
             // Add drone trail particles
             if (Math.random() > 0.8) {
               particlesRef.current.createTrail(dx + 2*s, dy + 2*s, '#00f3ff');
             }
         }
      }

      // --- Draw Head/Visor (LUCK) ---
      // Head base
      drawPixelRect(x - 3*s, y - 4*s, 6*s, 6*s, '#f0d0b0'); 

      if (headLvl === 1) {
         // Basic Cap
         drawPixelRect(x - 4*s, y - 5*s, 8*s, 2*s, '#333');
         drawPixelRect(x + 2*s, y - 4*s, 2*s, 1*s, '#333'); 
      } else if (headLvl === 2) {
         // Red VR Goggles
         drawPixelRect(x - 3*s, y - 3*s, 7*s, 2*s, '#cc0000');
         drawPixelRect(x - 4*s, y - 5*s, 8*s, 2*s, '#333'); // Keep hat
      } else if (headLvl === 3) {
         // Golden Visor
         drawPixelRect(x - 3*s, y - 3*s, 7*s, 2*s, '#ffd700');
         if (Math.random() > 0.9) drawPixelRect(x + 2*s, y - 3*s, 1*s, 1*s, '#fff'); // sparkle
         drawGlow(x + 1*s, y - 2*s, scalePx(12), '#ffd700', headGlow);
      } else if (headLvl === 4) {
         // Cyber Glasses + Matrix Rain
         drawPixelRect(x - 3*s, y - 3*s, 7*s, 2*s, '#000');
         drawPixelRect(x - 1*s, y - 3*s, 1*s, 1*s, '#0f0');
         drawPixelRect(x + 2*s, y - 3*s, 1*s, 1*s, '#0f0');
         // Matrix effect above head
         ctx.fillStyle = '#0f0';
         ctx.font = `${scalePx(10)}px monospace`;
         const char = String.fromCharCode(0x30A0 + Math.random() * 96);
        ctx.fillText(char, x, y - 10*s - ((t * 50) % 20) * scaleRef.current);
         drawGlow(x - 1*s, y - 2*s, scalePx(10), '#0f0', headGlow);
         drawGlow(x + 2*s, y - 2*s, scalePx(10), '#0f0', headGlow);
      } else if (headLvl === 5) {
         // Holographic Halo
         drawPixelRect(x - 3*s, y - 3*s, 7*s, 2*s, '#fff'); // White eyes
         ctx.strokeStyle = '#fdfd00';
         ctx.shadowBlur = scalePx(10);
         ctx.shadowColor = '#fdfd00';
         ctx.lineWidth = scalePx(2);
         ctx.beginPath();
         ctx.ellipse(x, y - 8*s, 6*s, 2*s, 0, 0, Math.PI * 2);
         ctx.stroke();
         ctx.shadowBlur = 0;
         drawGlow(x, y - 8*s, scalePx(20), '#fdfd00', headGlow * 1.5);
         // Add halo particles
         if (Math.random() > 0.85) {
           const angle = Math.random() * Math.PI * 2;
           const dist = 6*s;
           particlesRef.current.createTrail(
             x + Math.cos(angle) * dist,
             y - 8*s + Math.sin(angle) * dist * 0.3,
             '#fdfd00'
           );
         }
      }

      // Arms
      const shoulderX = x + 3*s;
      const shoulderY = y + 4*s;
      
      const rodLen = scalePx(100);
      const tipX = shoulderX + Math.cos(armAngle) * rodLen;
      const tipY = shoulderY + Math.sin(armAngle) * rodLen;
      
      ctx.strokeStyle = '#f0d0b0';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + Math.cos(armAngle)*scalePx(20), shoulderY + Math.sin(armAngle)*scalePx(20));
      ctx.stroke();

      // --- Draw Rod (NET STRENGTH) ---
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(tipX, tipY);
      ctx.lineWidth = scalePx(3);
      
      if (rodLvl === 1) {
         // Bamboo
         ctx.strokeStyle = '#8b5a2b';
      } else if (rodLvl === 2) {
         // Steel
         ctx.strokeStyle = '#aaa';
         ctx.lineWidth = scalePx(4);
      } else if (rodLvl === 3) {
         // Neon
         const hue = (t * 50) % 360;
         ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
         ctx.shadowBlur = scalePx(5) * (1 + rodGlow);
         ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
         // Add trail effect
         if (Math.random() > 0.8) {
           const midX = (shoulderX + tipX) / 2;
           const midY = (shoulderY + tipY) / 2;
           particlesRef.current.createTrail(midX, midY, `hsl(${hue}, 100%, 50%)`);
         }
      } else if (rodLvl === 4) {
         // Plasma
         ctx.strokeStyle = '#ff00ff';
         ctx.shadowBlur = scalePx(15) * (1 + rodGlow * 0.5);
         ctx.shadowColor = '#ff00ff';
         ctx.lineWidth = scalePx(4);
         // Add plasma particles
         if (Math.random() > 0.7) {
           const midX = (shoulderX + tipX) / 2;
           const midY = (shoulderY + tipY) / 2;
           particlesRef.current.createTrail(midX + (Math.random() - 0.5) * 10, midY + (Math.random() - 0.5) * 10, '#ff00ff');
         }
      } else if (rodLvl === 5) {
         // Quantum (Void)
         ctx.strokeStyle = '#fff';
         ctx.setLineDash([scalePx(5), scalePx(5)]);
         ctx.shadowBlur = scalePx(20) * (1 + rodGlow * 0.8);
         ctx.shadowColor = '#00f3ff';
         // Add quantum particles
         if (Math.random() > 0.6) {
           const progress = Math.random();
           const qx = shoulderX + (tipX - shoulderX) * progress;
           const qy = shoulderY + (tipY - shoulderY) * progress;
           particlesRef.current.createTrail(qx, qy, '#00f3ff');
         }
         drawGlow(tipX, tipY, scalePx(25), '#00f3ff', rodGlow * 1.5);
      }
      
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
      ctx.shadowBlur = 0; // Reset shadow

      // Rod Details (Reels)
      if (rodLvl >= 2) {
         ctx.fillStyle = '#333';
         const reelX = shoulderX + Math.cos(armAngle) * scalePx(10);
         const reelY = shoulderY + Math.sin(armAngle) * scalePx(10);
         ctx.beginPath();
         ctx.arc(reelX, reelY, scalePx(5), 0, Math.PI*2);
         ctx.fill();
      }

      rodTipPos.current = { x: tipX, y: tipY };
      
      // Basket
      const basketX = charPos.current.x + scalePx(50);
      const basketY = dockY - scalePx(20);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(basketX, basketY, scalePx(30), scalePx(20));
      ctx.strokeStyle = '#333';
      ctx.strokeRect(basketX, basketY, scalePx(30), scalePx(20));
    };

    const drawEnvironment = (t: number) => {
      const waterLevel = charPos.current.y + scalePx(96 + 20); 
      
      const gradient = ctx.createLinearGradient(0, waterLevel, 0, canvas.height);
      gradient.addColorStop(0, '#0055aa'); 
      gradient.addColorStop(0.4, '#003366'); 
      gradient.addColorStop(1, '#001122'); 

      ctx.fillStyle = gradient;
      ctx.fillRect(0, waterLevel, canvas.width, canvas.height - waterLevel);

      ctx.beginPath();
      ctx.moveTo(0, waterLevel);
      ctx.lineTo(canvas.width, waterLevel);
      ctx.strokeStyle = '#00ffff'; 
      ctx.lineWidth = scalePx(3);
      ctx.stroke();

      const mudLevel = canvas.height - scalePx(80);
      ctx.fillStyle = '#2d1e18'; 
      ctx.fillRect(0, mudLevel, canvas.width, scalePx(80));
      
      ctx.fillStyle = '#3e2723';
      for(let i=0; i<20; i++) {
        const mx = (i * scalePx(100) + t * scalePx(20)) % canvas.width;
        ctx.fillRect(mx, mudLevel + scalePx(10), scalePx(30), scalePx(10));
      }

      // 3. Dense Seaweed
      seaweedRef.current.forEach((weed) => {
        const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - weed.height);
        grad.addColorStop(0, '#0f3a1a'); 
        grad.addColorStop(1, '#39ff14'); 

        ctx.fillStyle = grad;
        
        ctx.beginPath();
        const startX = weed.x;
        const startY = canvas.height;
        ctx.moveTo(startX - weed.width/2, startY);
        
        const cp1x = startX + Math.sin(t + weed.offset) * scalePx(20);
        const cp1y = startY - weed.height * 0.5;
        const endX = startX + Math.sin(t * 1.5 + weed.offset) * scalePx(40);
        const endY = startY - weed.height;
        
        ctx.quadraticCurveTo(cp1x - weed.width/2, cp1y, endX, endY);
        ctx.quadraticCurveTo(cp1x + weed.width/2, cp1y, startX + weed.width/2, startY);
        
        ctx.closePath();
        ctx.fill();
      });

      // Bubbles
      ctx.fillStyle = 'rgba(200, 255, 255, 0.4)'; 
      bubbleRef.current.forEach(b => {
        b.y -= b.speed;
        if (b.y < waterLevel) b.y = canvas.height - Math.random() * 50; 
        ctx.beginPath();
        ctx.arc(b.x + Math.sin(t + b.y*0.1)*2, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Debris / Fish
      ctx.font = `${scalePx(30)}px Arial`; 
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; 
      
      debrisRef.current.forEach(d => {
        d.x += d.speed;
        if (d.x > canvas.width + 50) d.x = -50;
        if (d.x < -50) d.x = canvas.width + 50;
        const floatY = d.y + Math.sin(t * 2 + d.offset) * scalePx(5);
        
        // Relaxed visibility check to ensure fish near surface are seen
        if (floatY > waterLevel && floatY < canvas.height - scalePx(10)) {
           ctx.save();
           ctx.translate(d.x, floatY);
           // Scale flipping
           if (d.speed > 0) {
             ctx.scale(-1, 1);
           }
           const scale = d.scale || 1;
           ctx.scale(scale, scale);
           ctx.fillText(d.type, 0, 0);
           ctx.restore();
        }
      });
    };

    const drawFishingMechanics = (t: number) => {
      if (gameStateRef.current === GameState.SHOP || gameStateRef.current === GameState.TERMINAL || gameStateRef.current === GameState.IMAGE_EDITOR || gameStateRef.current === GameState.CODEX || gameStateRef.current === GameState.GUIDEBOOK) return;

      const rodTip = rodTipPos.current;
      const waterLevel = charPos.current.y + scalePx(96 + 20); 
      const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
      const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
      const clamp01 = (p: number) => Math.max(0, Math.min(1, p));
      
      // Determine Bobber Position
      if (gameStateRef.current === GameState.IDLE) {
         bobberPos.current.x = rodTip.x;
         bobberPos.current.y = rodTip.y + scalePx(60) + Math.sin(t * 2) * scalePx(5); 
      } else if (gameStateRef.current === GameState.CASTING) {
          if (castStartRef.current === null) castStartRef.current = t;
          const p = clamp01((t - castStartRef.current) / 0.6);
          const eased = easeOutCubic(p);
          const startX = rodTip.x;
          const startY = rodTip.y + scalePx(20);
          const endX = rodTip.x + scalePx(150);
          const endY = waterLevel + scalePx(200);
          const arc = Math.sin(eased * Math.PI) * scalePx(80);
          bobberPos.current.x = lerp(startX, endX, eased);
          bobberPos.current.y = lerp(startY, endY, eased) - arc;
      } else if (gameStateRef.current === GameState.WAITING) {
          const targetX = rodTip.x + scalePx(150);
          const deepY = waterLevel + scalePx(200); 
          const targetY = deepY + Math.sin(t * 2) * scalePx(10);
          if (landingStartRef.current !== null && landingFromRef.current) {
            const p = clamp01((t - landingStartRef.current) / 0.35);
            const eased = easeOutCubic(p);
            bobberPos.current.x = lerp(landingFromRef.current.x, targetX, eased);
            bobberPos.current.y = lerp(landingFromRef.current.y, targetY, eased);
            if (p >= 1) {
              landingStartRef.current = null;
              landingFromRef.current = null;
            }
          } else {
            bobberPos.current.x = targetX;
            bobberPos.current.y = targetY;
          }
      } else if (gameStateRef.current === GameState.MINIGAME) {
          bobberPos.current.x = rodTip.x + scalePx(150);
          
          const progress = progressRef.current?.current || 0;
          const clampedProgress = Math.max(0, Math.min(100, progress));
          const normalizedProgress = clampedProgress / 100; // 0 to 1
          
          const startDepth = waterLevel + scalePx(200);
          const endDepth = waterLevel + scalePx(20);
          
          const currentDepth = startDepth - ((startDepth - endDepth) * normalizedProgress);
          
          // Add shake effect
          bobberPos.current.y = currentDepth + (Math.random() - 0.5) * scalePx(5); 

      } else if (gameStateRef.current === GameState.CAUGHT) {
          const dx = rodTip.x - bobberPos.current.x;
          const dy = rodTip.y - bobberPos.current.y;
          bobberPos.current.x += dx * 0.1;
          bobberPos.current.y += dy * 0.1;
      }

      // Draw Line
      ctx.beginPath();
      ctx.moveTo(rodTip.x, rodTip.y);
      if (gameStateRef.current === GameState.WAITING) {
         ctx.quadraticCurveTo(rodTip.x + scalePx(20), waterLevel, bobberPos.current.x, bobberPos.current.y);
      } else if (gameStateRef.current === GameState.MINIGAME) {
         ctx.lineTo(bobberPos.current.x, bobberPos.current.y);
      } else {
         if (gameStateRef.current === GameState.IDLE) {
           ctx.lineTo(bobberPos.current.x, bobberPos.current.y);
         } else {
           ctx.quadraticCurveTo(rodTip.x + scalePx(50), bobberPos.current.y, bobberPos.current.x, bobberPos.current.y);
         }
      }
      
      // Line Color
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; 
      if (gameStateRef.current === GameState.MINIGAME) {
        ctx.strokeStyle = '#ff3333'; 
        ctx.lineWidth = scalePx(1.5);
      } else {
        ctx.lineWidth = scalePx(1);
      }
      ctx.stroke();

      // Draw Bobber
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(bobberPos.current.x, bobberPos.current.y, scalePx(6), 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bobberPos.current.x, bobberPos.current.y, scalePx(6), 0, Math.PI, true); 
      ctx.fill();
      
      // Stick on bobber
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = scalePx(2);
      ctx.beginPath();
      ctx.moveTo(bobberPos.current.x, bobberPos.current.y - scalePx(6));
      ctx.lineTo(bobberPos.current.x, bobberPos.current.y - scalePx(12));
      ctx.stroke();

      // Draw Hooked Fish (Signal)
      if (gameStateRef.current === GameState.MINIGAME) {
        ctx.font = `${scalePx(40)}px Arial`;
        ctx.fillText('🐟', bobberPos.current.x, bobberPos.current.y + scalePx(30) + Math.sin(t*15)*scalePx(5)); 
        ctx.font = `${scalePx(40)}px Arial`;
        ctx.fillStyle = '#ffff00';
        ctx.fillText('!', bobberPos.current.x, bobberPos.current.y - scalePx(40));
      }

      // Draw Flying Fish (Success)
      if (gameStateRef.current === GameState.CAUGHT && lastCaughtRef.current) {
         const basketX = charPos.current.x + scalePx(50);
         const basketY = charPos.current.y + scalePx(96) - scalePx(20);

         // Trigger catch effects once
         if (!catchEffectTriggeredRef.current) {
           catchEffectTriggeredRef.current = true;
           const item = lastCaughtRef.current;

           // Screen shake based on rarity
           const shakeMap = { common: 3, uncommon: 6, rare: 10, legendary: 15 };
           screenShakeRef.current.start(shakeMap[item.rarity], 300);

           // Particles based on rarity
           if (item.rarity === 'legendary' || item.type === LootType.SPECIAL) {
             particlesRef.current.createLegendaryBeam(basketX + scalePx(15), basketY, canvas.height);
             particlesRef.current.createShockwave(basketX + scalePx(15), basketY, '#ffd700', 100, 40);
             floatingTextRef.current.add('LEGENDARY!', basketX + scalePx(15), basketY - scalePx(60), '#ffd700', 24);
           } else if (item.rarity === 'rare') {
             particlesRef.current.createExplosion(basketX + scalePx(15), basketY, '#ff00ff', 30, 6);
             particlesRef.current.createSparkles(basketX + scalePx(15), basketY, '#ff00ff', 15);
             floatingTextRef.current.add('RARE!', basketX + scalePx(15), basketY - scalePx(50), '#ff00ff', 20);
           } else if (item.rarity === 'uncommon') {
             particlesRef.current.createExplosion(basketX + scalePx(15), basketY, '#00f3ff', 20, 4);
             floatingTextRef.current.add('Nice!', basketX + scalePx(15), basketY - scalePx(40), '#00f3ff', 16);
           } else {
             particlesRef.current.createSparkles(basketX + scalePx(15), basketY, '#39ff14', 10);
           }
         }

         // Special Effect for Treasure
         if (lastCaughtRef.current.type === LootType.SPECIAL) {
             ctx.font = `${scalePx(50)}px Arial`;
             ctx.fillText('🎁', basketX + scalePx(15), basketY - scalePx(30) - (Math.sin(t*10)*scalePx(10)));
             // Sparkles
             ctx.fillStyle = '#ffd700';
             for(let i=0; i<5; i++) {
                 ctx.fillRect(
                    basketX + Math.random()*scalePx(40),
                    basketY - scalePx(40) + Math.random()*scalePx(40),
                    scalePx(3), scalePx(3)
                 );
             }
         } else {
             ctx.font = `${scalePx(30)}px Arial`;
             ctx.fillText('✨', basketX + scalePx(15), basketY - scalePx(20) - (Math.sin(t*10)*scalePx(10)));
         }
      }
    };

    const render = (timestamp: number) => {
      timeRef.current = timestamp / 1000;

      // Update visual effects systems
      particlesRef.current.update();
      floatingTextRef.current.update();
      const shake = screenShakeRef.current.update(1/60);

      // Clear background - Dark Sky
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply screen shake
      ctx.save();
      ctx.translate(shake.x, shake.y);

      drawEnvironment(timeRef.current);
      drawCharacter(timeRef.current);
      drawFishingMechanics(timeRef.current);

      // Draw particle effects
      particlesRef.current.draw(ctx);
      floatingTextRef.current.draw(ctx, scaleRef.current);

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render(0);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
    />
  );
};

export default VoidCanvas;
