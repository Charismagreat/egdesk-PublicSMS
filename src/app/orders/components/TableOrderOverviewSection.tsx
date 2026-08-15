"use client";

import React, { useState } from "react";
import { Order } from "../types";
import { 
  Utensils, 
  CheckCircle2, 
  ExternalLink, 
  Printer, 
  Clock, 
  CreditCard, 
  RefreshCw, 
  Sparkles, 
  Receipt, 
  X, 
  Maximize2,
  ChevronDown,
  History,
  Users,
  BellRing,
  QrCode,
  Phone,
  UserCheck,
  UserX,
  Plus,
  Copy,
  Check,
  ShoppingBag,
  ArrowLeftRight,
  Undo2,
  Ban,
  Play,
  Tv,
  Volume2,
  VolumeX,
  Scissors,
  Tag,
  Percent,
  Edit3
} from "lucide-react";
import { generateTableToken } from "@/lib/table-token-helper";

interface TableOrderOverviewSectionProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onBulkUpdateStatus: (status: string) => Promise<void>;
  onFetchData: () => Promise<void>;
}

export interface TableSession {
  sessionIndex: number;
  orders: Order[];
  isCurrent: boolean;
  status: '이용중' | '결제완료';
  startTime: string;
  endTime: string;
  totalAmount: number;
  itemSummary: string;
}

export function TableOrderOverviewSection({
  orders,
  onUpdateOrder,
  onFetchData
}: TableOrderOverviewSectionProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [selectedTableForModal, setSelectedTableForModal] = useState<string | null>(null);
  const [selectedSessionData, setSelectedSessionData] = useState<{ tableNum: string; session: TableSession } | null>(null);
  const [openTurnoverMenuTable, setOpenTurnoverMenuTable] = useState<string | null>(null);

  // 🚫 테이블 임의 사용 중지(단체석 보조/예약석/홀딩/정비) 상태
  const [disabledTables, setDisabledTables] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('egdesk_disabled_tables');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // 테이블 사용 중지 / 사용 재개 토글 함수
  const handleToggleDisableTable = (tableNum: string) => {
    const isCurrentlyDisabled = disabledTables.includes(tableNum);
    if (!isCurrentlyDisabled) {
      if (!confirm(`테이블 ${tableNum}번을 [사용 중지 (홀딩/단체 보조석/예약)] 처리하시겠습니까?\n사용 중지된 테이블은 대기 손님 배정에서 자동 제외됩니다.`)) {
        return;
      }
      const next = [...disabledTables, tableNum];
      setDisabledTables(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem('egdesk_disabled_tables', JSON.stringify(next));
      }
    } else {
      const next = disabledTables.filter(t => t !== tableNum);
      setDisabledTables(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem('egdesk_disabled_tables', JSON.stringify(next));
      }
    }
  };

  // ⏳ 실시간 대기자(웨이팅) 관리 상태
  const [waitingsList, setWaitingsList] = useState<any[]>([]);
  const [activeWaitingCount, setActiveWaitingCount] = useState<number>(0);
  const [waitingTab, setWaitingTab] = useState<'WAITING' | 'SEATED' | 'ALL'>('WAITING');
  const [isWaitingModalOpen, setIsWaitingModalOpen] = useState<boolean>(false);
  const [isWaitingQrModalOpen, setIsWaitingQrModalOpen] = useState<boolean>(false);
  const [waitingActionLoading, setWaitingActionLoading] = useState<string | null>(null);
  const [seatingTableSelection, setSeatingTableSelection] = useState<{ waitingId: string; waitingNo: number } | null>(null);
  const [changingTableSelection, setChangingTableSelection] = useState<{ waitingId: string; waitingNo: number; currentTable: string } | null>(null);
  const [copiedWaitingUrl, setCopiedWaitingUrl] = useState<boolean>(false);

  // 💳 원터치 부분 결제(개별 선택 결제 / 더치페이) 상태
  const [selectedPartialOrderIds, setSelectedPartialOrderIds] = useState<string[]>([]);

  // ✂️ 현장 할인 및 결제 금액 수정 모달 상태
  const [discountModalData, setDiscountModalData] = useState<{
    tableNum: string | number;
    orderIds: string[];
    orderTitles: string;
    originalAmount: number;
    customAmount: number;
    reason: string;
  } | null>(null);

  // 🗣️ 카운터 음성 TTS 호출 방송 상태 (기본 ON)
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(true);

  // 음성 호출 TTS 발성 함수
  const speakCounterCalling = (waitingNo: number, isRemind: boolean = false) => {
    if (!isTtsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = isRemind
        ? `대기 ${waitingNo}번 고객님, 입장이 지연되고 있습니다. 서둘러 카운터로 입장해 주시기 바랍니다.`
        : `대기 ${waitingNo}번 고객님, 카운터로 입장해 주시기 바랍니다.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('KR'));
      if (koVoice) utterance.voice = koVoice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis error:', e);
    }
  };

  // 원터치 부분 결제 실행 핸들러
  const handlePartialCompletePayment = async (tableNum: string, targetOrders: Order[]) => {
    const selectedOrders = targetOrders.filter(o => selectedPartialOrderIds.includes(o.id));
    if (selectedOrders.length === 0) {
      alert('결제할 주문 항목을 1개 이상 선택해 주세요.');
      return;
    }

    const selectedTotal = selectedOrders.reduce((sum, o) => {
      const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
      return sum + (isNaN(p) ? 0 : p);
    }, 0);

    if (!confirm(`선택하신 ${selectedOrders.length}개 주문 항목(총 ${selectedTotal.toLocaleString()}원)을 [결제 완료] 처리하시겠습니까?`)) {
      return;
    }

    setLoadingAction(`partial_pay_${tableNum}`);
    try {
      for (const ord of selectedOrders) {
        await onUpdateOrder(ord.id, { status: '결제완료' });
      }
      alert(`선택한 ${selectedOrders.length}건(${selectedTotal.toLocaleString()}원)의 결제가 완료되었습니다.`);
      setSelectedPartialOrderIds([]);
      await onFetchData();
    } catch (e) {
      alert('부분 결제 처리 중 오류가 발생했습니다.');
    } finally {
      setLoadingAction(null);
    }
  };

  // ✂️ 현장 결제 금액 수정 및 할인 처리 실행기
  const handleApplyDiscount = async (payImmediately: boolean = false) => {
    if (!discountModalData) return;
    const { orderIds, originalAmount, customAmount, reason } = discountModalData;
    
    if (isNaN(customAmount) || customAmount < 0) {
      alert('유효한 결제 금액을 입력해 주세요.');
      return;
    }

    const discountDiff = originalAmount - customAmount;
    const targetOrderList = orders.filter(o => orderIds.includes(o.id));
    if (targetOrderList.length === 0) return;

    setLoadingAction('apply_discount');
    try {
      if (targetOrderList.length === 1) {
        // 단건 주문 금액 수정
        const ord = targetOrderList[0];
        const prevMemo = ord.customer_memo || ord.customerMemo || '';
        const memoTag = discountDiff > 0 
          ? `[현장할인: -${discountDiff.toLocaleString()}원 (${reason || '금액조정'})]` 
          : discountDiff < 0 
          ? `[금액추가: +${Math.abs(discountDiff).toLocaleString()}원 (${reason || '금액조정'})]` 
          : `[금액확정: ${customAmount.toLocaleString()}원 (${reason || '금액조정'})]`;
        const newMemo = prevMemo ? `${prevMemo} ${memoTag}`.trim() : memoTag;

        await onUpdateOrder(ord.id, {
          total_price: String(customAmount),
          totalPrice: String(customAmount),
          customer_memo: newMemo,
          customerMemo: newMemo,
          status: payImmediately ? '결제완료' : (ord.status || '결제대기')
        });
      } else {
        // 다건 주문인 경우: 비율 분할하여 각 주문의 금액을 분할 조정
        let runningTotal = 0;
        for (let i = 0; i < targetOrderList.length; i++) {
          const ord = targetOrderList[i];
          const ordPrice = Number(String(ord.total_price || ord.totalPrice || '0').replace(/[^0-9]/g, ''));
          let allocatedPrice = originalAmount > 0 
            ? Math.round((ordPrice / originalAmount) * customAmount)
            : Math.round(customAmount / targetOrderList.length);
            
          if (i === targetOrderList.length - 1) {
            // 끝자리 단수 보정
            allocatedPrice = customAmount - runningTotal;
          } else {
            runningTotal += allocatedPrice;
          }

          const prevMemo = ord.customer_memo || ord.customerMemo || '';
          const memoTag = `[현장할인: ${reason || '금액조정'}]`;
          const newMemo = prevMemo ? `${prevMemo} ${memoTag}`.trim() : memoTag;

          await onUpdateOrder(ord.id, {
            total_price: String(allocatedPrice),
            totalPrice: String(allocatedPrice),
            customer_memo: newMemo,
            customerMemo: newMemo,
            status: payImmediately ? '결제완료' : (ord.status || '결제대기')
          });
        }
      }

      await onFetchData();
      setDiscountModalData(null);
      if (payImmediately) {
        setSelectedTableForModal(null);
        setSelectedSessionData(null);
        setSelectedPartialOrderIds([]);
      }
    } catch (e: any) {
      alert('금액 수정 처리 중 오류가 발생했습니다: ' + (e.message || ''));
    } finally {
      setLoadingAction(null);
    }
  };

  // 대기 접수 URL 클립보드 복사
  const handleCopyWaitingUrl = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/waiting` : 'http://localhost:4005/waiting';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedWaitingUrl(true);
      setTimeout(() => setCopiedWaitingUrl(false), 2000);
    } catch (e) {
      alert('주소 복사에 실패했습니다: ' + url);
    }
  };

  // 대기자 목록 페칭
  const fetchWaitings = async () => {
    try {
      const res = await fetch('/api/waitings');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success) {
        setWaitingsList(data.waitings || []);
        setActiveWaitingCount(data.activeCount || 0);
      }
    } catch (e) {
      console.error('Failed to load waitings:', e);
    }
  };

  React.useEffect(() => {
    fetchWaitings();
    const interval = setInterval(fetchWaitings, 8000);
    return () => clearInterval(interval);
  }, []);

  // 대기 손님 호출
  const handleCallWaiting = async (id: string, waitingNo: number, name: string) => {
    if (!confirm(`대기 ${waitingNo}번 (${name}) 고객님께 [입장 안내 문자]를 즉시 발송하시겠습니까?`)) {
      return;
    }
    setWaitingActionLoading(`call_${id}`);
    try {
      const res = await fetch('/api/waitings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'call' })
      });
      const data = await res.json();
      if (data.success) {
        speakCounterCalling(waitingNo, false);
        alert(`대기 ${waitingNo}번 고객님께 입장 안내 문자가 발송되었습니다.`);
        fetchWaitings();
      }
    } catch (e) {
      alert('호출 처리 중 오류가 발생했습니다.');
    } finally {
      setWaitingActionLoading(null);
    }
  };

  // 🔔 2차 리마인드 재호출 발송 (노쇼 방지)
  const handleRemindWaiting = async (id: string, waitingNo: number, name: string) => {
    if (!confirm(`대기 ${waitingNo}번 (${name}) 고객님께 [2차 입장 재안내(마지막 호출) 문자]를 발송하시겠습니까?`)) {
      return;
    }
    setWaitingActionLoading(`remind_${id}`);
    try {
      const res = await fetch('/api/waitings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'remind' })
      });
      const data = await res.json();
      if (data.success) {
        speakCounterCalling(waitingNo, true);
        alert(`대기 ${waitingNo}번 고객님께 2차 리마인드 문자가 발송되었습니다.`);
        fetchWaitings();
      }
    } catch (e) {
      alert('리마인드 문자 발송 중 오류가 발생했습니다.');
    } finally {
      setWaitingActionLoading(null);
    }
  };

  // 대기 손님 착석 (테이블 배정 및 합석 지원)
  const handleSeatWaiting = async (id: string, waitingNo: number, targetTable: string) => {
    const isWaitingOccupied = waitingsList.some(w => w.status === 'SEATED' && String(w.assigned_table) === String(targetTable));
    const isOrderOccupied = getOrdersForTable(targetTable).some(o => o.status !== '주문취소' && o.status !== '결제완료');
    const isOccupied = isWaitingOccupied || isOrderOccupied;

    if (isOccupied) {
      if (!confirm(`⚠️ 테이블 ${targetTable}번은 현재 이용 중인 테이블입니다.\n해당 테이블의 일행으로 [합석(주문 합치기)] 배정하시겠습니까?`)) {
        return;
      }
    }

    setWaitingActionLoading(`seat_${id}`);
    try {
      const res = await fetch('/api/waitings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'seat', assignedTable: targetTable })
      });
      const data = await res.json();
      if (data.success) {
        setSeatingTableSelection(null);
        await Promise.all([fetchWaitings(), onFetchData()]);
      }
    } catch (e) {
      alert('착석 처리 중 오류가 발생했습니다.');
    } finally {
      setWaitingActionLoading(null);
    }
  };

  // 🔀 자리 이동 (테이블 변경 및 합석/주문 병합 지원)
  const handleChangeTableWaiting = async (id: string, waitingNo: number, newTable: string) => {
    const isWaitingOccupied = waitingsList.some(w => w.status === 'SEATED' && String(w.assigned_table) === String(newTable) && w.id !== id);
    const isOrderOccupied = getOrdersForTable(newTable).some(o => o.status !== '주문취소' && o.status !== '결제완료');
    const isOccupied = isWaitingOccupied || isOrderOccupied;

    if (isOccupied) {
      if (!confirm(`⚠️ 테이블 ${newTable}번은 이미 다른 손님이 이용 중입니다.\n대기 ${waitingNo}번 손님의 주문을 테이블 ${newTable}번으로 [합석(주문 병합)] 이동하시겠습니까?`)) {
        return;
      }
    }

    setWaitingActionLoading(`change_table_${id}`);
    try {
      const res = await fetch('/api/waitings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'change_table', assignedTable: newTable })
      });
      const data = await res.json();
      if (data.success) {
        setChangingTableSelection(null);
        await Promise.all([fetchWaitings(), onFetchData()]);
      }
    } catch (e) {
      alert('테이블 변경 중 오류가 발생했습니다.');
    } finally {
      setWaitingActionLoading(null);
    }
  };

  // ↩️ 착석 취소 / 퇴장 처리
  const handleRevertSeatWaiting = async (id: string, waitingNo: number, name: string) => {
    const choice = window.prompt(
      `대기 ${waitingNo}번 (${name}) 착석 취소 / 퇴장 처리\n\n1: 실수로 착석 누름 (다시 '대기중'으로 복원)\n2: 손님이 주문 전 매장을 퇴장함 ('퇴장/취소' 처리)\n\n번호(1 또는 2)를 입력해 주세요:`
    );
    if (choice !== '1' && choice !== '2') return;

    const revertType = choice === '1' ? 'wait' : 'exit';
    setWaitingActionLoading(`revert_${id}`);
    try {
      const res = await fetch('/api/waitings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'revert_seat', revertType })
      });
      const data = await res.json();
      if (data.success) {
        alert(revertType === 'wait' ? `대기 ${waitingNo}번이 다시 '대기중' 상태로 복원되었습니다.` : `대기 ${waitingNo}번이 퇴장/취소 처리되었습니다.`);
        fetchWaitings();
        onFetchData();
      }
    } catch (e) {
      alert('착석 취소 처리 중 오류가 발생했습니다.');
    } finally {
      setWaitingActionLoading(null);
    }
  };

  // 대기 취소
  const handleCancelWaiting = async (id: string, waitingNo: number) => {
    if (!confirm(`대기 ${waitingNo}번 고객의 대기를 취소하시겠습니까?`)) return;
    setWaitingActionLoading(`cancel_${id}`);
    try {
      await fetch('/api/waitings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'cancel' })
      });
      fetchWaitings();
    } catch (e) {
      alert('취소 처리 중 오류가 발생했습니다.');
    } finally {
      setWaitingActionLoading(null);
    }
  };

  // 테이블 번호 목록 (기본 1~12번 + DB에 새로 발견되는 테이블 번호 포함)
  const defaultTableIds = Array.from({ length: 12 }, (_, i) => String(i + 1));
  
  // orders 내 customer_name에서 테이블 번호 추출
  const dbTableIds: string[] = [];
  orders.forEach(o => {
    const name = o.customer_name || o.customerName || "";
    const match = name.match(/테이블\s*(\d+)번?/);
    if (match && match[1] && !defaultTableIds.includes(match[1]) && !dbTableIds.includes(match[1])) {
      dbTableIds.push(match[1]);
    }
  });

  const allTableIds = [...defaultTableIds, ...dbTableIds].sort((a, b) => Number(a) - Number(b));

  // 테이블별 주문 그룹핑 함수 (정규식 정밀 매칭: 테이블 10번, 11번이 1번에 잘못 엮이는 문제 방지)
  const getOrdersForTable = (tableNum: string) => {
    return orders.filter(o => {
      const name = o.customer_name || o.customerName || "";
      const match = name.match(/테이블\s*(\d+)번?/);
      if (match && match[1]) {
        return match[1] === tableNum;
      }
      return name === `테이블 ${tableNum}` || name === `테이블${tableNum}` || name === `테이블 ${tableNum}번`;
    });
  };

  // 세션 객체 생성 헬퍼
  const createSessionObj = (
    index: number, 
    bucket: Order[], 
    isCurrent: boolean, 
    status: '이용중' | '결제완료'
  ): TableSession => {
    const total = bucket.reduce((sum, o) => {
      const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
      return sum + (isNaN(p) ? 0 : p);
    }, 0);
    const first = bucket[0];
    const last = bucket[bucket.length - 1];
    const fName = first.product_name || first.productName || '주문';
    const summary = bucket.length > 1 ? `${fName} 외 ${bucket.length - 1}건` : fName;

    return {
      sessionIndex: index,
      orders: [...bucket],
      isCurrent,
      status,
      startTime: formatDateTime(first.order_date, first.created_at, first.id),
      endTime: formatDateTime(last.order_date, last.created_at, last.id),
      totalAmount: total,
      itemSummary: summary
    };
  };

  // ⚡ 테이블 주문들을 '손님 이용 단위(결제 세션)' 기준으로 1회차, 2회차(회전수)로 지능형 그룹화
  const getTableSessions = (tableNum: string): TableSession[] => {
    const tableOrders = getOrdersForTable(tableNum);
    const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 💡 당일(오늘) 발생한 주문만 엄격히 필터링하여 일일 회전수 산출
    const valid = tableOrders
      .filter(o => {
        if (o.status === '주문취소') return false;
        const d = (o.order_date || o.created_at || '').substring(0, 10);
        return !d || d === todayStr;
      })
      .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

    if (valid.length === 0) return [];

    const unpaidOrders = valid.filter(o => o.status !== '결제완료');
    const paidOrders = valid.filter(o => o.status === '결제완료');

    const sessions: TableSession[] = [];

    // 1. 과거 결제완료된 주문들을 세션별(30분 내 추가 주문 및 일괄 결제)로 묶음
    if (paidOrders.length > 0) {
      let bucket: Order[] = [];

      paidOrders.forEach((ord) => {
        if (bucket.length === 0) {
          bucket.push(ord);
        } else {
          const lastOrd = bucket[bucket.length - 1];
          const lastTime = Number(lastOrd.id) || 0;
          const currTime = Number(ord.id) || 0;
          // 주문 생성 시간 차이가 30분(1800000ms) 이내이거나 일괄 처리된 경우 동일 세션으로 병합
          const isSameSession = Math.abs(currTime - lastTime) < 1800000;

          if (isSameSession) {
            bucket.push(ord);
          } else {
            sessions.push(createSessionObj(sessions.length + 1, bucket, false, '결제완료'));
            bucket = [ord];
          }
        }
      });

      if (bucket.length > 0) {
        sessions.push(createSessionObj(sessions.length + 1, bucket, false, '결제완료'));
      }
    }

    // 2. 현재 이용 중인 미결제 주문 세션 추가
    if (unpaidOrders.length > 0) {
      sessions.push(createSessionObj(sessions.length + 1, unpaidOrders, true, '이용중'));
    }

    return sessions;
  };

  // 해당 테이블 결제완료 처리
  const handleBulkCompletePayment = async (tableNum: string, tableOrders: Order[]) => {
    const unpaidOrders = tableOrders.filter(o => o.status !== '결제완료' && o.status !== '주문취소');
    if (unpaidOrders.length === 0) {
      alert(`테이블 ${tableNum}번에 미결제 주문이 없습니다.`);
      return;
    }

    if (!confirm(`테이블 ${tableNum}번의 ${unpaidOrders.length}건 주문을 모두 [결제완료]로 처리하시겠습니까?`)) {
      return;
    }

    setLoadingAction(`pay_${tableNum}`);
    try {
      for (const ord of unpaidOrders) {
        await onUpdateOrder(ord.id, { status: '결제완료' });
      }
      await onFetchData();
      alert(`테이블 ${tableNum}번의 주문이 [결제완료] 처리되었습니다.`);

      // 💡 만약 현재 대기 중인 손님이 있다면 빈 테이블로 즉시 호출 여부 확인
      const currentWaiting = waitingsList.filter(w => w.status === 'WAITING');
      if (currentWaiting.length > 0) {
        const nextGuest = currentWaiting[0];
        if (confirm(`테이블 ${tableNum}번이 비었습니다!\n대기 1번 [${nextGuest.customer_name} (${nextGuest.party_size}명)] 손님을 즉시 입장 호출하시겠습니까?`)) {
          await handleCallWaiting(nextGuest.id, nextGuest.waiting_no, nextGuest.customer_name);
        }
      }
    } catch (e) {
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 일시 정보(날짜+시간) 지능형 포맷팅 헬퍼
  const formatDateTime = (dateStr?: string, createdAt?: string, id?: string | number) => {
    // 1. 이미 시·분 정보가 포함되어 있는 경우
    if (dateStr && dateStr.length >= 16) {
      return dateStr.substring(0, 16);
    }
    if (createdAt && createdAt.length >= 16) {
      return createdAt.substring(0, 16);
    }

    // 2. 만약 ID가 밀리초 타임스탬프(13자리 숫자)인 경우 정확한 시·분 역산 복원
    if (id) {
      const idNum = Number(id);
      if (!isNaN(idNum) && idNum > 1600000000000 && idNum < 2500000000000) {
        const d = new Date(idNum);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day} ${hh}:${mm}`;
      }
    }

    // 3. 만약 10자리 날짜만 있는 과거 주문 레코드인 경우
    if (dateStr && dateStr.length === 10) {
      return `${dateStr} 14:18`;
    }

    return dateStr || createdAt || '방금';
  };

  // 영수증/주문서 인쇄 팝업 (동적 영수증 설정 연동)
  const handlePrintTableReceipt = async (tableNum: string, tableOrders: Order[]) => {
    const validOrders = tableOrders.filter(o => o.status !== '주문취소');
    if (validOrders.length === 0) {
      alert('출력할 주문 내역이 없습니다.');
      return;
    }

    // 영수증 커스텀 설정 및 회사업체 프로필 동적 패칭
    let receiptSettings = {
      paperWidth: "80mm",
      customMessage: "방문해 주셔서 진심으로 감사합니다.\n늘 최선을 다하겠습니다.",
      noticeText: "★ 네이버 영수증 리뷰 작성 시 음료수 1캔 무료 증정! ★\nWi-Fi: EGDESK_GUEST / Pass: egdesk1234\n주차 등록은 카운터 문의 (2시간 무료)",
      showCompanyProfile: true,
      qrType: "REVIEW",
      qrUrl: "https://m.place.naver.com",
      qrLabel: "🎁 영수증 리뷰 작성하고 음료수 받자!"
    };

    let companyProfile = {
      companyName: "주식회사 이지데스크",
      representative: "홍길동",
      businessNumber: "123-45-67890",
      phone: "02-123-4567"
    };

    try {
      const [settingRes, profileRes] = await Promise.all([
        apiFetch('/api/settings?key=receipt_settings').catch(() => null),
        apiFetch('/api/settings?key=my_company_profile').catch(() => null)
      ]);

      if (settingRes) {
        const sJson = await settingRes.json();
        if (sJson.success && sJson.value) {
          receiptSettings = { ...receiptSettings, ...JSON.parse(sJson.value) };
        }
      }

      if (profileRes) {
        const pJson = await profileRes.json();
        if (pJson.success && pJson.value) {
          companyProfile = { ...companyProfile, ...JSON.parse(pJson.value) };
        }
      }
    } catch (e) {
      console.warn("영수증 설정 패칭 실패 (기본값 적용):", e);
    }

    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');

    const grandTotal = validOrders.reduce((sum, o) => {
      const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
      return sum + (isNaN(p) ? 0 : p);
    }, 0);

    const nowStr = new Date().toLocaleString('ko-KR');

    // 용지 폭에 따른 CSS 규격 (80mm: 300px, 58mm: 220px)
    const is58mm = receiptSettings.paperWidth === "58mm";
    const paperWidthPx = is58mm ? "220px" : "300px";

    // 텍스트 줄바꿈(\n, \\n, \r\n)을 완벽하게 HTML <br/>로 치환하는 만능 포맷터
    const formatLineBreaks = (text: any) => {
      if (!text) return "";
      return String(text)
        .replace(/\\r\\n/g, "<br/>")
        .replace(/\\n/g, "<br/>")
        .replace(/\r\n/g, "<br/>")
        .replace(/\n/g, "<br/>");
    };

    const formattedCustomMsg = formatLineBreaks(receiptSettings.customMessage);
    const formattedNoticeText = formatLineBreaks(receiptSettings.noticeText);

    // QR 이미지 URL 생성
    const qrImgUrl = receiptSettings.showQr && receiptSettings.qrUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(receiptSettings.qrUrl)}`
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>영수증 (테이블 ${tableNum}번)</title>
        <style>
          body { 
            font-family: 'Malgun Gothic', sans-serif; 
            padding: 10px; 
            color: #0f172a; 
            background: #fff;
            margin: 0;
            display: flex;
            justify-content: center;
          }
          .receipt-box { 
            width: ${paperWidthPx}; 
            box-sizing: border-box; 
            font-size: ${is58mm ? '11px' : '12px'};
          }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
          .header h2 { margin: 0 0 5px 0; font-size: ${is58mm ? '16px' : '18px'}; font-weight: 900; }
          .header p { margin: 0; font-size: 10px; color: #64748b; }
          .item { border-bottom: 1px dashed #cbd5e1; padding: 8px 0; }
          .item-title { font-weight: bold; font-size: ${is58mm ? '12px' : '13px'}; margin-bottom: 3px; }
          .item-memo { font-size: 10px; color: #475569; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; margin-top: 4px; line-height: 1.4; white-space: pre-line; word-break: break-word; }
          .item-flex { display: flex; justify-content: space-between; margin-top: 4px; font-weight: bold; }
          .total { border-top: 2px solid #000; margin-top: 12px; padding-top: 10px; display: flex; justify-content: space-between; font-size: ${is58mm ? '14px' : '15px'}; font-weight: 900; }
          
          .footer-section { text-align: center; margin-top: 15px; border-top: 1px dashed #94a3b8; padding-top: 12px; }
          .custom-msg { font-weight: bold; margin-bottom: 8px; font-size: ${is58mm ? '11px' : '12px'}; line-height: 1.6; white-space: pre-line; word-break: break-word; }
          .notice-box { text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; font-size: 10px; line-height: 1.6; color: #334155; margin-bottom: 10px; white-space: pre-line; word-break: break-word; }
          .company-info { font-size: 9px; color: #64748b; margin-top: 8px; line-height: 1.4; border-top: 1px dotted #cbd5e1; padding-top: 6px; }
          .qr-section { margin-top: 12px; padding-top: 8px; border-top: 1px dashed #cbd5e1; text-align: center; }
          .qr-img { width: 90px; height: 90px; margin: 0 auto; display: block; }
          .qr-label { font-size: 10px; font-weight: bold; color: #d97706; margin-top: 4px; }
          
          @media print {
            body { padding: 0; }
            .receipt-box { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <h2>영수증 (테이블 ${tableNum}번)</h2>
            <p>출력일시: ${nowStr}</p>
          </div>
          
          ${validOrders.map((o, idx) => {
            const pName = o.product_name || o.productName || '상품명 없음';
            const pPrice = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, '')).toLocaleString();
            const memo = o.customer_memo || o.customerMemo || '';
            const formattedMemo = memo ? memo.replace(/\r\n/g, "<br/>").replace(/\n/g, "<br/>") : '';
            return `
              <div class="item">
                <div class="item-title">${validOrders.length - idx}차 주문 - ${pName}</div>
                ${formattedMemo ? `<div class="item-memo">메모: ${formattedMemo}</div>` : ''}
                <div class="item-flex">
                  <span>상태: ${o.status || '접수'}</span>
                  <span>${pPrice}원</span>
                </div>
              </div>
            `;
          }).join('')}

          <div class="total">
            <span>누적 총 결제액</span>
            <span>${grandTotal.toLocaleString()}원</span>
          </div>

          <!-- 영수증 하단 커스텀 영역 동적 인쇄 -->
          <div class="footer-section">
            ${formattedCustomMsg ? `<div class="custom-msg">${formattedCustomMsg}</div>` : ''}
            
            ${formattedNoticeText ? `<div class="notice-box">${formattedNoticeText}</div>` : ''}

            ${receiptSettings.showCompanyProfile ? `
              <div class="company-info">
                <div>${companyProfile.companyName} | 대표: ${companyProfile.representative}</div>
                <div>사업자번호: ${companyProfile.businessNumber} | TEL: ${companyProfile.phone}</div>
              </div>
            ` : ''}

            ${qrImgUrl ? `
              <div class="qr-section">
                <img src="${qrImgUrl}" class="qr-img" alt="Receipt QR" />
                ${receiptSettings.qrLabel ? `<div class="qr-label">${receiptSettings.qrLabel}</div>` : ''}
              </div>
            ` : ''}
          </div>

        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const selectedOrders = selectedTableForModal ? getOrdersForTable(selectedTableForModal) : [];
  // ⚡ 현재 이용 중인 미결제 활성 주문만 정밀 필터링 (이전 손님의 결제완료 주문 배제)
  const selectedActiveOrders = selectedOrders.filter(o => o.status !== '주문취소' && o.status !== '결제완료');
  const selectedGrandTotal = selectedActiveOrders.reduce((sum, o) => {
    const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
    return sum + (isNaN(p) ? 0 : p);
  }, 0);

  // 📊 전사 테이블 실시간 종합 통계 계산
  const totalTableCount = allTableIds.length;
  const occupiedTableCount = allTableIds.filter(id => {
    const tOrders = getOrdersForTable(id);
    const hasOrd = tOrders.some(o => o.status !== '주문취소' && o.status !== '결제완료');
    const hasWait = waitingsList.some(w => w.status === 'SEATED' && String(w.assigned_table) === String(id));
    return hasOrd || hasWait;
  }).length;
  const occupancyRate = totalTableCount > 0 ? Math.round((occupiedTableCount / totalTableCount) * 100) : 0;

  // 오늘 전체 테이블 누적 회전수
  const totalTurnoverCount = allTableIds.reduce((sum, id) => sum + getTableSessions(id).length, 0);

  // 미결제(식사 중) 주문 및 총액
  const allUnpaidOrders = orders.filter(o => {
    const name = o.customer_name || o.customerName || "";
    return name.includes('테이블') && o.status !== '주문취소' && o.status !== '결제완료';
  });
  const totalUnpaidAmount = allUnpaidOrders.reduce((sum, o) => {
    const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
    return sum + (isNaN(p) ? 0 : p);
  }, 0);

  const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 오늘 테이블 결제 완료 매출 총액 (당일 발생/완료된 주문만 엄격히 집계)
  const allPaidOrders = orders.filter(o => {
    const name = o.customer_name || o.customerName || "";
    const orderDateStr = (o.order_date || o.created_at || "").substring(0, 10);
    return name.includes('테이블') && o.status === '결제완료' && orderDateStr === todayStr;
  });
  const totalPaidAmount = allPaidOrders.reduce((sum, o) => {
    const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
    return sum + (isNaN(p) ? 0 : p);
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* 탭 안내 헤더 바 + 실시간 종합 요약 위젯 */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                실시간 테이블 주문 통합 모니터링
                <Sparkles className="w-5 h-5 text-amber-200" />
              </h2>
            </div>
          </div>

          <button
            onClick={onFetchData}
            className="xl:hidden bg-white/15 hover:bg-white/25 text-white font-bold px-3 py-2 rounded-xl backdrop-blur-md transition-all text-xs flex items-center gap-1 border border-white/20 cursor-pointer shrink-0"
            title="새로고침"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 📊 우측 5대 핵심 요약 카드 위젯 */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 xl:pb-0 scrollbar-none shrink-0">
          {/* 0. ⏳ 실시간 대기 현황 (클릭 시 관리 모달 오픈) */}
          <button
            type="button"
            onClick={() => setIsWaitingModalOpen(true)}
            className="bg-white/15 hover:bg-white/20 border border-white/25 backdrop-blur-md rounded-2xl py-2.5 px-4 flex flex-col justify-center transition-all shadow-xs shrink-0 whitespace-nowrap cursor-pointer text-left"
            title="실시간 대기자 관리 열기"
          >
            <span className="text-[11px] font-bold text-orange-100 flex items-center justify-between gap-2 whitespace-nowrap">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-200" />
                실시간 대기
              </span>
              <ChevronDown className="w-3 h-3 text-orange-200" />
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 whitespace-nowrap">
              <span className="text-base font-black text-white">{activeWaitingCount}</span>
              <span className="text-xs font-bold text-orange-200">팀 대기중</span>
            </div>
          </button>

          {/* 1. 이용중 테이블 */}
          <div className="bg-white/15 hover:bg-white/20 border border-white/25 backdrop-blur-md rounded-2xl py-2.5 px-4 flex flex-col justify-center transition-all shadow-xs shrink-0 whitespace-nowrap">
            <span className="text-[11px] font-bold text-orange-100 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              실시간 이용
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 whitespace-nowrap">
              <span className="text-base font-black text-white">{occupiedTableCount}</span>
              <span className="text-xs font-bold text-orange-200">/ {totalTableCount}석 ({occupancyRate}%)</span>
            </div>
          </div>

          {/* 2. 총 이용 (회전) */}
          <div className="bg-white/15 hover:bg-white/20 border border-white/25 backdrop-blur-md rounded-2xl py-2.5 px-4 flex flex-col justify-center transition-all shadow-xs shrink-0 whitespace-nowrap">
            <span className="text-[11px] font-bold text-orange-100 flex items-center gap-1.5 whitespace-nowrap">
              <History className="w-3.5 h-3.5 text-amber-200" />
              오늘 총 이용
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5 whitespace-nowrap">
              <span className="text-base font-black text-white">{totalTurnoverCount}팀</span>
              <span className="text-xs font-bold text-orange-200">({(totalTurnoverCount / Math.max(1, totalTableCount)).toFixed(1)}회전)</span>
            </div>
          </div>

          {/* 3. 결제 대기 (미결제 총액) */}
          <div className="bg-white/15 hover:bg-white/20 border border-white/25 backdrop-blur-md rounded-2xl py-2.5 px-4 flex flex-col justify-center transition-all shadow-xs shrink-0 whitespace-nowrap">
            <span className="text-[11px] font-bold text-orange-100 flex items-center gap-1.5 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-amber-200" />
              결제 대기 ({allUnpaidOrders.length}건)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 whitespace-nowrap">
              <span className="text-base font-black text-white">{totalUnpaidAmount.toLocaleString()}</span>
              <span className="text-xs font-bold text-orange-200">원</span>
            </div>
          </div>

          {/* 4. 오늘 테이블 완료 매출 */}
          <div className="bg-white/20 hover:bg-white/25 border border-white/30 backdrop-blur-md rounded-2xl py-2.5 px-4 flex flex-col justify-center transition-all shadow-xs shrink-0 whitespace-nowrap">
            <span className="text-[11px] font-bold text-amber-200 flex items-center gap-1.5 whitespace-nowrap">
              <CreditCard className="w-3.5 h-3.5 text-amber-200" />
              오늘 완료 매출
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 whitespace-nowrap">
              <span className="text-base font-black text-white">{totalPaidAmount.toLocaleString()}</span>
              <span className="text-xs font-bold text-orange-200">원</span>
            </div>
          </div>

          {/* 📺 대형 대기 전광판(DID) 열기 버튼 */}
          <a
            href="/waiting/board"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-3 rounded-2xl backdrop-blur-md transition-all text-xs flex items-center gap-1.5 border border-white/20 cursor-pointer shrink-0 shadow-xs whitespace-nowrap"
            title="매장 입구/벽걸이 TV용 실시간 대기 전광판(DID) 새 창 열기"
          >
            <Tv className="w-4 h-4 text-indigo-200" />
            <span>대기 전광판</span>
          </a>

          {/* 📱 대기 QR 열기 버튼 */}
          <button
            onClick={() => setIsWaitingQrModalOpen(true)}
            className="bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-3 rounded-2xl backdrop-blur-md transition-all text-xs flex items-center gap-1.5 border border-white/20 cursor-pointer shrink-0 shadow-xs whitespace-nowrap"
            title="입구 비치용 대기 등록 QR 열기"
          >
            <QrCode className="w-4 h-4 text-amber-200" />
            <span>대기 QR</span>
          </button>

          <button
            onClick={() => {
              onFetchData();
              fetchWaitings();
            }}
            className="hidden xl:flex bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-3 rounded-2xl backdrop-blur-md transition-all text-xs items-center gap-1.5 border border-white/20 cursor-pointer shrink-0 shadow-xs whitespace-nowrap"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 테이블 그리드 리스트 (4열 반응형) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {allTableIds.map(tableNum => {
          const tableOrders = getOrdersForTable(tableNum);
          // 현재 식사 중인 미결제 활성 주문 목록 (결제완료/주문취소 제외)
          const activeOrders = tableOrders.filter(o => o.status !== '주문취소' && o.status !== '결제완료');
          const hasOrders = activeOrders.length > 0;
          
          // 🪑 해당 테이블에 착석 배정된 대기 손님 정보 감지
          const seatedWaiting = waitingsList.find(w => w.status === 'SEATED' && String(w.assigned_table) === String(tableNum));
          const isOccupied = hasOrders || Boolean(seatedWaiting);
          const sessions = getTableSessions(tableNum);
          const isDisabledTable = disabledTables.includes(tableNum);

          // 누적 금액 계산
          const totalAmount = activeOrders.reduce((sum, o) => {
            const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
            return sum + (isNaN(p) ? 0 : p);
          }, 0);

          // 결제 완료 미완료 여부
          const hasUnpaid = activeOrders.some(o => o.status !== '결제완료');

          return (
            <div 
              key={tableNum}
              className={`rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-visible shadow-xs hover:shadow-lg relative ${
                isDisabledTable
                  ? 'bg-amber-50/40 border-amber-200 ring-1 ring-amber-400/30'
                  : isOccupied 
                  ? 'bg-white border-orange-200 ring-2 ring-orange-500/10 cursor-pointer hover:-translate-y-1' 
                  : 'bg-slate-50/70 border-slate-200 opacity-90'
              }`}
              onClick={() => {
                if (hasOrders) setSelectedTableForModal(tableNum);
              }}
            >
              {/* 카드 헤더 */}
              <div className={`p-4 border-b flex items-center justify-between rounded-t-3xl ${
                isDisabledTable
                  ? 'bg-amber-100/60 border-amber-200'
                  : isOccupied 
                  ? 'bg-orange-50/70 border-orange-100' 
                  : 'bg-slate-100/60 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-800 text-base">
                    테이블 {tableNum}번
                  </span>
                  {isDisabledTable ? (
                    <span className="bg-amber-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Ban className="w-2.5 h-2.5" />
                      사용 중지 (홀딩)
                    </span>
                  ) : hasOrders ? (
                    <span className="bg-orange-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      이용중 ({activeOrders.length}건)
                    </span>
                  ) : seatedWaiting ? (
                    <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse shadow-xs">
                      <UserCheck className="w-3 h-3" />
                      대기 {seatedWaiting.waiting_no}번 착석 ({seatedWaiting.party_size || 2}명)
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-500 font-bold text-[10px] px-2 py-0.5 rounded-full">
                      빈 테이블
                    </span>
                  )}

                  {/* ⚡ 회전수(회차) 뱃지 버튼 */}
                  {sessions.length > 0 && (
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTurnoverMenuTable(openTurnoverMenuTable === tableNum ? null : tableNum);
                        }}
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border transition-all cursor-pointer ${
                          openTurnoverMenuTable === tableNum
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                        }`}
                        title="오늘의 회차별 이용 히스토리 보기"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>{sessions.length}회전</span>
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>

                      {/* 회차 히스토리 드롭다운 팝오버 */}
                      {openTurnoverMenuTable === tableNum && (
                        <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-40 animate-fade-in space-y-1.5">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 px-1">
                            <span className="text-[11px] font-black text-slate-800">
                              테이블 {tableNum}번 회차 내역
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              총 {sessions.length}회 이용
                            </span>
                          </div>
                          
                          <div className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                            {sessions.map((sess) => (
                              <button
                                key={sess.sessionIndex}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSessionData({ tableNum, session: sess });
                                  setOpenTurnoverMenuTable(null);
                                }}
                                className={`w-full text-left p-2 rounded-xl border transition-all cursor-pointer block ${
                                  sess.isCurrent
                                    ? 'bg-orange-50/90 hover:bg-orange-100 border-orange-300'
                                    : 'bg-slate-50/90 hover:bg-slate-100 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                                    {sess.isCurrent ? '🟢' : '⚪'} {sess.sessionIndex}회차
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                      sess.isCurrent ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      {sess.status}
                                    </span>
                                  </span>
                                  <span className="text-[11px] font-black text-orange-650">
                                    {sess.totalAmount.toLocaleString()}원
                                  </span>
                                </div>
                                <div className="text-[9px] text-slate-500 flex justify-between items-center mt-0.5">
                                  <span className="truncate max-w-[130px] font-medium">{sess.itemSummary}</span>
                                  <span className="text-slate-400 shrink-0">{sess.startTime}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {hasOrders && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTableForModal(tableNum);
                      }}
                      className="text-orange-600 bg-orange-100 hover:bg-orange-200 p-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer flex items-center gap-1"
                      title="전체 주문 내역 팝업 열기"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">상세보기</span>
                    </button>
                  )}
                  <a
                    href={`/table-order/${tableNum}?token=${generateTableToken(String(tableNum))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-orange-600 p-1.5 rounded-lg hover:bg-white transition-colors"
                    title={`테이블 ${tableNum}번 오더 페이지 열기`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* 본문 주문 내역 바디 */}
              <div className="p-4 flex-1 space-y-3 min-h-[160px] flex flex-col justify-between">
                {isDisabledTable ? (
                  <div className="my-auto text-center py-6 space-y-2">
                    <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                      <Ban className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-amber-950 text-xs font-black">테이블 사용 중지됨</p>
                      <p className="text-amber-800 text-[10px] mt-0.5">단체석 보조 / 예약 / 정비 중 (대기 배정 제외)</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDisableTable(tableNum);
                      }}
                      className="mt-1 px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 text-amber-700" />
                      <span>사용 재개 (빈자리 복원)</span>
                    </button>
                  </div>
                ) : !hasOrders ? (
                  seatedWaiting ? (
                    <div className="my-auto py-3 space-y-2.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 text-center animate-fade-in" onClick={e => e.stopPropagation()}>
                      <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-emerald-950 text-xs font-black">
                          대기 {seatedWaiting.waiting_no}번 ({seatedWaiting.customer_name}) 착석
                        </p>
                        <p className="text-emerald-700 text-[10px] mt-0.5 font-bold">
                          인원: {seatedWaiting.party_size || 2}명 · 착석: {seatedWaiting.seated_at?.substring(11, 16) || '방금'}
                        </p>
                        <p className="text-slate-500 text-[10px] mt-1 font-medium">
                          💡 테이블에서 메뉴를 고르고 있습니다.
                        </p>
                      </div>
                      <div className="pt-1 flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChangingTableSelection({ waitingId: seatedWaiting.id, waitingNo: seatedWaiting.waiting_no, currentTable: String(tableNum) });
                            setIsWaitingModalOpen(true);
                          }}
                          className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] rounded-lg transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                          title="다른 테이블로 자리 이동 / 합석"
                        >
                          <ArrowLeftRight className="w-2.5 h-2.5 text-emerald-600" />
                          <span>자리이동</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevertSeatWaiting(seatedWaiting.id, seatedWaiting.waiting_no, seatedWaiting.customer_name);
                          }}
                          className="px-2 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-[10px] rounded-lg transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                          title="착석 취소 또는 퇴장 처리"
                        >
                          <Undo2 className="w-2.5 h-2.5 text-red-500" />
                          <span>착석취소</span>
                        </button>
                        <a
                          href={`/table-order/${tableNum}?token=${generateTableToken(String(tableNum))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all shadow-2xs inline-flex items-center gap-1"
                          title="해당 테이블 오더 페이지 열기"
                        >
                          <Utensils className="w-2.5 h-2.5" />
                          <span>주문하기</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="my-auto text-center py-6 space-y-2">
                      <div>
                        <p className="text-slate-400 text-xs font-bold">주문 내역 없음</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">손님 대기 중</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDisableTable(tableNum);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-500 hover:text-amber-700 border border-slate-200 hover:border-amber-300 font-bold text-[10px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        title="단체석 보조, 예약석, 정비 등을 위해 사용 중지"
                      >
                        <Ban className="w-2.5 h-2.5 text-slate-400" />
                        <span>테이블 사용 중지</span>
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
                    {activeOrders.map((ord, idx) => {
                      const pName = ord.product_name || ord.productName || '상품명 없음';
                      const pPrice = Number(String(ord.total_price || ord.totalPrice || '0').replace(/[^0-9]/g, ''));
                      const memo = ord.customer_memo || ord.customerMemo || '';
                      const isPaid = ord.status === '결제완료';

                      return (
                        <div 
                          key={ord.id || idx}
                          className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-orange-650 text-[10px] bg-orange-100 px-2 py-0.5 rounded-md">
                              {activeOrders.length - idx}차 주문
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {ord.status || '접수'}
                            </span>
                          </div>

                          <div className="font-bold text-slate-800">
                            <p className="text-xs text-slate-900 line-clamp-1">{pName}</p>
                            {memo && (
                              <p className="text-[10px] text-slate-500 font-normal bg-white p-1.5 rounded-lg border border-slate-100 mt-1">
                                {memo}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[11px] pt-0.5 border-t border-slate-200/40">
                            <span className="text-slate-400 font-medium">{formatDateTime(ord.order_date, ord.created_at, ord.id)}</span>
                            <span className="font-black text-slate-800">{pPrice.toLocaleString()}원</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 누적 합계 금액 */}
                {hasOrders && (
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">누적 결제 예정금액</span>
                    <span className="text-base font-black text-orange-650">
                      {totalAmount.toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>

              {/* 하단 관리 버튼 그룹 */}
              {hasOrders && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {hasUnpaid && (
                    <button
                      onClick={() => handleBulkCompletePayment(tableNum, activeOrders)}
                      disabled={loadingAction === `pay_${tableNum}`}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 border-0 cursor-pointer transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>결제 완료</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => handlePrintTableReceipt(tableNum, activeOrders)}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-200 cursor-pointer transition-colors"
                    title="테이블 1차/2차 영수증 인쇄"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>영수증</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 테이블 상세 전체 내용 팝업 모달 (현재 이용 내역 또는 선택한 회차별 히스토리) */}
      {(selectedTableForModal || selectedSessionData) && (() => {
        const activeTableNum = selectedSessionData ? selectedSessionData.tableNum : selectedTableForModal!;
        const sessionInfo = selectedSessionData ? selectedSessionData.session : null;
        const targetOrders = sessionInfo 
          ? sessionInfo.orders 
          : getOrdersForTable(activeTableNum).filter(o => o.status !== '주문취소' && o.status !== '결제완료');
        
        const targetGrandTotal = targetOrders.reduce((sum, o) => {
          const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
          return sum + (isNaN(p) ? 0 : p);
        }, 0);

        const hasUnpaidInModal = targetOrders.some(o => o.status !== '결제완료');

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
              
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>테이블 {activeTableNum}번 주문 상세 내역</span>
                      {sessionInfo && (
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                          sessionInfo.isCurrent ? 'bg-orange-600 text-white' : 'bg-slate-800 text-white'
                        }`}>
                          {sessionInfo.sessionIndex}회차 ({sessionInfo.status})
                        </span>
                      )}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTableForModal(null);
                    setSelectedSessionData(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* 💡 상단 원터치 부분 결제 및 1/N 더치페이 도우미 바 */}
              {targetOrders.some(o => o.status !== '결제완료') && (() => {
                const unpaidList = targetOrders.filter(o => o.status !== '결제완료');
                const unpaidTotal = unpaidList.reduce((sum, o) => {
                  const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
                  return sum + (isNaN(p) ? 0 : p);
                }, 0);

                const isAllSelected = unpaidList.length > 0 && unpaidList.every(o => selectedPartialOrderIds.includes(o.id));

                return (
                  <div className="bg-orange-50/80 border border-orange-200/80 rounded-2xl p-3.5 space-y-2.5 shrink-0 animate-fade-in">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isAllSelected) {
                              setSelectedPartialOrderIds([]);
                            } else {
                              setSelectedPartialOrderIds(unpaidList.map(o => o.id));
                            }
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-orange-100 text-orange-700 border border-orange-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${isAllSelected ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-300'}`}>
                            {isAllSelected && <Check className="w-3 h-3" />}
                          </span>
                          <span>{isAllSelected ? '선택 해제' : '미결제 전체 선택'}</span>
                        </button>
                        <span className="text-xs text-slate-600 font-medium">
                          선택: <span className="font-black text-orange-650">{selectedPartialOrderIds.length}</span> / {unpaidList.length}건
                        </span>
                      </div>

                      {/* 👥 1/N 더치페이 간편 계산기 */}
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white/90 px-2.5 py-1 rounded-xl border border-orange-200">
                        <Users className="w-3.5 h-3.5 text-orange-600" />
                        <span>더치페이(1/N):</span>
                        <span className="text-orange-700">2인 {Math.round(unpaidTotal / 2).toLocaleString()}원</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-orange-700">3인 {Math.round(unpaidTotal / 3).toLocaleString()}원</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-orange-700">4인 {Math.round(unpaidTotal / 4).toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 모달 본문 리스트 */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {targetOrders.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-sm font-bold">
                    접수된 주문 항목이 없습니다.
                  </div>
                ) : (
                  targetOrders.map((ord, idx) => {
                    const pName = ord.product_name || ord.productName || '상품명 없음';
                    const pPrice = Number(String(ord.total_price || ord.totalPrice || '0').replace(/[^0-9]/g, ''));
                    const qty = ord.quantity || '1';
                    const memo = ord.customer_memo || ord.customerMemo || '';
                    const isPaid = ord.status === '결제완료';
                    const isSelected = selectedPartialOrderIds.includes(ord.id);

                    return (
                      <div
                        key={ord.id || idx}
                        className={`border rounded-2xl p-4 sm:p-5 space-y-3 transition-all ${
                          isSelected
                            ? 'bg-orange-50/40 border-orange-300 ring-2 ring-orange-500/20 shadow-xs'
                            : isPaid
                            ? 'bg-slate-50 border-slate-200 opacity-70'
                            : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            {/* ☑️ 부분 결제 개별 체크박스 (미결제 상태일 때만 노출) */}
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPartialOrderIds(prev => 
                                    prev.includes(ord.id) ? prev.filter(id => id !== ord.id) : [...prev, ord.id]
                                  );
                                }}
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs scale-105'
                                    : 'bg-white text-transparent border-slate-300 hover:border-orange-400'
                                }`}
                                title="이 항목을 부분 결제에 포함"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <span className="font-black text-orange-600 bg-orange-100 px-3 py-1 rounded-xl text-xs">
                              {targetOrders.length - idx}차 주문
                            </span>
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDateTime(ord.order_date, ord.created_at, ord.id)}
                            </span>
                          </div>

                          {/* 개별 주문 상태 개별 조절 selector */}
                          <div className="flex items-center gap-2">
                            <select
                              value={ord.status || '결제대기'}
                              onChange={e => onUpdateOrder(ord.id, { status: e.target.value })}
                              className={`text-xs font-black px-3 py-1.5 rounded-xl border outline-none cursor-pointer ${
                                isPaid 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              <option value="접수완료">접수완료</option>
                              <option value="결제대기">결제대기</option>
                              <option value="결제완료">결제완료</option>
                              <option value="상품준비중">조리중/준비중</option>
                              <option value="주문취소">주문취소</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start">
                            <h4 className="text-base font-black text-slate-900 leading-snug">{pName}</h4>
                            <span className="text-sm font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {qty}개
                            </span>
                          </div>

                          {memo && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-line">
                              <span className="font-bold text-slate-400 block text-[10px] mb-0.5">손님 메모:</span>
                              {memo}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-black">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs font-bold">주문 금액</span>
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDiscountModalData({
                                    tableNum: activeTableNum,
                                    orderIds: [ord.id],
                                    orderTitles: `${pName} (${qty}개)`,
                                    originalAmount: pPrice,
                                    customAmount: pPrice,
                                    reason: ''
                                  });
                                }}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200 hover:border-orange-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="이 항목의 결제 금액 직접 수정 / 할인"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>금액수정</span>
                              </button>
                            )}
                          </div>
                          <span className="text-base text-orange-650">{pPrice.toLocaleString()}원</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 모달 푸터 액션 바 */}
              <div className="border-t border-slate-200 pt-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/80 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-4 sm:p-6 rounded-b-3xl">
                <div>
                  <span className="text-xs font-bold text-slate-500 block">
                    {sessionInfo ? `${sessionInfo.sessionIndex}회차 총 결제액` : '테이블 전체 누적 결제액'}
                  </span>
                  <span className="text-2xl font-black text-orange-650">
                    {targetGrandTotal.toLocaleString()}원
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end">
                  <button
                    onClick={() => handlePrintTableReceipt(activeTableNum, targetOrders)}
                    className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer shadow-xs transition-colors shrink-0"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>영수증 인쇄</span>
                  </button>

                  {/* ✂️ 현장 할인 / 금액 수정 버튼 (미결제 건이 있을 때 노출) */}
                  {hasUnpaidInModal && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetUnpaidOrders = selectedPartialOrderIds.length > 0
                          ? targetOrders.filter(o => selectedPartialOrderIds.includes(o.id) && o.status !== '결제완료')
                          : targetOrders.filter(o => o.status !== '결제완료');
                        
                        const totalAmount = targetUnpaidOrders.reduce((sum, o) => {
                          const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
                          return sum + (isNaN(p) ? 0 : p);
                        }, 0);

                        setDiscountModalData({
                          tableNum: activeTableNum,
                          orderIds: targetUnpaidOrders.map(o => o.id),
                          orderTitles: targetUnpaidOrders.length === 1 
                            ? `${targetUnpaidOrders[0].product_name || targetUnpaidOrders[0].productName}` 
                            : `${targetUnpaidOrders[0]?.product_name || '주문'} 외 ${targetUnpaidOrders.length - 1}건`,
                          originalAmount: totalAmount,
                          customAmount: totalAmount,
                          reason: ''
                        });
                      }}
                      className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0"
                      title="결제 금액 직접 수정 또는 현장 할인 적용"
                    >
                      <Scissors className="w-4 h-4 text-amber-700" />
                      <span>금액 수정 / 할인</span>
                    </button>
                  )}

                  {/* 💳 1. 원터치 부분 결제 버튼 (체크된 항목이 1개 이상 있을 때) */}
                  {selectedPartialOrderIds.length > 0 && (() => {
                    const selectedOrders = targetOrders.filter(o => selectedPartialOrderIds.includes(o.id));
                    const selectedAmount = selectedOrders.reduce((sum, o) => {
                      const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
                      return sum + (isNaN(p) ? 0 : p);
                    }, 0);

                    return (
                      <button
                        onClick={() => handlePartialCompletePayment(activeTableNum, targetOrders)}
                        disabled={loadingAction === `partial_pay_${activeTableNum}`}
                        className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 border-0 cursor-pointer shadow-lg shadow-orange-600/30 transition-all shrink-0 animate-fade-in"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>선택 {selectedOrders.length}건 결제 ({selectedAmount.toLocaleString()}원)</span>
                      </button>
                    );
                  })()}

                  {/* 💳 2. 전체 결제 완료 버튼 */}
                  {hasUnpaidInModal && selectedPartialOrderIds.length === 0 && (
                    <button
                      onClick={() => {
                        handleBulkCompletePayment(activeTableNum, targetOrders);
                        setSelectedTableForModal(null);
                        setSelectedSessionData(null);
                      }}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 border-0 cursor-pointer shadow-md transition-colors shrink-0"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>전체 결제 완료</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedTableForModal(null);
                      setSelectedSessionData(null);
                      setSelectedPartialOrderIds([]);
                    }}
                    className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-xs border-0 cursor-pointer transition-colors shrink-0"
                  >
                    닫기
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ✂️ 0. 현장 결제 금액 수정 및 할인 모달 팝업 */}
      {discountModalData && (() => {
        const { originalAmount, customAmount, reason, tableNum, orderTitles, orderIds } = discountModalData;
        const discountDiff = originalAmount - customAmount;
        const discountPercent = originalAmount > 0 ? ((discountDiff / originalAmount) * 100).toFixed(1) : '0';

        const applyPresetAmount = (reduceVal: number) => {
          const next = Math.max(0, originalAmount - reduceVal);
          setDiscountModalData(prev => prev ? { ...prev, customAmount: next } : null);
        };

        const applyPresetPercent = (pct: number) => {
          const discount = Math.round((originalAmount * pct) / 100);
          const next = Math.max(0, originalAmount - discount);
          setDiscountModalData(prev => prev ? { ...prev, customAmount: next } : null);
        };

        const applyTruncate = (unit: number) => {
          const next = Math.floor(originalAmount / unit) * unit;
          setDiscountModalData(prev => prev ? { ...prev, customAmount: next } : null);
        };

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
              
              {/* 헤더 */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shadow-xs">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      테이블 {tableNum}번 금액 수정 및 할인
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
                      대상: {orderTitles} ({orderIds.length}건)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDiscountModalData(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 원래 금액 vs 수정할 금액 표시 카드 */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 border-b border-slate-200/60 pb-2">
                  <span>원래 총 주문 금액</span>
                  <span className="text-base font-black text-slate-800 line-through">
                    {originalAmount.toLocaleString()}원
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-orange-900 flex items-center gap-1">
                    <Tag className="w-4 h-4 text-orange-600" />
                    최종 결제 적용 금액
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDiscountModalData(prev => prev ? { ...prev, customAmount: isNaN(val) ? 0 : val } : null);
                      }}
                      className="w-36 sm:w-44 text-right text-xl font-black text-orange-650 bg-white border-2 border-orange-400 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
                      min={0}
                      step={100}
                    />
                    <span className="text-base font-black text-slate-800">원</span>
                  </div>
                </div>

                {/* 할인/증액 차액 요약 */}
                <div className="flex justify-between items-center text-xs font-bold pt-1">
                  <span className="text-slate-400">조정 차액 (할인 혜택)</span>
                  <span className={`font-black ${discountDiff > 0 ? 'text-rose-600' : discountDiff < 0 ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {discountDiff > 0 
                      ? `-${discountDiff.toLocaleString()}원 (${discountPercent}% 할인)` 
                      : discountDiff < 0 
                      ? `+${Math.abs(discountDiff).toLocaleString()}원 추가` 
                      : '금액 변동 없음'}
                  </span>
                </div>
              </div>

              {/* ⚡ 빠른 원터치 할인 프리셋 버튼들 */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-400 block">원터치 빠른 할인 적용</span>
                
                {/* 정액 할인 칩 */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPresetAmount(1000)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
                  >
                    -1,000원
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetAmount(3000)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
                  >
                    -3,000원
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetAmount(5000)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
                  >
                    -5,000원
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetAmount(10000)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
                  >
                    -10,000원
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetAmount(20000)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
                  >
                    -20,000원
                  </button>
                </div>

                {/* 정률(%) 및 절사 칩 */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => applyPresetPercent(5)}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
                  >
                    5% 할인
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetPercent(10)}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
                  >
                    10% 할인
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetPercent(20)}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
                  >
                    20% 할인
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTruncate(1000)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    1천원 단위 버림
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountModalData(prev => prev ? { ...prev, customAmount: originalAmount } : null)}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    원래대로 리셋
                  </button>
                </div>
              </div>

              {/* 📝 할인 / 수정 사유 입력 */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-400 block">할인 / 수정 사유 (장부 메모 자동 기록)</span>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {['단골 우대', '지인/임직원', '서비스 감액', '불만/파손 보상', '끝자리 절사'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setDiscountModalData(prev => prev ? { ...prev, reason: tag } : null)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        reason === tag
                          ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setDiscountModalData(prev => prev ? { ...prev, reason: e.target.value } : null)}
                  placeholder="사유를 입력해 주세요 (예: 단골 손님 1만원 특별 할인)"
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                />
              </div>

              {/* 하단 액션 버튼 */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDiscountModalData(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs border-0 cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDiscount(false)}
                  disabled={loadingAction === 'apply_discount'}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all"
                >
                  금액만 수정 (결제대기)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDiscount(true)}
                  disabled={loadingAction === 'apply_discount'}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs border-0 cursor-pointer shadow-lg shadow-orange-600/30 transition-all flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>수정 후 바로 결제완료</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ⏳ 1. 실시간 대기자(웨이팅) 관리 모달 */}
      {isWaitingModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
            
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    실시간 대기자(웨이팅) 관리
                    <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-bold">
                      총 {waitingsList.filter(w => w.status === 'WAITING').length}팀 대기중
                    </span>
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* 🗣️ 음성 호출 방송 토글 스위치 */}
                <button
                  type="button"
                  onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isTtsEnabled 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                      : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="호출 시 카운터 스피커로 한국어 안내 방송 자동 출력"
                >
                  {isTtsEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{isTtsEnabled ? '음성 방송 ON' : '음성 OFF'}</span>
                </button>

                {/* 📺 대기 전광판 열기 */}
                <a
                  href="/waiting/board"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="대형 전광판(DID) 새 창 열기"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">전광판(DID)</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setIsWaitingModalOpen(false);
                    setSeatingTableSelection(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 📊 오늘의 웨이팅 통계 요약 바 */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center shrink-0">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">오늘 총 대기</span>
                <span className="text-sm font-black text-slate-800">{waitingsList.length}팀</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 block">착석 완료</span>
                <span className="text-sm font-black text-emerald-700">
                  {waitingsList.filter(w => w.status === 'SEATED').length}팀
                  <span className="text-[10px] font-normal text-emerald-500 ml-1">
                    ({waitingsList.length > 0 ? Math.round((waitingsList.filter(w => w.status === 'SEATED').length / waitingsList.length) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-500 block">취소/이탈</span>
                <span className="text-sm font-black text-rose-600">
                  {waitingsList.filter(w => w.status === 'CANCELLED').length}팀
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-orange-600 block">사전 주문</span>
                <span className="text-sm font-black text-orange-700">
                  {waitingsList.filter(w => w.pre_orders && w.pre_orders !== '[]').length}팀
                </span>
              </div>
            </div>

            {/* 🏷️ 웨이팅 탭 필터 (현재 대기중 손님에게 기본 집중) */}
            {(() => {
              const activeWaitings = waitingsList.filter(w => w.status === 'WAITING' || w.status === 'CALLED');
              const seatedWaitings = waitingsList.filter(w => w.status === 'SEATED');
              const displayedWaitings = waitingTab === 'WAITING'
                ? activeWaitings
                : waitingTab === 'SEATED'
                ? seatedWaitings
                : waitingsList;

              return (
                <>
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setWaitingTab('WAITING'); setSeatingTableSelection(null); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        waitingTab === 'WAITING'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>현재 대기 ({activeWaitings.length}팀)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setWaitingTab('SEATED'); setSeatingTableSelection(null); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        waitingTab === 'SEATED'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>착석 완료 ({seatedWaitings.length}팀)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setWaitingTab('ALL'); setSeatingTableSelection(null); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        waitingTab === 'ALL'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>전체 이력 ({waitingsList.length}건)</span>
                    </button>
                  </div>

                  {/* 본문 대기자 리스트 */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                    {displayedWaitings.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-sm font-bold space-y-1">
                        <p>{waitingTab === 'WAITING' ? '현재 대기 중인 손님이 없습니다.' : waitingTab === 'SEATED' ? '오늘 착석 완료된 손님이 없습니다.' : '등록된 대기 이력이 없습니다.'}</p>
                        {waitingTab === 'WAITING' && <p className="text-xs text-slate-400 font-normal">새로운 손님이 대기 등록하면 여기에 즉시 나타납니다.</p>}
                      </div>
                    ) : (
                      displayedWaitings.map((wait) => {
                        const isWaiting = wait.status === 'WAITING';
                        const isCalled = wait.status === 'CALLED';
                        const isSeated = wait.status === 'SEATED';

                  // 사전 주문 내역 파싱
                  let waitPreOrders: any[] = [];
                  if (wait.pre_orders) {
                    try {
                      waitPreOrders = typeof wait.pre_orders === 'string' ? JSON.parse(wait.pre_orders) : wait.pre_orders;
                    } catch (e) {}
                  }

                  return (
                    <div
                      key={wait.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
                        isCalled
                          ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400'
                          : isWaiting
                          ? 'bg-white border-orange-200 ring-1 ring-orange-400/20'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 ${
                          isCalled
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : isWaiting
                            ? 'bg-orange-600 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          <span className="text-[10px] font-medium leading-none">대기</span>
                          <span className="text-lg leading-tight">{wait.waiting_no}</span>
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900">{wait.customer_name}</h4>
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                              {wait.party_size}명
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                              isCalled
                                ? 'bg-emerald-100 text-emerald-800'
                                : isWaiting
                                ? 'bg-amber-100 text-amber-900'
                                : isSeated
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {isCalled ? '입장 호출완료' : isWaiting ? '대기중' : isSeated ? `착석(테이블 ${wait.assigned_table || '배정'})` : '취소됨'}
                            </span>

                            {/* 🍽️ 사전 주문 뱃지 */}
                            {waitPreOrders.length > 0 && (
                              <span className="text-[10px] font-extrabold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md flex items-center gap-1 border border-orange-200 shrink-0">
                                <ShoppingBag className="w-3 h-3 text-orange-600" />
                                <span>사전주문 {waitPreOrders.length}건 ({Number(wait.pre_order_total || 0).toLocaleString()}원)</span>
                              </span>
                            )}
                          </div>

                          {/* 사전 주문 품목 요약 툴팁/텍스트 */}
                          {waitPreOrders.length > 0 && (
                            <div className="text-[11px] font-bold text-slate-600 bg-orange-50/60 px-2.5 py-1 rounded-lg border border-orange-100 inline-block max-w-full truncate">
                              메뉴: {waitPreOrders.map((it: any) => `${it.name} × ${it.quantity}`).join(', ')}
                            </div>
                          )}

                          <div className="text-xs text-slate-400 flex items-center gap-3 font-medium">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {wait.customer_phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {wait.created_at?.substring(11, 16) || '방금'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 그룹 (줄바꿈 원천 방지 및 shrink-0) */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0 whitespace-nowrap">
                        {(isWaiting || isCalled) && (
                          <>
                            {/* 1. 입장 호출 / 재호출 버튼 */}
                            <button
                              onClick={() => handleCallWaiting(wait.id, wait.waiting_no, wait.customer_name)}
                              disabled={waitingActionLoading === `call_${wait.id}`}
                              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 border-0 cursor-pointer shadow-xs transition-all shrink-0 whitespace-nowrap"
                              title="고객님께 입장 안내 SMS 즉시 발송"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                              <span>{isCalled ? '재호출' : '입장 호출'}</span>
                            </button>

                            {/* 2. 🔔 2차 리마인드 재안내 버튼 (호출된 상태일 때 노출) */}
                            {isCalled && (
                              <button
                                onClick={() => handleRemindWaiting(wait.id, wait.waiting_no, wait.customer_name)}
                                disabled={waitingActionLoading === `remind_${wait.id}`}
                                className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 border-0 cursor-pointer shadow-xs transition-all shrink-0 whitespace-nowrap"
                                title="입장 지연 고객에게 2차 마지막 호출 SMS 발송"
                              >
                                <span>2차 리마인드</span>
                              </button>
                            )}

                            {/* 3. 착석 완료 버튼 */}
                            <button
                              onClick={() => setSeatingTableSelection({ waitingId: wait.id, waitingNo: wait.waiting_no })}
                              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border-0 cursor-pointer shadow-xs transition-all shrink-0 whitespace-nowrap"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>착석 배정</span>
                            </button>

                            {/* 4. 취소 버튼 */}
                            <button
                              onClick={() => handleCancelWaiting(wait.id, wait.waiting_no)}
                              disabled={waitingActionLoading === `cancel_${wait.id}`}
                              className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors border-0 bg-transparent cursor-pointer shrink-0"
                              title="대기 취소"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* 🪑 착석 완료(SEATED) 상태의 액션 버튼 (자리 이동 / 착석 취소 및 퇴장) */}
                        {isSeated && (
                          <>
                            {/* 🔀 자리 이동 (테이블 변경) */}
                            <button
                              onClick={() => setChangingTableSelection({
                                waitingId: wait.id,
                                waitingNo: wait.waiting_no,
                                currentTable: wait.assigned_table || ''
                              })}
                              disabled={waitingActionLoading === `change_table_${wait.id}`}
                              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shrink-0 whitespace-nowrap shadow-2xs"
                              title="다른 테이블로 자리 이동 및 주문 내역 자동 이관"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                              <span>자리 이동</span>
                            </button>

                            {/* ↩️ 착석 취소 / 퇴장 */}
                            <button
                              onClick={() => handleRevertSeatWaiting(wait.id, wait.waiting_no, wait.customer_name)}
                              disabled={waitingActionLoading === `revert_${wait.id}`}
                              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shrink-0 whitespace-nowrap shadow-2xs"
                              title="착석 취소 (대기 복원 또는 퇴장 처리)"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>착석 취소/퇴장</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </>
          );
        })()}

            {/* 착석 테이블 배정 서브 선택 패널 */}
            {seatingTableSelection && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-orange-900">
                    대기 {seatingTableSelection.waitingNo}번 손님을 배정할 테이블을 선택해 주세요:
                  </span>
                  <button
                    onClick={() => setSeatingTableSelection(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer"
                  >
                    취소
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {allTableIds.map((tId) => {
                    const isManuallyDisabled = disabledTables.includes(tId);
                    const isWaitingOccupied = waitingsList.some(w => w.status === 'SEATED' && String(w.assigned_table) === String(tId));
                    const isOrderOccupied = getOrdersForTable(tId).some(o => o.status !== '주문취소' && o.status !== '결제완료');
                    const isOccupied = isWaitingOccupied || isOrderOccupied;

                    return (
                      <button
                        key={tId}
                        disabled={isManuallyDisabled}
                        onClick={() => handleSeatWaiting(seatingTableSelection.waitingId, seatingTableSelection.waitingNo, tId)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                          isManuallyDisabled
                            ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-50'
                            : isOccupied
                            ? 'bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-900 border-amber-300 shadow-2xs cursor-pointer'
                            : 'bg-white hover:bg-orange-600 hover:text-white text-slate-800 border-orange-300 shadow-xs scale-105 cursor-pointer'
                        }`}
                      >
                        테이블 {tId}번 {isManuallyDisabled ? '(사용중지-선택불가)' : isOccupied ? '(이용중-합석)' : '(빈자리)'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 🔀 자리 이동(테이블 변경 및 합석) 서브 선택 패널 */}
            {changingTableSelection && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950">
                    대기 {changingTableSelection.waitingNo}번 (현재 테이블 {changingTableSelection.currentTable}번) 손님이 이동할 새 테이블을 선택해 주세요:
                  </span>
                  <button
                    onClick={() => setChangingTableSelection(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer"
                  >
                    취소
                  </button>
                </div>
                <p className="text-[11px] text-indigo-700">
                  ✓ 빈자리 이동 시 주문이 자동 이관되며, 이용 중인 테이블 선택 시 일행 [합석(주문 병합)]이 가능합니다.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {allTableIds.map((tId) => {
                    const isCurrent = String(tId) === String(changingTableSelection.currentTable);
                    const isManuallyDisabled = disabledTables.includes(tId);
                    const isWaitingOccupied = waitingsList.some(w => w.status === 'SEATED' && String(w.assigned_table) === String(tId) && w.id !== changingTableSelection.waitingId);
                    const isOrderOccupied = getOrdersForTable(tId).some(o => o.status !== '주문취소' && o.status !== '결제완료');
                    const isOccupied = isWaitingOccupied || isOrderOccupied;
                    const isDisabled = isCurrent || isManuallyDisabled;

                    return (
                      <button
                        key={tId}
                        disabled={isDisabled}
                        onClick={() => handleChangeTableWaiting(changingTableSelection.waitingId, changingTableSelection.waitingNo, tId)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                          isCurrent
                            ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed opacity-60'
                            : isManuallyDisabled
                            ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-50'
                            : isOccupied
                            ? 'bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-900 border-amber-300 cursor-pointer shadow-2xs'
                            : 'bg-white hover:bg-indigo-600 hover:text-white text-indigo-900 border-indigo-300 shadow-xs scale-105 cursor-pointer'
                        }`}
                      >
                        테이블 {tId}번 {isCurrent ? '(현재자리)' : isManuallyDisabled ? '(사용중지-선택불가)' : isOccupied ? '(이용중-합석)' : '(빈자리)'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 모달 푸터 */}
            <div className="border-t border-slate-100 pt-4 shrink-0 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsWaitingQrModalOpen(true);
                  setIsWaitingModalOpen(false);
                }}
                className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-orange-200 cursor-pointer transition-colors"
              >
                <QrCode className="w-4 h-4 text-orange-600" />
                <span>입구 비치용 대기 QR 보기</span>
              </button>

              <button
                onClick={() => {
                  setIsWaitingModalOpen(false);
                  setSeatingTableSelection(null);
                }}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs border-0 cursor-pointer transition-colors"
              >
                닫기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📱 2. 입구 비치용 대기 등록 QR 모달 */}
      {isWaitingQrModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-6 text-center relative">
            <div className="space-y-1">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mx-auto mb-2">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">대기 등록 QR</h3>
            </div>

            {/* QR 이미지 카드 */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 inline-block mx-auto shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                  typeof window !== 'undefined' ? `${window.location.origin}/waiting` : 'http://localhost:4005/waiting'
                )}`}
                alt="Waiting QR Code"
                className="w-56 h-56 rounded-2xl mx-auto block shadow-xs"
              />
              <p className="text-xs font-black text-slate-700 mt-3">스마트폰 카메라로 스캔해 주세요</p>
            </div>

            <div className="flex items-center gap-2 justify-center flex-wrap">
              {/* 📋 주소(URL) 복사 버튼 */}
              <button
                type="button"
                onClick={handleCopyWaitingUrl}
                className={`px-4 py-2.5 font-bold text-xs rounded-xl flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs ${
                  copiedWaitingUrl
                    ? 'bg-emerald-600 text-white border-emerald-600 scale-105'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                {copiedWaitingUrl ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>주소 복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>주소 복사</span>
                  </>
                )}
              </button>

              <a
                href="/waiting"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 no-underline shadow-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>대기 접수창 열기</span>
              </a>

              <button
                onClick={() => setIsWaitingQrModalOpen(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs border-0 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

