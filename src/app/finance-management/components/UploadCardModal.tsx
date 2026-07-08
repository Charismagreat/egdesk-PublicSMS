"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { X, FileSpreadsheet, RefreshCw, Sparkles, Sliders } from "lucide-react";

interface UploadCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadCardModal({
  isOpen,
  onClose,
  onSuccess
}: UploadCardModalProps) {
  const [useSmartDetection, setUseSmartDetection] = useState(true);
  const [cardCompanyId, setCardCompanyId] = useState("shinhan-card");
  const [cardAccountId, setCardAccountId] = useState("CARD-IMPORT");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [isCardUploading, setIsCardUploading] = useState(false);
  const [cardUploadMessage, setCardUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setCardFile(null);
    setCardUploadMessage(null);
    onClose();
  };

  const handleCardUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFile) {
      setCardUploadMessage({ type: "error", text: "업로드할 카드 승인 엑셀 파일을 선택해 주세요." });
      return;
    }

    setIsCardUploading(true);
    setCardUploadMessage(null);

    try {
      const fd = new FormData();
      fd.append("file", cardFile);
      // 지능형 모드일 경우 백엔드 자동 분석이 동작하도록 빈 값을 전송
      fd.append("cardCompanyId", useSmartDetection ? "" : cardCompanyId);
      fd.append("accountId", useSmartDetection ? "" : cardAccountId);

      const res = await apiFetch("/api/finance-excel/card-upload", {
        method: "POST",
        body: fd
      });
      
      if (!res.ok) {
        const errResult = await res.json().catch(() => ({}));
        throw new Error(errResult.error || `HTTP 에러 ${res.status}`);
      }

      const result = await res.json();

      if (result.success) {
        setCardUploadMessage({
          type: "success",
          text: `성공! 총 ${result.data?.parsedCount}건의 카드 승인 내역이 이지데스크 금융 데이터베이스에 매핑 및 저장되었습니다.`
        });
        setCardFile(null);
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 2000);
      } else {
        setCardUploadMessage({ type: "error", text: result.error || "파일 가공 중 에러가 발생했습니다." });
      }
    } catch (err: any) {
      setCardUploadMessage({ type: "error", text: err.message || "서버 통신 중 시스템 에러가 발생했습니다." });
    } finally {
      setIsCardUploading(false);
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
          <span>수동 신용카드 거래 내역 반입 (Excel)</span>
        </h3>

        <form onSubmit={handleCardUpload} className="space-y-4">
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
                <span className="text-[10px] text-slate-400 font-medium leading-tight block mt-0.5">카드사/승인내역 자동 식별</span>
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
                <span className="text-[10px] text-slate-400 font-medium leading-tight block mt-0.5">카드사 및 식별코드 직접 선택</span>
              </div>
            </button>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-bold block mb-1">카드 회사 선택</label>
            {useSmartDetection ? (
              <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-1.5 cursor-not-allowed">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>지능형 자동 감지 (업로드 시 카드사 자동 분석)</span>
              </div>
            ) : (
              <select
                value={cardCompanyId}
                onChange={(e) => setCardCompanyId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="shinhan-card">신한카드</option>
                <option value="kb-card">KB국민카드</option>
                <option value="nh-card">NH농협카드</option>
                <option value="bc-card">BC카드</option>
                <option value="hana-card">하나카드</option>
              </select>
            )}
          </div>

          {!useSmartDetection && (
            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">카드 식별 코드</label>
              <input
                type="text"
                value={cardAccountId}
                onChange={(e) => setCardAccountId(e.target.value)}
                placeholder="CARD-IMPORT"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-400 font-bold block mb-1">엑셀 파일 등록 (.xlsx / .xls)</label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setCardFile(e.target.files?.[0] || null)}
              className="w-full text-xs font-bold file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          {cardUploadMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold ${
                cardUploadMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                  : "bg-rose-50 text-rose-800 border border-rose-100"
              }`}
            >
              {cardUploadMessage.text}
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
              disabled={isCardUploading || !cardFile}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isCardUploading ? (
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
