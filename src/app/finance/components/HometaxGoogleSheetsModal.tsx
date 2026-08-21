"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, Receipt, AlertCircle, CheckCircle2, X, Loader2, RefreshCw, Check, ArrowDownLeft, ArrowUpRight 
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl } from "@/lib/google-sheets-storage";

interface HometaxGoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedHometaxInvoice {
  issue_date: string;
  approval_no: string;
  type: 'PURCHASE' | 'SALES';
  supplier_corp_num: string;
  supplier_corp_name: string;
  supplier_ceo_name: string;
  buyer_corp_num: string;
  buyer_corp_name: string;
  buyer_ceo_name: string;
  supply_amount: number;
  tax_amount: number;
  total_amount: number;
  item_name: string;
  remark: string;
}

export default function HometaxGoogleSheetsModal({
  isOpen,
  onClose,
  onSuccess
}: HometaxGoogleSheetsModalProps) {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [parsedInvoices, setParsedInvoices] = useState<ParsedHometaxInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSheetUrl(getSavedGoogleSheetUrl());
      setParsedInvoices([]);
      setStatusMsg(null);
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
    setParsedInvoices([]);

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

      // 홈택스 탭 자동 매칭
      let curSheet = data.sheetName;
      if (!overrideSheetName && !selectedSheetName && data.availableSheets) {
        const hometaxTab = data.availableSheets.find((s: string) => s.includes("홈택스") || s.includes("세금계산서") || s.includes("매입") || s.includes("매출"));
        if (hometaxTab && hometaxTab !== data.sheetName) {
          setSelectedSheetName(hometaxTab);
          return handleFetchSheetData(hometaxTab);
        }
      }
      setSelectedSheetName(curSheet);

      const headers: string[] = data.headers || [];
      const rows: any[][] = data.rows || [];

      if (rows.length === 0) {
        setStatusMsg({ type: 'error', text: `[${curSheet}] 시트에 데이터 행이 존재하지 않습니다.` });
        return;
      }

      // 탭 이름으로 기본 type 추론 (매출 vs 매입)
      const defaultType: 'PURCHASE' | 'SALES' = curSheet.includes("매출") ? 'SALES' : 'PURCHASE';

      const list: ParsedHometaxInvoice[] = [];

      rows.forEach((rowArr) => {
        let issue_date = "";
        let approval_no = "";
        let supplier_corp_num = "";
        let supplier_corp_name = "";
        let supplier_ceo_name = "";
        let buyer_corp_num = "";
        let buyer_corp_name = "";
        let buyer_ceo_name = "";
        let supply_amount = 0;
        let tax_amount = 0;
        let total_amount = 0;
        let item_name = "";
        let remark = "";

        headers.forEach((h, colIdx) => {
          const cleanH = String(h || "").replace(/\s+/g, "").toLowerCase();
          const val = String(rowArr[colIdx] || "").trim();

          if (cleanH.includes("작성일자") || cleanH.includes("발급일자")) issue_date = val;
          else if (cleanH.includes("승인번호")) approval_no = val;
          else if (cleanH.includes("공급자사업자등록번호") || (cleanH.includes("공급자") && cleanH.includes("등록번호"))) supplier_corp_num = val;
          else if (cleanH.includes("공급자상호") || cleanH === "상호") supplier_corp_name = val;
          else if (cleanH.includes("공급자대표자") || cleanH === "대표자명") supplier_ceo_name = val;
          else if (cleanH.includes("공급받는자사업자등록번호") || (cleanH.includes("공급받는자") && cleanH.includes("등록번호"))) buyer_corp_num = val;
          else if (cleanH.includes("공급받는자상호")) buyer_corp_name = val;
          else if (cleanH.includes("공급받는자대표자")) buyer_ceo_name = val;
          else if (cleanH.includes("공급가액")) supply_amount = parseInt(val.replace(/[^0-9-]/g, "")) || 0;
          else if (cleanH.includes("세액")) tax_amount = parseInt(val.replace(/[^0-9-]/g, "")) || 0;
          else if (cleanH.includes("합계금액") || cleanH.includes("총액")) total_amount = parseInt(val.replace(/[^0-9-]/g, "")) || 0;
          else if (cleanH.includes("품목명") || cleanH.includes("품목")) item_name = val;
          else if (cleanH.includes("비고")) remark = val;
        });

        if (!total_amount && supply_amount) {
          total_amount = supply_amount + tax_amount;
        }

        if (issue_date || approval_no || supplier_corp_name || buyer_corp_name) {
          list.push({
            issue_date: issue_date || new Date().toISOString().split('T')[0],
            approval_no: approval_no || `HT-${Math.floor(100000 + Math.random() * 900000)}`,
            type: defaultType,
            supplier_corp_num,
            supplier_corp_name,
            supplier_ceo_name,
            buyer_corp_num,
            buyer_corp_name,
            buyer_ceo_name,
            supply_amount,
            tax_amount,
            total_amount,
            item_name,
            remark
          });
        }
      });

      setParsedInvoices(list);
      setStatusMsg({
        type: 'success',
        text: `✅ [${data.spreadsheetTitle}] '${curSheet}' 탭에서 총 ${list.length}건 (${defaultType === 'SALES' ? '매출' : '매입'} 세금계산서)을 판독했습니다!`
      });
    } catch (err: any) {
      console.error("Hometax Google Sheets error:", err);
      setStatusMsg({ type: 'error', text: `연동 오류: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = async () => {
    if (parsedInvoices.length === 0) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch("/api/finance/hometax-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoices: parsedInvoices })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: 'success',
          text: `🎉 총 ${data.insertedCount || parsedInvoices.length}건의 홈택스 세금계산서가 성공적으로 일괄 등록되었습니다.`
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
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-700 rounded-2xl">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                국세청 홈택스 구글 스프레드시트 연동
                <span className="text-[10px] font-extrabold bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full border border-teal-100">
                  클라우드 실시간 동기화
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">구글 시트의 홈택스 매입/매출 세금계산서 탭을 실시간으로 읽어와 회계 장부에 일괄 적재합니다.</p>
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
            <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              구글 스프레드시트 URL 또는 Spreadsheet ID
            </label>
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
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => handleFetchSheetData()}
                disabled={isLoading || !sheetUrl.trim()}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isLoading || !sheetUrl.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 active:scale-95"
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

            {availableSheets.length > 1 && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 text-xs">
                <span className="font-bold text-slate-600 shrink-0">대상 탭 선택:</span>
                <select
                  value={selectedSheetName}
                  onChange={(e) => {
                    setSelectedSheetName(e.target.value);
                    handleFetchSheetData(e.target.value);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {availableSheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400">('홈택스매입' 또는 '홈택스매출' 탭 권장)</span>
              </div>
            )}
          </div>

          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                statusMsg.type === "success"
                  ? "bg-teal-50 text-teal-900 border border-teal-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {parsedInvoices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-600" />
                  <h4 className="font-bold text-slate-800 text-xs">
                    판독된 세금계산서 목록 미리보기 ({parsedInvoices.length}건)
                  </h4>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">구분</th>
                      <th className="py-2.5 px-3">작성일자</th>
                      <th className="py-2.5 px-3">공급자 상호</th>
                      <th className="py-2.5 px-3">공급받는자 상호</th>
                      <th className="py-2.5 px-3">공급가액</th>
                      <th className="py-2.5 px-3">세액</th>
                      <th className="py-2.5 px-3">합계금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedInvoices.map((inv, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            inv.type === 'SALES' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {inv.type === 'SALES' ? '매출' : '매입'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">{inv.issue_date}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{inv.supplier_corp_name || '-'}</td>
                        <td className="py-2 px-3 text-slate-700">{inv.buyer_corp_name || '-'}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {inv.supply_amount.toLocaleString()}원
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {inv.tax_amount.toLocaleString()}원
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-600">
                          {inv.total_amount.toLocaleString()}원
                        </td>
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
            disabled={parsedInvoices.length === 0 || isSubmitting}
            onClick={handleApplyImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              parsedInvoices.length === 0 || isSubmitting
                ? "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 active:scale-95"
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
                <span>{parsedInvoices.length}건 세금계산서 일괄 등록</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
