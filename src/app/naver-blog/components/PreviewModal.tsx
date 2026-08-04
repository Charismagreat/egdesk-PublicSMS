'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Tag, FileText, CheckCircle, Clock, Send, Eye, Image as ImageIcon } from 'lucide-react';
import { NaverPost } from '../types';

interface PreviewModalProps {
  post: NaverPost | null;
  onClose: () => void;
  onApproveImmediate?: (id: number) => void;
}

export default function PreviewModal({ post, onClose, onApproveImmediate }: PreviewModalProps) {
  if (!post) return null;

  const isPosted = post.status === 'POSTED';
  const formattedDate = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : '예약 시간 미지정';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* 배경 오버레이 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* 모달 윈도우 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 z-10 overflow-hidden my-8"
        >
          {/* 상단 뷰어 헤더 (네이버 상징 그린 테마) */}
          <div className="bg-gradient-to-r from-[#03C75A] to-emerald-600 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-sm text-white">
                N
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight">네이버 블로그 실시간 라이브 미리보기</h3>
                <p className="text-[10px] text-emerald-100 font-semibold">스마트에디터 ONE 모바일 스킨 렌더링</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 정보 뱃지 메타 정보 바 */}
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 ${
                isPosted
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
                {isPosted ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {isPosted ? '발행 완료' : '예약 대기'}
              </span>
              <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formattedDate}
              </span>
            </div>
            {post.product && (
              <span className="text-[11px] font-extrabold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                📦 {post.product.name}
              </span>
            )}
          </div>

          {/* 본문 콘텐트 영역 (모바일 블로그 스타일 스토어 뷰어) */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {/* 제목 */}
            <div>
              <h2 className="text-xl font-black text-slate-800 leading-snug tracking-tight">
                {post.title}
              </h2>
            </div>

            {/* 메인 첨부 이미지 */}
            {post.image_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                <img
                  src={post.image_url}
                  alt="블로그 대표 이미지"
                  className="w-full max-h-72 object-cover"
                />
              </div>
            )}

            {/* 타겟 키워드 태그 */}
            {post.target_keywords && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {post.target_keywords.split(',').map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-extrabold flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3 text-emerald-500" />
                    #{kw.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* 본문 텍스트 */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 text-xs leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
              {post.content}
            </div>

            {/* 서브 이미지 */}
            {post.sub_image_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                <img
                  src={post.sub_image_url}
                  alt="블로그 본문 수록 이미지"
                  className="w-full max-h-60 object-cover"
                />
              </div>
            )}
          </div>

          {/* 하단 액션 버튼 바 */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              닫기
            </button>

            {!isPosted && onApproveImmediate && (
              <button
                onClick={() => {
                  onApproveImmediate(post.id);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                지금 즉시 RPA 발행
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
