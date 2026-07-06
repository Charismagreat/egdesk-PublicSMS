import React from "react";

interface CadViewerProps {
  cadZoom: number;
  setCadZoom: (val: number | ((prev: number) => number)) => void;
  cadPan: { x: number; y: number };
  setCadPan: (val: { x: number; y: number }) => void;
  handleCadMouseDown: (e: React.MouseEvent) => void;
  handleCadMouseMove: (e: React.MouseEvent) => void;
  handleCadMouseUp: () => void;
}

export function CadViewer({
  cadZoom,
  setCadZoom,
  cadPan,
  setCadPan,
  handleCadMouseDown,
  handleCadMouseMove,
  handleCadMouseUp,
}: CadViewerProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative select-none">
      <div className="flex justify-between items-center bg-slate-950 px-3 py-1.5 text-[10px] text-slate-400 font-mono border-b border-slate-800">
        <span>2D/3D Vector Engine CAD Viewer ({cadZoom.toFixed(1)}x)</span>
        <span>BOM List Auto-Linked</span>
      </div>
      <div
        onMouseDown={handleCadMouseDown}
        onMouseMove={handleCadMouseMove}
        onMouseUp={handleCadMouseUp}
        onMouseLeave={handleCadMouseUp}
        style={{ cursor: "grab" }}
        className="h-44 flex items-center justify-center relative overflow-hidden bg-slate-950"
      >
        <svg
          width="100%"
          height="100%"
          className="absolute transition-transform duration-75"
          style={{
            transform: `translate(${cadPan.x}px, ${cadPan.y}px) scale(${cadZoom})`,
          }}
        >
          <rect x="30" y="20" width="140" height="90" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3" />
          <circle cx="100" cy="65" r="30" fill="none" stroke="#06b6d4" strokeWidth="2" />
          <line x1="100" y1="10" x2="100" y2="120" stroke="#f43f5e" strokeWidth="0.8" strokeDasharray="5" />
          <line x1="20" y1="65" x2="180" y2="65" stroke="#f43f5e" strokeWidth="0.8" strokeDasharray="5" />
          <circle cx="45" cy="35" r="4" fill="#a855f7" />
          <circle cx="155" cy="35" r="4" fill="#a855f7" />
          <circle cx="45" cy="95" r="4" fill="#a855f7" />
          <circle cx="155" cy="95" r="4" fill="#a855f7" />

          <text x="35" y="125" fill="#22c55e" fontSize="7" fontFamily="monospace">
            FRAME MODEL V4.0 (AL-6061)
          </text>
        </svg>
        <div className="absolute right-3 bottom-3 flex flex-col gap-1 z-10">
          <button
            onClick={() => setCadZoom((z) => Math.min(z + 0.2, 3))}
            className="px-2 py-0.5 bg-slate-900 hover:bg-blue-600 hover:text-white rounded border border-slate-700 text-white font-bold text-xs"
            type="button"
          >
            +
          </button>
          <button
            onClick={() => setCadZoom((z) => Math.max(z - 0.2, 0.5))}
            className="px-2 py-0.5 bg-slate-900 hover:bg-blue-600 hover:text-white rounded border border-slate-700 text-white font-bold text-xs"
            type="button"
          >
            -
          </button>
          <button
            onClick={() => {
              setCadZoom(1);
              setCadPan({ x: 0, y: 0 });
            }}
            className="px-1 py-0.5 bg-slate-900 hover:bg-blue-600 hover:text-white rounded border border-slate-700 text-white text-[8px] font-bold"
            type="button"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
