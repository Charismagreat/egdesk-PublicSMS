'use client';

import React from 'react';
import { 
  Layers, RefreshCw, Search, CheckCircle, Calendar, 
  Eye, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Heart
} from 'lucide-react';
import { NaverPost } from '../types';

interface TimelineTimelineProps {
  posts: NaverPost[];
  paginatedPosts: NaverPost[];
  selectedPostForPreview: NaverPost | null;
  setSelectedPostForPreview: (p: NaverPost | null) => void;
  blogSearchQuery: string;
  setBlogSearchQuery: (v: string) => void;
  blogItemsPerPage: number;
  setBlogItemsPerPage: (v: number) => void;
  blogCurrentPage: number;
  setBlogCurrentPage: (v: number) => void;
  totalBlogPages: number;
  filteredPosts: NaverPost[];
  fetchPosts: () => Promise<void>;
  handleApproveImmediate: (id: number) => Promise<void>;
  handleDeletePost: (id: number) => Promise<void>;
}

export default function TimelineTimeline({
  posts,
  paginatedPosts,
  selectedPostForPreview,
  setSelectedPostForPreview,
  blogSearchQuery,
  setBlogSearchQuery,
  blogItemsPerPage,
  setBlogItemsPerPage,
  blogCurrentPage,
  setBlogCurrentPage,
  totalBlogPages,
  filteredPosts,
  fetchPosts,
  handleApproveImmediate,
  handleDeletePost
}: TimelineTimelineProps) {

  return (
    <div className="mt-12 p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-sm space-y-6 relative z-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-150 pb-4 gap-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-3xs">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              3단계: 네이버 블로그 예약 및 발행 타임라인 이력 관리
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 font-bold">
              AI 오토파일럿 데몬 또는 관리자가 등록한 블로그 콘텐츠 일체 조회 및 양방향 실시간 라이브 프리뷰 바인딩
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button 
            onClick={fetchPosts}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-all active:scale-95 cursor-pointer shadow-3xs"
            title="새로고침"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* 실시간 필터 및 표시 설정 컨트롤러 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-150/80">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="포스팅 제목, 타겟 키워드, 혹은 대상 상품명으로 실시간 검색..."
            value={blogSearchQuery}
            onChange={(e) => setBlogSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white placeholder-slate-400 font-bold transition-all text-slate-800"
          />
          {blogSearchQuery && (
            <button
              onClick={() => setBlogSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center text-[10px] font-black transition-all"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-500 font-bold">표시 개수:</span>
          <select
            value={blogItemsPerPage}
            onChange={(e) => {
              setBlogItemsPerPage(Number(e.target.value));
              setBlogCurrentPage(1);
            }}
            className="p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white font-bold text-slate-700 cursor-pointer shadow-3xs"
          >
            <option value={5}>5개씩 보기</option>
            <option value={10}>10개씩 보기</option>
            <option value={20}>20개씩 보기</option>
            <option value={50}>50개씩 보기</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/60 shadow-inner">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-extrabold bg-slate-50/70">
              <th className="py-3.5 px-4 rounded-l-xl">대상 상품</th>
              <th className="py-3.5 px-4">블로그 포스팅 제목</th>
              <th className="py-3.5 px-4">타겟 키워드</th>
              <th className="py-3.5 px-4">예약 예정 일시</th>
              <th className="py-3.5 px-4">발행 상태</th>
              <th className="py-3.5 px-4">방문수/공감</th>
              <th className="py-3.5 px-4 text-center rounded-r-xl">액션 및 제어</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-750 bg-white/95">
            {paginatedPosts.map((post) => (
              <tr 
                key={post.id}
                onClick={() => setSelectedPostForPreview(post)}
                className={`hover:bg-slate-50/80 transition-all cursor-pointer ${
                  selectedPostForPreview?.id === post.id ? 'bg-emerald-50/20 font-semibold' : ''
                }`}
              >
                <td className="py-4 px-4">
                  {post.product ? (
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={post.product.main_image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=50&auto=format&fit=crop&q=80'} 
                        alt={post.product.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-100 shrink-0"
                      />
                      <span className="font-extrabold text-slate-800 max-w-[120px] line-clamp-1">
                        {post.product.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-bold">공통 프로모션</span>
                  )}
                </td>
                <td className="py-4 px-4 font-black text-slate-900 max-w-[220px] truncate">
                  {post.title}
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                    {post.target_keywords ? (
                      post.target_keywords.split(',').map((k, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-xl bg-slate-50 border border-slate-150 text-sky-650 text-[9px] font-black shadow-3xs">
                          #{k.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 font-bold">지정 없음</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 font-black text-slate-550">
                  {new Date(post.scheduled_at).toLocaleString('ko-KR', { hour12: false })}
                </td>
                <td className="py-4 px-4">
                  {post.status === 'POSTED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-150 shadow-3xs">
                      <CheckCircle className="w-3.5 h-3.5" /> 즉시 발행 완료
                    </span>
                  )}
                  {post.status === 'SCHEDULED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-250 shadow-3xs animate-pulse">
                      <Calendar className="w-3.5 h-3.5" /> 예약 자동 대기
                    </span>
                  )}
                  {post.status === 'DRAFT' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-slate-50 text-slate-550 border border-slate-200 shadow-3xs">
                      임시 보관 초안
                    </span>
                  )}
                  {post.status === 'FAILED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-650 border border-rose-200 shadow-3xs">
                      발행 실패
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  {post.status === 'POSTED' ? (
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-extrabold">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.views_count}
                      </span>
                      <span className="flex items-center gap-1 text-red-500">
                        <Heart className="w-3.5 h-3.5 fill-red-500/10 text-red-500" />
                        {post.likes_count}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-bold">대기 중</span>
                  )}
                </td>
                <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2">
                    {post.status === 'SCHEDULED' && (
                      <button
                        onClick={() => handleApproveImmediate(post.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-[#03C75A] text-emerald-600 hover:text-white border border-emerald-100 hover:border-[#03C75A] text-[10px] font-black transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-3xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                        발행 승인
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedPostForPreview(post)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-800 border border-slate-200 text-[10px] font-extrabold transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-3xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      미리보기
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-650 border border-slate-200 hover:border-rose-250 transition-all active:scale-95 cursor-pointer shadow-3xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {posts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-slate-400 font-black">
                  타임라인 이력이 비어 있습니다. AI 원고 생성기를 실행하거나 오토파일럿 데몬을 기동하여 첫 예약을 빌드해 보세요! ⏰
                </td>
              </tr>
            )}

            {posts.length > 0 && filteredPosts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-slate-450 font-extrabold bg-slate-50/20">
                  검색 결과와 매칭되는 네이버 블로그 예약 포스팅 내역이 없습니다. 🔍
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 에메랄드 테마의 페이지네이션 네비게이터 */}
      <div className="flex items-center justify-between border-t border-slate-150 pt-5 mt-2">
        <div className="text-[10px] text-slate-450 font-bold">
          {filteredPosts.length === 0 
            ? "전체 0건 표시" 
            : `총 ${filteredPosts.length}개 중 ${(blogCurrentPage - 1) * blogItemsPerPage + 1}-${Math.min(blogCurrentPage * blogItemsPerPage, filteredPosts.length)}개 표시 중`}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setBlogCurrentPage(1)}
            disabled={blogCurrentPage === 1 || totalBlogPages <= 1}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all shadow-3xs cursor-pointer"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setBlogCurrentPage(Math.max(blogCurrentPage - 1, 1))}
            disabled={blogCurrentPage === 1 || totalBlogPages <= 1}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all shadow-3xs cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          {totalBlogPages <= 1 ? (
            <button
              disabled
              className="w-8 h-8 rounded-xl text-xs font-bold transition-all shadow-3xs bg-emerald-500 border border-emerald-500 text-white font-extrabold shadow-sm disabled:opacity-50 cursor-not-allowed"
            >
              1
            </button>
          ) : (
            Array.from({ length: totalBlogPages }, (_, idx) => idx + 1)
              .filter(p => p >= blogCurrentPage - 2 && p <= blogCurrentPage + 2)
              .map(p => (
                <button
                  key={p}
                  onClick={() => setBlogCurrentPage(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer ${
                    blogCurrentPage === p
                      ? 'bg-emerald-500 border border-emerald-500 text-white font-extrabold shadow-sm'
                      : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-650'
                  }`}
                >
                  {p}
                </button>
              ))
          )}

          <button
            onClick={() => setBlogCurrentPage(Math.min(blogCurrentPage + 1, totalBlogPages))}
            disabled={blogCurrentPage === totalBlogPages || totalBlogPages <= 1}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all shadow-3xs cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setBlogCurrentPage(totalBlogPages)}
            disabled={blogCurrentPage === totalBlogPages || totalBlogPages <= 1}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all shadow-3xs cursor-pointer"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
