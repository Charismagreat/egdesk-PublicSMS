"use client";

import React from "react";
import { X, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, ExternalLink, HelpCircle } from "lucide-react";

interface GoogleAuthGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GoogleAuthGuideModal({ isOpen, onClose }: GoogleAuthGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-scale-in text-left">
        {/* 모달 헤더 */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">
                구글 시트 최초 1회 권한 승인 가이드
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                구글 정책상 새로 주입된 Apps Script 커스텀 메뉴를 처음 누를 때 1회 승인이 필요합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 단계별 안내 카드 */}
        <div className="space-y-3.5 text-xs">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>상단 메뉴 클릭 후 [권한 필요] 팝업 확인</span>
            </div>
            <p className="text-slate-600 pl-7 text-[11px] leading-relaxed">
              구글 시트 상단 메뉴바의 <strong className="text-indigo-600 font-bold">[⚡ 이지데스크 자동화]</strong> 하위 메뉴를 클릭하면, <span className="bg-white px-1.5 py-0.5 rounded border text-slate-700 font-bold">권한 검토(Authorization Required)</span> 알림창이 뜹니다. <strong className="text-slate-800">[계속(Continue)]</strong> 버튼을 클릭합니다.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
              <span>구글 계정 선택 후 [고급(Advanced)] 클릭</span>
            </div>
            <p className="text-slate-600 pl-7 text-[11px] leading-relaxed">
              본인의 구글 계정을 선택한 후, <span className="text-amber-700 font-bold">"Google에서 확인하지 않은 앱입니다"</span> 경고 화면이 나타나면 좌측 하단의 <strong className="text-indigo-600 font-bold underline cursor-pointer">[고급(Advanced)]</strong> 링크를 클릭합니다.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
              <span>[안전하지 않은 페이지로 이동] → [허용(Allow)]</span>
            </div>
            <p className="text-slate-600 pl-7 text-[11px] leading-relaxed">
              하단에 펼쳐지는 <strong className="text-slate-800 font-bold">[이지데스크 스크립트(으)로 이동(안전하지 않음)]</strong>을 클릭한 후, 마지막으로 <strong className="text-emerald-700 font-bold">[허용(Allow)]</strong> 버튼을 누르면 권한 승인이 즉시 완료됩니다.
            </p>
          </div>
        </div>

        {/* 도움말 안내 상자 */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">이 작업은 최초 1회만 수행하면 됩니다.</p>
            <p className="text-[11px] text-emerald-700 leading-snug">
              승인 후에는 같은 시트에서 언제든지 메뉴 클릭 한 번으로 모든 자동화 기능이 즉시 실행됩니다.
            </p>
          </div>
        </div>

        {/* 모달 닫기 버튼 */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs border-none"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
