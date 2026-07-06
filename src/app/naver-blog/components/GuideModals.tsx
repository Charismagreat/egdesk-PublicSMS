'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Copy, Terminal } from 'lucide-react';

// 커스텀 네이버 아이콘 SVG 컴포넌트
function NaverIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor"
      className={className}
    >
      <path d="M16.273 2.25h5.477V21.75h-5.477l-8.545-12.3v12.3H2.25V2.25h5.477l8.546 12.3V2.25z"/>
    </svg>
  );
}

interface GuideModalsProps {
  isGuideModalOpen: boolean;
  setIsGuideModalOpen: (v: boolean) => void;
  isDaemonInfoOpen: boolean;
  setIsDaemonInfoOpen: (v: boolean) => void;
  hasSession: boolean;
  copiedText: string | null;
  handleCopyToClipboard: (text: string, label: string) => void;
}

export default function GuideModals({
  isGuideModalOpen,
  setIsGuideModalOpen,
  isDaemonInfoOpen,
  setIsDaemonInfoOpen,
  hasSession,
  copiedText,
  handleCopyToClipboard
}: GuideModalsProps) {

  return (
    <>
      {/* RPA 최초 기동 사전 준비 가이드 모달 */}
      <AnimatePresence>
        {isGuideModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* 배경 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGuideModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* 모달 박스 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
              style={{ maxHeight: '85vh' }}
            >
              {/* 상단 헤더 */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white via-emerald-50/20 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#03C75A] shadow-3xs">
                    <NaverIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      RPA 최초 기동 사전 준비 가이드
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      RPA 최초 자동화 기동 및 로그인 실패 시 아래 4단계를 완료해 주세요.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-all focus:outline-none cursor-pointer border border-slate-150 shadow-3xs"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 스크롤 가능한 본문 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left min-h-0" style={{ overflowY: 'auto' }}>
                
                {/* 인트로 알림 */}
                <div className="p-4.5 bg-emerald-50/60 border border-emerald-150 rounded-2xl flex items-start gap-3 shadow-3xs">
                  <Info className="w-5 h-5 text-[#03C75A] shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-xs text-slate-700 leading-relaxed font-bold">
                    네이버 블로그 무인 자동화(RPA) 기동은 일반 크롬 브라우저가 아닌, Playwright 전용 보안 브라우저 환경을 로컬 PC에 필수로 요구합니다. 아래 안내에 따라 터미널 명령어를 실행하시면 100% 해결됩니다.
                  </p>
                </div>

                {/* 4단계 가이드 리스트 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-450 uppercase tracking-wider">🛠️ RPA 최초 로그인 준비 4단계</h4>
                  
                  {/* 1단계 */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-3xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 text-xs font-black flex items-center justify-center border border-emerald-100">1</span>
                        <h5 className="text-xs font-black text-slate-800">Playwright 전용 Chromium 브라우저 설치 (가장 중요 🌟)</h5>
                      </div>
                      <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">필수 수행</span>
                    </div>
                    <p className="text-[11px] text-slate-555 leading-relaxed font-semibold">
                      프로젝트 루트 디렉토리(<code className="px-1.5 py-0.5 bg-slate-100 border border-slate-250 rounded font-mono text-slate-700">c:\dev\egdesk-FreeSMS</code>)에서 터미널(CMD 또는 PowerShell)을 열고 아래 설치 명령어를 입력해 주세요. (설치 소요 시간 약 1~2분)
                    </p>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-emerald-450 shadow-inner">
                      <span>npx playwright install chromium</span>
                      <button
                        onClick={() => handleCopyToClipboard('npx playwright install chromium', 'Playwright 크로미움 설치')}
                        className="p-1.5 rounded-xl bg-slate-800 hover:!bg-[#03C75A] hover:!text-white transition-all flex items-center gap-1 text-[10px] font-black border border-slate-700 cursor-pointer text-slate-300"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedText === 'npx playwright install chromium' ? '복사됨!' : '복사'}
                      </button>
                    </div>
                  </div>

                  {/* 2단계 */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 shadow-3xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 text-xs font-black flex items-center justify-center border border-emerald-100">2</span>
                      <h5 className="text-xs font-black text-slate-800">GUI 지원 로컬 터미널 환경 확인 (실물 화면 필수)</h5>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      네이버 자동 로그인 창을 화면상에 띄우기 위해서는 백그라운드가 아닌 실제 데스크톱 화면이 지원되는 CMD 터미널에서 구동해야 합니다. 원격 SSH 터미널 단독 기동 시 브라우저 GUI 생성 불가로 실패할 수 있습니다.
                    </p>
                  </div>

                  {/* 3단계 */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-3xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 text-xs font-black flex items-center justify-center border border-emerald-100">3</span>
                      <h5 className="text-xs font-black text-slate-800">로컬 패키지 환경 꼬임 리셋</h5>
                    </div>
                    <p className="text-[11px] text-slate-505 leading-relaxed font-semibold">
                      종종 구버전 패키지 및 라이브러리 간섭 시, 아래 패키지 최적화 설치 명령어를 실행하시면 아주 원활하게 클린 설치가 마무리됩니다.
                    </p>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-emerald-450 shadow-inner">
                      <span>npm install</span>
                      <button
                        onClick={() => handleCopyToClipboard('npm install', 'npm 패키지 복구')}
                        className="p-1.5 rounded-xl bg-slate-800 hover:!bg-[#03C75A] hover:!text-white transition-all flex items-center gap-1 text-[10px] font-black border border-slate-700 cursor-pointer text-slate-300"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedText === 'npm install' ? '복사됨!' : '복사'}
                      </button>
                    </div>
                  </div>

                  {/* 4단계 */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-3xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 text-xs font-black flex items-center justify-center border border-emerald-100">4</span>
                      <h5 className="text-xs font-black text-slate-800">네이버 로그인 및 세션 동기화</h5>
                    </div>
                    <p className="text-[11px] text-slate-555 leading-relaxed font-semibold">
                      모든 준비가 끝났다면 계정 카드 하단의 <strong>[RPA 최초 로그인 브라우저 기동 🚀]</strong>을 클릭하여 크로미움 브라우저 팝업을 띄우고, 네이버 로그인을 손수 완료해 주세요. 로그인 성공 확인 후 바로 아래의 <strong>[세션 동기화 실시간 갱신 🔄]</strong>을 클릭하면 연결 표시등이 🟢 초록빛으로 점등됩니다.
                    </p>
                  </div>
                </div>

                {/* 1초 원인 분석 셀프 진단 */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-3xs">
                  <div className="flex items-center gap-2.5 text-amber-600">
                    <Terminal className="w-4.5 h-4.5" />
                    <h5 className="text-xs font-black uppercase tracking-wider">🔍 1초 만에 원인 파악하는 셀프 진단 명령어</h5>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    웹 화면 상의 비동기 흐름 대신, 터미널에서 RPA 데몬을 직접 실행해 보면 구체적으로 어떤 에러 코드(예: 브라우저 누락 등)로 인해 기동이 실패했는지 한 눈에 파악할 수 있어 강력 추천합니다.
                  </p>
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-emerald-450 shadow-inner">
                    <span>npm run naver:daemon</span>
                    <button
                      onClick={() => handleCopyToClipboard('npm run naver:daemon', 'RPA 데몬 강제 실행')}
                      className="p-1.5 rounded-xl bg-slate-800 hover:!bg-[#03C75A] hover:!text-white transition-all flex items-center gap-1 text-[10px] font-black border border-slate-700 cursor-pointer text-slate-300"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedText === 'npm run naver:daemon' ? '복사됨!' : '복사'}
                    </button>
                  </div>
                  
                  {/* 자가 조치 표 */}
                  <div className="border-t border-slate-200 pt-3 mt-2.5 space-y-1.5 text-slate-500 font-semibold">
                    <div className="flex items-start gap-2 text-[10.5px]">
                      <span className="text-amber-600 font-bold shrink-0">1.</span>
                      <span>
                        <code className="text-rose-600 font-bold">Executable doesn't exist...</code> 에러 검출 시 <strong>1단계 브라우저 설치</strong> 명령어를 실행하시면 100% 해결됩니다.
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-[10.5px]">
                      <span className="text-amber-600 font-bold shrink-0">2.</span>
                      <span>
                        <code className="text-rose-600 font-bold">Cannot find module...</code> 에러 검출 시 <strong>3단계 패키지 재설치</strong> 명령어를 수행하시면 해결됩니다.
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 하단 푸터 */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#03C75A] text-white hover:bg-emerald-600 transition-all text-xs font-bold active:scale-95 shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  확인 완료 및 닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 로컬 PC 데몬 및 백그라운드 구동 정보 모달 */}
      <AnimatePresence>
        {isDaemonInfoOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* 배경 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDaemonInfoOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* 모달 박스 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
              style={{ maxHeight: '85vh' }}
            >
              {/* 상단 헤더 */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white via-emerald-50/20 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#03C75A]">
                    <NaverIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      오토파일럿 로컬 백그라운드 구동 방법 가이드
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      로컬 컴퓨터 전원이 켜져 있을 때 오토파일럿 데몬이 작동하는 구체적인 실무 매뉴얼입니다.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDaemonInfoOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-all focus:outline-none cursor-pointer border border-slate-150"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 스크롤 가능한 본문 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left min-h-0" style={{ overflowY: 'auto' }}>
                
                {/* 현재 로컬 세션 상태 체크 */}
                <div className={`p-4 rounded-2xl flex items-start gap-3 border ${hasSession ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <Info className={`w-5 h-5 shrink-0 mt-0.5 ${hasSession ? 'text-[#03C75A]' : 'text-amber-500'}`} />
                  <div>
                    <h4 className={`text-xs font-bold ${hasSession ? 'text-emerald-700' : 'text-amber-800'}`}>
                      현재 로컬 인증 상태: {hasSession ? '인증 완료 (즉시 구동 가능)' : '최초 1회 로그인 대기 중'}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {hasSession 
                        ? '네이버 로그인 세션 쿠키가 저장되어 있습니다. 예약 글 발행 시 크롬 브라우저 로그인 창 없이 백그라운드에서 바로 자동 포스팅이 작동합니다.' 
                        : '아직 로그인 세션(naver_session.json)이 저장되지 않았습니다. 예약 발행을 시작하기 전에 최초 1회 로그인 창을 열어 인증을 진행해 주셔야 오토파일럿이 활성화됩니다.'}
                    </p>
                  </div>
                </div>

                {/* 1. 터미널에서 직접 실행 및 진단하기 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#03C75A]"></span>
                    방법 1. 터미널에서 직접 실행하여 실시간 로그 검증
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    로컬 PC에서 <strong>PowerShell</strong> 또는 <strong>명령 프롬프트(CMD)</strong>를 열고 아래 명령어를 순서대로 실행해 보세요.
                  </p>
                  
                  <div className="space-y-3">
                    {/* 1단계 명령어 */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-505 font-medium">
                        <span>① 프로젝트 루트 경로로 이동</span>
                        <button
                          onClick={() => {
                            handleCopyToClipboard("cd c:\\dev\\egdesk-FreeSMS", "루트 이동");
                          }}
                          className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-slate-650 active:scale-95 transition-all flex items-center gap-1 cursor-pointer border border-slate-200 shadow-2xs"
                        >
                          <Copy className="w-3 h-3" />
                          <span>복사</span>
                        </button>
                      </div>
                      <code className="block text-xs font-mono text-emerald-600 bg-white p-2.5 rounded-xl border border-slate-200">
                        cd c:\dev\egdesk-FreeSMS
                      </code>
                    </div>

                    {/* 2단계 명령어 */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-505 font-medium">
                        <span>② 자동화 데몬 수동 구동</span>
                        <button
                          onClick={() => {
                            handleCopyToClipboard("npm run naver:daemon", "데몬 구동");
                          }}
                          className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-slate-650 active:scale-95 transition-all flex items-center gap-1 cursor-pointer border border-slate-200 shadow-2xs"
                        >
                          <Copy className="w-3 h-3" />
                          <span>복사</span>
                        </button>
                      </div>
                      <code className="block text-xs font-mono text-emerald-600 bg-white p-2.5 rounded-xl border border-slate-200">
                        npm run naver:daemon
                      </code>
                    </div>
                  </div>

                  {/* 실행 로그 가이드 */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">📋 정상 동작 시 터미널 로그 결과</span>
                    <div className="space-y-2.5 text-xs text-slate-600">
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-mono text-[10px] shrink-0 mt-0.5">대기 모드</span>
                        <span className="text-slate-555">
                          예약글이 없으면 <code className="text-slate-700 font-mono font-semibold">"💤 현재 기준 실행해야 할 발행 예정 예약글이 없습니다..."</code> 로그와 함께 안전 종료되며 대기 모드로 들어갑니다.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-mono text-[10px] shrink-0 mt-0.5">최초 구동</span>
                        <span className="text-slate-555">
                          로그인 쿠키 세션이 없을 경우 크롬 브라우저가 자동으로 화면에 팝업됩니다. <strong>3분 이내</strong>에 로그인 및 스마트폰 2단계 인증을 마치면 인증이 완착 등록됩니다.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 웹 UI에서 원격으로 로그인 브라우저 팝업시키기 */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#03C75A]"></span>
                    방법 2. 웹 브라우저에서 원격으로 로그인 창 실행
                  </h4>
                  <p className="text-xs text-slate-555 leading-relaxed">
                    터미널 실행이 어려우시다면, 인터넷 브라우저 주소창에 아래 주소를 입력하고 엔터를 눌러도 로컬 PC 화면에 즉시 로그인 창이 실행됩니다.
                  </p>
                  
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-505 font-medium">
                      <span>인증 브라우저 기동 API</span>
                      <button
                        onClick={() => {
                          handleCopyToClipboard("http://localhost:3000/api/naver-blog/settings?action=trigger_session", "API 주소 복사");
                        }}
                        className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-slate-650 active:scale-95 transition-all flex items-center gap-1 cursor-pointer border border-slate-200 shadow-2xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>복사</span>
                      </button>
                    </div>
                    <code className="block text-xs font-mono text-emerald-600 bg-white p-2.5 rounded-xl border border-slate-200 break-all">
                      http://localhost:3000/api/naver-blog/settings?action=trigger_session
                    </code>
                  </div>
                </div>

                {/* 3. 로그인 완료 후 검증 파일 체크 */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#03C75A]"></span>
                    방법 3. 파일 존재 여부를 통한 완벽 검증
                  </h4>
                  <p className="text-xs text-slate-555 leading-relaxed">
                    로그인 세션이 안전하게 저장되면, 프로젝트 루트의 <code className="text-slate-650 font-mono font-semibold">scripts/</code> 폴더 내에 <strong>`naver_session.json`</strong> 파일이 생성되어 있는 것을 볼 수 있습니다. 이 파일이 존재한다면 정상적으로 대기 및 작동이 준비된 상태입니다.
                  </p>
                </div>

              </div>

              {/* 하단 푸터 */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setIsDaemonInfoOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#03C75A] text-white hover:bg-emerald-600 transition-all text-xs font-bold active:scale-95 shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  확인 완료 및 닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
