"use client";

import { apiFetch } from "@/lib/api";
import React, { useState, useEffect, useCallback } from "react";
import { 
  ShieldAlert, Activity, CheckCircle2, AlertTriangle, 
  RotateCcw, RefreshCw, Trash2, ArrowRightLeft, ShieldCheck, 
  Sparkles, User, Clock, ToggleLeft, ToggleRight, ListTodo,
  ExternalLink, FileText, ChevronRight, X, Loader2, CheckSquare, Square
} from "lucide-react";

interface ControlEvent {
  id: string;
  type: 'STORE_ORDER' | 'RAG_HOLD' | 'LOW_STOCK';
  title: string;
  subtitle: string;
  status: 'WAITING' | 'RESOLVED';
  created_at: string;
  data: any;
}

interface DeletedItem {
  id: string;
  doc_type: 'estimate' | 'purchase_order' | 'sales_order';
  customer_name?: string;
  partner_name?: string;
  total_amount?: number;
  deleted_at: string;
  deleted_by: string;
}

interface ActionRecommendation {
  code: string;
  label: string;
  description: string;
}

export default function GovernanceDashboard() {
  const [events, setEvents] = useState<ControlEvent[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [ocrEnabled, setOcrEnabled] = useState<boolean>(true);
  
  const [activeTab, setActiveTab] = useState<'WAITING' | 'RESOLVED' | 'RESTORE'>('WAITING');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 모달 제어 상태
  const [selectedEvent, setSelectedEvent] = useState<ControlEvent | null>(null);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [actionReports, setActionReports] = useState<{ action: string; success: boolean; detail: string }[] | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // 1. 전체 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1.1. 토글 상태 조회
      const toggleRes = await apiFetch("/api/governance?action=get_toggle");
      const toggleData = await toggleRes.json();
      if (toggleData.success) {
        setOcrEnabled(toggleData.enabled);
      }

      // 1.2. 통합 관제 피드 조회
      const eventsRes = await apiFetch("/api/governance?action=events");
      const eventsData = await eventsRes.json();
      if (eventsData.success) {
        setEvents(eventsData.events || []);
      }

      // 1.3. 소프트 삭제 건 조회
      const deletedRes = await apiFetch("/api/governance?action=deleted_items");
      const deletedData = await deletedRes.json();
      if (deletedData.success) {
        setDeletedItems(deletedData.deletedItems || []);
      }
    } catch (err: any) {
      console.error("Governance data fetch error:", err);
      setError("데이터를 로드하는 중 에러가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. OCR 자율 대행 토글 변경
  const handleToggleOcr = async () => {
    setIsProcessing(true);
    const nextVal = !ocrEnabled;
    try {
      const res = await apiFetch("/api/governance?action=set_toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextVal })
      });
      const data = await res.json();
      if (data.success) {
        setOcrEnabled(nextVal);
      } else {
        alert("토글 설정 변경에 실패했습니다: " + data.error);
      }
    } catch (err) {
      alert("토글 변경 중 통신 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. 감사 로그 전체 초기화
  const handleClearLogs = async () => {
    if (!window.confirm("⚠️ 정말로 누적된 실시간 AI 결재 심사 이력(감사 로그)을 전체 초기화하시겠습니까?\n이 작업은 감사 데이터를 비우는 영구적 작업이며, 복구할 수 없습니다.")) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiFetch("/api/governance?action=clear_logs", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        alert("감사 로그 데이터가 성공적으로 초기화되었습니다.");
        loadData();
      } else {
        alert("초기화 실패: " + data.error);
      }
    } catch (err) {
      alert("초기화 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. 소프트 삭제 복원
  const handleRestore = async (item: DeletedItem) => {
    if (!window.confirm(`정말로 해당 ${item.doc_type === 'estimate' ? '견적서' : item.doc_type === 'purchase_order' ? '발주서' : '수주서'} [${item.id}]를 대장으로 성공적으로 복원하시겠습니까?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiFetch("/api/governance?action=restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: item.doc_type,
          docId: item.id
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("대장 데이터가 정상 복원되었습니다.");
        loadData();
      } else {
        alert("데이터 복원에 실패했습니다: " + data.error);
      }
    } catch (err) {
      alert("복원 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. 모달 제어 및 추천 액션 목록 획득
  const getRecommendedActions = (type: 'STORE_ORDER' | 'RAG_HOLD' | 'LOW_STOCK'): ActionRecommendation[] => {
    switch (type) {
      case 'STORE_ORDER':
        return [
          { code: 'check_inventory', label: '해당 상품의 실시간 재고 파악', description: '물류 재고 원장과 대조하여 요청 수량이 정상적으로 확보되어 출고가 가능한지 검증합니다.' },
          { code: 'sync_sales_order', label: '수주 대장(crm_sales_orders) 자동 연동 적재', description: 'B2B 주문 건에 대해 즉각적인 받은 발주 관리 대장(수주서)을 연동 작성합니다.' },
          { code: 'create_delivery', label: '배송 대장(crm_deliveries) 출고대기 자율 등록', description: '배송을 위해 출고준비 상태로 물류 라우팅 테이블에 주입합니다.' },
          { code: 'send_sms_alert', label: '재고 고갈 우려 시 물류 직원 긴급 알림 문자 발송', description: '출고 담당 직원 번호로 자율 대행 경고 문자를 즉시 전송합니다.' },
          { code: 'notify_operator', label: '조치 이력 영구 감사 아카이빙', description: '최고관리자의 개입 이력을 통제 감사록에 상세 기록합니다.' }
        ];
      case 'RAG_HOLD':
        return [
          { code: 'force_delete', label: 'RAG 삭제 가드 임시 우회 및 강제 삭제 최종 승인', description: '보안 내규 상 제한 조치된 문서 삭제 건을 최고관리자 최종 권한으로 소프트 삭제 처리합니다.' },
          { code: 'notify_operator', label: '최초 조작 신청 임직원에게 처리 통보', description: '강제 승인 결과를 시스템 알림 피드로 피드백합니다.' },
          { code: 'notify_operator', label: '조치 이력 영구 감사 아카이빙', description: '최고관리자의 개입 이력을 통제 감사록에 상세 기록합니다.' }
        ];
      case 'LOW_STOCK':
        return [
          { code: 'sms_low_stock', label: '창고 및 자재 조달 담당 직원 긴급 경고 문자 발송', description: '안전재고가 고갈되어 위험 상태임을 구매 담당자에게 문자 전송합니다.' },
          { code: 'notify_operator', label: '조치 이력 영구 감사 아카이빙', description: '최고관리자의 개입 이력을 통제 감사록에 상세 기록합니다.' }
        ];
      default:
        return [];
    }
  };

  const handleOpenDetail = (evt: ControlEvent) => {
    setSelectedEvent(evt);
    setActionReports(null);
    const defaults = getRecommendedActions(evt.type).map(a => a.code);
    setSelectedActions(defaults); // 기본값 전체 선택
  };

  const handleCloseDetail = () => {
    setSelectedEvent(null);
    setActionReports(null);
    setSelectedActions([]);
  };

  const toggleActionSelection = (code: string) => {
    if (selectedActions.includes(code)) {
      setSelectedActions(prev => prev.filter(c => c !== code));
    } else {
      setSelectedActions(prev => [...prev, code]);
    }
  };

  // 6. AI 추천 자율 대행 액션 실행 전송
  const handleExecuteActions = async () => {
    if (!selectedEvent) return;
    if (selectedActions.length === 0) {
      alert("최소 하나 이상의 자율 대행 작업을 선택해 주세요.");
      return;
    }

    setIsExecuting(true);
    setActionReports(null);

    try {
      const payload: any = {
        eventId: selectedEvent.id,
        eventType: selectedEvent.type,
        actions: selectedActions,
        originalData: selectedEvent.data
      };

      if (selectedEvent.type === 'RAG_HOLD') {
        payload.docId = selectedEvent.data.doc_id;
        payload.docType = selectedEvent.data.doc_type;
      }

      const res = await apiFetch("/api/governance?action=execute_actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setActionReports(data.reports || []);
      } else {
        alert("작업 수행에 실패했습니다: " + data.error);
      }
    } catch (err) {
      alert("작업 처리 중 통신 에러가 발생했습니다.");
    } finally {
      setIsExecuting(false);
    }
  };

  // 해결되지 않은 대기 피드와 완료 피드 분기
  const filteredEvents = events.filter(e => {
    if (activeTab === 'RESTORE') return false;
    return e.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8 font-sans text-left">
      <div className="w-full space-y-6">
        
        {/* 헤더 타이틀 영역 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
              <span>AI 컨트롤타워 관제 센터</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm pl-10">
              실시간 비즈니스 이벤트 피드를 모니터링하고, AI 추천 조치 시나리오를 자율 실행하여 사내 거버넌스를 완벽 제어합니다.
            </p>
          </div>
          <div className="flex items-center gap-2 pl-10 md:pl-0">
            <button
              onClick={loadData}
              disabled={isLoading || isProcessing}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
            </button>
            <button
              onClick={handleClearLogs}
              disabled={isLoading || isProcessing}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-4 py-2.5 rounded-xl border border-rose-200/60 shadow-xs flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>감사록 전체 초기화</span>
            </button>
          </div>
        </div>

        {/* 에러 표시 배너 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 animate-fade-in text-sm font-semibold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {/* 2구역: 세련된 탭 컨트롤러 */}
        <div className="flex gap-2 border-b border-slate-200 pb-px">
          <button
            onClick={() => setActiveTab('WAITING')}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'WAITING' 
                ? 'border-indigo-650 text-indigo-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            미해결 건 ({events.filter(e => e.status === 'WAITING').length})
          </button>
          <button
            onClick={() => setActiveTab('RESOLVED')}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'RESOLVED' 
                ? 'border-indigo-650 text-indigo-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            해결 완료 건 ({events.filter(e => e.status === 'RESOLVED').length})
          </button>
          <button
            onClick={() => setActiveTab('RESTORE')}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'RESTORE' 
                ? 'border-indigo-650 text-indigo-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            삭제 데이터 복원 ({deletedItems.length})
          </button>
        </div>

        {/* 3구역: 메인 콘텐츠 리스트 게시판 */}
        <div className="space-y-4 min-h-[400px]">
          {isLoading ? (
            <div className="py-24 flex flex-col justify-center items-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <span className="text-xs text-slate-400 font-bold">실시간 비즈니스 이벤트 로드 중...</span>
            </div>
          ) : activeTab === 'RESTORE' ? (
            // 💡 삭제 데이터 복원 대장
            deletedItems.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 shadow-xs">
                <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <span className="text-xs font-bold block">소프트 삭제되어 격리 보관 중인 대장 원장이 없습니다.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deletedItems.map((item) => (
                  <div key={`${item.doc_type}_${item.id}`} className="bg-white border border-slate-200/85 hover:border-slate-300 rounded-3xl p-5 shadow-xs flex justify-between items-center transition-all hover:shadow-md">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          item.doc_type === 'estimate' ? 'bg-indigo-50 text-indigo-700' : item.doc_type === 'purchase_order' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {item.doc_type === 'estimate' ? '견적' : item.doc_type === 'purchase_order' ? '발주' : '수주'}
                        </span>
                        <span className="font-bold text-slate-800">{item.id}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-600">
                        거래처: {item.customer_name || item.partner_name || "미지정"}
                      </div>
                      <div className="text-xs text-slate-500">
                        금액: {item.total_amount ? `${item.total_amount.toLocaleString()}원` : "0원"}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>삭제자: {item.deleted_by}</span>
                        <span>•</span>
                        <span>삭제일시: {item.deleted_at}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(item)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>원장 복원</span>
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            // 💡 실시간 관제 이벤트 피드 게시판
            filteredEvents.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 shadow-xs">
                <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <span className="text-xs font-bold block">조회가 활성화된 관제 알림이 비어 있습니다.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((evt) => {
                  return (
                    <div 
                      key={evt.id}
                      onClick={() => handleOpenDetail(evt)}
                      className="bg-white border border-slate-200/85 hover:border-indigo-200 hover:bg-indigo-50/10 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md cursor-pointer group"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl shrink-0 ${
                          evt.type === 'STORE_ORDER' 
                            ? 'bg-blue-50 text-blue-650' 
                            : evt.type === 'RAG_HOLD' 
                              ? 'bg-rose-50 text-rose-600' 
                              : 'bg-amber-50 text-amber-600'
                        }`}>
                          {evt.type === 'STORE_ORDER' && <FileText className="w-6 h-6" />}
                          {evt.type === 'RAG_HOLD' && <ShieldAlert className="w-6 h-6 animate-pulse" />}
                          {evt.type === 'LOW_STOCK' && <AlertTriangle className="w-6 h-6" />}
                        </div>
                        <div className="space-y-1 text-left">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-sm font-black text-slate-800">{evt.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              evt.type === 'STORE_ORDER' 
                                ? 'bg-blue-50 text-blue-700' 
                                : evt.type === 'RAG_HOLD' 
                                  ? 'bg-rose-50 text-rose-700' 
                                  : 'bg-amber-50 text-amber-700'
                            }`}>
                              {evt.type === 'STORE_ORDER' ? '스토어 주문' : evt.type === 'RAG_HOLD' ? 'AI 결재 보류' : '재고 부족 경보'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold">{evt.subtitle}</p>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{evt.created_at}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                        <span className="text-[11px] text-indigo-650 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          <span>검토 및 다음 조치 수행</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

      </div>

      {/* 4구역: 자율 대행 조치 상세 팝업 모달 */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 animate-scale-in text-left">
            
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="text-base font-black text-slate-800">AI 관제 원장 상세 검토</h3>
              </div>
              <button 
                onClick={handleCloseDetail}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 이벤트 속성 상세 테이블 */}
            <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">이벤트 데이터 명세</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block">이벤트 ID</span>
                  <span className="font-mono font-bold text-slate-800">{selectedEvent.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">발생 유형</span>
                  <span className="font-bold text-slate-850">{selectedEvent.type}</span>
                </div>
                {selectedEvent.type === 'STORE_ORDER' && (
                  <>
                    <div className="col-span-2 border-t border-slate-100 my-1"></div>
                    <div>
                      <span className="text-slate-400 font-semibold block">주문 고객</span>
                      <span className="font-bold text-slate-800">{selectedEvent.data.customer_name} ({selectedEvent.data.customer_phone})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">주문 품목</span>
                      <span className="font-bold text-slate-800">{selectedEvent.data.product_name} ({selectedEvent.data.quantity}개)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">최종 결제 금액</span>
                      <span className="font-bold text-slate-800">{Number(selectedEvent.data.total_price || 0).toLocaleString()}원</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">배송지 주소</span>
                      <span className="font-bold text-slate-800 leading-relaxed">{selectedEvent.data.shipping_address || '직접 수령'}</span>
                    </div>
                    {selectedEvent.data.customer_memo && (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-semibold block">고객 메모</span>
                        <span className="font-semibold text-slate-700 whitespace-pre-wrap">{selectedEvent.data.customer_memo}</span>
                      </div>
                    )}
                  </>
                )}
                {selectedEvent.type === 'RAG_HOLD' && (
                  <>
                    <div className="col-span-2 border-t border-slate-100 my-1"></div>
                    <div>
                      <span className="text-slate-400 font-semibold block">보류 문서 유형</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedEvent.data.doc_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">보류 대상 문서 ID</span>
                      <span className="font-bold text-slate-800">{selectedEvent.data.doc_id}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-semibold block">AI 보류 사유 / 사내 내규 지침</span>
                      <span className="font-semibold text-rose-600 bg-rose-50/50 p-2 rounded-lg block mt-1 leading-relaxed border border-rose-100">
                        {selectedEvent.data.reason}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">신청 작업자</span>
                      <span className="font-bold text-slate-800">{selectedEvent.data.operator || 'system'}</span>
                    </div>
                  </>
                )}
                {selectedEvent.type === 'LOW_STOCK' && (
                  <>
                    <div className="col-span-2 border-t border-slate-100 my-1"></div>
                    <div>
                      <span className="text-slate-400 font-semibold block">상품 코드</span>
                      <span className="font-mono font-bold text-slate-800">{selectedEvent.data.barcode || `INV-${selectedEvent.data.id}`}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">상품 명</span>
                      <span className="font-bold text-slate-850">{selectedEvent.data.name || selectedEvent.data.itemName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">현재고 / 안전재고 한도</span>
                      <span className="font-bold text-rose-600">{selectedEvent.data.quantity}개 / {selectedEvent.data.safety_stock || selectedEvent.data.safetyStock}개</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* AI 추천 자율 대행 액션 리스트 */}
            {!actionReports && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4 text-indigo-650" />
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">AI 추천 다음 작업 시나리오</h4>
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {getRecommendedActions(selectedEvent.type).map((act) => {
                    const isSelected = selectedActions.includes(act.code);
                    return (
                      <div 
                        key={act.code}
                        onClick={() => toggleActionSelection(act.code)}
                        className="p-4 flex gap-3 hover:bg-slate-50 cursor-pointer transition-colors text-left"
                      >
                        <div className="pt-0.5 shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-800 block">{act.label}</span>
                          <span className="text-[11px] text-slate-400 font-medium leading-relaxed block">{act.description}</span>
                        </div>
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
              
              {!actionReports ? (
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
      )}

    </div>
  );
}
