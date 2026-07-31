"use client";

import React, { useState } from "react";
import { Sparkles, X, ArrowRight, CheckCircle2, RefreshCw, Layers, Edit3, Trash2 } from "lucide-react";
import { CustomDashboardCard, CustomDashboardCardDetail } from "@/hooks/useDashboardCards";

interface DashboardCardGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSection: "section1" | "section2";
  onApproveCard: (card: CustomDashboardCard) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  cardPreview?: CustomDashboardCard;
}

export default function DashboardCardGenModal({
  isOpen,
  onClose,
  targetSection,
  onApproveCard,
}: DashboardCardGenModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentPreviewCard, setCurrentPreviewCard] = useState<CustomDashboardCard | null>(null);

  if (!isOpen) return null;

  const sectionName = targetSection === "section1" ? "상단 핵심 실적 KPI 영역" : "하단 종합 운용 현황 영역";

  // AI 카드 프리뷰 생성/수정 핸들러 (자연어 지시어 해석 및 카드 메타데이터 빌드)
  const handleGenerateOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const userText = prompt.trim();
    setPrompt("");
    setIsGenerating(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
    };

    setChatHistory((prev) => [...prev, userMsg]);

    // AI 생성 시뮬레이션 지연
    setTimeout(() => {
      let cardTitle = "AI 맞춤 인사이트 지표";
      let subtitle = "실시간 모니터링";
      let badge = "AI 추정";
      let badgeColor = "bg-indigo-50 text-indigo-600 border-indigo-100";
      let mainValue = "₩ 0";
      let mainValueColor = "text-slate-800";
      let details: CustomDashboardCardDetail[] = [];

      const lowerText = userText.toLowerCase();

      if (lowerText.includes("매출") || lowerText.includes("수주") || lowerText.includes("실적")) {
        cardTitle = "월간 목표 달성률 추이";
        subtitle = "당월 매출 및 달성률 분석";
        badge = "목표 달성 92%";
        badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-100";
        mainValue = "₩ 48,500,000";
        mainValueColor = "text-blue-600";
        details = [
          { label: "목표 대비", value: "+ ₩ 4,200,000", color: "text-emerald-600" },
          { label: "전월 동기", value: "+ 15.4%", color: "text-blue-600" },
          { label: "AI 예측 최종", value: "₩ 52,000,000", color: "text-indigo-600" },
        ];
      } else if (lowerText.includes("미수금") || lowerText.includes("채권") || lowerText.includes("미지급")) {
        cardTitle = "집중 관리 미수금 TOP 3";
        subtitle = "회수 임계 도달 거래처";
        badge = "주의 2건";
        badgeColor = "bg-rose-50 text-rose-600 border-rose-100";
        mainValue = "₩ 12,400,000";
        mainValueColor = "text-rose-600";
        details = [
          { label: "(주)한빛상사", value: "₩ 5,800,000", color: "text-slate-700" },
          { label: "미래테크", value: "₩ 4,200,000", color: "text-slate-700" },
          { label: "성진산업", value: "₩ 2,400,000", color: "text-slate-700" },
        ];
      } else if (lowerText.includes("재고") || lowerText.includes("부품") || lowerText.includes("자원")) {
        cardTitle = "안전 재고 부족 위험 품목";
        subtitle = "재발주 필요 자재 현황";
        badge = "재발주 필요";
        badgeColor = "bg-amber-50 text-amber-600 border-amber-100";
        mainValue = "3개 품목";
        mainValueColor = "text-amber-600";
        details = [
          { label: "SUS304 강판", value: "잔여 120kg (부족)", color: "text-rose-600" },
          { label: "M8 볼트 세트", value: "잔여 500개 (경고)", color: "text-amber-600" },
          { label: "알루미늄 프로파일", value: "잔여 45m (양호)", color: "text-emerald-600" },
        ];
      } else if (lowerText.includes("블루") || lowerText.includes("색상") || lowerText.includes("강조")) {
        // 기존 카드 수정 요청 시 색상 변경
        cardTitle = currentPreviewCard ? currentPreviewCard.title : "AI 맞춤 리포트";
        subtitle = "디자인 강조 처리 완료";
        badge = "강조 뷰";
        badgeColor = "bg-blue-50 text-blue-600 border-blue-100";
        mainValue = currentPreviewCard ? currentPreviewCard.mainValue : "₩ 28,900,000";
        mainValueColor = "text-blue-600 font-black";
        details = currentPreviewCard ? currentPreviewCard.details : [
          { label: "주요 지표 A", value: "정상 가동", color: "text-blue-600" },
          { label: "주요 지표 B", value: "+ 12.8%", color: "text-emerald-600" },
        ];
      } else {
        cardTitle = `AI 맞춤 ${userText.slice(0, 10)} 지표`;
        subtitle = "사장님 맞춤 쿼리 실시간 집계";
        badge = "실시간 생성";
        badgeColor = "bg-indigo-50 text-indigo-600 border-indigo-100";
        mainValue = "₩ 18,750,000";
        mainValueColor = "text-indigo-600";
        details = [
          { label: "실시간 집계 항목 1", value: "양호 (98%)", color: "text-emerald-600" },
          { label: "실시간 집계 항목 2", value: "₩ 3,450,000", color: "text-slate-700" },
          { label: "AI 예측 변화율", value: "+ 8.2%", color: "text-indigo-600" },
        ];
      }

      const generatedCard: CustomDashboardCard = {
        id: `card-${Date.now()}`,
        section: targetSection,
        title: cardTitle,
        subtitle,
        badge,
        badgeColor,
        mainValue,
        mainValueColor,
        details,
        aiPrompt: userText,
        createdAt: new Date().toISOString(),
      };

      setCurrentPreviewCard(generatedCard);

      const aiReplyMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: `요청하신 "${userText}" 지침을 바탕으로 [${cardTitle}] 요약 카드를 생성하였습니다! 우측 프리뷰 카드를 확인하시고, 수정하고 싶은 부분이 있다면 계속 지시해 주시거나 [승인 및 대시보드 배치] 버튼을 눌러주세요.`,
        cardPreview: generatedCard,
      };

      setChatHistory((prev) => [...prev, aiReplyMsg]);
      setIsGenerating(false);
    }, 600);
  };

  // 최종 승인 및 대시보드 추가
  const handleApprove = () => {
    if (currentPreviewCard) {
      onApproveCard(currentPreviewCard);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-slate-200/80 rounded-3xl max-w-4xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* 모달 상단 헤더 */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>AI 맞춤 요약 카드 생성 스튜디오</span>
                <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 rounded-md text-[10px] font-bold border border-indigo-400/30">
                  {sectionName}
                </span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5 font-medium">
                자연어로 원하는 지표를 지시하면 AI가 대시보드 카드를 즉시 설계·수정·승인 노출합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 영역: 좌측 (대화 및 입력) | 우측 (실시간 카드 프리뷰) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* 좌측: AI 대화 인터페이스 */}
          <div className="flex flex-col h-full bg-slate-50/50 p-4 min-h-0">
            <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center justify-between">
              <span>💬 AI 프롬프트 지시 및 수정 대화</span>
              <span className="text-[10px] text-slate-400 font-normal">예: "금월 미수금 현황 요약 카드 만들어줘"</span>
            </div>

            {/* 대화 이력 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">어떤 요약 카드가 필요하신가요?</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      원하는 매출, 재고, 자금, 근태, 미수금 지표를 텍스트로 지시해 주세요.
                    </p>
                  </div>
                  {/* 추천 프롬프트 칩 */}
                  <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                    <button
                      onClick={() => setPrompt("월간 매출 목표 달성률 추이 카드 만들어줘")}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-xl hover:border-indigo-400 transition-colors cursor-pointer"
                    >
                      💡 월간 매출 목표 달성률
                    </button>
                    <button
                      onClick={() => setPrompt("집중 관리 미수금 TOP 3 카드 생성해줘")}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-xl hover:border-indigo-400 transition-colors cursor-pointer"
                    >
                      💡 미수금 TOP 3 현황
                    </button>
                    <button
                      onClick={() => setPrompt("재발주 필요 안전 재고 부족 품목 카드 만들어줘")}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-xl hover:border-indigo-400 transition-colors cursor-pointer"
                    >
                      💡 안전 재고 부족 품목
                    </button>
                  </div>
                </div>
              ) : (
                chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] p-3 rounded-2xl text-xs font-medium ${
                        msg.sender === "user"
                          ? "bg-indigo-600 text-white rounded-br-none shadow-xs"
                          : "bg-white border border-slate-200/80 text-slate-800 rounded-bl-none shadow-xs"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}

              {isGenerating && (
                <div className="flex items-center gap-2 p-3 bg-white border border-slate-200/80 rounded-2xl text-xs text-indigo-600 font-bold w-fit animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI가 지표 및 데이터를 파싱하여 카드를 디자인하는 중...</span>
                </div>
              )}
            </div>

            {/* 입력 하단바 */}
            <form onSubmit={handleGenerateOrEdit} className="mt-3 relative shrink-0">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="지시어 또는 수정 요청사항 입력... (예: 블루 톤으로 강조해줘)"
                className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-colors shadow-xs"
              />
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl transition-all cursor-pointer border-none flex items-center justify-center"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* 우측: 실시간 요약 카드 프리뷰 및 승인 배치 */}
          <div className="flex flex-col h-full bg-white p-5 justify-between min-h-0">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  실시간 완성 카드 프리뷰
                </span>
                {currentPreviewCard && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold border border-emerald-100">
                    생성 완료
                  </span>
                )}
              </div>

              {/* 생성된 실물 카드 프리뷰 */}
              {currentPreviewCard ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-lg relative transition-all hover:border-indigo-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-col">
                      <h3 className="font-bold text-slate-800 text-sm">{currentPreviewCard.title}</h3>
                      {currentPreviewCard.subtitle && (
                        <span className="text-[10px] text-slate-400 mt-0.5">{currentPreviewCard.subtitle}</span>
                      )}
                    </div>
                    {currentPreviewCard.badge && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${currentPreviewCard.badgeColor}`}>
                        {currentPreviewCard.badge}
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className={`text-2xl font-black ${currentPreviewCard.mainValueColor}`}>
                      {currentPreviewCard.mainValue}
                    </span>
                  </div>

                  {currentPreviewCard.details.length > 0 && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                      {currentPreviewCard.details.map((d, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-slate-500">{d.label}</span>
                          <span className={`font-bold ${d.color || "text-slate-700"}`}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>지시어: "{currentPreviewCard.aiPrompt}"</span>
                    <span>방금 생성됨</span>
                  </div>
                </div>
              ) : (
                <div className="h-64 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Sparkles className="w-10 h-10 mb-2 text-slate-300 animate-pulse" />
                  <p className="text-xs font-bold text-slate-600">카드 프리뷰 대기 중</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    좌측 프롬프트 입력창에 원하는 지표를 입력해 주세요.
                  </p>
                </div>
              )}
            </div>

            {/* 하단 승인 버튼 */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
              >
                취소
              </button>

              <button
                type="button"
                disabled={!currentPreviewCard}
                onClick={handleApprove}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>승인 및 대시보드에 배치</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
