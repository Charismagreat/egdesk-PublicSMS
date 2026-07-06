"use client";

import React from "react";
import { HoverImage } from "../types";

interface ImagePreviewProps {
  hoverImage: HoverImage | null;
}

export function ImagePreview({ hoverImage }: ImagePreviewProps) {
  if (!hoverImage) return null;

  return (
    <div 
      className="fixed z-[100] pointer-events-none bg-white p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200"
      style={{ 
        left: hoverImage.x + 20, 
        top: Math.max(20, hoverImage.y - 125), // 마우스 세로 중심에 맞추고 뷰 경계 조율
        width: '250px',
        height: '250px'
      }}
    >
      <img src={hoverImage.url} alt="Preview" className="w-full h-full object-contain rounded-xl" />
    </div>
  );
}
