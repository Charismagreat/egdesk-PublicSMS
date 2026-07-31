"use client";

import React, { useState } from "react";
import { 
  Upload, Download, Building2, AlertCircle, CheckCircle2, X, Loader2, CreditCard, Globe, Mail, Phone, MapPin 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CompanyProfileExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProfile: any) => void;
}

export default function CompanyProfileExcelModal({
  isOpen,
  onClose,
  onSuccess
}: CompanyProfileExcelModalProps) {
  const [fileName, setFileName] = useState<string>("");
  const [parsedProfile, setParsedProfile] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // 1. 사용자 요구 표준 예시 데이터가 담긴 CSV 다운로드
  const handleDownloadTemplate = () => {
    const headers = [
      "회사명(상호)", 
      "대표자성함", 
      "사업자등록번호", 
      "대표전화번호", 
      "대표이메일", 
      "홈페이지주소", 
      "사이드바메인타이틀", 
      "사이드바서브타이틀", 
      "본점소재지주소", 
      "입금은행명", 
      "계좌번호", 
      "예금주"
    ];

    const sampleRow = [
      "(주)쿠스-게스트",
      "차민수",
      "731-81-02023",
      "010-7216-5884",
      "chachogreat@gmail.com",
      "https://egdesk.cloud",
      "EGDESK SMS",
      "우리 회사 스마트 AI 시스템",
      "경기도 시흥시 서울대학로 59-69",
      "카카오뱅크",
      "3333-12-1695965",
      "차호석"
    ];

    const csvContent = "\uFEFF" + [
      headers.join(","),
      sampleRow.map(val => `"${val}"`).join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "회사_정보_설정_표준양식.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. 엑셀/CSV 파일 업로드 및 판독
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
        setStatusMsg({ type: 'error', text: '파일에 회사 정보 데이터 행이 존재하지 않습니다.' });
        setParsedProfile(null);
        return;
      }

      // 2번째 줄(데이터 행) 파싱
      const dataRow = lines[1];
      const cols = dataRow.split(/,|\t/).map(c => c.replace(/^["']|["']$/g, '').trim());

      const companyName = cols[0] || '(주)쿠스-게스트';
      const representative = cols[1] || '차민수';
      const businessNumber = cols[2] || '731-81-02023';
      const phone = cols[3] || '010-7216-5884';
      const email = cols[4] || 'chachogreat@gmail.com';
      const homepage = cols[5] || 'https://egdesk.cloud';
      const sidebarMainTitle = cols[6] || 'EGDESK SMS';
      const sidebarSubTitle = cols[7] || '우리 회사 스마트 AI 시스템';
      const address = cols[8] || '경기도 시흥시 서울대학로 59-69';
      const bankName = cols[9] || '카카오뱅크';
      const accountNumber = cols[10] || '3333-12-1695965';
      const accountHolder = cols[11] || '차호석';

      const profileObj = {
        companyName,
        representative,
        businessNumber,
        phone,
        email,
        homepage,
        sidebarMainTitle,
        sidebarSubTitle,
        address,
        bankName,
        accountNumber,
        accountHolder
      };

      setParsedProfile(profileObj);
      setStatusMsg({ type: 'success', text: '✅ 엑셀 서식 파일에서 회사 정보 및 무통장 입금 계좌 설정 판독 완료!' });
    };

    reader.readAsText(file, "UTF-8");
  };

  // 3. 판독된 회사 정보 저장 및 서버 반영
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
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">회사 프로필 & 입금 계좌 엑셀 일괄 등록</h3>
              <p className="text-xs text-slate-500 mt-0.5">엑셀/CSV 표준 작성 파일로 회사 기본 정보 및 사이드바, 입금 계좌를 자동 설정합니다.</p>
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
              <span className="text-xs font-black text-slate-800 block">1. 회사 정보 표준 양식 준비</span>
              <p className="text-[11px] text-slate-500">상호, 사업자번호, 입금 계좌 예시가 들어간 CSV 양식을 다운로드합니다.</p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full mt-2 px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>📊 표준 작성 양식 (.csv) 다운로드</span>
              </button>
            </div>

            {/* 엑셀 파일 선택 드롭존 */}
            <div className="border border-dashed border-indigo-300 rounded-2xl p-4 bg-indigo-50/20 text-center flex flex-col items-center justify-center space-y-2">
              <Upload className="w-6 h-6 text-indigo-600" />
              <span className="text-xs font-bold text-slate-700">2. 작성된 엑셀/CSV 파일 선택</span>
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

          {/* 미리보기 및 판독 카드 */}
          {parsedProfile && (
            <div className="border border-indigo-200/80 bg-indigo-50/30 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span>판독된 회사 정보 미리보기</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">🏢 회사명 (상호)</span>
                  <span className="font-bold text-slate-800">{parsedProfile.companyName}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">👤 대표자 성함</span>
                  <span className="font-bold text-slate-800">{parsedProfile.representative}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">📑 사업자등록번호</span>
                  <span className="font-bold text-slate-800">{parsedProfile.businessNumber}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">📞 대표 전화번호</span>
                  <span className="font-bold text-slate-800">{parsedProfile.phone}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">✉️ 대표 이메일</span>
                  <span className="font-bold text-slate-800">{parsedProfile.email}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">🌐 홈페이지 주소</span>
                  <span className="font-bold text-indigo-600">{parsedProfile.homepage}</span>
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">📍 본점 소재지 주소</span>
                  <span className="font-bold text-slate-800">{parsedProfile.address}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">📌 사이드바 메인 타이틀</span>
                  <span className="font-bold text-slate-800">{parsedProfile.sidebarMainTitle}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">📌 사이드바 서브 타이틀</span>
                  <span className="font-bold text-slate-800">{parsedProfile.sidebarSubTitle}</span>
                </div>
              </div>

              {/* 무통장 입금 계좌 정보 파독 미리보기 */}
              <div className="pt-3 border-t border-indigo-100 bg-white/70 p-3 rounded-xl space-y-1">
                <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>💳 판독된 무통장 입금 계좌</span>
                </span>
                <p className="text-xs font-extrabold text-slate-800">
                  {parsedProfile.bankName} {parsedProfile.accountNumber} (예금주: {parsedProfile.accountHolder})
                </p>
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
            disabled={isSubmitting || !parsedProfile}
            onClick={handleApplyProfile}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>설정 적용 중...</span>
              </>
            ) : (
              <span>판독 결과 회사 설정에 즉시 적용 🚀</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
