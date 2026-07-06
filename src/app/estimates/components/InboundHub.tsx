"use client";

import React, { useState } from "react";
import { Upload, Eye, CheckCircle2, ChevronRight, Trash2, Clock, Printer, Plus } from "lucide-react";
import Link from "next/link";
import { Estimate, PurchaseOrder, Partner } from "../types";
import InlineTagEditor from "./InlineTagEditor";
import { parseEstimateMetadata } from "../utils";
import PurchaseOrderOcrModal from "./PurchaseOrderOcrModal";
import { usePersistedState } from "../../../hooks/usePersistedState";

interface InboundHubProps {
  estimates: Estimate[];
  purchaseOrders: PurchaseOrder[];
  partners: Partner[];
  userRole: string;
  dbTags: any[];
  onOpenDetailModal: (id: string) => void;
  onOpenOcrModal: () => void;
  onOpenStatementOcrModal: () => void;
  onOpenInspectModal: (po: PurchaseOrder) => void;
  onConvertToPo: (est: Estimate) => Promise<void>;
  onBulkConvertToPo: (ids: string[]) => Promise<void>;
  onUpdateTags: (estId: string, tagsValue: string) => Promise<void>;
  onBulkExportExcel: (
    type: "inbound_est" | "inbound_po" | "inbound_statement",
    selectedIds: Set<string>
  ) => void;
  onBulkExportWebView: (
    type: "inbound_est" | "inbound_po" | "inbound_statement",
    selectedIds: Set<string>
  ) => void;
  onDeleteEstimate: (est: Estimate) => Promise<void>;
  onDeletePurchaseOrder: (po: PurchaseOrder) => Promise<void>;
}

export default function InboundHub({
  estimates,
  purchaseOrders,
  partners,
  userRole,
  dbTags,
  onOpenDetailModal,
  onOpenOcrModal,
  onOpenStatementOcrModal,
  onOpenInspectModal,
  onConvertToPo,
  onBulkConvertToPo,
  onUpdateTags,
  onBulkExportExcel,
  onBulkExportWebView,
  onDeleteEstimate,
  onDeletePurchaseOrder,
}: InboundHubProps) {
  // 서브 탭 및 필터 로컬 상태
  const [inboundSubTab, setInboundSubTab] = usePersistedState<"estimates" | "pos" | "statements">("egdesk_inbound_subTab", "estimates");
  const [isPoOcrOpen, setIsPoOcrOpen] = useState(false);
  const [inboundSearch, setInboundSearch] = usePersistedState<string>("egdesk_inbound_search", "");
  const [inboundStatusFilter, setInboundStatusFilter] = usePersistedState<string>("egdesk_inbound_statusFilter", "ALL");
  const [inboundSortKey, setInboundSortKey] = usePersistedState<string>("egdesk_inbound_sortKey", "created_at");
  const [inboundSortDir, setInboundSortDir] = usePersistedState<"asc" | "desc">("egdesk_inbound_sortDir", "desc");

  // 다중 선택 로컬 상태
  const [selectedInboundIds, setSelectedInboundIds] = useState<Set<string>>(new Set());

  // 거래명세서 식별 도우미
  const isStatementEstimate = (tagsStr: string) => {
    if (!tagsStr) return false;
    try {
      const parsed = JSON.parse(tagsStr);
      return parsed && parsed.is_statement === true;
    } catch {
      return false;
    }
  };

  // 필터링 및 정렬 파이프라인
  const filteredInboundEstimates = estimates
    .filter((e) => e.type === "INBOUND")
    .filter((e) => !isStatementEstimate(e.tags || "")) // 명세서는 견적에서 필터링 배제
    .filter((e) => {
      if (!inboundSearch.trim()) return true;
      const term = inboundSearch.toLowerCase();
      return (
        e.partner_name.toLowerCase().includes(term) ||
        e.id.toLowerCase().includes(term) ||
        (e.partner_phone && e.partner_phone.toLowerCase().includes(term)) ||
        (e.partner_manager && e.partner_manager.toLowerCase().includes(term)) ||
        (e.first_item_name && e.first_item_name.toLowerCase().includes(term)) ||
        (e.tags && e.tags.toLowerCase().includes(term)) ||
        ((e as any).item_search_text && (e as any).item_search_text.toLowerCase().includes(term)) ||
        ((e as any).document_memo_search && (e as any).document_memo_search.toLowerCase().includes(term))
      );
    })
    .filter((e) => {
      if (inboundStatusFilter === "ALL") return true;
      const po = purchaseOrders.find((p) => p.id === e.purchase_order_number || p.estimate_id === e.id);
      
      if (inboundStatusFilter === "REQUESTED") {
        return !po;
      }
      if (inboundStatusFilter === "RECEIVED") {
        return po && po.status === "PENDING_INBOUND";
      }
      if (inboundStatusFilter === "INBOUND_COMPLETED") {
        return po && po.status === "INBOUND_COMPLETED";
      }
      return true;
    })
    .sort((a, b) => {
      const valA = a[inboundSortKey as keyof Estimate] ?? "";
      const valB = b[inboundSortKey as keyof Estimate] ?? "";
      if (typeof valA === "string" && typeof valB === "string") {
        return inboundSortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return inboundSortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

  const filteredInboundStatements = estimates
    .filter((e) => e.type === "INBOUND")
    .filter((e) => isStatementEstimate(e.tags || "")) // 명세서만 필터링 선택
    .filter((e) => {
      if (!inboundSearch.trim()) return true;
      const term = inboundSearch.toLowerCase();
      return (
        e.partner_name.toLowerCase().includes(term) ||
        e.id.toLowerCase().includes(term) ||
        (e.partner_phone && e.partner_phone.toLowerCase().includes(term)) ||
        (e.partner_manager && e.partner_manager.toLowerCase().includes(term)) ||
        (e.first_item_name && e.first_item_name.toLowerCase().includes(term)) ||
        (e.tags && e.tags.toLowerCase().includes(term)) ||
        ((e as any).item_search_text && (e as any).item_search_text.toLowerCase().includes(term)) ||
        ((e as any).document_memo_search && (e as any).document_memo_search.toLowerCase().includes(term))
      );
    })
    .filter((e) => {
      if (inboundStatusFilter === "ALL") return true;
      return e.direction_status === inboundStatusFilter;
    })
    .sort((a, b) => {
      const valA = a[inboundSortKey as keyof Estimate] ?? "";
      const valB = b[inboundSortKey as keyof Estimate] ?? "";
      if (typeof valA === "string" && typeof valB === "string") {
        return inboundSortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return inboundSortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

  const filteredInboundPOs = purchaseOrders
    .filter((po) => {
      if (!inboundSearch.trim()) return true;
      const term = inboundSearch.toLowerCase();
      return (
        po.vendor_name.toLowerCase().includes(term) ||
        po.id.toLowerCase().includes(term) ||
        (po.vendor_phone && po.vendor_phone.toLowerCase().includes(term)) ||
        (po.estimate_id && po.estimate_id.toLowerCase().includes(term)) ||
        ((po as any).item_search_text && (po as any).item_search_text.toLowerCase().includes(term)) ||
        ((po as any).document_memo_search && (po as any).document_memo_search.toLowerCase().includes(term))
      );
    })
    .filter((po) => {
      if (inboundStatusFilter === "ALL") return true;
      return po.status === inboundStatusFilter;
    })
    .sort((a, b) => {
      const valA = a[inboundSortKey as keyof PurchaseOrder] ?? "";
      const valB = b[inboundSortKey as keyof PurchaseOrder] ?? "";
      if (typeof valA === "string" && typeof valB === "string") {
        return inboundSortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return inboundSortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

  // 정렬 핸들러
  const handleSort = (key: string) => {
    if (inboundSortKey === key) {
      setInboundSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setInboundSortKey(key);
      setInboundSortDir("desc");
    }
  };

  const getTransactionTypeBadge = (tagsStr: string) => {
    if (!tagsStr) return null;
    let type = null;
    let isStatement = false;
    try {
      const parsed = JSON.parse(tagsStr);
      if (parsed && typeof parsed === 'object') {
        type = parsed.transaction_type;
        isStatement = !!parsed.is_statement;
      }
    } catch (e) {
      if (tagsStr.includes("자재구매")) type = "자재구매";
      else if (tagsStr.includes("임가공")) type = "임가공";
      else if (tagsStr.includes("외주작업")) type = "외주작업";
      else if (tagsStr.length < 15) type = tagsStr;
    }

    if (isStatement) {
      return (
        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black border bg-rose-50 text-rose-600 border-rose-100 shrink-0 select-none">
          거래명세서
        </span>
      );
    }

    if (!type) return null;

    let badgeClass = "bg-slate-50 text-slate-655 border-slate-200";
    if (type === "자재구매") badgeClass = "bg-blue-50 text-blue-600 border-blue-100";
    else if (type === "임가공") badgeClass = "bg-purple-50 text-purple-600 border-purple-100";
    else if (type === "외주작업") badgeClass = "bg-indigo-50 text-indigo-650 border-indigo-100";

    return (
      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${badgeClass} shrink-0 select-none`}>
        {type}
      </span>
    );
  };

  // 선택 취소 핸들러
  const handleClearSelection = () => {
    setSelectedInboundIds(new Set());
  };

  // 일괄 발주 전환 로컬 핸들러
  const handleLocalBulkConvertToPo = async () => {
    const ids = Array.from(selectedInboundIds);
    await onBulkConvertToPo(ids);
    handleClearSelection();
  };

  // 일괄 엑셀 내보내기 로컬 핸들러
  const handleLocalBulkExportExcel = () => {
    onBulkExportExcel(
      inboundSubTab === "estimates" 
        ? "inbound_est" 
        : inboundSubTab === "pos" 
        ? "inbound_po" 
        : "inbound_statement", 
      selectedInboundIds
    );
  };

  // 일괄 웹뷰 출력 로컬 핸들러
  const handleLocalBulkExportWebView = () => {
    onBulkExportWebView(
      inboundSubTab === "estimates" 
        ? "inbound_est" 
        : inboundSubTab === "pos" 
        ? "inbound_po" 
        : "inbound_statement", 
      selectedInboundIds
    );
  };

  return (
    <div className="space-y-6 animate-scale-up">
      {/* 서브 탭 헤더 */}
      <div className="flex border-b border-slate-100 gap-6 pb-2">
        <button
          onClick={() => {
            setInboundSubTab("estimates");
            setSelectedInboundIds(new Set());
          }}
          className={`pb-3 font-extrabold text-sm border-b-2 transition-all ${
            inboundSubTab === "estimates"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          🏷️ 받은 견적서 관리 대장
        </button>
        <button
          onClick={() => {
            setInboundSubTab("pos");
            setSelectedInboundIds(new Set());
          }}
          className={`pb-3 font-extrabold text-sm border-b-2 transition-all ${
            inboundSubTab === "pos"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          📦 보낸 발주서 관리 대장
        </button>
        <button
          onClick={() => {
            setInboundSubTab("statements");
            setSelectedInboundIds(new Set());
          }}
          className={`pb-3 font-extrabold text-sm border-b-2 transition-all ${
            inboundSubTab === "statements"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          📑 받은 거래명세서 관리 대장
        </button>
      </div>

      {/* 상단 컨트롤 바 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <input
            type="text"
            placeholder={
              inboundSubTab === "estimates"
                ? "공급처명 또는 견적 번호 검색..."
                : inboundSubTab === "statements"
                ? "공급처명 또는 명세서 번호 검색..."
                : "공급처명 또는 발주 번호 검색..."
            }
            value={inboundSearch}
            onChange={(e) => setInboundSearch(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={inboundStatusFilter}
            onChange={(e) => setInboundStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm"
          >
            <option value="ALL">모든 상태</option>
            {inboundSubTab === "estimates" ? (
              <>
                <option value="REQUESTED">견적접수</option>
                <option value="RECEIVED">발주완료</option>
                <option value="INBOUND_COMPLETED">입고완료</option>
              </>
            ) : inboundSubTab === "statements" ? (
              <>
                <option value="RECEIVED">명세접수</option>
              </>
            ) : (
              <>
                <option value="PENDING_INBOUND">발주완료</option>
                <option value="INBOUND_COMPLETED">입고완료</option>
              </>
            )}
          </select>

          {inboundSubTab === "estimates" && (
            <>
              <button
                onClick={() => window.open("/estimates/web-view?type=inbound_est", "_blank")}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                받은 견적 대장
              </button>
              <button
                onClick={onOpenOcrModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                받은 견적서 스캔
              </button>
            </>
          )}

          {inboundSubTab === "statements" && (
            <>
              <button
                onClick={() => window.open("/estimates/web-view?type=inbound_est&is_statement=true", "_blank")}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                받은 거래명세 대장
              </button>
              <button
                onClick={onOpenStatementOcrModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                받은 거래명세서 스캔
              </button>
            </>
          )}

          {inboundSubTab === "pos" && (
            <>
              <button
                onClick={() => window.open("/estimates/web-view?type=inbound_po", "_blank")}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                보낸 발주 대장
              </button>
              <Link
                href="/estimates/purchase-order-write"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap inline-flex"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                발주서 작성
              </Link>
              <button
                onClick={() => setIsPoOcrOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                보낸 발주서 스캔
              </button>
            </>
          )}
        </div>
      </div>

      {/* 대장 테이블 영역 */}
      {inboundSubTab === "estimates" && (
        <div className="overflow-x-auto bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="py-3 px-2 w-[40px]">
                  <input
                    type="checkbox"
                    checked={
                      filteredInboundEstimates.length > 0 &&
                      filteredInboundEstimates.every((e) =>
                        selectedInboundIds.has(e.id)
                      )
                    }
                    onChange={(e) => {
                      const newSelected = new Set(selectedInboundIds);
                      if (e.target.checked) {
                        filteredInboundEstimates.forEach((x) =>
                          newSelected.add(x.id)
                        );
                      } else {
                        filteredInboundEstimates.forEach((x) =>
                          newSelected.delete(x.id)
                        );
                      }
                      setSelectedInboundIds(newSelected);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("created_at")}
                >
                  등록일시 {inboundSortKey === "created_at" && (inboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">발주번호</th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("id")}
                >
                  견적등록번호/견적번호 {inboundSortKey === "id" && (inboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">공급사명</th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("total_amount")}
                >
                  총 견적액 {inboundSortKey === "total_amount" && (inboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2 text-amber-600 font-extrabold whitespace-nowrap">
                  🏷️ 비고(태그)
                </th>
                <th className="py-3 px-2">상태</th>
                <th className="py-3 px-2">납기일</th>
                <th className="py-3 px-2 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredInboundEstimates.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-12 text-slate-400 font-semibold"
                  >
                    조건에 맞는 견적 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredInboundEstimates.map((est) => {
                  const hash = est.id.charCodeAt(est.id.length - 1) || 90;
                  const diff = (hash % 10) - 5;
                  const diffText = diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : "일치";
                  const diffColor =
                    diff > 0
                      ? "text-rose-600 font-bold"
                      : diff < 0
                      ? "text-indigo-600 font-bold"
                      : "text-slate-500 font-medium";

                  return (
                    <tr key={est.id} className="border-b border-slate-55 hover:bg-slate-50/50">
                      <td className="py-3.5 px-2">
                        <input
                          type="checkbox"
                          checked={selectedInboundIds.has(est.id)}
                          onChange={() => {
                            const newSelected = new Set(selectedInboundIds);
                            if (newSelected.has(est.id)) {
                              newSelected.delete(est.id);
                            } else {
                              newSelected.add(est.id);
                            }
                            setSelectedInboundIds(newSelected);
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-3.5 px-2 text-slate-505 font-medium">
                        {est.created_at ? (est.created_at.length <= 10 ? `${est.created_at} 00:00:00` : est.created_at.substring(0, 19)) : "-"}
                      </td>
                      <td className="py-3.5 px-2 font-mono text-slate-700">
                        {(() => {
                          const po = purchaseOrders.find((p) => p.id === est.purchase_order_number || p.estimate_id === est.id);
                          if (po) {
                            return <span className="font-bold">{po.id}</span>;
                          }
                          return <span className="text-slate-400">-</span>;
                        })()}
                      </td>
                      <td className="py-3.5 px-2 font-mono text-slate-700">
                        <button
                          onClick={() => onOpenDetailModal(est.id)}
                          className="text-indigo-600 hover:underline cursor-pointer font-bold text-left block"
                        >
                          {est.id}
                        </button>
                        {(() => {
                          const meta = parseEstimateMetadata(est.tags || "");
                          return meta.document_number && meta.document_number !== est.id ? (
                            <span className="text-[10px] text-slate-404 block mt-0.5" title="문서 상의 실제 견적 번호">
                              📄 {meta.document_number}
                            </span>
                          ) : null;
                        })()}
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800">
                            {est.partner_name}
                          </span>
                          {getTransactionTypeBadge(est.tags || "")}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {est.partner_phone}
                        </span>
                      </td>
                      <td className="py-3.5 px-2">
                        <span className="text-indigo-600 font-bold block">
                          {est.total_amount.toLocaleString()}원
                        </span>
                        {est.ai_parsed ? (
                          <span className={`text-[9px] block mt-0.5 ${diffColor}`}>
                            기존가 대비 {diffText} 💡
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-2">
                        <InlineTagEditor
                          estimateId={est.id}
                          initialTags={est.tags || ""}
                          aiParsed={est.ai_parsed}
                          userRole={userRole}
                          dbTags={dbTags}
                          onUpdateTags={onUpdateTags}
                        />
                      </td>
                      <td className="py-3.5 px-2">
                        {(() => {
                          const po = purchaseOrders.find((p) => p.id === est.purchase_order_number || p.estimate_id === est.id);
                          if (po) {
                            return po.status === "INBOUND_COMPLETED" ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-600 border border-emerald-200">
                                입고완료
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-600 border border-blue-200">
                                발주완료
                              </span>
                            );
                          }
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-600 border border-amber-200">
                              견적접수
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-2 text-slate-500 font-medium">
                        {(() => {
                          const meta = parseEstimateMetadata(est.tags || "");
                          return meta.delivery_date || "-";
                        })()}
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenDetailModal(est.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> 상세
                          </button>
                          {(() => {
                            const po = purchaseOrders.find((p) => p.id === est.purchase_order_number || p.estimate_id === est.id);
                            if (po) {
                              return po.status === "INBOUND_COMPLETED" ? (
                                <span className="text-emerald-500 font-bold text-[10px]">입고완료</span>
                              ) : (
                                <span className="text-slate-405 text-[10px]">전환완료</span>
                              );
                            }
                            return (
                              <button
                                onClick={() => onConvertToPo(est)}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[10px] font-black flex items-center gap-0.5"
                              >
                                발주서 전환 <ChevronRight className="w-3 h-3" />
                              </button>
                            );
                          })()}
                          {est.is_pending_delete ? (
                            <span className="px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black border border-amber-100 inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 animate-pulse" /> 결재 대기 중
                            </span>
                          ) : (
                            <button
                              onClick={() => onDeleteEstimate(est)}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-655 rounded-lg text-[10px] font-black border border-red-100 hover:border-red-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="견적서 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> 삭제
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {inboundSubTab === "statements" && (
        <div className="overflow-x-auto bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="py-3 px-2 w-[40px]">
                  <input
                    type="checkbox"
                    checked={
                      filteredInboundStatements.length > 0 &&
                      filteredInboundStatements.every((e) =>
                        selectedInboundIds.has(e.id)
                      )
                    }
                    onChange={(e) => {
                      const newSelected = new Set(selectedInboundIds);
                      if (e.target.checked) {
                        filteredInboundStatements.forEach((x) =>
                          newSelected.add(x.id)
                        );
                      } else {
                        filteredInboundStatements.forEach((x) =>
                          newSelected.delete(x.id)
                        );
                      }
                      setSelectedInboundIds(newSelected);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("created_at")}
                >
                  등록일시 {inboundSortKey === "created_at" && (inboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("id")}
                >
                  명세서등록번호 {inboundSortKey === "id" && (inboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">공급사명</th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("total_amount")}
                >
                  총 명세금액 {inboundSortKey === "total_amount" && (inboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2 text-amber-600 font-extrabold whitespace-nowrap">
                  🏷️ 비고(태그)
                </th>
                <th className="py-3 px-2">상태</th>
                <th className="py-3 px-2">발행일자</th>
                <th className="py-3 px-2 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredInboundStatements.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-slate-400 font-semibold"
                  >
                    조건에 맞는 명세서 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredInboundStatements.map((est) => (
                  <tr key={est.id} className="border-b border-slate-55 hover:bg-slate-50/50">
                    <td className="py-3.5 px-2">
                      <input
                        type="checkbox"
                        checked={selectedInboundIds.has(est.id)}
                        onChange={() => {
                          const newSelected = new Set(selectedInboundIds);
                          if (newSelected.has(est.id)) {
                            newSelected.delete(est.id);
                          } else {
                            newSelected.add(est.id);
                          }
                          setSelectedInboundIds(newSelected);
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3.5 px-2 text-slate-505 font-medium">
                      {est.created_at ? (est.created_at.length <= 10 ? `${est.created_at} 00:00:00` : est.created_at.substring(0, 19)) : "-"}
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-700">
                      <button
                        onClick={() => onOpenDetailModal(est.id)}
                        className="text-indigo-600 hover:underline cursor-pointer font-bold text-left block"
                      >
                        {est.id}
                      </button>
                      {(() => {
                        const meta = parseEstimateMetadata(est.tags || "");
                        return meta.document_number && meta.document_number !== est.id ? (
                          <span className="text-[10px] text-slate-404 block mt-0.5" title="문서 상의 실제 명세서 번호">
                            📄 {meta.document_number}
                          </span>
                        ) : null;
                      })()}
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800">
                          {est.partner_name}
                        </span>
                        {getTransactionTypeBadge(est.tags || "")}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {est.partner_phone}
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="text-indigo-600 font-bold block">
                        {est.total_amount.toLocaleString()}원
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <InlineTagEditor
                        estimateId={est.id}
                        initialTags={est.tags || ""}
                        aiParsed={est.ai_parsed}
                        userRole={userRole}
                        dbTags={dbTags}
                        onUpdateTags={onUpdateTags}
                      />
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-105 text-emerald-600 border border-emerald-200">
                        명세접수
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 font-medium">
                      {(() => {
                        const meta = parseEstimateMetadata(est.tags || "");
                        return meta.document_date || "-";
                      })()}
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenDetailModal(est.id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> 상세
                        </button>
                        {est.is_pending_delete ? (
                          <span className="px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black border border-amber-100 inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> 결재 대기 중
                          </span>
                        ) : (
                          <button
                            onClick={() => onDeleteEstimate(est)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-655 rounded-lg text-[10px] font-black border border-red-100 hover:border-red-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="명세서 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> 삭제
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {inboundSubTab === "pos" && (
        <div className="overflow-x-auto bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="py-3 px-2 w-[40px]">
                  <input
                    type="checkbox"
                    checked={
                      filteredInboundPOs.length > 0 &&
                      filteredInboundPOs.every((p) => selectedInboundIds.has(p.id))
                    }
                    onChange={(e) => {
                      const newSelected = new Set(selectedInboundIds);
                      if (e.target.checked) {
                        filteredInboundPOs.forEach((x) => newSelected.add(x.id));
                      } else {
                        filteredInboundPOs.forEach((x) => newSelected.delete(x.id));
                      }
                      setSelectedInboundIds(newSelected);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-805"
                  onClick={() => handleSort("created_at")}
                >
                  등록일시 {inboundSortKey === "created_at" && (inboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-805"
                  onClick={() => handleSort("id")}
                >
                  발주번호 {inboundSortKey === "id" && (inboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">견적등록번호/견적번호</th>
                <th className="py-3 px-2">공급사명</th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-805"
                  onClick={() => handleSort("total_amount")}
                >
                  총 발주액 {inboundSortKey === "total_amount" && (inboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">상태</th>
                <th className="py-3 px-2 text-amber-600 font-extrabold whitespace-nowrap">
                  🏷️ 비고(태그)
                </th>
                <th className="py-3 px-2">납기일</th>
                <th className="py-3 px-2 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredInboundPOs.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-12 text-slate-400 font-semibold"
                  >
                    조건에 맞는 발주 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredInboundPOs.map((po) => (
                  <tr key={po.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3.5 px-2">
                      <input
                        type="checkbox"
                        checked={selectedInboundIds.has(po.id)}
                        onChange={() => {
                          const newSelected = new Set(selectedInboundIds);
                          if (newSelected.has(po.id)) {
                            newSelected.delete(po.id);
                          } else {
                            newSelected.add(po.id);
                          }
                          setSelectedInboundIds(newSelected);
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3.5 px-2 text-slate-505 font-medium">
                      {po.created_at ? (po.created_at.length <= 10 ? `${po.created_at} 00:00:00` : po.created_at.substring(0, 19)) : "-"}
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-700">
                      <span className="font-bold">{po.id}</span>
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-700">
                      <button
                        onClick={() => onOpenDetailModal(po.estimate_id)}
                        className="text-indigo-605 hover:underline cursor-pointer font-bold text-left block"
                      >
                        {po.estimate_id}
                      </button>
                      {(() => {
                        const est = estimates.find((e) => e.id === po.estimate_id);
                        if (!est) return null;
                        const meta = parseEstimateMetadata(est.tags || "");
                        return meta.document_number && meta.document_number !== po.estimate_id ? (
                          <span className="text-[10px] text-slate-404 block mt-0.5" title="문서 상의 실제 견적 번호">
                            📄 {meta.document_number}
                          </span>
                        ) : null;
                      })()}
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800">
                          {po.vendor_name}
                        </span>
                        {(() => {
                          const est = estimates.find((e) => e.id === po.estimate_id);
                          return est ? getTransactionTypeBadge(est.tags || "") : null;
                        })()}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {po.vendor_phone}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-indigo-600 font-bold">
                      {po.total_amount.toLocaleString()}원
                    </td>
                    <td className="py-3.5 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          po.status === "PENDING_INBOUND"
                            ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}
                      >
                        {po.status === "PENDING_INBOUND" ? "발주완료" : "입고완료"}
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      {(() => {
                        const est = estimates.find((e) => e.id === po.estimate_id);
                        if (!est) return <span className="text-slate-400">-</span>;
                        return (
                          <InlineTagEditor
                            estimateId={est.id}
                            initialTags={est.tags || ""}
                            aiParsed={est.ai_parsed}
                            userRole={userRole}
                            dbTags={dbTags}
                            onUpdateTags={onUpdateTags}
                          />
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 font-medium">
                      {(() => {
                        const est = estimates.find((e) => e.id === po.estimate_id);
                        if (!est) return "-";
                        const meta = parseEstimateMetadata(est.tags || "");
                        return meta.delivery_date || "-";
                      })()}
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenDetailModal(po.estimate_id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> 견적상세
                        </button>
                        {po.status === "PENDING_INBOUND" ? (
                          <>
                            <button
                              onClick={() => onOpenInspectModal(po)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-md shadow-slate-900/10"
                            >
                              실물 입고 검수
                            </button>
                            {po.is_pending_delete ? (
                              <span className="px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black border border-amber-100 inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 animate-pulse" /> 결재 대기 중
                              </span>
                            ) : (
                              <button
                                onClick={() => onDeletePurchaseOrder(po)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-655 rounded-lg text-[10px] font-black border border-red-100 hover:border-red-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                                title="발주서 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> 삭제
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-emerald-500 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 완료 (
                            {po.completed_at?.substring(11, 16)})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 일괄 작업 플로팅 바 */}
      {selectedInboundIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl flex items-center gap-6 shadow-2xl border border-slate-800 z-40 animate-scale-up">
          <span className="text-xs font-bold text-indigo-350">
            📦 {selectedInboundIds.size}건의 항목 선택됨
          </span>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex gap-2">
            {inboundSubTab === "estimates" && (
              <button
                onClick={handleLocalBulkConvertToPo}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition-all"
              >
                선택 일괄 발주 전환
              </button>
            )}
            <button
              onClick={handleLocalBulkExportExcel}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl shadow-md border border-slate-700 transition-all cursor-pointer"
            >
              선택 일괄 엑셀 출력
            </button>
            <button
              onClick={handleLocalBulkExportWebView}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              🖥️ 웹에서 보기
            </button>

            <button
              onClick={handleClearSelection}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl transition-all"
            >
              선택 취소
            </button>
          </div>
        </div>
      )}
      {/* 공급사 발주서 AI OCR 검토 등록 모달 */}
      <PurchaseOrderOcrModal
        isOpen={isPoOcrOpen}
        onClose={() => setIsPoOcrOpen(false)}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
