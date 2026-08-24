"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, Package, AlertCircle, CheckCircle2, X, Loader2, RefreshCw, Check, Layers, ShieldCheck, AlertTriangle 
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl } from "@/lib/google-sheets-storage";
import { sanitizeAmount, sanitizeQuantity, sanitizeBarcode } from "@/lib/data-validator";

interface InventoryGoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface ParsedInventoryItem {
  item_name: string;
  item_code: string;
  barcode: string;
  category: string;
  spec: string;
  unit: string;
  box_quantity: number;
  unit_price: number;
  type: string;
  isValid?: boolean;
  validationWarning?: string;
}

export default function InventoryGoogleSheetsModal({
  isOpen,
  onClose,
  onSuccess
}: InventoryGoogleSheetsModalProps) {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [parsedItems, setParsedItems] = useState<ParsedInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSheetUrl(getSavedGoogleSheetUrl());
      setParsedItems([]);
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
    setParsedItems([]);

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

      // 재고 탭 자동 매칭
      let curSheet = data.sheetName;
      if (!overrideSheetName && !selectedSheetName && data.availableSheets) {
        const invTab = data.availableSheets.find((s: string) => s.includes("재고") || s.includes("품목") || s.includes("자재"));
        if (invTab && invTab !== data.sheetName) {
          setSelectedSheetName(invTab);
          return handleFetchSheetData(invTab);
        }
      }
      setSelectedSheetName(curSheet);

      const headers: string[] = data.headers || [];
      const rows: any[][] = data.rows || [];

      if (rows.length === 0) {
        setStatusMsg({ type: 'error', text: `[${curSheet}] 시트에 데이터 행이 존재하지 않습니다.` });
        return;
      }

      const list: ParsedInventoryItem[] = [];

      rows.forEach((rowArr) => {
        let item_name = "";
        let item_code = "";
        let barcode = "";
        let category = "일반품목";
        let spec = "";
        let unit = "EA";
        let box_quantity = 1;
        let unit_price = 0;
        let type = "원자재";

        headers.forEach((h, colIdx) => {
          const cleanH = String(h || "").replace(/\s+/g, "").toLowerCase();
          const val = String(rowArr[colIdx] || "").trim();

          if (cleanH.includes("품목명") || cleanH.includes("상품명") || cleanH.includes("자재명")) item_name = val;
          else if (cleanH.includes("품목코드") || cleanH.includes("자재코드")) item_code = val;
          else if (cleanH.includes("바코드")) barcode = val;
          else if (cleanH.includes("카테고리") || cleanH.includes("분류")) category = val;
          else if (cleanH.includes("규격") || cleanH.includes("사이즈")) spec = val;
          else if (cleanH.includes("단위")) unit = val;
          else if (cleanH.includes("입수량") || cleanH.includes("박스당")) {
            box_quantity = parseInt(val.replace(/[^0-9]/g, "")) || 1;
          }
          else if (cleanH.includes("단가") || cleanH.includes("판매단가") || cleanH.includes("입고단가")) {
            unit_price = parseInt(val.replace(/[^0-9]/g, "")) || 0;
          }
          else if (cleanH.includes("구분")) type = val;
        });

        // 인덱스 폴백
        if (!item_name && rowArr[1]) item_name = String(rowArr[1]).trim();
        if (!barcode && rowArr[2]) barcode = String(rowArr[2]).trim();

        const priceSan = sanitizeAmount(unit_price);
        const boxSan = sanitizeQuantity(box_quantity);
        const codeSan = sanitizeBarcode(item_code || barcode);

        const warnings: string[] = [];
        if (!priceSan.isValid) warnings.push(priceSan.warning || '단가 확인 필요');
        if (!boxSan.isValid) warnings.push(boxSan.warning || '입수량 확인 필요');

        const isValid = Boolean(item_name) && priceSan.isValid && boxSan.isValid;

        if (item_name) {
          list.push({
            item_name,
            item_code: item_code || barcode || `INV-${list.length + 1}`,
            barcode: barcode || item_code || "",
            category: category || "일반품목",
            spec,
            unit: unit || "EA",
            box_quantity: Math.max(1, boxSan.value || 1),
            unit_price: priceSan.value,
            type: type || "원자재",
            isValid,
            validationWarning: warnings.length > 0 ? warnings.join(', ') : undefined
          });
        }
      });

      setParsedItems(list);
      setStatusMsg({
        type: 'success',
        text: `✅ [${data.spreadsheetTitle}] '${curSheet}' 탭에서 총 ${list.length}건의 품목 데이터를 판독했습니다!`
      });
    } catch (err: any) {
      console.error("Inventory Google Sheets error:", err);
      setStatusMsg({ type: 'error', text: `연동 오류: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = async () => {
    if (parsedItems.length === 0) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch("/api/inventory/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedItems })
      });

      const data = await res.json();
      if (data.success || res.ok) {
        setStatusMsg({
          type: 'success',
          text: `🎉 총 ${parsedItems.length}건의 품목이 재고 마스터에 성공적으로 일괄 등록되었습니다.`
        });
        setTimeout(() => {
          onSuccess(`구글 시트 연동으로 ${parsedItems.length}건 품목이 일괄 등록되었습니다.`);
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
                재고/품목 구글 스프레드시트 연동 등록
                <span className="text-[10px] font-extrabold bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full border border-teal-100">
                  클라우드 실시간 동기화
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">구글 시트의 재고 일괄 등록 서식을 실시간으로 읽어와 품목 마스터에 일괄 등록합니다.</p>
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
                <span className="font-bold text-slate-600 shrink-0">대상 시트(탭):</span>
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
                <span className="text-[11px] text-slate-400">('재고일괄등록_샘플서식' 탭 권장)</span>
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

          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-teal-600" />
                  <h4 className="font-bold text-slate-800 text-xs">
                    판독된 품목 목록 미리보기 ({parsedItems.length}건)
                  </h4>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-16">검증</th>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">구분</th>
                      <th className="py-2.5 px-3">품목명</th>
                      <th className="py-2.5 px-3">바코드/코드</th>
                      <th className="py-2.5 px-3">카테고리</th>
                      <th className="py-2.5 px-3">규격</th>
                      <th className="py-2.5 px-3">단위</th>
                      <th className="py-2.5 px-3">단가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedItems.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {item.isValid !== false ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200" title="품목명 및 단가 정상">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              정상
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title={item.validationWarning || "형식 확인 필요"}>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              확인
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono">{i + 1}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {item.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">{item.item_name}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{item.barcode || item.item_code}</td>
                        <td className="py-2 px-3 text-slate-600">{item.category}</td>
                        <td className="py-2 px-3 text-slate-500">{item.spec || '-'}</td>
                        <td className="py-2 px-3 text-slate-600">{item.unit}</td>
                        <td className="py-2 px-3 font-mono text-indigo-600 font-bold">
                          {item.unit_price ? `${item.unit_price.toLocaleString()}원` : '-'}
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
            disabled={parsedItems.length === 0 || isSubmitting}
            onClick={handleApplyImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              parsedItems.length === 0 || isSubmitting
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
                <span>{parsedItems.length}건 품목 일괄 등록</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
