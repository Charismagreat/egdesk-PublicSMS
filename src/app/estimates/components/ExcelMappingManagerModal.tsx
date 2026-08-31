"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Settings2,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  User,
  Phone,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  Package,
  Hash,
  RefreshCw
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface ExcelMappingTemplate {
  id: number | string;
  partner_name?: string;
  transaction_type?: string;
  header_signature: string;
  mapping_info: string;
  is_auto_approve: number | boolean;
  created_at?: string;
  updated_at?: string;
}

interface ExcelMappingManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function ExcelMappingManagerModal({
  isOpen,
  onClose,
  onRefresh
}: ExcelMappingManagerModalProps) {
  const [templates, setTemplates] = useState<ExcelMappingTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExcelMappingTemplate | null>(null);
  const [editPartnerName, setEditPartnerName] = useState("");
  const [editTransactionType, setEditTransactionType] = useState("자재구매");
  const [editIsAutoApprove, setEditIsAutoApprove] = useState(true);
  const [editMapping, setEditMapping] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 템플릿 목록 로드
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/estimates/excel-signatures?_t=${Date.now()}`);
      const data = await res.json();
      if (data.success && data.configs) {
        setTemplates(data.configs);
        if (data.configs.length > 0) {
          const currentId = selectedTemplate?.id;
          const found = data.configs.find((c: any) => c.id === currentId);
          selectTemplate(found || data.configs[0]);
        } else {
          setSelectedTemplate(null);
        }
      }
    } catch (e) {
      console.error("엑셀 매핑 서식 목록 로드 실패:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const selectTemplate = (tpl: ExcelMappingTemplate) => {
    setSelectedTemplate(tpl);
    setEditPartnerName(tpl.partner_name || "");
    setEditTransactionType(tpl.transaction_type || "자재구매");
    setEditIsAutoApprove(String(tpl.is_auto_approve) === "1" || tpl.is_auto_approve === true);

    let parsedMap: Record<string, string> = {};
    if (tpl.mapping_info) {
      try {
        parsedMap = typeof tpl.mapping_info === "string" ? JSON.parse(tpl.mapping_info) : tpl.mapping_info;
      } catch (e) {
        console.error("mapping_info 파싱 오류:", e);
      }
    }
    setEditMapping(parsedMap);
  };

  // 시그니처에서 추출한 엑셀 헤더 열 목록
  const signatureHeaders = React.useMemo(() => {
    if (!selectedTemplate?.header_signature) return [];
    return selectedTemplate.header_signature.split("|").filter(Boolean);
  }, [selectedTemplate]);

  // 저장 처리
  const handleSave = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    try {
      const payload = {
        id: selectedTemplate.id,
        partner_name: editPartnerName,
        transaction_type: editTransactionType,
        is_auto_approve: editIsAutoApprove ? 1 : 0,
        mapping_info: editMapping
      };

      const res = await apiFetch("/api/estimates/excel-signatures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (resData.success) {
        alert("✅ 거래처 엑셀 서식 매핑 규칙이 성공적으로 저장 및 갱신되었습니다!");
        loadTemplates();
        if (onRefresh) onRefresh();
      } else {
        alert(`저장 실패: ${resData.error}`);
      }
    } catch (e: any) {
      alert(`오류 발생: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 템플릿 삭제 (초기화)
  const handleDelete = async (tpl: ExcelMappingTemplate) => {
    if (!confirm(`정말로 [${tpl.partner_name || "미지정 거래처"}] 엑셀 매핑 규칙을 삭제(초기화)하시겠습니까?\n삭제 후 해당 거래처 엑셀을 업로드하면 신규 서식 학습 창이 뜹니다.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/estimates/excel-signatures?id=${tpl.id}`, {
        method: "DELETE"
      });
      const resData = await res.json();
      if (resData.success) {
        alert("🗑️ 엑셀 매핑 규칙이 성공적으로 초기화되었습니다.");
        loadTemplates();
        if (onRefresh) onRefresh();
      } else {
        alert(`삭제 실패: ${resData.error}`);
      }
    } catch (e: any) {
      alert(`삭제 중 오류: ${e.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[88vh] max-h-[860px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  거래처별 AI 엑셀 서식 매핑 규칙 관리자
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black border border-emerald-200">
                  학습된 서식 {templates.length}개
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                바이어 발주서의 열 매핑(품목명, 품목코드, 단가, 수량 등)을 직접 검토하고 수정하거나 삭제할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadTemplates}
              className="p-2 hover:bg-slate-200/80 rounded-xl text-slate-500 hover:text-slate-800 transition-colors border-none bg-transparent cursor-pointer"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-200/80 rounded-xl text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 바디: 좌측 서식 목록 + 우측 매핑 설정 패널 */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100/60 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* 좌측 패널: 등록된 거래처 템플릿 목록 (32% 너비) */}
          <div className="md:w-[32%] flex flex-col bg-white p-4 overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                학습된 엑셀 서식 목록
              </span>
            </div>

            {templates.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <FileSpreadsheet className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs font-bold">등록된 엑셀 서식 매핑이 없습니다.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  [AI 엑셀 서식 매핑 & 수주 등록]으로 발주서를 업로드하면 자동으로 서식이 학습됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate?.id === tpl.id;
                  const isAuto = String(tpl.is_auto_approve) === "1" || tpl.is_auto_approve === true;
                  const colCount = tpl.header_signature.split("|").filter(Boolean).length;

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => selectTemplate(tpl)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? "bg-emerald-50/80 border-emerald-400 shadow-sm ring-2 ring-emerald-100"
                          : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-800 truncate">
                              {tpl.partner_name || "미지정 바이어"}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {tpl.transaction_type || "자재구매"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            열 {colCount}개 · {tpl.updated_at ? tpl.updated_at.substring(0, 10) : "최근 학습"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                              isAuto
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {isAuto ? "자동적용" : "수동검토"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(tpl);
                            }}
                            className="p-1 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                            title="매핑 규칙 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 우측 패널: 선택된 템플릿 매핑 상세 편집기 (68% 너비) */}
          <div className="flex-1 md:w-[68%] flex flex-col bg-slate-50/70 p-5 overflow-y-auto scrollbar-thin">
            {selectedTemplate ? (
              <div className="space-y-5">
                {/* 1. 기본 메타데이터 설정 카드 */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      기본 바이어 및 거래 구분 설정
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">자동 수주 등록 활성화:</span>
                      <button
                        type="button"
                        onClick={() => setEditIsAutoApprove(!editIsAutoApprove)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer ${
                          editIsAutoApprove
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                            : "bg-slate-200 text-slate-600 border-slate-300"
                        }`}
                      >
                        {editIsAutoApprove ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ON (원터치 자동등록)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>OFF (매번 수동 검토)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        거래처 / 바이어명
                      </label>
                      <input
                        type="text"
                        value={editPartnerName}
                        onChange={(e) => setEditPartnerName(e.target.value)}
                        placeholder="예: 엘에스일렉트릭(주)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        거래 품목 구분
                      </label>
                      <select
                        value={editTransactionType}
                        onChange={(e) => setEditTransactionType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all"
                      >
                        <option value="자재구매">자재구매 (원부자재)</option>
                        <option value="완제품구매">완제품구매</option>
                        <option value="임가공">임가공</option>
                        <option value="외주작업">외주작업</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. 엑셀 원본 헤더 열 시그니처 뷰어 */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      인식된 엑셀 헤더 컬럼 목록 ({signatureHeaders.length}개)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Header Signature</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl max-h-24 overflow-y-auto scrollbar-thin flex flex-wrap gap-1.5">
                    {signatureHeaders.map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[10px] font-mono border border-slate-700"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. 세부 품목 및 데이터 매핑 필드 그리드 */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      10대 핵심 필드별 엑셀 열 매핑 지정
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      💡 잘못 매핑된 항목을 원본 엑셀 컬럼명으로 변경하세요.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* 품목코드 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-blue-600" />
                          품목코드 (Item Code)
                        </span>
                        <span className="text-[10px] text-rose-500 font-black">필수</span>
                      </div>
                      <select
                        value={editMapping["item_code"] || ""}
                        onChange={(e) => setEditMapping((prev) => ({ ...prev, item_code: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 매핑 안 함 --</option>
                        {signatureHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 품목명 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-emerald-600" />
                          품목명 (Product Name)
                        </span>
                        <span className="text-[10px] text-rose-500 font-black">필수</span>
                      </div>
                      <select
                        value={editMapping["product_name"] || ""}
                        onChange={(e) => setEditMapping((prev) => ({ ...prev, product_name: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 매핑 안 함 --</option>
                        {signatureHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 규격 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          규격 / 도번 / 사양 (Spec)
                        </span>
                      </div>
                      <select
                        value={editMapping["spec"] || ""}
                        onChange={(e) => setEditMapping((prev) => ({ ...prev, spec: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 매핑 안 함 --</option>
                        {signatureHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 주문수량 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          주문수량 (Quantity)
                        </span>
                        <span className="text-[10px] text-rose-500 font-black">필수</span>
                      </div>
                      <select
                        value={editMapping["quantity"] || ""}
                        onChange={(e) => setEditMapping((prev) => ({ ...prev, quantity: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 매핑 안 함 --</option>
                        {signatureHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 구매단가 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          구매단가 (Unit Price)
                        </span>
                        <span className="text-[10px] text-rose-500 font-black">필수</span>
                      </div>
                      <select
                        value={editMapping["unit_price"] || ""}
                        onChange={(e) => setEditMapping((prev) => ({ ...prev, unit_price: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 매핑 안 함 --</option>
                        {signatureHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 납기일자 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          납기일자 (Delivery Date)
                        </span>
                      </div>
                      <select
                        value={editMapping["delivery_date"] || ""}
                        onChange={(e) => setEditMapping((prev) => ({ ...prev, delivery_date: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 매핑 안 함 --</option>
                        {signatureHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 고객발주번호/주문번호 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-600" />
                          고객발주번호 / 주문번호
                        </span>
                      </div>
                      <select
                        value={editMapping["document_number"] || ""}
                        onChange={(e) => setEditMapping((prev) => ({ ...prev, document_number: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 매핑 안 함 --</option>
                        {signatureHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 발주일자 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-600" />
                          발주일자 (Order Date)
                        </span>
                      </div>
                      <select
                        value={editMapping["document_date"] || ""}
                        onChange={(e) => setEditMapping((prev) => ({ ...prev, document_date: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 매핑 안 함 --</option>
                        {signatureHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 바이어 담당자 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-600" />
                          바이어 발주 담당자
                        </span>
                      </div>
                      <select
                        value={editMapping["partner_manager"] || ""}
                        onChange={(e) => setEditMapping((prev) => ({ ...prev, partner_manager: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 매핑 안 함 --</option>
                        {signatureHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 바이어 연락처 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-600" />
                          바이어 연락처 / 전화번호
                        </span>
                      </div>
                      <select
                        value={editMapping["partner_phone"] || ""}
                        onChange={(e) => setEditMapping((prev) => ({ ...prev, partner_phone: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- 매핑 안 함 --</option>
                        {signatureHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Settings2 className="w-12 h-12 mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-600">선택된 서식 템플릿이 없습니다.</p>
                <p className="text-xs text-slate-400 mt-1">좌측 목록에서 편집할 거래처 엑셀 서식을 선택하세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* 모달 하단 푸터 액션 바 */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>수정 후 저장 시 <strong>다음 엑셀 업로드부터 해당 매핑 규칙이 즉시 적용</strong>됩니다.</span>
          </div>

          <div className="flex items-center gap-2.5">
            {selectedTemplate && (
              <button
                type="button"
                onClick={() => handleDelete(selectedTemplate)}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>이 서식 삭제 (초기화)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              닫기
            </button>
            {selectedTemplate && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer border-none disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "저장 중..." : "매핑 규칙 저장 및 반영 💾"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
