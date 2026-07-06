'use client';

import React from 'react';
import { Search, Sliders, Heart, MessageCircle } from 'lucide-react';
import { NaverPost } from '../types';

// 커스텀 네이버 아이콘 SVG 컴포넌트
function NaverIcon({ className = "w-5 h-5" }: { className?: string }) {
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

interface MobilePreviewProps {
  naverBlogIdInput: string;
  viewTitle: string;
  viewContent: string;
  viewKeywords: string;
  viewMainImage: string;
  viewSubImage: string;
  systemTime: string;
  selectedPostForPreview: NaverPost | null;
}

export default function MobilePreview({
  naverBlogIdInput,
  viewTitle,
  viewContent,
  viewKeywords,
  viewMainImage,
  viewSubImage,
  systemTime,
  selectedPostForPreview
}: MobilePreviewProps) {

  // 본문 문단 분할 렌더링 헬퍼
  const renderFormattedContent = (txt: string) => {
    return txt.split('\n').map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return <div key={index} className="h-4" />;
      
      // 소제목 스타일링 (★이나 📌, ■ 등으로 시작할 때)
      if (trimmed.startsWith('★') || trimmed.startsWith('■') || trimmed.startsWith('📌')) {
        return (
          <h4 key={index} className="text-base font-bold text-gray-800 dark:text-gray-100 mt-5 mb-2.5 border-l-[3px] border-[#03C75A] pl-2" style={{ contentVisibility: 'auto' }}>
            {trimmed}
          </h4>
        );
      }
      
      return (
        <p key={index} className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-3 break-all whitespace-pre-wrap">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="lg:col-span-1 sticky top-8 space-y-6 pb-16 w-full flex justify-center">
      
      {/* 네이버 블로그 전용 초록 테마 스마트폰 프레임 (3D 섀도우) */}
      <div className="relative w-full max-w-[340px] aspect-[9/19] rounded-[48px] border-[12px] border-slate-900 bg-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden ring-8 ring-slate-100/50 mb-12">
        
        {/* 스피커 & 카메라 노치 데코 */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
        </div>

        {/* 모바일 화면 내부 실질 컨텐츠 */}
        <div className="w-full h-full bg-[#F4F4F4] text-slate-800 flex flex-col overflow-y-auto select-none pt-8 relative custom-scrollbar">
          
          {/* 상단 네이버 블로그 로고 & 글로벌 헤더 스킨 */}
          <div className="bg-[#03C75A] text-white px-4 py-3 shrink-0 flex items-center justify-between sticky top-0 z-40 shadow-xs">
            <div className="flex items-center gap-1.5">
              <NaverIcon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold tracking-tight">블로그</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-white/90" />
              <Sliders className="w-4 h-4 text-white/90" />
            </div>
          </div>

          {/* 포스트 커버 이미지 / 블로그 스킨 헤더 */}
          <div className="bg-white px-4 py-4.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-150 flex items-center justify-center text-[#03C75A] text-xs font-black shadow-3xs">
                {naverBlogIdInput ? naverBlogIdInput.substring(0,2).toUpperCase() : 'N'}
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  {naverBlogIdInput ? `@${naverBlogIdInput}` : '@naver_official'}
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-[#03C75A] text-[8px] font-black border border-emerald-100">이웃추가</span>
                </div>
                <div className="text-[9px] text-slate-400 flex items-center gap-2 mt-1 font-semibold">
                  <span>방문자: 42,910명</span>
                  <span>•</span>
                  <span>오늘: 215명</span>
                </div>
              </div>
            </div>
          </div>

          {/* 포스팅 본문 컨텐츠 디테일 */}
          <div className="bg-white px-4 py-5.5 flex-1 space-y-4.5">
            
            {/* 포스팅 카테고리 정보 */}
            <div className="text-[9px] text-[#03C75A] font-black tracking-wider uppercase">
              🛠️ IT · 가전 · 일상 솔직리뷰
            </div>

            {/* 포스팅 제목 */}
            <h2 className="text-[13px] font-black text-slate-950 leading-snug tracking-tight">
              {viewTitle}
            </h2>

            {/* 포스팅 작성 정보 */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 border-b border-slate-100 pb-3 mt-1.5 font-bold">
              <span>작성: {systemTime.split(' ')[1] || '오늘'}</span>
              <span>주소복사 • 통계</span>
            </div>

            {/* 1. 대표 이미지 렌더링 */}
            {viewMainImage && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video shadow-xs">
                <img 
                  src={viewMainImage} 
                  alt="대표 이미지"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[8px] font-bold tracking-wider uppercase">
                  대표 이미지
                </div>
              </div>
            )}

            {/* 본문 텍스트 렌더러 */}
            <div className="py-2.5">
              {renderFormattedContent(viewContent)}
            </div>

            {/* 2. 서브 이미지 본문 중간 삽입 렌더링 */}
            {viewSubImage && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video my-4.5 shadow-xs">
                <img 
                  src={viewSubImage} 
                  alt="본문 중간 삽입 이미지"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[8px] font-bold tracking-wider">
                  본문 삽입 이미지
                </div>
              </div>
            )}

            {/* 하단 태그 정보 */}
            {viewKeywords && (
              <div className="flex flex-wrap gap-1.5 pt-4.5 border-t border-slate-100 font-bold">
                {viewKeywords.split(',').map((k, i) => (
                  <span key={i} className="text-[10px] text-sky-650 hover:underline">
                    #{k.trim()}
                  </span>
                ))}
              </div>
            )}

          </div>

          {/* 네이버 블로그 하단 리액션 바 */}
          <div className="bg-white/90 backdrop-blur-md px-4 py-4 border-t border-slate-100 sticky bottom-0 z-30 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-slate-500 text-[10px] font-extrabold hover:text-red-500 transition-colors">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <span>공감 {selectedPostForPreview?.likes_count || 12}</span>
              </button>
              <button className="flex items-center gap-1.5 text-slate-500 text-[10px] font-extrabold">
                <MessageCircle className="w-4 h-4 text-slate-400" />
                <span>댓글 {Math.floor((selectedPostForPreview?.likes_count || 12) / 3)}</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-400 font-bold">모바일 스킨 프리뷰</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
