"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, Building2, AlertCircle, CheckCircle2, X, Loader2, Sparkles, RefreshCw, Layers, Check, Users, ShieldCheck, AlertTriangle, Bookmark, History, List
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl, loadSavedGoogleSheetConfig } from "@/lib/google-sheets-storage";
import { sanitizeBusinessNumber, sanitizePhoneNumber, sanitizeEmail, sanitizeAmount } from "@/lib/data-validator";

import GoogleSheetPresetModal, { GoogleSheetPreset } from "@/components/GoogleSheetPresetModal";

interface PartnerGoogleSheetsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (partners: any[]) => Promise<{ success: boolean; addedCount?: number; error?: string }>;
}

const HEADER_MAPPING: Record<string, string> = {
  "상호명": "company_name",
  "거래처구분": "type",
  "사업자번호": "business_number",
  "대표자명": "representative",
  "대표번호": "phone",
  "팩스번호": "fax",
  "계산서이메일": "email",
  "주소": "address",
  "대표담당자": "manager_name",
  "담당자직급": "manager_position",
  "담당자연락처": "manager_phone",
  "담당자이메일": "manager_email",
  "우대등급": "vip_level",
  "여신한도": "credit_limit",
  "프로젝트태그": "tags",
  "태그": "tags",
  "tags": "tags",
  "비고": "memo"
};

export default function PartnerGoogleSheetsImportModal({
  isOpen,
  onClose,
  onImport
}: PartnerGoogleSheetsImportModalProps) {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [presets, setPresets] = useState<GoogleSheetPreset[]>([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<"save" | "list">("save");
  const [parsedPartners, setParsedPartners] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPresetsList = async () => {
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets?domain=partners");
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
      const cachedUrl = getSavedGoogleSheetUrl('partners_sheet_url') || getSavedGoogleSheetUrl();
      setSheetUrl(cachedUrl);
      setParsedPartners([]);
      setValidationErrors([]);
      setStatusMsg(null);
      setIsPresetModalOpen(false);
      fetchPresetsList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 구글 시트 데이터 읽어오기
  const handleFetchSheetData = async (overrideSheetName?: string) => {
    if (!sheetUrl.trim()) {
      setStatusMsg({ type: 'error', text: '구글 스프레드시트 URL 또는 ID를 입력해 주세요.' });
      return;
    }

    setIsLoading(true);
    setStatusMsg(null);
    setParsedPartners([]);
    setValidationErrors([]);

    try {
      setSavedGoogleSheetUrl('partners_sheet_url', sheetUrl, overrideSheetName || selectedSheetName);

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

      let curSheet = overrideSheetName || data.sheetName;
      if (!overrideSheetName && !selectedSheetName && data.availableSheets) {
        const partnerTab = data.availableSheets.find((s: string) => s.includes("거래처"));
        if (partnerTab && partnerTab !== data.sheetName) {
          setSelectedSheetName(partnerTab);
          setSavedGoogleSheetUrl('partners_sheet_url', sheetUrl, partnerTab);
          return handleFetchSheetData(partnerTab);
        }
      }

      if (!curSheet && data.availableSheets && data.availableSheets.length > 0) {
        curSheet = data.availableSheets[0];
      }
      if (curSheet) {
        setSelectedSheetName(curSheet);
        setSavedGoogleSheetUrl('partners_sheet_url', sheetUrl, curSheet);
      }

      // 데이터 파싱
      const headers: string[] = data.headers || [];
      const rows: any[][] = data.rows || [];

      if (rows.length === 0) {
        setStatusMsg({ type: 'error', text: `[${curSheet}] 시트에 데이터 행이 존재하지 않습니다.` });
        return;
      }

      const mappedList: any[] = [];
      const errList: string[] = [];

      rows.forEach((rowArr, idx) => {
        const rowNum = idx + 2;
        const newRow: Record<string, any> = {};

        // 헤더 맵핑
        headers.forEach((h, colIdx) => {
          const cleanH = String(h || "").replace(/\s+/g, "").trim();
          Object.keys(HEADER_MAPPING).forEach((mapKey) => {
            if (cleanH === mapKey.replace(/\s+/g, "")) {
              const engKey = HEADER_MAPPING[mapKey];
              newRow[engKey] = String(rowArr[colIdx] || "").trim();
            }
          });
        });

        // 필수값 검사
        if (!newRow.company_name) {
          errList.push(`[${rowNum}행] '상호명'이 비어 있습니다.`);
        }
        if (!newRow.type) {
          newRow.type = "BUYER"; // 기본값
        } else {
          const upperType = newRow.type.toUpperCase();
          if (upperType.includes("공급") || upperType.includes("VENDOR") || upperType.includes("매입")) {
            newRow.type = "VENDOR";
          } else if (upperType.includes("바이어") || upperType.includes("BUYER") || upperType.includes("매출") || upperType.includes("고객")) {
            newRow.type = "BUYER";
          } else if (upperType.includes("관계") || upperType.includes("AFFILIATE")) {
            newRow.type = "AFFILIATE";
          } else {
            newRow.type = "BUYER";
          }
        }

        const creditSan = sanitizeAmount(newRow.credit_limit);
        newRow.credit_limit = creditSan.value;

        const bnSan = sanitizeBusinessNumber(newRow.business_number);
        newRow.business_number = bnSan.isValid ? bnSan.formatted : (newRow.business_number || '');

        const phoneSan = sanitizePhoneNumber(newRow.phone);
        if (phoneSan.isValid) newRow.phone = phoneSan.formatted;

        const mgrPhoneSan = sanitizePhoneNumber(newRow.manager_phone);
        if (mgrPhoneSan.isValid) newRow.manager_phone = mgrPhoneSan.formatted;

        const emailSan = sanitizeEmail(newRow.email);
        const mgrEmailSan = sanitizeEmail(newRow.manager_email);

        const warnings: string[] = [];
        if (newRow.business_number && !bnSan.isValid && bnSan.warning) warnings.push(bnSan.warning);
        if (newRow.email && !emailSan.isValid && emailSan.warning) warnings.push(emailSan.warning);
        if (newRow.manager_email && !mgrEmailSan.isValid && mgrEmailSan.warning) warnings.push(`담당자 ${mgrEmailSan.warning}`);

        newRow.isValid = Boolean(newRow.company_name) && (bnSan.isValid || !newRow.business_number);
        newRow.validationWarning = warnings.length > 0 ? warnings.join(', ') : undefined;

        if (newRow.company_name) {
          mappedList.push(newRow);
        }
      });

      setValidationErrors(errList);
      setParsedPartners(mappedList);

      const buyerCount = mappedList.filter(p => p.type === "BUYER").length;
      const vendorCount = mappedList.filter(p => p.type === "VENDOR").length;

      setStatusMsg({
        type: 'success',
        text: `✅ [${data.spreadsheetTitle}] '${curSheet}' 탭에서 총 ${mappedList.length}건 (바이어: ${buyerCount}건, 공급사: ${vendorCount}건)을 판독했습니다!`
      });
    } catch (err: any) {
      console.error("Partner Google Sheets fetch error:", err);
      setStatusMsg({ type: 'error', text: `연동 오류: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 일괄 등록 실행
  const handleApplyImport = async () => {
    if (parsedPartners.length === 0) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const result = await onImport(parsedPartners);
      if (result.success) {
        setStatusMsg({ 
          type: 'success', 
          text: `🎉 총 ${result.addedCount || parsedPartners.length}건의 거래처가 성공적으로 시스템에 일괄 등록되었습니다.` 
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMsg({ type: 'error', text: `등록 실패: ${result.error || '오류 발생'}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `등록 오류: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-700 rounded-2xl">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                거래처 마스터 구글 스프레드시트 연동
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">구글 시트 URL을 통해 바이어 및 공급사 거래처 데이터를 실시간 판독하여 일괄 등록합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-600">
          {/* URL 입력 섹션 */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                구글 스프레드시트 URL 또는 Spreadsheet ID
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPresetModalMode("save");
                    setIsPresetModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="현재 입력된 구글 시트 주소를 이름과 함께 저장합니다."
                >
                  <Bookmark className="w-3.5 h-3.5 text-teal-600" />
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

            {/* 다중 시트 탭 선택 */}
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
                <span className="text-[11px] text-slate-400">('거래처 일괄등록 템플릿' 탭 권장)</span>
              </div>
            )}
          </div>

          {/* 상태 알림 메시지 */}
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

          {/* 판독된 거래처 목록 테이블 미리보기 */}
          {parsedPartners.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <h4 className="font-bold text-slate-800 text-xs">
                    가져온 거래처 목록 미리보기 ({parsedPartners.length}건)
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                    바이어 {parsedPartners.filter(p => p.type === 'BUYER').length}건
                  </span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                    공급사 {parsedPartners.filter(p => p.type === 'VENDOR').length}건
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-16">검증</th>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">구분</th>
                      <th className="py-2.5 px-3">상호명</th>
                      <th className="py-2.5 px-3">사업자번호</th>
                      <th className="py-2.5 px-3">대표자명</th>
                      <th className="py-2.5 px-3">대표번호</th>
                      <th className="py-2.5 px-3">이메일</th>
                      <th className="py-2.5 px-3">담당자</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPartners.map((partner, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {partner.isValid !== false ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200" title="상호명/사업자번호/연락처 정상">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              정상
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title={partner.validationWarning || "형식 확인 필요"}>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              확인
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono">{i + 1}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              partner.type === 'VENDOR'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {partner.type === 'VENDOR' ? '공급사' : '바이어'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">{partner.company_name}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{partner.business_number || '-'}</td>
                        <td className="py-2 px-3 text-slate-700">{partner.representative || '-'}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{partner.phone || '-'}</td>
                        <td className="py-2 px-3 text-slate-600">{partner.email || '-'}</td>
                        <td className="py-2 px-3 text-slate-700">
                          {partner.manager_name ? `${partner.manager_name} ${partner.manager_position || ''}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
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
            disabled={parsedPartners.length === 0 || isSubmitting}
            onClick={handleApplyImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              parsedPartners.length === 0 || isSubmitting
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
                <span>{parsedPartners.length}건 거래처 일괄 등록</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 구글 시트 프리셋 저장/목록 모달 */}
      <GoogleSheetPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        domain="partners"
        currentUrl={sheetUrl}
        currentSheetName={selectedSheetName}
        availableSheets={availableSheets}
        spreadsheetTitle={spreadsheetTitle}
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
