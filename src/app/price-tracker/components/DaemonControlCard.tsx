import React from "react";
import { Activity, Play, Copy, Check, Info, Calendar, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DaemonInfo } from "../types";

interface DaemonControlCardProps {
  isDaemonRunning: boolean;
  daemonInfo: DaemonInfo;
  startingDaemon: boolean;
  handleStartDaemon: () => Promise<void>;
  handleCopyCommand: (text: string) => void;
  copiedText: string;
  isDaemonHelpOpen: boolean;
  setIsDaemonHelpOpen: (open: boolean) => void;
  backfillStartDate: string;
  setBackfillStartDate: (date: string) => void;
  backfillEndDate: string;
  setBackfillEndDate: (date: string) => void;
  handleBulkBackfill: () => Promise<void>;
  isBackfilling: boolean;
}

export default function DaemonControlCard({
  isDaemonRunning,
  daemonInfo,
  startingDaemon,
  handleStartDaemon,
  handleCopyCommand,
  copiedText,
  isDaemonHelpOpen,
  setIsDaemonHelpOpen,
  backfillStartDate,
  setBackfillStartDate,
  backfillEndDate,
  setBackfillEndDate,
  handleBulkBackfill,
  isBackfilling
}: DaemonControlCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl border ${
            isDaemonRunning 
              ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
              : "bg-rose-50 border-rose-100 text-rose-600"
          }`}>
            <Activity className={`w-6 h-6 ${isDaemonRunning ? "animate-pulse" : ""}`} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Background Daemon</span>
              <span className={`w-2 h-2 rounded-full ${isDaemonRunning ? "bg-emerald-500 animate-ping" : "bg-rose-500"}`}></span>
            </div>
            <h3 className="text-sm font-black text-slate-800 flex flex-wrap items-center gap-2">
              SCM 시황 및 환율 자율 수집 데몬 관제 센터
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                isDaemonRunning ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}>
                {isDaemonRunning ? "ACTIVE 자율 구동 중" : "STOPPED 대기 상태"}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleStartDaemon}
            disabled={startingDaemon}
            className="flex items-center gap-1.5 px-3 py-2 bg-pink-650 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {startingDaemon ? "데몬 실행 중..." : "⚡ 자율 데몬 백그라운드 가동"}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCopyCommand("npm run price:daemon")}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-655 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              {copiedText === "npm run price:daemon" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>터미널 수동 기동 복사</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsDaemonHelpOpen(true)}
              className="p-2 bg-slate-100 hover:bg-pink-50 hover:text-pink-500 border border-slate-200 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center"
              title="터미널 수동 기동 명령어 설명 보기"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 데몬 가동 상세 정보 패널 (PC용 4열 그리드 고정) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">데몬 가동 프로세스 PID</span>
          <span className="font-mono font-black text-slate-700">{daemonInfo.pid}</span>
        </div>
        <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">최종 백그라운드 구동 시각</span>
          <span className="font-mono font-black text-slate-700">{daemonInfo.last_run}</span>
        </div>
        <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">자가 회복 백필(Backfill) 엔진</span>
          <span className="font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            무중단 복원 대기
          </span>
        </div>
        <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">백그라운드 수집 주기</span>
          <span className="font-bold text-slate-700 font-mono">1분 (실시간 시뮬레이션 가동)</span>
        </div>
      </div>

      {/* 과거 환율 지정 기간 자율 소급 패널 */}
      <div className="border-t border-slate-100 pt-4 mt-2 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-pink-650" />
              과거 누락 환율 지정 기간 소급 가져오기
            </h4>
            <p className="text-[9.5px] text-slate-400 font-semibold">데이터베이스에 수집되지 않은 과거 환율 공백을 원하는 기간만큼 일괄 자동 계산하여 복원합니다.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-705 gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold">시작</span>
                <input
                  type="date"
                  value={backfillStartDate}
                  onChange={(e) => setBackfillStartDate(e.target.value)}
                  className="bg-transparent border-none outline-none font-bold text-slate-700 text-xs"
                />
              </div>
              <span className="text-slate-400 text-xs font-bold">~</span>
              <div className="flex items-center bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-705 gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold">종료</span>
                <input
                  type="date"
                  value={backfillEndDate}
                  onChange={(e) => setBackfillEndDate(e.target.value)}
                  className="bg-transparent border-none outline-none font-bold text-slate-700 text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleBulkBackfill}
              disabled={isBackfilling}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-655 to-pink-500 hover:from-pink-700 hover:to-pink-600 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${isBackfilling ? "animate-spin" : ""}`} />
              {isBackfilling ? "소급 분석 및 적재 중..." : "환율 소급 가져오기 실행"}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 2-C: 터미널 수동 기동 가이드 팝업 */}
      <AnimatePresence>
        {isDaemonHelpOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-slate-200 w-full max-w-[500px] rounded-3xl p-6 shadow-2xl space-y-6 overflow-hidden text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <X className="w-4 h-4 text-pink-650" />
                    터미널 수동 기동 명령어 안내
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">서버 콘솔(CLI) 독립 구동 명령어 사용법</p>
                </div>
                <button onClick={() => setIsDaemonHelpOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X className="w-4 h-4 text-slate-505" />
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-500">기동 명령어</h4>
                <div className="flex items-center justify-between bg-slate-900 text-slate-100 p-3.5 rounded-2xl font-mono text-xs border border-slate-850 select-all relative group">
                  <span>npm run price:daemon</span>
                  <button
                    onClick={() => handleCopyCommand("npm run price:daemon")}
                    className="p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors text-slate-400 hover:text-white"
                    title="복사하기"
                  >
                    {copiedText === "npm run price:daemon" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="p-1.5 bg-pink-50 text-pink-600 rounded-lg h-max shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-[11px] font-black text-slate-700">1. 웹 서버 독립 구동 (24시간 연속 수집)</h5>
                    <p className="text-[9.5px] text-slate-450 leading-relaxed font-semibold">
                      웹 브라우저 창을 꺼두어도 서버 운영체제(OS) 백그라운드 상에서 가격 수집 로봇이 24시간 독자적으로 감시 및 SMS 경보망을 작동하게 할 수 있습니다.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="p-1.5 bg-pink-50 text-pink-600 rounded-lg h-max shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-[11px] font-black text-slate-700">2. 장애 시 강제 재시동 및 디버깅</h5>
                    <p className="text-[9.5px] text-slate-450 leading-relaxed font-semibold">
                      서버 컴퓨터 오류 등으로 수집기가 정지했을 때, 서버 콘솔창에 입력하여 수집기를 **즉각 수동 강제 재시작**시키고 수집 로그 및 에러 내역을 추적할 때 유용합니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl flex items-start gap-2">
                <Info className="w-4 h-4 text-pink-650 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h5 className="text-[10px] font-bold text-slate-700">작동 방식 참고</h5>
                  <p className="text-[9px] text-slate-455 leading-relaxed font-semibold">
                    이 명령어를 실행하면 <code className="font-mono text-pink-650 font-bold">scripts/price_tracker_daemon.js</code> 스크립트가 로컬 SQLite 데이터베이스와 연동되어 직접 크롤러 및 실시간 환율 수집 프로세스를 기동시킵니다.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 로컬에서 사용하기 위해 아이콘 매핑
function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
