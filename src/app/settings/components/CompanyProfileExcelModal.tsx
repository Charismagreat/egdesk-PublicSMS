"use client";

import React, { useState } from "react";
import { 
  Upload, Download, Building2, AlertCircle, CheckCircle2, X, Loader2, CreditCard, Globe, Mail, Phone, MapPin 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

import * as XLSX from "xlsx";

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

  // 2. 엑셀/CSV 파일 업로드 및 판독 (SheetJS 적용)
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
          setParsedProfile(null);
          return;
        }

        // sheet_to_json으로 2D 배열 및 객체 파싱
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
        const jsonObjects = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, any>[];

        if ((!rows || rows.length < 2) && jsonObjects.length === 0) {
          setStatusMsg({ type: 'error', text: '파일에 회사 정보 데이터 행이 존재하지 않습니다.' });
          setParsedProfile(null);
          return;
        }

        let profileObj: any = null;

        if (jsonObjects.length > 0) {
          const firstRow = jsonObjects[0];

          // 컬럼 헤더 매핑 도우미 (정밀 키워드 및 제외어 지원)
          const cleanKeys = Object.keys(firstRow).map(k => ({
            original: k,
            clean: k.replace(/[\s\(\)\[\]\-_]/g, "").toLowerCase()
          }));

          const findVal = (posKeys: string[], negKeys: string[], defaultIdx: number) => {
            // 1단계: 완전 일치
            for (const item of cleanKeys) {
              if (posKeys.some(pk => item.clean === pk.replace(/[\s\(\)\[\]\-_]/g, "").toLowerCase())) {
                const val = firstRow[item.original];
                if (val !== undefined && val !== null && String(val).trim() !== "") {
                  return String(val).trim();
                }
              }
            }

            // 2단계: 부분 일치 (제외어 필터링)
            for (const item of cleanKeys) {
              if (negKeys.some(nk => item.clean.includes(nk.replace(/[\s\(\)\[\]\-_]/g, "").toLowerCase()))) {
                continue;
              }
              if (posKeys.some(pk => item.clean.includes(pk.replace(/[\s\(\)\[\]\-_]/g, "").toLowerCase()))) {
                const val = firstRow[item.original];
                if (val !== undefined && val !== null && String(val).trim() !== "") {
                  return String(val).trim();
                }
              }
            }

            // 3단계: 인덱스 폴백
            if (rows[1] && rows[1][defaultIdx] !== undefined && String(rows[1][defaultIdx]).trim() !== "") {
              return String(rows[1][defaultIdx]).trim();
            }
            return "";
          };

          const rawCompanyName = findVal(["회사명상호", "회사명", "상호명", "상호", "법인명", "업체명"], [], 0);
          const rawRep = findVal(["대표자성함", "대표자명", "대표자", "대표명", "대표", "성함", "대표이사"], ["전화", "이메일", "연락처"], 1);
          const rawBizNum = findVal(["사업자등록번호", "사업자번호", "등록번호", "사업자"], [], 2);
          const rawPhone = findVal(["대표전화번호", "대표전화", "회사전화", "전화번호", "연락처", "고객센터", "유선전화", "전화"], ["팩스", "휴대폰", "이메일", "대표자", "성함"], 3);
          const rawEmail = findVal(["대표이메일", "이메일주소", "회사이메일", "이메일", "전자우편", "email"], [], 4);
          const rawHomepage = findVal(["홈페이지주소", "홈페이지", "웹사이트주소", "웹사이트", "웹페이지", "회사홈페이지", "homepage", "url"], [], 5);
          const rawSidebarMain = findVal(["사이드바메인타이틀", "메인타이틀", "시스템타이틀", "헤더타이틀", "메인명칭"], [], 6);
          const rawSidebarSub = findVal(["사이드바서브타이틀", "서브타이틀", "시스템설명", "부타이틀", "서브명칭"], [], 7);
          const rawAddress = findVal(
            ["본점소재지주소", "본점소재지", "사업장소재지", "사업장주소", "본점주소", "본사주소", "회사주소", "도로명주소", "소재지", "주소", "회사위치"],
            ["홈페이지", "웹사이트", "이메일", "전자우편", "url", "site", "도메인"],
            8
          );
          const rawBankName = findVal(
            ["입금은행명", "입금은행", "거래은행명", "거래은행", "은행명", "은행"],
            ["계좌", "예금주", "번호"],
            9
          );
          const rawAccountNumber = findVal(
            ["입금계좌번호", "입금계좌", "계좌번호", "통장번호", "계좌"],
            ["은행명", "예금주"],
            10
          );
          const rawAccountHolder = findVal(
            ["예금주성명", "예금주명", "예금주", "계좌주"],
            ["은행", "계좌번호"],
            11
          );

          profileObj = {
            companyName: rawCompanyName,
            representative: rawRep,
            businessNumber: rawBizNum,
            phone: rawPhone,
            email: rawEmail,
            homepage: rawHomepage,
            sidebarMainTitle: rawSidebarMain,
            sidebarSubTitle: rawSidebarSub,
            address: rawAddress,
            bankName: rawBankName,
            accountNumber: rawAccountNumber,
            accountHolder: rawAccountHolder
          };
        } else if (rows.length >= 2) {
          const dataRow = rows[1];
          profileObj = {
            companyName: String(dataRow[0] || "").trim(),
            representative: String(dataRow[1] || "").trim(),
            businessNumber: String(dataRow[2] || "").trim(),
            phone: String(dataRow[3] || "").trim(),
            email: String(dataRow[4] || "").trim(),
            homepage: String(dataRow[5] || "").trim(),
            sidebarMainTitle: String(dataRow[6] || "").trim(),
            sidebarSubTitle: String(dataRow[7] || "").trim(),
            address: String(dataRow[8] || "").trim(),
            bankName: String(dataRow[9] || "").trim(),
            accountNumber: String(dataRow[10] || "").trim(),
            accountHolder: String(dataRow[11] || "").trim()
          };
        }

        if (!profileObj || (!profileObj.companyName && !profileObj.representative && !profileObj.businessNumber)) {
          setStatusMsg({ type: 'error', text: '파일에서 유효한 회사 정보를 읽어올 수 없습니다.' });
          setParsedProfile(null);
          return;
        }

        setParsedProfile(profileObj);
        setStatusMsg({ type: 'success', text: '✅ 엑셀 서식 파일에서 회사 정보 및 무통장 입금 계좌 설정 판독 완료!' });
      } catch (err: any) {
        console.error("Excel parsing error:", err);
        setStatusMsg({ type: 'error', text: `엑셀 파일 판독 중 오류 발생: ${err.message}` });
        setParsedProfile(null);
      }
    };

    reader.readAsArrayBuffer(file);
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

              {/* 무통장 입금 계좌 정보 판독 미리보기 */}
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
