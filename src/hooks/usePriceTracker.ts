"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";

// 글로벌 통화 감지 및 기호 헬퍼
export function detectCurrency(siteName: string, targetUrl: string): string {
  const siteLower = (siteName || '').toLowerCase();
  const urlLower = (targetUrl || '').toLowerCase();

  // 1. 미국 달러(USD) 노드 감지
  if (
    siteLower.includes('아마존') || siteLower.includes('amazon') ||
    siteLower.includes('알리') || siteLower.includes('aliexpress') ||
    urlLower.includes('amazon.com') || urlLower.includes('aliexpress.com')
  ) {
    return 'USD';
  }
  // 2. 중국 위안화(CNY) 노드 감지
  if (
    siteLower.includes('타오바오') || siteLower.includes('taobao') ||
    siteLower.includes('티몰') || siteLower.includes('tmall') ||
    urlLower.includes('taobao.com') || urlLower.includes('tmall.com') || urlLower.includes('1688.com')
  ) {
    return 'CNY';
  }
  // 3. 일본 엔화(JPY) 노드 감지
  if (
    siteLower.includes('야후재팬') || siteLower.includes('yahoo.co.jp') ||
    siteLower.includes('라쿠텐') || siteLower.includes('rakuten') ||
    urlLower.includes('yahoo.co.jp') || urlLower.includes('rakuten.co.jp')
  ) {
    return 'JPY';
  }
  // 4. 유로화(EUR) 노드 감지
  if (
    siteLower.includes('유로') || siteLower.includes('euro') ||
    urlLower.includes('.de') || urlLower.includes('.fr') || urlLower.includes('.it') || urlLower.includes('.es')
  ) {
    return 'EUR';
  }
  return 'KRW';
}

export function getCurrencySymbol(currency: string): string {
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  if (currency === 'JPY') return '¥';
  if (currency === 'CNY') return '元';
  return '₩';
}

export function usePriceTracker() {
  // 상태 정의
  const [items, setItems] = useState<any[]>([]);
  const [activeItem, setActiveItem, isActiveItemRestored] = usePersistedState<any | null>('egdesk_pricetracker_activeItem', null);
  const [urls, setUrls] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertLogs, setAlertLogs] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [exchangeRateHistories, setExchangeRateHistories] = useState<any[]>([]);

  // 백그라운드 데몬 상태
  const [daemonInfo, setDaemonInfo] = useState({
    status: "STOPPED",
    last_run: "기록 없음",
    pid: "N/A"
  });

  // 환율 분석 차트 활성 탭
  const [activeRateTab, setActiveRateTab, isActiveRateTabRestored] = usePersistedState("egdesk_pricetracker_activeRateTab", "USD");

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery, isSearchQueryRestored] = usePersistedState("egdesk_pricetracker_searchQuery", "");
  const [categoryFilter, setCategoryFilter, isCategoryFilterRestored] = usePersistedState("egdesk_pricetracker_categoryFilter", "ALL");
  const [statusFilter, setStatusFilter, isStatusFilterRestored] = usePersistedState("egdesk_pricetracker_statusFilter", "ALL");

  // 모달 제어 상태
  const [isItemModalOpen, setIsItemModalOpen, isItemModalOpenRestored] = usePersistedState("egdesk_pricetracker_isItemModalOpen", false);
  const [isCollectorModalOpen, setIsCollectorModalOpen, isCollectorModalOpenRestored] = usePersistedState("egdesk_pricetracker_isCollectorModalOpen", false);
  const [isEditMode, setIsEditMode, isEditModeRestored] = usePersistedState("egdesk_pricetracker_isEditMode", false);
  const [editingItemId, setEditingItemId, isEditingItemIdRestored] = usePersistedState<number | null>("egdesk_pricetracker_editingItemId", null);
  const [miningItemIds, setMiningItemIds] = useState<number[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen, isAlertModalOpenRestored] = usePersistedState("egdesk_pricetracker_isAlertModalOpen", false);
  const [isCronHelpOpen, setIsCronHelpOpen] = useState(false);
  const [isDaemonHelpOpen, setIsDaemonHelpOpen] = useState(false);
  const [copiedUrlId, setCopiedUrlId] = useState<number | null>(null);

  // AI 자율 마이닝용 통합 상태
  const [miningLoading, setMiningLoading] = useState(false);
  const [miningLoadStep, setMiningLoadStep] = useState(1); // 1: 검색, 2: 스크래핑, 3: 가격 분석
  const [searchChannels, setSearchChannels] = useState([
    { id: 1, name: "쿠팡 자율 수집망", active: true, isCustom: false },
    { id: 2, name: "네이버 스마트스토어 노드", active: true, isCustom: false },
    { id: 3, name: "아마존 글로벌 노드", active: true, isCustom: false },
    { id: 4, name: "알리익스프레스 글로벌", active: true, isCustom: false }
  ]);
  const [newChannelName, setNewChannelName] = useState("");

  // 폼 입력 상태
  const [itemForm, setItemForm, isItemFormRestored] = usePersistedState('egdesk_pricetracker_itemForm', { 
    item_code: "", 
    item_name: "", 
    category: "RAW_MATERIAL", 
    spec: "", 
    base_price: "", 
    target_margin_rate: "12.5",
    currency_code: "USD" 
  });
  const [urlForm, setUrlForm, isUrlFormRestored] = usePersistedState('egdesk_pricetracker_urlForm', { 
    site_name: "", 
    target_url: "", 
    css_selector: "", 
    cron_interval: "0 9 * * *" 
  });
  const [aiForm, setAiForm, isAiFormRestored] = usePersistedState('egdesk_pricetracker_aiForm', { 
    industry: "정밀 기계 및 금속가공업", 
    keyword: "구리 전기동 원자재 LME" 
  });
  const [alertForm, setAlertForm, isAlertFormRestored] = usePersistedState('egdesk_pricetracker_alertForm', { 
    rule_name: "", 
    condition_type: "MARGIN_BREAKDOWN", 
    threshold_value: "5.0", 
    phone_number: "010-1234-5678", 
    sms_template: "",
    threshold_unit: "PERCENT", 
    threshold_currency: "USD", 
    condition_operator: "MARGIN_BREAKDOWN" 
  });

  // 로딩/액션 상태
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [crawlerTesting, setCrawlerTesting] = useState(false);
  const [updatingRates, setUpdatingRates] = useState(false);
  const [startingDaemon, setStartingDaemon] = useState(false);
  const [copiedText, setCopiedText] = useState("");
  const [selectorAnalyzing, setSelectorAnalyzing] = useState(false);

  // 지정 기간 환율 백필 상태
  const getTodayDateStr = () => {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  };
  const [backfillStartDate, setBackfillStartDate, isBackfillStartDateRestored] = usePersistedState("egdesk_pricetracker_backfillStartDate", "2026-01-01");
  const [backfillEndDate, setBackfillEndDate, isBackfillEndDateRestored] = usePersistedState("egdesk_pricetracker_backfillEndDate", getTodayDateStr());
  const [isBackfilling, setIsBackfilling] = useState(false);

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isActiveItemRestored && isActiveRateTabRestored && isSearchQueryRestored && isCategoryFilterRestored && isStatusFilterRestored && isItemModalOpenRestored && isCollectorModalOpenRestored && isEditModeRestored && isEditingItemIdRestored && isAlertModalOpenRestored && isItemFormRestored && isUrlFormRestored && isAiFormRestored && isAlertFormRestored && isBackfillStartDateRestored && isBackfillEndDateRestored;

  // 차트 마우스 오버 툴팁 상태
  const [rateHoverInfo, setRateHoverInfo] = useState<{ x: number; y: number; val: number; date: string; index: number } | null>(null);
  const [itemHoverInfo, setItemHoverInfo] = useState<{ x: number; y: number; price: number; date: string; index: number; converted_krw?: number } | null>(null);

  // 차트 가로 스크롤바 제어용 Ref
  const rateScrollRef = useRef<HTMLDivElement>(null);
  const itemScrollRef = useRef<HTMLDivElement>(null);

  // 스크롤을 맨 우측으로 밀착시키는 안전 헬퍼 함수
  const scrollToRight = useCallback((elem: HTMLDivElement | null) => {
    if (!elem) return;
    elem.scrollLeft = elem.scrollWidth;
    requestAnimationFrame(() => {
      if (elem) elem.scrollLeft = elem.scrollWidth;
    });
  }, []);

  // 크론식 한글 해석 도우미 함수
  const explainCron = (cron: string) => {
    if (!cron) return "수집 주기가 비어있습니다.";
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return "올바른 5필드 크론식을 입력해 주세요 (예: 0 9 * * *).";

    const [min, hour, day, month, dayOfWeek] = parts;

    if (min === "*" && hour === "*" && day === "*" && month === "*" && dayOfWeek === "*") {
      return "🚨 매분 1회 수집 (경고: 무리한 초고속 주기입니다. 쇼핑몰 보안망에 의해 매장 IP가 100% 차단(Ban)되며, 서버 부하가 유발되므로 실무 적용이 불가합니다!)";
    }

    if (min.startsWith("*/")) {
      const intervalNum = parseInt(min.replace("*/", ""), 10);
      if (!isNaN(intervalNum) && intervalNum < 30) {
        return `⚠️ 매 ${intervalNum}분 간격 수집 (주의: 30분 미만의 잦은 수집은 쇼핑몰 봇 차단 시스템에 탐지되어 즉각적인 IP 영구 차단을 유발하므로, 최소 1시간 이상 설정을 권장합니다.)`;
      }
    }

    let result = "";

    // 요일 매핑
    if (dayOfWeek !== "*") {
      const daysMap: Record<string, string> = {
        "0": "일요일", "7": "일요일", "SUN": "일요일",
        "1": "월요일", "MON": "월요일",
        "2": "화요일", "TUE": "화요일",
        "3": "수요일", "WED": "수요일",
        "4": "목요일", "THU": "목요일",
        "5": "금요일", "FRI": "금요일",
        "6": "토요일", "SAT": "토요일"
      };
      const dayStr = daysMap[dayOfWeek.toUpperCase()] || `${dayOfWeek}요일`;
      result += `매주 ${dayStr} `;
    } else if (day !== "*" && month === "*") {
      result += `매월 ${day}일 `;
    } else if (day !== "*" && month !== "*") {
      result += `매년 ${month}월 ${day}일 `;
    } else {
      result += "매일 ";
    }

    // 시간 매핑
    if (hour !== "*") {
      const hNum = parseInt(hour, 10);
      if (!isNaN(hNum)) {
        if (hNum === 0) {
          result += "밤 12시 ";
        } else if (hNum < 12) {
          result += `오전 ${hNum}시 `;
        } else if (hNum === 12) {
          result += "오후 12시 ";
        } else {
          result += `오후 ${hNum - 12}시 `;
        }
      } else {
        result += `${hour}시 `;
      }
    } else {
      result += "매시간 ";
    }

    // 분 매핑
    if (min !== "*") {
      const mNum = parseInt(min, 10);
      if (!isNaN(mNum)) {
        if (mNum === 0) {
          result += "정각에 ";
        } else {
          result += `${mNum}분에 `;
        }
      } else {
        result += `${min}분에 `;
      }
    } else {
      result += "매분 ";
    }

    result += "자동으로 가격을 수집합니다.";
    return result;
  };

  // 상세 및 환율 데이터 조회 로직
  const fetchItemDetails = async (itemId: number) => {
    try {
      const res = await apiFetch(`/api/price-tracker/urls?item_id=${itemId}`);
      const json = await res.json();
      if (json.success) {
        setUrls(json.urls);
      }
    } catch (e) {
      console.error("수집 사이트 상세 정보 조회 실패:", e);
    }
  };

  const triggerBackgroundAutoMining = async (itemId: number, itemName: string, spec: string) => {
    let isAlreadyMining = false;
    setMiningItemIds(prev => {
      if (prev.includes(itemId)) {
        isAlreadyMining = true;
        return prev;
      }
      return [...prev, itemId];
    });

    if (isAlreadyMining) {
      console.log(`🛡️ [Auto-Mining] 품목 [${itemName}] 에 대한 백그라운드 스캔이 이미 활발히 기동 중입니다.`);
      return;
    }

    console.log(`🤖 [Auto-Mining] 신규 품목 백그라운드 자율 스캔 기동 ➡️ 품목: [${itemName}], 규격: [${spec}]`);
    try {
      const activeChannelList = searchChannels.filter(c => c.active).map(c => c.name);
      if (activeChannelList.length === 0) return;

      const mineRes = await apiFetch("/api/price-tracker/ai-search-miner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId,
          query: itemName,
          specification: spec,
          channels: activeChannelList
        })
      });
      const mineJson = await mineRes.json();
      
      if (mineJson.success && mineJson.candidates && mineJson.candidates.length > 0) {
        let deployedCount = 0;
        for (const cand of mineJson.candidates) {
          const res = await apiFetch("/api/price-tracker/urls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              item_id: itemId,
              site_name: cand.site_name,
              target_url: cand.url,
              css_selector: cand.css_selector,
              cron_interval: "0 9 * * *",
              run_test: true,
              test_price: cand.price
            })
          });
          const json = await res.json();
          if (json.success) deployedCount++;
        }
        console.log(`🎉 [Auto-Mining] 백그라운드 최저가 노드 자동 장착 완수: 총 ${deployedCount}개 노드 바인딩 완료.`);
      }
    } catch (err) {
      console.warn("⚠️ [Auto-Mining] 백그라운드 자율 스캔 실패:", err);
    } finally {
      setMiningItemIds(prev => prev.filter(id => id !== itemId));
      fetchInitDataSilent();
    }
  };

  const fetchInitDataSilent = async () => {
    try {
      const itemsRes = await apiFetch("/api/price-tracker/items");
      const itemsJson = await itemsRes.json();
      if (itemsJson.success) {
        setItems(itemsJson.items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInitData = async () => {
    setLoading(true);
    try {
      // 1. 품목 조회
      const itemsRes = await apiFetch("/api/price-tracker/items");
      const itemsJson = await itemsRes.json();
      if (itemsJson.success) {
        setItems(itemsJson.items);
        if (itemsJson.items.length > 0 && !activeItem) {
          const defaultItem = itemsJson.items[0];
          setActiveItem(defaultItem);
          fetchItemDetails(defaultItem.item_id);
        } else if (activeItem) {
          const matched = itemsJson.items.find((x: any) => x.item_id === activeItem.item_id);
          if (matched) {
            setActiveItem(matched);
            fetchItemDetails(matched.item_id);
          }
        }

        itemsJson.items.forEach((item: any) => {
          if (Number(item.collectors_count ?? 0) === 0) {
            triggerBackgroundAutoMining(item.item_id, item.item_name, item.spec || "");
          }
        });
      }

      // 2. 알림 규칙 및 발송 이력 로그 조회
      const alertsRes = await apiFetch("/api/price-tracker/alerts");
      const alertsJson = await alertsRes.json();
      if (alertsJson.success) {
        setAlerts(alertsJson.rules);
        setAlertLogs(alertsJson.logs);
      }

      // 3. 환율 및 데몬 상태 조회
      const ratesRes = await apiFetch("/api/price-tracker/exchange-rates");
      const ratesJson = await ratesRes.json();
      if (ratesJson.success) {
        setExchangeRates(ratesJson.rates);
        setExchangeRateHistories(ratesJson.histories || []);
        if (ratesJson.daemon) {
          setDaemonInfo(ratesJson.daemon);
        }
      }
    } catch (e) {
      console.error("초기 SCM 관제 데이터 로딩 에러:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRestored) {
      fetchInitData();
    }
  }, [isRestored]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInitData();
    if (activeItem) {
      await fetchItemDetails(activeItem.item_id);
    }
    setRefreshing(false);
  };

  const handleSyncExchangeRates = async () => {
    setUpdatingRates(true);
    try {
      const res = await apiFetch("/api/price-tracker/exchange-rates", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        alert("⚡ 외환시장 환율 데이터 동기화 완료! 공백이 있던 경우 오늘의 이력도 정상 누적 적재되었습니다.");
        fetchInitData();
      } else {
        alert("환율 갱신 실패: " + json.error);
      }
    } catch (e: any) {
      console.error(e);
      alert("에러 발생: " + e.message);
    } finally {
      setUpdatingRates(false);
    }
  };

  const handleStartDaemon = async () => {
    setStartingDaemon(true);
    try {
      const res = await apiFetch("/api/price-tracker/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START_DAEMON" })
      });
      const json = await res.json();
      if (json.success) {
        alert("🤖 [Daemon] 백그라운드 가격/환율 수집 데몬 기동 명령 송출 완료!\n서버 내부에서 자율 가동을 시작하며, 누락된 공백 환율도 자동으로 소급 복원(Backfill)합니다.");
        fetchInitData();
      } else {
        alert("데몬 기동 실패: " + json.error);
      }
    } catch (e: any) {
      console.error(e);
      alert("에러 발생: " + e.message);
    } finally {
      setStartingDaemon(false);
    }
  };

  const handleCopyCommand = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const handleBulkBackfill = async () => {
    if (!backfillStartDate || !backfillEndDate) {
      alert("시작일과 종료일을 정확히 지정해 주세요.");
      return;
    }
    setIsBackfilling(true);
    try {
      const res = await apiFetch("/api/price-tracker/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_BACKFILL",
          startDate: backfillStartDate,
          endDate: backfillEndDate
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(`🎉 [소급 완료] ${backfillStartDate} ~ ${backfillEndDate} 기간 환율 복원 완료!\n- 신규 적재: ${json.inserted} 건\n- 중복 제외: ${json.ignored} 건\n\n대시보드와 환율 추이 분석 그래프가 즉시 실시간 갱신되었습니다.`);
        fetchInitData();
      } else {
        alert("소급 실패: " + json.error);
      }
    } catch (e: any) {
      console.error(e);
      alert("에러 발생: " + e.message);
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleItemSelect = (item: any) => {
    setActiveItem(item);
    fetchItemDetails(item.item_id);
    
    setAlertForm(prev => ({
      ...prev,
      rule_name: `${item.item_name} 급변동 긴급 경고`,
      phone_number: "010-1234-5678",
      threshold_currency: item.currency_code || "KRW",
      sms_template: `[🚨 가격추적AI - 마진경보]\n품목: ${item.item_name} ({item_code})\n수집가: {captured_price} ${item.currency_code} (₩{converted_krw_price})\n경고: 설정하신 최저 한계 조건 [{threshold_value} {threshold_unit}]이 감지되어, 긴급 SMS 발송합니다. 판가 마진 검토 바랍니다.`
    }));
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.item_code || !itemForm.item_name || !itemForm.base_price) return alert("필수 정보를 채워주세요.");
    
    try {
      const method = isEditMode ? "PUT" : "POST";
      const bodyPayload = isEditMode 
        ? { ...itemForm, item_id: editingItemId } 
        : itemForm;

      const res = await apiFetch("/api/price-tracker/items", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      const json = await res.json();
      if (json.success) {
        if (isEditMode) {
          alert("🎉 품목의 관제 정보가 성공적으로 수정되었습니다!");
        } else {
          alert("🎉 신규 시황 추적 품목이 등록되었습니다!\n백그라운드에서 실시간 최저가 수집망(쿠팡/네이버 등)이 즉시 자율 연동 기동됩니다.");
          triggerBackgroundAutoMining(json.item_id, itemForm.item_name, itemForm.spec || "");
        }
        setItemForm({ 
          item_code: "", 
          item_name: "", 
          category: "RAW_MATERIAL", 
          spec: "", 
          base_price: "", 
          target_margin_rate: "12.5",
          currency_code: "USD" 
        });
        setIsItemModalOpen(false);
        setIsEditMode(false);
        setEditingItemId(null);
        fetchInitData();
      } else {
        alert("처리에 실패했습니다: " + json.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: number, itemName: string) => {
    if (!confirm(`🚨 정말로 [${itemName}] 품목을 관제 대상에서 제외하시겠습니까?\n이 작업은 되돌릴 수 없으며, 등록된 수집망 URL 및 이력도 모두 함께 영구 삭제됩니다.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/price-tracker/items?item_id=${itemId}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.success) {
        alert("🗑️ 품목 및 연관 수집망 정보가 영구 삭제되었습니다.");
        if (activeItem?.item_id === itemId) {
          setActiveItem(null);
        }
        fetchInitData();
      } else {
        alert("삭제에 실패했습니다: " + json.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyUrl = (e: React.MouseEvent, urlId: number, targetUrl: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(targetUrl);
    setCopiedUrlId(urlId);
    setTimeout(() => setCopiedUrlId(null), 1500);
  };

  const handleEditItemClick = (item: any) => {
    setIsEditMode(true);
    setEditingItemId(item.item_id);
    setItemForm({
      item_code: item.item_code || "",
      item_name: item.item_name || "",
      category: item.category || "RAW_MATERIAL",
      spec: item.spec || "",
      base_price: String(item.base_price || ""),
      target_margin_rate: String(item.target_margin_rate || "10"),
      currency_code: item.currency_code || "KRW"
    });
    setIsItemModalOpen(true);
  };

  const handleAnalyzeSelector = async () => {
    if (!urlForm.target_url) {
      return alert("수집 대상 웹주소 (Target URL)를 먼저 입력해 주세요.");
    }
    
    setSelectorAnalyzing(true);
    try {
      const res = await apiFetch("/api/price-tracker/ai-selector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlForm.target_url })
      });
      const json = await res.json();
      if (json.success && json.css_selector) {
        setUrlForm(prev => ({ 
          ...prev, 
          css_selector: json.css_selector,
          site_name: prev.site_name || json.site_name || prev.site_name
        }));
        alert(`🪄 AI 셀렉터 자율 탐색 완료!\n[${json.message}]\n\nCSS Selector 칸에 [${json.css_selector}]가 자동으로 기입되었습니다.`);
      } else {
        alert("AI 셀렉터 분석 실패: " + json.error);
      }
    } catch (err: any) {
      console.error(err);
      alert("AI 분석 중 통신 에러가 발생했습니다: " + err.message);
    } finally {
      setSelectorAnalyzing(false);
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return alert("매핑할 품목을 선택해 주세요.");

    const cron = urlForm.cron_interval || "0 9 * * *";
    const parts = cron.trim().split(/\s+/);
    if (parts.length === 5) {
      const minVal = parts[0];
      if (minVal === "*") {
        if (!confirm("⚠️ [차단 위험 경보]\n현재 수집 주기가 '매 1분(*)'으로 극도로 빠르게 설정되어 있습니다.\n이 설정 그대로 가동 시 쇼핑몰 서버 보안 필터에 의해 점주님의 IP가 즉시 영구 정지(차단)되므로, 최소 1시간 이상 설정을 권장합니다.\n그래도 진행하시겠습니까?")) {
          return;
        }
      } else if (minVal.startsWith("*/")) {
        const intervalNum = parseInt(minVal.replace("*/", ""), 10);
        if (!isNaN(intervalNum) && intervalNum < 30) {
          if (!confirm(`⚠️ [차단 위험 경보]\n현재 설정하신 '${intervalNum}분 간격' 수집 주기는 너무 잦아 대형 유통망 봇 감지기에 걸릴 위험이 매우 높습니다.\n실제로 감시 로봇을 배포 기동하시겠습니까? (최소 30분 이상 설정을 적극 권장합니다.)`)) {
            return;
          }
        }
      }
    }
    
    if (!urlForm.site_name) return alert("출처 포털명 (사이트명)을 입력해 주세요.");
    if (!urlForm.target_url) return alert("수집 대상 웹주소 (Target URL)를 입력해 주세요.");
    if (!urlForm.css_selector) {
      return alert("가격을 긁어올 CSS Selector 값을 입력해 주세요.\n(입력창 바로 위의 '🪄 AI 자동 분석' 버튼을 누르시면 자동으로 완성됩니다!)");
    }

    setCrawlerTesting(true);
    try {
      const res = await apiFetch("/api/price-tracker/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: activeItem.item_id, ...urlForm, run_test: true })
      });
      const json = await res.json();
      if (json.success) {
        const rawPrice = json.test_price;
        const rawPriceKrw = json.test_price_krw;
        
        const priceStr = (typeof rawPrice === 'number' && !isNaN(rawPrice)) 
          ? rawPrice.toLocaleString() 
          : (rawPrice ? String(rawPrice) : '');
          
        const priceKrwStr = (typeof rawPriceKrw === 'number' && !isNaN(rawPriceKrw)) 
          ? rawPriceKrw.toLocaleString() 
          : ((typeof rawPrice === 'number' && !isNaN(rawPrice)) ? rawPrice.toLocaleString() : '0');

        const detailMsg = priceStr 
          ? `[${priceStr} ${json.currency || "USD"} / ₩${priceKrwStr}]`
          : "단가 수집 대기";
        alert(`⚡ 크롤링 로봇 즉시 검수 완료!\n${detailMsg}가 감지되어 DB에 가동 매핑되었습니다.`);
        setUrlForm({ site_name: "", target_url: "", css_selector: "", cron_interval: "0 9 * * *" });
        fetchItemDetails(activeItem.item_id);
        fetchInitData();
      } else {
        alert("수집 매핑 실패: " + json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCrawlerTesting(false);
    }
  };

  const handleDeleteUrl = async (urlId: number) => {
    if (!confirm("해당 수집 엔진 노드를 전광판에서 제외하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/price-tracker/urls?url_id=${urlId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        alert("수집 로봇이 안전하게 제외되었습니다.");
        if (activeItem) fetchItemDetails(activeItem.item_id);
        fetchInitData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAlertRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return alert("알림을 설정할 타겟 품목을 지정해 주세요.");
    if (!alertForm.rule_name || !alertForm.threshold_value || !alertForm.sms_template) return alert("입력란을 완성해 주세요.");

    try {
      const res = await apiFetch("/api/price-tracker/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          item_id: activeItem.item_id, 
          ...alertForm,
          condition_type: alertForm.threshold_unit === "PERCENT" ? "MARGIN_BREAKDOWN" : alertForm.condition_operator
        })
      });
      const json = await res.json();
      if (json.success) {
        alert("💬 FreeSMS 가격 경보 자동화 규칙이 성공적으로 가동되었습니다!");
        setIsAlertModalOpen(false);
        fetchInitData();
      } else {
        alert("알림 설정 실패: " + json.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoDeploy = async () => {
    if (!activeItem) return alert("수집망을 연동할 품목을 먼저 선택해 주세요.");
    
    setMiningLoading(true);
    setMiningLoadStep(1);

    const step1 = setTimeout(() => setMiningLoadStep(2), 1500);
    const step2 = setTimeout(() => setMiningLoadStep(3), 3200);

    try {
      const activeChannelList = searchChannels.filter(c => c.active).map(c => c.name);
      console.log(`📡 [Auto-Deploy] 실시간 최저가 자율 포착 시작: [${activeItem.item_name}], 규격: [${activeItem.spec}]`);
      
      const mineRes = await apiFetch("/api/price-tracker/ai-search-miner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: activeItem.item_id,
          query: activeItem.item_name,
          specification: activeItem.spec || "",
          channels: activeChannelList
        })
      });
      const mineJson = await mineRes.json();
      
      clearTimeout(step1);
      clearTimeout(step2);

      if (mineJson.success && mineJson.candidates && mineJson.candidates.length > 0) {
        let deployedCount = 0;
        for (const cand of mineJson.candidates) {
          const res = await apiFetch("/api/price-tracker/urls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              item_id: activeItem.item_id,
              site_name: cand.site_name,
              target_url: cand.url,
              css_selector: cand.css_selector,
              cron_interval: "0 9 * * *",
              run_test: true,
              test_price: cand.price
            })
          });
          const json = await res.json();
          if (json.success) deployedCount++;
        }
        
        alert(`⚡ AI 실시간 최저가 즉시 포착 완수!\n총 ${deployedCount}개의 최저가 크롤링 로봇이 자동으로 수집 장착되었으며, 실시간 시황이 갱신되었습니다.`);
        fetchItemDetails(activeItem.item_id);
        fetchInitData();
      } else {
        alert("🚨 실시간 실물 최저가 상품 발굴 실패\n활성화하신 수집 채널에서 해당 규격에 부합하는 실물 상품의 상세 가격과 구매 링크를 실시간 포착하지 못했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("AI 최저가 포착 연동 중 통신 장애가 발생했습니다.");
    } finally {
      setMiningLoading(false);
    }
  };

  const handleAddChannel = () => {
    if (!newChannelName.trim()) return alert("추가할 검색 채널/도메인명을 기입해 주세요.");
    const newChan = {
      id: Date.now(),
      name: newChannelName.trim(),
      active: true,
      isCustom: true
    };
    setSearchChannels(prev => [...prev, newChan]);
    setNewChannelName("");
  };

  const handleToggleChannel = (id: number) => {
    setSearchChannels(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const handleRemoveChannel = (id: number) => {
    setSearchChannels(prev => prev.filter(c => c.id !== id));
  };

  // 차트 데이터 연산
  const getSvgPathData = () => {
    if (urls.length === 0 || !urls[0].history || urls[0].history.length === 0) {
      return { path: "", points: [], width: 600 };
    }
    const history = urls[0].history;
    const maxVal = Math.max(...history.map((h: any) => Number(h.captured_price))) * 1.03;
    const minVal = Math.min(...history.map((h: any) => Number(h.captured_price))) * 0.97;
    const valRange = maxVal - minVal || 1;

    const width = Math.max(600, history.length * 32 + 80);
    const height = 180;
    const paddingLeft = 55;
    const paddingRight = 35;
    const paddingTop = 20;
    const paddingBottom = 20;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const points = history.map((h: any, idx: number) => {
      const x = history.length > 1 
        ? paddingLeft + (idx / (history.length - 1)) * plotWidth
        : paddingLeft + plotWidth / 2;
      const y = paddingTop + plotHeight - ((h.captured_price - minVal) / valRange) * plotHeight;
      return { x, y, price: h.captured_price, date: h.captured_at.slice(5, 10) };
    });

    const path = points.map((p: any, idx: number) => `${idx === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
    return { path, points, width };
  };

  const getRateSvgPathData = () => {
    const rateHistory = exchangeRateHistories.filter(x => x.currency_code === activeRateTab);
    if (rateHistory.length === 0) return { path: "", points: [], fillPath: "", width: 600 };

    const maxVal = Math.max(...rateHistory.map((h: any) => Number(h.rate_value))) * 1.01;
    const minVal = Math.min(...rateHistory.map((h: any) => Number(h.rate_value))) * 0.99;
    const valRange = maxVal - minVal || 1;

    const width = Math.max(600, rateHistory.length * 32 + 80);
    const height = 150;
    const paddingLeft = 55;
    const paddingRight = 35;
    const paddingTop = 15;
    const paddingBottom = 20;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const points = rateHistory.map((h: any, idx: number) => {
      const x = rateHistory.length > 1 
        ? paddingLeft + (idx / (rateHistory.length - 1)) * plotWidth
        : paddingLeft + plotWidth / 2;
      const y = paddingTop + plotHeight - ((h.rate_value - minVal) / valRange) * plotHeight;
      return { x, y, val: h.rate_value, date: h.captured_date.slice(5, 10) };
    });

    const path = points.map((p: any, idx: number) => `${idx === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
    
    let fillPath = "";
    if (points.length > 0) {
      fillPath = `${path} L ${points[points.length - 1].x},${height - paddingBottom} L ${points[0].x},${height - paddingBottom} Z`;
    }

    return { path, points, fillPath, width };
  };

  // 검색/필터 필터링 아이템
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      categoryFilter === "ALL" || 
      item.category === categoryFilter;

    const isWarning = item.current_margin_rate < item.target_margin_rate;
    const matchesStatus = 
      statusFilter === "ALL" ||
      (statusFilter === "WARNING" && isWarning) ||
      (statusFilter === "SAFE" && !isWarning);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const marginWarningCount = items.filter(item => item.current_margin_rate < item.target_margin_rate).length;
  const isDaemonRunning = daemonInfo.status === "RUNNING";

  // 스크롤 동기화 이펙트
  useEffect(() => {
    const scrollElem = rateScrollRef.current;
    if (!scrollElem) return;

    scrollToRight(scrollElem);

    const observer = new ResizeObserver(() => {
      scrollToRight(scrollElem);
    });
    observer.observe(scrollElem);

    const timer = setTimeout(() => scrollToRight(scrollElem), 150);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [exchangeRateHistories, activeRateTab, scrollToRight]);

  useEffect(() => {
    const scrollElem = itemScrollRef.current;
    if (!scrollElem) return;

    scrollToRight(scrollElem);

    const observer = new ResizeObserver(() => {
      scrollToRight(scrollElem);
    });
    observer.observe(scrollElem);

    const timer = setTimeout(() => scrollToRight(scrollElem), 150);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [urls, activeItem, scrollToRight]);

  return {
    items, setItems,
    activeItem, setActiveItem,
    urls, setUrls,
    alerts, setAlerts,
    alertLogs, setAlertLogs,
    exchangeRates, setExchangeRates,
    exchangeRateHistories, setExchangeRateHistories,
    daemonInfo, setDaemonInfo,
    activeRateTab, setActiveRateTab,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    statusFilter, setStatusFilter,
    isItemModalOpen, setIsItemModalOpen,
    isCollectorModalOpen, setIsCollectorModalOpen,
    isEditMode, setIsEditMode,
    editingItemId, setEditingItemId,
    miningItemIds, setMiningItemIds,
    isAlertModalOpen, setIsAlertModalOpen,
    isCronHelpOpen, setIsCronHelpOpen,
    isDaemonHelpOpen, setIsDaemonHelpOpen,
    copiedUrlId, setCopiedUrlId,
    miningLoading, setMiningLoading,
    miningLoadStep, setMiningLoadStep,
    searchChannels, setSearchChannels,
    newChannelName, setNewChannelName,
    itemForm, setItemForm,
    urlForm, setUrlForm,
    aiForm, setAiForm,
    alertForm, setAlertForm,
    loading, setLoading,
    refreshing, setRefreshing,
    crawlerTesting, setCrawlerTesting,
    updatingRates, setUpdatingRates,
    startingDaemon, setStartingDaemon,
    copiedText, setCopiedText,
    selectorAnalyzing, setSelectorAnalyzing,
    backfillStartDate, setBackfillStartDate,
    backfillEndDate, setBackfillEndDate,
    isBackfilling, setIsBackfilling,
    rateHoverInfo, setRateHoverInfo,
    itemHoverInfo, setItemHoverInfo,
    rateScrollRef, itemScrollRef,
    explainCron,
    fetchItemDetails,
    fetchInitData,
    handleRefresh,
    handleSyncExchangeRates,
    handleStartDaemon,
    handleCopyCommand,
    handleBulkBackfill,
    handleItemSelect,
    handleSaveItem,
    handleDeleteItem,
    handleCopyUrl,
    handleEditItemClick,
    handleAnalyzeSelector,
    handleAddUrl,
    handleDeleteUrl,
    handleAddAlertRule,
    triggerBackgroundAutoMining,
    handleAutoDeploy,
    handleAddChannel,
    handleToggleChannel,
    handleRemoveChannel,
    getSvgPathData,
    getRateSvgPathData,
    filteredItems,
    marginWarningCount,
    isDaemonRunning
  };
}
