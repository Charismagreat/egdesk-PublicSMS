import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, Volume2, Heart, MessageSquare } from "lucide-react";
import { YoutubeIcon } from "./ShortsHeader";
import { ScriptLine } from "../types";

interface ShortsSimulatorProps {
  isGenerated: boolean;
  isPlaying: boolean;
  handlePlayToggle: () => void;
  generatedScript: ScriptLine[];
  currentLineIndex: number;
  playbackTime: number;
  shortsTitle: string;
  bgMusic: string;
  bgVisualTheme: string;
}

export default function ShortsSimulator({
  isGenerated,
  isPlaying,
  handlePlayToggle,
  generatedScript,
  currentLineIndex,
  playbackTime,
  shortsTitle,
  bgMusic,
  bgVisualTheme
}: ShortsSimulatorProps) {
  return (
    <div className="sticky top-6 w-full max-w-[340px] space-y-4 text-left">
      {/* 자막 번쩍임 제어 및 미디어 재생 표시 배너 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-3.5 h-3.5 rounded-full ${isPlaying ? 'bg-red-500 animate-ping' : 'bg-slate-300'}`} />
          <span className="text-xs font-bold text-slate-700">쇼츠 자막 실시간 시뮬레이터</span>
        </div>
        {isGenerated && (
          <button
            type="button"
            onClick={handlePlayToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-all cursor-pointer border-none"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-red-500" />
                <span>일시정지</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span>대본재생</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 9:16 스마트폰 프레임 (실버-화이트 베젤 디자인) */}
      <div className="relative w-full aspect-[9/18.5] bg-slate-950 rounded-[40px] p-3 shadow-2xl border-4 border-slate-200 overflow-hidden">
        {/* 스피커 & 카메라 노치 데코 */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-full z-30 flex items-center justify-center">
          <div className="w-12 h-1 bg-slate-800 rounded-full mb-1" />
          <div className="w-2.5 h-2.5 bg-blue-950 rounded-full ml-3 mb-1 border border-slate-900" />
        </div>

        {/* 디스플레이 화면 */}
        <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-slate-900 flex flex-col justify-between p-4 pt-10 pb-6">
          
          {/* 숏폼 배경 비주얼 플레이스홀더 (CSS 소프트 웨이브 그래디언트) */}
          <div className="absolute inset-0 z-0 bg-gradient-to-tr from-slate-900 via-rose-950 to-slate-950 flex items-center justify-center">
            <div className="absolute w-64 h-64 bg-red-600/10 rounded-full filter blur-2xl animate-pulse" />
            <div className="absolute -bottom-10 w-72 h-72 bg-rose-600/15 rounded-full filter blur-3xl" />
            
            {/* 가상 영상 촬영 테두리 */}
            <div className="border border-white/5 w-[90%] h-[92%] rounded-2xl flex items-center justify-center">
              {!isGenerated && (
                <div className="text-center p-6 text-slate-500">
                  <YoutubeIcon className="w-12 h-12 mx-auto text-slate-700 mb-3" />
                  <span className="text-xs block font-medium">대본을 생성하시면</span>
                  <span className="text-[11px] block mt-1 opacity-70">여기에 실시간 유튜브 자막과 숏폼 비주얼이 시뮬레이션 됩니다.</span>
                </div>
              )}
            </div>
          </div>

          {/* --- 폰 화면 상단 헤더 --- */}
          <div className="relative z-10 flex justify-between items-center text-white/80">
            <span className="text-[10px] font-bold tracking-widest bg-black/30 px-2 py-0.5 rounded-full">LIVE PREVIEW</span>
            <div className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-[9px] font-bold">AI Voice ON</span>
            </div>
          </div>

          {/* --- 폰 화면 중앙: 자막 싱크 실시간 재생 모션 영역 --- */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4">
            {isGenerated && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentLineIndex}
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1.1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="space-y-4"
                >
                  {/* 화려한 숏폼 전용 굵은 외곽선 자막 연출 */}
                  <div className="bg-yellow-400 text-black px-4 py-2 rounded-xl text-sm font-extrabold shadow-lg border border-black uppercase tracking-tight">
                    {generatedScript[currentLineIndex]?.text}
                  </div>
                  
                  <div className="inline-block bg-black/50 text-[10px] text-white/90 px-2.5 py-1 rounded-full font-light backdrop-blur-sm">
                    🎤 {generatedScript[currentLineIndex]?.audioStatus}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* --- 폰 화면 하단 정보 영역 --- */}
          <div className="relative z-10 space-y-3">
            {/* 쇼츠 메타정보 */}
            {isGenerated && (
              <div className="bg-black/40 p-3 rounded-2xl backdrop-blur-md border border-white/10 text-white space-y-1">
                <span className="text-[11px] font-bold text-red-400 block truncate">🎥 {shortsTitle}</span>
                <div className="flex justify-between items-center text-[9px] text-slate-300">
                  <span>🎵 {bgMusic}</span>
                  <span>🎨 {bgVisualTheme}</span>
                </div>
              </div>
            )}

            {/* 미디어 플레이 바 및 재생 시간 표시 */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] text-white/60">
                <span>00:{playbackTime < 10 ? `0${playbackTime}` : playbackTime}</span>
                <span>00:18 (총 길이)</span>
              </div>
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-600 transition-all duration-1000 ease-linear"
                  style={{ width: `${(playbackTime / 18) * 100}%` }}
                />
              </div>
            </div>

            {/* 유튜브 쇼츠 하단 제어 및 소셜 카운트 데코 */}
            <div className="flex justify-between items-center pt-2 text-white/90">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center font-extrabold text-[10px]">
                  N
                </div>
                <span className="text-[10px] font-bold">N-BLOG LAB</span>
              </div>
              <div className="flex gap-3 text-[10px] opacity-80">
                <span className="flex items-center gap-0.5"><Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> 1.2K</span>
                <span className="flex items-center gap-0.5"><MessageSquare className="w-3.5 h-3.5 text-white" /> 230</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 시뮬레이터 아래 설명문구 */}
      <p className="text-[10px] text-slate-400 text-center leading-relaxed">
        * 상단의 대본재생 버튼을 누르면, 가상의 오디오 멘트 진행 및 자막 싱크 모션 연출이 즉시 작동합니다. (18초 가상 루프 진행)
      </p>
    </div>
  );
}
