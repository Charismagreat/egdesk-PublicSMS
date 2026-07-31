"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, X, Calendar, Paperclip, FileText, ExternalLink, 
  ListTodo, CheckSquare, Square, ShieldCheck, Loader2, Sparkles, 
  CheckCircle2, XCircle, Plus 
} from "lucide-react";

interface GovernanceDetailModalProps {
  selectedEvent: any;
  eventDueDate: string;
  setEventDueDate: (val: string) => void;
  handleSaveEventDueDate: () => void;
  handleCloseDetail: () => void;
  selectedActions: string[];
  setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;
  actionReports: { action: string; success: boolean; detail: string }[] | null;
  isExecuting: boolean;
  handleExecuteActions: () => void;
  handleApproveLeave: (id: string) => void;
  handleRejectLeave: (id: string) => void;
  handleApproveCancelRequest: (evt: any) => void;
  handleRejectCancelRequest: (evt: any) => void;
  handleRemoveAction: (e: React.MouseEvent, code: string) => void;
  handleOpenDocumentModal: (title: string, url: string, rawText?: string) => void;
  loadData: () => void;
}

export default function GovernanceDetailModal({
  selectedEvent,
  eventDueDate,
  setEventDueDate,
  handleSaveEventDueDate,
  handleCloseDetail,
  selectedActions,
  setSelectedActions,
  actionReports,
  isExecuting,
  handleExecuteActions,
  handleApproveLeave,
  handleRejectLeave,
  handleApproveCancelRequest,
  handleRejectCancelRequest,
  handleRemoveAction,
  handleOpenDocumentModal,
  loadData,
}: GovernanceDetailModalProps) {
  const [customActionTitle, setCustomActionTitle] = useState("");
  const [customActionDesc, setCustomActionDesc] = useState("");
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [customActions, setCustomActions] = useState<any[]>([]);

  if (!selectedEvent) return null;

  const defaultActionsList = selectedEvent.data?.suggested_actions || [
    { code: "NOTIFY_USER", label: "관리자 / 담당자 알림 발송", description: "관제 이벤트를 담당 관리자에게 즉시 알림" },
    { code: "LOG_AUDIT", label: "감사 로그 보존", description: "본 사건 처리 이력을 전사 거버넌스 원장에 기록" },
  ];

  const actionsList = [...defaultActionsList, ...customActions];

  const handleAddCustomAction = () => {
    if (!customActionTitle.trim()) {
      alert("추가할 자율 대행 작업 제목을 입력해 주세요.");
      return;
    }
    const newCode = `CUSTOM_${Date.now()}`;
    const newAction = {
      code: newCode,
      label: customActionTitle.trim(),
      description: customActionDesc.trim() || "최고관리자가 추가한 수동 조치 시나리오",
    };
    setCustomActions((prev) => [...prev, newAction]);
    setSelectedActions((prev) => [...prev, newCode]);
    setCustomActionTitle("");
    setCustomActionDesc("");
    setIsAddingAction(false);
  };

  const displayTitle = (selectedEvent.title || '')
    .replace(/^AI 결재 보류:\s*/g, '')
    .replace(/^AI 결재 보류\s*/g, '')
    .trim();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 animate-scale-in text-left">
        
        {/* 모달 헤더 */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5.5 h-5.5 text-rose-500 animate-pulse shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800">AI 관제 원장</h3>
                <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {selectedEvent.type}
                </span>
              </div>
              <p className="text-sm font-black text-indigo-950 mt-1">
                {displayTitle}
              </p>
            </div>
          </div>
          <button 
            onClick={handleCloseDetail}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 이벤트 속성 상세 컴팩트 명세 보드 */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">이벤트 데이터 명세</h4>
            <span className="text-[10px] font-mono font-bold bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-md">
              ID: {selectedEvent.id}
            </span>
          </div>

          {/* 슬림 컴팩트 4컬럼 메타 그리드 */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 font-medium block text-[10px]">발생 유형</span>
              <span className="font-bold text-slate-800 shrink-0">{selectedEvent.type}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[10px]">요청 종류</span>
              <span className="font-extrabold text-indigo-600 truncate block">
                {selectedEvent.data?.doc_type === 'mobile_request' || selectedEvent.data?.doc_type === 'mobile_req' ? '모바일 현장 상신' : (selectedEvent.data?.doc_type || '관제 요청')}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <span className="text-slate-400 font-medium block text-[10px]">요청 식별 번호</span>
              <span className="font-mono font-bold text-slate-700 truncate block">{selectedEvent.data?.doc_id || selectedEvent.id}</span>
            </div>
          </div>

          {/* 비즈니스 별 세부 명세 영역 */}
          {selectedEvent.type === 'STORE_ORDER' && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">주문 고객</span>
                <span className="font-bold text-slate-800">{selectedEvent.data.customer_name} ({selectedEvent.data.customer_phone})</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">주문 품목</span>
                <span className="font-bold text-slate-800">{selectedEvent.data.product_name} ({selectedEvent.data.quantity}개)</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">결제 금액</span>
                <span className="font-bold text-slate-800">{Number(selectedEvent.data.total_price || 0).toLocaleString()}원</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">배송지 주소</span>
                <span className="font-bold text-slate-800 truncate block">{selectedEvent.data.shipping_address || '직접 수령'}</span>
              </div>
              {selectedEvent.data.customer_memo && (
                <div className="col-span-2 border-t border-slate-100 pt-1.5 mt-0.5">
                  <span className="text-slate-400 font-medium block text-[10px]">고객 메모</span>
                  <span className="font-medium text-slate-700 whitespace-pre-wrap">{selectedEvent.data.customer_memo}</span>
                </div>
              )}
            </div>
          )}

          {selectedEvent.type === 'RAG_HOLD' && (
            <div className="space-y-2">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-slate-400 font-medium block text-[10px]">현장 요청 사항 (음성 변환)</span>
                <span className="font-semibold text-indigo-950 text-xs block leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.data.reason}
                </span>
              </div>

              {/* 📎 [상신 첨부 파일 / 서류 미리보기 & 열기 리스트] */}
              {((selectedEvent.data.attachments && selectedEvent.data.attachments.length > 0) || selectedEvent.data.file_url) && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 space-y-1.5">
                  <span className="text-[10px] font-black text-indigo-700 flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-indigo-600" />
                    <span>상신 첨부 서류 ({selectedEvent.data.attachments?.length || 1}건)</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvent.data.attachments && selectedEvent.data.attachments.length > 0 ? (
                      selectedEvent.data.attachments.map((att: any, attIdx: number) => (
                        <a
                          key={attIdx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-indigo-200/80 transition-all cursor-pointer text-decoration-none"
                        >
                          <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="truncate max-w-[180px]">{att.name}</span>
                          <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                        </a>
                      ))
                    ) : (
                      <a
                        href={selectedEvent.data.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-indigo-200/80 transition-all cursor-pointer text-decoration-none"
                      >
                        <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="truncate max-w-[200px]">{selectedEvent.data.matched_filename || '첨부서류 열기'}</span>
                        <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {(selectedEvent.type === 'TASK_CANCEL_REQUEST' || selectedEvent.data?.has_cancel_request) && (
            <div className="bg-white p-2.5 rounded-xl border border-rose-200/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">상신 취소 요청자</span>
                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                  👤 {selectedEvent.data?.cancel_request_operator || selectedEvent.data?.operator || '임직원'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">대상 업무 ID</span>
                <span className="font-mono font-bold text-slate-800">{selectedEvent.data?.doc_id || selectedEvent.data?.id || '-'}</span>
              </div>
              <div className="col-span-2 border-t border-rose-100 pt-1.5 mt-0.5">
                <span className="text-slate-400 font-medium block text-[10px]">취소 신청 사유</span>
                <span className="font-semibold text-rose-950 text-xs block leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.data?.cancel_log?.note || selectedEvent.data?.reason || '직원 취소 요청 건입니다.'}
                </span>
              </div>
            </div>
          )}
          {selectedEvent.type === 'LOW_STOCK' && (
            <div className="bg-white p-2.5 rounded-xl border border-rose-200/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">상품 코드</span>
                <span className="font-mono font-bold text-slate-800">{selectedEvent.data.barcode || `INV-${selectedEvent.data.id}`}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">상품 명</span>
                <span className="font-bold text-slate-855">{selectedEvent.data.name || selectedEvent.data.itemName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">현재고 / 안전재고 한도</span>
                <span className="font-bold text-rose-600">{selectedEvent.data.quantity}개 / {selectedEvent.data.safety_stock || selectedEvent.data.safetyStock}개</span>
              </div>
            </div>
          )}

          {selectedEvent.type === 'LEAVE_APPROVAL_REQUEST' && (
            <div className="bg-white p-2.5 rounded-xl border border-indigo-200/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">연차/휴가 신청자</span>
                <span className="font-bold text-slate-800">{selectedEvent.data.employee_name || '임직원'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">휴가 종류 (소요 일수)</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg text-xs w-fit inline-block">
                  {selectedEvent.data.leave_type_str} ({selectedEvent.data.days_spent}일)
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">휴가 희망 기간</span>
                <span className="font-bold text-slate-800">
                  {selectedEvent.data.leave_type === 'HALF_AM'
                    ? `${selectedEvent.data.start_date} 오전`
                    : selectedEvent.data.leave_type === 'HALF_PM'
                    ? `${selectedEvent.data.start_date} 오후`
                    : `${selectedEvent.data.start_date} ~ ${selectedEvent.data.end_date}`}
                </span>
              </div>
              <div className="col-span-2 border-t border-slate-100 pt-1.5 mt-0.5">
                <span className="text-slate-400 font-medium block text-[10px]">휴가 신청 상세 사유</span>
                <span className="font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl block leading-relaxed border border-slate-150 whitespace-pre-wrap">
                  {selectedEvent.data.reason || '사유가 기재되지 않았습니다.'}
                </span>
              </div>
            </div>
          )}
        </div>

          {/* 📅 관제 대상 건 처리 일시 (완료 마감일 due_date) 지정 및 변경 컨트롤 바 */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50 border border-indigo-150 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-indigo-900 font-extrabold text-xs">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>📅 관제 대상 처리 일시 (완료 마감일 due_date) 지정/변경</span>
              </div>
              <span className="text-[10px] text-indigo-600 bg-indigo-100/80 font-bold px-2 py-0.5 rounded-md">
                모바일 포털 주/월 연동
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={eventDueDate}
                onChange={(e) => setEventDueDate(e.target.value)}
                className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 outline-none focus:border-indigo-500 flex-1 shadow-2xs"
              />
              <button
                type="button"
                onClick={handleSaveEventDueDate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95 flex items-center gap-1"
              >
                <span>처리 일시 저장</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI 추천 자율 대행 액션 리스트 및 최고관리자 항목 추가/제거 */}
        {!actionReports && selectedEvent.type !== 'LEAVE_APPROVAL_REQUEST' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 text-indigo-650" />
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">AI 권장 자율 대행 조치 시나리오</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingAction((prev) => !prev)}
                  className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-indigo-200 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>+ 추천 작업 추가</span>
                </button>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded-md border border-indigo-100 hidden sm:inline-block">
                  선택/제거/추가 가능
                </span>
              </div>
            </div>

            {/* 최고관리자 커스텀 추천 작업 인라인 작성 폼 */}
            {isAddingAction && (
              <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-3.5 space-y-2.5 animate-fade-in">
                <span className="text-xs font-black text-indigo-900 block">✨ 최고관리자 전용 추천 작업 항목 추가</span>
                <input
                  type="text"
                  value={customActionTitle}
                  onChange={(e) => setCustomActionTitle(e.target.value)}
                  placeholder="예: 협력업체 긴급 실사 및 비상 연락망 가동"
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={customActionDesc}
                  onChange={(e) => setCustomActionDesc(e.target.value)}
                  placeholder="작업 설명 (선택 사항: 담당자 지정 또는 세부 안내)"
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingAction(false)}
                    className="px-3 py-1 text-slate-500 hover:bg-slate-200/60 rounded-lg text-xs font-bold transition-all border-none bg-transparent cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomAction}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs"
                  >
                    목록에 추가
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {actionsList.map((act: any) => {
                const isSelected = selectedActions.includes(act.code);
                const isCustom = act.code.startsWith("CUSTOM_");

                return (
                  <div
                    key={act.code}
                    onClick={() => {
                      setSelectedActions((prev) =>
                        isSelected ? prev.filter((c) => c !== act.code) : [...prev, act.code]
                      );
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-indigo-50/60 border-indigo-300 shadow-2xs"
                        : "bg-slate-50/50 border-slate-200/60 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button type="button" className="text-indigo-600 border-none bg-transparent cursor-pointer p-0">
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold block ${isSelected ? "text-indigo-950 font-black" : "text-slate-800"}`}>
                            {act.label}
                          </span>
                          {isCustom && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-black shrink-0">
                              직접 추가됨
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium leading-relaxed block">{act.description}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveAction(e, act.code)}
                      className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer shrink-0"
                      title="해당 작업 항목 제거/해제"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 작업 수행 결과 리포트 출력 */}
        {actionReports && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">AI 자율 대행 수행 보고서</h4>
            </div>
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white overflow-hidden text-left">
              {actionReports.map((rep, idx) => (
                <div key={idx} className="p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${rep.success ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                    <span className="text-xs font-black text-slate-850 uppercase">{rep.action}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${rep.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {rep.success ? "성공" : "실패"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-650 font-semibold pl-4 leading-relaxed">{rep.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 모달 푸터 버튼 */}
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
          <button
            onClick={handleCloseDetail}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 rounded-xl border border-slate-200 shadow-xs text-xs transition-colors cursor-pointer"
          >
            {actionReports ? "닫기 및 리프레시" : "검토 보류"}
          </button>
          
          {!actionReports && (selectedEvent.type === 'TASK_CANCEL_REQUEST' || selectedEvent.data?.has_cancel_request) ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleRejectCancelRequest(selectedEvent)}
                disabled={isExecuting}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-5 py-3 rounded-xl shadow-xs text-xs border border-rose-200 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>취소 기각 (상신 유지)</span>
              </button>
              <button
                onClick={() => handleApproveCancelRequest(selectedEvent)}
                disabled={isExecuting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>취소 승인 및 데이터 삭제 ⚡</span>
              </button>
            </div>
          ) : !actionReports && selectedEvent.type === 'LEAVE_APPROVAL_REQUEST' ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleRejectLeave(selectedEvent.data.id)}
                disabled={isExecuting}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-6 py-3 rounded-xl shadow-xs text-xs border border-rose-200 cursor-pointer transition-all"
              >
                기각 및 반려
              </button>
              <button
                onClick={() => handleApproveLeave(selectedEvent.data.id)}
                disabled={isExecuting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>최종 결재 승인</span>
              </button>
            </div>
          ) : !actionReports ? (
            <button
              onClick={handleExecuteActions}
              disabled={isExecuting || selectedActions.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer flex items-center gap-2 transition-all"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI 자율 대행 처리 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>선택한 자율 작업 실행 ⚡</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                handleCloseDetail();
                loadData();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>최종 관제 완료 및 리스트업 갱신</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
