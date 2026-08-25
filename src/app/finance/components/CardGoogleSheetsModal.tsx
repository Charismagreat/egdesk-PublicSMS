"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, CreditCard, AlertCircle, CheckCircle2, X, Loader2, RefreshCw, Check, ShieldCheck, AlertTriangle, Bookmark, List
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl } from "@/lib/google-sheets-storage";
import { sanitizeDate, sanitizeAmount } from "@/lib/data-validator";
import GoogleSheetPresetModal, { GoogleSheetPreset } from "@/components/GoogleSheetPresetModal";

interface CardGoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedCardTx {
  approval_date: string;
  approval_time: string;
  card_number: string;
  cardholder_name: string;
  merchant_name: string;
  amount: number;
  tax_amount: number;
  status: string;
  usage_type: string;
  approval_number: string;
  isValid?: boolean;
  validationWarning?: string;
}

export default function CardGoogleSheetsModal({
  isOpen,
  onClose,
  onSuccess
}: CardGoogleSheetsModalProps) {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [cardCompanyId, setCardCompanyId] = useState<string>("shinhan-card");
  const [presets, setPresets] = useState<GoogleSheetPreset[]>([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<"save" | "list">("save");
  const [parsedTxs, setParsedTxs] = useState<ParsedCardTx[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPresetsList = async () => {
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets?domain=card");
      const data = await res.json();
      if (data.success && data.presets) {
        setPresets(data.presets);
        if (data.defaultPreset && !sheetUrl) {
          setSheetUrl(data.defaultPreset.url);
          if (data.defaultPreset.sheetName) setSelectedSheetName(data.defaultPreset.sheetName);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      setSheetUrl(getSavedGoogleSheetUrl());
      setParsedTxs([]);
      setStatusMsg(null);
      setIsPresetModalOpen(false);
      fetchPresetsList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFetchSheetData = async (overrideSheetName?: string) => {
    if (!sheetUrl.trim()) {
      setStatusMsg({ type: 'error', text: '구글 스프레드시트 URL 또는 ID를 입력해 주세요.' });
      return;
    }

    setIsLoading(true);
    setStatusMsg(null);
    setParsedTxs([]);

    try {
      setSavedGoogleSheetUrl(sheetUrl);

      const res = await apiFetch("/api/shared/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sheetUrl.trim(),
          sheetName: overrideSheetName || selectedSheetName || undefined,
          fetchAllRows: true
        })
      });

      const data = await res.json();
      if (!data.success) {
        setStatusMsg({ type: 'error', text: data.error || '구글 시트 데이터를 가져오지 못했습니다.' });
        return;
      }

      setSpreadsheetTitle(data.spreadsheetTitle || "");
      setAvailableSheets(data.availableSheets || []);

      // 서버에서 gid 또는 요청에 따라 정확히 결정한 시트명을 최우선 사용
      let curSheet = overrideSheetName || data.sheetName;

      // 만약 URL에 gid가 없고 특정 탭도 선택하지 않은 경우에만 카드 관련 탭으로 스마트 추천
      if (!overrideSheetName && !selectedSheetName && !sheetUrl.includes("gid=") && data.availableSheets) {
        const cardTab = data.availableSheets.find((s: string) => 
          s.includes("카드") || s.includes("신용카드") || s.includes("승인내역") || s.includes("법인카드") || s.includes("법인폰")
        );
        if (cardTab && cardTab !== curSheet) {
          setSelectedSheetName(cardTab);
          return handleFetchSheetData(cardTab);
        }
      }
      setSelectedSheetName(curSheet);

      const headers: string[] = data.headers || [];
      const rows: any[][] = data.rows || [];

      if (rows.length === 0) {
        setStatusMsg({ type: 'error', text: `[${curSheet}] 시트에 데이터 행이 존재하지 않습니다.` });
        return;
      }

      const list: ParsedCardTx[] = [];

      rows.forEach((rowArr) => {
        let approvalDate = "";
        let approvalTime = "00:00:00";
        let cardNumber = "";
        let cardholderName = "";
        let merchantName = "";
        let amount = 0;
        let taxAmount = 0;
        let status = "승인";
        let usageType = "일시불";
        let approvalNumber = "";

        headers.forEach((h, colIdx) => {
          const cleanH = String(h || "").replace(/\s+/g, "").toLowerCase();
          const val = String(rowArr[colIdx] || "").trim();

          if (cleanH.includes("승인일자") || cleanH.includes("이용일자") || cleanH.includes("승인일") || cleanH === "일자") {
            approvalDate = val;
          } else if (cleanH.includes("승인시간") || cleanH.includes("이용시간") || cleanH === "시간") {
            approvalTime = val;
          } else if (cleanH.includes("카드번호") || cleanH.includes("카드명") || cleanH.includes("이용카드")) {
            cardNumber = val;
          } else if (cleanH.includes("가맹점") || cleanH.includes("가맹점명") || cleanH.includes("상호")) {
            merchantName = val;
          } else if (cleanH.includes("승인금액") || cleanH.includes("이용금액") || cleanH.includes("금액")) {
            amount = parseInt(val.replace(/[^0-9-]/g, "")) || 0;
          } else if (cleanH.includes("부가세") || cleanH.includes("세액")) {
            taxAmount = parseInt(val.replace(/[^0-9-]/g, "")) || 0;
          } else if (cleanH.includes("승인구분") || cleanH.includes("상태") || cleanH.includes("구분")) {
            status = val.includes("취소") ? "취소" : "승인";
          } else if (cleanH.includes("할부") || cleanH.includes("할부개월")) {
            usageType = val;
          } else if (cleanH.includes("승인번호")) {
            approvalNumber = val;
          } else if (cleanH.includes("이용자") || cleanH.includes("소지자") || cleanH.includes("사용자")) {
            cardholderName = val;
          }
        });

        // 유효성 검증
        const dateSan = sanitizeDate(approvalDate);
        const appDate = dateSan.isValid ? dateSan.value : approvalDate;
        const amtSan = sanitizeAmount(amount);
        const taxSan = sanitizeAmount(taxAmount);

        const warnings: string[] = [];
        if (!dateSan.isValid && dateSan.warning) warnings.push(dateSan.warning);
        const isValid = dateSan.isValid && (amtSan.value > 0 || Boolean(merchantName));

        if (approvalDate || merchantName || amtSan.value > 0) {
          list.push({
            approval_date: appDate || new Date().toISOString().split("T")[0],
            approval_time: approvalTime || "00:00:00",
            card_number: cardNumber || "법인카드",
            cardholder_name: cardholderName,
            merchant_name: merchantName || "가맹점",
            amount: amtSan.value,
            tax_amount: taxSan.value,
            status,
            usage_type: usageType,
            approval_number: approvalNumber || `AP-${Math.floor(100000 + Math.random() * 900000)}`,
            isValid,
            validationWarning: warnings.length > 0 ? warnings.join(', ') : undefined
          });
        }
      });

      setParsedTxs(list);
      setStatusMsg({
        type: 'success',
        text: `✅ [${data.spreadsheetTitle}] '${curSheet}' 탭에서 총 ${list.length}건의 신용카드 승인 내역을 판독했습니다!`
      });
    } catch (err: any) {
      console.error("Card Google Sheets error:", err);
      setStatusMsg({ type: 'error', text: `연동 오류: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = async () => {
    if (parsedTxs.length === 0) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch("/api/finance/card-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: parsedTxs,
          cardCompanyId
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: 'success',
          text: `🎉 총 ${data.insertedCount || parsedTxs.length}건의 신용카드 승인 내역이 성공적으로 일괄 등록되었습니다.`
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setStatusMsg({ type: 'error', text: `등록 실패: ${data.error || '오류 발생'}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `서버 통신 오류: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                신용카드 승인내역 구글 스프레드시트 연동
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">구글 시트의 법인카드 승인내역을 실시간으로 읽어와 금융 관리 장부에 일괄 적재합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-600">
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-600" />
                구글 스프레드시트 URL 또는 Spreadsheet ID
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPresetModalMode("save");
                    setIsPresetModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="현재 입력된 구글 시트 주소를 이름과 함께 저장합니다."
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                  <span>시트 주소 저장</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPresetModalMode("list");
                    setIsPresetModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="저장된 구글 시트 목록을 조회하고 선택합니다."
                >
                  <List className="w-3.5 h-3.5 text-slate-500" />
                  <span>저장 목록 ({presets.length})</span>
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleFetchSheetData();
                  }
                }}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => handleFetchSheetData()}
                disabled={isLoading || !sheetUrl.trim()}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isLoading || !sheetUrl.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-95"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>조회 중...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>데이터 가져오기</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 shrink-0">카드사:</span>
                <select
                  value={cardCompanyId}
                  onChange={(e) => setCardCompanyId(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1"
                >
                  <option value="shinhan-card">신한카드</option>
                  <option value="kb-card">KB국민카드</option>
                  <option value="nh-card">NH농협카드</option>
                  <option value="bc-card">BC카드</option>
                  <option value="hana-card">하나카드</option>
                  <option value="samsung-card">삼성카드</option>
                  <option value="hyundai-card">현대카드</option>
                </select>
              </div>
            </div>
          </div>

          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                statusMsg.type === "success"
                  ? "bg-amber-50 text-amber-900 border border-amber-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {parsedTxs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-slate-800 text-xs">
                    판독된 카드 승인 내역 목록 미리보기 ({parsedTxs.length}건)
                  </h4>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-16">검증</th>
                      <th className="py-2.5 px-3">승인일시</th>
                      <th className="py-2.5 px-3">가맹점명</th>
                      <th className="py-2.5 px-3">카드번호</th>
                      <th className="py-2.5 px-3 text-right">승인금액</th>
                      <th className="py-2.5 px-3">승인구분</th>
                      <th className="py-2.5 px-3">승인번호</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedTxs.map((tx, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {tx.isValid !== false ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200" title="승인일시 및 카드이용금액 정상 검증됨">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              정상
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title={tx.validationWarning || "날짜/금액 확인 필요"}>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              확인
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {tx.approval_date} {tx.approval_time}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">{tx.merchant_name}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{tx.card_number}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-indigo-600">
                          {tx.amount ? `${tx.amount.toLocaleString()}원` : '-'}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            tx.status === '취소' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{tx.approval_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={parsedTxs.length === 0 || isSubmitting}
            onClick={handleApplyImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              parsedTxs.length === 0 || isSubmitting
                ? "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-95"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>등록 중...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{parsedTxs.length}건 카드내역 일괄 등록</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 구글 시트 프리셋 저장/목록 모달 */}
      <GoogleSheetPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        domain="card"
        currentUrl={sheetUrl}
        currentSheetName={selectedSheetName}
        initialMode={presetModalMode}
        onSelectPreset={(preset) => {
          setSheetUrl(preset.url);
          if (preset.sheetName) setSelectedSheetName(preset.sheetName);
          setIsPresetModalOpen(false);
          setTimeout(() => {
            handleFetchSheetData(preset.sheetName);
          }, 100);
        }}
        onPresetsUpdated={(updatedPresets) => {
          setPresets(updatedPresets);
        }}
      />
    </div>
  );
}
