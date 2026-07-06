import React from "react";
import { Settings, Check } from "lucide-react";

// 커스텀 유튜브 아이콘 SVG 컴포넌트 (공용 export)
export function YoutubeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.51a3.003 3.003 0 0 0-2.11 2.108C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.871.51 9.387.51 9.387.51s7.517 0 9.387-.51a3.003 3.003 0 0 0 2.11-2.108C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

// 커스텀 네이버 아이콘 SVG 컴포넌트 (공용 export)
export function NaverIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor"
      className={className}
    >
      <path d="M16.273 2.25h5.477V21.75h-5.477l-8.545-12.3v12.3H2.25V2.25h5.477l8.546 12.3V2.25z"/>
    </svg>
  );
}

interface ShortsHeaderProps {
  isYoutubeConnected: boolean;
  youtubeChannelName: string;
  setIsConnectionModalOpen: (open: boolean) => void;
  handleDisconnectYoutube: () => void;
}

export default function ShortsHeader({
  isYoutubeConnected,
  youtubeChannelName,
  setIsConnectionModalOpen,
  handleDisconnectYoutube
}: ShortsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6 mb-8 relative z-10 text-left">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
          <YoutubeIcon className="w-8 h-8 text-red-600 mr-3 animate-pulse" />
          YOUTUBE 쇼츠 AI
        </h1>
      </div>

      {/* 연동 버튼 및 연동 상태 */}
      <div className="mt-4 md:mt-0 flex items-center gap-3">
        {isYoutubeConnected ? (
          <div className="flex items-center gap-3 bg-white border border-slate-200/80 px-4 py-2.5 rounded-xl shadow-sm">
            <span className="flex items-center gap-1.5 text-red-600 text-sm font-bold">
              <Check className="w-4 h-4" />
              <span>공식 API 연동 완료</span>
            </span>
            <span className="h-4 w-px bg-slate-200" />
            <span className="text-sm text-slate-600 font-semibold">{youtubeChannelName}</span>
            <button 
              onClick={handleDisconnectYoutube}
              className="text-xs text-slate-400 hover:text-red-500 underline transition-all ml-1 cursor-pointer"
            >
              해제
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsConnectionModalOpen(true)}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all hover:border-slate-300 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-red-500 animate-spin" style={{ animationDuration: '6s' }} />
            <span>유튜브 공식 API 연동</span>
          </button>
        )}
      </div>
    </div>
  );
}
