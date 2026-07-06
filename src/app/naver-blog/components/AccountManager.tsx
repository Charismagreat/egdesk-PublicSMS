'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, Globe, Sliders, RefreshCw, 
  ToggleRight, ToggleLeft, ChevronRight, Info 
} from 'lucide-react';
import { AutopilotSettings } from '../types';

interface AccountManagerProps {
  settings: AutopilotSettings;
  hasSession: boolean;
  activeModeTab: 'rpa' | 'api';
  setActiveModeTab: (tab: 'rpa' | 'api') => void;
  isRpaLaunching: boolean;
  naverBlogIdInput: string;
  setNaverBlogIdInput: (v: string) => void;
  apiClientIdInput: string;
  setApiClientIdInput: (v: string) => void;
  apiClientSecretInput: string;
  setApiClientSecretInput: (v: string) => void;
  handleTriggerRpaLogin: () => Promise<void>;
  handleSyncRpaSession: () => Promise<void>;
  handleConnectAccount: (e: React.FormEvent) => Promise<void>;
  handleDisconnectAccount: () => Promise<void>;
  handleTriggerAutopilot: () => Promise<void>;
  saveSettings: (updated: Partial<AutopilotSettings>) => Promise<any>;
  setIsGuideModalOpen: (v: boolean) => void;
  setIsDaemonInfoOpen: (v: boolean) => void;
}

export default function AccountManager({
  settings,
  hasSession,
  activeModeTab,
  setActiveModeTab,
  isRpaLaunching,
  naverBlogIdInput,
  setNaverBlogIdInput,
  apiClientIdInput,
  setApiClientIdInput,
  apiClientSecretInput,
  setApiClientSecretInput,
  handleTriggerRpaLogin,
  handleSyncRpaSession,
  handleConnectAccount,
  handleDisconnectAccount,
  handleTriggerAutopilot,
  saveSettings,
  setIsGuideModalOpen,
  setIsDaemonInfoOpen
}: AccountManagerProps) {
  
  // 계정 연결 여부 판단
  const isAccountConnected = activeModeTab === 'api' 
    ? (!!settings.api_client_id && !!settings.naver_blog_id)
    : (hasSession && !!settings.naver_blog_id);

  return (
    <div className="space-y-8">
      {/* 계정 연동 세팅 관리 카드 (RPA & API 하이브리드형) */}
      <div id="account-connection-card" className="p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/66 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-[#03C75A]" />
            <h4 className="text-base font-bold text-slate-800">네이버 블로그 계정 관리자</h4>
          </div>
          {/* 현재 가동 모드 표시 배지 */}
          <span className={`text-[10px] px-3 py-1 rounded-full font-extrabold tracking-wider ${
            activeModeTab === 'api' 
              ? 'bg-sky-50 text-sky-600 border border-sky-200' 
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            {activeModeTab === 'api' ? '공식 API 모드' : 'RPA 간편 모드'}
          </span>
        </div>

        {/* 하이브리드 연동 방식 선택 탭 */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200/60 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveModeTab('rpa');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeModeTab === 'rpa'
                ? 'bg-white text-emerald-600 border border-slate-200 shadow-sm scale-102 font-extrabold'
                : 'text-slate-400 hover:text-slate-700 border border-transparent'
            }`}
          >
            <Globe className="w-4 h-4" />
            RPA 간편 로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveModeTab('api');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeModeTab === 'api'
                ? 'bg-white text-sky-600 border border-slate-200 shadow-sm scale-102 font-extrabold'
                : 'text-slate-400 hover:text-slate-700 border border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4" />
            공식 API 연동
          </button>
        </div>

        {/* [1] RPA 간편 로그인 모드 전용 뷰 */}
        {activeModeTab === 'rpa' && (
          <div className="space-y-5">
            {/* RPA 세션 상태 표시 패널 */}
            <div className={`p-5 rounded-2xl border transition-all ${
              hasSession && settings.naver_blog_id
                ? 'bg-emerald-50/40 border-emerald-250'
                : 'bg-rose-50/40 border-rose-250'
            }`}>
              <div className="flex items-start gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                  hasSession && settings.naver_blog_id ? 'bg-[#03C75A] text-white' : 'bg-rose-500 text-white'
                }`}>
                  N
                </div>
                <div className="space-y-1 flex-1">
                  <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                    <span>
                      {hasSession && settings.naver_blog_id 
                        ? `RPA 연동 완료: @${settings.naver_blog_id}` 
                        : 'RPA 연동이 필요합니다'}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      hasSession && settings.naver_blog_id ? 'bg-emerald-550 animate-pulse' : 'bg-rose-500'
                    }`}></span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    {hasSession && settings.naver_blog_id
                      ? '🟢 무인 자동화 쿠키 인증이 확보되어 정상 동작 중입니다.'
                      : '🔴 로컬 로그인 세션(naver_session.json)이 존재하지 않습니다. 최초 1회 로그인이 진행되어야 합니다.'}
                  </p>
                </div>
              </div>

              {/* RPA 세션이 존재할 때 해제(파기) 버튼 */}
              {hasSession && settings.naver_blog_id && (
                <div className="flex justify-end gap-2 border-t border-slate-200/50 pt-3 mt-4">
                  <button
                    type="button"
                    onClick={handleDisconnectAccount}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all font-bold cursor-pointer shadow-2xs active:scale-95"
                  >
                    RPA 인증 세션 파기 ⚠️
                  </button>
                </div>
              )}
            </div>

            {/* RPA 로그인 트리거 및 동기화 버튼 블록 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleTriggerRpaLogin}
                disabled={isRpaLaunching}
                className="py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all text-xs font-bold active:scale-98 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(16,185,129,0.2)] cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                {isRpaLaunching ? 'RPA 브라우저 팝업 기동 중...' : 'RPA 최초 로그인 브라우저 기동 🚀'}
              </button>
              
              <button
                type="button"
                onClick={handleSyncRpaSession}
                className="py-3 rounded-2xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-250 transition-all text-xs font-bold active:scale-98 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-emerald-550" />
                세션 동기화 실시간 갱신 🔄
              </button>
            </div>

            {/* 블로그 아이디 설정 폼 */}
            <form onSubmit={handleConnectAccount} className="space-y-2.5 border-t border-slate-100 pt-4 mt-2">
              <div>
                <label className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">연동할 네이버 블로그 ID</label>
                <div className="flex gap-2.5 mt-1.5">
                  <input
                    type="text"
                    placeholder="예: naver_username"
                    value={naverBlogIdInput}
                    onChange={(e) => setNaverBlogIdInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white/50 backdrop-blur-xs border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all text-xs font-bold shrink-0 cursor-pointer active:scale-95 shadow-xs"
                  >
                    저장 💾
                  </button>
                </div>
              </div>
            </form>

            {/* RPA 최초 설치 및 문제해결 가이드 모달 트리거 */}
            <div className="border-t border-slate-100 pt-4 mt-3 text-center">
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-bold transition-all group focus:outline-none cursor-pointer"
              >
                <span>RPA 최초 설치/기동이 안 되시나요? 💡</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* [2] 공식 API 연동 모드 전용 뷰 */}
        {activeModeTab === 'api' && (
          <div className="space-y-5">
            {/* API 연동 상태 표시 패널 */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isAccountConnected && settings.api_client_id
                ? 'bg-sky-50/40 border-sky-250'
                : 'bg-rose-50/40 border-rose-250'
            }`}>
              <div className="flex items-start gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                  isAccountConnected && settings.api_client_id ? 'bg-sky-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  API
                </div>
                <div className="space-y-1 flex-1">
                  <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                    <span>
                      {isAccountConnected && settings.api_client_id 
                        ? `API 연동 완료: @${settings.naver_blog_id}` 
                        : 'API 인증 정보 필요'}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      isAccountConnected && settings.api_client_id ? 'bg-sky-400 animate-pulse' : 'bg-rose-500'
                    }`}></span>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed font-semibold">
                    {isAccountConnected && settings.api_client_id
                      ? '🟢 공식 API 키 인증이 활성화되어 안전하게 연결되었습니다.'
                      : '🔴 네이버 개발자 센터에서 발급한 API 키 정보를 아래 입력란에 입력해 주세요.'}
                  </p>
                </div>
              </div>

              {/* API 연동 해제 버튼 */}
              {isAccountConnected && settings.api_client_id && (
                <div className="flex justify-end gap-2 border-t border-slate-200/50 pt-3 mt-4">
                  <button
                    type="button"
                    onClick={handleDisconnectAccount}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] text-rose-600 hover:bg-rose-50 transition-all font-bold cursor-pointer shadow-2xs active:scale-95"
                  >
                    API 연동 해제
                  </button>
                </div>
              )}
            </div>

            {/* API 연동 폼 */}
            <form onSubmit={handleConnectAccount} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">네이버 블로그 ID</label>
                <input
                  type="text"
                  placeholder="예: naver_username"
                  value={naverBlogIdInput}
                  onChange={(e) => setNaverBlogIdInput(e.target.value)}
                  className="w-full mt-1.5 px-4 py-2.5 bg-white/50 backdrop-blur-xs border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Client ID</label>
                <input
                  type="password"
                  placeholder="네이버 개발자 센터 Client ID"
                  value={apiClientIdInput}
                  onChange={(e) => setApiClientIdInput(e.target.value)}
                  className="w-full mt-1.5 px-4 py-2.5 bg-white/50 backdrop-blur-xs border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Client Secret</label>
                <input
                  type="password"
                  placeholder="네이버 개발자 센터 Client Secret"
                  value={apiClientSecretInput}
                  onChange={(e) => setApiClientSecretInput(e.target.value)}
                  className="w-full mt-1.5 px-4 py-2.5 bg-white/50 backdrop-blur-xs border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 font-bold"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-slate-900 text-white hover:bg-sky-550 transition-all text-xs font-bold active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Sliders className="w-4 h-4" />
                API 안전 정보 저장 및 연동 💾
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 100% 무인 오토파일럿 스위치 카드 */}
      <div className="p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Globe className="w-4.5 h-4.5" />
              </span>
              <h3 className="text-base font-bold text-slate-800">
                100% 무인 AI 오토파일럿 마케팅
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              활성화 시 매일 예약된 시간에 AI가 등록된 상품을 분석해 자동으로 블로그 포스트를 생성 및 발행 대기합니다.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button 
              onClick={handleTriggerAutopilot}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-emerald-550 text-white hover:bg-emerald-600 hover:shadow-md transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              오토파일럿 AI 즉시 구동
            </button>
            <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-550 font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#03C75A] animate-pulse"></span>
              <span>데몬 대기 중</span>
              <button 
                onClick={() => setIsDaemonInfoOpen(true)}
                className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ml-0.5 cursor-pointer"
                title="로컬 PC 데몬 확인 방법 가이드"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => saveSettings({ is_autopilot: settings.is_autopilot === 1 ? 0 : 1 })}
              className="transition-transform active:scale-95 shrink-0 cursor-pointer focus:outline-none"
            >
              {settings.is_autopilot === 1 ? (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-250 text-emerald-600 font-extrabold text-xs cursor-pointer shadow-2xs">
                  <ToggleRight className="w-5 h-5 text-emerald-550" /> ON (자동화 작동)
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-100 border border-slate-250 text-slate-400 font-bold text-xs cursor-pointer shadow-2xs">
                  <ToggleLeft className="w-5 h-5" /> OFF (수동 검토)
                </div>
              )}
            </button>
          </div>
        </div>

        {settings.is_autopilot === 1 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 pt-5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-5"
          >
            <div>
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">발행 주기</label>
              <select
                value={settings.autopilot_interval}
                onChange={(e) => saveSettings({ autopilot_interval: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold cursor-pointer shadow-2xs"
              >
                <option value="DAILY">매일 (Daily)</option>
                <option value="WEEKLY">매주 (Weekly)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">발행 시각</label>
              <input 
                type="time" 
                value={settings.autopilot_time}
                onChange={(e) => saveSettings({ autopilot_time: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold shadow-2xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">원고 집필 톤앤매너</label>
              <select
                value={settings.tone_style}
                onChange={(e) => saveSettings({ tone_style: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold cursor-pointer shadow-2xs"
              >
                <option value="정보제공형">🎓 정보제공형 스펙리뷰</option>
                <option value="솔직리뷰형">💬 리얼 솔직리뷰형</option>
                <option value="전문칼럼형">📊 전문칼럼 분석형</option>
                <option value="친근한일상형">🏠 친근한 일상공유형</option>
              </select>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
