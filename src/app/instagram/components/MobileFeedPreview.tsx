"use client";

import React from "react";
import { Eye, Heart, MessageCircle, Send, Layers, Image as ImageIcon } from "lucide-react";
import { Product, InstagramPost } from "../types";
import { InstagramIcon } from "./InstagramHeader";

interface MobileFeedPreviewProps {
  /**
   * 예약/발행 목록 중 선택된 미리보기 포스트 상태
   */
  selectedPostForPreview: InstagramPost | null;
  /**
   * 이미지 크리에이터 소스 (3-Way)
   */
  imageTab: "product" | "ai" | "canvas";
  /**
   * 선택된 상품
   */
  selectedProduct: Product | null;
  /**
   * AI로 생성된 이미지 URL
   */
  generatedImageUrl: string;
  /**
   * 생성된 마케팅 문구 피드
   */
  generatedText: string;
  /**
   * 인스타 아이디
   */
  instagramUsername: string;
}

/**
 * 모바일 폰 렌더링 라이브 프리뷰 컴포넌트
 */
export default function MobileFeedPreview({
  selectedPostForPreview,
  imageTab,
  selectedProduct,
  generatedImageUrl,
  generatedText,
  instagramUsername,
}: MobileFeedPreviewProps) {
  return (
    <div className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm relative overflow-hidden flex flex-col items-center">
      <div className="w-full flex items-center gap-2 border-b border-slate-100 pb-4 mb-6 text-left">
        <Eye className="w-5 h-5 text-pink-600" />
        <h2 className="text-base font-bold text-slate-800">인스타 모바일 실시간 미리보기</h2>
      </div>

      {/* 디바이스 목업 프레임 */}
      <div className="w-[300px] h-[580px] rounded-[45px] border-[10px] border-[#27272a] bg-white shadow-[0_15px_30px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col">
        {/* 스피커 & 노치 */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-[#27272a] rounded-b-2xl z-30 flex items-center justify-center">
          <div className="w-12 h-1 bg-black rounded-full mb-1" />
        </div>

        {/* 인스타 헤더 */}
        <div className="pt-8 px-4 pb-2 border-b border-slate-100 bg-white flex justify-between items-center text-slate-800 relative z-20 select-none">
          <span className="font-extrabold text-sm tracking-tight italic">Instagram</span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CHARISMA</span>
        </div>

        {/* 프리뷰 바디 (스크롤뷰) */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-white text-slate-800 text-xs">
          {/* 포스트 상단 계정 정보 */}
          <div className="p-3 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[1.5px]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center border border-white">
                  <InstagramIcon className="w-3.5 h-3.5 text-slate-800" />
                </div>
              </div>
              <div className="text-left">
                <p className="font-extrabold text-[10px] text-slate-800">@{instagramUsername || "instagram_user"}</p>
                <p className="text-[8px] text-slate-500 font-medium">Sponsored • AI Autopilot</p>
              </div>
            </div>
            <span className="font-bold tracking-widest text-slate-400 text-sm">•••</span>
          </div>

          {/* 포스트 이미지 */}
          <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100 relative">
            {selectedPostForPreview ? (
              selectedPostForPreview.image_url ? (
                <img src={selectedPostForPreview.image_url} alt="프리뷰" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                  <p className="text-[9px] text-slate-400 font-bold">피드 이미지가 존재하지 않습니다</p>
                </div>
              )
            ) : imageTab === "product" && selectedProduct?.main_image_url ? (
              <img src={selectedProduct.main_image_url} alt="프리뷰" className="w-full h-full object-cover" />
            ) : imageTab === "ai" && generatedImageUrl ? (
              <img src={generatedImageUrl} alt="프리뷰" className="w-full h-full object-cover" />
            ) : imageTab === "canvas" ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-bold">
                <p className="animate-pulse">카드뉴스 캔버스 생성 중...</p>
              </div>
            ) : (
              <div className="text-center p-4">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <p className="text-[9px] text-slate-400 font-bold">피드 이미지가 존재하지 않습니다</p>
              </div>
            )}
          </div>

          {/* 피드 액션 바 */}
          <div className="p-3 flex justify-between items-center text-slate-800">
            <div className="flex gap-3">
              <Heart className="w-4 h-4 text-slate-700" />
              <MessageCircle className="w-4 h-4 text-slate-700" />
              <Send className="w-4 h-4 text-slate-700" />
            </div>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>

          {/* 좋아요 개수 & 본문 */}
          <div className="px-3 pb-4 space-y-1 leading-relaxed text-slate-800 text-left">
            <p className="font-bold text-[10px]">
              좋아요 {selectedPostForPreview ? selectedPostForPreview.likes_count || 0 : 0}개
            </p>
            <p className="text-[10px] break-all leading-normal">
              <span className="font-bold mr-1.5">@{instagramUsername || "instagram_user"}</span>
              {selectedPostForPreview
                ? selectedPostForPreview.content
                : generatedText
                ? generatedText
                : "아름다운 감성 디자인으로 일상에 품격을 더해보세요. 지금 바로 가치를 확인하세요."}
            </p>
            <p className="text-[8px] text-slate-400 uppercase mt-2 font-bold">
              {selectedPostForPreview
                ? selectedPostForPreview.status === "POSTED"
                  ? `${
                      selectedPostForPreview.posted_at
                        ? new Date(selectedPostForPreview.posted_at).toLocaleDateString("ko-KR")
                        : ""
                    } 발행 완료`
                  : `${
                      selectedPostForPreview.scheduled_at
                        ? new Date(selectedPostForPreview.scheduled_at).toLocaleDateString("ko-KR")
                        : ""
                    } 발행 예약`
                : "1분 전"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
