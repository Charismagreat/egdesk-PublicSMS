"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ShoppingBag, Search, Image as ImageIcon, Upload, Calendar, Send } from "lucide-react";
import { Product } from "../types";

interface AiCreatorStudioProps {
  /**
   * 상품 목록
   */
  products: Product[];
  /**
   * 선택된 상품
   */
  selectedProduct: Product | null;
  /**
   * 상품 선택 핸들러
   */
  onSelectProduct: (prod: Product) => void;
  /**
   * AI 프롬프트 텍스트
   */
  aiPrompt: string;
  /**
   * AI 프롬프트 변경 핸들러
   */
  onAiPromptChange: (val: string) => void;
  /**
   * AI 생성 어조
   */
  aiTone: string;
  /**
   * AI 생성 어조 변경 핸들러
   */
  onAiToneChange: (val: string) => void;
  /**
   * AI 생성 실행 중 여부
   */
  isGenerating: boolean;
  /**
   * AI 생성 실행 트리거 핸들러
   */
  onGenerateAI: () => Promise<void>;
  /**
   * 생성된 마케팅 문구 피드
   */
  generatedText: string;
  /**
   * 문구 피드 편집 핸들러
   */
  onGeneratedTextChange: (val: string) => void;
  /**
   * AI로 생성된 이미지 URL
   */
  generatedImageUrl: string;
  /**
   * 이미지 소스 탭 유형
   */
  imageTab: "product" | "ai" | "canvas";
  /**
   * 이미지 탭 전환 핸들러
   */
  onImageTabChange: (tab: "product" | "ai" | "canvas") => void;
  /**
   * 직접 업로드한 로컬 이미지 (Base64)
   */
  customImageFile: string | null;
  /**
   * 로컬 이미지 수동 로드 핸들러
   */
  onLocalImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * 합성용 HTML5 Canvas Ref
   */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /**
   * 카드뉴스 메인 제목
   */
  canvasTitle: string;
  /**
   * 카드뉴스 메인 제목 변경 핸들러
   */
  onCanvasTitleChange: (val: string) => void;
  /**
   * 카드뉴스 서브 제목
   */
  canvasSubtitle: string;
  /**
   * 카드뉴스 서브 제목 변경 핸들러
   */
  onCanvasSubtitleChange: (val: string) => void;
  /**
   * 카드뉴스 이벤트/할인 라벨
   */
  canvasDiscount: string;
  /**
   * 카드뉴스 이벤트/할인 라벨 변경 핸들러
   */
  onCanvasDiscountChange: (val: string) => void;
  /**
   * 카드뉴스 그라데이션 테마
   */
  canvasTheme: string;
  /**
   * 카드뉴스 테마 변경 핸들러
   */
  onCanvasThemeChange: (val: string) => void;
  /**
   * 카드뉴스 오버레이 색상
   */
  canvasOverlayColor: string;
  /**
   * 카드뉴스 오버레이 색상 변경 핸들러
   */
  onCanvasOverlayColorChange: (val: string) => void;
  /**
   * 인스타 아이디 (캔버스 하단 워터마크 표시용)
   */
  instagramUsername: string;
  /**
   * 피드 예약 발행일
   */
  scheduleDate: string;
  /**
   * 예약 발행일 변경 핸들러
   */
  onScheduleDateChange: (val: string) => void;
  /**
   * 피드 예약 발행시각
   */
  scheduleTime: string;
  /**
   * 예약 발행시각 변경 핸들러
   */
  onScheduleTimeChange: (val: string) => void;
  /**
   * 피드 스케줄/즉시등록 트리거 핸들러
   */
  onSchedulePost: (isImmediate: boolean) => Promise<void>;
}

/**
 * AI 크리에이터 스튜디오 및 HTML5 Canvas 카드뉴스 제작 제어 컴포넌트
 */
export default function AiCreatorStudio({
  products,
  selectedProduct,
  onSelectProduct,
  aiPrompt,
  onAiPromptChange,
  aiTone,
  onAiToneChange,
  isGenerating,
  onGenerateAI,
  generatedText,
  onGeneratedTextChange,
  generatedImageUrl,
  imageTab,
  onImageTabChange,
  customImageFile,
  onLocalImageUpload,
  canvasRef,
  canvasTitle,
  onCanvasTitleChange,
  canvasSubtitle,
  onCanvasSubtitleChange,
  canvasDiscount,
  onCanvasDiscountChange,
  canvasTheme,
  onCanvasThemeChange,
  canvasOverlayColor,
  onCanvasOverlayColorChange,
  instagramUsername,
  scheduleDate,
  onScheduleDateChange,
  scheduleTime,
  onScheduleTimeChange,
  onSchedulePost,
}: AiCreatorStudioProps) {
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // 카드뉴스 캔버스 실시간 드로잉 렌더러 연동
  useEffect(() => {
    if (imageTab === "canvas") {
      renderCanvas();
    }
  }, [
    imageTab,
    selectedProduct,
    generatedImageUrl,
    customImageFile,
    canvasTitle,
    canvasSubtitle,
    canvasDiscount,
    canvasTheme,
    canvasOverlayColor,
    instagramUsername,
  ]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 캔버스 고해상도 정사각형 규격 설정 (1080 x 1080)
    canvas.width = 1080;
    canvas.height = 1080;

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";

    // 3-Way 중 활성화된 이미지 소스 선택
    let imgSrc = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"; // 폴백
    if (customImageFile) {
      imgSrc = customImageFile;
    } else if (imageTab === "ai" && generatedImageUrl) {
      imgSrc = generatedImageUrl;
    } else if (selectedProduct?.main_image_url) {
      imgSrc = selectedProduct.main_image_url;
    }

    bgImg.onload = () => {
      // 1. 이미지 비율 맞추어 그리기 (Aspect Fill)
      const canvasRatio = canvas.width / canvas.height;
      const imgRatio = bgImg.width / bgImg.height;
      let drawWidth = canvas.width;
      let drawHeight = canvas.height;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > canvasRatio) {
        drawWidth = bgImg.width * (canvas.height / bgImg.height);
        drawX = (canvas.width - drawWidth) / 2;
      } else {
        drawHeight = bgImg.height * (canvas.width / bgImg.width);
        drawY = (canvas.height - drawHeight) / 2;
      }

      ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);

      // 2. 가독성을 위한 레이어 오버레이 투명 배경
      ctx.fillStyle = canvasOverlayColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. 그라데이션 장식 테두리 및 데코
      if (canvasTheme === "gradient-gold") {
        const borderGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        borderGrad.addColorStop(0, "#d4af37");
        borderGrad.addColorStop(0.5, "#f3e5ab");
        borderGrad.addColorStop(1, "#aa771c");

        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 30;
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

        ctx.fillStyle = "rgba(170, 119, 28, 0.8)";
        ctx.fillRect(0, 100, canvas.width, 90);
      } else if (canvasTheme === "neon-pink") {
        ctx.strokeStyle = "#ff007f";
        ctx.lineWidth = 20;
        ctx.shadowColor = "#ff007f";
        ctx.shadowBlur = 20;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        ctx.shadowBlur = 0; // 복원
      } else if (canvasTheme === "modern-dark") {
        ctx.fillStyle = "rgba(15, 15, 20, 0.85)";
        ctx.fillRect(80, 720, canvas.width - 160, 260);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 2;
        ctx.strokeRect(80, 720, canvas.width - 160, 260);
      }

      ctx.textAlign = "center";

      // 4. 할인 배지 그리기
      if (canvasDiscount) {
        ctx.save();
        ctx.font = "bold 44px sans-serif";
        const tagText = canvasDiscount.toUpperCase();
        const textWidth = ctx.measureText(tagText).width;
        const tagW = textWidth + 60;
        const tagH = 80;
        const tagX = canvas.width / 2 - tagW / 2;
        const tagY = canvasTheme === "gradient-gold" ? 105 : 220;

        if (canvasTheme === "neon-pink") {
          ctx.fillStyle = "#ff007f";
          ctx.shadowColor = "#ff007f";
          ctx.shadowBlur = 15;
        } else if (canvasTheme === "gradient-gold") {
          ctx.fillStyle = "#ffffff";
        } else {
          ctx.fillStyle = "#ffffff";
        }

        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tagW, tagH, 40);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = canvasTheme === "gradient-gold" ? "#aa771c" : "#0f0f14";
        ctx.fillText(tagText, canvas.width / 2, tagY + 56);
        ctx.restore();
      }

      // 5. 메인 타이틀 그리기
      ctx.save();
      ctx.fillStyle = "#ffffff";

      if (canvasTheme === "neon-pink") {
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 15;
      } else {
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 10;
      }

      ctx.font = "bold 84px sans-serif";
      const mainTextY = canvasTheme === "modern-dark" ? 820 : 540;
      ctx.fillText(canvasTitle, canvas.width / 2, mainTextY);
      ctx.restore();

      // 6. 서브 타이틀 그리기
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "500 42px sans-serif";
      const subTextY = canvasTheme === "modern-dark" ? 900 : 640;
      ctx.fillText(canvasSubtitle, canvas.width / 2, subTextY);
      ctx.restore();

      // 7. 하단 워터마크 브랜드 마크 그리기
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(`@${instagramUsername || "EGD_AI_MARKETER"}`, canvas.width / 2, 1020);
    };

    // CORS 캐싱 우회
    bgImg.src = imgSrc.startsWith("data:") ? imgSrc : imgSrc + (imgSrc.includes("?") ? "&" : "?") + "r=" + Date.now();
  };

  return (
    <div className="p-6 lg:p-8 rounded-3xl border border-slate-100 bg-white shadow-sm relative overflow-hidden text-left">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-pink-600" />
          <h2 className="text-xl font-bold text-slate-800">
            AI 크리에이터 스튜디오 <span className="text-xs text-slate-400 font-normal">3-Way Engine</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* 마케팅 카피 메이커 영역 (왼쪽 7열) */}
        <div className="md:col-span-7 space-y-6">
          {/* 대상 상품 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 font-bold">
                <ShoppingBag className="w-3.5 h-3.5 text-pink-600" />
                포스팅 대상 상품 선택
              </label>
              <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full font-semibold">
                총 {products.length}개 상품
              </span>
            </div>

            {/* 실시간 상품 검색 필드 */}
            <div className="mb-3 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="상품명으로 빠르게 검색해보세요..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all font-medium text-slate-800 placeholder-slate-400 shadow-inner-sm"
              />
              {productSearchQuery && (
                <button
                  onClick={() => setProductSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-rose-500 text-xs transition-colors border-0 bg-transparent cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {(() => {
                const filtered = products.filter((prod) =>
                  prod.name.toLowerCase().includes(productSearchQuery.toLowerCase())
                );
                if (filtered.length === 0) {
                  return (
                    <div className="col-span-1 sm:col-span-2 text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      <ShoppingBag className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-[11px] font-semibold text-slate-500">일치하는 상품이 없습니다</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">검색어를 확인하거나 새로운 상품을 등록해주세요.</p>
                    </div>
                  );
                }
                return filtered.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => onSelectProduct(prod)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                      selectedProduct?.id === prod.id
                        ? "border-pink-500 bg-pink-50 text-slate-800 ring-1 ring-pink-100 shadow-sm"
                        : "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-200"
                    }`}
                  >
                    {prod.main_image_url ? (
                      <img
                        src={prod.main_image_url}
                        alt={prod.name}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 truncate">{prod.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{Number(prod.price || 0).toLocaleString()}원</p>
                    </div>
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* AI 프롬프트 및 스타일 지정 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 block mb-2">마케팅 강조 프롬프트 (선택)</label>
              <input
                type="text"
                placeholder="예: 봄맞이 한정 파격 세일, 신뢰성 강조"
                value={aiPrompt}
                onChange={(e) => onAiPromptChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-pink-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">카피라이팅 어조</label>
              <select
                value={aiTone}
                onChange={(e) => onAiToneChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-pink-500 focus:bg-white transition"
              >
                <option value="인플루언서형">인플루언서형 💅</option>
                <option value="세련된형">세련된 감성형 🌿</option>
                <option value="전문가형">제품 전문가형 📊</option>
                <option value="유머형">재치 유머형 🤪</option>
              </select>
            </div>
          </div>

          {/* AI 글 & 사진 제작하기 버튼 */}
          <button
            onClick={onGenerateAI}
            disabled={isGenerating}
            className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white flex items-center justify-center gap-2 hover:opacity-95 shadow-[0_4px_12px_rgba(236,72,153,0.3)] disabled:opacity-50 transition cursor-pointer border-0"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            {isGenerating ? "AI가 기획 및 제작하는 중..." : "AI 마케터 카피라이팅 & 감성 이미지 생성"}
          </button>

          {/* 카피 편집 에디터 패널 */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-2 flex items-center justify-between font-bold">
              <span>인스타그램 본문 문구 피드 에디터</span>
              <span className="text-[10px] text-slate-400">줄바꿈, 이모지 및 해시태그 포함</span>
            </label>
            <textarea
              rows={7}
              value={generatedText}
              onChange={(e) => onGeneratedTextChange(e.target.value)}
              placeholder="생성 버튼을 누르면 AI가 상품 기반 피드를 만듭니다. 여기에 직접 멋진 글을 편집하거나 적을 수도 있습니다."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 focus:outline-none focus:border-pink-500 focus:bg-white leading-relaxed resize-none transition"
            />
          </div>
        </div>

        {/* 3-Way 이미지 셀렉터 및 카드뉴스 캔버스 (오른쪽 5열) */}
        <div className="md:col-span-5 space-y-6">
          {/* 3-Way 탭 토글 */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-2">이미지 크리에이터 소스 (3-Way)</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              <button
                onClick={() => onImageTabChange("product")}
                className={`text-[10px] font-bold py-2 rounded-lg transition cursor-pointer border-0 ${
                  imageTab === "product"
                    ? "bg-white text-pink-600 shadow-sm border border-pink-100/50 font-extrabold"
                    : "bg-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                자체 상품컷
              </button>
              <button
                onClick={() => onImageTabChange("ai")}
                className={`text-[10px] font-bold py-2 rounded-lg transition cursor-pointer border-0 ${
                  imageTab === "ai"
                    ? "bg-white text-pink-600 shadow-sm border border-pink-100/50 font-extrabold"
                    : "bg-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                AI 감성생성
              </button>
              <button
                onClick={() => onImageTabChange("canvas")}
                className={`text-[10px] font-bold py-2 rounded-lg transition cursor-pointer border-0 ${
                  imageTab === "canvas"
                    ? "bg-white text-pink-600 shadow-sm border border-pink-100/50 font-extrabold"
                    : "bg-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                카드뉴스 합성
              </button>
            </div>
          </div>

          {/* 각 이미지 탭의 세부 콘텐츠 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            {imageTab === "product" && (
              <div className="space-y-4">
                <div className="aspect-square bg-slate-200 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                  {selectedProduct?.main_image_url ? (
                    <img src={selectedProduct.main_image_url} alt="선택된 상품" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">선택된 상품컷 이미지가 없습니다.</p>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-slate-800/80 px-2 py-1 rounded text-[10px] text-white font-medium">
                    기본 상품 이미지
                  </div>
                </div>

                {/* 드래그앤드롭 / 로컬 이미지 직접 업로드 */}
                <label className="w-full flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl py-4 hover:border-pink-500/50 cursor-pointer bg-white hover:bg-pink-50/50 transition">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-500">커스텀 상품 이미지 수동 로드</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onLocalImageUpload} />
                </label>
              </div>
            )}

            {imageTab === "ai" && (
              <div className="space-y-4">
                <div className="aspect-square bg-slate-200 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                  {generatedImageUrl ? (
                    <img src={generatedImageUrl} alt="생성된 감성컷" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <Sparkles className="w-10 h-10 text-slate-400 mx-auto mb-2 animate-bounce" />
                      <p className="text-xs text-slate-500">AI 이미지 생성 전입니다.</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        상단 AI 생성 버튼을 누르면 인공지능이 상품에 맞는 라이프스타일 컷을 픽업합니다.
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-pink-600 px-2 py-1 rounded text-[10px] text-white font-medium shadow-sm">
                    AI 가상 감성 픽업
                  </div>
                </div>
              </div>
            )}

            {imageTab === "canvas" && (
              <div className="space-y-4">
                {/* 실시간 캔버스 뷰포트 */}
                <div className="aspect-square bg-slate-200 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                  <canvas ref={canvasRef} className="w-full h-full object-contain" />
                  <div className="absolute bottom-2 left-2 bg-purple-600 px-2 py-1 rounded text-[10px] text-white font-medium">
                    Canvas 브랜드 카드뉴스 합성
                  </div>
                </div>

                {/* 캔버스 텍스트/디자인 속성 제어 */}
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">메인 제목 타이틀</label>
                    <input
                      type="text"
                      value={canvasTitle}
                      onChange={(e) => onCanvasTitleChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-pink-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">서브 감성 텍스트</label>
                    <input
                      type="text"
                      value={canvasSubtitle}
                      onChange={(e) => onCanvasSubtitleChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-pink-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">이벤트/할인 라벨</label>
                      <input
                        type="text"
                        value={canvasDiscount}
                        onChange={(e) => onCanvasDiscountChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-pink-500 transition"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">그라데이션 테마</label>
                      <select
                        value={canvasTheme}
                        onChange={(e) => onCanvasThemeChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-pink-500 transition"
                      >
                        <option value="gradient-gold">럭셔리 골드 ✨</option>
                        <option value="neon-pink">핫네온 핑크 💖</option>
                        <option value="modern-dark">시크 다크 블랙 🖤</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 스케줄링 예약 및 발행 전송 인터페이스 */}
      <div className="border-t border-slate-100 pt-6 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-cyan-600" />
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                인스타 피드 수동 발행 / 예약 일시 설정
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => onScheduleDateChange(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => onScheduleTimeChange(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onSchedulePost(false)}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl font-bold bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-slate-50 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-cyan-600" />
              피드 발행 예약하기
            </button>
            <button
              onClick={() => onSchedulePost(true)}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-95 text-white text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer border-0"
            >
              <Send className="w-4 h-4" />
              인스타 즉시 업로드 승인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
