import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { TEXT } from '../locales';

interface ImageEditorProps {
  onClose: () => void;
  lang: 'en' | 'zh';
}

const ImageEditor: React.FC<ImageEditorProps> = ({ onClose, lang }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const t = TEXT[lang];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setGeneratedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt) return;

    setLoading(true);
    try {
      // 1. Initialize AI
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
      
      // 2. Prepare Image Part (remove data:image/png;base64, prefix)
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];

      // 3. Call Gemini 2.5 Flash Image
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: prompt
            }
          ]
        }
      });

      // 4. Extract Result
      let foundImage = false;
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const resultBase64 = part.inlineData.data;
            const resultMime = part.inlineData.mimeType || 'image/png';
            setGeneratedImage(`data:${resultMime};base64,${resultBase64}`);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        alert("No image generated. The model might have returned text only.");
        console.log(response);
      }

    } catch (error) {
      console.error("Error generating image:", error);
      alert("Error generating image. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="bg-cyber-dark border-2 border-cyber-pink w-full max-w-4xl p-6 shadow-[0_0_30px_rgba(255,0,255,0.3)] flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-cyber-pink pb-2">
          <h2 className="text-3xl font-bold text-cyber-pink glitch-text">{t.imageRecon}</h2>
          <button onClick={onClose} className="text-cyber-pink hover:text-white font-bold text-xl">[{t.close}]</button>
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          
          {/* Left Panel: Inputs */}
          <div className="w-1/3 flex flex-col gap-4">
            
            {/* Upload Area */}
            <div 
              className="border-2 border-dashed border-cyber-gray hover:border-cyber-green p-4 rounded cursor-pointer text-center transition-colors h-32 flex flex-col items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <span className="text-cyber-green text-lg font-bold">{t.uploadSource}</span>
              <span className="text-xs text-gray-500">{t.clickSelect}</span>
            </div>

            {/* Prompt Area */}
            <div className="flex-1 flex flex-col">
              <label className="text-cyber-cyan mb-2 font-bold">{t.instruction}</label>
              <textarea 
                className="flex-1 bg-black/50 border border-cyber-cyan p-2 text-white resize-none focus:outline-none focus:border-cyber-pink"
                placeholder={t.placeholder}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <button 
              onClick={handleGenerate}
              disabled={!selectedImage || !prompt || loading}
              className={`py-4 font-bold text-xl border-2 transition-all
                ${!selectedImage || !prompt || loading 
                  ? 'border-gray-700 text-gray-700 cursor-not-allowed' 
                  : 'border-cyber-pink bg-cyber-pink/20 text-cyber-pink hover:bg-cyber-pink hover:text-black shadow-[0_0_15px_#ff00ff]'}`}
            >
              {loading ? t.processing : t.execute}
            </button>
          </div>

          {/* Right Panel: Previews */}
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
            
            {/* Original */}
            <div className="flex-1 bg-black border border-cyber-gray relative flex items-center justify-center overflow-hidden group">
              <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 text-xs text-gray-400">{t.source}</div>
              {selectedImage ? (
                <img src={selectedImage} alt="Source" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-700">NO DATA</div>
              )}
            </div>

            {/* Result */}
            <div className="flex-1 bg-black border border-cyber-green relative flex items-center justify-center overflow-hidden">
               <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 text-xs text-cyber-green">{t.output}</div>
               {loading ? (
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 border-4 border-cyber-pink border-t-transparent rounded-full animate-spin"></div>
                   <div className="text-cyber-pink animate-pulse">{t.generating}</div>
                 </div>
               ) : generatedImage ? (
                 <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain" />
               ) : (
                 <div className="text-gray-700">{t.waitingOutput}</div>
               )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
