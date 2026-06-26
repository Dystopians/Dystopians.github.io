import React, { useState, useRef, useEffect } from 'react';
import PixelEditor from './PixelEditor';
import { createDefaultSkeleton } from '../utils/characterParts';
import { CharacterRenderer } from '../utils/characterRenderer';

interface CharacterEditorProps {
  onClose: () => void;
  lang: 'en' | 'zh';
  embedded?: boolean; // If true, render without modal overlay
}

interface PartDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'base' | 'headgear' | 'boots' | 'backpack' | 'rod';
}

const EDITABLE_PARTS: PartDefinition[] = [
  // 基础部件
  { id: 'head', name: 'Head', width: 24, height: 24, category: 'base' },
  { id: 'torso', name: 'Torso', width: 32, height: 40, category: 'base' },
  { id: 'torso_detail', name: 'Shirt', width: 16, height: 32, category: 'base' },
  { id: 'leg_upper', name: 'Upper Leg', width: 12, height: 24, category: 'base' },
  { id: 'leg_lower', name: 'Lower Leg', width: 12, height: 24, category: 'base' },

  // 头部装备
  { id: 'headgear_lv1', name: 'Cap (Lv1)', width: 32, height: 8, category: 'headgear' },
  { id: 'headgear_lv2', name: 'VR Goggles (Lv2)', width: 28, height: 8, category: 'headgear' },
  { id: 'headgear_lv3', name: 'Golden Visor (Lv3)', width: 28, height: 8, category: 'headgear' },
  { id: 'headgear_lv4', name: 'Cyber Glasses (Lv4)', width: 28, height: 8, category: 'headgear' },
  { id: 'headgear_lv5', name: 'Holo Halo (Lv5)', width: 48, height: 32, category: 'headgear' },

  // 靴子
  { id: 'boots_lv1', name: 'Basic Shoes (Lv1)', width: 32, height: 8, category: 'boots' },
  { id: 'boots_lv2', name: 'Heavy Boots (Lv2)', width: 32, height: 16, category: 'boots' },
  { id: 'boots_lv3', name: 'Piston Boots (Lv3)', width: 48, height: 24, category: 'boots' },
  { id: 'boots_lv4', name: 'Jet Boots (Lv4)', width: 48, height: 24, category: 'boots' },
  { id: 'boots_lv5', name: 'Anti-Grav (Lv5)', width: 72, height: 24, category: 'boots' },

  // 背包
  { id: 'backpack_lv2', name: 'Backpack (Lv2)', width: 8, height: 24, category: 'backpack' },
  { id: 'backpack_lv3', name: 'Antenna (Lv3)', width: 16, height: 64, category: 'backpack' },
  { id: 'backpack_lv4', name: 'Satellite (Lv4)', width: 24, height: 32, category: 'backpack' },
  { id: 'backpack_lv5', name: 'Drone (Lv5)', width: 16, height: 8, category: 'backpack' },
];

const CharacterEditor: React.FC<CharacterEditorProps> = ({ onClose, lang, embedded = false }) => {
  const [selectedPart, setSelectedPart] = useState<PartDefinition | null>(null);
  const [isEditingPixels, setIsEditingPixels] = useState(false);
  const [partImages, setPartImages] = useState<Map<string, ImageData>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'base' | 'headgear' | 'boots' | 'backpack' | 'rod'>('all');

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    updatePreview();
  }, [partImages]);

  const updatePreview = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制棋盘背景
    const gridSize = 16;
    for (let y = 0; y < canvas.height; y += gridSize) {
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.fillStyle = (x / gridSize + y / gridSize) % 2 === 0 ? '#1a1a1a' : '#2a2a2a';
        ctx.fillRect(x, y, gridSize, gridSize);
      }
    }

    // 创建骨架
    const skeleton = createDefaultSkeleton(canvas.width / 2, 150, 1);
    const renderer = new CharacterRenderer(ctx, skeleton);
    renderer.render({
      bootsLevel: 1,
      headLevel: 1,
      backpackLevel: 1,
      rodLevel: 1,
      time: performance.now() / 1000,
      armAngle: -0.55,
      floatOffset: 0,
      colorTheme: 'default',
      glowIntensities: { boots: 0.1, head: 0.1, backpack: 0, rod: 0.1 },
    });

    // 应用自定义图像（简化版本，只显示当前编辑的部件）
    // 这里可以扩展为完整的角色渲染
    partImages.forEach((imageData, partId) => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(imageData, 0, 0);

        // 简单显示在预览区域
        const part = EDITABLE_PARTS.find(p => p.id === partId);
        if (part) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;

          // 根据部件类型调整位置
          let offsetX = canvas.width / 2 - imageData.width / 2;
          let offsetY = 100;

          if (part.category === 'headgear') offsetY = 50;
          if (part.category === 'boots') offsetY = 250;
          if (part.category === 'backpack') offsetX = 50;

          ctx.drawImage(tempCanvas, offsetX, offsetY);
          ctx.restore();
        }
      }
    });
  };

  const handleEditPart = (part: PartDefinition) => {
    setSelectedPart(part);
    setIsEditingPixels(true);
  };

  const handleSavePixelArt = (imageData: ImageData) => {
    if (!selectedPart) return;

    const newPartImages = new Map(partImages);
    newPartImages.set(selectedPart.id, imageData);
    setPartImages(newPartImages);

    setIsEditingPixels(false);
    setSelectedPart(null);
  };

  const handleExportAll = () => {
    if (partImages.size === 0) {
      alert('No parts to export!');
      return;
    }

    // 创建ZIP文件（简化版本，这里只是示例）
    partImages.forEach((imageData, partId) => {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        const link = document.createElement('a');
        link.download = `${partId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    });
  };

  const handleImportTemplate = () => {
    // 加载预设模板
    alert('Template import feature - Coming soon!');
  };

  const filteredParts = selectedCategory === 'all'
    ? EDITABLE_PARTS
    : EDITABLE_PARTS.filter(p => p.category === selectedCategory);

  const editorContent = (
    <div className={embedded ? "w-full h-full min-h-0 flex flex-col overflow-hidden" : "bg-cyber-dark border-2 border-cyber-cyan w-full max-w-7xl h-[min(90dvh,900px)] max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-[0_0_30px_rgba(0,243,255,0.3)]"}>

          {/* Header */}
          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center p-3 sm:p-4 border-b border-cyber-cyan shrink-0">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-cyber-cyan break-words">CHARACTER EDITOR</h2>
              <p className="text-xs text-gray-500 leading-snug">Create custom pixel art for your character</p>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 w-full lg:w-auto">
              <button
                onClick={handleImportTemplate}
                className="min-h-10 px-3 sm:px-4 py-2 border border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black text-xs sm:text-sm leading-tight"
              >
                IMPORT TEMPLATE
              </button>
              <button
                onClick={handleExportAll}
                className="min-h-10 px-3 sm:px-4 py-2 border border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow hover:text-black text-xs sm:text-sm leading-tight"
              >
                EXPORT ALL ({partImages.size})
              </button>
              <button onClick={onClose} className="col-span-2 sm:col-span-1 min-h-10 px-3 sm:px-4 py-2 border border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-black font-bold text-xs sm:text-sm leading-tight">
                [X] CLOSE
              </button>
            </div>
          </div>

          <div className="byte-character-editor__body flex-1 min-h-0 gap-3 sm:gap-4 p-3 sm:p-4">

            {/* Left - Parts List */}
            <div className="byte-character-editor__sidebar w-full min-h-0 gap-3 sm:gap-4">

              {/* Category Filter */}
              <div className="border border-cyber-gray p-3">
                <h3 className="text-cyber-cyan mb-2 text-sm">CATEGORY</h3>
                <div className="flex flex-wrap gap-1">
                  {(['all', 'base', 'headgear', 'boots', 'backpack'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 text-xs border ${
                        selectedCategory === cat
                          ? 'bg-cyber-cyan text-black border-cyber-cyan'
                          : 'border-gray-600 text-gray-400 hover:text-cyber-cyan'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parts List */}
              <div className="byte-character-editor__parts border border-cyber-gray p-3">
                <h3 className="text-cyber-cyan mb-2 text-sm">PARTS ({filteredParts.length})</h3>
                <div className="space-y-1">
                  {filteredParts.map(part => {
                    const hasCustom = partImages.has(part.id);
                    return (
                      <div
                        key={part.id}
                        className="flex justify-between items-center gap-3 p-2 bg-gray-900 border border-gray-700 hover:border-cyber-green group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white flex items-center gap-2 min-w-0">
                            <span className="truncate">{part.name}</span>
                            {hasCustom && <span className="text-xs text-cyber-green">OK</span>}
                          </div>
                          <div className="text-xs text-gray-500">{part.width}×{part.height}px</div>
                        </div>
                        <button
                          onClick={() => handleEditPart(part)}
                          className="shrink-0 px-3 py-1 text-xs border border-cyber-green text-cyber-green group-hover:bg-cyber-green group-hover:text-black transition-colors"
                        >
                          {hasCustom ? 'EDIT' : 'CREATE'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Guide */}
              <div className="hidden sm:block border border-cyber-gray p-3">
                <h3 className="text-cyber-cyan mb-2 text-sm">QUICK GUIDE</h3>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>1. Select a part to edit</div>
                  <div>2. Use pixel editor to draw</div>
                  <div>3. Preview in real-time</div>
                  <div>4. Export all parts as PNG</div>
                  <div>5. Use in your game!</div>
                </div>
              </div>

            </div>

            {/* Right - Preview */}
            <div className="byte-character-editor__preview flex-1 min-w-0 min-h-[420px] lg:min-h-0 flex flex-col gap-3 sm:gap-4">

              {/* Preview Canvas */}
              <div className="flex-1 border border-cyber-cyan p-3 sm:p-4 flex flex-col min-h-[320px]">
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center mb-2">
                  <h3 className="text-cyber-cyan text-sm">LIVE PREVIEW</h3>
                  <div className="text-xs text-gray-500">
                    Parts created: {partImages.size} / {EDITABLE_PARTS.length}
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-900 relative overflow-hidden p-2">
                  <canvas
                    ref={previewCanvasRef}
                    width={400}
                    height={400}
                    className="border border-gray-700 w-full max-w-[400px] aspect-square"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {partImages.size === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="text-center text-gray-600 text-sm sm:text-base">
                        <div>Create your first part to see preview</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="border border-cyber-gray p-4">
                <h3 className="text-cyber-yellow mb-2 text-sm">TIPS</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs text-gray-400">
                  <div>
                    <strong className="text-cyber-green">Import Images:</strong>
                    <div>Drop PNG files in pixel editor to convert to pixel art automatically</div>
                  </div>
                  <div>
                    <strong className="text-cyber-green">Color Palette:</strong>
                    <div>Use the predefined cyber palette for best results</div>
                  </div>
                  <div>
                    <strong className="text-cyber-green">Grid Lines:</strong>
                    <div>Enable grid to align pixels perfectly</div>
                  </div>
                  <div>
                    <strong className="text-cyber-green">Undo/Redo:</strong>
                    <div>Full history support - experiment freely!</div>
                  </div>
                </div>
              </div>

            </div>

          </div>
    </div>
  );

  return (
    <>
      {embedded ? (
        editorContent
      ) : (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          {editorContent}
        </div>
      )}

      {/* Pixel Editor Modal */}
      {isEditingPixels && selectedPart && (
        <PixelEditor
          partName={selectedPart.name}
          width={selectedPart.width}
          height={selectedPart.height}
          onClose={() => {
            setIsEditingPixels(false);
            setSelectedPart(null);
          }}
          onSave={handleSavePixelArt}
          lang={lang}
        />
      )}
    </>
  );
};

export default CharacterEditor;
