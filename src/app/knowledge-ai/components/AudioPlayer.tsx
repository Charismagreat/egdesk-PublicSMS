import React from "react";
import { Play } from "lucide-react";

interface AudioPlayerProps {
  isPlayingAudio: boolean;
  setIsPlayingAudio: (val: boolean) => void;
  audioProgress: number;
}

export function AudioPlayer({ isPlayingAudio, setIsPlayingAudio, audioProgress }: AudioPlayerProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-100 px-3 py-1.5 text-[10px] text-slate-500 font-mono border-b border-slate-200">
        AI 화자분할 회의 오디오 비주얼라이저
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
              isPlayingAudio ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            type="button"
          >
            <Play className="w-4 h-4 fill-white" />
          </button>

          <div className="flex items-end gap-1.5 flex-1 h-9 select-none">
            {[15, 30, 20, 45, 10, 25, 40, 50, 15, 35, 20, 48, 10, 30, 45, 15, 25, 40, 20].map((h, i) => (
              <div
                key={i}
                style={{
                  height: `${h}%`,
                  transform: isPlayingAudio ? `scaleY(${1 + Math.sin(audioProgress + i) * 0.3})` : "none",
                }}
                className={`w-full rounded-t transition-all ${isPlayingAudio ? "bg-blue-500 shadow-sm" : "bg-slate-200"}`}
              />
            ))}
          </div>

          <span className="text-[10px] text-slate-400 font-mono">{isPlayingAudio ? "재생중" : "정지"}</span>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-xs font-mono max-h-16 overflow-y-auto scrollbar-thin select-none text-slate-300">
          <div className={`transition-all duration-300 ${audioProgress < 40 ? "text-cyan-400 font-bold" : "text-slate-400"}`}>
            <span className="text-slate-500">[00:02 최윤석 부사장]:</span> 북미 시장 벤처 기업 M&A를 적극 타진하겠습니다.
          </div>
          <div className={`transition-all duration-300 mt-1 ${audioProgress >= 40 ? "text-cyan-400 font-bold" : "text-slate-400"}`}>
            <span className="text-slate-500">[00:15 박현우 대표]:</span> 제안 가격 한도는 최대 45억으로 제한해 진행하도록 합의합니다.
          </div>
        </div>
      </div>
    </div>
  );
}
