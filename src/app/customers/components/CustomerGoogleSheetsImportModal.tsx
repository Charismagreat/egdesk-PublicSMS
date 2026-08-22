"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, AlertCircle, CheckCircle2, X, RefreshCw, Sparkles, Download, ExternalLink, Info, Users
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl, SAMPLE_GOOGLE_SHEET_URL } from "@/lib/google-sheets-storage";

interface CustomerGoogleSheetsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (customers: any[]) => Promise<{ success: boolean; addedCount?: number; error?: string }>;
}

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

export function CustomerGoogleSheetsImportModal({
  isOpen,
  onClose,
  onImport
}: CustomerGoogleSheetsImportModalProps) {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [parsedCustomers, setParsedCustomers] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSheetUrl(getSavedGoogleSheetUrl('customer_inbound_sheet_url') || getSavedGoogleSheetUrl());
      setParsedCustomers([]);
      setValidationErrors([]);
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 구글 시트 데이터 읽어오기
  const handleFetchSheet = async (overrideSheetName?: string) => {
    if (!sheetUrl.trim()) {
      setStatusMsg({ type: 'error', text: '구글 스프레드시트 공유 링크(URL)를 입력해주세요.' });
      return;
    }

    setIsLoading(true);
    setStatusMsg(null);
    setValidationErrors([]);

    try {
      setSavedGoogleSheetUrl('customer_inbound_sheet_url', sheetUrl.trim());

      const res = await apiFetch("/api/shared/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sheetUrl.trim(),
          sheetName: overrideSheetName || selectedSheetName || undefined,
          fetchAllRows: true
        })
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "구글 스프레드시트에서 데이터를 가져오지 못했습니다.");
      }

      setSpreadsheetTitle(json.spreadsheetTitle || "구글 스프레드시트");
      if (json.sheetNames && json.sheetNames.length > 0) {
        setAvailableSheets(json.sheetNames);
        if (!selectedSheetName && !overrideSheetName) {
          setSelectedSheetName(json.sheetName || json.sheetNames[0]);
        }
      }

      const rawRows: any[] = json.data || [];
      if (rawRows.length === 0) {
        setStatusMsg({ type: 'error', text: '시트에서 읽을 수 있는 데이터 행이 없습니다.' });
        setParsedCustomers([]);
        return;
      }

      const validList: any[] = [];
      const errorList: string[] = [];

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
          errorList.push(`[${rowNum}행] 고객명이 누락되었습니다.`);
          return;
        }

        if (!mappedItem.phone) {
          errorList.push(`[${rowNum}행] 고객 '${mappedItem.name}'의 연락처가 누락되었습니다.`);
          return;
        }

        validList.push({
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

      setParsedCustomers(validList);
      setValidationErrors(errorList);

      if (validList.length > 0) {
        setStatusMsg({ 
          type: 'success', 
          text: `총 ${validList.length}건의 고객 데이터를 성공적으로 분석했습니다.` 
        });
      } else {
        setStatusMsg({ 
          type: 'error', 
          text: '유효한 고객 데이터가 없습니다. 필수 컬럼(고객명, 연락처)을 확인하세요.' 
        });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || '시트 분석 중 오류가 발생했습니다.' });
      setParsedCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetTabChange = (name: string) => {
    setSelectedSheetName(name);
    handleFetchSheet(name);
  };

  const handleExecuteImport = async () => {
    if (parsedCustomers.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await onImport(parsedCustomers);
      if (res.success) {
        alert(`🎉 총 ${res.addedCount || parsedCustomers.length}명의 고객이 성공적으로 일괄 등록되었습니다!`);
        handleClose();
      } else {
        alert(`등록 실패: ${res.error || "알 수 없는 오류가 발생했습니다."}`);
      }
    } catch (e: any) {
      alert(`일괄 등록 통신 중 오류: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setParsedCustomers([]);
    setValidationErrors([]);
    setStatusMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shadow-3xs">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>구글 시트 연동 (고객 일괄 등록)</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg">실시간 동기화</span>
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">공유된 구글 스프레드시트 링크를 통해 고객 데이터를 1초 만에 불러옵니다.</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          
          {/* 구글 시트 URL 입력 패널 */}
          <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 block">구글 시트 공유 링크 (URL) *</label>
              {sheetUrl && (
                <button
                  type="button"
                  onClick={() => setSheetUrl("")}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                >
                  초기화
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800 placeholder:text-slate-350"
              />
              <button
                type="button"
                onClick={() => handleFetchSheet()}
                disabled={isLoading || !sheetUrl.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40 shadow-sm cursor-pointer active:scale-95"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>데이터 불러오기</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-medium leading-relaxed bg-white/70 p-2.5 rounded-xl border border-blue-100">
              💡 시트 [공유] 메뉴에서 <strong>'링크가 있는 모든 사용자에게 공개 (보기 권한)'</strong>로 설정되어 있어야 데이터를 읽어올 수 있습니다.
            </p>
          </div>

          {/* 시트 탭 목록 (탭이 2개 이상일 때) */}
          {availableSheets.length > 1 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 block">워크시트 선택</span>
              <div className="flex flex-wrap gap-2">
                {availableSheets.map((sName) => (
                  <button
                    key={sName}
                    type="button"
                    onClick={() => handleSheetTabChange(sName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      selectedSheetName === sName
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {sName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 상태 메시지 배너 */}
          {statusMsg && (
            <div className={`p-3.5 rounded-2xl border flex items-center gap-2 text-xs font-bold ${
              statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* 유효성 오류 목록 */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>누락되거나 형식 오류가 있는 행 ({validationErrors.length}건):</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 pl-6">
                {validationErrors.map((err, idx) => (
                  <p key={idx} className="text-[11px] text-rose-600 font-medium">{err}</p>
                ))}
              </div>
            </div>
          )}

          {/* 고객 미리보기 리스트 */}
          {parsedCustomers.length > 0 && (
            <div className="space-y-1.5 animate-scale-up">
              <span className="text-[11px] font-bold text-slate-500 block">고객 미리보기 (상위 5건)</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {parsedCustomers.slice(0, 5).map((cust, idx) => (
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

        {/* 하단 확인 버튼 */}
        <div className="mt-4 border-t border-slate-100 pt-4 flex gap-3 shrink-0">
          <button onClick={handleClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-colors">
            취소
          </button>
          <button
            onClick={handleExecuteImport}
            disabled={isSubmitting || parsedCustomers.length === 0}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer shadow-md active:scale-95"
          >
            {parsedCustomers.length > 0 ? `🚀 총 ${parsedCustomers.length.toLocaleString()}명 고객 일괄 등록 완료` : "시트 데이터 로드 대기 중"}
          </button>
        </div>
      </div>
    </div>
  );
}
