import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Upgrades } from '../types';
import { TEXT } from '../locales';

interface MinigameProps {
  upgrades: Upgrades;
  onSuccess: () => void;
  onFail: () => void;
  lang: 'en' | 'zh';
  onProgress?: (progress: number) => void;
}

const Minigame: React.FC<MinigameProps> = ({ upgrades, onSuccess, onFail, lang, onProgress }) => {
  // Game constants derived from upgrades
  const BAR_SIZE_PERCENT = 25 + (upgrades.barSize * 5); 
  
  // Physics adjustments - Tuned for "Tapping" control
  const GRAVITY = 0.12; 
  const THRUST = -0.22; 
  const DRAG = 0.96;    
  const BOUNCE_DAMPING = 0.4; 
  
  const BASE_FILL_RATE = 0.3; // Reduced from 0.4 to ensure smoother progression
  const BONUS_FILL_RATE = 0.1;
  const PROGRESS_SPEED = (BASE_FILL_RATE + ((upgrades.netStrength || 1) - 1) * BONUS_FILL_RATE) * 1.5;
  
  const DECAY_SPEED = 0.1; 

  const startBarPos = 50 - (BAR_SIZE_PERCENT / 2); 
  const barPos = useRef(startBarPos); 
  const barVel = useRef(0);
  const fishPos = useRef(50);
  const fishTarget = useRef(50);
  const fishTimer = useRef(100); 
  
  const progress = useRef(15); 
  
  const isMouseDown = useRef(false);
  const frameRef = useRef<number>(0);
  const isFinished = useRef(false);

  const [displayProgress, setDisplayProgress] = useState(15);
  const [fishStyle, setFishStyle] = useState({ bottom: '50%' });
  const [barStyle, setBarStyle] = useState({ height: `${BAR_SIZE_PERCENT}%`, bottom: `${startBarPos}%` });
  
  const t = TEXT[lang];

  const handleInteractStart = useCallback(() => {
    isMouseDown.current = true;
  }, []);

  const handleInteractEnd = useCallback(() => {
    isMouseDown.current = false;
  }, []);

  useEffect(() => {
    // Reset state on mount to prevent stale values from previous games
    progress.current = 15;
    isFinished.current = false;
    barPos.current = 50 - (BAR_SIZE_PERCENT / 2);
    barVel.current = 0;

    const updatePhysics = () => {
      if (isFinished.current) return;

      // 1. Move Fish
      fishTimer.current--;
      if (fishTimer.current <= 0) {
        fishTimer.current = Math.random() * 200 + 120; 
        fishTarget.current = Math.random() * 90 + 5; 
      }
      
      const dist = fishTarget.current - fishPos.current;
      const moveSpeed = 0.5 + (Math.random() * 0.5); 
      
      if (Math.abs(dist) < moveSpeed) fishPos.current = fishTarget.current;
      else fishPos.current += Math.sign(dist) * moveSpeed;

      // 2. Move Bar (Physics)
      if (isMouseDown.current) {
        barVel.current += THRUST;
      }
      barVel.current += GRAVITY;
      barVel.current *= DRAG;
      barPos.current -= barVel.current;

      // Boundary checks
      if (barPos.current < 0) {
        barPos.current = 0;
        barVel.current = -barVel.current * BOUNCE_DAMPING;
        if (Math.abs(barVel.current) < 0.1) barVel.current = 0;
      } else if (barPos.current > 100 - BAR_SIZE_PERCENT) {
        barPos.current = 100 - BAR_SIZE_PERCENT;
        barVel.current = -barVel.current * BOUNCE_DAMPING;
        if (Math.abs(barVel.current) < 0.1) barVel.current = 0;
      }

      // 3. Check Collision (Center to Center approximation)
      const barBottom = barPos.current;
      const barTop = barPos.current + BAR_SIZE_PERCENT;
      
      // Fish is approx 8% height (32px / 400px). Center is fishPos + 4.
      const fishCenter = fishPos.current + 4; 
      
      const isCatching = fishCenter >= barBottom && fishCenter <= barTop;
      
      if (isCatching) {
        progress.current = Math.min(100, progress.current + PROGRESS_SPEED);
      } else {
        progress.current = Math.max(0, progress.current - DECAY_SPEED);
      }

      // 4. Update Visuals
      setFishStyle({ bottom: `${fishPos.current}%` });
      setBarStyle({ height: `${BAR_SIZE_PERCENT}%`, bottom: `${barPos.current}%` });
      setDisplayProgress(progress.current);
      
      // Update parent ref for canvas visuals
      if (onProgress) {
        onProgress(progress.current);
      }

      // 5. Win/Loss
      if (progress.current >= 100) {
        isFinished.current = true;
        setDisplayProgress(100); // Force visual full
        // Small delay so user sees the full bar
        setTimeout(() => onSuccess(), 500);
        return; 
      } else if (progress.current <= 0) {
        isFinished.current = true;
        setDisplayProgress(0);
        setTimeout(() => onFail(), 200);
        return; 
      }

      frameRef.current = requestAnimationFrame(updatePhysics);
    };

    frameRef.current = requestAnimationFrame(updatePhysics);

    window.addEventListener('mousedown', handleInteractStart);
    window.addEventListener('mouseup', handleInteractEnd);
    window.addEventListener('touchstart', handleInteractStart);
    window.addEventListener('touchend', handleInteractEnd);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('mousedown', handleInteractStart);
      window.removeEventListener('mouseup', handleInteractEnd);
      window.removeEventListener('touchstart', handleInteractStart);
      window.removeEventListener('touchend', handleInteractEnd);
    };
  }, [BAR_SIZE_PERCENT, PROGRESS_SPEED, DECAY_SPEED, onFail, onSuccess, handleInteractStart, handleInteractEnd, onProgress, GRAVITY, THRUST, DRAG, BOUNCE_DAMPING]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm select-none">
      <div className="relative flex flex-row h-[400px] w-[120px] bg-cyber-dark border-2 border-cyber-green rounded p-2 gap-2 shadow-[0_0_20px_rgba(57,255,20,0.5)]">
        
        {/* Main Bar Area */}
        <div className="relative flex-1 bg-cyber-black border border-cyber-gray overflow-hidden h-full">
            {/* Target Fish */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-8 h-8 text-2xl transition-none flex items-center justify-center"
              style={fishStyle}
            >
              🐟
            </div>

            {/* Green Capture Bar */}
            <div 
              className="absolute left-0 w-full bg-cyber-green/40 border-t-2 border-b-2 border-cyber-green transition-none box-border"
              style={barStyle}
            >
              <div className="absolute inset-0 bg-cyber-green opacity-20 animate-pulse"></div>
            </div>
        </div>

        {/* Progress Meter - Removed transition for accurate feedback */}
        <div className="w-4 bg-cyber-gray relative rounded-full overflow-hidden h-full border border-gray-700">
           <div 
             className={`absolute bottom-0 w-full ${displayProgress > 80 ? 'bg-cyber-yellow' : 'bg-cyber-green'}`}
             style={{ height: `${displayProgress}%` }}
           />
        </div>
      </div>

      <div className="absolute bottom-20 text-cyber-green animate-bounce">
        {t.holdToRaise}
      </div>
    </div>
  );
};

export default Minigame;
