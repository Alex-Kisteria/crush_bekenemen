type ZoomControlsProps = {
  zoom: number; // 1 = 100%
  minZoom?: number;
  maxZoom?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export default function ZoomControls({
  zoom,
  minZoom = 0.5,
  maxZoom = 2,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps) {
  const pct = Math.round(zoom * 100);

  return (
    <div className="absolute bottom-6 left-4 z-50 flex items-center bg-white/80 backdrop-blur-sm rounded-xl px-4 py-1 font-semibold shadow-lg border-3 border-rose-600/25">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        className="w-8 h-8 rounded-full hover:bg-rose-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center justify-center text-rose-600"
        title="Zoom out"
      >
        −
      </button>

      <button
        type="button"
        onClick={onReset}
        className="text-sm font-medium text-rose-900 min-w-[3.5rem] text-center hover:bg-rose-100/70 rounded-full px-2 py-1 transition-colors"
        title="Reset zoom"
      >
        {pct}%
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        className="w-8 h-8 rounded-full hover:bg-rose-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center justify-center text-rose-600"
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
}
