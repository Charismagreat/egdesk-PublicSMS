import React from "react";
import { Search, Trash2, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { YoutubeIcon, NaverIcon } from "./ShortsHeader";
import { ShortsHistory } from "../types";

interface ShortsHistoryTimelineProps {
  filteredShorts: ShortsHistory[];
  shortsSearchQuery: string;
  setShortsSearchQuery: (query: string) => void;
  shortsItemsPerPage: number;
  setShortsItemsPerPage: (size: number) => void;
  shortsCurrentPage: number;
  setShortsCurrentPage: (page: number) => void;
  paginatedShorts: ShortsHistory[];
  totalPages: number;
  startIndex: number;
  endIndex: number;
  handleDeleteHistory: (id: string) => void;
}

export default function ShortsHistoryTimeline({
  filteredShorts,
  shortsSearchQuery,
  setShortsSearchQuery,
  shortsItemsPerPage,
  setShortsItemsPerPage,
  shortsCurrentPage,
  setShortsCurrentPage,
  paginatedShorts,
  totalPages,
  startIndex,
  endIndex,
  handleDeleteHistory
}: ShortsHistoryTimelineProps) {
  return (
    <div className="mt-12 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
            <YoutubeIcon className="w-5 h-5 text-red-600" />
            <span>쇼츠 예약 발행 및 성과 모니터링 히스토리</span>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full ml-1">
              ⚙️ 시스템 데모용 가상 샘플 데이터
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            제작이 완료된 A안 리소스 다운로드 이력 및 B안 유튜브 자동 예약 업로드의 실시간 성과 통계 데이터입니다.{" "}
            <span className="text-red-500 font-medium">(※ 본 대시보드 리스트의 모든 데이터와 수치는 원활한 시뮬레이션 체험을 위한 가상의 데모용 샘플입니다.)</span>
          </p>
        </div>
        
        <div className="text-xs text-slate-400 font-medium self-end md:self-auto">
          총 <span className="text-red-500 font-bold">{filteredShorts.length}</span>개 비디오 관리 중
        </div>
      </div>

      {/* 실시간 필터 및 검색 컨트롤러 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-150/80 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="쇼츠 비디오 제목, ID, 혹은 생성 모드로 실시간 검색..."
            value={shortsSearchQuery}
            onChange={(e) => setShortsSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white placeholder-slate-400 font-bold transition-all text-slate-800"
          />
          {shortsSearchQuery && (
            <button
              type="button"
              onClick={() => setShortsSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center text-[10px] font-black transition-all border-none cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 히스토리 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-4.5 px-4">비디오 정보</th>
              <th className="py-4.5 px-4">생성 모드 / 빌드 방식</th>
              <th className="py-4.5 px-4">발행 상태</th>
              <th className="py-4.5 px-4">예약 및 업로드 시간</th>
              <th className="py-4.5 px-4 text-center">성과 지표 (조회수 / 하트 / 댓글)</th>
              <th className="py-4.5 px-4 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedShorts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-slate-405 font-bold">
                  검색 결과와 일치하는 쇼츠 예약 발행 내역이 없습니다. 🔍
                </td>
              </tr>
            ) : (
              paginatedShorts.map((history) => (
                <tr key={history.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={history.thumbnail} 
                        alt="썸네일" 
                        className="w-16 aspect-[9/16] object-cover rounded-lg border border-slate-200 shadow-sm"
                      />
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-slate-800 line-clamp-1">{history.title}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">ID: {history.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs font-semibold">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full ${
                        history.sourceType === 'blog' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {history.sourceType === 'blog' ? <NaverIcon className="w-3.5 h-3.5" /> : '📝'}
                        <span>{history.sourceType === 'blog' ? '블로그 요약' : '상품명 입력'}</span>
                      </span>
                      <span className="text-[10px] text-slate-505 font-normal">
                        {history.outputType === 'A' ? '💾 A안 다운로드' : '🚀 B안 오토파일럿'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold ${
                      history.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                      history.status === 'PROCESSING' ? 'bg-blue-50 text-blue-600 animate-pulse' :
                      history.status === 'SCHEDULED' ? 'bg-amber-50 text-amber-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        history.status === 'COMPLETED' ? 'bg-emerald-500' :
                        history.status === 'PROCESSING' ? 'bg-blue-500' :
                        history.status === 'SCHEDULED' ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`} />
                      <span>
                        {history.status === 'COMPLETED' ? '발행완료' :
                         history.status === 'PROCESSING' ? '빌드 및 전송 중' :
                         history.status === 'SCHEDULED' ? '예약대기' :
                         '연동 실패'}
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-xs font-medium text-slate-500">
                    {history.scheduledAt}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-4 text-xs">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-800">{history.views.toLocaleString()}</span>
                        <span className="text-[9px] text-slate-400">조회수</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-rose-500">{history.likes.toLocaleString()}</span>
                        <span className="text-[9px] text-slate-400">좋아요</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-800">{history.comments}</span>
                        <span className="text-[9px] text-slate-400">댓글</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteHistory(history.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border-none bg-transparent"
                      title="내역에서 삭제"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 하단 컨트롤바 */}
      <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 rounded-2xl mt-4 text-slate-705">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">페이지당 표시:</span>
          <select 
            value={shortsItemsPerPage} 
            onChange={e => {
              setShortsItemsPerPage(Number(e.target.value));
              setShortsCurrentPage(1);
            }} 
            className="border rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white font-bold cursor-pointer text-slate-700 focus:border-red-500"
          >
            <option value={10}>10개씩 보기</option>
            <option value={20}>20개씩 보기</option>
            <option value={50}>50개씩 보기</option>
            <option value={100}>100개씩 보기</option>
          </select>
          <span className="text-xs text-slate-400 font-semibold ml-2">
            {filteredShorts.length === 0 
              ? "전체 0개 표시" 
              : `전체 ${filteredShorts.length}개 중 ${startIndex + 1}-${Math.min(endIndex, filteredShorts.length)}개 표시`}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            type="button"
            onClick={() => setShortsCurrentPage(1)}
            disabled={shortsCurrentPage === 1 || totalPages <= 1}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all shadow-3xs cursor-pointer"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => setShortsCurrentPage(Math.max(shortsCurrentPage - 1, 1))}
            disabled={shortsCurrentPage === 1 || totalPages <= 1}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all shadow-3xs cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          {totalPages <= 1 ? (
            <button 
              type="button"
              disabled 
              className="w-8 h-8 rounded-xl text-xs font-bold bg-red-600 border border-red-650 text-white font-extrabold shadow-sm disabled:opacity-50 cursor-not-allowed"
            >
              1
            </button>
          ) : (
            Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter(p => p >= shortsCurrentPage - 2 && p <= shortsCurrentPage + 2)
              .map(p => (
                <button 
                  key={p}
                  type="button"
                  onClick={() => setShortsCurrentPage(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer ${
                    shortsCurrentPage === p 
                      ? 'bg-red-600 border border-red-650 text-white font-extrabold shadow-sm' 
                      : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))
          )}

          <button 
            type="button"
            onClick={() => setShortsCurrentPage(Math.min(shortsCurrentPage + 1, totalPages))}
            disabled={shortsCurrentPage === totalPages || totalPages <= 1}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all shadow-3xs cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => setShortsCurrentPage(totalPages)}
            disabled={shortsCurrentPage === totalPages || totalPages <= 1}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all shadow-3xs cursor-pointer"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
