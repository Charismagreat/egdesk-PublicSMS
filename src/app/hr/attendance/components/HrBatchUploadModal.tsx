"use client";

import React, { useState } from "react";
import { 
  Upload, Download, Users, AlertCircle, CheckCircle2, X, Loader2, Sparkles, FileSpreadsheet, Building2, Briefcase 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface HrBatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HrBatchUploadModal({
  isOpen,
  onClose,
  onSuccess
}: HrBatchUploadModalProps) {
  const [fileName, setFileName] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // 1. HR 종합 서식 표준 (.csv) 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const headers = [
      "성명",
      "아이디(사번)",
      "이메일",
      "전화번호",
      "부서",
      "직급",
      "입사일",
      "시급(원)",
      "주당근무시간",
      "최종출신학교",
      "전공",
      "학위",
      "졸업일",
      "주요이전경력",
      "이전직급",
      "이직사유"
    ];

    const sampleRows = [
      [
        "김철수",
        "emp_1001",
        "chulsoo@egdesk.cloud",
        "010-1234-5678",
        "개발1팀",
        "과장",
        "2023-03-02",
        "15000",
        "40",
        "서울대학교",
        "컴퓨터공학",
        "학사",
        "2018-02-25",
        "카카오",
        "대리",
        "전직"
      ],
      [
        "박영희",
        "emp_1002",
        "younghee@egdesk.cloud",
        "010-9876-5432",
        "마케팅팀",
        "대리",
        "2024-01-15",
        "12000",
        "40",
        "연세대학교",
        "경영학",
        "학사",
        "2021-02-25",
        "라인플러스",
        "사원",
        "커리어 발전"
      ]
    ];

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...sampleRows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "HR_인사종합_일괄등록_표준양식.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. CSV/엑셀 파일 읽기 및 판독
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) {
        setStatusMsg({ type: 'error', text: '파일에 HR 인사 데이터 행이 존재하지 않습니다.' });
        setParsedRows([]);
        return;
      }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/,|\t/).map(c => c.replace(/^["']|["']$/g, '').trim());
        if (cols.length < 1 || !cols[0]) continue;

        rows.push({
          name: cols[0],
          username: cols[1] || `emp_${Date.now()}_${i}`,
          email: cols[2] || '',
          phone: cols[3] || '010-0000-0000',
          department: cols[4] || '경영지원팀',
          role: cols[5] || '일반직원',
          hireDate: cols[6] || new Date().toISOString().split('T')[0],
          hourlyWage: cols[7] ? Number(cols[7]) : 10030,
          weeklyHours: cols[8] ? Number(cols[8]) : 40,
          schoolName: cols[9] || '',
          major: cols[10] || '',
          degree: cols[11] || '학사',
          graduationDate: cols[12] || '',
          companyName: cols[13] || '',
          prevJobTitle: cols[14] || '',
          leavingReason: cols[15] || '이직'
        });
      }

      setParsedRows(rows);
      setStatusMsg({ type: 'success', text: `✅ 총 ${rows.length}명의 HR 인사 데이터(기본, 학력, 경력, 시급조건) 판독 완료!` });
    };

    reader.readAsText(file, "UTF-8");
  };

  // 3. 서버에 HR 인사 일괄 등록 전송
  const handleBatchSubmit = async () => {
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
        setStatusMsg({ type: 'success', text: data.message });
        setTimeout(() => {
          onSuccess();
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
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">📊 전사 HR 인사 종합 데이터 엑셀 일괄 등록</h3>
              <p className="text-xs text-slate-500 mt-0.5">임직원 인적사항, 학력, 경력, 시급계약 조건을 엑셀 한 장으로 일괄 업로드합니다.</p>
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
          {/* 상태 알림 */}
          {statusMsg && (
            <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* 컨트롤 영역: 템플릿 다운로드 및 업로드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/40 space-y-2">
              <span className="text-xs font-black text-slate-800 block">1. HR 통합 양식 다운로드</span>
              <p className="text-[11px] text-slate-500">인적사항, 학력, 경력, 시급이 완벽 수록된 CSV 작성 양식을 다운로드합니다.</p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full mt-2 px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>📊 HR 통합 양식 (.csv) 다운로드</span>
              </button>
            </div>

            <div className="border border-dashed border-indigo-300 rounded-2xl p-4 bg-indigo-50/20 text-center flex flex-col items-center justify-center space-y-2">
              <Upload className="w-6 h-6 text-indigo-600" />
              <span className="text-xs font-bold text-slate-700">2. 작성된 엑셀/CSV 파일 선택</span>
              <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center gap-1.5">
                <span>HR 파일 선택 업로드</span>
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

          {/* 판독 내역 미리보기 테이블 */}
          {parsedRows.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>판독된 HR 데이터 미리보기 ({parsedRows.length}명)</span>
                </span>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 text-[11px]">
                      <th className="p-2.5 font-bold">성명</th>
                      <th className="p-2.5 font-bold">아이디(사번)</th>
                      <th className="p-2.5 font-bold">부서/직급</th>
                      <th className="p-2.5 font-bold">시급(원)</th>
                      <th className="p-2.5 font-bold">최종출신학교</th>
                      <th className="p-2.5 font-bold">주요이전경력</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-extrabold text-slate-800">{r.name}</td>
                        <td className="p-2.5 font-bold text-indigo-600">{r.username}</td>
                        <td className="p-2.5 text-slate-600">{r.department} / {r.role}</td>
                        <td className="p-2.5 font-extrabold text-emerald-700">{r.hourlyWage.toLocaleString()}원</td>
                        <td className="p-2.5 text-slate-600">{r.schoolName ? `${r.schoolName} (${r.major})` : '-'}</td>
                        <td className="p-2.5 text-slate-600">{r.companyName ? `${r.companyName} (${r.prevJobTitle})` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
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
            disabled={isSubmitting || parsedRows.length === 0}
            onClick={handleBatchSubmit}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>HR 일괄 저장 중...</span>
              </>
            ) : (
              <span>판독 결과 HR 시스템에 일괄 반영 🚀</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
