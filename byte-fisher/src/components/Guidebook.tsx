import React from 'react';
import { TEXT } from '../locales';

interface GuidebookProps {
  onClose: () => void;
  lang: 'en' | 'zh';
}

const Guidebook: React.FC<GuidebookProps> = ({ onClose, lang }) => {
  const t = TEXT[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6">
      <div className="bg-cyber-dark border-2 border-cyber-green w-full max-w-3xl p-4 sm:p-6 shadow-[0_0_30px_rgba(57,255,20,0.3)] flex flex-col max-h-[85vh] crt">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 border-b border-cyber-green pb-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-cyber-green glitch-text">{t.guideTitle}</h2>
            <div className="text-xs text-gray-500 mt-1">{t.guideSubtitle}</div>
          </div>
          <button onClick={onClose} className="self-start sm:self-auto text-cyber-green hover:text-white font-bold text-lg sm:text-xl">
            [{t.close}]
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="mb-5">
            <h3 className="text-lg sm:text-xl text-cyber-cyan mb-2">{t.guideSectionPlay}</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base text-gray-300">
              {t.guideSteps.map((step: string, idx: number) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="mb-2">
            <h3 className="text-lg sm:text-xl text-cyber-cyan mb-2">{t.guideSectionTips}</h3>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-300">
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
