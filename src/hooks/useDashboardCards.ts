"use client";

import { usePersistedState } from "@/hooks/usePersistedState";

export interface CustomDashboardCardDetail {
  label: string;
  value: string;
  color?: string;
}

export interface CustomDashboardCard {
  id: string;
  section: "section1" | "section2";
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  mainValue: string;
  mainValueColor?: string;
  details: CustomDashboardCardDetail[];
  aiPrompt: string;
  createdAt: string;
}

const DEFAULT_CUSTOM_CARDS: CustomDashboardCard[] = [];

export function useDashboardCards() {
  const [customCards, setCustomCards, isRestored] = usePersistedState<CustomDashboardCard[]>(
    "egdesk_custom_dashboard_cards_v1",
    DEFAULT_CUSTOM_CARDS
  );

  // 특정 섹션(section1 또는 section2)에 해당하는 커스텀 카드 필터링
  const getCardsBySection = (section: "section1" | "section2") => {
    if (!isRestored) return [];
    return customCards.filter((card) => card.section === section);
  };

  // 카드 추가 (승인 시)
  const addCard = (newCard: CustomDashboardCard) => {
    setCustomCards((prev) => [newCard, ...prev]);
  };

  // 카드 삭제
  const removeCard = (cardId: string) => {
    setCustomCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  // 카드 업데이트 (수정 승인 시)
  const updateCard = (updatedCard: CustomDashboardCard) => {
    setCustomCards((prev) =>
      prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
    );
  };

  return {
    customCards,
    isRestored,
    getCardsBySection,
    addCard,
    removeCard,
    updateCard,
  };
}
