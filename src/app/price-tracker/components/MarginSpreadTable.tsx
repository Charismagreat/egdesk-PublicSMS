import React from "react";
import { Plus, Sparkles, ArrowUpRight, Zap, Bell, Edit3, Trash2, ShieldAlert, BarChart3, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { Item, Url, AlertRule, ItemHoverInfo } from "../types";
import { getSvgPathData } from "../utils/chartHelper";

interface MarginSpreadTableProps {
  filteredItems: Item[];
  items: Item[];
  activeItem: Item | null;
  urls: Url[];
  alerts: AlertRule[];
  miningItemIds: number[];
  itemHoverInfo: ItemHoverInfo | null;
  setItemHoverInfo: (info: ItemHoverInfo | null) => void;
  itemScrollRef: React.RefObject<HTMLDivElement | null>;
  handleItemSelect: (item: Item) => void;
  setIsItemModalOpen: (open: boolean) => void;
  setIsEditMode: (editMode: boolean) => void;
  setItemForm: (form: any) => void;
  setIsCollectorModalOpen: (open: boolean) => void;
  setIsAlertModalOpen: (open: boolean) => void;
  handleEditItemClick: (item: Item) => void;
  handleDeleteItem: (itemId: number, itemName: string) => Promise<void>;
}

export default function MarginSpreadTable({
  filteredItems,
  items,
  activeItem,
  urls,
  alerts,
  miningItemIds,
  itemHoverInfo,
  setItemHoverInfo,
  itemScrollRef,
  handleItemSelect,
  setIsItemModalOpen,
  setIsEditMode,
  setItemForm,
  setIsCollectorModalOpen,
  setIsAlertModalOpen,
  handleEditItemClick,
  handleDeleteItem
}: MarginSpreadTableProps) {
  
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-visible w-full">
      <div className="p-5 border-b border-slate-155 flex items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-4.5 bg-pink-655 rounded-md"></span>
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
            📊 실시간 원가 & 마진 스프레드 관제 전광판
          </h3>
          <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 border border-slate-200 rounded-md">
            Filtered {filteredItems.length} / {items.length} 품목
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsEditMode(false);
              setItemForm({ 
                item_code: "", 
                item_name: "", 
                category: "RAW_MATERIAL", 
                spec: "", 
                base_price: "", 
                target_margin_rate: "12.5",
                currency_code: "USD" 
              });
              setIsItemModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-655 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer border-none"
          >
            <Plus className="w-3.5 h-3.5" />
            신규 품목 등록
          </button>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-550 font-bold uppercase tracking-wider">
              <th className="p-4 font-bold text-[10px]">품목 코드 / 명칭</th>
              <th className="p-4 font-bold text-[10px] text-center">수집 통화</th>
              <th className="p-4 font-bold text-[10px] text-right">자사 기준 원가</th>
              <th className="p-4 font-bold text-[10px] text-right">실시간 수집가 (외화/원화)</th>
              <th className="p-4 font-bold text-[10px] text-center">실시간 연동 환율</th>
              <th className="p-4 font-bold text-[10px] text-right">변동폭 / 변동률</th>
              <th className="p-4 font-bold text-[10px] text-right">실시간 마진율 (목표)</th>
              <th className="p-4 font-bold text-[10px] text-center">수집망 (노드)</th>
              <th className="p-4 font-bold text-[10px] text-center">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredItems.map((item) => {
              const isActive = activeItem?.item_id === item.item_id;
              const isWarning = item.current_margin_rate < item.target_margin_rate;
              const itemCurrency = item.currency_code || 'KRW';
              
              const changeAmount = item.latest_price - item.base_price;
              const changeRate = item.base_price > 0 ? (changeAmount / item.base_price) * 100 : 0;
              
              const isUp = changeAmount > 0;
              const isDown = changeAmount < 0;

              // 상세 차트 데이터 연산
              const { path: svgPath, points: svgPoints, width: svgChartWidth } = isActive 
                ? getSvgPathData(urls) 
                : { path: "", points: [], width: 600 };

              return (
                <React.Fragment key={item.item_id}>
                  <tr 
                    onClick={() => handleItemSelect(item)}
                    className={`hover:bg-slate-50/70 transition-all cursor-pointer ${
                      isActive ? "bg-pink-50/30 border-l-4 border-l-pink-650" : ""
                    }`}
                  >
                    {/* 품목 명칭 */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            item.category === "RAW_MATERIAL" 
                              ? "bg-slate-900 text-slate-100 border-slate-800" 
                              : "bg-indigo-50 text-indigo-750 border-indigo-100"
                          }`}>
                            {item.category === "RAW_MATERIAL" ? "자재" : "경쟁완제품"}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-450">{item.item_code}</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-855 truncate max-w-[200px] flex items-center gap-1.5">
                          {item.item_name}
                          {item.spec && (
                            <span className="text-[10px] text-pink-655 bg-pink-50/50 border border-pink-100 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                              {item.spec}
                            </span>
                          )}
                        </h4>
                      </div>
                    </td>

                    {/* 수집 통화 */}
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-extrabold rounded-md border border-slate-200">
                        {itemCurrency}
                      </span>
                    </td>

                    {/* 기준가 */}
                    <td className="p-4 text-right">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold font-mono text-slate-805 block">
                          {itemCurrency === 'KRW' ? '₩ ' : '$ '}{item.base_price.toLocaleString()}
                        </span>
                        {itemCurrency !== 'KRW' && (
                          <span className="text-[9px] text-slate-400 font-bold block">
                            (₩ {(item.base_price_krw ?? 0).toLocaleString()})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 실시간 수집가 */}
                    <td className="p-4 text-right relative group">
                      {miningItemIds.includes(item.item_id) ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-pink-500 to-indigo-650 text-white font-extrabold text-[9px] rounded-lg shadow-sm animate-pulse">
                          <Sparkles className="w-2.5 h-2.5 animate-spin shrink-0" />
                          <span>⚡ AI 로봇 수집중...</span>
                        </div>
                      ) : item.latest_price > 0 ? (
                        <div className="space-y-0.5 inline-flex flex-col items-end">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.latest_site_url && item.latest_site_url !== '#') {
                                window.open(item.latest_site_url, '_blank');
                              }
                            }}
                            className="text-xs font-black font-mono text-slate-850 cursor-pointer hover:text-pink-600 hover:underline transition-colors flex items-center gap-0.5"
                            title={`클릭 시 최저가 마켓 [${item.latest_site_name}] 상세 상품 페이지로 새 창에서 즉시 이동`}
                          >
                            {itemCurrency === 'KRW' ? '₩ ' : '$ '}{item.latest_price.toLocaleString()}
                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </span>
                          {itemCurrency !== 'KRW' && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.latest_site_url && item.latest_site_url !== '#') {
                                  window.open(item.latest_site_url, '_blank');
                                }
                              }}
                              className="text-[9px] text-slate-500 font-extrabold cursor-pointer hover:text-pink-600 hover:underline transition-colors block"
                              title={`클릭 시 최저가 마켓 [${item.latest_site_name}] 상세 상품 페이지로 새 창에서 즉시 이동`}
                            >
                              (₩ {(item.latest_krw_price ?? 0).toLocaleString()})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-bold">수집 대기 중</span>
                      )}

                      {/* 노드별 실시간 가격 즉석 브리핑 툴팁 카드 */}
                      {item.collectors_prices && item.collectors_prices.length > 0 && !miningItemIds.includes(item.item_id) && (
                        <div className="hidden group-hover:block absolute z-30 right-4 top-12 w-64 bg-slate-900/95 backdrop-blur-md text-slate-100 p-3.5 rounded-2xl border border-slate-800 shadow-2xl transition-all duration-200 text-left">
                          <div className="border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">노드별 실시간 수집 가격</span>
                            <span className="text-[8px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded font-extrabold">LIVE</span>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {item.collectors_prices.map((cp, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px] gap-2">
                                <span className="text-slate-300 truncate max-w-[130px] font-medium" title={cp.siteName}>
                                  📍 {cp.siteName}
                                </span>
                                <div className="text-right shrink-0">
                                  <span className="font-bold font-mono text-pink-400">
                                    {cp.currency === 'KRW' ? '₩ ' : '$ '}{cp.price.toLocaleString()}
                                  </span>
                                  {cp.currency !== 'KRW' && (
                                    <span className="block text-[8px] text-slate-400 font-mono">
                                      (₩ {cp.krwPrice.toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 실시간 연동 환율 */}
                    <td className="p-4 text-center">
                      {itemCurrency !== 'KRW' ? (
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold font-mono text-slate-700 block">
                            {item.exchange_rate.toLocaleString()} 원
                          </span>
                          <span className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                            item.rate_change_direction === 'UP' 
                              ? 'bg-rose-50 text-rose-505' 
                              : item.rate_change_direction === 'DOWN'
                              ? 'bg-sky-50 text-sky-505'
                              : 'bg-slate-50 text-slate-505'
                          }`}>
                            {item.rate_change_direction === 'UP' ? '▲' : item.rate_change_direction === 'DOWN' ? '▼' : '•'} {item.rate_change_percent}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-semibold text-[10px]">-</span>
                      )}
                    </td>

                    {/* 변동폭 / 변동률 */}
                    <td className="p-4 text-right">
                      {item.latest_price > 0 ? (
                        <div className="space-y-0.5">
                          <span className={`text-xs font-black font-mono flex items-center justify-end gap-0.5 ${
                            isUp ? "text-rose-600" : isDown ? "text-sky-500" : "text-slate-500"
                          }`}>
                            {isUp ? "▲" : isDown ? "▼" : ""} 
                            {itemCurrency === 'KRW' ? '₩ ' : '$ '}{Math.abs(changeAmount).toLocaleString()}
                          </span>
                          <span className={`text-[9px] font-bold font-mono block ${
                            isUp ? "text-rose-500" : isDown ? "text-sky-400" : "text-slate-400"
                          }`}>
                            ({isUp ? "+" : ""}{changeRate.toFixed(2)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-bold">-</span>
                      )}
                    </td>

                    {/* 실시간 마진율 */}
                    <td className="p-4 text-right">
                      <div className="space-y-1 inline-flex flex-col items-end">
                        <span className={`text-xs font-black font-mono block ${
                          isWarning ? "text-rose-600" : "text-emerald-600"
                        }`}>
                          {item.latest_price > 0 ? `${item.current_margin_rate}%` : "N/A"}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {isWarning && item.latest_price > 0 && (
                            <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-1 rounded animate-pulse border border-rose-100">
                              🚨 마진 붕괴
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400 font-semibold font-mono">
                            (목표 {item.target_margin_rate}%)
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 수집망 노드 개수 */}
                    <td className="p-4 text-center">
                      {miningItemIds.includes(item.item_id) ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-pink-500 to-indigo-650 text-white font-extrabold text-[9px] rounded-lg shadow-sm animate-pulse justify-center">
                          <Zap className="w-3 h-3 shrink-0" />
                          <span>⚡ AI 로봇 수집중...</span>
                        </div>
                      ) : (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemSelect(item);
                            setIsCollectorModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-50 text-slate-655 hover:text-pink-650 hover:bg-pink-50/50 hover:border-pink-200 transition-all font-bold font-mono rounded-lg border border-slate-200 inline-block text-[11px] cursor-pointer"
                          title="클릭하여 수집 로봇 매핑 및 검수 센터 모달 열기"
                        >
                          {Number(item.collectors_count ?? 0)} 개 노드 ⚙️
                        </span>
                      )}
                    </td>

                    {/* 퀵 액션 */}
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="relative group">
                          <button
                            onClick={() => {
                              handleItemSelect(item);
                              setIsAlertModalOpen(true);
                            }}
                            className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                              alerts.filter((r) => r.item_id === item.item_id && r.is_enabled === 1).length > 0
                                ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600 hover:text-white"
                                : "bg-white text-slate-450 border-slate-200 hover:bg-rose-50 hover:text-rose-600"
                            }`}
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>

                          {/* 프리미엄 가격 감시 설정 툴팁 말풍선 */}
                          <div className="absolute right-full mr-3 -top-2.5 hidden group-hover:block z-45 w-72 bg-slate-900/95 backdrop-blur-md text-white text-[10px] p-4 rounded-2xl shadow-2xl border border-slate-700/50 text-left transition-all duration-200 pointer-events-none">
                            <div className="absolute left-full top-3.5 border-[6px] border-transparent border-l-slate-900/95"></div>
                            
                            {alerts.filter((r) => r.item_id === item.item_id).length === 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 font-black text-rose-450 text-[11px]">
                                  <Bell className="w-3.5 h-3.5" />
                                  <span>설정된 알림이 없습니다</span>
                                </div>
                                <p className="text-slate-400 font-bold leading-relaxed">
                                  클릭하여 실시간 마진 스프레드 붕괴 및 시황 한계 돌파 긴급 경보 규칙을 가동해 보세요.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                                  <div className="flex items-center gap-1 font-black text-rose-455 text-[11px]">
                                    <Bell className="w-3.5 h-3.5 animate-bounce" />
                                    <span>FreeSMS 경보망 ({alerts.filter((r) => r.item_id === item.item_id).length}개 작동)</span>
                                  </div>
                                </div>
                                <div className="space-y-2 pointer-events-auto">
                                  {alerts.filter((r) => r.item_id === item.item_id).map((rule, rIdx) => (
                                    <div key={rule.rule_id || rIdx} className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/30 space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-extrabold text-slate-200 text-xs truncate max-w-[150px]">{rule.rule_name}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                          rule.is_enabled === 1 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-700 text-slate-400"
                                        }`}>
                                          {rule.is_enabled === 1 ? "ON" : "OFF"}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-1 text-[9px] font-bold text-slate-400 border-t border-slate-700/40 pt-1 mt-1 font-sans">
                                        <div>
                                          <span className="text-slate-500">조건: </span>
                                          <span className="text-rose-350">
                                            {rule.condition_type === "MARGIN_BREAKDOWN" && "📉 마진 붕괴"}
                                            {rule.condition_type === "BELOW_LIMIT" && "📉 시세 하락"}
                                            {rule.condition_type === "ABOVE_LIMIT" && "📈 시세 폭등"}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-slate-500">기준: </span>
                                          <span className="text-white font-mono">
                                            {rule.condition_type === "MARGIN_BREAKDOWN" 
                                              ? `${rule.threshold_value}%` 
                                              : `${rule.threshold_value.toLocaleString()}${item.currency_code || 'KRW'}`
                                            }
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-[8px] text-slate-505 font-mono pt-0.5">
                                        📞 수신: {rule.phone_number}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleEditItemClick(item)}
                          className="p-1.5 hover:bg-indigo-50 hover:text-indigo-650 text-slate-455 border border-slate-200 bg-white rounded-lg transition-colors cursor-pointer"
                          title="품목 정보 수정"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.item_id, item.item_name)}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-455 border border-slate-200 bg-white rounded-lg transition-colors cursor-pointer"
                          title="품목 영구 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* 활성화된 품목의 상세 분석 꺾은선 차트 Drawer 패널 (PC 고정 3열 그리드) */}
                  {isActive && (
                    <tr className="bg-slate-50/30">
                      <td colSpan={9} className="p-6 border-b border-slate-200">
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-left"
                        >
                          {/* 와이드 SVG 선형 가격 변동 차트 */}
                          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[260px] w-full min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3.5 mb-4 gap-2">
                              <div className="space-y-0.5">
                                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                  <BarChart3 className="w-4 h-4 text-pink-650" />
                                  시세 변동 선형 추이 분석 ({item.item_name})
                                </h3>
                                <p className="text-[9px] text-slate-400 font-semibold">최근 파이프라인 수집 누적 히스토리</p>
                              </div>
                              <span 
                                onClick={() => {
                                  if (item.latest_site_url && item.latest_site_url !== '#') {
                                    window.open(item.latest_site_url, '_blank');
                                  }
                                }}
                                className="text-[9px] font-black text-pink-655 font-mono bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100 flex items-center gap-1 cursor-pointer hover:bg-pink-100 hover:text-pink-700 transition-all shadow-sm self-start sm:self-auto"
                                title={`클릭 시 최저가를 공급하고 있는 [${item.latest_site_name}] 상세 상품 페이지로 새 창에서 즉시 연결`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                최저가 출처: {item.latest_site_name || '수집기 매핑 없음'}
                                <ArrowUpRight className="w-3 h-3 text-pink-500 shrink-0" />
                              </span>
                            </div>

                            {svgPoints.length === 0 ? (
                              <div className="h-40 flex flex-col items-center justify-center text-xs text-slate-455 font-bold gap-2">
                                <Globe className="w-8 h-8 text-slate-300 animate-spin-slow" />
                                수집 완료된 단가 이력이 없습니다. 수집 로봇 탭에서 크롤링 URL을 먼저 매핑해 주세요!
                              </div>
                            ) : (
                              /* 품목 상세 차트 영역 (가로 스크롤 컨테이너 바인딩) */
                              <div 
                                ref={itemScrollRef} 
                                className="w-full py-1 overflow-x-auto scrollbar-thin scrollbar-thumb-pink-650 scrollbar-track-slate-100 rounded-2xl min-w-0"
                              >
                                <svg 
                                  viewBox={`0 0 ${svgChartWidth} 180`} 
                                  className="overflow-visible"
                                  style={{ width: svgChartWidth, minWidth: svgChartWidth, height: 180, display: "block" }}
                                  onMouseLeave={() => setItemHoverInfo(null)}
                                >
                                  <line x1="50" y1="20" x2={svgChartWidth - 30} y2="20" stroke="#f1f5f9" strokeWidth="1" />
                                  <line x1="50" y1="90" x2={svgChartWidth - 30} y2="90" stroke="#fecdd3" strokeDasharray="3" strokeWidth="0.8" />
                                  <line x1="50" y1="160" x2={svgChartWidth - 30} y2="160" stroke="#f1f5f9" strokeWidth="1" />

                                  <path d={svgPath} fill="none" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round" />

                                  {svgPoints.map((pt, idx) => {
                                    const isLast = idx === svgPoints.length - 1;
                                    const shouldRenderPoint = svgPoints.length <= 15 || isLast;
                                    if (!shouldRenderPoint) return null;

                                    return (
                                      <g key={idx}>
                                        <circle cx={pt.x} cy={pt.y} r={isLast ? 6 : 4} fill={isLast ? "#db2777" : "#be185d"} stroke="#ffffff" strokeWidth="1.5" />
                                        {isLast && (
                                          <circle cx={pt.x} cy={pt.y} r="12" fill="none" stroke="#db2777" strokeWidth="1.5" className="animate-ping" style={{ transformOrigin: `${pt.x}px ${pt.y}px` }} />
                                        )}
                                      </g>
                                    );
                                  })}

                                  {(() => {
                                    const labelStep = Math.max(1, Math.ceil(svgPoints.length / 8));
                                    
                                    return svgPoints.map((pt, idx) => {
                                      const isLast = idx === svgPoints.length - 1;
                                      const isFirst = idx === 0;
                                      
                                      const shouldRenderLabel = isFirst || isLast || (idx % labelStep === 0 && idx < svgPoints.length - labelStep * 0.7);
                                      if (!shouldRenderLabel) return null;

                                      let formattedDate = pt.date;
                                      if (pt.date.includes("-")) {
                                        const parts = pt.date.split("-");
                                        const month = parseInt(parts[0], 10);
                                        const day = parseInt(parts[1], 10);
                                        formattedDate = `${month}월 ${day}일`;
                                      }

                                      return (
                                        <text key={idx} x={pt.x} y="176" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="bold">
                                          {formattedDate}
                                        </text>
                                      );
                                    });
                                  })()}

                                  {/* 품목 상세 마우스 오버 툴팁 카드 */}
                                  {itemHoverInfo && (
                                    <g>
                                      <line
                                        x1={itemHoverInfo.x}
                                        y1={20}
                                        x2={itemHoverInfo.x}
                                        y2={160}
                                        stroke="#db2777"
                                        strokeWidth="1.2"
                                        strokeDasharray="3,3"
                                      />
                                      
                                      <circle
                                        cx={itemHoverInfo.x}
                                        cy={itemHoverInfo.y}
                                        r="7"
                                        fill="#db2777"
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                        className="shadow-md"
                                      />

                                      {/* 이동 보정 툴팁 카드 */}
                                      {(() => {
                                        const tooltipWidth = 140;
                                        const tooltipHeight = 54;
                                        let tooltipX = itemHoverInfo.x - tooltipWidth / 2;
                                        
                                        if (tooltipX < 50) tooltipX = 50;
                                        if (tooltipX + tooltipWidth > svgChartWidth - 30) {
                                          tooltipX = svgChartWidth - 30 - tooltipWidth;
                                        }

                                        const tooltipY = Math.max(5, itemHoverInfo.y - 64);
                                        const curCode = activeItem?.currency_code || "KRW";

                                        const krwVal = itemHoverInfo.converted_krw 
                                          ? `(₩${Math.floor(itemHoverInfo.converted_krw).toLocaleString()})`
                                          : "";

                                        return (
                                          <g className="select-none pointer-events-none">
                                            <rect
                                              x={tooltipX}
                                              y={tooltipY}
                                              width={tooltipWidth}
                                              height={tooltipHeight}
                                              rx="8"
                                              fill="#0f172a"
                                              fillOpacity="0.94"
                                              stroke="#db2777"
                                              strokeWidth="1.5"
                                              className="shadow-2xl"
                                            />
                                            <text
                                              x={tooltipX + tooltipWidth / 2}
                                              y={tooltipY + 14}
                                              textAnchor="middle"
                                              fill="#94a3b8"
                                              fontSize="8"
                                              fontWeight="bold"
                                            >
                                              {itemHoverInfo.date}
                                            </text>
                                            <text
                                              x={tooltipX + tooltipWidth / 2}
                                              y={tooltipY + 30}
                                              textAnchor="middle"
                                              fill="#ffffff"
                                              fontSize="11.5"
                                              fontWeight="955"
                                              fontFamily="monospace"
                                            >
                                              {itemHoverInfo.price.toLocaleString()} {curCode}
                                            </text>
                                            {krwVal && (
                                              <text
                                                x={tooltipX + tooltipWidth / 2}
                                                y={tooltipY + 44}
                                                textAnchor="middle"
                                                fill="#fb7185"
                                                fontSize="8.5"
                                                fontWeight="bold"
                                              >
                                                {krwVal}
                                              </text>
                                            )}
                                          </g>
                                        );
                                      })()}
                                    </g>
                                  )}

                                  {/* 투명 툴팁 센서바 영역 */}
                                  {svgPoints.map((pt, idx) => {
                                    let formattedDate = pt.date;
                                    if (pt.date.includes("-")) {
                                      const parts = pt.date.split("-");
                                      const month = parseInt(parts[0], 10);
                                      const day = parseInt(parts[1], 10);
                                      formattedDate = `${month}월 ${day}일`;
                                    }

                                    const rectWidth = (svgChartWidth - 90) / svgPoints.length;
                                    const rectX = pt.x - rectWidth / 2;

                                    const matchedHist = urls[0]?.history?.[idx];
                                    const krwPrice = matchedHist?.converted_krw_price || 0;

                                    return (
                                      <rect
                                        key={`item-sensor-${idx}`}
                                        x={rectX}
                                        y={0}
                                        width={rectWidth}
                                        height={160}
                                        fill="transparent"
                                        className="cursor-crosshair opacity-0"
                                        onMouseEnter={() => setItemHoverInfo({
                                          x: pt.x,
                                          y: pt.y,
                                          price: pt.price,
                                          date: formattedDate,
                                          index: idx,
                                          converted_krw: krwPrice
                                        })}
                                        onMouseMove={() => setItemHoverInfo({
                                          x: pt.x,
                                          y: pt.y,
                                          price: pt.price,
                                          date: formattedDate,
                                          index: idx,
                                          converted_krw: krwPrice
                                        })}
                                      />
                                    );
                                  })}
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* 실시간 마진 스프레드 서클 게이지 */}
                          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[260px] w-full">
                            <div>
                              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                <span className="w-1.5 h-3.5 bg-pink-655 rounded-full animate-pulse"></span>
                                실시간 마진 진단
                              </h3>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-semibold">자사 원가 대비 마진 보존 수준 계기판</p>
                            </div>

                            <div className="flex flex-col items-center py-2 space-y-3">
                              <div className="relative flex items-center justify-center w-24 h-24">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="9" />
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    fill="none"
                                    stroke={isWarning ? "#ef4444" : "#10b981"}
                                    strokeWidth="9"
                                    strokeDasharray="264"
                                    strokeDashoffset={264 - (264 * Math.max(0, Math.min(100, item.current_margin_rate))) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                  />
                                </svg>
                                <div className="absolute text-center">
                                  <span className="text-sm font-black font-mono text-slate-850 block">
                                    {item.latest_price > 0 ? `${item.current_margin_rate}%` : "N/A"}
                                  </span>
                                  <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Margin</span>
                                </div>
                              </div>

                              <div className="text-center space-y-0.5">
                                <span className={`text-[10px] font-black tracking-wide ${isWarning ? "text-rose-500 animate-pulse" : "text-emerald-500"}`}>
                                  {item.latest_price > 0 
                                    ? (isWarning ? "⚠️ 마진 경고선 붕괴 위험" : "✓ 적정 마진 안전 보존")
                                    : "시세 대기 중"
                                  }
                                </span>
                                {item.latest_price > 0 && (
                                  <span className="text-[8.5px] text-slate-400 block font-semibold leading-relaxed">
                                    목표 {item.target_margin_rate}% 대비 {Math.abs(item.current_margin_rate - item.target_margin_rate).toFixed(2)}%p {isWarning ? "미달" : "초과 달성"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={9} className="p-16 text-center text-slate-405 font-bold bg-white font-sans">
                  <ShieldAlert className="w-8 h-8 mx-auto text-slate-350 mb-2 animate-bounce" />
                  조건에 일치하는 SCM 관제 품목이 검색되지 않습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
