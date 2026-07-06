import { apiFetch } from '@/lib/api';
import { useState, useEffect, useCallback } from "react";
import { CashflowPoint, ProductMargin, ForecastTransaction } from "../types";

export function useCashflowSimulator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warn" } | null>(null);

  // 현금 흐름 및 마진 데이터 상태
  const [currentBalance, setCurrentBalance] = useState(0);
  const [cashflowForecast, setCashflowForecast] = useState<CashflowPoint[]>([]);
  const [productMargins, setProductMargins] = useState<ProductMargin[]>([]);
  const [forecastList, setForecastList] = useState<ForecastTransaction[]>([]);

  // 시뮬레이터 슬라이더 입력 값 상태
  const [exchangeRate, setExchangeRate] = useState(1300); // 원달러 환율
  const [materialRate, setMaterialRate] = useState(0); // 원자재 가격 변동률 (%)
  const [laborRate, setLaborRate] = useState(0); // 노무비 변동률 (%)

  const showToast = useCallback((message: string, type: "success" | "error" | "warn" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 1. 기초 데이터 로드 (GET)
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/finance/cashflow");
      const data = await res.json();
      if (data.success) {
        setCurrentBalance(data.currentBalance);
        setCashflowForecast(data.cashflowForecast);
        setProductMargins(data.productMargins);
        setForecastList(data.forecastList);
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      console.error("자금/원가 데이터 수신 실패:", e);
      showToast("데이터를 로드하는 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 2. 시뮬레이션 연산 트리거 (POST)
  const runSimulation = useCallback(async () => {
    setIsSimulating(true);
    try {
      const res = await apiFetch("/api/finance/cashflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exchangeRate,
          materialRate,
          laborRate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProductMargins(data.productMargins);
        setCashflowForecast(data.cashflowForecast);
        showToast("AI 자금 시뮬레이션이 성공적으로 수행되었습니다.", "success");
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      showToast(`시뮬레이션 연산 실패: ${e.message}`, "error");
    } finally {
      setIsSimulating(false);
    }
  }, [exchangeRate, materialRate, laborRate, showToast]);

  // 슬라이더 값이 변경된 경우 시뮬레이션을 동적으로 실행 (약간의 디바운스를 주거나 사용자가 수동 실행하도록 버튼 제공)
  // 여기서는 사용자가 직관적인 변동을 바로 느낄 수 있도록 값이 변경될 때마다 자동 연산하도록 수행하되, 
  // 입력 지연을 위한 useEffect 바인딩
  useEffect(() => {
    // 최초 로딩이 끝난 시점 이후부터 슬라이더 연동 기동
    if (!isLoading) {
      const delayDebounceFn = setTimeout(() => {
        runSimulation();
      }, 400);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [exchangeRate, materialRate, laborRate]);

  // 3. 미수 거래처 독촉 SMS 전송 (FreeSMS 연동)
  const handleSendRemindSms = async (item: ForecastTransaction) => {
    if (!item.isOverdue) return;
    
    // 모바일 URL 생성
    const mobileLink = `${window.location.origin}/m/estimate-request`; // 바이어용 결제/온보딩 모바일 링크 매핑
    const smsMessage = `[이지데스크] ${item.partnerName} 담당자님 안녕하십니까. 당사 거래분 미수금 ${item.amount.toLocaleString()}원의 수금 예정일이 경과되어 확인 차 연락드립니다. 아래 모바일 명세서 링크를 확인하시어 대금 정산 협조 부탁드립니다. ${mobileLink}`;

    try {
      const res = await apiFetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: item.contact,
          message: smsMessage,
          sender: "02-1588-0000" // 모의 본사 대표번호
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`📬 ${item.partnerName}에 미수금 독촉 문자를 비용 0원에 무료 전송(FreeSMS) 완료했습니다.`, "success");
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      showToast(`독촉 문자 발송 실패: ${e.message}`, "error");
    }
  };

  // 4. 시뮬레이터 설정 리셋
  const handleResetSimulation = () => {
    setExchangeRate(1300);
    setMaterialRate(0);
    setLaborRate(0);
    showToast("시뮬레이터 설정이 최초 기준치로 초기화되었습니다.", "warn");
  };

  return {
    isLoading,
    isSimulating,
    toast,
    currentBalance,
    cashflowForecast,
    productMargins,
    forecastList,
    exchangeRate,
    setExchangeRate,
    materialRate,
    setMaterialRate,
    laborRate,
    setLaborRate,
    handleSendRemindSms,
    handleResetSimulation,
    runSimulation,
  };
}
