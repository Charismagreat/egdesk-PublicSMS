"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { apiFetch } from "@/lib/api";
import { 
  Truck, Search, Plus, FileText, CheckCircle2, AlertCircle, 
  Upload, Paperclip, Download, RefreshCw, Trash2, ShieldCheck, 
  DollarSign, PackageCheck, Calendar, ArrowRight, ExternalLink
} from "lucide-react";

interface ImportItem {
  id: string | number;
  so_number?: string; // 통관 관리 번호 / B/L 번호
  partner_name?: string;
  item_name?: string;
  quantity?: number;
  currency?: string;
  declared_amount?: number;
  customs_duty?: number;
  vat_amount?: number;
  clearance_date?: string;
  status?: string;
  file_path?: string;
  memo?: string;
  created_at?: string;
}

export default function ImportCustomsPage() {
  const [imports, setImports] = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestored, setIsRestored] = useState(false);

  // 브라우저 sessionStorage와 연동되는 검색 및 탭 상태 보존
  const [searchQuery, setSearchQuery] = usePersistedState<string>("import_customs_search", "");
  const [activeFilter, setActiveFilter] = usePersistedState<string>("import_customs_filter", "ALL");

  // 서류 스캔 & 수입 통관 등록 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  
  // 폼 입력 상태
  const [soNumber, setSoNumber] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [declaredAmount, setDeclaredAmount] = useState("5000000");
  const [customsDuty, setCustomsDuty] = useState("400000");
  const [vatAmount, setVatAmount] = useState("540000");
  const [clearanceDate, setClearanceDate] = useState(new Date().toISOString().substring(0, 10));
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 수입 통관 목록 페칭
  const fetchImports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/import-customs");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setImports(data.items);
        }
      }
    } catch (err) {
      console.error("Failed to fetch import customs list:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImports();
    setIsRestored(true);
  }, [fetchImports]);

  // AI OCR 수입통관 서류 스캔 판독
  const handleFileOcrScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileToUpload(file);
    setIsOcrLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await apiFetch("/api/import-customs/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            fileData: base64
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.ocrResult) {
            const r = data.ocrResult;
            if (r.so_number) setSoNumber(r.so_number);
            if (r.partner_name) setPartnerName(r.partner_name);
            if (r.item_name) setItemName(r.item_name);
            if (r.quantity) setQuantity(String(r.quantity));
            if (r.declared_amount) setDeclaredAmount(String(r.declared_amount));
            if (r.customs_duty) setCustomsDuty(String(r.customs_duty));
            if (r.vat_amount) setVatAmount(String(r.vat_amount));
            if (r.clearance_date) setClearanceDate(r.clearance_date);
            alert("🎉 AI OCR 수입 통관 서류 자동 스캔 분석이 완료되었습니다!");
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("OCR Scan Error:", err);
      alert("서류 스캔 중 오류가 발생했습니다.");
    } finally {
      setIsOcrLoading(false);
    }
  };

  // 신규 수입 통관 등록
  const handleSubmitImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !declaredAmount) {
      alert("품명과 과세 가격을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      let fileDataBase64 = "";
      let fileName = "";
      if (fileToUpload) {
        fileName = fileToUpload.name;
        const reader = new FileReader();
        fileDataBase64 = await new Promise((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(fileToUpload);
        });
      }

      const res = await apiFetch("/api/import-customs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          so_number: soNumber || `IMP-${Date.now()}`,
          partner_name: partnerName || "해외 무역 거래처",
          item_name: itemName,
          quantity: Number(quantity) || 1,
          declared_amount: Number(declaredAmount) || 0,
          customs_duty: Number(customsDuty) || 0,
          vat_amount: Number(vatAmount) || 0,
          clearance_date: clearanceDate,
          status: "통관완료",
          memo,
          fileName,
          fileData: fileDataBase64
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert("🟢 수입 통관 데이터가 성공적으로 등록되었습니다.");
          setIsModalOpen(false);
          resetForm();
          fetchImports();
        } else {
          alert(data.error || "등록 실패");
        }
      }
    } catch (err) {
      console.error("Failed to submit import customs:", err);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 소프트 삭제
  const handleDeleteImport = async (soNumberToDelete: string) => {
    if (!window.confirm("해당 수입 통관 데이터를 소프트 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/import-customs?so_number=${soNumberToDelete}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("삭제되었습니다.");
        fetchImports();
      }
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  const resetForm = () => {
    setSoNumber("");
    setPartnerName("");
    setItemName("");
    setQuantity("100");
    setDeclaredAmount("5000000");
    setCustomsDuty("400000");
    setVatAmount("540000");
    setMemo("");
    setFileToUpload(null);
  };

  // 검색 및 필터링 적용
  const filteredImports = imports.filter((item) => {
    if (activeFilter === "COMPLETED" && item.status !== "통관완료") return false;
    if (activeFilter === "IN_PROGRESS" && item.status === "통관완료") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.so_number || "").toLowerCase().includes(q) ||
      (item.partner_name || "").toLowerCase().includes(q) ||
      (item.item_name || "").toLowerCase().includes(q) ||
      (item.memo || "").toLowerCase().includes(q)
    );
  });

  // 집계 수치 계산
  const totalCount = imports.length;
  const completedCount = imports.filter((i) => i.status === "통관완료").length;
  const totalDeclaredAmount = imports.reduce((sum, i) => sum + (Number(i.declared_amount) || 0), 0);
  const totalCustomsDuty = imports.reduce((sum, i) => sum + (Number(i.customs_duty) || 0), 0);

  return (
    <div className="w-full px-4 md:px-8 py-6 space-y-6 bg-slate-50 min-h-screen text-left">
      {/* 1. 헤더 타이틀 영역 (NEW PAGE UI RULES 표준 규격 준수) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Truck className="w-8 h-8 text-indigo-600 shrink-0" />
            <span>수입 통관 AI</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            해외 수입 물품의 세관 통관 서류 AI OCR 자동 파싱, 관세/부가세 지출 및 재고 연동 대장
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchImports}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all cursor-pointer shadow-3xs"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            <span>수입 통관 서류 등록 (AI OCR)</span>
          </button>
        </div>
      </div>

      {/* 2. 대형 요약 KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">총 수입 통관 건수</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{totalCount}건</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">통관 완료 건수</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{completedCount}건</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">누적 수입 신고 총액</span>
            <span className="text-xl font-black text-slate-800 mt-1 block">{totalDeclaredAmount.toLocaleString()}원</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">누적 지출 관세액</span>
            <span className="text-xl font-black text-amber-600 mt-1 block">{totalCustomsDuty.toLocaleString()}원</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. 검색 바 및 세그먼트 필터 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 w-full md:w-auto">
          {[
            { id: "ALL", label: "전체 목록" },
            { id: "COMPLETED", label: "통관 완료" },
            { id: "IN_PROGRESS", label: "통관 진행 중" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer whitespace-nowrap flex-1 md:flex-none ${
                activeFilter === tab.id
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 bg-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="통관번호, 거래처, 품명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. 수입 통관 대장 메인 테이블 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading && !isRestored ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            <p className="text-xs font-bold">수입 통관 대장을 불러오는 중입니다...</p>
          </div>
        ) : filteredImports.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">등록된 수입 통관 데이터가 없습니다.</p>
            <p className="text-xs text-slate-400">상단 '수입 통관 서류 등록' 버튼을 눌러 PDF/이미지를 업로드해 주세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">통관 / B/L 번호</th>
                  <th className="py-3.5 px-4">무역 거래처</th>
                  <th className="py-3.5 px-4">수입 품명</th>
                  <th className="py-3.5 px-4 text-right">수량</th>
                  <th className="py-3.5 px-4 text-right">신고 금액 (과세)</th>
                  <th className="py-3.5 px-4 text-right">관세 / 부부가세</th>
                  <th className="py-3.5 px-4">통관 완료일</th>
                  <th className="py-3.5 px-4 text-center">상태</th>
                  <th className="py-3.5 px-4 text-center">첨부 서류</th>
                  <th className="py-3.5 px-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredImports.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-indigo-650">
                      {item.so_number || `IMP-${item.id}`}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {item.partner_name || "해외 거래처"}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-850">
                      {item.item_name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      {item.quantity ? `${item.quantity.toLocaleString()}개` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-800">
                      {item.declared_amount ? `${Number(item.declared_amount).toLocaleString()}원` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-700">
                      <div>관세: {Number(item.customs_duty || 0).toLocaleString()}원</div>
                      <div className="text-[10px] text-slate-400">부가세: {Number(item.vat_amount || 0).toLocaleString()}원</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-600">
                      {item.clearance_date || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        item.status === "통관완료"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          : "bg-amber-50 text-amber-700 border border-amber-200/60"
                      }`}>
                        {item.status || "진행중"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.file_path ? (
                        <a
                          href={`/api/shared/files?tableName=import_master&rowId=${item.id}&columnName=file_path`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px] font-bold text-decoration-none transition-all shadow-3xs"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>서류 열기</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteImport(String(item.so_number))}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. 수입 통관 서류 등록 및 AI OCR 판독 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-800">수입 통관 서류 등록 (AI OCR)</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* AI OCR 서류 업로드 구역 */}
            <div className="bg-indigo-50/60 border border-dashed border-indigo-200 rounded-2xl p-4 text-center space-y-2">
              <Upload className="w-6 h-6 text-indigo-600 mx-auto" />
              <span className="text-xs font-black text-indigo-900 block">수입 통관 / B/L / 관세 명세서 파일 선택</span>
              <p className="text-[11px] text-indigo-600/80 font-medium">
                PDF 또는 서류 사진을 올리시면 AI가 품명, 금액, 관세, 통관일자를 자동 추출합니다.
              </p>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileOcrScan}
                className="hidden"
                id="customs-file-input"
              />
              <label
                htmlFor="customs-file-input"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer transition-all shadow-3xs"
              >
                {isOcrLoading ? "AI OCR 판독 중..." : "파일 선택 & 스캔 판독"}
              </label>
            </div>

            {/* 폼 상세 입력 */}
            <form onSubmit={handleSubmitImport} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">통관 / B/L 번호</label>
                  <input
                    type="text"
                    value={soNumber}
                    onChange={(e) => setSoNumber(e.target.value)}
                    placeholder="예: IMP-2026-0630"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">무역 거래처</label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="예: 동우일렉트릭"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">수입 품명 *</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="예: 수입 고정밀 커넥터 자재"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-extrabold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">수량</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">신고 금액 (과세) *</label>
                  <input
                    type="number"
                    required
                    value={declaredAmount}
                    onChange={(e) => setDeclaredAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">관세액</label>
                  <input
                    type="number"
                    value={customsDuty}
                    onChange={(e) => setCustomsDuty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">부가세액</label>
                  <input
                    type="number"
                    value={vatAmount}
                    onChange={(e) => setVatAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">통관 완료일</label>
                <input
                  type="date"
                  value={clearanceDate}
                  onChange={(e) => setClearanceDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">비고 / 메모</label>
                <textarea
                  rows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="통관 부대비용 및 물류 메모"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl border-none cursor-pointer shadow-xs"
                >
                  {isSubmitting ? "등록 중..." : "수입 통관 대장 적재"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
