"use client";

import { apiFetch } from "@/lib/api";
import React, { useState, useEffect, useCallback } from "react";
import { 
  ShieldAlert, Activity, CheckCircle2, AlertTriangle, 
  RotateCcw, RefreshCw, Trash2, ArrowRightLeft, ShieldCheck, 
  HelpCircle, Sparkles, User, Clock, ToggleLeft, ToggleRight
} from "lucide-react";

interface GovernanceLog {
  id: string;
  doc_type: string;
  doc_id: string;
  doc_title: string;
  status: 'PENDING_APPROVAL' | 'FORCE_APPROVED' | 'RESTORED';
  reason: string;
  operator: string;
  created_at: string;
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

export default function GovernanceDashboard() {
  const [logs, setLogs] = useState<GovernanceLog[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [ocrEnabled, setOcrEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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

      // 1.2. 감사 로그 조회
      const logsRes = await apiFetch("/api/governance?action=logs");
      const logsData = await logsRes.json();
      if (logsData.success) {
        setLogs(logsData.logs || []);
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

  // 3. 결재 보류 건 최고관리자 강제 삭제 승인
  const handleForceDelete = async (log: GovernanceLog) => {
    if (!window.confirm(`⚠️ 정말로 해당 ${log.doc_type === 'estimate' ? '견적서' : log.doc_type === 'purchase_order' ? '발주서' : '수주서'} [${log.doc_id}]의 삭제를 강제 승인하시겠습니까?\n이 작업은 되돌릴 수 없으며 대장에서 완전히 삭제 처리됩니다.`)) {
      return;
    }
    
    setIsProcessing(true);
    try {
      const res = await apiFetch("/api/governance?action=force_delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logId: log.id,
          docType: log.doc_type,
          docId: log.doc_id
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("성공적으로 강제 삭제 승인되었습니다.");
        loadData();
      } else {
        alert("강제 삭제 처리에 실패했습니다: " + data.error);
      }
    } catch (err) {
      alert("강제 삭제 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. 소프트 삭제된 대장 데이터 복원
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

  // 5. 감사 이력 전체 초기화
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
              사내 비즈니스 트랜잭션의 AI 자율 대행 가드, RAG 보류 수동 결재 및 소프트 삭제 원장 복원을 통합 제어합니다.
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

        {/* 1구역: 이미지 OCR 자율 대행 가드 스위치 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
          <div className="space-y-1 pl-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500 shrink-0" />
              <span>이미지 OCR 자율 대행 통제 (AI 가드라인)</span>
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              비활성화(OFF) 시, 사용자가 업로드한 실물 문서 이미지(재무제표, 명함, 사업자증 등)의 AI 인식을 통한 데이터베이스 최종 승인 및 적재(확정)가 원천 방어 가드됩니다.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${ocrEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {ocrEnabled ? "가동 활성화 (RUNNING)" : "보안 가드 가동 (BLOCKED)"}
            </span>
            <button
              onClick={handleToggleOcr}
              disabled={isLoading || isProcessing}
              className="border-none bg-transparent cursor-pointer transition-all hover:scale-105 shrink-0"
              title={ocrEnabled ? "비활성화" : "활성화"}
            >
              {ocrEnabled ? (
                <ToggleRight className="w-14 h-8 text-rose-500" />
              ) : (
                <ToggleLeft className="w-14 h-8 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* 2구역: 2컬럼 메인 관제 보드 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* 좌측: AI 결재 심사 보류 대장 */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col min-h-[450px]">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-500" />
                  <span>AI 결재 심사 감사록</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1"> RAG에 의해 자동 보류되어 관리자 결재를 대기 중인 트랜잭션 감사 정보</p>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                총 {logs.length}건
              </span>
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col justify-center items-center py-12">
                <div className="w-7 h-7 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span className="text-xs text-slate-400 font-bold">감사록 로딩 중...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center py-12 text-center text-slate-400">
                <ShieldCheck className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-xs font-bold">보류되거나 누적된 결재 심사 이력이 없습니다.</span>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600 whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3">문서 정보</th>
                      <th className="p-3 text-center">결재 판정</th>
                      <th className="p-3">검증 이력 / 세부 내역</th>
                      <th className="p-3">조작자</th>
                      <th className="p-3 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logs.map((log) => {
                      const isPending = log.status === 'PENDING_APPROVAL';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{log.doc_title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span className="uppercase font-extrabold text-[9px] bg-slate-100 px-1 rounded-sm text-slate-600">
                                {log.doc_type}
                              </span>
                              <span>•</span>
                              <span>ID: {log.doc_id}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'PENDING_APPROVAL' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-250/30' 
                                : log.status === 'FORCE_APPROVED' 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-250/30'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-250/30'
                            }`}>
                              {log.status === 'PENDING_APPROVAL' ? '승인대기(RAG 보류)' : log.status === 'FORCE_APPROVED' ? '강제승인' : '복원됨'}
                            </span>
                          </td>
                          <td className="p-3 max-w-xs truncate" title={log.reason}>
                            <span className="text-[11px] text-slate-500 font-semibold">{log.reason}</span>
                          </td>
                          <td className="p-3 text-slate-500 font-semibold">
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{log.operator || "system"}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {isPending && (
                              <button
                                onClick={() => handleForceDelete(log)}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] border-none cursor-pointer flex items-center gap-1.5 transition-colors ml-auto"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>강제 삭제 승인</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 우측: 소프트 삭제된 대장 데이터 복원 대장 */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col min-h-[450px]">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                  <span>소프트 삭제 원장 복원 센터</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">대장에서 삭제 처리되어 보관 중인 견적서, 발주서, 수주서 데이터 관리</p>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                총 {deletedItems.length}건
              </span>
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col justify-center items-center py-12">
                <div className="w-7 h-7 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span className="text-xs text-slate-400 font-bold">삭제 원장 로딩 중...</span>
              </div>
            ) : deletedItems.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center py-12 text-center text-slate-400">
                <ShieldCheck className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-xs font-bold">소프트 삭제 상태로 격리 보관 중인 원장 문서가 없습니다.</span>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600 whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3">문서 종류 / 번호</th>
                      <th className="p-3">거래처 명</th>
                      <th className="p-3 text-right">금액</th>
                      <th className="p-3">삭제자 / 일시</th>
                      <th className="p-3 text-right">복원</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {deletedItems.map((item) => {
                      return (
                        <tr key={`${item.doc_type}_${item.id}`} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                item.doc_type === 'estimate' 
                                  ? 'bg-indigo-50 text-indigo-700' 
                                  : item.doc_type === 'purchase_order' 
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {item.doc_type === 'estimate' ? '견적' : item.doc_type === 'purchase' ? '발주' : '수주'}
                              </span>
                              <span className="font-bold text-slate-800">{item.id}</span>
                            </div>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">
                            {item.customer_name || item.partner_name || "미지정"}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800">
                            {item.total_amount ? `${item.total_amount.toLocaleString()}원` : "0원"}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-500 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.deleted_by || "system"}</span>
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{item.deleted_at}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleRestore(item)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] border-none cursor-pointer flex items-center gap-1 transition-colors ml-auto shadow-xs"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>복원하기</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
