"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, Landmark, AlertCircle, CheckCircle2, X, Loader2, RefreshCw, Check, ArrowDownLeft, ArrowUpRight, ShieldCheck, AlertTriangle, Bookmark, List
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl } from "@/lib/google-sheets-storage";
import { sanitizeDate, sanitizeAmount } from "@/lib/data-validator";
import GoogleSheetPresetModal, { GoogleSheetPreset } from "@/components/GoogleSheetPresetModal";

interface BankGoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts?: any[];
}

interface ParsedBankTx {
  transaction_date: string;
  transaction_time: string;
  deposit: number;
  withdrawal: number;
  balance: number;
  description: string;
  branch: string;
  memo: string;
  isValid?: boolean;
  validationWarning?: string;
}

export default function BankGoogleSheetsModal({
  isOpen,
  onClose,
  onSuccess,
  accounts = []
}: BankGoogleSheetsModalProps) {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [bankId, setBankId] = useState<string>("shinhan");
  const [accountId, setAccountId] = useState<string>("");
  const [presets, setPresets] = useState<GoogleSheetPreset[]>([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<"save" | "list">("save");
  const [parsedTxs, setParsedTxs] = useState<ParsedBankTx[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPresetsList = async () => {
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets?domain=bank");
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
      if (accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
    }
  }, [isOpen, accounts]);

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

      // 만약 URL에 gid가 없고 특정 탭도 선택하지 않은 경우에만 은행 관련 탭으로 스마트 추천
      if (!overrideSheetName && !selectedSheetName && !sheetUrl.includes("gid=") && data.availableSheets) {
        const bankTab = data.availableSheets.find((s: string) => 
          s.includes("은행") || s.includes("통장") || s.includes("계좌") || s.includes("입출금") || s.includes("인터넷뱅킹")
        );
        if (bankTab && bankTab !== curSheet) {
          setSelectedSheetName(bankTab);
          return handleFetchSheetData(bankTab);
        }
      }
      setSelectedSheetName(curSheet);

      const headers: string[] = data.headers || [];
      const rows: any[][] = data.rows || [];

      if (rows.length === 0) {
        setStatusMsg({ type: 'error', text: `[${curSheet}] 시트에 데이터 행이 존재하지 않습니다.` });
        return;
      }

      const list: ParsedBankTx[] = [];

      rows.forEach((rowArr) => {
        let rawDate = "";
        let rawTime = "00:00:00";
        let deposit = 0;
        let withdrawal = 0;
        let amount = 0;
        let typeStr = "";
        let balance = 0;
        let description = "";
        let branch = "";
        let memo = "";

        headers.forEach((h, colIdx) => {
          const cleanH = String(h || "").replace(/\s+/g, "").toLowerCase();
          const val = String(rowArr[colIdx] || "").trim();

          if (cleanH.includes("거래일시") || cleanH.includes("거래일자") || cleanH.includes("일시") || cleanH === "날짜") {
            if (val.includes(" ")) {
              const parts = val.split(" ");
              rawDate = parts[0];
              rawTime = parts[1] || "00:00:00";
            } else {
              rawDate = val;
            }
          } else if (cleanH.includes("거래시간") || cleanH === "시간") {
            rawTime = val;
          } else if (cleanH.includes("입금") || cleanH.includes("입금액")) {
            deposit = parseInt(val.replace(/[^0-9-]/g, "")) || 0;
          } else if (cleanH.includes("출금") || cleanH.includes("출금액") || cleanH.includes("지급액")) {
            withdrawal = parseInt(val.replace(/[^0-9-]/g, "")) || 0;
          } else if (cleanH.includes("거래금액") || cleanH.includes("금액")) {
            amount = parseInt(val.replace(/[^0-9-]/g, "")) || 0;
          } else if (cleanH.includes("구분") || cleanH.includes("입출구분")) {
            typeStr = val;
          } else if (cleanH.includes("잔액") || cleanH.includes("거래후잔액")) {
            balance = parseInt(val.replace(/[^0-9-]/g, "")) || 0;
          } else if (cleanH.includes("적요") || cleanH.includes("내용") || cleanH.includes("거래내용") || cleanH.includes("보낸분")) {
            description = description ? `${description} / ${val}` : val;
          } else if (cleanH.includes("취급점") || cleanH.includes("거래점") || cleanH.includes("지점")) {
            branch = val;
          } else if (cleanH.includes("메모") || cleanH.includes("비고")) {
            memo = val;
          }
        });

        // 구분(입금/출금) 컬럼 기반 보정
        if (amount > 0 && !deposit && !withdrawal) {
          if (typeStr.includes("입금") || typeStr.includes("수신")) {
            deposit = amount;
          } else {
            withdrawal = amount;
          }
        }

        // 유효성 검증
        const dateSan = sanitizeDate(rawDate);
        const txDate = dateSan.isValid ? dateSan.value : rawDate;
        const depSan = sanitizeAmount(deposit);
        const withSan = sanitizeAmount(withdrawal);
        const balSan = sanitizeAmount(balance);

        const warnings: string[] = [];
        if (!dateSan.isValid && dateSan.warning) warnings.push(dateSan.warning);
        const isValid = dateSan.isValid && (depSan.value > 0 || withSan.value > 0 || balSan.value > 0 || Boolean(description));

        if (rawDate || description || depSan.value > 0 || withSan.value > 0) {
          list.push({
            transaction_date: txDate || new Date().toISOString().split("T")[0],
            transaction_time: rawTime || "00:00:00",
            deposit: depSan.value,
            withdrawal: withSan.value,
            balance: balSan.value,
            description: description || "통장 거래내역",
            branch,
            memo,
            isValid,
            validationWarning: warnings.length > 0 ? warnings.join(', ') : undefined
          });
        }
      });

      setParsedTxs(list);
      setStatusMsg({
        type: 'success',
        text: `✅ [${data.spreadsheetTitle}] '${curSheet}' 탭에서 총 ${list.length}건의 은행 거래 내역을 판독했습니다!`
      });
    } catch (err: any) {
      console.error("Bank Google Sheets error:", err);
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
      const res = await apiFetch("/api/finance/bank-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: parsedTxs,
          bankId,
          accountId
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: 'success',
          text: `🎉 총 ${data.insertedCount || parsedTxs.length}건의 은행 거래 내역이 성공적으로 일괄 등록되었습니다.`
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
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                인터넷뱅킹 거래내역 구글 스프레드시트 연동
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">구글 시트의 은행 거래내역을 실시간으로 읽어와 법인 계좌 입출금 장부에 일괄 적재합니다.</p>
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
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                구글 스프레드시트 URL 또는 Spreadsheet ID
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPresetModalMode("save");
                    setIsPresetModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="현재 입력된 구글 시트 주소를 이름과 함께 저장합니다."
                >
                  <Bookmark className="w-3.5 h-3.5 text-blue-600" />
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
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => handleFetchSheetData()}
                disabled={isLoading || !sheetUrl.trim()}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isLoading || !sheetUrl.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-95"
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
                <span className="font-bold text-slate-600 shrink-0">은행사:</span>
                <select
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1"
                >
                  <option value="shinhan">신한은행</option>
                  <option value="hana">하나은행</option>
                  <option value="kookmin">KB국민은행</option>
                  <option value="ibk">IBK기업은행</option>
                  <option value="woori">우리은행</option>
                  <option value="nh">NH농협은행</option>
                </select>
              </div>
            </div>
          </div>

          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                statusMsg.type === "success"
                  ? "bg-blue-50 text-blue-900 border border-blue-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
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
                  <Landmark className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-slate-800 text-xs">
                    판독된 거래 내역 목록 미리보기 ({parsedTxs.length}건)
                  </h4>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-16">검증</th>
                      <th className="py-2.5 px-3">거래일시</th>
                      <th className="py-2.5 px-3">적요/내용</th>
                      <th className="py-2.5 px-3 text-right">입금액</th>
                      <th className="py-2.5 px-3 text-right">출금액</th>
                      <th className="py-2.5 px-3 text-right">거래후잔액</th>
                      <th className="py-2.5 px-3">취급점</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedTxs.map((tx, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {tx.isValid !== false ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200" title="거래일시 및 입출금액 정상 검증됨">
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
                          {tx.transaction_date} {tx.transaction_time}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">{tx.description}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-bold">
                          {tx.deposit ? `+${tx.deposit.toLocaleString()}원` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 font-bold">
                          {tx.withdrawal ? `-${tx.withdrawal.toLocaleString()}원` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {tx.balance ? `${tx.balance.toLocaleString()}원` : '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{tx.branch || '-'}</td>
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
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-95"
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
                <span>{parsedTxs.length}건 거래내역 일괄 등록</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 구글 시트 프리셋 저장/목록 모달 */}
      <GoogleSheetPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        domain="bank"
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
