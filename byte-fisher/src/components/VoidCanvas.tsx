import React, { useEffect, useRef } from 'react';
import { GameState, LootItem, LootType, Upgrades } from '../types';
import { CHARACTER_ART, ENVIRONMENT_ART, LOOT_ART } from '../assets/generated/manifest';
import { CAST_ANIMATION_SECONDS } from '../constants';
import { CAST_RELEASE_PROGRESS, clamp, getCastBobber, getRodPose, getSceneLayout } from '../utils/sceneLayout';
import { ANGLER_ATLAS, LANDING_ANIMATION_SECONDS, RECOVERY_SECONDS, getAnglerGeometry, getLandingPosition, mixPoint, recoveryProgress, sampleAnglerMotion } from '../utils/anglerAnimation';

interface VoidCanvasProps {
  gameState: GameState;
  lastCaught: LootItem | null;
  minigameProgressRef?: React.MutableRefObject<number>;
  upgrades?: Upgrades;
  onCatchLanded?: () => void;
}

const VoidCanvas: React.FC<VoidCanvasProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  live.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const images: Record<string, HTMLImageElement> = {};
    Object.entries({ harbor: ENVIRONMENT_ART.backdrop, underwater: ENVIRONMENT_ART.underwater, angler: CHARACTER_ART.fisher, actions: CHARACTER_ART.actions, ...LOOT_ART }).forEach(([id, src]) => {
      const image = new Image(); image.src = src; images[id] = image;
    });
    let layout = getSceneLayout(1, 1);
    let dpr = 1;
    let frame = 0;
    let previousTime = 0;
    let elapsed = 0;
    let stateTime = 0;
    let previousState = live.current.gameState;
    let lastMotion = sampleAnglerMotion(previousState, 0, 0);
    let returnMotion = lastMotion;
    let previousBobber = { x: 0, y: 0 };
    let returnBobber = previousBobber;
    let recovering = false;
    let catchNotified = false;
    const fishIds = ['fish_neon_guppy', 'fish_binary_bass', 'fish_cyber_koi', 'fish_laser_eel', 'fish_prism_tetra', 'fish_chrome_manta'];
    const fish = Array.from({ length: 9 }, (_, i) => ({ phase: (i * 0.137) % 1, depth: (i % 3) / 3 + 0.12, speed: (i % 2 ? 1 : -1) * (11 + i * 2), id: fishIds[i % fishIds.length] }));
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      layout = getSceneLayout(bounds.width, bounds.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * dpr);
      canvas.height = Math.round(bounds.height * dpr);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const rect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
    };
    const sprite = (id: string, x: number, y: number, w: number, h: number, flip = false) => {
      const image = images[id];
      if (!image?.complete || !image.naturalWidth) return;
      // Cutouts retain their proportions, with a stable bottom-center foot anchor.
      const fit = Math.min(w / image.naturalWidth, h / image.naturalHeight);
      const dw = image.naturalWidth * fit, dh = image.naturalHeight * fit;
      ctx.save(); ctx.translate(Math.round(x + w / 2), Math.round(y + h));
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(image, -dw / 2, -dh, dw, dh); ctx.restore();
    };
    const render = (timestamp: number) => {
      const dt = previousTime ? Math.min((timestamp - previousTime) / 1000, 0.05) : 0;
      previousTime = timestamp; elapsed += dt;
      const { gameState, upgrades, lastCaught } = live.current;
      if (previousState !== gameState) {
        recovering = gameState === GameState.IDLE && [GameState.CASTING, GameState.WAITING, GameState.MINIGAME, GameState.CAUGHT].includes(previousState);
        returnMotion = lastMotion; returnBobber = previousBobber;
        stateTime = elapsed; previousState = gameState; catchNotified = false;
      }
      const age = elapsed - stateTime;
      const { width: w, height: h, scale: s, waterY, dockY, pierEnd, character, feet, target } = layout;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
      rect(0, 0, w, h, '#081b23');
      const harbor = images.harbor;
      if (harbor?.complete && harbor.naturalWidth) {
        const areaHeight = waterY + 50 * s, sourceHeight = harbor.naturalHeight * 0.86;
        const fit = Math.max(w / harbor.naturalWidth, areaHeight / sourceHeight);
        const dw = harbor.naturalWidth * fit, dh = sourceHeight * fit;
        ctx.drawImage(harbor, 0, 0, harbor.naturalWidth, sourceHeight, (w - dw) / 2, areaHeight - dh, dw, dh);
      }
      const water = ctx.createLinearGradient(0, waterY, 0, h);
      water.addColorStop(0, '#12484c'); water.addColorStop(0.35, '#0b353e'); water.addColorStop(1, '#071c28');
      ctx.fillStyle = water; ctx.fillRect(0, waterY, w, h - waterY);
      const underwater = images.underwater;
      if (underwater?.complete && underwater.naturalWidth) {
        const waterHeight = h - waterY;
        // Fit the full water column vertically, cropping only the sides on narrow displays.
        const dw = Math.max(w, waterHeight * underwater.naturalWidth / underwater.naturalHeight);
        ctx.drawImage(underwater, (w - dw) / 2, waterY, dw, waterHeight);
      }
      for (let i = 0; i < 45; i++) {
        const x = ((i * 173.7 + Math.sin(elapsed * 0.5 + i) * 10) % w + w) % w;
        const y = waterY + ((i * 31.3) % Math.max(1, h - waterY));
        ctx.globalAlpha = (1 - (y - waterY) / (h - waterY)) * 0.16;
        rect(x, y, (7 + i % 22) * s, 2 * s, i % 7 === 0 ? '#ffb879' : '#72e2d0');
      }
      ctx.globalAlpha = 1; rect(0, waterY, w, 2 * s, '#51b8b2');
      fish.forEach((f, i) => {
        f.phase = ((f.phase + f.speed * dt / (w + 120)) % 1 + 1) % 1;
        const x = f.phase * (w + 120) - 60;
        const y = layout.fishTop + f.depth * Math.max(0, layout.fishBottom - layout.fishTop) + Math.sin(elapsed * 1.2 + i) * 4 * s;
        ctx.globalAlpha = 0.65;
        sprite(f.id, x, y, (i % 3 === 0 ? 57 : 43) * s, 30 * s, f.speed < 0);
      });
      ctx.globalAlpha = 1;
      // Pier, feet and foreground props all share the same deck baseline.
      for (let x = 30 * s; x < pierEnd - 10 * s; x += 114 * s) {
        rect(x, dockY + 16 * s, 13 * s, 90 * s, '#0c202b');
        rect(x + 2 * s, dockY + 18 * s, 3 * s, 60 * s, '#28434b');
      }
      rect(0, dockY, pierEnd, 27 * s, '#111e2a'); rect(0, dockY, pierEnd, 4 * s, '#779394');
      rect(0, dockY + 5 * s, pierEnd, 8 * s, '#354a50'); rect(0, dockY + 20 * s, pierEnd, 2 * s, '#55c5b8');
      for (let x = 12 * s; x < pierEnd; x += 27 * s) rect(x, dockY + s, 2 * s, 11 * s, '#1b333c');
      for (let x = pierEnd - 27 * s; x < pierEnd - 6 * s; x += 7 * s) rect(x, dockY + 6 * s, 3 * s, 7 * s, '#f7be7b');
      rect(character.x - 40 * s, dockY - 29 * s, 27 * s, 29 * s, '#213b45');
      rect(character.x - 43 * s, dockY - 31 * s, 33 * s, 5 * s, '#8eaaa7');
      rect(character.x - 30 * s, dockY - 23 * s, 6 * s, 13 * s, '#db9470');
      const lampX = Math.max(18, character.x - 104 * s);
      rect(lampX, dockY - 83 * s, 4 * s, 83 * s, '#20373f');
      rect(lampX - 5 * s, dockY - 94 * s, 14 * s, 15 * s, '#263d44');
      rect(lampX - 3 * s, dockY - 91 * s, 10 * s, 8 * s, '#ffcf8d');
      const castP = clamp(age / CAST_ANIMATION_SECONDS, 0, 1);
      const motion = sampleAnglerMotion(gameState, age, elapsed);
      if (recovering && age < RECOVERY_SECONDS) {
        motion.frame = age < 0.1 ? returnMotion.frame : age < 0.22 ? 6 : 0;
        motion.angle = returnMotion.angle + (motion.angle - returnMotion.angle) * recoveryProgress(age);
      }
      lastMotion = motion;
      const actor = getAnglerGeometry(motion, feet, s);
      const actions = images.actions;
      const actionsReady = actions?.complete && actions.naturalWidth > 0;
      const hand = actionsReady ? actor.hand : layout.hand;
      const freeHand = actionsReady ? actor.freeHand : { x: hand.x - 12 * s, y: hand.y + 6 * s };
      const angle = motion.angle;
      const tip = getRodPose(angle, hand, s);
      if (canvas.dataset.actorPose !== actor.frame.name) canvas.dataset.actorPose = actor.frame.name;
      if (canvas.dataset.sceneState !== gameState) canvas.dataset.sceneState = gameState;
      const levelColor = ['#68d8c5', '#8bc6ea', '#efc981', '#f09aab', '#f0ece2'][clamp(Math.round(upgrades?.netStrength || 1), 1, 5) - 1];
      ctx.strokeStyle = '#101b26'; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(hand.x - Math.cos(angle) * 10 * s, hand.y - Math.sin(angle) * 10 * s); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.strokeStyle = levelColor; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      const reel = { x: hand.x - Math.cos(angle) * 9 * s - Math.sin(angle) * 5 * s, y: hand.y - Math.sin(angle) * 9 * s + Math.cos(angle) * 5 * s };
      rect(reel.x - 3 * s, reel.y - 3 * s, 7 * s, 7 * s, '#233f49');
      rect(reel.x - s, reel.y - s, 3 * s, 3 * s, levelColor);
      if (gameState === GameState.MINIGAME) {
        ctx.strokeStyle = '#779394'; ctx.lineWidth = 1.5 * s;
        ctx.beginPath(); ctx.moveTo(reel.x, reel.y); ctx.lineTo(freeHand.x, freeHand.y); ctx.stroke();
      }
      // Render the grip over the pole. All body parts, hands and boots belong to the same frame.
      if (actionsReady) {
        ctx.drawImage(actions, actor.frame.x, actor.frame.y, ANGLER_ATLAS.frameWidth, ANGLER_ATLAS.frameHeight, actor.x, actor.y, actor.width, actor.height);
      } else sprite('angler', character.x, character.y, character.width, character.height);
      let bobber = { x: tip.x + 5 * s, y: tip.y + 30 * s };
      if (gameState === GameState.CASTING) {
        const release = getAnglerGeometry(sampleAnglerMotion('CASTING', CAST_RELEASE_PROGRESS * CAST_ANIMATION_SECONDS, elapsed), feet, s);
        bobber = getCastBobber(castP, hand, target, s, actionsReady ? release.hand : layout.hand);
      } else if (gameState === GameState.CAUGHT) {
        // Use the final presentation palm throughout flight so changing frames cannot redirect the catch.
        const presentation = getAnglerGeometry(sampleAnglerMotion('CAUGHT', LANDING_ANIMATION_SECONDS, elapsed), feet, s);
        bobber = getLandingPosition(age, target, actionsReady ? presentation.freeHand : freeHand, s);
      } else if (gameState === GameState.WAITING || gameState === GameState.MINIGAME) {
        bobber = { x: target.x, y: target.y + Math.sin(elapsed * 2.7) * 2 * s };
      } else if (recovering && age < RECOVERY_SECONDS) {
        bobber = mixPoint(returnBobber, bobber, recoveryProgress(age));
      }
      previousBobber = bobber;
      ctx.strokeStyle = 'rgba(219,243,224,0.7)'; ctx.lineWidth = Math.max(0.8, s);
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
      ctx.quadraticCurveTo((tip.x + bobber.x) / 2, (tip.y + bobber.y) / 2 + 10 * s, bobber.x, bobber.y); ctx.stroke();
      if (gameState === GameState.WAITING || gameState === GameState.MINIGAME || (gameState === GameState.CASTING && castP > 0.95)) {
        ctx.strokeStyle = '#7dc4bb'; ctx.globalAlpha = 0.45;
        ctx.beginPath(); ctx.ellipse(bobber.x, bobber.y + 5 * s, (12 + Math.sin(elapsed * 3) * 3) * s, 3 * s, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (gameState !== GameState.CAUGHT) {
        rect(bobber.x - 3 * s, bobber.y - 5 * s, 6 * s, 5 * s, '#efe9d6');
        rect(bobber.x - 3 * s, bobber.y, 6 * s, 6 * s, '#ef8779');
        rect(bobber.x - s, bobber.y - 10 * s, 2 * s, 6 * s, '#ef8779');
      }
      if (gameState === GameState.MINIGAME) {
        const depth = 75 * s * (1 - (live.current.minigameProgressRef?.current || 0) / 100);
        sprite('fish_neon_guppy', bobber.x - 22 * s, bobber.y + 16 * s + depth, 44 * s, 28 * s);
      }
      if (gameState === GameState.CAUGHT) {
        const id = lastCaught?.type === LootType.CHAR ? 'char_byte' : lastCaught?.itemId || 'fish_neon_guppy';
        sprite(images[id] ? id : 'fish_neon_guppy', bobber.x - 19 * s, bobber.y - 12 * s, 38 * s, 24 * s);
        if (age >= LANDING_ANIMATION_SECONDS && !catchNotified) {
          catchNotified = true;
          live.current.onCatchLanded?.();
        }
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} aria-label="Neon harbor fishing scene" className="absolute inset-0 h-full w-full" />;
};

export default VoidCanvas;
