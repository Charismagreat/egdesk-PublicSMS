"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { Settings, LifeBuoy, X, Send, Loader2, CheckCircle2, AlertCircle, Calendar, ShieldCheck, User, Building, Phone, Mail, FileText } from "lucide-react";

// 시스템 설정 페이지의 상단 헤더 컴포넌트 (기술 지원 요청 버튼 및 팝업 포함)
export function SettingsHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  
  // 기술 지원 신청 세부 정보 필드 상태값 추가
  const [supportType, setSupportType] = useState<"remote" | "visit">("remote");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("오전 (09:00 ~ 12:00)");
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 오늘 날짜로 희망일자 기본값 세팅
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setPreferredDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // 모달이 열릴 때 본사 정보 자동 로드
  useEffect(() => {
    if (!isOpen) return;

    async function loadCompanyProfile() {
      try {
        const res = await apiFetch("/api/settings?key=my_company_profile");
        const data = await res.json();
        if (data.success && data.value) {
          const parsed = JSON.parse(data.value);
          if (parsed.companyName) setCompanyName(parsed.companyName);
          if (parsed.representative) setRequesterName(parsed.representative);
          if (parsed.phone) setRequesterPhone(parsed.phone);
          if (parsed.email) setRequesterEmail(parsed.email);
        }
      } catch (e) {
        console.error("본사 정보 자동 연동 실패:", e);
      }
    }

    loadCompanyProfile();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 유효성 체크
    if (
      !subject.trim() || 
      !body.trim() || 
      !companyName.trim() || 
      !requesterName.trim() || 
      !requesterPhone.trim() || 
      !requesterEmail.trim()
    ) {
      setStatus({ type: "error", message: "필수 입력 항목(* 표시)을 모두 채워주세요." });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await apiFetch("/api/settings/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          body,
          supportType,
          preferredDate,
          preferredTime,
          companyName,
          position,
          requesterName,
          requesterPhone,
          requesterEmail
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus({
          type: "success",
          message: data.message || "기술 지원 요청이 성공적으로 전송되었습니다. 🟢",
        });
        
        // 제출 후 폼 초기화 (회사 정보 등 기본 로드 값은 보존하되 변동 필드 클리어)
        setSubject("");
        setBody("");
        setPosition("");
        
        // 2초 뒤 모달 닫기 및 상태 초기화
        setTimeout(() => {
          setIsOpen(false);
          setStatus(null);
        }, 2000);
      } else {
        setStatus({
          type: "error",
          message: data.error || "요청 전송 중 오류가 발생했습니다.",
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: "error",
        message: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center">
          <Settings className="w-8 h-8 text-slate-500 mr-3 animate-[spin_4s_linear_infinite]" />
          시스템 설정
        </h1>
        <p className="text-slate-500 mt-2">EGDESK SMS 시스템의 전반적인 환경과 연동 API를 관리합니다.</p>
      </div>

      <div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-500 hover:shadow-indigo-500/10 active:scale-95 transition-all cursor-pointer border-0"
        >
          <LifeBuoy className="w-4 h-4" />
          <span>개발사에 기술 지원 요청하기</span>
        </button>
      </div>

      {/* 기술 지원 요청 상세 모달 팝업 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            
            {/* 모달 헤더 */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm shrink-0">
                  <LifeBuoy className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">개발사 기술 지원 요청</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">상세 요건과 연락처를 남겨주시면 개발팀에서 신속히 조치해 드립니다.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setStatus(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 모달 바디 (스크롤 가능 영역) */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              
              {/* 1. 지원 방식 선택 (원격 접속 / 현장 방문) */}
              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold text-slate-700">기술 지원 방식 *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    supportType === 'remote'
                      ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="supportType"
                      value="remote"
                      checked={supportType === 'remote'}
                      onChange={() => setSupportType('remote')}
                      className="sr-only"
                    />
                    <span>💻 원격 접속 지원</span>
                  </label>
                  <label className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    supportType === 'visit'
                      ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="supportType"
                      value="visit"
                      checked={supportType === 'visit'}
                      onChange={() => setSupportType('visit')}
                      className="sr-only"
                    />
                    <span>🚗 현장 방문 지원</span>
                  </label>
                </div>
              </div>

              {/* 2. 희망 일정 선택 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-450" />
                    지원 희망 일자 *
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-450" />
                    희망 시간대 *
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold cursor-pointer"
                    disabled={submitting}
                  >
                    <option value="오전 (09:00 ~ 12:00)">오전 (09:00 ~ 12:00)</option>
                    <option value="오후 (13:00 ~ 18:00)">오후 (13:00 ~ 18:00)</option>
                    <option value="야간/기타 (상관없음)">야간/기타 (상관없음)</option>
                  </select>
                </div>
              </div>

              {/* 3. 요청자 상세 정보 */}
              <div className="bg-slate-50/50 border border-slate-100 p-4.5 rounded-2xl space-y-4 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5 border-b border-slate-150/40 pb-2">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  요청처 및 연락담당자 정보 (자동완성)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* 회사명 */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" /> 회사명 *
                    </label>
                    <input
                      type="text"
                      placeholder="회사명 자동 로드 실패 시 입력"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold"
                      required
                      disabled={submitting}
                    />
                  </div>

                  {/* 직위 */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-slate-400" /> 직위
                    </label>
                    <input
                      type="text"
                      placeholder="예: 과장, 대표 등"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold"
                      disabled={submitting}
                    />
                  </div>

                  {/* 담당자명 */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" /> 요청자 이름 *
                    </label>
                    <input
                      type="text"
                      placeholder="이름 입력"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold"
                      required
                      disabled={submitting}
                    />
                  </div>

                  {/* 전화번호 */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> 전화번호 *
                    </label>
                    <input
                      type="text"
                      placeholder="예: 010-0000-0000"
                      value={requesterPhone}
                      onChange={(e) => setRequesterPhone(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold"
                      required
                      disabled={submitting}
                    />
                  </div>

                  {/* e메일 */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> 이메일 주소 *
                    </label>
                    <input
                      type="email"
                      placeholder="예: support@company.com"
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-semibold"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              {/* 4. 요청 제목 */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-450" />
                  요청 제목 *
                </label>
                <input
                  type="text"
                  placeholder="예: 설치 및 사용법 안내를 받고 싶습니다"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-semibold"
                  required
                  disabled={submitting}
                />
              </div>

              {/* 5. 요청 상세 내용 */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-450" />
                  요청 상세 내용 *
                </label>
                <textarea
                  rows={4}
                  placeholder="초기 설치 과정에서 겪으시는 어려움이나 기본 기능 및 AI 사용법, 또는 외부 API 연동 방법에 대해 궁금하신 점을 자유롭게 적어주시면 개발사에서 메일 수신 후 상세히 답변해 드립니다."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-semibold resize-none leading-relaxed"
                  required
                  disabled={submitting}
                ></textarea>
              </div>

              {/* 상태 메시지 피드백 */}
              {status && (
                <div
                  className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold ${
                    status.type === "success"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                      : "bg-rose-50 border-rose-100 text-rose-700"
                  }`}
                >
                  {status.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{status.message}</span>
                </div>
              )}

              {/* 푸터 액션 버튼 */}
              <div className="flex justify-end gap-2 pt-2 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setStatus(null);
                  }}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 active:scale-95 transition-all font-bold cursor-pointer bg-white"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting || !subject.trim() || !body.trim() || !companyName.trim() || !requesterName.trim() || !requesterPhone.trim() || !requesterEmail.trim()}
                  className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-white font-bold transition-all border-0 shadow-md ${
                    submitting || !subject.trim() || !body.trim() || !companyName.trim() || !requesterName.trim() || !requesterPhone.trim() || !requesterEmail.trim()
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 hover:bg-indigo-500 active:scale-95 cursor-pointer shadow-indigo-600/10"
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>요청 발송하기</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
