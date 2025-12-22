import React, { useState, useRef, useEffect } from 'react';
import { MonitorPlay, Camera, ZoomIn, ZoomOut, RotateCcw, Maximize2, Target } from 'lucide-react';

export interface ScreenshotData {
  id: string;
  timestamp: number;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  highlights?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    color?: string;
  }>;
}

interface ScreenshotViewerProps {
  screenshot?: ScreenshotData;
  isLoading?: boolean;
  onScreenshotCapture?: () => void;
  className?: string;
}

export const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({
  screenshot,
  isLoading = false,
  onScreenshotCapture,
  className = '',
}) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleReset = () => {
    setZoom(100);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Render highlights
  const renderHighlights = () => {
    if (!screenshot?.highlights || !imageRef.current) return null;

    const { width: naturalWidth, height: naturalHeight } = imageRef.current;
    const displayWidth = (naturalWidth * zoom) / 100;
    const displayHeight = (naturalHeight * zoom) / 100;

    return screenshot.highlights.map((highlight, index) => {
      const left = (highlight.x * displayWidth) / screenshot.viewport.width;
      const top = (highlight.y * displayHeight) / screenshot.viewport.height;
      const width = (highlight.width * displayWidth) / screenshot.viewport.width;
      const height = (highlight.height * displayHeight) / screenshot.viewport.height;

      return (
        <div
          key={index}
          className="absolute border-2 pointer-events-none animate-pulse"
          style={{
            left,
            top,
            width,
            height,
            borderColor: highlight.color || '#ef4444',
            backgroundColor: `${highlight.color || '#ef4444'}20`,
          }}
        >
          {highlight.label && (
            <div
              className="absolute -top-6 left-0 px-2 py-0.5 text-xs font-mono text-white rounded"
              style={{ backgroundColor: highlight.color || '#ef4444' }}
            >
              {highlight.label}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-neutral-900 flex flex-col ${className}`}
    >
      {/* Toolbar */}
      <div className="bg-slate-800 p-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={onScreenshotCapture}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
          >
            <Camera className="w-3 h-3" />
            {isLoading ? 'Capturing...' : 'Capture'}
          </button>

          <button
            onClick={() => setHighlightMode(!highlightMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
              highlightMode
                ? 'bg-red-700 hover:bg-red-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            <Target className="w-3 h-3" />
            Highlight
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 rounded border border-slate-700">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-400">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border-l border-slate-700"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Screenshot Display Area */}
      <div className="flex-1 relative overflow-auto bg-neutral-900 flex items-center justify-center p-4">
        {!screenshot && !isLoading && (
          <div className="text-center text-slate-500">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No screenshot captured</p>
            <p className="text-xs mt-2">Click "Capture" to take a screenshot</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center text-slate-500">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Capturing screenshot...</p>
          </div>
        )}

        {screenshot && (
          <div className="relative inline-block">
            <img
              ref={imageRef}
              src={screenshot.url}
              alt="Screenshot"
              className="max-w-full h-auto transition-transform duration-200"
              style={{ transform: `scale(${zoom / 100})` }}
              onLoad={() => {
                // Image loaded
              }}
            />

            {/* Render highlights */}
            {renderHighlights()}

            {/* Highlight mode overlay */}
            {highlightMode && (
              <div
                className="absolute inset-0 cursor-crosshair"
                onClick={(e) => {
                  if (!imageRef.current) return;

                  const rect = imageRef.current.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * screenshot.viewport.width;
                  const y = ((e.clientY - rect.top) / rect.height) * screenshot.viewport.height;

                  console.log('Clicked at:', { x, y });
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Screenshot Info */}
      {screenshot && (
        <div className="bg-slate-900 border-t border-slate-700 p-2 text-xs text-slate-400 font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>
                Viewport: {screenshot.viewport.width}×{screenshot.viewport.height}
              </span>
              <span>
                {new Date(screenshot.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {screenshot.highlights && screenshot.highlights.length > 0 && (
              <div className="flex items-center gap-2">
                <span>Highlights:</span>
                <span className="text-red-400">{screenshot.highlights.length}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenshotViewer;
