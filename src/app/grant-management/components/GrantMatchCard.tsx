import React, { useState, useEffect } from "react";
import { GrantAnnouncement } from "../types";
import { Award, Bookmark, BookmarkCheck, FileText, Sparkles, AlertCircle } from "lucide-react";

interface GrantMatchCardProps {
  announcements: GrantAnnouncement[];
  onToggleBookmark: (id: string) => Promise<void>;
  onGenerateRndPlan: (id: string) => Promise<void>;
  selectedAnnId: string | null;
  isGenerating: boolean;
  // 스케줄 및 즉시 실행 Props
  syncInterval: number;
  lastSyncTime: string;
  onSaveSchedule: (interval: number) => Promise<void>;
  onSearchGrants: () => Promise<void>;
  isSyncing: boolean;
}

/**
 * 정부 지원 사업 공고 리스트 및 기업 매칭 스코어보드 카드 (프로필 카드 우측 이동 반영)
 */
export default function GrantMatchCard({
  announcements,
  onToggleBookmark,
  onGenerateRndPlan,
  selectedAnnId,
  isGenerating,
  syncInterval,
  lastSyncTime,
  onSaveSchedule,
  onSearchGrants,
  isSyncing,
}: GrantMatchCardProps) {
  const [expandedAnnId, setExpandedAnnId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 페이지당 공고 노출 개수

  const toggleExpand = (id: string) => {
    setExpandedAnnId(expandedAnnId === id ? null : id);
  };

  // 검색어가 바뀌면 페이지를 1페이지로 자동 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // 검색 필터링 (제목, 지원기관, 공고번호 기준)
  const filtered = announcements.filter((ann) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      ann.title.toLowerCase().includes(query) ||
      ann.agency.toLowerCase().includes(query) ||
      ann.id.toLowerCase().includes(query)
    );
  });

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  // 전체 필터링 리스트 기준 내림차순 일련번호(globalNo) 동적 주입
  const filteredWithNo = filtered.map((ann, idx) => ({
    ...ann,
    globalNo: totalCount - idx,
  }));

  // 현재 페이지에 보여줄 데이터 슬라이싱
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAnnouncements = filteredWithNo.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs text-left space-y-6">
      
      {/* 1. 정기 수집 스케줄 설정 UI */}
      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-750">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>정기 수집 스케줄러 설정</span>
          </div>
          <p className="text-[9px] text-slate-450 font-bold">
            지정된 주기에 따라 백그라운드 크롤러가 최신 공고 데이터를 자동 수집 및 적재합니다.
          </p>
          <span className="block text-[8.5px] font-bold text-slate-550 font-mono">
            최근 정보 수집 실행 일시: <b className="text-indigo-600 font-black">{lastSyncTime ? lastSyncTime : "수집 이력 없음"}</b>
          </span>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-black text-slate-500">수집 주기:</span>
          <select
            value={syncInterval}
            onChange={(e) => onSaveSchedule(Number(e.target.value))}
            className="text-[10px] font-black text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value={12}>12시간마다 (권장)</option>
            <option value={24}>24시간마다 (하루 1회)</option>
            <option value={48}>48시간마다 (이틀 1회)</option>
          </select>
        </div>
      </div>

      {/* 2. 공고 목록 대장 */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Award className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">실시간 정부 지원금 공고 매칭 보드</h4>
              <p className="text-[9px] text-slate-450 font-bold flex flex-wrap items-center gap-x-2">
                <span>인공지능이 자사 프로필을 분석하여 실시간 적합 자격을 대조합니다.</span>
                <span className="text-indigo-600 font-black">
                  [최근 수집: {lastSyncTime ? lastSyncTime : "이력 없음 (우측 즉시 실행을 누르세요)"}]
                </span>
                {isSyncing && (
                  <span className="text-indigo-650 font-black flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded animate-pulse">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
                    백그라운드 동기화 중...
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <span className="text-[10px] font-black text-slate-400 font-mono">
              검색 결과: <b className="text-slate-700">{totalCount}</b> / 전체 <b className="text-slate-500">{announcements.length}</b>건
            </span>
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSearchGrants}
              className={`px-2.5 py-1.5 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all shadow-2xs ${
                isSyncing
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 hover:scale-102 active:scale-98 cursor-pointer"
              }`}
            >
              <Sparkles className={`w-3 h-3 ${isSyncing ? "animate-spin" : "animate-bounce"}`} style={isSyncing ? { animationDuration: '3s' } : undefined} />
              <span>{isSyncing ? "동기화 진행 중..." : "즉시 실행 (동기화)"}</span>
            </button>
          </div>
        </div>

        {/* 2-1. 검색창 UI */}
        <div className="relative">
          <input
            type="text"
            placeholder="공고 제목, 지원 기관 또는 공고 번호로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-slate-700 bg-slate-50/50"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-650 text-[10px] font-black transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* 2-2. 리스트 본문 */}
        <div className="space-y-3">
          {paginatedAnnouncements.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-black text-xs border border-dashed border-slate-200 rounded-2xl">
              검색 조건에 일치하는 정부 지원금 공고가 존재하지 않습니다.
            </div>
          ) : (
            paginatedAnnouncements.map((ann) => {
              const isExpanded = expandedAnnId === ann.id;
              const isSelected = selectedAnnId === ann.id;
              
              // 점수 색상 배정
              const scoreColor =
                ann.matchScore >= 90
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : ann.matchScore >= 80
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-slate-50 text-slate-500 border-slate-200";

              return (
                <div
                  key={ann.id}
                  className={`border rounded-2xl transition-all ${
                    isExpanded ? "border-indigo-600 bg-indigo-50/5" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* 상단 기본 헤더 */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 내림차순 일련번호 표시 */}
                        <span className="text-[8.5px] font-black text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded font-mono">
                          No. {ann.globalNo}
                        </span>
                        <span className="text-[8.5px] font-black text-slate-300 font-mono">|</span>
                        <span className="text-[8.5px] font-black text-slate-400 font-mono">{ann.id}</span>
                        <span className="text-[8.5px] font-black text-slate-400 font-mono">|</span>
                        <span className="text-[8.5px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {ann.agency}
                        </span>
                        <span className="text-[8.5px] font-bold text-slate-550 border border-slate-200 px-1.5 py-0.5 rounded">
                          {ann.category === "RND" ? "기술 R&D" : ann.category === "GRANT" ? "무상 보조금" : "정책 융자"}
                        </span>
                      </div>
                      
                      <h5 
                        onClick={() => toggleExpand(ann.id)}
                        className="text-xs font-black text-slate-800 cursor-pointer hover:text-indigo-605 transition-colors"
                      >
                        {ann.title}
                      </h5>

                      <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400">
                        <span>규모: <b className="text-slate-700">{ann.budget}</b></span>
                        <span>마감: <b className="text-slate-700">{ann.deadline}</b></span>
                      </div>
                    </div>

                    {/* 스코어 및 액션 버튼들 */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`border rounded-xl px-3 py-1.5 text-center ${scoreColor}`}>
                        <span className="block text-[7.5px] font-black uppercase tracking-wider">AI 적합도</span>
                        <span className="text-xs font-black font-mono">{ann.matchScore}%</span>
                      </div>

                      {/* 관심 등록 (북마크) */}
                      <button
                        type="button"
                        onClick={() => onToggleBookmark(ann.id)}
                        className={`p-2 rounded-xl border transition-colors ${
                          ann.isBookmarked
                            ? "bg-amber-50 border-amber-200 text-amber-500"
                            : "bg-white border-slate-250 text-slate-400 hover:text-slate-650"
                        }`}
                      >
                        {ann.isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4 fill-amber-500" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>

                      {/* AI 작성 or 링크 전환 */}
                      {ann.category === "RND" ? (
                        <button
                          type="button"
                          disabled={isGenerating && !isSelected}
                          onClick={() => onGenerateRndPlan(ann.id)}
                          className={`px-3 py-2 text-white font-extrabold text-[9.5px] rounded-xl shadow-2xs transition-all flex items-center gap-1.5 ${
                            isSelected && isGenerating
                              ? "bg-slate-400 cursor-not-allowed"
                              : "bg-indigo-600 hover:bg-indigo-700 animate-pulse"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isSelected && isGenerating ? "AI 빌딩 중..." : "AI 계획서 빌드"}
                        </button>
                      ) : (
                        <a
                          href={
                            ann.id.startsWith("GR-PBLN_")
                              ? `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${ann.id.replace("GR-", "")}`
                              : "https://www.bizinfo.go.kr"
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 border border-slate-250 hover:bg-slate-50 text-slate-650 font-bold text-[9.5px] rounded-xl flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-450" />
                          상세 공고
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 아코디언 확장 영역 (AI 조언 리포트) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl text-left space-y-2.5">
                      <div className="flex items-center gap-1 text-[8.5px] text-slate-450 font-black">
                        <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                        <span>AI 매칭 진단 & 보완 제언 리포트</span>
                      </div>
                      <ul className="space-y-1.5 text-[9px] font-bold text-slate-600 pl-1">
                        {ann.matchGuide.map((guide, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {guide}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 2-3. 페이지네이션 컨트롤 UI */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-4 border-t border-slate-150">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              이전
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // 현재 페이지 근처 번호 및 양 끝만 노출 (슬라이딩 윈도우)
              const isNear = Math.abs(page - currentPage) <= 1;
              const isEnds = page === 1 || page === totalPages;
              
              if (!isNear && !isEnds) {
                if (page === 2 || page === totalPages - 1) {
                  return <span key={`dots-${page}`} className="text-slate-400 text-xs px-1 select-none">...</span>;
                }
                return null;
              }
              
              const isActive = currentPage === page;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={`w-7.5 h-7.5 rounded-lg text-xs font-black transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "border border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              다음
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
