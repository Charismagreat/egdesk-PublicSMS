"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Smartphone, Camera, CheckSquare, Users, MapPin, 
  Sparkles, CheckCircle2, Shield, ArrowRight, Layers 
} from "lucide-react";

export default function MobilePortalSection() {
  const mobileFeatures = [
    {
      icon: CheckSquare,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      title: "모바일 원터치 전자결재",
      desc: "외근이나 출장 중에도 지출결의서, 영수증 증빙, 견적 결재를 스마트폰에서 1초 만에 승인/반려합니다."
    },
    {
      icon: Camera,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      title: "현장 AI 스냅태스크 보고",
      desc: "공장 설비, 시공 현장, 하자 사진을 스마트폰 카메라로 촬영하면 AI가 상황을 분석하여 전사 피드에 즉시 공유합니다."
    },
    {
      icon: Users,
      color: "bg-purple-50 text-purple-600 border-purple-100",
      title: "카메라 스마트 명함 스캔",
      desc: "미팅 후 받은 종이 명함을 촬영하면 이름, 직함, 연락처, 이메일을 OCR로 정확히 인식해 전사 거래처 장부에 등록합니다."
    },
    {
      icon: MapPin,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      title: "GPS 기반 모바일 출퇴근",
      desc: "현장 및 외근지 출퇴근을 스마트폰 위치 기반으로 투명하게 기록하여 인사/근태 관리 AI와 실시간 연동합니다."
    }
  ];

  return (
    <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* 배경 은은한 빛 */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 헤더 */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black">
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span>EGDesk All-in-One Mobile Portal</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            PC 앞이 아니어도 완벽한 업무 통제, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              모바일 임직원 전용 포털 (/m)
            </span>
          </h2>

          <p className="text-base text-slate-400 font-medium">
            대표님의 출장길 결재부터 현장 근로자의 사진 보고까지, 별도 앱 설치 없이 모바일 웹 브라우저 하나로 모든 사내 시스템이 완벽하게 연동됩니다.
          </p>
        </div>

        {/* 2열 레이아웃: 좌측 모바일 목업 카드 & 우측 4대 핵심 기능 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* 좌측: 모바일 실물 UX 목업 카드 */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-slate-950 border-4 border-slate-800 rounded-[2.5rem] p-4 shadow-2xl relative overflow-hidden">
              {/* 스마트폰 상단 노치 */}
              <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-4" />

              {/* 스마트폰 내부 화면 UI */}
              <div className="bg-slate-900 rounded-2xl p-4 space-y-3.5 text-left border border-slate-800/80">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-black">
                      EG
                    </div>
                    <span className="text-xs font-bold text-white">이지데스크 모바일</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    실시간 연결됨
                  </span>
                </div>

                {/* 오늘의 결재 대기 카드 */}
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-300">결재 대기 문서</span>
                    <span className="text-indigo-400 font-black">2건</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    [지출결의] 8월 자재 매입대금 (3,400,000원)
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <button className="flex-1 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold">
                      원터치 승인
                    </button>
                    <button className="py-1 px-2.5 bg-slate-700 text-slate-300 rounded-lg text-[10px]">
                      상세
                    </button>
                  </div>
                </div>

                {/* 빠른 현장 액션 버튼 그리드 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/40 text-center space-y-1">
                    <Camera className="w-4 h-4 text-emerald-400 mx-auto" />
                    <span className="text-[10px] font-bold block text-slate-200">스냅태스크 촬영</span>
                  </div>
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/40 text-center space-y-1">
                    <Users className="w-4 h-4 text-purple-400 mx-auto" />
                    <span className="text-[10px] font-bold block text-slate-200">명함 스캔 등록</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 4대 핵심 기능 그리드 */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mobileFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -3 }}
                  className="bg-slate-800/80 border border-slate-700/70 hover:border-indigo-500/50 rounded-3xl p-6 transition-all space-y-3"
                >
                  <div className={`p-3 rounded-2xl border w-max ${feat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-white">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
