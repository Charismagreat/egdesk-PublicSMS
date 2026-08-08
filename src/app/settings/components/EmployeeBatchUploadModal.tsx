"use client";

import React, { useState } from "react";
import { 
  Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2, Users 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

import * as XLSX from "xlsx";

interface EmployeeBatchUploadModalProps {
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

export default function EmployeeBatchUploadModal({
  isOpen,
  onClose,
  onSuccess,
  workplaces = []
}: EmployeeBatchUploadModalProps) {
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // 1. 표준 엑셀/CSV 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const headers = ["사원번호", "성명", "아이디", "비밀번호", "권한등급(일반직원/부운영자/최고관리자)", "부서", "전화번호", "출근시각", "퇴근시각"];
    const sample1 = ["EMP-001", "홍길동", "hong123", "1234", "일반직원", "영업팀", "010-1234-5678", "09:00", "18:00"];
    const sample2 = ["EMP-002", "김철수", "kim456", "1234", "부운영자", "마케팅팀", "010-9876-5432", "09:00", "18:00"];
    const sample3 = ["EMP-003", "이영희", "lee789", "1234", "일반직원", "개발팀", "010-5555-7777", "09:00", "18:00"];

    const csvContent = "\uFEFF" + [
      headers.join(","),
      sample1.join(","),
      sample2.join(","),
      sample3.join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "직원_계정_일괄등록_표준양식.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. 파일 판독 (XLSX 및 CSV 바이너리 파싱 지원)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          setStatusMsg({ type: 'error', text: '엑셀 파일의 시트를 읽을 수 없습니다.' });
          setParsedData([]);
          return;
        }

        const jsonObjects = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, any>[];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

        if (jsonObjects.length === 0 && (!rows || rows.length < 2)) {
          setStatusMsg({ type: 'error', text: '파일에 등록할 직원 데이터 행이 존재하지 않습니다.' });
          setParsedData([]);
          return;
        }

        const parsedList: ParsedEmployee[] = [];

        if (jsonObjects.length > 0) {
          jsonObjects.forEach((rowObj, idx) => {
            const findVal = (keys: string[], defaultIdx: number) => {
              for (const key of Object.keys(rowObj)) {
                const cleanKey = key.replace(/\s+/g, "").toLowerCase();
                if (keys.some(k => cleanKey.includes(k.toLowerCase()))) {
                  const val = rowObj[key];
                  return val !== undefined && val !== null ? String(val).trim() : "";
                }
              }
              if (rows[idx + 1] && rows[idx + 1][defaultIdx] !== undefined) {
                return String(rows[idx + 1][defaultIdx]).trim();
              }
              return "";
            };

            const empNumber = findVal(["사원번호", "사번", "직원번호"], 0) || `EMP-${100 + idx + 1}`;
            const name = findVal(["성명", "이름", "직원명"], 1);
            const username = findVal(["아이디", "계정아이디", "계정"], 2);
            const password = findVal(["비밀번호", "암호", "패스워드"], 3) || "1234";
            const rawRole = findVal(["권한등급", "권한", "등급", "직급"], 4) || "일반직원";
            const department = findVal(["부서", "소속부서", "팀"], 5);
            const phone = findVal(["전화번호", "휴대폰", "연락처"], 6);
            const startTime = findVal(["출근시각", "출근시간", "출근"], 7) || "09:00";
            const endTime = findVal(["퇴근시각", "퇴근시간", "퇴근"], 8) || "18:00";

            let role = 'EMPLOYEE';
            if (rawRole.includes('최고관리자') || rawRole.toUpperCase() === 'SUPER_ADMIN') role = 'SUPER_ADMIN';
            else if (rawRole.includes('부운영자') || rawRole.toUpperCase() === 'SUB_OPERATOR') role = 'SUB_OPERATOR';

            let isValid = true;
            let errorMsg = '';
            if (!name) { isValid = false; errorMsg = '성명 누락'; }
            else if (!username) { isValid = false; errorMsg = '아이디 누락'; }

            parsedList.push({
              employee_number: empNumber,
              name,
              username,
              password,
              role,
              department,
              phone,
              work_start_time: startTime,
              work_end_time: endTime,
              isValid,
              errorMsg
            });
          });
        } else if (rows.length >= 2) {
          rows.slice(1).forEach((cols, idx) => {
            if (!cols || cols.length === 0) return;
            const empNumber = String(cols[0] || `EMP-${100 + idx + 1}`).trim();
            const name = String(cols[1] || '').trim();
            const username = String(cols[2] || '').trim();
            const password = String(cols[3] || '1234').trim();
            const rawRole = String(cols[4] || '일반직원').trim();
            const department = String(cols[5] || '').trim();
            const phone = String(cols[6] || '').trim();
            const startTime = String(cols[7] || '09:00').trim();
            const endTime = String(cols[8] || '18:00').trim();

            let role = 'EMPLOYEE';
            if (rawRole.includes('최고관리자') || rawRole.toUpperCase() === 'SUPER_ADMIN') role = 'SUPER_ADMIN';
            else if (rawRole.includes('부운영자') || rawRole.toUpperCase() === 'SUB_OPERATOR') role = 'SUB_OPERATOR';

            let isValid = true;
            let errorMsg = '';
            if (!name) { isValid = false; errorMsg = '성명 누락'; }
            else if (!username) { isValid = false; errorMsg = '아이디 누락'; }

            parsedList.push({
              employee_number: empNumber,
              name,
              username,
              password,
              role,
              department,
              phone,
              work_start_time: startTime,
              work_end_time: endTime,
              isValid,
              errorMsg
            });
          });
        }

        setParsedData(parsedList);
        if (parsedList.length === 0) {
          setStatusMsg({ type: 'error', text: '올바른 형식의 직원 데이터를 찾을 수 없습니다.' });
        }
      } catch (err: any) {
        console.error("Excel parsing error:", err);
        setStatusMsg({ type: 'error', text: `엑셀 판독 중 오류 발생: ${err.message}` });
        setParsedData([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 3. 서버에 직원 일괄 등록 전송
  const handleSubmitBatch = async () => {
    const validRows = parsedData.filter(d => d.isValid);
    if (validRows.length === 0) {
      setStatusMsg({ type: 'error', text: '등록 가능한 유효한 직원 데이터가 없습니다.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_register",
          employees: validRows
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: 'success',
          text: `🎉 총 ${data.count || validRows.length}명의 직원 계정이 성공적으로 일괄 등록되었습니다.`
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setStatusMsg({ type: 'error', text: `등록 실패: ${data.error || '오류 발생'}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `서버 통신 오류: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedData.filter(d => d.isValid).length;
  const invalidCount = parsedData.filter(d => !d.isValid).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">직원 계정 엑셀 일괄 등록</h3>
              <p className="text-xs text-slate-500 mt-0.5">엑셀/CSV 표준 파일로 다수의 신규 임직원 계정을 한 번에 생성합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 영역 */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-left">
          {/* 상태 메시지 알림 */}
          {statusMsg && (
            <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* 컨트롤 영역: 템플릿 다운로드 및 파일 업로드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 표준 템플릿 다운로드 카드 */}
            <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/40 space-y-2">
              <span className="text-xs font-black text-slate-800 block">1. 엑셀 작성 템플릿 양식 준비</span>
              <p className="text-[11px] text-slate-500">정해진 사원번호, 성명, 아이디, 비밀번호 규격의 샘플 양식을 다운로드합니다.</p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full mt-2 px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>📊 직원 일괄등록 표준 양식 (.csv) 다운로드</span>
              </button>
            </div>

            {/* 엑셀 파일 선택 드롭존 */}
            <div className="border border-dashed border-indigo-300 rounded-2xl p-4 bg-indigo-50/20 text-center flex flex-col items-center justify-center space-y-2">
              <Upload className="w-6 h-6 text-indigo-600" />
              <span className="text-xs font-bold text-slate-700">2. 작성 완료된 엑셀/CSV 파일 선택</span>
              <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center gap-1.5">
                <span>파일 업로드 선택</span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {fileName && <span className="text-[11px] font-bold text-indigo-700 mt-1 truncate max-w-full">선택됨: {fileName}</span>}
            </div>
          </div>

          {/* 미리보기 및 유효성 결과 판독 테이블 */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>판독 검증 결과 (총 {parsedData.length}건)</span>
                </h4>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">정상: {validCount}건</span>
                  {invalidCount > 0 && <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">오류: {invalidCount}건</span>}
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">상태</th>
                      <th className="p-2.5">사원번호</th>
                      <th className="p-2.5">성명</th>
                      <th className="p-2.5">아이디</th>
                      <th className="p-2.5">권한</th>
                      <th className="p-2.5">부서</th>
                      <th className="p-2.5">전화번호</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((emp, idx) => (
                      <tr key={idx} className={emp.isValid ? "hover:bg-slate-50" : "bg-rose-50/30"}>
                        <td className="p-2.5">
                          {emp.isValid ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">정상</span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">{emp.errorMsg}</span>
                          )}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-700">{emp.employee_number}</td>
                        <td className="p-2.5 font-bold text-slate-900">{emp.name}</td>
                        <td className="p-2.5 font-mono text-indigo-600">{emp.username}</td>
                        <td className="p-2.5">
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {emp.role === 'SUPER_ADMIN' ? '최고관리자' : emp.role === 'SUB_OPERATOR' ? '부운영자' : '일반직원'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">{emp.department || '-'}</td>
                        <td className="p-2.5 text-slate-600">{emp.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSubmitting || validCount === 0}
            onClick={handleSubmitBatch}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>일괄 등록 처리 중...</span>
              </>
            ) : (
              <span>등록 가능한 {validCount}명 일괄 등록 완료 🚀</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
