"use client";

import React from "react";
import { motion } from "framer-motion";
import { FolderGit2, FileText, DownloadCloud, Radio, CheckCircle, Clock } from "lucide-react";

interface DriveStatsBoardProps {
  foldersCount: number;
  eventsCount: number;
  downloadedCount: number;
  driveStatus: any;
}

export default function DriveStatsBoard({
  foldersCount,
  eventsCount,
  downloadedCount,
  driveStatus
}: DriveStatsBoardProps) {
  const isWatchActive = driveStatus?.watchActive || driveStatus?.channelActive;
  const channelExpiration = driveStatus?.channelExpiration || driveStatus?.expiration;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. 감시 폴더 */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between"
      >
        <div>
          <span className="text-xs font-bold text-slate-400 block mb-1">감시 대상 폴더</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800 tracking-tight">{foldersCount}</span>
            <span className="text-xs font-bold text-slate-500">개 폴더</span>
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">실시간 변동 추적 중</span>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
          <FolderGit2 className="w-6 h-6" />
        </div>
      </motion.div>

      {/* 2. 총 파일 변동 이벤트 */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between"
      >
        <div>
          <span className="text-xs font-bold text-slate-400 block mb-1">감지된 파일 변동</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800 tracking-tight">{eventsCount}</span>
            <span className="text-xs font-bold text-slate-500">건</span>
          </div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">생성 · 수정 · 삭제 로그</span>
        </div>
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
          <FileText className="w-6 h-6" />
        </div>
      </motion.div>

      {/* 3. 자동 다운로드 보관 건수 */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between"
      >
        <div>
          <span className="text-xs font-bold text-slate-400 block mb-1">로컬 스토리지 적재</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">{downloadedCount}</span>
            <span className="text-xs font-bold text-slate-500">건 다운로드</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">지식베이스 연동 대기</span>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
          <DownloadCloud className="w-6 h-6" />
        </div>
      </motion.div>

      {/* 4. 웹훅 푸시 감시 상태 */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between"
      >
        <div>
          <span className="text-xs font-bold text-slate-400 block mb-1">구글 웹훅 Push 채널</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-black tracking-tight ${isWatchActive ? "text-indigo-600" : "text-slate-700"}`}>
              {isWatchActive ? "실시간 수신 활성" : "폴링 모드 대기"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold mt-1 block truncate max-w-[160px]">
            {channelExpiration ? `만료: ${new Date(channelExpiration).toLocaleTimeString()}` : "주기적 동기화 작동"}
          </span>
        </div>
        <div className={`p-3 rounded-2xl border ${
          isWatchActive 
            ? "bg-amber-50 text-amber-600 border-amber-100" 
            : "bg-slate-50 text-slate-500 border-slate-100"
        }`}>
          <Radio className={`w-6 h-6 ${isWatchActive ? "animate-pulse" : ""}`} />
        </div>
      </motion.div>
    </div>
  );
}
