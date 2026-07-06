"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, X, ArrowUpRight, Copy, Check, Trash2, Cpu, Sparkles, HelpCircle, Info, Play } from "lucide-react";
import { detectCurrency, getCurrencySymbol } from "../../hooks/usePriceTracker";

interface CollectorMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: any;
  urls: any[];
  copiedUrlId: number | null;
  miningLoading: boolean;
  miningLoadStep: number;
  searchChannels: any[];
  newChannelName: string;
  urlForm: {
    site_name: string;
    target_url: string;
    css_selector: string;
    cron_interval: string;
  };
  crawlerTesting: boolean;
  selectorAnalyzing: boolean;
  setSearchChannels: React.Dispatch<React.SetStateAction<any[]>>;
  setNewChannelName: React.Dispatch<React.SetStateAction<string>>;
  setUrlForm: React.Dispatch<React.SetStateAction<any>>;
  setIsCronHelpOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleCopyUrl: (e: React.MouseEvent, urlId: number, targetUrl: string) => void;
  handleDeleteUrl: (urlId: number) => Promise<void>;
  handleToggleChannel: (id: number) => void;
  handleRemoveChannel: (id: number) => void;
  handleAddChannel: () => void;
  handleAutoDeploy: () => Promise<void>;
  handleAnalyzeSelector: () => Promise<void>;
  handleAddUrl: (e: React.FormEvent) => Promise<void>;
  explainCron: (cron: string) => string;
}

export default function CollectorMappingModal({
  isOpen,
  onClose,
  activeItem,
  urls,
  copiedUrlId,
  miningLoading,
  miningLoadStep,
  searchChannels,
  newChannelName,
  urlForm,
  crawlerTesting,
  selectorAnalyzing,
  setSearchChannels,
  setNewChannelName,
  setUrlForm,
  setIsCronHelpOpen,
  handleCopyUrl,
  handleDeleteUrl,
  handleToggleChannel,
  handleRemoveChannel,
  handleAddChannel,
  handleAutoDeploy,
  handleAnalyzeSelector,
  handleAddUrl,
  explainCron
}: CollectorMappingModalProps) {
  return (
    <AnimatePresence>
      {isOpen && activeItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white border border-slate-200 w-full max-w-[800px] rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                  <Globe className="w-5 h-5 text-pink-650 animate-spin-slow" />
                  [{activeItem.item_name}] 수집 로봇 매핑 센터
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold">크롤링 주기 지정 및 HTML CSS 셀렉터 매핑</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-slate-150 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 수집기 리스트 */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500">현재 연결된 감시 URL ({urls.length}개)</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {urls.map(url => (
                    <div
                      key={url.url_id}
                      onClick={() => window.open(url.target_url, '_blank')}
                      className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 hover:border-pink-500 hover:bg-pink-50/5 hover:scale-[1.01] hover:shadow-md transition-all cursor-pointer group relative"
                      title="클릭 시 새 창에서 이 수집 대상 웹페이지 열기"
                    >
                      <div className="space-y-1.5 truncate pr-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-800 truncate group-hover:text-pink-600 transition-colors">{url.site_name}</span>
                          <span className="text-[8px] font-mono font-black bg-white text-slate-505 border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
                            {url.cron_interval}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-slate-350 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>

                        {/* 최근/최저 수집 가격 알약 배지 */}
                        {url.latest_price !== null && url.latest_price !== undefined && (() => {
                          const nodeCurrency = detectCurrency(url.site_name, url.target_url);
                          const symbol = getCurrencySymbol(nodeCurrency);
                          const isForeignNode = nodeCurrency !== 'KRW';

                          const latestKrwText = isForeignNode && url.latest_krw_price
                            ? ` (₩ ${Math.floor(url.latest_krw_price).toLocaleString()})`
                            : '';
                          const minKrwText = isForeignNode && url.min_krw_price
                            ? ` (₩ ${Math.floor(url.min_krw_price).toLocaleString()})`
                            : '';

                          return (
                            <div className="flex items-center gap-1.5 flex-wrap text-[9px] my-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-650 border border-slate-200 shadow-sm">
                                <span className="w-1 h-1 rounded-full bg-slate-400 mr-1"></span>
                                최근: {symbol} {Number(url.latest_price).toLocaleString()}{latestKrwText}
                              </span>
                              {url.min_price !== null && url.min_price !== undefined && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-600 border border-rose-100 shadow-sm animate-fade-in">
                                  <span className="w-1 h-1 rounded-full bg-rose-500 mr-1 animate-pulse"></span>
                                  최저: {symbol} {Number(url.min_price).toLocaleString()}{minKrwText}
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* URL 표시와 원클릭 복사 배너 */}
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-150/60 max-w-[280px]">
                          <p className="text-[8.5px] text-slate-455 truncate font-mono flex-1">{url.target_url}</p>
                          <button
                            type="button"
                            onClick={(e) => handleCopyUrl(e, url.url_id, url.target_url)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer shrink-0"
                            title="웹주소 복사"
                          >
                            {copiedUrlId === url.url_id ? (
                              <span className="flex items-center gap-0.5 text-[7.5px] font-bold text-emerald-650 animate-bounce">
                                <Check className="w-2.5 h-2.5" />
                                복사됨
                              </span>
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>

                        <span className="text-[8px] text-pink-650 font-black block truncate">Selector: {url.css_selector}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUrl(url.url_id);
                        }}
                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-505 border border-slate-200 hover:border-rose-100 rounded-xl bg-white cursor-pointer transition-all shrink-0 z-10"
                        title="수집망 주소 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {urls.length === 0 && (
                    <p className="text-xs text-slate-455 text-center py-12 font-bold font-sans">감시 사이트가 존재하지 않습니다.</p>
                  )}
                </div>
              </div>

              {/* 우측 설정 및 바인딩 영역 */}
              <div className="space-y-4">
                {miningLoading ? (
                  <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-inner animate-pulse">
                    <div className="relative flex items-center justify-center">
                      <Cpu className="w-10 h-10 text-pink-650 animate-spin absolute" />
                      <Sparkles className="w-6 h-6 text-indigo-505 animate-ping absolute" />
                      <div className="w-14 h-14 rounded-full border-2 border-pink-100 border-t-pink-600 animate-spin"></div>
                    </div>
                    <div className="space-y-1.5 px-6">
                      <span className="text-xs font-black text-slate-700 block font-sans">
                        {miningLoadStep === 1 && "1단계: 전세계 웹 쇼핑망 자율 검색 및 가격 링크 추출 중..."}
                        {miningLoadStep === 2 && "2단계: Playwright Stealth 기동 및 실시간 보안망 우회 접속 중..."}
                        {miningLoadStep === 3 && "3단계: Gemini AI 기반 시세 데이터 및 가격 Selector 분석 중..."}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block leading-normal">
                        활성화하신 채널 및 추가된 커스텀 채널을 대상으로 세부 규격 일치율을 엄격하게 교차 검증하고 있습니다.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 1. 자율 스캔 채널 제어 섹션 */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <Globe className="w-4 h-4 text-pink-650" />
                          ⚙️ 실시간 자율 스캔 채널 제어 ({searchChannels.filter(c => c.active).length}개 활성)
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">칩을 눌러 On/Off 토글</span>
                      </div>

                      {/* 채널 칩 나열 */}
                      <div className="flex flex-wrap gap-2">
                        {searchChannels.map(chan => (
                          <div
                            key={chan.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition-all shadow-sm ${
                              chan.active
                                ? "bg-gradient-to-r from-pink-50 to-indigo-50 border-pink-200 text-pink-700 font-black"
                                : "bg-slate-100 border-slate-200 text-slate-400"
                            }`}
                          >
                            <span
                              onClick={() => handleToggleChannel(chan.id)}
                              className="cursor-pointer select-none"
                            >
                              {chan.active ? "✅" : "❌"} {chan.name}
                            </span>
                            {chan.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleRemoveChannel(chan.id)}
                                className="text-[9px] hover:text-rose-600 text-slate-400 bg-white hover:bg-rose-50 w-4 h-4 rounded-full flex items-center justify-center border border-slate-200 transition-colors cursor-pointer"
                                title="채널 삭제"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 커스텀 채널 즉석 추가 폼 */}
                      <div className="flex gap-2 pt-1 border-t border-slate-200/60 mt-1">
                        <input
                          type="text"
                          placeholder="추가할 감시 쇼핑몰/도메인명 (예: 11번가, 지마켓, 다나와)"
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-xl text-[10.5px] font-bold focus:border-pink-500 outline-none text-slate-700"
                        />
                        <button
                          type="button"
                          onClick={handleAddChannel}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] rounded-xl cursor-pointer shadow-sm transition-colors border-none"
                        >
                          ➕ 채널 추가
                        </button>
                      </div>
                    </div>

                    {/* 2. 새로운 크롤링 로봇 바인딩 수동 폼 */}
                    <form onSubmit={handleAddUrl} className="space-y-3 bg-slate-50/50 border border-slate-150 p-4 rounded-2xl">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-2">
                        <h4 className="text-xs font-black text-pink-650">수동 크롤링 로봇 바인딩</h4>
                        <button
                          type="button"
                          onClick={handleAutoDeploy}
                          className="flex items-center gap-1 px-3 py-1.5 text-[9px] font-black text-indigo-650 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] animate-pulse shrink-0"
                          title="AI가 활성 쇼핑 채널을 자율 검색하여 최저가 수집 노드를 한방에 자동 장착해 줍니다."
                        >
                          <Sparkles className="w-2.5 h-2.5 text-indigo-650 animate-spin-slow" />
                          🪄 AI 최저가 즉시 포착 및 자동 장착
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">출처 포털명 (사이트명)</label>
                        <input
                          type="text"
                          placeholder="예: LME 동가 시황"
                          value={urlForm.site_name}
                          onChange={(e) => setUrlForm((prev: any) => ({ ...prev, site_name: e.target.value }))}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">수집 대상 웹주소 (Target URL)</label>
                          <button
                            type="button"
                            onClick={handleAnalyzeSelector}
                            disabled={selectorAnalyzing}
                            className="text-[9px] font-black text-pink-655 hover:text-pink-700 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 border-none bg-transparent"
                            title="AI가 웹주소 분석을 통해 최적의 가격 셀렉터를 찾아 입력창에 채워줍니다."
                          >
                            <Sparkles className="w-3 h-3 animate-pulse" />
                            {selectorAnalyzing ? "AI 분석 중..." : "🪄 AI 자동 분석"}
                          </button>
                        </div>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={urlForm.target_url}
                          onChange={(e) => setUrlForm((prev: any) => ({ ...prev, target_url: e.target.value }))}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">CSS Selector</label>
                          <input
                            type="text"
                            placeholder="span.price_val"
                            value={urlForm.css_selector}
                            onChange={(e) => setUrlForm((prev: any) => ({ ...prev, css_selector: e.target.value }))}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">수집 주기 (Cron)</label>
                            <button
                              type="button"
                              onClick={() => setIsCronHelpOpen(true)}
                              className="text-slate-400 hover:text-pink-505 transition-colors cursor-pointer flex items-center justify-center p-0.5 rounded-full hover:bg-slate-100 border-none bg-transparent"
                              title="크론 주기 설정 방법 보기"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={urlForm.cron_interval}
                            onChange={(e) => setUrlForm((prev: any) => ({ ...prev, cron_interval: e.target.value }))}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700 font-mono"
                            placeholder="예: 0 9 * * *"
                          />
                          {urlForm.cron_interval && (
                            <p className="text-[10px] text-pink-500 font-medium px-1 flex items-center gap-1 mt-1 bg-pink-50/50 p-1.5 rounded-lg border border-pink-100/50 leading-relaxed">
                              <Info className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{explainCron(urlForm.cron_interval)}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={crawlerTesting}
                        className="w-full mt-2 py-3 bg-gradient-to-r from-pink-500 to-indigo-650 hover:from-pink-600 hover:to-indigo-750 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-55 border-none"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {crawlerTesting ? "크롤러 실시간 검수 모의 구동 중..." : "로봇 매핑 및 검수 가동 (Test Run)"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
