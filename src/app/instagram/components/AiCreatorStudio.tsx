"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ShoppingBag, Search, Image as ImageIcon, Upload } from "lucide-react";
import { Product } from "../types";

interface AiCreatorStudioProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (prod: Product) => void;
  aiPrompt: string;
  onAiPromptChange: (val: string) => void;
  customImagePrompt?: string;
  onCustomImagePromptChange?: (val: string) => void;
  aiTone: string;
  onAiToneChange: (val: string) => void;
  isGenerating: boolean;
  onGenerateAI: () => Promise<void>;
  generatedText: string;
  onGeneratedTextChange: (val: string) => void;
  generatedImageUrl: string;
  imageTab: "product" | "ai" | "canvas";
  onImageTabChange: (tab: "product" | "ai" | "canvas") => void;
  customImageFile: string | null;
  onLocalImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasTitle: string;
  onCanvasTitleChange: (val: string) => void;
  canvasSubtitle: string;
  onCanvasSubtitleChange: (val: string) => void;
  canvasDiscount: string;
  onCanvasDiscountChange: (val: string) => void;
  canvasTheme: string;
  onCanvasThemeChange: (val: string) => void;
  canvasOverlayColor: string;
  onCanvasOverlayColorChange: (val: string) => void;
  instagramUsername: string;
  scheduleDate: string;
  onScheduleDateChange: (val: string) => void;
  scheduleTime: string;
  onScheduleTimeChange: (val: string) => void;
  onSchedulePost: (isImmediate: boolean) => Promise<void>;
}

export default function AiCreatorStudio({
  products,
  selectedProduct,
  onSelectProduct,
  aiPrompt,
  onAiPromptChange,
  customImagePrompt = "",
  onCustomImagePromptChange,
  aiTone,
  onAiToneChange,
  isGenerating,
  onGenerateAI,
  generatedText,
  onGeneratedTextChange,
  generatedImageUrl,
  imageTab,
  onImageTabChange,
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
}: AiCreatorStudioProps) {
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // 카드뉴스 캔버스 실시간 드로잉 렌더러 연동
  useEffect(() => {
    if (imageTab === "canvas") {
      renderCanvas();
    }
  }, [
    imageTab,
    selectedProduct,
    generatedImageUrl,
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

    canvas.width = 1080;
    canvas.height = 1080;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let imgSrc = "";
    if (selectedProduct?.main_image_url) {
      imgSrc = selectedProduct.main_image_url;
    } else if (generatedImageUrl) {
      imgSrc = generatedImageUrl;
    }

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";

    const drawCanvasOverlayAndText = () => {
      ctx.fillStyle = canvasOverlayColor || "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (canvasTheme === "gradient-gold") {
        ctx.strokeStyle = "#d4af37";
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
        ctx.shadowBlur = 0;
      } else if (canvasTheme === "modern-dark") {
        ctx.fillStyle = "rgba(15, 15, 20, 0.85)";
        ctx.fillRect(80, 720, canvas.width - 160, 260);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 2;
        ctx.strokeRect(80, 720, canvas.width - 160, 260);
      }

      ctx.textAlign = "center";

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

      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "500 42px sans-serif";
      const subTextY = canvasTheme === "modern-dark" ? 900 : 640;
      ctx.fillText(canvasSubtitle, canvas.width / 2, subTextY);
      ctx.restore();

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(`@${instagramUsername || "EGDESK_MARKETING_AI"}`, canvas.width / 2, 1020);
    };

    if (!imgSrc) {
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0, "#4f46e5");
      bgGrad.addColorStop(0.5, "#7c3aed");
      bgGrad.addColorStop(1, "#ec4899");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawCanvasOverlayAndText();
      return;
    }

    bgImg.onload = () => {
      const canvasRatio = canvas.width / canvas.height;
      const imgRatio = bgImg.width / bgImg.height;

      let drawW = canvas.width;
      let drawH = canvas.height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > canvasRatio) {
        drawW = canvas.height * imgRatio;
        offsetX = (canvas.width - drawW) / 2;
      } else {
        drawH = canvas.width / imgRatio;
        offsetY = (canvas.height - drawH) / 2;
      }

      ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);
      drawCanvasOverlayAndText();
    };

    bgImg.src = imgSrc;
  };

  return (
    <div className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm space-y-6 relative overflow-hidden text-left">
      {/* 아웃라인 상단 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-600 animate-pulse" />
          <h2 className="text-base font-bold text-slate-800">AI 크리에이터 스튜디오</h2>
          <span className="text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-200/60 px-2 py-0.5 rounded-full">
            3-Way Engine
          </span>
        </div>
        {selectedProduct && (
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            선택된 상품: <strong className="text-pink-600 font-bold">{selectedProduct.name}</strong>
          </div>
        )}
      </div>

      {/* 🚀 1. 상단 100% 대확장: 포스팅 대상 상품 선택 전체 4-5열 그리드 */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-pink-600" />
            포스팅 대상 상품 선택 (상단 넓은 공간 대확장)
          </label>
          <span className="text-[11px] text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full font-bold">
            총 {products.length}개 마스터 상품
          </span>
        </div>

        {/* 검색 필드 */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="상품명으로 빠르게 검색해보세요..."
            value={productSearchQuery}
            onChange={(e) => setProductSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium text-slate-800 placeholder-slate-400 shadow-sm"
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

        {/* 대형 반응형 4-5열 상품 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {(() => {
            const filtered = products.filter((prod) =>
              prod.name.toLowerCase().includes(productSearchQuery.toLowerCase())
            );
            if (filtered.length === 0) {
              return (
                <div className="col-span-full text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">일치하는 상품이 없습니다</p>
                  <p className="text-[10px] text-slate-400 mt-1">검색어를 확인하거나 새로운 상품을 등록해주세요.</p>
                </div>
              );
            }
            return filtered.map((prod) => (
              <button
                key={prod.id}
                onClick={() => onSelectProduct(prod)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                  selectedProduct?.id === prod.id
                    ? "border-pink-500 bg-pink-50/80 text-slate-800 ring-2 ring-pink-500/20 shadow-sm"
                    : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-100/80 hover:border-slate-300"
                }`}
              >
                {prod.main_image_url ? (
                  <img
                    src={prod.main_image_url}
                    alt={prod.name}
                    className="w-11 h-11 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate leading-tight">{prod.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {prod.price ? `${Number(prod.price).toLocaleString()}원` : "0원"}
                  </p>
                </div>
              </button>
            ));
          })()}
        </div>
      </div>

      {/* 2. 중단 섹션: 마케팅 프롬프트 & 어조 선택 & AI 카피라이팅 버튼 */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">마케팅 강조 프롬프트 (선택)</label>
            <input
              type="text"
              placeholder="예: 봄맞이 한정 파격 세일, 신뢰성 강조, 감성 텍스트 포함"
              value={aiPrompt}
              onChange={(e) => onAiPromptChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-pink-500 transition font-medium"
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">카피라이팅 어조</label>
            <select
              value={aiTone}
              onChange={(e) => onAiToneChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-pink-500 transition font-semibold text-slate-800"
            >
              <option value="인플루언서형 📝">인플루언서형 📝 (자연스러운 개인 추천)</option>
              <option value="세일즈 파워 🚀">세일즈 파워 🚀 (세일/혜택 강력 강조)</option>
              <option value="감성 라이프 🌿">감성 라이프 🌿 (트렌디 라이프스타일)</option>
              <option value="전문가 리뷰 🔬">전문가 리뷰 🔬 (신뢰감 높은 제품 스펙)</option>
            </select>
          </div>
        </div>

        {/* AI 프롬프트 직접 수정 아코디언 */}
        <div className="border border-purple-100 rounded-2xl p-3 bg-purple-50/30">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowPromptEditor(!showPromptEditor)}
              className="text-xs font-bold text-purple-700 flex items-center gap-1.5 hover:text-purple-900 transition border-0 bg-transparent cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 이미지 생성 프롬프트 직접 수정 / 보기</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPromptEditor(!showPromptEditor)}
              className="text-xs font-bold text-purple-600 border-0 bg-transparent cursor-pointer"
            >
              {showPromptEditor ? "▲ 접기" : "▼ 펼쳐서 프롬프트 수정하기"}
            </button>
          </div>

          {showPromptEditor && (
            <div className="mt-3 space-y-2 pt-2 border-t border-purple-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-800">Google Imagen 3 영문 렌더링 프롬프트</span>
                <button
                  type="button"
                  onClick={() => {
                    const autoPrompt = `High-end 8k commercial product photography of "${selectedProduct?.name || 'product'}", studio camera lighting, clean minimal background, realistic texture, crisp focus, photorealistic`;
                    if (onCustomImagePromptChange) onCustomImagePromptChange(autoPrompt);
                  }}
                  className="text-[10px] font-bold text-purple-600 bg-white hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg transition cursor-pointer"
                >
                  ✨ 추천 프롬프트로 세팅
                </button>
              </div>

              <textarea
                rows={3}
                value={customImagePrompt}
                onChange={(e) => onCustomImagePromptChange && onCustomImagePromptChange(e.target.value)}
                placeholder={`예: High-end 8k commercial product photography of item "${selectedProduct?.name || '상품명'}", studio photography, clean minimal background, realistic photo (비워두시면 선택된 상품 정보로 자동 조립됩니다)`}
                className="w-full bg-white border border-purple-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-purple-500 leading-relaxed resize-none shadow-inner-sm"
              />

              <p className="text-[10px] text-purple-500 font-medium leading-normal">
                💡 팁: 원하시는 사진의 분위기, 조명이나 장소를 영어로 직접 적으시면 AI가 100% 맞춤형 이미지를 생성합니다.
              </p>
            </div>
          )}
        </div>

        {/* AI 마케터 카피라이팅 & 이미지 생성 트리거 버튼 */}
        <button
          onClick={onGenerateAI}
          disabled={isGenerating}
          className="w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white flex items-center justify-center gap-2 hover:opacity-95 shadow-[0_4px_14px_rgba(236,72,153,0.3)] disabled:opacity-50 transition cursor-pointer border-0"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
          {isGenerating ? "AI가 기획 및 제작하는 중..." : "AI 마케터 카피라이팅 & 감성 이미지 생성"}
        </button>
      </div>

      {/* 🚀 3. 하단 나란히 수평 평행 배치 (6열 : 6열) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border-t border-slate-100 pt-6 items-stretch">
        {/* 좌측 하단 (6열): 인스타그램 본문 문구 피드 에디터 */}
        <div className="md:col-span-6 flex flex-col h-full justify-between space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              인스타그램 본문 문구 피드 에디터
            </label>
            <button
              type="button"
              onClick={() => {
                if (!generatedText) return;
                navigator.clipboard.writeText(generatedText);
                alert("피드 문구가 클립보드에 성공적으로 복사되었습니다!");
              }}
              className="text-[10px] font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              피드 문구 원터치 복사 📋
            </button>
          </div>

          <textarea
            rows={14}
            value={generatedText}
            onChange={(e) => onGeneratedTextChange(e.target.value)}
            placeholder="생성 버튼을 누르면 AI가 상품 기반 피드를 만듭니다. 여기에 직접 멋진 글을 편집하거나 적을 수도 있습니다."
            className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 focus:outline-none focus:border-pink-500 focus:bg-white leading-relaxed resize-none transition"
          />
        </div>

        {/* 우측 하단 (6열): 아래로 이동된 이미지 크리에이터 소스 (3-Way) (좌측 문구 에디터와 1:1 완벽 수평 정렬) */}
        <div className="md:col-span-6 flex flex-col h-full justify-between space-y-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">이미지 크리에이터 소스 (3-Way)</label>
            <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-sm">
              <button
                onClick={() => onImageTabChange("product")}
                className={`text-[10px] font-bold py-2 rounded-lg transition cursor-pointer border-0 ${
                  imageTab === "product"
                    ? "bg-pink-500 text-white shadow-sm font-extrabold"
                    : "bg-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                자체 상품컷
              </button>
              <button
                onClick={() => onImageTabChange("ai")}
                className={`text-[10px] font-bold py-2 rounded-lg transition cursor-pointer border-0 ${
                  imageTab === "ai"
                    ? "bg-purple-600 text-white shadow-sm font-extrabold"
                    : "bg-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                AI 감성생성
              </button>
              <button
                onClick={() => onImageTabChange("canvas")}
                className={`text-[10px] font-bold py-2 rounded-lg transition cursor-pointer border-0 ${
                  imageTab === "canvas"
                    ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                    : "bg-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                카드뉴스 합성
              </button>
            </div>
          </div>

          {/* 세부 3-Way 뷰포트 (좌측 문구 에디터 높이에 딱 맞춰 물리 렌더링) */}
          <div className="flex-1 min-h-[260px] bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-3">
            {imageTab === "product" && (
              <div className="flex flex-col h-full justify-between space-y-3">
                <div className="flex-1 min-h-[200px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative">
                  {selectedProduct?.main_image_url ? (
                    <img src={selectedProduct.main_image_url} alt="선택된 상품" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-500 font-semibold">선택된 상품컷 이미지가 없습니다.</p>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-slate-800/80 px-2 py-0.5 rounded text-[9px] text-white font-medium">
                    기본 상품 이미지
                  </div>
                </div>

                <label className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl py-2.5 hover:border-pink-500/50 cursor-pointer bg-slate-50 hover:bg-pink-50/50 transition">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-600">커스텀 상품 이미지 수동 로드</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onLocalImageUpload} />
                </label>
              </div>
            )}

            {imageTab === "ai" && (
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 min-h-[220px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative">
                  {generatedImageUrl ? (
                    <img src={generatedImageUrl} alt="생성된 감성컷" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-1.5 animate-bounce" />
                      <p className="text-xs font-bold text-slate-600">AI 감성컷 생성 대기 중</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        위 생성 버튼을 누르면 AI가 상품 맞춤 감성 라이프스타일 컷을 빌드합니다.
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-purple-600 px-2 py-0.5 rounded text-[9px] text-white font-medium shadow-sm">
                    AI 가상 감성 픽업
                  </div>
                </div>
              </div>
            )}

            {imageTab === "canvas" && (
              <div className="flex flex-col h-full space-y-3">
                <div className="flex-1 min-h-[160px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative">
                  <canvas ref={canvasRef} className="w-full h-full object-contain" />
                  <div className="absolute bottom-2 left-2 bg-indigo-600 px-2 py-0.5 rounded text-[9px] text-white font-medium">
                    Canvas 카드뉴스 합성
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">메인 제목</label>
                    <input
                      type="text"
                      value={canvasTitle}
                      onChange={(e) => onCanvasTitleChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">서브 텍스트</label>
                    <input
                      type="text"
                      value={canvasSubtitle}
                      onChange={(e) => onCanvasSubtitleChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
