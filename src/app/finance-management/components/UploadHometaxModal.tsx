"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { X, FileSpreadsheet, RefreshCw, Sparkles, Sliders } from "lucide-react";

interface UploadHometaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadHometaxModal({
  isOpen,
  onClose,
  onSuccess
}: UploadHometaxModalProps) {
  const [useSmartDetection, setUseSmartDetection] = useState(true);
  const [hometaxKind, setHometaxKind] = useState("sales");
  const [hometaxBusinessNumber, setHometaxBusinessNumber] = useState("");
  const [hometaxFile, setHometaxFile] = useState<File | null>(null);
  const [isHometaxUploading, setIsHometaxUploading] = useState(false);
  const [hometaxUploadMessage, setHometaxUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setHometaxFile(null);
    setHometaxUploadMessage(null);
    onClose();
  };

  const handleHometaxUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hometaxFile) {
      setHometaxUploadMessage({ type: "error", text: "업로드할 국세청 엑셀 파일을 선택해 주세요." });
      return;
    }
    if (!useSmartDetection && hometaxKind === "cash-receipt" && !hometaxBusinessNumber) {
      setHometaxUploadMessage({ type: "error", text: "현금영수증 적재를 위해 사업자등록번호를 기입해 주세요." });
      return;
    }

    setIsHometaxUploading(true);
    setHometaxUploadMessage(null);

    try {
      const fd = new FormData();
      fd.append("file", hometaxFile);
      // 지능형 모드일 경우 백엔드 자동 분석이 동작하도록 빈 값을 전송
      fd.append("kind", useSmartDetection ? "" : hometaxKind);
      fd.append("businessNumber", useSmartDetection ? "" : hometaxBusinessNumber);

      const res = await apiFetch("/api/finance-excel/hometax-upload", {
        method: "POST",
        body: fd
      });
      
      if (!res.ok) {
        const errResult = await res.json().catch(() => ({}));
        throw new Error(errResult.error || `HTTP 에러 ${res.status}`);
      }

      const result = await res.json();

      if (result.success) {
        const { insertedCount, duplicateCount, totalCount } = result.data || {};
        setHometaxUploadMessage({
          type: "success",
          text: `성공! 총 ${totalCount}건의 자료 중 신규 ${insertedCount}건 적재 완료 (중복 ${duplicateCount}건 제외).`
        });
        setHometaxFile(null);
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 2200);
      } else {
        setHometaxUploadMessage({ type: "error", text: result.error || "파일 가공 중 에러가 발생했습니다." });
      }
    } catch (err: any) {
      setHometaxUploadMessage({ type: "error", text: err.message || "서버 통신 중 에러가 발생했습니다." });
    } finally {
      setIsHometaxUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] border border-slate-100 max-w-lg w-full p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        <button 
          onClick={handleClose} 
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
          <span>수동 국세청 자료 반입 (Excel)</span>
        </h3>

        <form onSubmit={handleHometaxUpload} className="space-y-4">
          {/* 업로드 방식 선택 토글 카드 */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <button
              type="button"
              onClick={() => setUseSmartDetection(true)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                useSmartDetection
                  ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Sparkles className={`w-4 h-4 ${useSmartDetection ? "text-indigo-600 animate-pulse" : "text-slate-400"}`} />
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${useSmartDetection ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>추천</span>
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">지능형 자동 감지</span>
                <span className="text-[10px] text-slate-400 font-medium leading-tight block mt-0.5">자료종류/사업자번호 자동식별</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setUseSmartDetection(false)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                !useSmartDetection
                  ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Sliders className={`w-4 h-4 ${!useSmartDetection ? "text-indigo-600" : "text-slate-400"}`} />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">수동 대상 지정</span>
                <span className="text-[10px] text-slate-400 font-medium leading-tight block mt-0.5">자료종류 및 사업자번호 직접입력</span>
              </div>
            </button>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-bold block mb-1">자료 종류 선택</label>
            {useSmartDetection ? (
              <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-1.5 cursor-not-allowed">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>지능형 자동 감지 (업로드 시 증빙 분류 자동 분석)</span>
              </div>
            ) : (
              <select
                value={hometaxKind}
                onChange={(e) => setHometaxKind(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="sales">매출 세금계산서</option>
                <option value="purchase">매입 세금계산서</option>
                <option value="exempt-sales">매출 계산서(면세)</option>
                <option value="exempt-purchase">매입 계산서(면세)</option>
                <option value="cash-receipt">현금영수증 매입 내역</option>
              </select>
            )}
          </div>

          {!useSmartDetection && hometaxKind === "cash-receipt" && (
            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">사업자등록번호 입력</label>
              <input
                type="text"
                placeholder="000-00-00000"
                value={hometaxBusinessNumber}
                onChange={(e) => setHometaxBusinessNumber(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-400 font-bold block mb-1">국세청 엑셀 파일 등록 (.xlsx / .xls)</label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setHometaxFile(e.target.files?.[0] || null)}
              className="w-full text-xs font-bold file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          {hometaxUploadMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold ${
                hometaxUploadMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                  : "bg-rose-50 text-rose-800 border border-rose-100"
              }`}
            >
              {hometaxUploadMessage.text}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button 
              type="button" 
              onClick={handleClose} 
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs"
            >
              닫기
            </button>
            <button
              type="submit"
              disabled={isHometaxUploading || !hometaxFile}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isHometaxUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>반입 처리 중...</span>
                </>
              ) : (
                <span>반입 실행</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
