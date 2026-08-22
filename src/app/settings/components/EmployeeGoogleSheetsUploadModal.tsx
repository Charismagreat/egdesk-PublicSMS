"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, AlertCircle, CheckCircle2, X, Loader2, Users, RefreshCw, Check 
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl } from "@/lib/google-sheets-storage";

interface EmployeeGoogleSheetsUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workplaces?: any[];
}

interface ParsedEmployee {
  employee_number: string;
  name: string;
  username: string;
  password?: string;
  role: string;
  department?: string;
  phone?: string;
  work_start_time?: string;
  work_end_time?: string;
  isValid: boolean;
  errorMsg?: string;
}

export default function EmployeeGoogleSheetsUploadModal({
  isOpen,
  onClose,
  onSuccess,
  workplaces = []
}: EmployeeGoogleSheetsUploadModalProps) {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSheetUrl(getSavedGoogleSheetUrl());
      setParsedData([]);
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
    setParsedData([]);

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

      // 직원 탭 자동 매칭
      let curSheet = data.sheetName;
      if (!overrideSheetName && !selectedSheetName && data.availableSheets) {
        const empTab = data.availableSheets.find((s: string) => s.includes("직원") || s.includes("사원") || s.includes("계정"));
        if (empTab && empTab !== data.sheetName) {
          setSelectedSheetName(empTab);
          return handleFetchSheetData(empTab);
        }
      }
      setSelectedSheetName(curSheet);

      const headers: string[] = data.headers || [];
      const rows: any[][] = data.rows || [];

      if (rows.length === 0) {
        setStatusMsg({ type: 'error', text: `[${curSheet}] 시트에 데이터 행이 존재하지 않습니다.` });
        return;
      }

      const list: ParsedEmployee[] = [];

      rows.forEach((rowArr, index) => {
        let employee_number = "";
        let name = "";
        let username = "";
        let password = "";
        let role = "EMPLOYEE";
        let department = "";
        let phone = "";
        let work_start_time = "09:00";
        let work_end_time = "18:00";

        headers.forEach((h, colIdx) => {
          const cleanH = String(h || "").replace(/\s+/g, "").toLowerCase();
          const val = String(rowArr[colIdx] || "").trim();

          if (cleanH.includes("사원번호") || cleanH.includes("사번")) employee_number = val;
          else if (cleanH.includes("성명") || cleanH.includes("이름")) name = val;
          else if (cleanH.includes("아이디") || cleanH.includes("계정")) username = val;
          else if (cleanH.includes("비밀번호") || cleanH.includes("패스워드")) password = val;
          else if (cleanH.includes("권한") || cleanH.includes("등급")) {
            if (val.includes("최고") || val.toUpperCase().includes("SUPER_ADMIN")) role = "SUPER_ADMIN";
            else if (val.includes("부운영") || val.toUpperCase().includes("ADMIN") || val.includes("매니저") || val.toUpperCase().includes("SUB_OPERATOR")) role = "SUB_OPERATOR";
            else role = "EMPLOYEE";
          }
          else if (cleanH.includes("부서") || cleanH.includes("소속")) department = val;
          else if (cleanH.includes("전화") || cleanH.includes("연락처")) phone = val;
          else if (cleanH.includes("출근")) work_start_time = val;
          else if (cleanH.includes("퇴근")) work_end_time = val;
        });

        // 인덱스 폴백
        if (!name && rowArr[1]) name = String(rowArr[1]).trim();
        if (!username && rowArr[2]) username = String(rowArr[2]).trim();

        let isValid = true;
        let errorMsg = "";

        if (!name) {
          isValid = false;
          errorMsg = "성명이 누락되었습니다.";
        } else if (!username) {
          isValid = false;
          errorMsg = "아이디가 누락되었습니다.";
        }

        if (name || username || employee_number) {
          list.push({
            employee_number: employee_number || `EMP-${100 + index}`,
            name,
            username,
            password: password || "1234",
            role,
            department,
            phone,
            work_start_time: work_start_time || "09:00",
            work_end_time: work_end_time || "18:00",
            isValid,
            errorMsg
          });
        }
      });

      setParsedData(list);
      const validCount = list.filter(e => e.isValid).length;
      setStatusMsg({
        type: 'success',
        text: `✅ [${data.spreadsheetTitle}] '${curSheet}' 탭에서 총 ${list.length}명 (유효: ${validCount}명)의 직원 데이터를 판독했습니다!`
      });
    } catch (err: any) {
      console.error("Employee Google Sheets error:", err);
      setStatusMsg({ type: 'error', text: `연동 오류: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = async () => {
    const validEmployees = parsedData.filter(e => e.isValid);
    if (validEmployees.length === 0) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_register",
          employees: validEmployees
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: 'success',
          text: `🎉 총 ${data.count || validEmployees.length}명의 직원 계정이 성공적으로 일괄 등록되었습니다.`
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setStatusMsg({ type: 'error', text: `일괄 등록 실패: ${data.error || '오류 발생'}` });
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
                직원 계정 구글 스프레드시트 연동 등록
                <span className="text-[10px] font-extrabold bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full border border-teal-100">
                  클라우드 실시간 동기화
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">구글 시트의 직원 표준 양식을 실시간으로 읽어와 다수의 계정을 일괄 등록합니다.</p>
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
                <span className="text-[11px] text-slate-400">('직원_계정_일괄등록_표준양식' 탭 권장)</span>
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

          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  <h4 className="font-bold text-slate-800 text-xs">
                    판독된 직원 목록 미리보기 ({parsedData.length}명)
                  </h4>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">사원번호</th>
                      <th className="py-2.5 px-3">성명</th>
                      <th className="py-2.5 px-3">아이디</th>
                      <th className="py-2.5 px-3">권한등급</th>
                      <th className="py-2.5 px-3">부서</th>
                      <th className="py-2.5 px-3">전화번호</th>
                      <th className="py-2.5 px-3">근무시간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((emp, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-600">{emp.employee_number}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{emp.name}</td>
                        <td className="py-2 px-3 font-mono text-indigo-600">{emp.username}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            emp.role === 'SUPER_ADMIN' ? 'bg-amber-100 text-amber-800' :
                            (emp.role === 'ADMIN' || emp.role === 'SUB_OPERATOR') ? 'bg-indigo-100 text-indigo-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {emp.role === 'SUPER_ADMIN' ? '최고관리자' : (emp.role === 'ADMIN' || emp.role === 'SUB_OPERATOR') ? '부운영자' : '일반직원'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{emp.department || '-'}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{emp.phone || '-'}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{emp.work_start_time}~{emp.work_end_time}</td>
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
            disabled={parsedData.filter(e => e.isValid).length === 0 || isSubmitting}
            onClick={handleApplyImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              parsedData.filter(e => e.isValid).length === 0 || isSubmitting
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
                <span>{parsedData.filter(e => e.isValid).length}명 직원 일괄 등록</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
