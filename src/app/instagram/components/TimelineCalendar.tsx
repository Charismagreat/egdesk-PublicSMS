"use client";

import React from "react";
import { Calendar, AlertTriangle, Heart, MessageCircle, Image as ImageIcon } from "lucide-react";
import { InstagramPost } from "../types";

interface TimelineCalendarProps {
  /**
   * 포스트 내역 목록
   */
  posts: InstagramPost[];
  /**
   * 미리보기용으로 선택된 포스트
   */
  selectedPostForPreview: InstagramPost | null;
  /**
   * 포스트 선택 핸들러
   */
  onSelectPostForPreview: (post: InstagramPost | null) => void;
  /**
   * 계정 연동 성공 상태
   */
  isSessionConnected: boolean;
  /**
   * 예약 포스트 즉시 발행 승인 핸들러
   */
  onApproveImmediate: (postId: number) => Promise<void>;
  /**
   * 예약 포스트 삭제/취소 핸들러
   */
  onDeletePost: (postId: number) => Promise<void>;
}

/**
 * 인스타그램 포스팅 예약 현황 및 타임라인 이력 목록 컴포넌트
 */
export default function TimelineCalendar({
  posts,
  selectedPostForPreview,
  onSelectPostForPreview,
  isSessionConnected,
  onApproveImmediate,
  onDeletePost,
}: TimelineCalendarProps) {
  // 예약 피드의 색상/상태 클래스 맵
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            임시 초안
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            발행 예약
          </span>
        );
      case "POSTED":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            발행 완료
          </span>
        );
      case "FAILED":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            발행 실패
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm relative overflow-hidden text-left">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-600" />
          <h2 className="text-base font-bold text-slate-800">포스팅 타임라인 & 예약 현황</h2>
        </div>
        <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 font-semibold">
          총 {posts.length}건
        </span>
      </div>

      {/* 계정 미연동 시 로컬 시뮬레이션 모드 안내 배너 */}
      {!isSessionConnected && (
        <div className="mb-4 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex gap-2.5 items-start shadow-sm transition-all">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">로컬 시뮬레이션 모드 작동 중</p>
            <p className="text-[10px] text-amber-700/90 mt-0.5 leading-relaxed font-semibold">
              현재 실제 인스타그램 계정이 연동되지 않았습니다. 아래 표시되는 발행 완료 및 예약 피드는 외부 인스타그램에 노출되지 않는{" "}
              <strong>내부 가상 테스트 데이터</strong>입니다.
            </p>
          </div>
        </div>
      )}

      {/* 타임라인 항목 */}
      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">현재 등록된 예약이나 발행 이력이 없습니다.</p>
            <p className="text-[10px] text-slate-400 mt-1">AI 크리에이터로 첫 예약을 등록해 보세요.</p>
          </div>
        ) : (
          posts.map((post) => {
            const isSelected = selectedPostForPreview?.id === post.id;
            return (
              <div
                key={post.id}
                onClick={() => onSelectPostForPreview(post)}
                className={`p-3.5 rounded-2xl border transition space-y-2 relative cursor-pointer ${
                  isSelected
                    ? "border-pink-500 bg-pink-50/50 shadow-sm ring-1 ring-pink-100"
                    : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(post.status)}
                    {!isSessionConnected && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200 shadow-sm">
                        가상 데이터
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold">
                    {post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>

                <div className="flex gap-3">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt="예약피드"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-slate-200 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 overflow-hidden">
                    {post.product && <p className="text-[10px] text-slate-500 font-bold truncate">📍 {post.product.name}</p>}
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-normal">{post.content}</p>
                  </div>
                </div>

                {/* 성과 정보 또는 수동 승인 액션 버튼 */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-2">
                  <div className="flex items-center gap-2.5 text-slate-500 text-[10px]">
                    <span className="flex items-center gap-1 font-semibold">
                      <Heart className="w-3 h-3 text-pink-500" /> {post.likes_count || 0}
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      <MessageCircle className="w-3 h-3 text-cyan-600" /> {post.comments_count || 0}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    {post.status === "SCHEDULED" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApproveImmediate(post.id);
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-2 py-1 rounded text-[9px] transition cursor-pointer border-0"
                      >
                        즉시발행 승인
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePost(post.id);
                      }}
                      className="bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-500 font-bold px-2 py-1 rounded text-[9px] border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                    >
                      취소/삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
