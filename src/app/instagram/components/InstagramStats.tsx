"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, CheckCircle, Sparkles } from "lucide-react";
import { InstagramPost } from "../types";

interface InstagramStatsProps {
  /**
   * 포스트 내역 목록
   */
  posts: InstagramPost[];
  /**
   * 계정 연동 성공 상태
   */
  isSessionConnected: boolean;
  /**
   * 연동된 계정 유저명
   */
  instagramUsername: string;
}

/**
 * 실시간 주요 데이터 지표 통계 스코어보드 컴포넌트
 */
export default function InstagramStats({
  posts,
  isSessionConnected,
  instagramUsername,
}: InstagramStatsProps) {
  // 실제 데이터베이스 데이터 기반 실시간 통계 산출
  const postedPosts = posts.filter((p) => p.status === "POSTED");
  const scheduledPosts = posts.filter((p) => p.status === "SCHEDULED");
  const failedPosts = posts.filter((p) => p.status === "FAILED");

  // 1. 연동 계정 상태 데이터
  const displayFollowers = isSessionConnected ? "연동 완료" : "미연동";
  const followerSubtext = isSessionConnected
    ? `@${instagramUsername} 활성 세션`
    : "인스타 계정 바인딩이 필요합니다";

  // 2. 피드 평균 반응 (좋아요 + 댓글 실제 평균값)
  const totalEngagement = postedPosts.reduce(
    (acc, cur) => acc + (cur.likes_count || 0) + (cur.comments_count || 0),
    0
  );
  const avgEngagement = postedPosts.length > 0 ? (totalEngagement / postedPosts.length).toFixed(1) : "0";
  const engagementSubtext =
    postedPosts.length > 0 ? `실제 발행 ${postedPosts.length}개 피드 종합 분석` : "분석 대상 피드 이력 없음";

  // 3. 누적 업로드 건수
  const uploadedCount = postedPosts.length;
  const totalCount = posts.length;
  const uploadSubtext = `예약 대기 ${scheduledPosts.length}건 / 발행 실패 ${failedPosts.length}건`;

  // 4. 자동 발행 성공률 (정합성)
  const totalAttempts = postedPosts.length + failedPosts.length;
  const successRate = totalAttempts > 0 ? Math.round((postedPosts.length / totalAttempts) * 100) : 100;
  const successSubtext = failedPosts.length > 0 ? `발행 오류 ${failedPosts.length}건 감지됨` : "시스템 오류율 0%";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
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
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">평균 피드 반응 (Eng.)</p>
            <h3 className="text-2xl font-bold mt-2 text-slate-800">
              {avgEngagement} <span className="text-xs text-slate-400 font-semibold ml-1">건/피드</span>
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
  );
}
