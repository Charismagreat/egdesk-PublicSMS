"use client";

import React, { useState } from "react";
import { 
  Globe, Building2, AlertCircle, CheckCircle2, X, Loader2, CreditCard, Mail, Phone, MapPin, ExternalLink, RefreshCw 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CompanyProfileGoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProfile: any) => void;
}

export default function CompanyProfileGoogleSheetsModal({
  isOpen,
  onClose,
  onSuccess
}: CompanyProfileGoogleSheetsModalProps) {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [parsedProfile, setParsedProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // 1. 구글 시트 데이터 읽어오기 및 파싱
  const handleFetchSheetData = async (overrideSheetName?: string) => {
    if (!sheetUrl.trim()) {
      setStatusMsg({ type: 'error', text: '구글 스프레드시트 URL 또는 ID를 입력해 주세요.' });
      return;
    }

    setIsLoading(true);
    setStatusMsg(null);
    setParsedProfile(null);

    try {
      const res = await apiFetch("/api/settings/company-profile/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sheetUrl.trim(),
          sheetName: overrideSheetName || selectedSheetName || undefined
        })
      });

      const data = await res.json();

      if (data.success) {
        setParsedProfile(data.profile);
        setSpreadsheetTitle(data.spreadsheetTitle || "");
        setAvailableSheets(data.availableSheets || []);
        setSelectedSheetName(data.sheetName || "");
        setStatusMsg({ 
          type: 'success', 
          text: `✅ [${data.spreadsheetTitle || '구글 시트'}] 시트 '${data.sheetName}'에서 회사 정보를 성공적으로 읽어왔습니다!` 
        });
      } else {
        setStatusMsg({ type: 'error', text: data.error || '구글 시트 데이터를 가져오지 못했습니다.' });
        if (data.availableSheets && data.availableSheets.length > 0) {
          setAvailableSheets(data.availableSheets);
        }
      }
    } catch (err: any) {
      console.error("Google Sheets fetch error:", err);
      setStatusMsg({ type: 'error', text: `연동 오류: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 판독된 회사 정보 저장 및 서버 반영
  const handleApplyProfile = async () => {
    if (!parsedProfile) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "my_company_profile",
          value: JSON.stringify(parsedProfile)
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: '🎉 회사 정보 및 입금 계좌 설정이 성공적으로 저장되었습니다.' });
        setTimeout(() => {
          onSuccess(parsedProfile);
          onClose();
        }, 1200);
      } else {
        setStatusMsg({ type: 'error', text: `저장 실패: ${data.error || '오류 발생'}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `서버 통신 오류: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">구글 스프레드시트 연동 등록</h3>
              <p className="text-xs text-slate-500 mt-0.5">구글 시트 URL을 입력하여 회사 기본 정보 및 입금 계좌를 실시간으로 가져옵니다.</p>
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
          {/* 가이드 안내 */}
          <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-4 flex gap-3 text-xs text-emerald-900">
            <div className="mt-0.5 shrink-0 text-emerald-600 font-bold">ℹ️</div>
            <div className="space-y-1">
              <div className="font-bold text-emerald-950">구글 시트 연동 안내</div>
              <p className="text-emerald-800 leading-relaxed">
                공유 권한이 부여된 구글 스프레드시트 주소를 아래 입력창에 넣고 <strong className="font-semibold text-emerald-950">[데이터 가져오기]</strong>를 누르세요.
                첫 번째 행의 헤더(회사명, 대표자, 사업자등록번호 등)를 자동으로 분석하여 시스템에 연동합니다.
              </p>
            </div>
          </div>

          {/* URL 입력 섹션 */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
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
                placeholder="https://docs.google.com/spreadsheets/d/1A2b3C.../edit"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => handleFetchSheetData()}
                disabled={isLoading || !sheetUrl.trim()}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isLoading || !sheetUrl.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95"
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
          </div>

          {/* 탭(시트) 선택 옵션 (여러 탭이 있는 경우) */}
          {availableSheets.length > 1 && (
            <div className="flex items-center gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="font-bold text-slate-700 shrink-0">대상 탭 선택:</span>
              <select
                value={selectedSheetName}
                onChange={(e) => {
                  setSelectedSheetName(e.target.value);
                  handleFetchSheetData(e.target.value);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {availableSheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 상태 알림 메시지 */}
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* 판독된 회사 정보 미리보기 영역 */}
          {parsedProfile && (
            <div className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-800 text-xs">
                    {spreadsheetTitle ? `[${spreadsheetTitle}] ` : ""}판독된 회사 프로필 정보
                  </h4>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  연동 성공
                </span>
              </div>

              {/* 기본 정보 그리드 */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium text-[11px]">회사명 (상호)</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {parsedProfile.companyName || <span className="text-slate-300 font-normal">미작성</span>}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium text-[11px]">대표자명</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {parsedProfile.representative || <span className="text-slate-300 font-normal">미작성</span>}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium text-[11px]">사업자등록번호</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">
                    {parsedProfile.businessNumber || <span className="text-slate-300 font-normal">미작성</span>}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium text-[11px]">대표전화번호</div>
                  <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {parsedProfile.phone || <span className="text-slate-300 font-normal">미작성</span>}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium text-[11px]">대표이메일</div>
                  <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{parsedProfile.email || <span className="text-slate-300 font-normal">미작성</span>}</span>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium text-[11px]">홈페이지주소</div>
                  <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1 truncate">
                    <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{parsedProfile.homepage || <span className="text-slate-300 font-normal">미작성</span>}</span>
                  </div>
                </div>
              </div>

              {/* 주소 및 사이드바 */}
              <div className="space-y-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-slate-400 font-medium text-[11px] block">본점소재지 주소</span>
                    <span className="font-bold text-slate-800">
                      {parsedProfile.address || <span className="text-slate-300 font-normal">미작성</span>}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2 rounded-xl border border-slate-100 text-[11px]">
                    <span className="text-slate-400 block font-medium">사이드바 메인타이틀</span>
                    <span className="font-bold text-slate-700">{parsedProfile.sidebarMainTitle || "미작성 (기본값 유지)"}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100 text-[11px]">
                    <span className="text-slate-400 block font-medium">사이드바 서브타이틀</span>
                    <span className="font-bold text-slate-700">{parsedProfile.sidebarSubTitle || "미작성 (기본값 유지)"}</span>
                  </div>
                </div>
              </div>

              {/* 입금 계좌 정보 */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-xs">
                <div className="flex items-center gap-1.5 text-indigo-900 font-bold mb-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>무통장 입금 계좌 설정</span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-white/80 p-2 rounded-lg border border-indigo-100/50">
                  <div>
                    <span className="text-[10px] text-slate-400 block">은행명</span>
                    <span className="font-bold text-slate-800">{parsedProfile.bankName || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">계좌번호</span>
                    <span className="font-bold font-mono text-slate-800">{parsedProfile.accountNumber || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">예금주</span>
                    <span className="font-bold text-slate-800">{parsedProfile.accountHolder || "-"}</span>
                  </div>
                </div>
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
            disabled={!parsedProfile || isSubmitting}
            onClick={handleApplyProfile}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              !parsedProfile || isSubmitting
                ? "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>회사 프로필에 적용하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
