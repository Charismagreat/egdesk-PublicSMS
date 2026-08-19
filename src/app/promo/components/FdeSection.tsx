"use client";

import React, { useState } from "react";
import { 
  Users, 
  Briefcase, 
  Code2, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Terminal, 
  Cpu, 
  Building2, 
  GraduationCap, 
  Send,
  Flame
} from "lucide-react";

export default function FdeSection() {
  const [activeTab, setActiveTab] = useState<"CLIENT" | "ENGINEER">("CLIENT");
  
  // 폼 상태
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyOrOrg, setCompanyOrOrg] = useState("");
  const [careerOrTech, setCareerOrTech] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [message, setMessage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert("이름(담당자명)과 연락처는 필수 입력 항목입니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/promo/fde-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applyType: activeTab,
          name,
          phone,
          email,
          companyOrOrg,
          careerOrTech,
          portfolioUrl,
          message
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.message || "접수 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("FDE 접수 오류:", err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="fde-program" className="scroll-mt-20 py-20 md:py-28 bg-slate-900 text-white relative overflow-hidden border-t border-slate-800">
      {/* 배경 장식 글로우 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 mb-3 shadow-inner">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span>PALANTIR-STYLE ENTERPRISE AI ONBOARDING</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            플랫폼을 넘어 현장으로 —<br className="hidden sm:block" />
            <strong>EGDESK FDE (Forward Deployed Engineer)</strong>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            소프트웨어만 던져두고 떠나지 않습니다. 
            전담 FDE가 귀사 현장에 직접 투입되어 <strong>2주 만에 맞춤형 사내 AI 시스템과 데이터 파이프라인을 완성</strong>합니다.
          </p>
        </div>

        {/* 2-Track 탭 전환 스위치 */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex p-1.5 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md">
            <button
              onClick={() => { setActiveTab("CLIENT"); setSubmitted(false); }}
              className={`px-5 sm:px-8 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "CLIENT"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>🏢 [기업 고객] 전담 FDE 현장 파견 요청</span>
            </button>
            <button
              onClick={() => { setActiveTab("ENGINEER"); setSubmitted(false); }}
              className={`px-5 sm:px-8 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "ENGINEER"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-[1.02]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>👨‍💻 [엔지니어/파트너] FDE 공인 파트너 지원</span>
            </button>
          </div>
        </div>

        {/* 메인 콘텐츠 그리드 (설명 & 신청 폼) */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 좌측: 프로그램 세부 설명 */}
          <div className="lg:col-span-7 space-y-6">
            
            {activeTab === "CLIENT" ? (
              /* 기업 고객용 설명 */
              <div className="bg-slate-800/60 rounded-3xl p-6 sm:p-8 border border-slate-700/80 backdrop-blur-sm space-y-6">
                <div>
                  <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">
                    FOR ENTERPRISE CLIENTS
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">
                    사내 개발자 채용 없이, 2주 만에 AI 시스템 완성
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                    AI 전문가를 월 수천만 원에 고용할 필요가 없습니다. EGDESK 공인 FDE가 귀사에 상주/밀착하여 현업 실무자들의 요구사항을 분석하고, 사내 데이터 연동 및 맞춤 에이전트를 실무에 완벽히 정착시켜 드립니다.
                  </p>
                </div>

                {/* 4단계 구축 로드맵 */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-400">FDE 2주 쾌속 구축 프로세스:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60">
                      <div className="text-xs font-extrabold text-indigo-400">STEP 1. 현장 도메인 정밀 진단</div>
                      <p className="text-xs text-slate-400 mt-1">견적·재고·영수증·도면 등 병목 업무 전수 파악</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60">
                      <div className="text-xs font-extrabold text-indigo-400">STEP 2. 사내 데이터 파이프라인 연동</div>
                      <p className="text-xs text-slate-400 mt-1">기존 엑셀/DB를 프라이빗 데이터 레이크로 무손실 마이그레이션</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60">
                      <div className="text-xs font-extrabold text-indigo-400">STEP 3. 맞춤형 AI 에이전트 빌드</div>
                      <p className="text-xs text-slate-400 mt-1">사내 규정 RAG 지식 비서 및 3초 OCR 워크플로우 커스텀 구축</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60">
                      <div className="text-xs font-extrabold text-indigo-400">STEP 4. 전사 실무 온보딩 &amp; 검증</div>
                      <p className="text-xs text-slate-400 mt-1">임직원 실무 교육 및 비용 절감 지표(ROI) 검증</p>
                    </div>
                  </div>
                </div>

                {/* 핵심 보증 뱃지 */}
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    전담 엔지니어 책임 보증
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/80 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    정부 AI 바우처 연계 가능
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-800/80 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    100% 프라이빗 보안 준수
                  </span>
                </div>
              </div>
            ) : (
              /* 엔지니어/파트너 지원용 설명 */
              <div className="bg-slate-800/60 rounded-3xl p-6 sm:p-8 border border-slate-700/80 backdrop-blur-sm space-y-6">
                <div>
                  <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">
                    FOR ENGINEERS &amp; PARTNERS
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">
                    EGDESK 공인 FDE 파트너로 고수익을 창출하세요
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                    강력한 프라이빗 AI 플랫폼 인프라(EGDESK Server)를 무기로, 기업 고객의 현장 AI 구축을 주도하세요. 인프라 구축 고민 없이 검증된 30+ 비즈니스 템플릿과 SDK를 활용하여 건당 수백~수천만 원의 고부가가치 프로젝트 수익을 쉐어합니다.
                  </p>
                </div>

                {/* 파트너 제공 혜택 4종 */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-400">FDE 파트너 전용 혜택:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60">
                      <div className="text-xs font-extrabold text-purple-400">1. 기업 고객 프로젝트 100% 매칭</div>
                      <p className="text-xs text-slate-400 mt-1">영업 부담 없이 본사로 인입된 검증된 기업 고객을 직접 연결</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60">
                      <div className="text-xs font-extrabold text-purple-400">2. EGDESK 엔터프라이즈 라이선스 지원</div>
                      <p className="text-xs text-slate-400 mt-1">연구개발 및 PoC를 위한 프라이빗 서버 라이선스 무상 제공</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60">
                      <div className="text-xs font-extrabold text-purple-400">3. AI 에이전트 빌더 SDK &amp; 컴포넌트</div>
                      <p className="text-xs text-slate-400 mt-1">30+ 즉시 배포형 모듈 소스 코드 및 AI 도메인 프롬프트 팩 제공</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60">
                      <div className="text-xs font-extrabold text-purple-400">4. 프로젝트 구축비 + 라이선스 RS</div>
                      <p className="text-xs text-slate-400 mt-1">초기 구축비 전액 및 고객사 정기 구독 라이선스 지속 수익 쉐어</p>
                    </div>
                  </div>
                </div>

                {/* 파트너 자격 뱃지 */}
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-800/80 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    프리랜서 / SI 개발사 환영
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-800/80 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    AI 바우처 공급기업 컨소시엄 참여
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    공인 FDE 인증서 발급
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* 우측: 간편 신청 및 지원 폼 */}
          <div className="lg:col-span-5">
            <div className="bg-gradient-to-b from-slate-800 to-slate-850 p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl relative">
              
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-black text-white">
                    {activeTab === "CLIENT" ? "FDE 파견 요청이 접수되었습니다" : "FDE 파트너 지원서가 접수되었습니다"}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                    남겨주신 연락처 및 이메일(CHACHOGREAT@GMAIL.COM 전달 완료)로 전담 매니저가 24시간 이내에 직접 안내해 드리겠습니다.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setName("");
                      setPhone("");
                      setEmail("");
                      setMessage("");
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white transition-colors"
                  >
                    추가 접수하기
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-400">
                      {activeTab === "CLIENT" ? "🏢 FDE 현장 파견 / 구축 문의" : "👨‍💻 FDE 공인 파트너 지원"}
                    </span>
                    <h4 className="text-lg font-black text-white mt-0.5">
                      {activeTab === "CLIENT" ? "맞춤 FDE 파견 상담 신청" : "FDE 엔지니어 파트너 간편 등록"}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        {activeTab === "CLIENT" ? "담당자명 *" : "지원자 성명 *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="홍길동"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        연락처 (휴대폰) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        이메일 주소
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        {activeTab === "CLIENT" ? "회사명 / 업종" : "소속 / 활동 형태"}
                      </label>
                      <input
                        type="text"
                        value={companyOrOrg}
                        onChange={(e) => setCompanyOrOrg(e.target.value)}
                        placeholder={activeTab === "CLIENT" ? "(주)대한제조 / 정밀가공" : "프리랜서 / SI개발사"}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {activeTab === "CLIENT" ? "우선 도입 희망 분야" : "주요 기술 스택 / 전문 분야"}
                    </label>
                    <input
                      type="text"
                      value={careerOrTech}
                      onChange={(e) => setCareerOrTech(e.target.value)}
                      placeholder={activeTab === "CLIENT" ? "예: 견적 OCR, 생산계획 간트차트, 데이터 레이크" : "예: Python, TypeScript, LangChain, RAG, Next.js"}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {activeTab === "CLIENT" ? "회사 홈페이지 / 참고 URL" : "포트폴리오 / GitHub / 링크드인 URL"}
                    </label>
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {activeTab === "CLIENT" ? "현장 고민 / 상세 요청사항" : "지원 동기 및 희망 프로젝트 형태"}
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={activeTab === "CLIENT" ? "현재 겪고 계신 서류/데이터 병목 현상을 간단히 적어주세요." : "활동 가능 지역, 희망 투입 형태(상주/원격) 등을 적어주세요."}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 rounded-xl text-xs sm:text-sm font-black text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === "CLIENT"
                        ? "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-indigo-600/30"
                        : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-600/30"
                    } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {loading ? (
                      <span>접수 처리 중...</span>
                    ) : (
                      <>
                        <span>{activeTab === "CLIENT" ? "전담 FDE 현장 파견 상담 신청" : "공인 FDE 파트너 지원서 제출"}</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-500 text-center leading-tight">
                    * 입력하신 정보는 담당자 확인 및 상담 목적 외에 사용되지 않으며 안전하게 보호됩니다.
                  </p>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
