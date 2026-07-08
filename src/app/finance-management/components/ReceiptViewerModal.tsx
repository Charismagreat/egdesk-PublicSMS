"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Receipt, Sparkles, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, X 
} from "lucide-react";
import { CardTransaction } from "../types";

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  txId: string | null;
  receiptUrl: string | null;
  cardTxList: CardTransaction[];
  onSuccess: () => void;
}

export default function ReceiptViewerModal({
  isOpen,
  onClose,
  txId,
  receiptUrl,
  cardTxList,
  onSuccess
}: ReceiptViewerModalProps) {
  // 업로드용 상태
  const [receiptUploadFiles, setReceiptUploadFiles] = useState<File[]>([]);
  const [receiptSelectedTxId, setReceiptSelectedTxId] = useState<string>("");
  const [isReceiptUploading, setIsReceiptUploading] = useState(false);
  const [receiptUploadMessage, setReceiptUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 뷰어용 상태
  const [viewingReceiptIndex, setViewingReceiptIndex] = useState<number>(0);

  // 모달이 열리거나 txId가 바뀔 때 선택 초기화
  useEffect(() => {
    if (isOpen) {
      setReceiptSelectedTxId(txId || "");
      setReceiptUploadFiles([]);
      setReceiptUploadMessage(null);
      setViewingReceiptIndex(0);
    }
  }, [isOpen, txId]);

  if (!isOpen) return null;

  const isViewMode = !!receiptUrl; // 영수증 URL이 있으면 뷰어 모드, 없으면 업로드 모드
  const receiptUrls = receiptUrl ? receiptUrl.split(",").map(u => u.trim()).filter(Boolean) : [];

  const handleClose = () => {
    setReceiptUploadFiles([]);
    setReceiptUploadMessage(null);
    onClose();
  };

  // AI OCR 분석을 통한 거래 건 자동 식별 및 매칭 함수
  const analyzeReceiptWithAI = async (file: File) => {
    setReceiptUploadMessage({ 
      type: "success", 
      text: "AI가 영수증 이미지를 정밀 분석하여 적합한 결제 거래 건을 지능형 자동 식별 중입니다..." 
    });
    setIsReceiptUploading(true);
    
    try {
      // 1. 파일을 Base64로 인코딩
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      
      // 2. OCR API 호출
      const res = await apiFetch("/api/expenses/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Data,
          filename: file.name,
          mimeType: file.type
        })
      });
      
      if (!res.ok) throw new Error("OCR API 서버 응답 실패");
      
      const ocrResult = await res.json();
      if (ocrResult.success) {
        const { amount, expense_date, title } = ocrResult;
        
        // 3. 지능형 자동 식별 매칭 알고리즘 가동
        let matchedTx = null;
        
        // 우선순위 1: 금액이 정확히 일치하고 날짜도 일치하는 건
        matchedTx = cardTxList.find(tx => 
          Math.floor(tx.amount || 0) === Math.floor(amount) && 
          tx.date === expense_date
        );
        
        // 우선순위 2: 금액만 정확히 일치하는 건
        if (!matchedTx) {
          matchedTx = cardTxList.find(tx => 
            Math.floor(tx.amount || 0) === Math.floor(amount)
          );
        }
        
        // 우선순위 3: 가맹점명이 유사한 건
        if (!matchedTx) {
          const cleanTitle = (title || "").replace(/\s/g, "").toLowerCase();
          matchedTx = cardTxList.find(tx => {
            const cleanMerchant = (tx.merchantName || "").replace(/\s/g, "").toLowerCase();
            return cleanTitle.includes(cleanMerchant) || cleanMerchant.includes(cleanTitle);
          });
        }
        
        // 우선순위 4: 오차가 적은 결제 내역 매칭 (오차 1만원 이하)
        if (!matchedTx && cardTxList.length > 0) {
          const sortedByDiff = [...cardTxList].sort((a, b) => 
            Math.abs(a.amount - amount) - Math.abs(b.amount - amount)
          );
          if (Math.abs(sortedByDiff[0].amount - amount) <= 10000) {
            matchedTx = sortedByDiff[0];
          }
        }
        
        if (matchedTx) {
          setReceiptSelectedTxId(matchedTx.id);
          setReceiptUploadMessage({
            type: "success",
            text: `[지능형 자동 식별 성공] AI가 영수증에서 ₩${Number(amount).toLocaleString()} 지출을 감지하여 '${matchedTx.merchantName}' 거래 건에 완벽하게 자동 선택 매칭하였습니다.`
          });
        } else {
          setReceiptUploadMessage({
            type: "success",
            text: `[AI 영수증 분석 완료] ₩${Number(amount).toLocaleString()} 지출을 식별하였으나, 목록 내에 일치하는 금액의 결제 내역이 보이지 않습니다. 연결할 거래를 드롭다운에서 수동으로 선택해 주세요.`
          });
        }
      } else {
        throw new Error(ocrResult.error || "분석 실패");
      }
    } catch (err: any) {
      console.error("AI OCR 매칭 에러:", err);
      setReceiptUploadMessage({
        type: "error",
        text: `지능형 OCR 분석 중 통신 오류가 발생했으나 파일은 정상 수동 등록 가능합니다.`
      });
    } finally {
      setIsReceiptUploading(false);
    }
  };

  // 카드 영수증 다중 업로드 핸들러
  const handleReceiptUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptUploadFiles || receiptUploadFiles.length === 0) {
      setReceiptUploadMessage({ type: "error", text: "업로드할 영수증 사진을 선택해 주세요." });
      return;
    }
    if (!receiptSelectedTxId) {
      setReceiptUploadMessage({ type: "error", text: "연결할 카드 거래 승인 내역을 지정해 주세요." });
      return;
    }

    setIsReceiptUploading(true);
    setReceiptUploadMessage(null);

    try {
      const fd = new FormData();
      receiptUploadFiles.forEach((file) => {
        fd.append("file", file);
      });
      fd.append("id", receiptSelectedTxId);

      const res = await apiFetch("/api/finance-excel/receipt", {
        method: "POST",
        body: fd
      });

      if (!res.ok) {
        throw new Error(`HTTP 에러 ${res.status}`);
      }

      const result = await res.json();
      if (result.success) {
        setReceiptUploadMessage({
          type: "success",
          text: `성공! 총 ${receiptUploadFiles.length}장의 카드 영수증 사진이 해당 카드 승인 내역에 매핑 및 저장되었습니다.`
        });
        setReceiptUploadFiles([]);
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 1500);
      } else {
        setReceiptUploadMessage({ type: "error", text: result.error || "파일 가공 중 에러가 발생했습니다." });
      }
    } catch (err: any) {
      setReceiptUploadMessage({ type: "error", text: err.message || "서버 통신 중 에러가 발생했습니다." });
    } finally {
      setIsReceiptUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60"
      >
        {isViewMode ? (
          /* 1. 영수증 조회 캐러셀 모드 */
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-slate-800" />
                  등록된 카드 영수증 보기
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  {receiptUrls.length > 1 
                    ? `총 ${receiptUrls.length}장의 영수증이 등록되어 있습니다.`
                    : "실물 영수증 증빙 자료입니다."}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* 이미지 슬라이더 영역 */}
            <div className="relative mt-5 flex flex-col items-center bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden min-h-[350px] justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptUrls[viewingReceiptIndex] || receiptUrls[0]}
                alt="등록 영수증"
                className="max-w-full max-h-[400px] object-contain transition-all duration-300"
              />

              {/* 다중 이미지인 경우 좌우 제어 내비게이터 탑재 */}
              {receiptUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setViewingReceiptIndex((prev) => (prev > 0 ? prev - 1 : receiptUrls.length - 1))}
                    className="absolute left-3 p-2 bg-white/80 hover:bg-white text-slate-800 rounded-full shadow-md active:scale-90 hover:scale-105 transition-all cursor-pointer border border-slate-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingReceiptIndex((prev) => (prev < receiptUrls.length - 1 ? prev + 1 : 0))}
                    className="absolute right-3 p-2 bg-white/80 hover:bg-white text-slate-800 rounded-full shadow-md active:scale-90 hover:scale-105 transition-all cursor-pointer border border-slate-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* 슬라이드 도트(인덱스 표시) */}
                  <div className="absolute bottom-4 flex gap-1.5 bg-black/60 px-3 py-1.5 rounded-full">
                    {receiptUrls.map((_, idx) => (
                      <div
                        key={idx}
                        onClick={() => setViewingReceiptIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                          idx === viewingReceiptIndex ? "bg-white scale-125" : "bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleClose}
              className="mt-5 w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer text-center"
            >
              조회 닫기
            </button>
          </motion.div>
        ) : (
          /* 2. 영수증 업로드 & AI 매칭 등록 모드 */
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute -top-10 -left-10 w-28 h-28 bg-slate-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-slate-800" />
                  카드 승인 영수증 등록
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  신용카드 승인 내역에 실물 영수증 사진을 매핑합니다. (여러 장 등록 가능)
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReceiptUpload} className="mt-5 space-y-5">
              {/* AI 자동 식별 안내 팁 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">AI 영수증 자동 식별 매칭</h4>
                  <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed font-sans">
                    영수증 사진을 등록하면 AI OCR이 금액, 가맹점, 일자를 정밀 분석하여 목록 내에서 매치되는 카드 승인 건을 찾아 자동으로 매핑합니다.
                  </p>
                </div>
              </div>

              {/* 1. 대상 카드 거래 선택 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">연결할 카드 거래 승인 내역</label>
                <select
                  value={receiptSelectedTxId}
                  onChange={(e) => setReceiptSelectedTxId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold bg-slate-50 text-slate-700 outline-none focus:border-blue-500 cursor-pointer transition-all"
                >
                  <option value="">-- 거래 내역을 수동으로 연결하거나 선택하세요 --</option>
                  {cardTxList.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      [{tx.date}] {tx.merchantName} | ₩ {Math.floor(tx.amount || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. 사진 파일 업로드 드롭존 (multiple) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">영수증 이미지 등록 (.jpg, .png, .jpeg)</label>
                <div className="relative group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const filesArray = Array.from(e.target.files);
                        setReceiptUploadFiles(filesArray);
                        setReceiptUploadMessage(null);
                        analyzeReceiptWithAI(filesArray[0]); // 첫 번째 파일로 AI OCR 분석 트리거
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                  />
                  <div className="border-dashed border-2 border-slate-200 group-hover:border-slate-800 rounded-2xl p-6 text-center bg-slate-50/50 group-hover:bg-slate-100/30 transition-all flex flex-col items-center justify-center gap-2">
                    <Receipt className="w-10 h-10 text-slate-400 group-hover:text-slate-700 transition-all" />
                    
                    {receiptUploadFiles.length > 0 ? (
                      <div className="space-y-2 w-full flex flex-col items-center">
                        <p className="text-xs font-extrabold text-slate-800">
                          총 {receiptUploadFiles.length}장의 사진이 선택되었습니다.
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          클릭하여 파일을 추가하거나 개별 제외할 수 있습니다.
                        </p>
                        
                        {/* 3열 썸네일 그리드와 X 버튼 */}
                        <div className="mt-3 grid grid-cols-3 gap-2 w-full max-h-[160px] overflow-y-auto p-1">
                          {receiptUploadFiles.map((file, idx) => (
                            <div key={idx} className="relative group/thumb aspect-square border border-slate-100 rounded-lg overflow-hidden bg-slate-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={URL.createObjectURL(file)}
                                alt="영수증"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReceiptUploadFiles((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute top-1 right-1 w-5 h-5 bg-rose-500/80 hover:bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-md active:scale-90"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          여기에 카드 영수증 사진들을 끌어다 놓거나 클릭해 주세요.
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                          여러 장의 실물 영수증을 한꺼번에 선택하여 등록할 수 있습니다.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. 로딩 및 성공/실패 피드백 */}
              {receiptUploadMessage && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold border flex items-start gap-2 ${
                    receiptUploadMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-rose-50 text-rose-600 border-rose-100"
                  }`}
                >
                  {receiptUploadMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{receiptUploadMessage.text}</span>
                </div>
              )}

              {/* 4. 하단 동작 제어 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isReceiptUploading}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer text-center"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isReceiptUploading || receiptUploadFiles.length === 0 || !receiptSelectedTxId}
                  className="flex-1 py-2.5 bg-gradient-to-r from-slate-800 to-slate-950 text-white hover:from-slate-900 hover:to-black text-xs font-bold rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:pointer-events-none cursor-pointer"
                >
                  {isReceiptUploading ? "영수증 이미지 분석/적재 중..." : "매핑 및 등록 완료"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
