import React, { useCallback, useEffect, useRef } from 'react';
import { Upgrades } from '../types';
import { TEXT } from '../locales';
import { UI_ART } from '../assets/generated/manifest';

interface MinigameProps {
  upgrades: Upgrades;
  onSuccess: (perfect: boolean) => void;
  onFail: () => void;
  lang: 'en' | 'zh';
  onProgress?: (progress: number) => void;
  difficulty: 'simple' | 'hard' | 'hardcore';
}

type DifficultyTune = {
  barScale: number;
  progressScale: number;
  decaySpeed: number;
  fishSpeed: number;
  fishAccel: number;
  targetMinMs: number;
  targetMaxMs: number;
  targetRangeScale: number;
};

const DIFFICULTY_TUNING: Record<MinigameProps['difficulty'], DifficultyTune> = {
  simple: {
    barScale: 1,
    progressScale: 1,
    decaySpeed: 4,
    fishSpeed: 46,
    fishAccel: 132,
    targetMinMs: 1080,
    targetMaxMs: 1820,
    targetRangeScale: 0.82,
  },
  hard: {
    barScale: 0.75,
    progressScale: 0.75,
    decaySpeed: 6,
    fishSpeed: 56,
    fishAccel: 154,
    targetMinMs: 860,
    targetMaxMs: 1480,
    targetRangeScale: 1,
  },
  hardcore: {
    barScale: 0.67,
    progressScale: 0.5,
    decaySpeed: 9,
    fishSpeed: 68,
    fishAccel: 182,
    targetMinMs: 700,
    targetMaxMs: 1220,
    targetRangeScale: 1.18,
  },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const pickFishTarget = (current: number, tune: DifficultyTune) => {
  const centerBias = (50 - current) * 0.18;
  const roam = randomBetween(-34, 34) * tune.targetRangeScale;
  const occasionalDash = Math.random() < 0.22 ? randomBetween(-58, 58) * tune.targetRangeScale : 0;
  return clamp(current + centerBias + roam + occasionalDash, 10, 84);
};

const Minigame: React.FC<MinigameProps> = ({ upgrades, onSuccess, onFail, lang, onProgress, difficulty }) => {
  const fishRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const finishTimerRef = useRef<number | null>(null);
  const isPressingRef = useRef(false);
  const inputImpulseRef = useRef(0);
  const finishedRef = useRef(false);
  const perfectRef = useRef(true);

  const t = TEXT[lang];
  const tune = DIFFICULTY_TUNING[difficulty];

  const barSizePercent = clamp((25 + upgrades.barSize * 5) * tune.barScale, 17, 54);
  const stabilityLevel = upgrades.stability || 1;
  const netStrengthLevel = upgrades.netStrength || 1;
  const progressPerSecond = (22 + (netStrengthLevel - 1) * 8) * tune.progressScale;
  const liftPerSecond = 640 + (stabilityLevel - 1) * 14;
  const gravityPerSecond = (760 - (stabilityLevel - 1) * 10) * (difficulty === 'hardcore' ? 1.04 : 1);
  const maxBarVelocity = 520 + (stabilityLevel - 1) * 18;
  const tapImpulse = 18 + (stabilityLevel - 1) * 1.8;
  const dragPerFrame = 0.92 + (stabilityLevel - 1) * 0.006;
  const restitution = Math.max(0.1, 0.32 - (stabilityLevel - 1) * 0.04);

  const handleInteractStart = useCallback((event?: Event) => {
    event?.preventDefault();
    isPressingRef.current = true;
    inputImpulseRef.current += tapImpulse;
  }, [tapImpulse]);

  const handleInteractEnd = useCallback(() => {
    isPressingRef.current = false;
  }, []);

  useEffect(() => {
    let lastTimestamp = performance.now();
    let fishPosition = 44;
    let fishVelocity = 0;
    let fishTarget = pickFishTarget(fishPosition, tune);
    let nextTargetAt = lastTimestamp + randomBetween(tune.targetMinMs, tune.targetMaxMs);
    let barPosition = clamp(14, 0, 100 - barSizePercent);
    let barVelocity = 0;
    let progress = 18;
    let missTimeMs = 0;

    finishedRef.current = false;
    perfectRef.current = true;
    onProgress?.(progress);

    const finish = (result: 'success' | 'fail') => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      isPressingRef.current = false;
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
      }
      finishTimerRef.current = window.setTimeout(() => {
        if (result === 'success') {
          onSuccess(perfectRef.current);
        } else {
          onFail();
        }
      }, result === 'success' ? 420 : 180);
    };

    const paint = (timestamp: number) => {
      const fishNode = fishRef.current;
      const barNode = barRef.current;
      const progressNode = progressRef.current;
      if (!fishNode || !barNode || !progressNode || finishedRef.current) return;

      const rawDt = (timestamp - lastTimestamp) / 1000;
      const dt = clamp(rawDt || 0.016, 0.001, 0.034);
      lastTimestamp = timestamp;

      if (timestamp >= nextTargetAt) {
        fishTarget = pickFishTarget(fishPosition, tune);
        nextTargetAt = timestamp + randomBetween(tune.targetMinMs, tune.targetMaxMs);
      }

      const desiredFishVelocity = clamp((fishTarget - fishPosition) * 2.2, -tune.fishSpeed, tune.fishSpeed);
      const velocityDelta = clamp(
        desiredFishVelocity - fishVelocity,
        -tune.fishAccel * dt,
        tune.fishAccel * dt
      );
      fishVelocity = (fishVelocity + velocityDelta) * Math.pow(0.985, dt * 60);
      fishPosition = clamp(fishPosition + fishVelocity * dt, 5, 89);

      if (fishPosition <= 5 || fishPosition >= 89) {
        fishVelocity *= -0.35;
        fishTarget = fishPosition <= 5
          ? randomBetween(34, 62)
          : randomBetween(28, 58);
        nextTargetAt = timestamp + randomBetween(tune.targetMinMs, tune.targetMaxMs);
      }

      if (inputImpulseRef.current !== 0) {
        barVelocity = clamp(barVelocity + inputImpulseRef.current, -maxBarVelocity, maxBarVelocity);
        inputImpulseRef.current = 0;
      }

      barVelocity += (isPressingRef.current ? liftPerSecond : -gravityPerSecond) * dt;
      if (!isPressingRef.current && barVelocity > 0) {
        barVelocity *= Math.pow(0.48, dt * 60);
      }
      barVelocity *= Math.pow(dragPerFrame, dt * 60);
      barVelocity = clamp(barVelocity, -maxBarVelocity, maxBarVelocity);
      barPosition = clamp(barPosition + barVelocity * dt, 0, 100 - barSizePercent);

      if (barPosition <= 0 && barVelocity < 0) {
        barVelocity = Math.abs(barVelocity) * restitution;
      } else if (barPosition >= 100 - barSizePercent && barVelocity > 0) {
        barVelocity = -Math.abs(barVelocity) * restitution;
      }

      const barBottom = barPosition;
      const barTop = barPosition + barSizePercent;
      const fishCenter = fishPosition + 3.6;
      const isCatching = fishCenter >= barBottom && fishCenter <= barTop;

      if (isCatching) {
        missTimeMs = 0;
        progress = Math.min(100, progress + progressPerSecond * dt);
      } else {
        missTimeMs += dt * 1000;
        if (missTimeMs > 110) perfectRef.current = false;
        progress = Math.max(0, progress - tune.decaySpeed * dt);
      }

      const swimBob = Math.sin(timestamp / 155) * 0.55;
      fishNode.style.bottom = `${clamp(fishPosition + swimBob, 5, 89)}%`;
      fishNode.style.transform = `translateX(-50%) scaleX(${fishVelocity < -2 ? -1 : 1})`;
      barNode.style.height = `${barSizePercent}%`;
      barNode.style.bottom = `${barPosition}%`;
      progressNode.style.height = `${progress}%`;
      progressNode.classList.toggle('bg-cyber-yellow', progress > 80);
      progressNode.classList.toggle('bg-cyber-green', progress <= 80);

      onProgress?.(progress);

      if (progress >= 100) {
        progressNode.style.height = '100%';
        finish('success');
        return;
      }
      if (progress <= 0) {
        progressNode.style.height = '0%';
        finish('fail');
        return;
      }

      frameRef.current = requestAnimationFrame(paint);
    };

    frameRef.current = requestAnimationFrame(paint);

    window.addEventListener('pointerdown', handleInteractStart, { passive: false });
    window.addEventListener('pointerup', handleInteractEnd);
    window.addEventListener('pointercancel', handleInteractEnd);
    window.addEventListener('blur', handleInteractEnd);

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      window.removeEventListener('pointerdown', handleInteractStart);
      window.removeEventListener('pointerup', handleInteractEnd);
      window.removeEventListener('pointercancel', handleInteractEnd);
      window.removeEventListener('blur', handleInteractEnd);
    };
  }, [
    barSizePercent,
    dragPerFrame,
    gravityPerSecond,
    handleInteractEnd,
    handleInteractStart,
    liftPerSecond,
    maxBarVelocity,
    onFail,
    onProgress,
    onSuccess,
    progressPerSecond,
    restitution,
    tapImpulse,
    tune,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/68 backdrop-blur-[3px] select-none touch-none p-4">
      <div className="ui-panel relative flex h-[340px] w-[122px] flex-row gap-3 overflow-visible p-3 sm:h-[420px] sm:w-[150px]">
        <div className="pointer-events-none absolute -inset-2 rounded-md border border-cyber-pink/50 shadow-[0_0_26px_rgba(255,0,255,0.22)]" />
        <div className="pointer-events-none absolute -inset-4 rounded-md border border-cyber-cyan/20" />
        <div className="ui-badge pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 text-[0.65rem] uppercase">
          Signal Lock
        </div>
        <div className="relative flex-1 overflow-hidden h-full rounded-md border-2 border-cyber-cyan bg-gradient-to-b from-[#061a2c] via-[#062036] to-[#02050b] shadow-[inset_0_0_26px_rgba(0,243,255,0.34)]">
          <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(0,243,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.12)_1px,transparent_1px)] [background-size:100%_28px,28px_100%]" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-cyber-pink/50 shadow-[0_0_10px_rgba(255,0,255,0.65)]" />
          <div
            ref={fishRef}
            className="absolute left-1/2 bottom-[44%] w-9 h-7 sm:w-11 sm:h-8 will-change-[bottom,transform] flex items-center justify-center"
          >
            <img
              src={UI_ART.minigameTarget}
              alt=""
              draggable={false}
              className="h-full w-full object-contain [image-rendering:pixelated] drop-shadow-[0_5px_3px_rgba(16,37,43,0.45)]"
            />
          </div>

          <div
            ref={barRef}
            className="absolute left-0 bottom-[14%] w-full bg-cyber-green/28 border-t-2 border-b-2 border-cyber-green box-border will-change-[bottom,height] shadow-[0_0_14px_rgba(57,255,20,0.4)]"
            style={{ height: `${barSizePercent}%` }}
          >
            <div className="absolute inset-0 bg-cyber-green opacity-20" />
          </div>
        </div>

        <div className="w-5 bg-[#05070d] relative rounded-full overflow-hidden h-full border-2 border-cyber-yellow shadow-[0_0_12px_rgba(253,253,0,0.24)]">
          <div
            ref={progressRef}
            className="absolute bottom-0 w-full bg-cyber-green will-change-[height]"
            style={{ height: '18%' }}
          />
        </div>
      </div>

      <div className="ui-badge absolute bottom-10 sm:bottom-20 px-4 py-2 text-sm sm:text-base">
        {t.holdToRaise}
      </div>
    </div>
  );
};

export default Minigame;
