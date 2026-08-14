"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, CheckCircle, Sparkles, RefreshCw } from "lucide-react";
import { InstagramPost, McpInstagramHistoryEntry } from "../types";

interface InstagramStatsProps {
  posts: InstagramPost[];
  isSessionConnected: boolean;
  instagramUsername: string;
  mcpConnections?: any[];
  mcpHistory?: McpInstagramHistoryEntry[];
  onSyncStats?: () => void;
  isSyncingStats?: boolean;
}

export default function InstagramStats({
  posts,
  isSessionConnected,
  instagramUsername,
  mcpConnections = [],
  mcpHistory = [],
  onSyncStats,
  isSyncingStats = false,
}: InstagramStatsProps) {
  // 실제 데이터베이스 및 MCP 이력 데이터 기반 실시간 통계 산출 (예약/실패 제외한 모든 유효 피드는 발행 완료 처리)
  const scheduledPosts = posts.filter((p) => (p.status || "").toUpperCase() === "SCHEDULED");
  const failedPosts = posts.filter((p) => {
    const st = (p.status || "").toUpperCase();
    return st === "FAILED" || st === "ERROR";
  });
  const postedPosts = posts.filter((p) => {
    const st = (p.status || "").toUpperCase();
    return st !== "SCHEDULED" && st !== "FAILED" && st !== "ERROR";
  });

  // 1. 연동 계정 상태 데이터 (mcpConnections 최우선 자동 폴백 렌더링)
  const activeUsername = instagramUsername || mcpConnections[0]?.username || mcpConnections[0]?.name || "chachogreat";
  const hasValidConn = isSessionConnected || mcpConnections.length > 0 || Boolean(instagramUsername);

  const displayFollowers = hasValidConn ? "연동 완료" : "미연동";
  const followerSubtext = hasValidConn
    ? `@${activeUsername} 활성 세션`
    : "인스타 계정 바인딩이 필요합니다";

  // 2. 누적 반응 수 (좋아요 수 / 댓글 수 직관적 1:1 표출)
  const totalLikes = postedPosts.reduce((acc, cur) => acc + Number(cur.likes ?? cur.likes_count ?? 0), 0);
  const totalComments = postedPosts.reduce((acc, cur) => acc + Number(cur.comments ?? cur.comments_count ?? 0), 0);
  const totalEngagement = totalLikes + totalComments;
  const engagementSubtext =
    postedPosts.length > 0 ? `총 반응 ${totalEngagement}건 (실제 발행 ${postedPosts.length}개 피드)` : "분석 대상 피드 이력 없음";

  // 3. 누적 업로드 건수 (유효 데이터 100% 통일)
  const uploadedCount = postedPosts.length;
  const totalCount = posts.length;
  const uploadSubtext = `예약 대기 ${scheduledPosts.length}건 / 발행 실패 ${failedPosts.length}건`;

  // 4. 자동 발행 성공률 (정합성)
  const totalAttempts = postedPosts.length + failedPosts.length;
  const successRate = totalAttempts > 0 ? Math.round((postedPosts.length / totalAttempts) * 100) : 100;
  const successSubtext = failedPosts.length > 0 ? `발행 오류 ${failedPosts.length}건 감지됨` : "시스템 오류율 0%";

  return (
    <div className="space-y-4 mb-8 relative z-10">
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
          <span className="text-xs font-bold text-slate-700">EGDesk MCP 반응 성과 관제</span>
          {posts.length > 0 && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              유효 이력 {posts.length}건 관제 중
            </span>
          )}
        </div>
        {onSyncStats && (
          <button
            onClick={onSyncStats}
            disabled={isSyncingStats}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStats ? 'animate-spin' : ''}`} />
            {isSyncingStats ? '실시간 반응 동기화 중...' : '실시간 반응 지표 동기화'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <motion.div
        whileHover={{ y: -5 }}
        className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50/30 rounded-bl-full pointer-events-none" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">계정 연동 상태</p>
            <h3 className={`text-2xl font-bold mt-2 ${isSessionConnected ? "text-pink-600" : "text-slate-400"}`}>
              {displayFollowers}
            </h3>
          </div>
          <div className="p-3 bg-pink-50 text-pink-600 rounded-xl border border-pink-100 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 truncate">{followerSubtext}</p>
      </motion.div>

      <motion.div
        whileHover={{ y: -5 }}
        className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/30 rounded-bl-full pointer-events-none" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">누적 피드 반응 수</p>
            <h3 className="text-xl font-bold mt-2 text-slate-800 flex items-center gap-2">
              <span className="text-pink-600">좋아요 {totalLikes}</span>
              <span className="text-slate-300">·</span>
              <span className="text-purple-600">댓글 {totalComments}</span>
            </h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">{engagementSubtext}</p>
      </motion.div>

      <motion.div
        whileHover={{ y: -5 }}
        className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50/30 rounded-bl-full pointer-events-none" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">누적 업로드</p>
            <h3 className="text-2xl font-bold mt-2 text-slate-800">
              {uploadedCount}개 <span className="text-xs text-slate-400 font-bold ml-1.5">총 {totalCount}개</span>
            </h3>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">{uploadSubtext}</p>
      </motion.div>

      <motion.div
        whileHover={{ y: -5 }}
        className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/30 rounded-bl-full pointer-events-none" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">자동 발행 정합성</p>
            <h3 className="text-2xl font-bold mt-2 text-slate-800">{successRate}%</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">{successSubtext}</p>
      </motion.div>
    </div>
  </div>
  );
}
