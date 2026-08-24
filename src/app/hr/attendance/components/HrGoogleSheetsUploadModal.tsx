"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, Users, AlertCircle, CheckCircle2, X, Loader2, Sparkles, Building2, Briefcase, RefreshCw, Check, ShieldCheck, AlertTriangle, Bookmark, List
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl } from "@/lib/google-sheets-storage";
import { sanitizeDate, sanitizeAmount, sanitizePhoneNumber, sanitizeEmail } from "@/lib/data-validator";
import GoogleSheetPresetModal, { GoogleSheetPreset } from "@/components/GoogleSheetPresetModal";

interface HrGoogleSheetsUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HrGoogleSheetsUploadModal({
  isOpen,
  onClose,
  onSuccess
}: HrGoogleSheetsUploadModalProps) {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [presets, setPresets] = useState<GoogleSheetPreset[]>([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<"save" | "list">("save");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPresetsList = async () => {
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets?domain=hr_attendance");
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
      setParsedRows([]);
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
    setParsedRows([]);

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

      // HR 탭 자동 매칭
      let curSheet = data.sheetName;
      if (!overrideSheetName && !selectedSheetName && data.availableSheets) {
        const hrTab = data.availableSheets.find((s: string) => s.includes("HR") || s.includes("인사") || s.includes("근태"));
        if (hrTab && hrTab !== data.sheetName) {
          setSelectedSheetName(hrTab);
          return handleFetchSheetData(hrTab);
        }
      }
      setSelectedSheetName(curSheet);

      const headers: string[] = data.headers || [];
      const rows: any[][] = data.rows || [];

      if (rows.length === 0) {
        setStatusMsg({ type: 'error', text: `[${curSheet}] 시트에 데이터 행이 존재하지 않습니다.` });
        return;
      }

      const list: any[] = [];

      rows.forEach((rowArr) => {
        let name = "";
        let username = "";
        let email = "";
        let phone = "";
        let department = "";
        let position = "";
        let hire_date = "";
        let hourly_rate = 0;
        let weekly_work_hours = 40;
        let school = "";
        let major = "";
        let degree = "";
        let graduation_date = "";
        let career_company = "";
        let career_position = "";
        let career_reason = "";

        headers.forEach((h, colIdx) => {
          const cleanH = String(h || "").replace(/\s+/g, "").toLowerCase();
          const val = String(rowArr[colIdx] || "").trim();

          if (cleanH.includes("성명") || cleanH.includes("이름")) name = val;
          else if (cleanH.includes("아이디") || cleanH.includes("사번")) username = val;
          else if (cleanH.includes("이메일")) email = val;
          else if (cleanH.includes("전화")) phone = val;
          else if (cleanH.includes("부서")) department = val;
          else if (cleanH.includes("직급") || cleanH.includes("직책")) position = val;
          else if (cleanH.includes("입사일")) hire_date = val;
          else if (cleanH.includes("시급")) hourly_rate = parseInt(val.replace(/[^0-9]/g, "")) || 0;
          else if (cleanH.includes("근무시간") || cleanH.includes("주당")) weekly_work_hours = parseInt(val.replace(/[^0-9]/g, "")) || 40;
          else if (cleanH.includes("학교") || cleanH.includes("출신")) school = val;
          else if (cleanH.includes("전공")) major = val;
          else if (cleanH.includes("학위")) degree = val;
          else if (cleanH.includes("졸업일")) graduation_date = val;
          else if (cleanH.includes("경력") || cleanH.includes("이전경력")) career_company = val;
          else if (cleanH.includes("이전직급")) career_position = val;
          else if (cleanH.includes("이직사유") || cleanH.includes("사유")) career_reason = val;
        });

        // 인덱스 폴백
        if (!name && rowArr[0]) name = String(rowArr[0]).trim();
        if (!username && rowArr[1]) username = String(rowArr[1]).trim();

        const hireDateSan = sanitizeDate(hire_date);
        const finalHireDate = hireDateSan.isValid ? hireDateSan.value : (hire_date || new Date().toISOString().split('T')[0]);
        const phoneSan = sanitizePhoneNumber(phone);
        const emailSan = sanitizeEmail(email);
        const rateSan = sanitizeAmount(hourly_rate);

        const warnings: string[] = [];
        if (hire_date && !hireDateSan.isValid) warnings.push(hireDateSan.warning || '입사일 확인 필요');
        if (phone && !phoneSan.isValid) warnings.push(phoneSan.warning || '전화번호 확인 필요');
        if (email && !emailSan.isValid) warnings.push(emailSan.warning || '이메일 확인 필요');

        const isValid = Boolean(name) && (!hire_date || hireDateSan.isValid);

        if (name) {
          list.push({
            name,
            username: username || `emp_${Math.floor(1000 + Math.random() * 9000)}`,
            email: emailSan.isValid ? emailSan.value : (email || `${username || 'user'}@egdesk.cloud`),
            phone: phoneSan.isValid ? phoneSan.formatted : (phone || ''),
            department: department || '미배정',
            position: position || '사원',
            hire_date: finalHireDate,
            hourly_rate: rateSan.value || 10000,
            weekly_work_hours: weekly_work_hours || 40,
            school,
            major,
            degree,
            graduation_date,
            career_company,
            career_position,
            career_reason,
            isValid,
            validationWarning: warnings.length > 0 ? warnings.join(', ') : undefined
          });
        }
      });

      setParsedRows(list);
      setStatusMsg({
        type: 'success',
        text: `✅ [${data.spreadsheetTitle}] '${curSheet}' 탭에서 총 ${list.length}명의 HR 임직원 데이터를 판독했습니다!`
      });
    } catch (err: any) {
      console.error("HR Google Sheets error:", err);
      setStatusMsg({ type: 'error', text: `연동 오류: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = async () => {
    if (parsedRows.length === 0) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch("/api/hr/batch-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: 'success',
          text: `🎉 총 ${data.insertedCount || parsedRows.length}명의 HR 임직원 정보가 성공적으로 일괄 등록되었습니다.`
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
                HR 인사/근태 종합 구글 스프레드시트 연동 등록
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">구글 시트의 HR 종합 서식을 실시간으로 읽어와 임직원 인적사항 및 급여 마스터를 자동 생성합니다.</p>
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
                <span className="text-[11px] text-slate-400">('HR_인사종합_일괄등록_표준양식' 탭 권장)</span>
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

          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  <h4 className="font-bold text-slate-800 text-xs">
                    판독된 HR 임직원 목록 미리보기 ({parsedRows.length}명)
                  </h4>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-16">검증</th>
                      <th className="py-2.5 px-3">성명</th>
                      <th className="py-2.5 px-3">아이디(사번)</th>
                      <th className="py-2.5 px-3">부서</th>
                      <th className="py-2.5 px-3">직급</th>
                      <th className="py-2.5 px-3">입사일</th>
                      <th className="py-2.5 px-3">시급</th>
                      <th className="py-2.5 px-3">학력/전공</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((emp, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {emp.isValid !== false ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200" title="성명 및 입사일 정상">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              정상
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title={emp.validationWarning || "형식 확인 필요"}>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              확인
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">{emp.name}</td>
                        <td className="py-2 px-3 font-mono text-indigo-600">{emp.username}</td>
                        <td className="py-2 px-3 text-slate-600">{emp.department}</td>
                        <td className="py-2 px-3 text-slate-700">{emp.position}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{emp.hire_date}</td>
                        <td className="py-2 px-3 font-mono text-emerald-600 font-bold">
                          {emp.hourly_rate ? `${emp.hourly_rate.toLocaleString()}원` : '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {emp.school ? `${emp.school} ${emp.major ? `(${emp.major})` : ''}` : '-'}
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
            disabled={parsedRows.length === 0 || isSubmitting}
            onClick={handleApplyImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              parsedRows.length === 0 || isSubmitting
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
                <span>{parsedRows.length}명 HR 인사 일괄 등록</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 구글 시트 프리셋 저장/목록 모달 */}
      <GoogleSheetPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        domain="hr_attendance"
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
