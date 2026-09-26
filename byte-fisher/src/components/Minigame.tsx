import React, { useCallback, useEffect, useRef } from 'react';
import { Upgrades } from '../types';
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
const PERFECT_CATCH_IN_BAR_RATIO = 0.9;

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
  const callbacks = useRef({ onSuccess, onFail, onProgress });
  callbacks.current = { onSuccess, onFail, onProgress };

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
    if (isPressingRef.current) return;
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
    let trackedTime = 0;
    let inBarTime = 0;

    finishedRef.current = false;
    perfectRef.current = true;
    callbacks.current.onProgress?.(progress);

    const finish = (result: 'success' | 'fail') => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      isPressingRef.current = false;
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
      }
      finishTimerRef.current = window.setTimeout(() => {
        if (result === 'success') {
          callbacks.current.onSuccess(perfectRef.current);
        } else {
          callbacks.current.onFail();
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
      const fishMargin = Math.max(5, fishNode.offsetHeight / Math.max(1, fishNode.parentElement!.clientHeight) * 50 + 1);
      const fishMin = fishMargin;
      const fishMax = 100 - fishMargin;

      if (timestamp >= nextTargetAt) {
        fishTarget = pickFishTarget(fishPosition, tune);
        nextTargetAt = timestamp + randomBetween(tune.targetMinMs, tune.targetMaxMs);
      }

      fishTarget = clamp(fishTarget, fishMin + 2, fishMax - 2);
      const desiredFishVelocity = clamp((fishTarget - fishPosition) * 2.2, -tune.fishSpeed, tune.fishSpeed);
      const velocityDelta = clamp(
        desiredFishVelocity - fishVelocity,
        -tune.fishAccel * dt,
        tune.fishAccel * dt
      );
      fishVelocity = (fishVelocity + velocityDelta) * Math.pow(0.985, dt * 60);
      fishPosition = clamp(fishPosition + fishVelocity * dt, fishMin, fishMax);

      if (fishPosition <= fishMin || fishPosition >= fishMax) {
        fishVelocity *= -0.35;
        fishTarget = fishPosition <= fishMin
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
      const fishCenter = fishPosition;
      const isCatching = fishCenter >= barBottom && fishCenter <= barTop;
      trackedTime += dt;
      if (isCatching) inBarTime += dt;
      perfectRef.current = trackedTime > 0 && inBarTime / trackedTime >= PERFECT_CATCH_IN_BAR_RATIO;

      if (isCatching) {
        progress = Math.min(100, progress + progressPerSecond * dt);
      } else {
        progress = Math.max(0, progress - tune.decaySpeed * dt);
      }

      fishNode.style.bottom = `${fishPosition}%`;
      fishNode.style.transform = `translate(-50%, 50%)`;
      barNode.style.height = `${barSizePercent}%`;
      barNode.style.bottom = `${barPosition}%`;
      barNode.dataset.catching = String(isCatching);
      progressNode.style.height = `${progress}%`;
      progressNode.style.background = progress > 80 ? '#eac78e' : '#a6ddb0';

      callbacks.current.onProgress?.(progress);

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

    const keyDown = (event: KeyboardEvent) => {
      if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) handleInteractStart(event);
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); handleInteractEnd(); }
    };
    const hidden = () => { if (document.hidden) handleInteractEnd(); };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pointerup', handleInteractEnd);
    window.addEventListener('pointercancel', handleInteractEnd);
    window.addEventListener('blur', handleInteractEnd);

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      document.removeEventListener('visibilitychange', hidden);
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
    progressPerSecond,
    restitution,
    tapImpulse,
    tune,
  ]);

  return (
    <div className="minigame-overlay" data-testid="minigame" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); handleInteractStart(event.nativeEvent); }} onPointerUp={handleInteractEnd} onPointerCancel={handleInteractEnd}>
      <section className="minigame-console" aria-label={lang === 'zh' ? '收线' : 'Reel in'}>
        <h2 className="minigame-title">{lang === 'zh' ? '信号已锁定' : 'SIGNAL LOCKED'}</h2>
        <div className="minigame-gauges">
          <div className="fish-track" data-testid="fish-track">
            <div ref={barRef} className="catch-zone" data-testid="catch-zone" style={{ height: `${barSizePercent}%`, bottom: '14%' }} />
            <div ref={fishRef} className="minigame-fish" data-testid="minigame-fish" style={{ bottom: '44%', transform: 'translate(-50%, 50%)' }}>
              <img src={UI_ART.minigameTarget} alt="" draggable={false} />
            </div>
          </div>
          <div className="progress-track"><div ref={progressRef} data-testid="catch-progress" className="progress-fill" style={{ height: '18%' }} /></div>
        </div>
        <button type="button" className="minigame-hold">{lang === 'zh' ? '收线' : 'REEL'}</button>
      </section>
    </div>
  );
};

export default Minigame;
