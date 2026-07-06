"use client";

import { apiFetch } from '@/lib/api';
import React, { useState } from "react";
import { Plus, Eye, CheckCircle2, ChevronRight, Trash2, Clock, Printer, Upload, Sparkles, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { Estimate, SalesOrder, Partner } from "../types";
import { parseEstimateMetadata, parsePurchaseOrderExcel, ExcelParsedPurchaseOrder, getExcelColumnsAndRawData, parseExcelWithMapping } from "../utils";
import SalesOrderExcelModal from "./SalesOrderExcelModal";
import { usePersistedState } from "../../../hooks/usePersistedState";

interface OutboundHubProps {
  estimates: Estimate[];
  salesOrders: SalesOrder[];
  partners: Partner[];
  onOpenDetailModal: (id: string) => void;
  onOpenWriteModal: () => void;
  onConvertToSo: (est: Estimate) => Promise<void>;
  onConfirmSalesOrder: (so: SalesOrder) => Promise<void>;
  onDeleteSalesOrder: (so: SalesOrder) => Promise<void>;
  onBulkConfirmSalesOrder: (ids: string[]) => Promise<void>;
  onBulkExportExcel: (
    type: "outbound_est" | "outbound_so",
    selectedIds: Set<string>
  ) => void;
  onBulkExportWebView: (
    type: "outbound_est" | "outbound_so",
    selectedIds: Set<string>
  ) => void;
  onOpenOcrModal: () => void;
  onDeleteEstimate: (est: Estimate) => Promise<void>;
}

export default function OutboundHub({
  estimates,
  salesOrders,
  partners,
  onOpenDetailModal,
  onOpenWriteModal,
  onConvertToSo,
  onConfirmSalesOrder,
  onDeleteSalesOrder,
  onBulkConfirmSalesOrder,
  onBulkExportExcel,
  onBulkExportWebView,
  onOpenOcrModal,
  onDeleteEstimate,
}: OutboundHubProps) {
  // 서브 탭 및 필터 로컬 상태
  const [outboundSubTab, setOutboundSubTab] = usePersistedState<"estimates" | "statements" | "sos">("egdesk_outbound_subTab", "estimates");
  const [isSoExcelOpen, setIsSoExcelOpen] = useState(false);
  const [preParsedExcelData, setPreParsedExcelData] = useState<ExcelParsedPurchaseOrder | null>(null);
  const [uploadedExcelFile, setUploadedExcelFile] = useState<File | null>(null);
  const [isExcelUploading, setIsExcelUploading] = useState(false);
  const excelInputRef = React.useRef<HTMLInputElement>(null);
  const [outboundSearch, setOutboundSearch] = usePersistedState<string>("egdesk_outbound_search", "");
  const [outboundStatusFilter, setOutboundStatusFilter] = usePersistedState<string>("egdesk_outbound_statusFilter", "ALL");
  const [outboundSortKey, setOutboundSortKey] = usePersistedState<string>("egdesk_outbound_sortKey", "created_at");

  // 엑셀 업로드 직접 처리 (백그라운드 다이렉트 자동 수주 등록)
  const handleExcelUploadDirect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExcelUploading(true);
    try {
      let parsed = await parsePurchaseOrderExcel(file);
      
      let isAutoApprove = false;
      let matchedConfig: any = null;
      try {
        const sigRes = await apiFetch("/api/estimates/excel-signatures");
        const sigData = await sigRes.json();
        if (sigData.success) {
          matchedConfig = sigData.configs?.find(
            (c: any) => c.header_signature === parsed.header_signature
          );
          isAutoApprove = !!matchedConfig;
        }
      } catch (sigErr) {
        console.error("엑셀 자동 승인 시그니처 조회 실패:", sigErr);
      }

      if (isAutoApprove) {
        // 만약 매칭된 설정의 매핑 규칙이 있다면, 직접 입력값을 포함하여 정밀 파싱 수행
        if (matchedConfig && matchedConfig.mapping_info) {
          try {
            const mapping = JSON.parse(matchedConfig.mapping_info);
            const excelRaw = await getExcelColumnsAndRawData(file);
            parsed = parseExcelWithMapping(
              excelRaw.rawRows,
              excelRaw.headerRowIndex,
              mapping,
              file.name
            );
          } catch (parseErr) {
            console.error("저장된 매핑 정보 기반 엑셀 재파싱 실패:", parseErr);
          }
        }

        const finalItems = parsed.items.map(it => ({
          item_code: it.item_code || "",
          product_name: it.product_name,
          spec: it.spec || "",
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
          delivery_date: it.delivery_date || ""
        }));

        const future = new Date();
        future.setDate(future.getDate() + 7);
        const yyyy = future.getFullYear();
        const mm = String(future.getMonth() + 1).padStart(2, "0");
        const dd = String(future.getDate()).padStart(2, "0");
        const defaultDeliveryDate = `${yyyy}-${mm}-${dd}`;

        // 파일 객체를 Base64 데이터 URL로 인코딩하여 저장
        let fileUrl = "";
        try {
          fileUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (e) => reject(e);
          });
        } catch (fileErr) {
          console.error("자동등록 엑셀 파일 Base64 변환 실패:", fileErr);
          fileUrl = file.name || "excel_import.xlsx";
        }

        const payload = {
          partner_name: parsed.partner_name,
          partner_phone: parsed.partner_phone,
          partner_manager: parsed.partner_manager || "",
          items: finalItems,
          file_url: fileUrl,
          business_number: parsed.business_number || "",
          representative: parsed.representative,
          address: parsed.address,
          document_number: parsed.document_number || `SO-${Date.now()}`,
          document_date: parsed.document_date || new Date().toISOString().substring(0, 10),
          delivery_date: defaultDeliveryDate,
          document_memo: `[엑셀 자동등록] ${parsed.document_memo || ""}`,
          approvers: []
        };

        const res = await apiFetch("/api/estimates/ocr-sales-order?action=save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const resData = await res.json();
        
        if (resData.success) {
          alert(`⚡ 동일한 양식 감지: 바이어 발주서가 자동으로 수주 대장에 즉시 등록되었습니다!\n(바이어: ${parsed.partner_name}, 품목수: ${parsed.items.length}개)`);
          window.location.reload();
        } else {
          console.warn("자동등록 API 에러로 수동 모달 폴백:", resData.error);
          setUploadedExcelFile(file);
          setIsSoExcelOpen(true);
        }
      } else {
        setUploadedExcelFile(file);
        setIsSoExcelOpen(true);
      }
    } catch (err) {
      alert("엑셀 파일 로드 및 분석 실패. 포맷을 확인하세요.");
    } finally {
      setIsExcelUploading(false);
      e.target.value = "";
    }
  };
  const [outboundSortDir, setOutboundSortDir] = usePersistedState<"asc" | "desc">("egdesk_outbound_sortDir", "desc");

  // 다중 선택 로컬 상태
  const [selectedOutboundIds, setSelectedOutboundIds] = useState<Set<string>>(new Set());

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
  const filteredOutboundEstimates = estimates
    .filter((e) => e.type === "OUTBOUND")
    .filter((e) => !isStatementEstimate(e.tags || ""))
    .filter((e) => {
      if (!outboundSearch.trim()) return true;
      const term = outboundSearch.toLowerCase();
      return (
        e.partner_name.toLowerCase().includes(term) ||
        e.id.toLowerCase().includes(term) ||
        (e.partner_phone && e.partner_phone.toLowerCase().includes(term)) ||
        (e.partner_manager && e.partner_manager.toLowerCase().includes(term)) ||
        (e.first_item_name && e.first_item_name.toLowerCase().includes(term)) ||
        (e.tags && e.tags.toLowerCase().includes(term)) ||
        (e.sales_order_number && e.sales_order_number.toLowerCase().includes(term)) ||
        ((e as any).item_search_text && (e as any).item_search_text.toLowerCase().includes(term)) ||
        ((e as any).document_memo_search && (e as any).document_memo_search.toLowerCase().includes(term))
      );
    })
    .filter((e) => {
      if (outboundStatusFilter === "ALL") return true;
      const so = salesOrders.find((s) => s.id === e.sales_order_number || s.estimate_id === e.id);
      
      if (outboundStatusFilter === "SENT") {
        return !so;
      }
      if (outboundStatusFilter === "RECEIVED") {
        return so && so.status === "REGISTERED";
      }
      if (outboundStatusFilter === "CONFIRMED") {
        return so && so.status === "CONFIRMED";
      }
      return true;
    })
    .sort((a, b) => {
      const valA = a[outboundSortKey as keyof Estimate] ?? "";
      const valB = b[outboundSortKey as keyof Estimate] ?? "";
      if (typeof valA === "string" && typeof valB === "string") {
        return outboundSortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return outboundSortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

  const filteredOutboundStatements = estimates
    .filter((e) => e.type === "OUTBOUND")
    .filter((e) => isStatementEstimate(e.tags || ""))
    .filter((e) => {
      if (!outboundSearch.trim()) return true;
      const term = outboundSearch.toLowerCase();
      return (
        e.partner_name.toLowerCase().includes(term) ||
        e.id.toLowerCase().includes(term) ||
        (e.partner_phone && e.partner_phone.toLowerCase().includes(term)) ||
        (e.partner_manager && e.partner_manager.toLowerCase().includes(term)) ||
        (e.first_item_name && e.first_item_name.toLowerCase().includes(term)) ||
        (e.tags && e.tags.toLowerCase().includes(term)) ||
        (e.sales_order_number && e.sales_order_number.toLowerCase().includes(term)) ||
        ((e as any).item_search_text && (e as any).item_search_text.toLowerCase().includes(term)) ||
        ((e as any).document_memo_search && (e as any).document_memo_search.toLowerCase().includes(term))
      );
    })
    .filter((e) => {
      if (outboundStatusFilter === "ALL") return true;
      const so = salesOrders.find((s) => s.id === e.sales_order_number || s.estimate_id === e.id);
      
      if (outboundStatusFilter === "SENT") {
        return !so;
      }
      if (outboundStatusFilter === "RECEIVED") {
        return so && so.status === "REGISTERED";
      }
      if (outboundStatusFilter === "CONFIRMED") {
        return so && so.status === "CONFIRMED";
      }
      return true;
    })
    .sort((a, b) => {
      const valA = a[outboundSortKey as keyof Estimate] ?? "";
      const valB = b[outboundSortKey as keyof Estimate] ?? "";
      if (typeof valA === "string" && typeof valB === "string") {
        return outboundSortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return outboundSortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

  const filteredOutboundSOs = salesOrders
    .filter((so) => {
      if (!outboundSearch.trim()) return true;
      const term = outboundSearch.toLowerCase();
      return (
        so.customer_name.toLowerCase().includes(term) ||
        so.id.toLowerCase().includes(term) ||
        (so.customer_phone && so.customer_phone.toLowerCase().includes(term)) ||
        (so.estimate_id && so.estimate_id.toLowerCase().includes(term)) ||
        (so.client_order_no && so.client_order_no.toLowerCase().includes(term)) ||
        ((so as any).item_search_text && (so as any).item_search_text.toLowerCase().includes(term)) ||
        ((so as any).document_memo_search && (so as any).document_memo_search.toLowerCase().includes(term))
      );
    })
    .filter((so) => {
      if (outboundStatusFilter === "ALL") return true;
      return so.status === outboundStatusFilter;
    })
    .sort((a, b) => {
      const valA = a[outboundSortKey as keyof SalesOrder] ?? "";
      const valB = b[outboundSortKey as keyof SalesOrder] ?? "";
      if (typeof valA === "string" && typeof valB === "string") {
        return outboundSortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return outboundSortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

  // 정렬 핸들러
  const handleSort = (key: string) => {
    if (outboundSortKey === key) {
      setOutboundSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOutboundSortKey(key);
      setOutboundSortDir("desc");
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

    let badgeClass = "bg-slate-50 text-slate-650 border-slate-200";
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
    setSelectedOutboundIds(new Set());
  };

  // 일괄 수주확인서 발송 로컬 핸들러
  const handleLocalBulkConfirmSalesOrder = async () => {
    const ids = Array.from(selectedOutboundIds);
    await onBulkConfirmSalesOrder(ids);
    handleClearSelection();
  };

  // 일괄 엑셀 출력 로컬 핸들러
  const handleLocalBulkExportExcel = () => {
    onBulkExportExcel(
      outboundSubTab === "estimates" ? "outbound_est" : "outbound_so",
      selectedOutboundIds
    );
  };

  // 일괄 웹뷰 출력 로컬 핸들러
  const handleLocalBulkExportWebView = () => {
    onBulkExportWebView(
      outboundSubTab === "estimates" ? "outbound_est" : "outbound_so",
      selectedOutboundIds
    );
  };

  return (
    <div className="space-y-6 animate-scale-up">
      {/* 서브 탭 헤더 */}
      <div className="flex border-b border-slate-100 gap-6 pb-2">
        <button
          onClick={() => {
            setOutboundSubTab("estimates");
            setSelectedOutboundIds(new Set());
          }}
          className={`pb-3 font-extrabold text-sm border-b-2 transition-all ${
            outboundSubTab === "estimates"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          🏷️ 보낸 견적서 관리 대장
        </button>
        <button
          onClick={() => {
            setOutboundSubTab("sos");
            setSelectedOutboundIds(new Set());
          }}
          className={`pb-3 font-extrabold text-sm border-b-2 transition-all ${
            outboundSubTab === "sos"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          💼 받은 발주서 관리 대장
        </button>
        <button
          onClick={() => {
            setOutboundSubTab("statements");
            setSelectedOutboundIds(new Set());
          }}
          className={`pb-3 font-extrabold text-sm border-b-2 transition-all ${
            outboundSubTab === "statements"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          📑 보낸 거래명세서 관리 대장
        </button>
      </div>

      {/* 상단 컨트롤 바 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <input
            type="text"
            placeholder={
              outboundSubTab === "estimates"
                ? "바이어명 또는 견적 번호 검색..."
                : outboundSubTab === "statements"
                ? "바이어명 또는 명세서 번호 검색..."
                : "바이어명 또는 수주 번호 검색..."
            }
            value={outboundSearch}
            onChange={(e) => setOutboundSearch(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={outboundStatusFilter}
            onChange={(e) => setOutboundStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm"
          >
            <option value="ALL">모든 상태</option>
            {outboundSubTab === "estimates" ? (
              <>
                <option value="SENT">견적발송</option>
                <option value="RECEIVED">수주등록</option>
                <option value="CONFIRMED">납품완료</option>
              </>
            ) : outboundSubTab === "statements" ? (
              <>
                <option value="SENT">발송완료</option>
                <option value="RECEIVED">수주등록</option>
                <option value="CONFIRMED">납품완료</option>
              </>
            ) : (
              <>
                <option value="REGISTERED">수주등록</option>
                <option value="CONFIRMED">납품완료</option>
              </>
            )}
          </select>

          {outboundSubTab === "estimates" && (
            <>
              <button
                onClick={() => window.open("/estimates/web-view?type=outbound_est", "_blank")}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                (일반)보낸 견적 대장
              </button>
              
              <Link
                href="/estimates/manufacture-webview"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                (제조)보낸 견적 대장
              </Link>

              <Link
                href="/estimates/general-write"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                (일반)견적서 작성
              </Link>

              <Link
                href="/estimates/manufacture-write"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                (제조)견적서 작성
              </Link>

              <button
                onClick={onOpenWriteModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-amber-450" />
                AI 최적 가격 견적서 작성
              </button>
            </>
          )}

          {outboundSubTab === "statements" && (
            <>
              <button
                onClick={() => window.open("/estimates/web-view?type=outbound_est&is_statement=true", "_blank")}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                보낸 거래명세서 대장
              </button>
              <button
                onClick={() => window.open("/estimates/statement-write", "_blank")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-indigo-200" />
                (일반)거래명세서 작성
              </button>
            </>
          )}

          {outboundSubTab === "sos" && (
            <>
              <button
                onClick={() => window.open("/estimates/web-view?type=outbound_so", "_blank")}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                받은 발주 대장
              </button>
              <button
                onClick={() => excelInputRef.current?.click()}
                disabled={isExcelUploading}
                className={`px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isExcelUploading ? "opacity-50 cursor-not-allowed animate-pulse" : ""
                }`}
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                {isExcelUploading ? "엑셀 자동 분석 중..." : "받은 발주서 엑셀 등록"}
              </button>
              <input
                type="file"
                ref={excelInputRef}
                accept=".xlsx,.xls"
                onChange={handleExcelUploadDirect}
                className="hidden"
              />
              <button
                onClick={onOpenOcrModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                📥 받은 발주서 스캔
              </button>
            </>
          )}
        </div>
      </div>

      {/* 대장 테이블 영역 */}
      {outboundSubTab === "estimates" && (
        <div className="overflow-x-auto bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="py-3 px-2 w-[40px]">
                  <input
                    type="checkbox"
                    checked={
                      filteredOutboundEstimates.length > 0 &&
                      filteredOutboundEstimates.every((e) =>
                        selectedOutboundIds.has(e.id)
                      )
                    }
                    onChange={(e) => {
                      const newSelected = new Set(selectedOutboundIds);
                      if (e.target.checked) {
                        filteredOutboundEstimates.forEach((x) =>
                          newSelected.add(x.id)
                        );
                      } else {
                        filteredOutboundEstimates.forEach((x) =>
                          newSelected.delete(x.id)
                        );
                      }
                      setSelectedOutboundIds(newSelected);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("created_at")}
                >
                  등록일시 {outboundSortKey === "created_at" && (outboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("id")}
                >
                  견적 번호 {outboundSortKey === "id" && (outboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">발주등록번호/발주번호</th>
                <th className="py-3 px-2">바이어명</th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("total_amount")}
                >
                  총 견적액 {outboundSortKey === "total_amount" && (outboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">상태</th>
                <th className="py-3 px-2">납기일</th>
                <th className="py-3 px-2 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredOutboundEstimates.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-slate-400 font-semibold"
                  >
                    조건에 맞는 견적 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredOutboundEstimates.map((est) => (
                  <tr key={est.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3.5 px-2">
                      <input
                          type="checkbox"
                          checked={selectedOutboundIds.has(est.id)}
                          onChange={() => {
                            const newSelected = new Set(selectedOutboundIds);
                            if (newSelected.has(est.id)) {
                              newSelected.delete(est.id);
                            } else {
                              newSelected.add(est.id);
                            }
                            setSelectedOutboundIds(newSelected);
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
                        className="text-indigo-600 hover:underline cursor-pointer font-bold text-left"
                      >
                        {est.id}
                      </button>
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-700">
                      {est.type === 'OUTBOUND' && est.direction_status === 'RECEIVED' ? (
                        <span className="font-bold text-slate-800">
                          {est.sales_order_number || <span className="text-slate-400">-</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
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
                    <td className="py-3.5 px-2 text-indigo-605 font-bold">
                      {est.total_amount.toLocaleString()}원
                    </td>
                    <td className="py-3.5 px-2">
                      {(() => {
                        const so = salesOrders.find((s) => s.id === est.sales_order_number || s.estimate_id === est.id);
                        if (so) {
                          return so.status === "CONFIRMED" ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-green-100 text-green-600 border border-green-200">
                              납품완료
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-600 border border-blue-200">
                              수주등록
                            </span>
                          );
                        }
                        return (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-600 border border-amber-200">
                            견적발송
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 font-medium">
                      {parseEstimateMetadata(est.tags || "").delivery_date || "-"}
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
                          const so = salesOrders.find((s) => s.id === est.sales_order_number || s.estimate_id === est.id);
                          if (!so) {
                            return (
                              <button
                                onClick={() => onConvertToSo(est)}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-black flex items-center gap-0.5"
                              >
                                수주 전환 <ChevronRight className="w-3 h-3" />
                              </button>
                            );
                          }
                          return null;
                        })()}
                        {est.is_pending_delete ? (
                          <span className="px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black border border-amber-100 inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> 결재 대기 중
                          </span>
                        ) : (
                          <button
                            onClick={() => onDeleteEstimate(est)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-[10px] font-black border border-red-100 hover:border-red-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="견적서 삭제"
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

      {outboundSubTab === "statements" && (
        <div className="overflow-x-auto bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="py-3 px-2 w-[40px]">
                  <input
                    type="checkbox"
                    checked={
                      filteredOutboundStatements.length > 0 &&
                      filteredOutboundStatements.every((e) =>
                        selectedOutboundIds.has(e.id)
                      )
                    }
                    onChange={(e) => {
                      const newSelected = new Set(selectedOutboundIds);
                      if (e.target.checked) {
                        filteredOutboundStatements.forEach((x) =>
                          newSelected.add(x.id)
                        );
                      } else {
                        filteredOutboundStatements.forEach((x) =>
                          newSelected.delete(x.id)
                        );
                      }
                      setSelectedOutboundIds(newSelected);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("created_at")}
                >
                  등록일시 {outboundSortKey === "created_at" && (outboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("id")}
                >
                  명세서 번호 {outboundSortKey === "id" && (outboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">발주등록번호/발주번호</th>
                <th className="py-3 px-2">바이어명</th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("total_amount")}
                >
                  총 명세 금액 {outboundSortKey === "total_amount" && (outboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">상태</th>
                <th className="py-3 px-2">납기일</th>
                <th className="py-3 px-2 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredOutboundStatements.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-slate-400 font-semibold"
                  >
                    조건에 맞는 거래명세 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredOutboundStatements.map((est) => (
                  <tr key={est.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3.5 px-2">
                      <input
                          type="checkbox"
                          checked={selectedOutboundIds.has(est.id)}
                          onChange={() => {
                            const newSelected = new Set(selectedOutboundIds);
                            if (newSelected.has(est.id)) {
                              newSelected.delete(est.id);
                            } else {
                              newSelected.add(est.id);
                            }
                            setSelectedOutboundIds(newSelected);
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
                        className="text-indigo-600 hover:underline cursor-pointer font-bold text-left"
                      >
                        {est.id}
                      </button>
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-700">
                      {est.type === 'OUTBOUND' && est.direction_status === 'RECEIVED' ? (
                        <span className="font-bold text-slate-800">
                          {est.sales_order_number || <span className="text-slate-400">-</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
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
                    <td className="py-3.5 px-2 text-indigo-655 font-bold">
                      {est.total_amount.toLocaleString()}원
                    </td>
                    <td className="py-3.5 px-2">
                      {(() => {
                        const so = salesOrders.find((s) => s.id === est.sales_order_number || s.estimate_id === est.id);
                        if (so) {
                          return so.status === "CONFIRMED" ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-green-100 text-green-600 border border-green-200">
                              납품완료
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-600 border border-blue-200">
                              수주등록
                            </span>
                          );
                        }
                        return (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-600 border border-amber-200">
                            발송완료
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-2 text-slate-505 font-medium">
                      {parseEstimateMetadata(est.tags || "").delivery_date || "-"}
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => onOpenDetailModal(est.id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black border border-slate-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="상세 열람"
                        >
                          <Eye className="w-3.5 h-3.5" /> 상세
                        </button>
                        
                        {est.is_pending_delete ? (
                          <span className="px-2 py-1.5 text-[9px] font-extrabold bg-amber-50 text-amber-700 rounded-lg border border-amber-100 animate-pulse">
                            결재 대기 중
                          </span>
                        ) : (
                          <button
                            onClick={() => onDeleteEstimate(est)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-[10px] font-black border border-red-100 hover:border-red-200 transition-all inline-flex items-center gap-1 cursor-pointer"
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

      {outboundSubTab === "sos" && (
        <div className="overflow-x-auto bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="py-3 px-2 w-[40px]">
                  <input
                    type="checkbox"
                    checked={
                      filteredOutboundSOs.length > 0 &&
                      filteredOutboundSOs.every((s) => selectedOutboundIds.has(s.id))
                    }
                    onChange={(e) => {
                      const newSelected = new Set(selectedOutboundIds);
                      if (e.target.checked) {
                        filteredOutboundSOs.forEach((x) => newSelected.add(x.id));
                      } else {
                        filteredOutboundSOs.forEach((x) => newSelected.delete(x.id));
                      }
                      setSelectedOutboundIds(newSelected);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("created_at")}
                >
                  등록일시 {outboundSortKey === "created_at" && (outboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">발주번호</th>
                <th className="py-3 px-2">발주등록번호/견적번호</th>
                <th className="py-3 px-2">바이어명</th>
                <th
                  className="py-3 px-2 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort("total_amount")}
                >
                  총 수주액 {outboundSortKey === "total_amount" && (outboundSortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-3 px-2">상태</th>
                <th className="py-3 px-2">납기일</th>
                <th className="py-3 px-2 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredOutboundSOs.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-slate-400 font-semibold"
                  >
                    조건에 맞는 수주 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredOutboundSOs.map((so) => (
                  <tr key={so.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3.5 px-2">
                      <input
                        type="checkbox"
                        checked={selectedOutboundIds.has(so.id)}
                        onChange={() => {
                          const newSelected = new Set(selectedOutboundIds);
                          if (newSelected.has(so.id)) {
                            newSelected.delete(so.id);
                          } else {
                            newSelected.add(so.id);
                          }
                          setSelectedOutboundIds(newSelected);
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 font-medium">
                      <div className="flex flex-col">
                        <span>{so.created_at ? (so.created_at.length <= 10 ? `${so.created_at} 00:00:00` : so.created_at.substring(0, 19)) : "-"}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5" title="내부 수주 번호">
                          💼 {so.id}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-700">
                      {so.client_order_no || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-700">
                      <button
                        onClick={() => onOpenDetailModal(so.estimate_id)}
                        className="text-indigo-600 hover:underline cursor-pointer font-bold text-left"
                      >
                        {so.estimate_id}
                      </button>
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800">
                          {so.customer_name}
                        </span>
                        {(() => {
                          const est = estimates.find((e) => e.id === so.estimate_id);
                          return est ? getTransactionTypeBadge(est.tags || "") : null;
                        })()}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {so.customer_phone}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-indigo-600 font-bold">
                      {so.total_amount.toLocaleString()}원
                    </td>
                    <td className="py-3.5 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                          so.status === "REGISTERED"
                            ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}
                      >
                        {so.status === "REGISTERED" ? "수주등록" : "확인완료"}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 font-medium">
                      {so.delivery_date || "-"}
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenDetailModal(so.estimate_id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> 견적상세
                        </button>
                        {so.status === "REGISTERED" ? (
                          <button
                            onClick={() => onConfirmSalesOrder(so)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-md"
                          >
                            수주확인서 발송
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 수주 확인 메일 완료
                          </span>
                        )}
                        {so.is_pending_delete ? (
                          <span className="px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black border border-amber-100 inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> 결재 대기 중
                          </span>
                        ) : (
                          <button
                            onClick={() => onDeleteSalesOrder(so)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-[10px] font-black border border-red-100 hover:border-red-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="수주 등록 건 삭제"
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

      {/* 일괄 작업 플로팅 바 */}
      {selectedOutboundIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl flex items-center gap-6 shadow-2xl border border-slate-800 z-40 animate-scale-up">
          <span className="text-xs font-bold text-indigo-350">
            📦 {selectedOutboundIds.size}건의 항목 선택됨
          </span>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex gap-2">
            {outboundSubTab === "sos" && (
              <button
                onClick={handleLocalBulkConfirmSalesOrder}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition-all"
              >
                선택 일괄 수주확인서 발송
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
      {/* 바이어 발주서 엑셀 검토 등록 모달 */}
      <SalesOrderExcelModal
        isOpen={isSoExcelOpen}
        onClose={() => {
          setIsSoExcelOpen(false);
          setPreParsedExcelData(null);
          setUploadedExcelFile(null);
        }}
        onSuccess={() => {
          window.location.reload();
        }}
        preParsedData={preParsedExcelData}
        uploadedFile={uploadedExcelFile}
      />
    </div>
  );
}
