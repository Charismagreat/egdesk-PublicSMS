import React from "react";
import { Layers, ShieldAlert, Calendar, Clock } from "lucide-react";

interface ShortsBuildSettingsProps {
  isGenerated: boolean;
  activeOutputTab: 'A' | 'B';
  setActiveOutputTab: (tab: 'A' | 'B') => void;
  isYoutubeConnected: boolean;
  scheduleDate: string;
  setScheduleDate: (date: string) => void;
  scheduleTime: string;
  setScheduleTime: (time: string) => void;
  handlePublishShorts: () => void;
}

export default function ShortsBuildSettings({
  isGenerated,
  activeOutputTab,
  setActiveOutputTab,
  isYoutubeConnected,
  scheduleDate,
  setScheduleDate,
  scheduleTime,
  setScheduleTime,
  handlePublishShorts
}: ShortsBuildSettingsProps) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6 text-left">
      <div>
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-red-500" />
          <span>아웃풋 채널 및 빌드 방식 결정</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          빌드된 쇼츠 대본을 가상으로 시뮬레이션 한 뒤, 파일로 다운로드 하거나 유튜브 채널로 완벽하게 자동 예약 발행할 수 있습니다.
        </p>
      </div>

      {/* A안 vs B안 탭 토글 */}
      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveOutputTab('A')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
            activeOutputTab === 'A'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
              : 'text-slate-500 hover:text-slate-800 bg-transparent'
          }`}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm">💾 A안 리소스 다운로드</span>
            <span className="text-[10px] opacity-75 font-normal">대본 + SRT자막 + MP3오디오 압축팩</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveOutputTab('B')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
            activeOutputTab === 'B'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
              : 'text-slate-500 hover:text-slate-800 bg-transparent'
          }`}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm">🚀 B안 오토파일럿</span>
            <span className="text-[10px] opacity-75 font-normal">AI MP4 완전 빌드 + 유튜브 자동업로드</span>
          </div>
        </button>
      </div>

      {/* 예약 설정 및 실행 패널 */}
      <div className="pt-4 border-t border-slate-100 space-y-4">
        
        {activeOutputTab === 'B' && !isYoutubeConnected && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-left">
              <span className="text-xs font-bold text-amber-800 block">유튜브 API 미설정 상태</span>
              <span className="text-[11px] text-amber-600 block leading-relaxed font-medium">
                현재 유튜브 채널 연동을 완료하지 않으셨습니다. 상단 우측의 &apos;유튜브 공식 API 연동&apos;을 완료하시거나, 샌드박스 가상 계정 모드를 가동해 주셔야 자동 예약 업로드를 수행할 수 있습니다.
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">예약 발행일자</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white text-slate-700 font-medium cursor-pointer"
                />
              </div>
            </div>
            <div className="w-32">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">예약 발행시간</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white text-slate-700 font-medium cursor-pointer"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePublishShorts}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer border-none"
          >
            {activeOutputTab === 'A' ? "대본 리소스 다운로드하기" : "자동 업로드 예약 등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
