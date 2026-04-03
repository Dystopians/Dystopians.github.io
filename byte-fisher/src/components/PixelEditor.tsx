import React, { useRef, useEffect, useState } from 'react';
import { TEXT } from '../locales';

interface PixelEditorProps {
  partName: string;
  width: number;  // 游戏像素
  height: number; // 游戏像素
  onClose: () => void;
  onSave: (imageData: ImageData) => void;
  lang: 'en' | 'zh';
}

const PIXEL_SIZE = 4; // 1游戏像素 = 4实际像素

// 预设调色板
const PALETTE = [
  '#050505', '#1a1a1a', '#333333', '#555555', '#777777', '#aaa', '#ccc', '#fff',
  '#f0d0b0', '#8b7355', '#8b5a2b', '#8B4513',
  '#39ff14', '#ff00ff', '#00f3ff', '#fdfd00', '#ffd700',
  '#0a2a0a', '#cc0000', '#ff4444', '#ff6600', '#ffaa00'
];

const PixelEditor: React.FC<PixelEditorProps> = ({ partName, width, height, onClose, onSave, lang }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [currentColor, setCurrentColor] = useState(PALETTE[0]);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'fill'>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(8); // 放大倍数
  const [grid, setGrid] = useState(true);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const t = TEXT[lang];
  const canvasWidth = width * PIXEL_SIZE;
  const canvasHeight = height * PIXEL_SIZE;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 初始化画布为透明
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 保存初始状态
    saveToHistory(ctx);
  }, []);

  const saveToHistory = (ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.putImageData(history[historyIndex - 1], 0, 0);
        setHistoryIndex(historyIndex - 1);
        updatePreview();
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.putImageData(history[historyIndex + 1], 0, 0);
        setHistoryIndex(historyIndex + 1);
        updatePreview();
      }
    }
  };

  const getPixelPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;

    const x = Math.floor(((e.clientX - rect.left) * scaleX) / PIXEL_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / PIXEL_SIZE);

    if (x < 0 || x >= width || y < 0 || y >= height) return null;

    return { x, y };
  };

  const drawPixel = (x: number, y: number, color: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (color === 'transparent') {
      ctx.clearRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    }
  };

  const floodFill = (startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;

    const getPixelIndex = (x: number, y: number) => {
      return (y * PIXEL_SIZE * canvasWidth + x * PIXEL_SIZE) * 4;
    };

    const startIdx = getPixelIndex(startX, startY);
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    // 将fillColor转换为RGBA
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.fillStyle = fillColor;
    tempCtx.fillRect(0, 0, 1, 1);
    const fillData = tempCtx.getImageData(0, 0, 1, 1).data;

    if (
      startR === fillData[0] &&
      startG === fillData[1] &&
      startB === fillData[2] &&
      startA === fillData[3]
    ) {
      return; // 颜色相同，无需填充
    }

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const idx = getPixelIndex(x, y);
      if (
        data[idx] !== startR ||
        data[idx + 1] !== startG ||
        data[idx + 2] !== startB ||
        data[idx + 3] !== startA
      ) {
        continue;
      }

      visited.add(key);
      drawPixel(x, y, fillColor);

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    updatePreview();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPixelPos(e);
    if (!pos) return;

    if (tool === 'fill') {
      floodFill(pos.x, pos.y, currentColor);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) saveToHistory(ctx);
    } else {
      setIsDrawing(true);
      const color = tool === 'eraser' ? 'transparent' : currentColor;
      drawPixel(pos.x, pos.y, color);
      updatePreview();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getPixelPos(e);
    if (!pos) return;

    const color = tool === 'eraser' ? 'transparent' : currentColor;
    drawPixel(pos.x, pos.y, color);
    updatePreview();
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) saveToHistory(ctx);
      setIsDrawing(false);
    }
  };

  const updatePreview = () => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview) return;

    const ctx = preview.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(canvas, 0, 0, preview.width, preview.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    onSave(imageData);
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${partName}_${width}x${height}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      saveToHistory(ctx);
      updatePreview();
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    saveToHistory(ctx);
    updatePreview();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-cyber-dark border-2 border-cyber-green w-full max-w-6xl h-[90vh] flex flex-col shadow-[0_0_30px_rgba(57,255,20,0.3)]">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-cyber-green">
          <h2 className="text-2xl font-bold text-cyber-green">
            PIXEL EDITOR - {partName} ({width}×{height})
          </h2>
          <button onClick={onClose} className="text-cyber-pink hover:text-white font-bold">
            [X] CLOSE
          </button>
        </div>

        <div className="flex-1 flex gap-4 p-4 overflow-hidden">

          {/* Left Panel - Tools */}
          <div className="w-64 flex flex-col gap-4 overflow-y-auto">

            {/* Tools */}
            <div className="border border-cyber-gray p-3">
              <h3 className="text-cyber-cyan mb-2">TOOLS</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTool('pen')}
                  className={`px-3 py-2 border ${tool === 'pen' ? 'bg-cyber-green text-black' : 'border-cyber-gray text-gray-400'}`}
                >
                  ✏️ PEN
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`px-3 py-2 border ${tool === 'eraser' ? 'bg-cyber-green text-black' : 'border-cyber-gray text-gray-400'}`}
                >
                  🧹 ERASE
                </button>
                <button
                  onClick={() => setTool('fill')}
                  className={`px-3 py-2 border ${tool === 'fill' ? 'bg-cyber-green text-black' : 'border-cyber-gray text-gray-400'}`}
                >
                  🪣 FILL
                </button>
              </div>
            </div>

            {/* Palette */}
            <div className="border border-cyber-gray p-3">
              <h3 className="text-cyber-cyan mb-2">PALETTE</h3>
              <div className="grid grid-cols-6 gap-1">
                {PALETTE.map(color => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-8 h-8 border-2 ${currentColor === color ? 'border-cyber-yellow' : 'border-gray-600'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-400">Current:</span>
                <div
                  className="w-12 h-8 border border-cyber-green"
                  style={{ backgroundColor: currentColor }}
                />
                <span className="text-xs text-cyber-green">{currentColor}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="border border-cyber-gray p-3">
              <h3 className="text-cyber-cyan mb-2">ACTIONS</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="px-3 py-1 border border-cyber-gray text-white hover:bg-cyber-gray disabled:opacity-30"
                >
                  ↶ UNDO
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="px-3 py-1 border border-cyber-gray text-white hover:bg-cyber-gray disabled:opacity-30"
                >
                  ↷ REDO
                </button>
                <button
                  onClick={clearCanvas}
                  className="px-3 py-1 border border-red-600 text-red-500 hover:bg-red-900"
                >
                  🗑️ CLEAR
                </button>
              </div>
            </div>

            {/* Import/Export */}
            <div className="border border-cyber-gray p-3">
              <h3 className="text-cyber-cyan mb-2">FILE</h3>
              <div className="flex flex-col gap-2">
                <label className="px-3 py-1 border border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black cursor-pointer text-center">
                  📂 IMPORT PNG
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleExportPNG}
                  className="px-3 py-1 border border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black"
                >
                  💾 EXPORT PNG
                </button>
              </div>
            </div>

            {/* View Options */}
            <div className="border border-cyber-gray p-3">
              <h3 className="text-cyber-cyan mb-2">VIEW</h3>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-400">Zoom:</label>
                <input
                  type="range"
                  min="4"
                  max="16"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs text-cyber-green w-8">{zoom}x</span>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={grid}
                  onChange={(e) => setGrid(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-white">Show Grid</span>
              </label>
            </div>

          </div>

          {/* Center - Canvas */}
          <div className="flex-1 flex flex-col gap-4 items-center justify-center overflow-auto bg-gray-900 relative">
            <div
              className="relative"
              style={{
                width: canvasWidth * zoom,
                height: canvasHeight * zoom,
                imageRendering: 'pixelated'
              }}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="absolute inset-0 cursor-crosshair"
                style={{
                  width: '100%',
                  height: '100%',
                  imageRendering: 'pixelated'
                }}
              />
              {grid && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%' }}
                >
                  {Array.from({ length: width + 1 }).map((_, i) => (
                    <line
                      key={`v${i}`}
                      x1={`${(i / width) * 100}%`}
                      y1="0%"
                      x2={`${(i / width) * 100}%`}
                      y2="100%"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1"
                    />
                  ))}
                  {Array.from({ length: height + 1 }).map((_, i) => (
                    <line
                      key={`h${i}`}
                      x1="0%"
                      y1={`${(i / height) * 100}%`}
                      x2="100%"
                      y2={`${(i / height) * 100}%`}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1"
                    />
                  ))}
                </svg>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-64 flex flex-col gap-4">

            {/* Preview */}
            <div className="border border-cyber-cyan p-3">
              <h3 className="text-cyber-cyan mb-2">PREVIEW (1:1)</h3>
              <div className="bg-gray-900 p-4 flex items-center justify-center">
                <canvas
                  ref={previewRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="border border-gray-700"
                  style={{
                    imageRendering: 'pixelated',
                    width: canvasWidth,
                    height: canvasHeight
                  }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="border border-cyber-gray p-3">
              <h3 className="text-cyber-cyan mb-2">INFO</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Part: {partName}</div>
                <div>Size: {width}×{height} px</div>
                <div>Actual: {canvasWidth}×{canvasHeight} px</div>
                <div>History: {historyIndex + 1}/{history.length}</div>
              </div>
            </div>

            {/* Tips */}
            <div className="border border-cyber-gray p-3">
              <h3 className="text-cyber-cyan mb-2">TIPS</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <div>• Click to draw</div>
                <div>• Use fill tool for areas</div>
                <div>• Import to pixelate images</div>
                <div>• Export as PNG for game</div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-cyber-green text-black font-bold hover:bg-white transition-colors"
            >
              ✓ SAVE & APPLY
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};

export default PixelEditor;
