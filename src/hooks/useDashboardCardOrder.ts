"use client";

import { usePersistedState } from "@/hooks/usePersistedState";

export interface CardOrderState {
  section1Order: string[]; // 섹션 1 카드 ID 순서 배열
  section2Order: string[]; // 섹션 2 카드 ID 순서 배열
}

const DEFAULT_SECTION1_ORDER = [
  "add_button",
  "cash",
  "orders",
  "purchases",
  "sales",
  "costs",
  "production",
];

const DEFAULT_SECTION2_ORDER = [
  "add_button",
  "attendance",
  "inventory",
  "finance",
  "cashflow",
];

export function useDashboardCardOrder() {
  const [orders, setOrders, isRestored] = usePersistedState<CardOrderState>(
    "egdesk_dashboard_card_orders_v1",
    {
      section1Order: DEFAULT_SECTION1_ORDER,
      section2Order: DEFAULT_SECTION2_ORDER,
    }
  );

  // 지정한 섹션의 카드 순서 리스트 가져오기
  const getOrder = (section: "section1" | "section2") => {
    return section === "section1" ? orders.section1Order : orders.section2Order;
  };

  // 카드 위치를 좌/우로 1칸 이동
  const moveCard = (
    section: "section1" | "section2",
    cardId: string,
    direction: "left" | "right"
  ) => {
    setOrders((prev) => {
      const currentList = [...(section === "section1" ? prev.section1Order : prev.section2Order)];
      const idx = currentList.indexOf(cardId);
      if (idx === -1) return prev;

      const newIdx = direction === "left" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= currentList.length) return prev;

      // swap
      const temp = currentList[idx];
      currentList[idx] = currentList[newIdx];
      currentList[newIdx] = temp;

      if (section === "section1") {
        return { ...prev, section1Order: currentList };
      } else {
        return { ...prev, section2Order: currentList };
      }
    });
  };

  // 신규 생성이 발생하거나 순서 배열에 누락된 새 카드가 있을 때 순서 등록
  const registerCardId = (section: "section1" | "section2", cardId: string) => {
    setOrders((prev) => {
      const currentList = section === "section1" ? prev.section1Order : prev.section2Order;
      if (currentList.includes(cardId)) return prev;

      // 새 카드는 맨 앞 ➕ 버튼 바로 뒤 (인덱스 1)에 삽입
      const newList = [...currentList];
      newList.splice(1, 0, cardId);

      if (section === "section1") {
        return { ...prev, section1Order: newList };
      } else {
        return { ...prev, section2Order: newList };
      }
    });
  };

  // 순서 리스트 초기화
  const resetOrder = (section: "section1" | "section2") => {
    setOrders((prev) => ({
      ...prev,
      [section === "section1" ? "section1Order" : "section2Order"]:
        section === "section1" ? DEFAULT_SECTION1_ORDER : DEFAULT_SECTION2_ORDER,
    }));
  };

  return {
    getOrder,
    moveCard,
    registerCardId,
    resetOrder,
    isRestored,
  };
}
