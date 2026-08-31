"use client";

import React from "react";
import { 
  SlidersHorizontal, Search, RotateCcw, AlertTriangle, 
  ShoppingBag, Trash2, Calendar, User, Clock, ChevronRight, 
  Paperclip, ExternalLink, FileText, CheckCircle2, ShieldAlert
} from "lucide-react";

interface GovernanceEventsTabProps {
  subTab: 'ALL' | 'WAITING' | 'SCHEDULED' | 'RESOLVED' | 'AUDIT';
  setSubTab: (tab: 'ALL' | 'WAITING' | 'SCHEDULED' | 'RESOLVED' | 'AUDIT') => void;
  filteredFeed: any[];
  allFeedCount: number;
  waitingCount: number;
  scheduledCount: number;
  resolvedCount: number;
  auditLogsCount: number;
  filterOperator: string;
  setFilterOperator: (val: string) => void;
  filterDomain: string;
  setFilterDomain: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  resetFilters: () => void;
  unassignedFilesCount: number;
  handleQuickAssignCustomsDoc: () => void;
  handleOpenDetail: (evt: any) => void;
  handleOpenDocumentModal: (title: string, url: string, rawText?: string) => void;
}

export default function GovernanceEventsTab({
  subTab,
  setSubTab,
  filteredFeed,
  allFeedCount,
  waitingCount,
  scheduledCount,
  resolvedCount,
  auditLogsCount,
  filterOperator,
  setFilterOperator,
  filterDomain,
  setFilterDomain,
  searchQuery,
  setSearchQuery,
  resetFilters,
  unassignedFilesCount,
  handleQuickAssignCustomsDoc,
  handleOpenDetail,
  handleOpenDocumentModal,
}: GovernanceEventsTabProps) {
  return (
    <div className="space-y-4">
      {/* 2차 서브 탭 및 복합 필터 바 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-3 md:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* 서브 탭 (피드 분류) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none shrink-0">
          <button
            onClick={() => setSubTab('ALL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100/80 hover:bg-slate-200/60 text-slate-600'
            }`}
          >
            <span>전체 피드</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${subTab === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {allFeedCount}
            </span>
          </button>

          <button
            onClick={() => setSubTab('WAITING')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'WAITING'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100/80 text-rose-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>관제 대상</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${subTab === 'WAITING' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'}`}>
              {waitingCount}
            </span>
          </button>

          <button
            onClick={() => setSubTab('SCHEDULED')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'SCHEDULED'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 hover:bg-purple-100/80 text-purple-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-purple-500" />
            <span>관제 예정</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${subTab === 'SCHEDULED' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'}`}>
              {scheduledCount}
            </span>
          </button>

          <button
            onClick={() => setSubTab('RESOLVED')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>관제 완료</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${subTab === 'RESOLVED' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {resolvedCount}
            </span>
          </button>

          <button
            onClick={() => setSubTab('AUDIT')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'AUDIT'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700'
            }`}
          >
            <span>변경 감사록</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${subTab === 'AUDIT' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
              {auditLogsCount}
            </span>
          </button>
        </div>

        {/* 상세 조건 드롭다운 및 검색 필터 */}
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl justify-end">
          {/* 조작 주체 드롭다운 */}
          <select
            value={filterOperator}
            onChange={(e) => setFilterOperator(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="ALL">👤 모든 조작자 (전체)</option>
            <option value="AI">🤖 AI 시스템 자율 조치</option>
            <option value="ADMIN">👑 최고 관리자 (SUPER_ADMIN)</option>
            <option value="USER">👥 일반 임직원 / 현장 작업자</option>
          </select>

          {/* 도메인 분야 드롭다운 */}
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="ALL">📂 전사 관제 영역 (전체)</option>
            <option value="RAG_HOLD">🛡️ RAG AI 결재 보류</option>
            <option value="STORE_ORDER">🛒 온라인 스토어 주문</option>
            <option value="LOW_STOCK">⚠️ 재고 안전수량 경보</option>
            <option value="LEAVE">🌴 휴가/연차 결재 신청</option>
          </select>

          {/* 키워드 검색창 */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="조작자, 사건 내용, 문서 ID 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500"
            />
          </div>

          {/* 필터 초기화 버튼 */}
          {(filterOperator !== 'ALL' || filterDomain !== 'ALL' || searchQuery.trim() !== '') && (
            <button
              onClick={resetFilters}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer border-none shrink-0"
              title="필터 조건 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 📄 미배정 수입 통관 실물 서류 신속 등록 배너 */}
      {unassignedFilesCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-900">📄 미배정 수입통관 실물 서류 포착</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black animate-pulse">
                  {unassignedFilesCount}건 대기 중
                </span>
              </div>
              <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                현장 직원이 모바일로 촬영하여 업로드한 수입 통관 서류 및 무역 서류가 신규 등록을 기다리고 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={handleQuickAssignCustomsDoc}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <span>원터치 수입 통관 대장 등록 및 관제 배정 ⚡</span>
          </button>
        </div>
      )}

      {/* 이벤트 피드 리스트 */}
      {filteredFeed.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-3 shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-600">선택한 조건의 관제 피드 내역이 없습니다.</h3>
          <p className="text-xs text-slate-400">새로운 실시간 비즈니스 이벤트가 발생하면 이곳에 즉시 수집됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeed.map((item) => {
            if (item.feedType === 'EVENT') {
              const evt = item.data;
              const isCancelEvent = 
                evt.type === 'TASK_CANCEL_REQUEST' || 
                evt.data?.has_cancel_request === true ||
                evt.data?.doc_type === 'TASK_CANCEL_REQUEST' ||
                (evt.subtitle && evt.subtitle.includes('취소 요청'));

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(evt)}
                  className={`bg-white border transition-all rounded-3xl p-4 md:p-5 shadow-2xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 text-left group cursor-pointer active:scale-[0.995] ${
                    evt.status === 'RESOLVED' 
                      ? 'border-slate-200/60 bg-slate-50/40 opacity-75' 
                      : isCancelEvent
                        ? 'border-rose-300/80 bg-rose-50/20 hover:border-rose-400'
                        : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {/* 이벤트 헤더 정보 */}
                  <div className="flex items-start md:items-center gap-3.5 min-w-0">
                    <div className={`p-2.5 rounded-2xl shrink-0 ${
                      evt.type === 'STORE_ORDER' 
                        ? 'bg-blue-50 text-blue-600' 
                        : isCancelEvent
                          ? 'bg-rose-100 text-rose-700'
                          : evt.type === 'RAG_HOLD' 
                            ? 'bg-rose-50 text-rose-600' 
                            : 'bg-amber-50 text-amber-600'
                    }`}>
                      {evt.type === 'STORE_ORDER' && <ShoppingBag className="w-5.5 h-5.5" />}
                      {isCancelEvent && <Trash2 className="w-5.5 h-5.5" />}
                      {!isCancelEvent && evt.type === 'RAG_HOLD' && <ShieldAlert className="w-5.5 h-5.5" />}
                      {!isCancelEvent && evt.type === 'LOW_STOCK' && <AlertTriangle className="w-5.5 h-5.5" />}
                      {!isCancelEvent && evt.type === 'LEAVE_APPROVAL_REQUEST' && <Calendar className="w-5.5 h-5.5" />}
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3.5 min-w-0 text-left">
                      <div className="flex items-center flex-wrap gap-2 shrink-0">
                        <span className="text-sm font-black text-slate-800">{(evt.title || '').replace(/^AI 결재 보류:\s*/g, '').trim()}</span>
                        {evt.data?.doc_type?.includes('folder_file_task') && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center gap-1">
                            <span>📁 태스크 폴더 추출</span>
                            {evt.data?.doc_type === 'folder_file_task_auto' ? (
                              <span className="text-emerald-600 font-extrabold">⚡ AI자율대행</span>
                            ) : (
                              <span className="text-indigo-600 font-extrabold">👤 담당자할일</span>
                            )}
                          </span>
                        )}
                        {isCancelEvent ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            🚨 취소 요청됨
                          </span>
                        ) : (
                          evt.type !== 'RAG_HOLD' && !evt.data?.doc_type?.includes('folder_file_task') && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              evt.type === 'STORE_ORDER' 
                                ? 'bg-blue-50 text-blue-700' 
                                : evt.type === 'LEAVE_APPROVAL_REQUEST'
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-amber-50 text-amber-700'
                            }`}>
                              {evt.type === 'STORE_ORDER' ? '스토어 주문' : evt.type === 'LEAVE_APPROVAL_REQUEST' ? '휴가/연차 결재' : '재고 부족 경보'}
                            </span>
                          )
                        )}
                      </div>
                      <span className="hidden md:inline text-slate-300 font-light">|</span>
                      <p className="text-xs text-slate-500 font-semibold truncate max-w-[420px]">{evt.subtitle}</p>
                    </div>
                  </div>

                  {/* 작성자, 일시 & 조치 버튼 */}
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] text-slate-400 shrink-0 self-start md:self-auto pl-12 md:pl-0 md:mr-4">
                    {(() => {
                      const operator = 
                        evt.data?.operator || 
                        evt.data?.created_by || 
                        evt.data?.customer_name || 
                        (evt.type === 'STORE_ORDER' ? '온라인 고객' : '시스템');
                      return (
                        <span className="flex items-center gap-1 bg-slate-100/70 px-2 py-1 rounded-lg text-slate-600 font-bold">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>상신자: {operator}</span>
                        </span>
                      );
                    })()}
                    <span className="flex items-center gap-1 bg-slate-100/70 px-2 py-1 rounded-lg text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>상신: {evt.created_at}</span>
                    </span>

                    {/* 📅 관제 대상 처리 일시 (마감일 due_date) 스케줄 뱃지 시각화 */}
                    {evt.due_date && (
                      <span className="flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-1 rounded-lg font-black shrink-0">
                        <Calendar className="w-3 h-3 text-purple-600" />
                        <span>{evt.due_date}</span>
                      </span>
                    )}

                    {/* 🟢 관제 완료 건 처리 완료 일시 (resolved_at) 시각화 */}
                    {evt.status === 'RESOLVED' && (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-1 rounded-lg font-black shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>완료: {evt.resolved_at || evt.created_at}</span>
                      </span>
                    )}

                    {/* 📎 [상신 첨부 서류 퀵버튼 - 실물 파일 다이렉트 새탭 열람] */}
                    {((evt.data?.attachments && evt.data.attachments.length > 0) || evt.data?.file_url) && (() => {
                      const firstAtt = evt.data?.attachments?.[0];
                      const url = firstAtt?.url || evt.data?.file_url;
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-2 py-1 rounded-lg font-black transition-all cursor-pointer shrink-0 text-decoration-none"
                          title="상신 첨부 실물 서류 새 탭 열람"
                        >
                          <Paperclip className="w-3 h-3 text-indigo-600" />
                          <span>서류 열람</span>
                          <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                        </a>
                      );
                    })()}

                    <button
                      onClick={() => handleOpenDetail(evt)}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ml-auto md:ml-0"
                    >
                      <span>검토 및 조치</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            }

            // 감사 로그 항목
            const log = item.data;
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200/70 rounded-3xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">{log.action_name || log.title}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                        {log.operator || log.created_by}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{log.details || log.subtitle}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0 pl-5 md:pl-0">{log.created_at}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
