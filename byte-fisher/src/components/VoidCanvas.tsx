import React, { useRef, useEffect } from 'react';
import { GameState, LootItem, Upgrades, LootType } from '../types';
import { ParticleSystem } from '../utils/particles';
import { ScreenShakeManager, FloatingTextManager } from '../utils/animations';
import { CHARACTER_ART, ENVIRONMENT_ART, EQUIPMENT_ART, LOOT_ART, UI_ART } from '../assets/generated/manifest';

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
  const debrisRef = useRef<{x: number, y: number, assetId: string, speed: number, offset: number, scale: number}[]>([]);
  const bubbleRef = useRef<{x: number, y: number, size: number, speed: number}[]>([]);
  const seaweedRef = useRef<{x: number, height: number, width: number, offset: number, color: string}[]>([]);
  const artImagesRef = useRef<Record<string, HTMLImageElement>>({});

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
  const catchEffectTriggeredRef = useRef(false);

  useEffect(() => {
    const artSources: Record<string, string> = {
      ...LOOT_ART,
      fisher: CHARACTER_ART.fisher,
      ...Object.fromEntries(
        Object.entries(EQUIPMENT_ART).flatMap(([slot, levels]) =>
          Object.entries(levels).map(([level, src]) => [`equipment_${slot}_${level}`, src])
        )
      ),
      environment: ENVIRONMENT_ART.backdrop,
      minigameTarget: UI_ART.minigameTarget,
    };
    Object.entries(artSources).forEach(([id, src]) => {
      const image = new Image();
      image.src = src;
      artImagesRef.current[id] = image;
    });
  }, []);

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
      const charY = charPos.current.y;
      const waterSurfaceY = charY + scalePx(96 + 20); // 24*4 (dock height) + 20 (padding)
      const mudY = H - scalePx(80);
      const waterHeight = Math.max(scalePx(100), mudY - waterSurfaceY); // Ensure strictly positive

      debrisRef.current = [];
      bubbleRef.current = [];
      seaweedRef.current = [];

      const assetIds = [
        'fish_neon_guppy',
        'fish_laser_eel',
        'fish_packet_puffer',
        'fish_binary_bass',
        'fish_glitch_trout',
        'fish_prism_tetra',
        'fish_firewall_angelfish',
        'fish_cyber_koi',
        'fish_chrome_manta',
        'fish_void_ray',
        'fish_space',
        'trash_corrupted',
        'trash_404',
        'trash_null',
        'trash_deprecated',
        'trash_spaghetti',
      ];
      for (let i = 0; i < 18; i++) {
        const direction = Math.random() > 0.5 ? 1 : -1;
        debrisRef.current.push({
          x: scalePx(96) + Math.random() * Math.max(1, W - scalePx(192)),
          // Spawn randomly within the water column, with 50px padding from surface and mud
          y: waterSurfaceY + scalePx(50) + Math.random() * (waterHeight - scalePx(100)),
          assetId: assetIds[Math.floor(Math.random() * assetIds.length)],
          speed: direction * scalePx(0.36 + Math.random() * 0.72),
          offset: Math.random() * 10,
          scale: (0.9 + Math.random() * 0.45) * scaleRef.current
        });
      }

      for (let i = 0; i < 26; i++) {
        bubbleRef.current.push({
          x: Math.random() * W,
          // Bubbles can spawn anywhere in the water
          y: waterSurfaceY + Math.random() * waterHeight,
          size: (Math.random() * 3 + 1) * scaleRef.current,
          speed: (Math.random() * 1 + 0.5) * scaleRef.current
        });
      }

      for (let i = 0; i < 0; i++) {
        seaweedRef.current.push({
          x: Math.random() * W,
          height: scalePx(34 + Math.random() * 68),
          width: scalePx(4 + Math.random() * 6),
          offset: Math.random() * Math.PI * 2,
          color: Math.random() > 0.5 ? '#00f3ff' : '#ff00ff'
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const minDim = Math.min(canvas.width, canvas.height);
      scaleRef.current = Math.min(1, Math.max(0.55, minDim / 700));
      const mobileClearanceY = canvas.width < 430 ? 164 : 0;
      charPos.current = { x: canvas.width * 0.5, y: Math.max(canvas.height * 0.20, mobileClearanceY) };
      buildEntities();
    };
    window.addEventListener('resize', resize);
    resize();

    const drawGeneratedArt = (
      assetId: string,
      centerX: number,
      centerY: number,
      width: number,
      height: number,
      alpha = 1,
      rotation = 0
    ) => {
      const image = artImagesRef.current[assetId];
      if (!image?.complete || image.naturalWidth === 0) return false;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.restore();
      return true;
    };

    const drawCharacter = (t: number) => {
      const s = scalePx(4); // pixel scale

      const bootsLvl = upgradesRef.current?.stability || 1;
      const rodLvl = upgradesRef.current?.netStrength || 1;
      const backpackLvl = upgradesRef.current?.barSize || 1;
      const headLvl = upgradesRef.current?.luck || 1;

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
      
      const dockHeight = scalePx(30);
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, dockY, canvas.width, dockHeight);
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(0, dockY + scalePx(5), canvas.width, scalePx(18));
      ctx.fillStyle = 'rgba(0, 243, 255, 0.75)';
      for (let py = dockY + scalePx(7); py < dockY + dockHeight; py += scalePx(9)) {
        ctx.fillRect(0, py, canvas.width, scalePx(1.5));
      }
      for (let px = scalePx(16); px < canvas.width; px += scalePx(64)) {
        ctx.fillStyle = px % scalePx(128) < scalePx(64) ? 'rgba(255, 0, 255, 0.58)' : 'rgba(253, 253, 0, 0.54)';
        ctx.fillRect(px, dockY + scalePx(4), scalePx(18), scalePx(4));
      }
      
      // Shadow (dynamic if floating)
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const shadowSize = bootsLvl >= 5 ? scalePx(40) + Math.sin(t * 3) * scalePx(5) : scalePx(60);
      ctx.fillRect(x - shadowSize/2, dockY, shadowSize, scalePx(5)); 

      {
      drawGeneratedArt(
        `equipment_barSize_${Math.min(Math.max(backpackLvl, 1), 5)}`,
        x - scalePx(35),
        y + scalePx(70),
        scalePx(50),
        scalePx(50),
        0.95
      );

      const characterDrawn = drawGeneratedArt('fisher', x - scalePx(4), y + scalePx(58), scalePx(92), scalePx(116), 1);
      if (!characterDrawn) {
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(x - scalePx(18), y + scalePx(28), scalePx(36), scalePx(50));
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(x - scalePx(24), y + scalePx(6), scalePx(48), scalePx(12));
      }

      drawGeneratedArt(
        `equipment_stability_${Math.min(Math.max(bootsLvl, 1), 5)}`,
        x + scalePx(2),
        y + scalePx(112),
        scalePx(62),
        scalePx(44),
        0.98
      );
      drawGeneratedArt(
        `equipment_luck_${Math.min(Math.max(headLvl, 1), 5)}`,
        x - scalePx(4),
        y + scalePx(22),
        scalePx(60),
        scalePx(46),
        0.98
      );

      const shoulderX = x + scalePx(35);
      const shoulderY = y + scalePx(48);
      const rodLen = scalePx(112);
      const tipX = shoulderX + Math.cos(armAngle) * rodLen;
      const tipY = shoulderY + Math.sin(armAngle) * rodLen;
      const sourceRodAngle = -Math.PI / 4;
      const rodDrawn = drawGeneratedArt(
        `equipment_netStrength_${Math.min(Math.max(rodLvl, 1), 5)}`,
        shoulderX + Math.cos(armAngle) * rodLen * 0.42,
        shoulderY + Math.sin(armAngle) * rodLen * 0.42,
        scalePx(132),
        scalePx(88),
        1,
        armAngle - sourceRodAngle
      );
      if (!rodDrawn) {
        const rodColors = ['#00f3ff', '#39ff14', '#fdfd00', '#ff00ff', '#ffffff'];
        ctx.strokeStyle = rodColors[Math.min(rodLvl, 5) - 1];
        ctx.lineWidth = scalePx(3);
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.fillStyle = '#05070d';
        const reelX = shoulderX + Math.cos(armAngle) * scalePx(15);
        const reelY = shoulderY + Math.sin(armAngle) * scalePx(15);
        ctx.beginPath();
        ctx.arc(reelX, reelY, scalePx(5), 0, Math.PI * 2);
        ctx.fill();
      }

      rodTipPos.current = { x: tipX, y: tipY };
      const basketX = charPos.current.x + scalePx(54);
      const basketY = dockY - scalePx(20);
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(basketX, basketY, scalePx(30), scalePx(20));
      ctx.strokeStyle = '#00f3ff';
      ctx.strokeRect(basketX, basketY, scalePx(30), scalePx(20));
      return;
      }

    };

    const drawEnvironment = (t: number) => {
      const waterLevel = charPos.current.y + scalePx(96 + 20); 
      const backgroundImage = artImagesRef.current.environment;

      if (backgroundImage?.complete) {
        const scale = Math.max(canvas.width / backgroundImage.width, canvas.height / backgroundImage.height);
        const width = backgroundImage.width * scale;
        const height = backgroundImage.height * scale;
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(backgroundImage, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        ctx.restore();
      }
      
      const gradient = ctx.createLinearGradient(0, waterLevel, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0, 243, 255, 0.28)'); 
      gradient.addColorStop(0.42, 'rgba(0, 91, 122, 0.44)'); 
      gradient.addColorStop(1, 'rgba(2, 7, 18, 0.76)'); 

      ctx.fillStyle = gradient;
      ctx.fillRect(0, waterLevel, canvas.width, canvas.height - waterLevel);

      ctx.beginPath();
      ctx.moveTo(0, waterLevel);
      ctx.lineTo(canvas.width, waterLevel);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.88)'; 
      ctx.lineWidth = scalePx(3);
      ctx.stroke();

      const mudLevel = canvas.height - scalePx(80);
      ctx.fillStyle = 'rgba(3, 5, 10, 0.88)'; 
      ctx.fillRect(0, mudLevel, canvas.width, scalePx(80));
      
      ctx.fillStyle = 'rgba(0, 243, 255, 0.26)';
      for(let i=0; i<20; i++) {
        const mx = (i * scalePx(100) + t * scalePx(20)) % canvas.width;
        ctx.fillRect(mx, mudLevel + scalePx(10), scalePx(46), scalePx(3));
      }

      ctx.fillStyle = 'rgba(255, 0, 255, 0.18)';
      for (let i = 0; i < 18; i++) {
        const rx = (i * scalePx(130) - t * scalePx(24)) % (canvas.width + scalePx(130));
        const ry = waterLevel + scalePx(18 + (i % 7) * 31);
        ctx.fillRect(rx - scalePx(130), ry, scalePx(64), scalePx(2));
      }

      // 3. Dense Seaweed
      seaweedRef.current.forEach((weed) => {
        const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - weed.height);
        grad.addColorStop(0, '#062036'); 
        grad.addColorStop(1, '#00f3ff'); 

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
      ctx.fillStyle = 'rgba(0, 243, 255, 0.34)'; 
      bubbleRef.current.forEach(b => {
        b.y -= b.speed;
        if (b.y < waterLevel) b.y = canvas.height - Math.random() * 50; 
        ctx.beginPath();
        ctx.arc(b.x + Math.sin(t + b.y*0.1)*2, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Debris / Fish
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; 
      
      debrisRef.current.forEach(d => {
        d.x += d.speed;
        const wrapMargin = scalePx(d.assetId.startsWith('trash') ? 56 : 120);
        if (d.x > canvas.width + wrapMargin) d.x = -wrapMargin;
        if (d.x < -wrapMargin) d.x = canvas.width + wrapMargin;
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
           const asset = artImagesRef.current[d.assetId];
           if (asset?.complete) {
             const w = scalePx(d.assetId.startsWith('trash') ? 36 : 58) / Math.max(scale, 0.01);
             const h = scalePx(d.assetId.startsWith('trash') ? 36 : 40) / Math.max(scale, 0.01);
             ctx.imageSmoothingEnabled = false;
             ctx.drawImage(asset, -w / 2, -h / 2, w, h);
           } else {
             ctx.font = `${scalePx(30)}px Arial`;
              ctx.fillText('><>', 0, 0);
           }
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
        const hookedFish = artImagesRef.current.minigameTarget;
        const fishY = bobberPos.current.y + scalePx(30) + Math.sin(t*15)*scalePx(5);
        if (hookedFish?.complete) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(hookedFish, bobberPos.current.x - scalePx(24), fishY - scalePx(16), scalePx(48), scalePx(32));
          ctx.restore();
        } else {
          ctx.font = `${scalePx(40)}px Arial`;
          ctx.fillText('><>', bobberPos.current.x, fishY);
        }
        ctx.font = `${scalePx(40)}px Arial`;
      ctx.fillStyle = '#fdfd00';
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
             particlesRef.current.createShockwave(basketX + scalePx(15), basketY, '#fdfd00', 100, 40);
             floatingTextRef.current.add('LEGENDARY!', basketX + scalePx(15), basketY - scalePx(60), '#fdfd00', 24);
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
             const specialArt = artImagesRef.current[lastCaughtRef.current.itemId];
             if (specialArt?.complete) {
               ctx.save();
               ctx.imageSmoothingEnabled = false;
               ctx.drawImage(
                 specialArt,
                 basketX - scalePx(12),
                 basketY - scalePx(62) - (Math.sin(t*10)*scalePx(10)),
                 scalePx(54),
                 scalePx(54)
               );
               ctx.restore();
             } else {
               ctx.font = `${scalePx(50)}px Arial`;
                ctx.fillText('BOX', basketX + scalePx(15), basketY - scalePx(30) - (Math.sin(t*10)*scalePx(10)));
             }
             // Sparkles
             ctx.fillStyle = '#fdfd00';
             for(let i=0; i<5; i++) {
                 ctx.fillRect(
                    basketX + Math.random()*scalePx(40),
                    basketY - scalePx(40) + Math.random()*scalePx(40),
                    scalePx(3), scalePx(3)
                 );
             }
         } else {
             const item = lastCaughtRef.current;
             const artId = item.type === LootType.CHAR ? 'char_byte' : item.itemId;
             const itemArt = artImagesRef.current[artId];
             if (itemArt?.complete) {
               ctx.save();
               ctx.imageSmoothingEnabled = false;
               ctx.drawImage(
                 itemArt,
                 basketX - scalePx(10),
                 basketY - scalePx(58) - (Math.sin(t*10)*scalePx(10)),
                 scalePx(50),
                 scalePx(38)
               );
               ctx.restore();
             } else {
               ctx.font = `${scalePx(30)}px Arial`;
                ctx.fillText('OK', basketX + scalePx(15), basketY - scalePx(20) - (Math.sin(t*10)*scalePx(10)));
             }
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
