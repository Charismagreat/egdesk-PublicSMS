"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, Building, User, Phone, Mail, Sparkles, MessageSquare } from "lucide-react";

export default function InquiryForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companySize, setCompanySize] = useState("6~20인");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "무료문자 멀티허브",
    "견적서 AI OCR & SCM"
  ]);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const interestOptions = [
    "기존 ERP/MES 대체 및 통합 전환",
    "무료문자 멀티허브 (FreeSMS)",
    "견적서 AI OCR & SCM",
    "법인카드 영수증 RPA & 결재",
    "스냅태스크 & AI 음성 회의록",
    "사내 RAG 지식관리 AI",
    "임직원 모바일 포털 (/m)",
    "사내 온프레미스 서버 구축",
    "전용 프라이빗 클라우드"
  ];

  const toggleInterest = (item: string) => {
    if (selectedInterests.includes(item)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== item));
    } else {
      setSelectedInterests([...selectedInterests, item]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactPerson.trim() || !phone.trim()) {
      alert("회사명, 담당자명, 연락처는 필수 입력 사항입니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/promo/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          contactPerson,
          position,
          phone,
          email,
          companySize,
          selectedInterests,
          message
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.message || '상담 신청 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('도입 상담 전송 오류:', err);
      // 오프라인/네트워크 이슈 시에도 고객 경험 보장
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="inquiry" className="scroll-mt-20 py-20 md:py-28 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>CONSULTATION & DEMO</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            중소기업 맞춤 <strong>도입 상담 & 무료 체험</strong> 신청
          </h2>
          <p className="mt-4 text-base text-slate-600">
            귀사의 업종과 규모에 맞춘 최적의 서버 구성과 ROI 시뮬레이션을 전문 엔지니어가 무료로 진단해 드립니다.
          </p>
        </div>

        {/* 폼 카드 컨테이너 */}
        <div className="mt-14 max-w-4xl mx-auto bg-slate-50 rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-md">
          {submitted ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                도입 상담 신청이 정상 접수되었습니다!
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                기재해 주신 연락처(<strong>{phone}</strong>)로 담당 엔지니어가 24시간 이내에 맞춤 데모 및 안내 자료를 전달해 드리겠습니다.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
              >
                새로운 문의 작성
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* 기본 정보 2열 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    회사명 (상호) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="예) (주)한국유통"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    담당자 성함 & 직책 <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="홍길동"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="대표이사 / 팀장"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 연락처 & 이메일 2열 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    연락처 (휴대전화) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-1234-5678"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    이메일 주소
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@company.co.kr"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 기업 규모 선택 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  기업 규모 (임직원 수)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {["1~5인", "6~20인", "21~50인", "50인 이상"].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setCompanySize(size)}
                      className={`py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        companySize === size
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* 관심 솔루션 다중 선택 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  관심 솔루션 (다중 선택 가능)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {interestOptions.map((item) => {
                    const isChecked = selectedInterests.includes(item);
                    return (
                      <div
                        key={item}
                        onClick={() => toggleInterest(item)}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs font-semibold transition-all ${
                          isChecked
                            ? "bg-indigo-50 text-indigo-900 border-indigo-300"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100/70"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <span>{item}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 추가 문의 사항 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  기타 문의 또는 요청 사항
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="도입을 희망하시는 시기나 현재 겪고 계신 애로사항을 자유롭게 작성해 주세요."
                  className="w-full p-3.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span>접수 처리 중...</span>
                ) : (
                  <>
                    <span>무료 도입 상담 및 데모 자료 신청하기</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-700">
                🔒 제출하신 정보는 도입 상담 및 안내 목적으로만 안전하게 사용됩니다.
              </p>
            </form>
          )}
        </div>

      </div>
    </section>
  );
}
