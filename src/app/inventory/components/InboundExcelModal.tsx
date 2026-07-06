"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle2, Loader2, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { 
  getExcelColumnsAndRawData, 
  parseInboundExcelWithMapping, 
  InboundExcelParsedResult 
} from "../utils/inbound-excel";

interface InboundExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function InboundExcelModal({
  isOpen,
  onClose,
  onSuccess
}: InboundExcelModalProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "review">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [fileObject, setFileObject] = useState<File | null>(null);

  // 엑셀 원시 데이터
  const [excelData, setExcelData] = useState<{
    columns: string[];
    rawRows: any[][];
    headerRowIndex: number;
  } | null>(null);

  // 매핑 필드 설정 (열 인덱스를 문자열 또는 숫자로 보관)
  const [mapping, setMapping] = useState({
    item_name: "",
    item_code: "",
    barcode: "",
    spec: "",
    quantity: "",
    unit_price: "",
    unit_type: "",
    box_contains: "",
    item_type: "",
    category: "",
    location: "",
    note: "",
    partner_name: "",
    inbound_date: ""
  });

  // 수동 입력 고정값 보관 (직접입력 -2 선택 시 활용)
  const [directInputs, setDirectInputs] = useState({
    item_name: "",
    item_code: "",
    barcode: "",
    spec: "",
    quantity: "1",
    unit_price: "0",
    unit_type: "개",
    box_contains: "1",
    item_type: "자재",
    category: "기타",
    location: "자율입고창고",
    note: "",
    partner_name: "일반공급처",
    inbound_date: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  });

  const handleDirectInputChange = (field: string, value: string) => {
    setDirectInputs(prev => ({ ...prev, [field]: value }));
  };

  // 최종 파싱 결과
  const [parsedResult, setParsedResult] = useState<InboundExcelParsedResult | null>(null);
  const [rememberFormat, setRememberFormat] = useState(true);

  if (!isOpen) return null;

  // 1. 파일 업로드 및 기본 컬럼 스캔
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setFilename(file.name);
    setFileObject(file);

    try {
      // A. 먼저 기존 시그니처 체크로 바로 통과되는지 조회해봅니다.
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      let detectedHeaderIndex = -1;
      let headers: string[] = [];

      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (row && row.length > 0) {
          const rowText = row.map(v => String(v || "").trim());
          const hasCore = rowText.some(v => 
            v.includes("품명") || v.includes("상품명") || v.includes("품목명") || 
            v.includes("바코드") || v.includes("수량") || v.includes("단가")
          );
          if (hasCore && detectedHeaderIndex === -1) {
            detectedHeaderIndex = r;
            headers = rowText.filter(Boolean);
            break;
          }
        }
      }

      if (detectedHeaderIndex === -1 && rawRows.length > 0) {
        detectedHeaderIndex = 0;
        headers = rawRows[0].map(v => String(v || "").trim()).filter(Boolean);
      }

      const sig = headers.join('|');

      // B. API에 해당 시그니처가 등록되어 있는지 대사
      const sigRes = await apiFetch("/api/inventory/inbounds/excel-signatures");
      const sigData = await sigRes.json();
      
      let matchedConfig: any = null;
      if (sigData.success) {
        matchedConfig = sigData.configs?.find((c: any) => c.header_signature === sig);
      }

      const excelMeta = await getExcelColumnsAndRawData(file);
      setExcelData({
        columns: excelMeta.headers,
        rawRows: excelMeta.rawRows,
        headerRowIndex: excelMeta.headerRowIndex
      });

      if (matchedConfig) {
        // 이미 저장된 매핑 규칙이 있다면 바로 Step 3: 리뷰 모드로 자동 도약
        const configMapping = JSON.parse(matchedConfig.mapping_info);
        if (configMapping.direct_values) {
          setDirectInputs(prev => ({ ...prev, ...configMapping.direct_values }));
        }
        const result = parseInboundExcelWithMapping(
          excelMeta.rawRows,
          excelMeta.headerRowIndex,
          configMapping,
          file.name
        );
        setParsedResult(result);
        setStep("review");
      } else {
        // 처음 본 양식인 경우 Step 2: 수동 매핑 모드로 진입
        // 초기 매핑값 자동 감지 시도
        const newMapping = {
          item_name: String(excelMeta.headers.findIndex(h => h.includes("품명") || h.includes("상품명") || h.includes("품목명") || h.includes("자재명") || h.includes("자재명칭"))),
          item_code: String(excelMeta.headers.findIndex(h => h.includes("품목코드") || h.includes("코드") || h.includes("code") || h.includes("자재코드"))),
          barcode: String(excelMeta.headers.findIndex(h => h.includes("바코드") || h.includes("barcode"))),
          spec: String(excelMeta.headers.findIndex(h => h.includes("규격") || h.includes("사양") || h.includes("spec") || h.includes("Spec"))),
          quantity: String(excelMeta.headers.findIndex(h => h.includes("수량") || h.includes("수") || h.includes("qty") || h.includes("Qty"))),
          unit_price: String(excelMeta.headers.findIndex(h => h.includes("단가") || h.includes("금액") || h.includes("가격") || h.includes("price") || h.includes("Price"))),
          unit_type: String(excelMeta.headers.findIndex(h => h.includes("단위") || h.includes("구분") || h.includes("unit") || h.includes("Unit"))),
          box_contains: String(excelMeta.headers.findIndex(h => h.includes("입수") || h.includes("입수량") || h.includes("박스입수") || h.includes("pack") || h.includes("Pack"))),
          item_type: String(excelMeta.headers.findIndex(h => h.includes("자재구분") || h.includes("구분") || h.includes("타입") || h.includes("type") || h.includes("Type"))),
          category: String(excelMeta.headers.findIndex(h => h.includes("카테고리") || h.includes("분류") || h.includes("유형") || h.includes("category") || h.includes("Category"))),
          location: String(excelMeta.headers.findIndex(h => h.includes("위치") || h.includes("창고위치") || h.includes("적재위치") || h.includes("location") || h.includes("Location"))),
          note: String(excelMeta.headers.findIndex(h => h.includes("비고") || h.includes("메모") || h.includes("설명") || h.includes("note") || h.includes("Note"))),
          partner_name: String(excelMeta.headers.findIndex(h => h.includes("공급처") || h.includes("거래처") || h.includes("제조사") || h.includes("상호"))),
          inbound_date: String(excelMeta.headers.findIndex(h => h.includes("일자") || h.includes("입고일") || h.includes("날짜") || h.includes("date") || h.includes("Date")))
        };
        setMapping(newMapping);
        setStep("mapping");
      }
    } catch (err: any) {
      console.error(err);
      setError("엑셀 파일을 파싱하는 데 실패했습니다. 파일을 다시 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 2. 수동 매핑 설정 완료 후 데이터 파싱 미리보기
  const handleApplyMapping = () => {
    if (!excelData || !fileObject) return;

    if (mapping.item_name === "-1" || !mapping.item_name) {
      setError("품목명 매핑 컬럼은 필수 선택 사항입니다.");
      return;
    }
    if (mapping.quantity === "-1" || !mapping.quantity) {
      setError("수량 매핑 컬럼은 필수 선택 사항입니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const numericMapping = {
        item_name: Number(mapping.item_name),
        item_code: Number(mapping.item_code),
        barcode: Number(mapping.barcode),
        spec: Number(mapping.spec),
        quantity: Number(mapping.quantity),
        unit_price: Number(mapping.unit_price),
        unit_type: Number(mapping.unit_type),
        box_contains: Number(mapping.box_contains),
        item_type: Number(mapping.item_type),
        category: Number(mapping.category),
        location: Number(mapping.location),
        note: Number(mapping.note),
        partner_name: Number(mapping.partner_name),
        inbound_date: Number(mapping.inbound_date),
        direct_values: directInputs
      };

      const result = parseInboundExcelWithMapping(
        excelData.rawRows,
        excelData.headerRowIndex,
        numericMapping,
        fileObject.name
      );

      // 직접 입력 정보가 있으면 덮어쓰기
      if (mapping.partner_name === "-2" && directInputs.partner_name) {
        result.partner_name = directInputs.partner_name;
      }
      if (mapping.inbound_date === "-2" && directInputs.inbound_date) {
        result.inbound_date = directInputs.inbound_date;
      }

      setParsedResult(result);
      setStep("review");
    } catch (err: any) {
      setError("매핑 규칙 해석 중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. 최종 입고 확정 저장 실행
  const handleConfirmInbound = async () => {
    if (!parsedResult) return;

    setLoading(true);
    setError("");

    try {
      // A. 매핑 규칙 저장 활성화 시 시그니처 등록
      if (rememberFormat && excelData) {
        const numericMapping = {
          item_name: Number(mapping.item_name),
          item_code: Number(mapping.item_code),
          barcode: Number(mapping.barcode),
          spec: Number(mapping.spec),
          quantity: Number(mapping.quantity),
          unit_price: Number(mapping.unit_price),
          unit_type: Number(mapping.unit_type),
          box_contains: Number(mapping.box_contains),
          item_type: Number(mapping.item_type),
          category: Number(mapping.category),
          location: Number(mapping.location),
          note: Number(mapping.note),
          partner_name: Number(mapping.partner_name),
          inbound_date: Number(mapping.inbound_date),
          direct_values: directInputs
        };

        const headers = excelData.columns;
        const sig = headers.join('|');

        await apiFetch("/api/inventory/inbounds/excel-signatures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            header_signature: sig,
            partner_name: parsedResult.partner_name,
            mapping_info: numericMapping
          })
        });
      }

      // B. 실제 자율 입고 API 실행
      const res = await apiFetch("/api/inventory/inbounds/excel-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_name: parsedResult.partner_name,
          inbound_date: parsedResult.inbound_date,
          items: parsedResult.items,
          file_url: filename
        })
      });

      const resData = await res.json();
      if (resData.success) {
        onSuccess(resData.message || "엑셀 자율 입고 처리가 완료되었습니다.");
        onClose();
      } else {
        setError(resData.error || "입고 데이터를 전송하는 데 실패했습니다.");
      }

    } catch (err: any) {
      setError("입고 저장 트랜잭션 도중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 */}
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-indigo-100/30">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-xl">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">엑셀 자율입고 및 매핑 매니저</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">엑셀/CSV 템플릿 매핑을 기억하여 다이렉트 자율 입고를 진행합니다.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1단계: 업로드 모드 */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 hover:border-indigo-400/50 bg-slate-50/50 hover:bg-indigo-50/10 rounded-2xl transition group relative">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileChange}
                disabled={loading}
              />
              {loading ? (
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                  <span className="text-xs text-slate-500 font-bold">엑셀 데이터 구조 분석 중...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3 text-center">
                  <div className="p-4 bg-indigo-50 text-indigo-500 rounded-full group-hover:scale-110 transition duration-300">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">입고 엑셀 또는 CSV 파일 가져오기</p>
                    <p className="text-[10px] text-slate-400 mt-1">이곳에 파일을 드래그하거나 클릭하여 파일을 선택해 주세요.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2단계: 수동 컬럼 매핑 모드 */}
          {step === "mapping" && excelData && (
            <div className="space-y-4">
              <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-4 text-[11px] text-indigo-850 space-y-1">
                <p className="font-bold flex items-center gap-1">📍 처음 인식된 입고 양식입니다.</p>
                <p className="text-slate-500 font-medium">자율 입고 파싱을 완료하기 위해 엑셀 각 열(컬럼)이 시스템 데이터 필드와 일치하도록 설정해 주세요. 다음 업로드부터는 자동으로 입고가 완료됩니다.</p>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {/* 1. 구분 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">구분 열(선택)</label>
                  <select
                    value={mapping.item_type}
                    onChange={(e) => setMapping(prev => ({ ...prev, item_type: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.item_type === "-2" && (
                    <select
                      value={directInputs.item_type}
                      onChange={(e) => handleDirectInputChange("item_type", e.target.value)}
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    >
                      <option value="자재">자재</option>
                      <option value="제품">제품</option>
                    </select>
                  )}
                </div>



                {/* 3. 품목명 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">품목명 열</label>
                  <select
                    value={mapping.item_name}
                    onChange={(e) => setMapping(prev => ({ ...prev, item_name: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.item_name === "-2" && (
                    <input
                      type="text"
                      value={directInputs.item_name}
                      onChange={(e) => handleDirectInputChange("item_name", e.target.value)}
                      placeholder="품목명 직접 입력"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 4. 품목코드 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">품목코드 열(선택)</label>
                  <select
                    value={mapping.item_code}
                    onChange={(e) => setMapping(prev => ({ ...prev, item_code: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.item_code === "-2" && (
                    <input
                      type="text"
                      value={directInputs.item_code}
                      onChange={(e) => handleDirectInputChange("item_code", e.target.value)}
                      placeholder="품목코드 직접 입력"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 5. 바코드 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">바코드 열(선택)</label>
                  <select
                    value={mapping.barcode}
                    onChange={(e) => setMapping(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.barcode === "-2" && (
                    <input
                      type="text"
                      value={directInputs.barcode}
                      onChange={(e) => handleDirectInputChange("barcode", e.target.value)}
                      placeholder="바코드 직접 입력"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 6. 규격 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">규격 열(선택)</label>
                  <select
                    value={mapping.spec}
                    onChange={(e) => setMapping(prev => ({ ...prev, spec: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.spec === "-2" && (
                    <input
                      type="text"
                      value={directInputs.spec}
                      onChange={(e) => handleDirectInputChange("spec", e.target.value)}
                      placeholder="규격 직접 입력"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 7. 단위 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">단위 열(선택)</label>
                  <select
                    value={mapping.unit_type}
                    onChange={(e) => setMapping(prev => ({ ...prev, unit_type: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.unit_type === "-2" && (
                    <input
                      type="text"
                      value={directInputs.unit_type}
                      onChange={(e) => handleDirectInputChange("unit_type", e.target.value)}
                      placeholder="단위 직접 입력 (예: 개, 박스)"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 8. 박스당 입수량 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">박스당 입수량 열(선택)</label>
                  <select
                    value={mapping.box_contains}
                    onChange={(e) => setMapping(prev => ({ ...prev, box_contains: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.box_contains === "-2" && (
                    <input
                      type="number"
                      value={directInputs.box_contains}
                      onChange={(e) => handleDirectInputChange("box_contains", e.target.value)}
                      placeholder="박스당 입수량 고정값 지정"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 9. 입고 수량 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">입고 수량 열</label>
                  <select
                    value={mapping.quantity}
                    onChange={(e) => setMapping(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.quantity === "-2" && (
                    <input
                      type="number"
                      value={directInputs.quantity}
                      onChange={(e) => handleDirectInputChange("quantity", e.target.value)}
                      placeholder="수량 고정값 지정"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 10. 입고 단가 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">입고 단가 열</label>
                  <select
                    value={mapping.unit_price}
                    onChange={(e) => setMapping(prev => ({ ...prev, unit_price: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.unit_price === "-2" && (
                    <input
                      type="number"
                      value={directInputs.unit_price}
                      onChange={(e) => handleDirectInputChange("unit_price", e.target.value)}
                      placeholder="단가 고정값 지정"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 11. 공급처명(거래처) 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">공급처명(거래처) 열</label>
                  <select
                    value={mapping.partner_name}
                    onChange={(e) => setMapping(prev => ({ ...prev, partner_name: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.partner_name === "-2" && (
                    <input
                      type="text"
                      value={directInputs.partner_name}
                      onChange={(e) => handleDirectInputChange("partner_name", e.target.value)}
                      placeholder="공급처 직접 입력"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 12. 입고일자 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">입고일자 열</label>
                  <select
                    value={mapping.inbound_date}
                    onChange={(e) => setMapping(prev => ({ ...prev, inbound_date: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.inbound_date === "-2" && (
                    <input
                      type="date"
                      value={directInputs.inbound_date}
                      onChange={(e) => handleDirectInputChange("inbound_date", e.target.value)}
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 13. 적재위치 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">적재위치 열(선택)</label>
                  <select
                    value={mapping.location}
                    onChange={(e) => setMapping(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.location === "-2" && (
                    <input
                      type="text"
                      value={directInputs.location}
                      onChange={(e) => handleDirectInputChange("location", e.target.value)}
                      placeholder="적재위치 직접 입력"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>

                {/* 14. 비고 열 */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">비고 열(선택)</label>
                  <select
                    value={mapping.note}
                    onChange={(e) => setMapping(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  >
                    <option value="-1">매핑안함</option>
                    <option value="-2">직접 입력 (고정값 지정)</option>
                    {excelData.columns.map((col, idx) => (
                      <option key={idx} value={idx}>{col}</option>
                    ))}
                  </select>
                  {mapping.note === "-2" && (
                    <input
                      type="text"
                      value={directInputs.note}
                      onChange={(e) => handleDirectInputChange("note", e.target.value)}
                      placeholder="비고 직접 입력"
                      className="w-full text-xs p-2 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-400 mt-1.5"
                    />
                  )}
                </div>
              </div>

              {/* 매핑 규칙 기억하기 */}
              <div className="flex items-center space-x-2 pt-3 border-t border-slate-50">
                <input 
                  type="checkbox" 
                  id="rememberFormat" 
                  checked={rememberFormat}
                  onChange={(e) => setRememberFormat(e.target.checked)}
                  className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="rememberFormat" className="text-xs text-slate-550 font-semibold cursor-pointer select-none">
                  이 엑셀 템플릿(시그니처) 매핑 정보 저장하기 (다음 업로드 시 자동 입고 승인)
                </label>
              </div>
            </div>
          )}

          {/* 3단계: 파싱 미리보기 및 최종 확인 모드 */}
          {step === "review" && parsedResult && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-2">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  <span>엑셀 입고 분석 파싱 미리보기</span>
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 pt-1.5 border-t border-slate-100/60">
                  <div>🏢 공급처: <span className="text-slate-800 font-black">{parsedResult.partner_name}</span></div>
                  <div>📅 입고 일자: <span className="text-slate-800 font-black">{parsedResult.inbound_date}</span></div>
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[280px] overflow-y-auto overflow-x-auto">
                <table className="w-full border-collapse text-left text-[10px] min-w-[1300px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-black text-slate-500">
                      <th className="p-3">구분</th>
                      <th className="p-3">카테고리</th>
                      <th className="p-3">품목명</th>
                      <th className="p-3">품목코드</th>
                      <th className="p-3">바코드</th>
                      <th className="p-3">규격</th>
                      <th className="p-3">단위</th>
                      <th className="p-3 text-right">박스입수량</th>
                      <th className="p-3 text-right">입고 수량</th>
                      <th className="p-3 text-right">입고 단가</th>
                      <th className="p-3">공급처명(거래처)</th>
                      <th className="p-3">입고일자</th>
                      <th className="p-3">적재위치</th>
                      <th className="p-3">비고(수집 정보)</th>
                      <th className="p-3 text-right">총액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedResult.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3 text-slate-600 font-bold">{item.item_type || "자재"}</td>
                        <td className="p-3 text-slate-500 font-bold">{item.category || "기타"}</td>
                        <td className="p-3 font-semibold text-slate-800 truncate max-w-[120px]" title={item.item_name}>{item.item_name}</td>
                        <td className="p-3 text-slate-450 truncate font-mono max-w-[80px]">{item.item_code || "-"}</td>
                        <td className="p-3 text-slate-450 truncate font-mono max-w-[80px]">{item.barcode || "-"}</td>
                        <td className="p-3 text-slate-400 truncate max-w-[80px]">{item.spec || "-"}</td>
                        <td className="p-3 text-slate-500 font-bold">{item.unit_type || "개"}</td>
                        <td className="p-3 text-right font-mono text-slate-500">{item.box_contains || 1}</td>
                        <td className="p-3 text-right text-indigo-650 font-bold">{item.quantity.toLocaleString()} {item.unit_type || "개"}</td>
                        <td className="p-3 text-right text-slate-700">{item.unit_price.toLocaleString()} 원</td>
                        <td className="p-3 text-slate-700 truncate max-w-[110px]" title={parsedResult.partner_name}>{parsedResult.partner_name}</td>
                        <td className="p-3 text-slate-600 font-mono">{parsedResult.inbound_date}</td>
                        <td className="p-3 text-slate-600 font-bold">{item.location || "자율입고창고"}</td>
                        <td className="p-3 text-slate-400/90 italic truncate max-w-[140px]" title={item.note}>{item.note || "-"}</td>
                        <td className="p-3 text-right text-slate-900 font-black">{(item.quantity * item.unit_price).toLocaleString()} 원</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right text-xs font-black text-slate-700 bg-slate-50/50 p-3.5 rounded-xl flex justify-between items-center">
                <span>총 입고 수량: <strong className="text-indigo-600">{parsedResult.items.reduce((acc, it) => acc + it.quantity, 0).toLocaleString()}</strong> 품목단위 합산</span>
                <span>총 자산 가치액: <strong className="text-emerald-600">{parsedResult.items.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0).toLocaleString()}</strong> 원</span>
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="p-5 border-t border-slate-50 bg-slate-50/40 flex items-center justify-between">
          <div className="text-[10px] text-slate-450 font-semibold truncate max-w-[200px]">
            📄 {filename || "업로드된 파일 없음"}
          </div>

          <div className="flex items-center space-x-2">
            {step !== "upload" && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  if (step === "review") setStep("mapping");
                  else if (step === "mapping") setStep("upload");
                }}
                disabled={loading}
                className="bg-white hover:bg-slate-50 border border-slate-250 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                이전으로
              </button>
            )}

            {step === "mapping" && (
              <button
                type="button"
                onClick={handleApplyMapping}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>미리보기 및 파싱</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === "review" && (
              <button
                type="button"
                onClick={handleConfirmInbound}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>자율 입고 처리 중...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>자율 입고 확정</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
