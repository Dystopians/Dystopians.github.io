import atlas from '../assets/harbor/angler-actions.json' with { type: 'json' };
import { clamp, getCastAngle } from './sceneLayout.ts';

export const CAST_ANIMATION_MS = 1100;
export const LANDING_ANIMATION_SECONDS = 1.35;
export const RECOVERY_SECONDS = 0.36;
export const ANGLER_ATLAS = atlas;

type Point = { x: number; y: number };
export type AnglerMotion = { frame: number; angle: number; stretch: number };

const smooth = (value: number) => { const p = clamp(value, 0, 1); return p * p * (3 - 2 * p); };
export const mixPoint = (a: Point, b: Point, progress: number): Point => ({
  x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress,
});

export function sampleAnglerMotion(state: string, age: number, elapsed: number): AnglerMotion {
  if (state === 'CASTING') {
    const p = clamp(age / (CAST_ANIMATION_MS / 1000), 0, 1);
    const frame = p < 0.11 ? 0 : p < 0.28 ? 2 : p < 0.43 ? 3 : p < 0.64 ? 4 : p < 0.84 ? 5 : 6;
    return { frame, angle: getCastAngle(p), stretch: 1 };
  }
  if (state === 'MINIGAME') {
    const striking = age < 0.26;
    return {
      frame: striking ? 7 : Math.floor((age - 0.26) / 0.24) % 2 ? 9 : 8,
      angle: striking ? -0.49 - 0.56 * Math.sin(age / 0.26 * Math.PI / 2) : -1.05 + Math.sin((age - 0.26) * Math.PI / 0.24) * 0.025,
      stretch: 1,
    };
  }
  if (state === 'CAUGHT') {
    return { frame: age < 0.12 ? 8 : age < 0.78 ? 10 : 11, angle: -1.05 - 0.12 * smooth(age / 0.8), stretch: 1 };
  }
  if (state === 'WAITING') return { frame: 6, angle: -0.49, stretch: 1 + Math.sin(age * 2) * 0.003 };
  return { frame: Math.sin(elapsed * 1.8) > 0.55 ? 1 : 0, angle: -0.72, stretch: 1 + Math.sin(elapsed * 1.8) * 0.003 };
}

export function getAnglerGeometry(motion: AnglerMotion, feet: Point, scale: number) {
  const frame = atlas.frames[motion.frame];
  const transform = (point: Point) => ({
    x: feet.x + (point.x - atlas.foot.x) * scale,
    y: feet.y + (point.y - atlas.foot.y) * scale * motion.stretch,
  });
  return {
    frame,
    x: feet.x - atlas.foot.x * scale,
    y: feet.y - atlas.foot.y * scale * motion.stretch,
    width: atlas.frameWidth * scale,
    height: atlas.frameHeight * scale * motion.stretch,
    hand: transform(frame.hand), freeHand: transform(frame.freeHand),
  };
}

export function getLandingPosition(age: number, start: Point, palm: Point, scale: number): Point {
  const p = smooth(age / 0.95);
  const point = mixPoint(start, { x: palm.x, y: palm.y - 7 * scale }, p);
  return { x: point.x, y: point.y - Math.sin(p * Math.PI) * 46 * scale };
}

export function recoveryProgress(age: number) { return smooth(age / RECOVERY_SECONDS); }
