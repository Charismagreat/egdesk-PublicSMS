"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Sparkles, CheckCircle2, AlertCircle, FileSpreadsheet, Info, Check, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface CustomerBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (customers: any[]) => Promise<{ success: boolean; addedCount?: number; error?: string }>;
}

// 엑셀/CSV 한글 헤더 ➡️ 영문 컬럼 맵핑 정의
const HEADER_MAPPING: Record<string, string> = {
  "고객명": "name",
  "이름": "name",
  "성명": "name",
  "연락처": "phone",
  "전화번호": "phone",
  "휴대폰": "phone",
  "핸드폰": "phone",
  "주소": "address",
  "소재지": "address",
  "배송지": "shipping_address",
  "배송지정보": "shipping_address",
  "수령인": "recipient_name",
  "받는분": "recipient_name",
  "수령인연락처": "recipient_phone",
  "받는분연락처": "recipient_phone",
  "그룹": "tags",
  "태그": "tags",
  "그룹/태그": "tags",
  "적립금": "points",
  "포인트": "points",
  "메모": "memo",
  "비고": "memo"
};

export function CustomerBulkImportModal({ isOpen, onClose, onImport }: CustomerBulkImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<string>("엑셀 파싱 및 데이터 검증 진행 중...");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setLoading(true);
    setParsedData([]);
    setErrors([]);
    setImportStatus("파일을 분석하고 고객 정보를 추출하는 중입니다...");

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
          setErrors(["엑셀 파일에 유효한 데이터가 없습니다."]);
          setLoading(false);
          return;
        }

        const validCustomers: any[] = [];
        const localErrors: string[] = [];

        rawRows.forEach((row: any, idx: number) => {
          const rowNum = idx + 2;
          const mappedItem: any = {};

          Object.keys(row).forEach((key) => {
            const cleanKey = key.trim().replace(/\s+/g, "");
            const mappedField = HEADER_MAPPING[cleanKey] || HEADER_MAPPING[key.trim()];
            if (mappedField) {
              mappedItem[mappedField] = String(row[key] || "").trim();
            }
          });

          if (!mappedItem.name) {
            localErrors.push(`[${rowNum}행] 고객명이 누락되었습니다.`);
            return;
          }

          if (!mappedItem.phone) {
            localErrors.push(`[${rowNum}행] 고객 '${mappedItem.name}'의 연락처가 누락되었습니다.`);
            return;
          }

          validCustomers.push({
            name: mappedItem.name,
            phone: mappedItem.phone,
            address: mappedItem.address || "",
            shipping_address: mappedItem.shipping_address || "",
            recipient_name: mappedItem.recipient_name || "",
            recipient_phone: mappedItem.recipient_phone || "",
            tags: mappedItem.tags || "",
            points: Number(mappedItem.points) || 0,
            memo: mappedItem.memo || ""
          });
        });

        setParsedData(validCustomers);
        setErrors(localErrors);
      } catch (err: any) {
        setErrors([`엑셀 파싱 중 오류가 발생했습니다: ${err.message}`]);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrors(["파일을 읽는 도중 에러가 발생했습니다."]);
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleExecuteImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    setImportStatus(`총 ${parsedData.length}명의 고객 정보를 데이터베이스에 일괄 적재 중입니다...`);

    try {
      const res = await onImport(parsedData);
      if (res.success) {
        alert(`🎉 총 ${res.addedCount || parsedData.length}명의 고객이 성공적으로 일괄 등록되었습니다!`);
        handleClose();
      } else {
        alert(`등록 실패: ${res.error || "알 수 없는 오류가 발생했습니다."}`);
      }
    } catch (e: any) {
      alert(`일괄 등록 통신 중 오류: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFileName(null);
    setParsedData([]);
    setErrors([]);
    setLoading(false);
    onClose();
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/이지데스크-표준- 고객 등록 양식.xlsx";
    link.download = "이지데스크-표준- 고객 등록 양식.xlsx";
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl shadow-3xs">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">고객 엑셀 일괄 등록</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">엑셀 파일(.xlsx, .csv)을 업로드하여 다수의 고객을 한 번에 등록합니다.</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* 표준 양식 다운로드 안내 바 */}
          <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-emerald-950">시스템 표준 서식을 다운로드하여 고객 데이터를 손쉽게 정리하세요.</span>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer shrink-0 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>표준 서식 다운로드</span>
            </button>
          </div>

          {/* 드래그 앤 드롭 업로드 영역 */}
          {!fileName && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[200px] ${
                dragOver ? "border-emerald-500 bg-emerald-50/50 scale-[0.99]" : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-3xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700">고객 엑셀 또는 CSV 파일을 여기로 드래그하거나 클릭하여 선택하세요</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">.xlsx, .xls, .csv 형식 지원 (최대 5,000건 권장)</p>
            </div>
          )}

          {/* 로딩 상태 */}
          {loading && (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-extrabold text-emerald-700 animate-pulse">{importStatus}</p>
            </div>
          )}

          {/* 파싱 결과 요약 및 미리보기 */}
          {!loading && fileName && (
            <div className="space-y-4 animate-scale-up">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="flex items-center gap-2 truncate">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 truncate">{fileName}</span>
                </div>
                <button
                  onClick={() => {
                    setFileName(null);
                    setParsedData([]);
                    setErrors([]);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  다른 파일 선택
                </button>
              </div>

              {/* 검증 성공 요약 배너 */}
              {parsedData.length > 0 && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-emerald-900">
                      총 {parsedData.length.toLocaleString()}명의 유효한 고객 정보가 확인되었습니다.
                    </span>
                  </div>
                </div>
              )}

              {/* 오류 목록 */}
              {errors.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>누락되거나 형식 오류가 있는 행 ({errors.length}건):</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pl-6">
                    {errors.map((err, idx) => (
                      <p key={idx} className="text-[11px] text-rose-600 font-medium">{err}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* 고객 미리보기 리스트 */}
              {parsedData.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 block">고객 미리보기 (상위 5건)</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {parsedData.slice(0, 5).map((cust, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{cust.name}</span>
                          <span className="text-slate-500 font-mono font-bold text-[11px]">{cust.phone}</span>
                          {cust.tags && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded font-bold">
                              {cust.tags}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-indigo-600 font-mono font-bold">{cust.points.toLocaleString()}P</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 확인 버튼 */}
        <div className="mt-4 border-t border-slate-100 pt-4 flex gap-3 shrink-0">
          <button onClick={handleClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-colors">
            취소
          </button>
          <button
            onClick={handleExecuteImport}
            disabled={loading || parsedData.length === 0}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer shadow-md active:scale-95"
          >
            {parsedData.length > 0 ? `🚀 총 ${parsedData.length.toLocaleString()}명 고객 일괄 등록 완료` : "엑셀 파일 업로드 대기 중"}
          </button>
        </div>
      </div>
    </div>
  );
}
