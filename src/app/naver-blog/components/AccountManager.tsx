'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, Globe, Sliders, RefreshCw, 
  ToggleRight, ToggleLeft, ChevronRight, Info, HelpCircle
} from 'lucide-react';
import { AutopilotSettings } from '../types';
import AutopilotRulesManager from './AutopilotRulesManager';

interface AccountManagerProps {
  settings: AutopilotSettings;
  hasSession: boolean;
  activeModeTab: 'rpa' | 'api';
  setActiveModeTab: (tab: 'rpa' | 'api') => void;
  isRpaLaunching: boolean;
  naverBlogIdInput: string;
  setNaverBlogIdInput: (v: string) => void;
  naverLoginIdInput?: string;
  setNaverLoginIdInput?: (v: string) => void;
  naverLoginPwInput?: string;
  setNaverLoginPwInput?: (v: string) => void;
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
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  selectedProducts?: any[];
  selectedProduct?: any;
  fetchPosts?: () => void;
}

export default function AccountManager({
  settings,
  hasSession,
  activeModeTab,
  setActiveModeTab,
  isRpaLaunching,
  naverBlogIdInput,
  setNaverBlogIdInput,
  naverLoginIdInput = '',
  setNaverLoginIdInput = () => {},
  naverLoginPwInput = '',
  setNaverLoginPwInput = () => {},
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
  setIsDaemonInfoOpen,
  showToast,
  selectedProducts,
  selectedProduct,
  fetchPosts
}: AccountManagerProps) {
  
  // 계정 연결 여부 판단
  const isAccountConnected = activeModeTab === 'api' 
    ? (!!settings.api_client_id && !!settings.naver_blog_id)
    : (hasSession && !!settings.naver_blog_id);

  // 공식 API 설정 변경점 체크
  const isApiSettingsUnchanged = 
    naverBlogIdInput.trim() === (settings.naver_blog_id || '').trim() &&
    apiClientIdInput.trim() === (settings.api_client_id || '').trim() &&
    apiClientSecretInput.trim() === (settings.api_client_secret || '').trim();
  const isApiFormEmpty = !naverBlogIdInput.trim() || !apiClientIdInput.trim() || !apiClientSecretInput.trim();
  const isApiSaveDisabled = isApiFormEmpty || isApiSettingsUnchanged;

  // RPA 설정 변경점 체크 (블로그 ID, 로그인 ID, 로그인 PW 변경 감지)
  const isRpaSettingsUnchanged = 
    naverBlogIdInput.trim() === (settings.naver_blog_id || '').trim() &&
    naverLoginIdInput.trim() === (settings.naver_login_id || '').trim() &&
    naverLoginPwInput.trim() === (settings.naver_login_pw || '').trim();
  const isRpaSaveDisabled = !naverBlogIdInput.trim() || isRpaSettingsUnchanged;

  return (
    <div className="space-y-8">
      {/* 계정 연동 세팅 관리 카드 (RPA & API 하이브리드형) */}
      <div id="account-connection-card" className="p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/66 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-[#03C75A]" />
            <h4 className="text-base font-bold text-slate-800">0단계: 네이버 블로그 계정 설정</h4>
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
            {/* 미연동 상태일 때만 콤팩트 알림 노출 */}
            {!hasSession && (
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-700">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                  <span>RPA 세션 인증이 필요합니다. 아래 버튼을 통해 최초 1회 로그인을 진행해주세요.</span>
                </div>
              </div>
            )}

            {/* RPA 로그인 트리거 및 문제해결 가이드 버튼 블록 (가로 2열 배치) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleTriggerRpaLogin}
                disabled={isRpaLaunching}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all text-xs font-bold active:scale-98 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(16,185,129,0.2)] cursor-pointer"
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span>{isRpaLaunching ? 'RPA 브라우저 팝업 기동 중...' : 'RPA 최초 로그인 브라우저 기동 🚀'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGuideModalOpen(true)}
                className="py-3.5 px-4 rounded-2xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 transition-all text-xs font-bold active:scale-98 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer group"
              >
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>RPA 최초 설치/기동이 안 되시나요? 💡</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* 블로그 아이디 및 무인 자동 로그인 계정 설정 폼 (가로 3열 통합 뷰) */}
            <form onSubmit={handleConnectAccount} className="space-y-3.5 border-t border-slate-100 pt-4 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <span>네이버 블로그 및 무인 자동 로그인 계정 설정</span>
                </div>
                {hasSession && settings.naver_blog_id && (
                  <button
                    type="button"
                    onClick={handleDisconnectAccount}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold transition-colors cursor-pointer flex items-center gap-1 hover:underline"
                  >
                    RPA 세션 파기 ⚠️
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. 연동할 네이버 블로그 ID */}
                <div>
                  <label className="text-[9px] text-slate-400 font-bold block mb-1">연동할 네이버 블로그 ID</label>
                  <input
                    type="text"
                    placeholder="예: naver_username"
                    value={naverBlogIdInput}
                    onChange={(e) => setNaverBlogIdInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 backdrop-blur-xs border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 font-bold"
                  />
                </div>

                {/* 2. 네이버 로그인 ID (무인 복구용) */}
                <div>
                  <label className="text-[9px] text-slate-400 font-bold block mb-1">네이버 로그인 ID (선택)</label>
                  <input
                    type="text"
                    placeholder="네이버 아이디"
                    value={naverLoginIdInput}
                    onChange={(e) => setNaverLoginIdInput?.(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 backdrop-blur-xs border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                {/* 3. 네이버 비밀번호 (PW) (무인 복구용) */}
                <div>
                  <label className="text-[9px] text-slate-400 font-bold block mb-1">네이버 비밀번호 (PW)</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={naverLoginPwInput}
                    onChange={(e) => setNaverLoginPwInput?.(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 backdrop-blur-xs border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <p className="text-[10px] text-slate-400 leading-tight font-medium">
                  💡 미리 계정을 설정해 두시면 세션 만료 시 RPA가 100% 무인으로 자동 로그인을 복구합니다.
                </p>
                <button
                  type="submit"
                  disabled={isRpaSaveDisabled}
                  className={`px-5 py-2 rounded-xl transition-all text-xs font-bold shrink-0 shadow-xs ${
                    isRpaSaveDisabled
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/50'
                      : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer active:scale-95'
                  }`}
                >
                  {isRpaSettingsUnchanged && naverBlogIdInput.trim() ? '최신 상태 ✅' : '설정 저장 💾'}
                </button>
              </div>
            </form>


          </div>
        )}

        {/* [2] 공식 API 연동 모드 전용 뷰 */}
        {activeModeTab === 'api' && (
          <div className="space-y-5">
            {/* 미연동 상태일 때만 콤팩트 알림 노출 */}
            {!(isAccountConnected && settings.api_client_id) && (
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-700">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                  <span>네이버 개발자 센터에서 발급한 API 키(Client ID / Secret) 정보를 아래 입력란에 입력해 주세요.</span>
                </div>
              </div>
            )}

            {/* API 연동 폼 (가로 3열 통합 뷰) */}
            <form onSubmit={handleConnectAccount} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
                  <Sliders className="w-3.5 h-3.5 text-sky-600" />
                  <span>네이버 공식 API 인증 정보 설정</span>
                </div>
                {isAccountConnected && settings.api_client_id && (
                  <button
                    type="button"
                    onClick={handleDisconnectAccount}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold transition-colors cursor-pointer flex items-center gap-1 hover:underline"
                  >
                    API 연동 해제 ⚠️
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. 네이버 블로그 ID */}
                <div>
                  <label className="text-[9px] text-slate-400 font-bold block mb-1">네이버 블로그 ID</label>
                  <input
                    type="text"
                    placeholder="예: naver_username"
                    value={naverBlogIdInput}
                    onChange={(e) => setNaverBlogIdInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 backdrop-blur-xs border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 font-bold"
                  />
                </div>

                {/* 2. Client ID */}
                <div>
                  <label className="text-[9px] text-slate-400 font-bold block mb-1">Client ID</label>
                  <input
                    type="password"
                    placeholder="네이버 개발자 센터 Client ID"
                    value={apiClientIdInput}
                    onChange={(e) => setApiClientIdInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 backdrop-blur-xs border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 font-bold"
                  />
                </div>

                {/* 3. Client Secret */}
                <div>
                  <label className="text-[9px] text-slate-400 font-bold block mb-1">Client Secret</label>
                  <input
                    type="password"
                    placeholder="네이버 개발자 센터 Client Secret"
                    value={apiClientSecretInput}
                    onChange={(e) => setApiClientSecretInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 backdrop-blur-xs border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <p className="text-[10px] text-slate-400 leading-tight font-medium">
                  💡 네이버 오픈 API를 이용하면 검색 등록 키워드를 기반으로 포스팅을 집필합니다.
                </p>
                <button
                  type="submit"
                  disabled={isApiSaveDisabled}
                  className={`px-5 py-2 rounded-xl transition-all text-xs font-bold shrink-0 shadow-xs flex items-center justify-center gap-1.5 ${
                    isApiSaveDisabled
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/50'
                      : 'bg-slate-900 text-white hover:bg-sky-600 active:scale-95 cursor-pointer'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isApiSettingsUnchanged && !isApiFormEmpty ? '최신 상태 ✅' : 'API 정보 저장 및 연동 💾'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 100% 무인 오토파일럿 스위치 카드 */}
      {/* 100% 무인 AI 오토파일럿 다중 마케팅 엔진 */}
      <AutopilotRulesManager
        settings={settings}
        saveSettings={saveSettings}
        handleTriggerAutopilot={handleTriggerAutopilot}
        setIsDaemonInfoOpen={setIsDaemonInfoOpen}
        showToast={showToast || ((msg, type) => console.log(`[${type}] ${msg}`))}
        selectedProducts={selectedProducts}
        selectedProduct={selectedProduct}
        fetchPosts={fetchPosts}
      />
    </div>
  );
}
