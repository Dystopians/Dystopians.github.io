import React from 'react';
import { TEXT } from '../locales';
import { CHARACTER_ART, ENVIRONMENT_ART } from '../assets/generated/manifest';

interface GuidebookProps {
  onClose: () => void;
  lang: 'en' | 'zh';
}

const Guidebook: React.FC<GuidebookProps> = ({ onClose, lang }) => {
  const t = TEXT[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/82 backdrop-blur-md p-3 sm:p-6">
      <div className="ui-panel w-full max-w-3xl p-4 sm:p-6 flex flex-col max-h-[85vh] crt">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 border-b border-cyber-cyan/60 pb-3">
          <div>
            <h2 className="ui-section-title text-2xl sm:text-3xl glitch-text">{t.guideTitle}</h2>
            <div className="text-xs text-cyber-cyan/65 mt-1">{t.guideSubtitle}</div>
          </div>
          <button onClick={onClose} className="ui-button self-start sm:self-auto px-3 py-1 text-sm">
            {t.close}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="mb-5 grid grid-cols-[5rem_1fr] gap-3 overflow-hidden rounded-md border-2 border-cyber-cyan/60 bg-cyber-dark/70 p-2 shadow-[0_0_18px_rgba(0,243,255,0.16)]">
            <img
              src={CHARACTER_ART.fisher}
              alt=""
              draggable={false}
              className="h-24 w-20 object-contain [image-rendering:pixelated] drop-shadow-[0_0_12px_rgba(0,243,255,0.5)]"
            />
            <img
              src={ENVIRONMENT_ART.backdrop}
              alt=""
              draggable={false}
              className="h-24 w-full object-cover opacity-80 [image-rendering:pixelated]"
            />
          </div>

          <div className="mb-5">
            <h3 className="text-lg sm:text-xl text-cyber-yellow font-bold mb-2">{t.guideSectionPlay}</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base text-cyber-cyan/85">
              {t.guideSteps.map((step: string, idx: number) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="mb-2">
            <h3 className="text-lg sm:text-xl text-cyber-yellow font-bold mb-2">{t.guideSectionTips}</h3>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-cyber-cyan/85">
              {t.guideTips.map((tip: string, idx: number) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guidebook;
