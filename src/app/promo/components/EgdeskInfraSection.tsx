"use client";

import React from "react";
import { Server, Shield, RefreshCw, Cpu, FileCheck, CheckCircle2, Lock, HardDrive, Terminal } from "lucide-react";
import { EGDESK_INFRA_FEATURES } from "../data/featuresData";

export default function EgdeskInfraSection() {
  const infraIcons: Record<string, React.ReactNode> = {
    Shield: <Shield className="w-6 h-6 text-emerald-600" />,
    RefreshCw: <RefreshCw className="w-6 h-6 text-blue-600" />,
    Cpu: <Cpu className="w-6 h-6 text-indigo-600" />,
    FileCheck: <FileCheck className="w-6 h-6 text-purple-600" />
  };

  return (
    <section id="egdesk-server" className="scroll-mt-20 py-20 md:py-28 bg-slate-900 text-slate-100 relative overflow-hidden">
      {/* 배경 장식 원형 조명 */}
      <div className="absolute top-1/2 -left-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 mb-4">
            <Server className="w-3.5 h-3.5" />
            <span>ENTERPRISE INFRASTRUCTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            검증된 프라이빗 엔진, <strong>이지데스크(EGDesk) 서버</strong>
          </h2>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            귀사의 소중한 고객 명단, 견적 단가, 금융 영수증이 외부 상용 클라우드에 노출되지 않습니다.<br className="hidden sm:inline" />
            전용 프라이빗 서버 위에서 100% 안전하게 동작하는 엔터프라이즈 아키텍처를 경험하세요.
          </p>
        </div>

        {/* 4대 핵심 인프라 특장점 그리드 */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {EGDESK_INFRA_FEATURES.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-800/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-800 transition-all shadow-lg"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center mb-6 shadow-inner">
                {infraIcons[item.iconName]}
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-3">
                {item.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* 배포 및 도입 옵션 배너 */}
        <div className="mt-16 bg-gradient-to-r from-slate-800/90 to-indigo-950/80 rounded-3xl p-8 sm:p-10 border border-indigo-800/40 shadow-xl max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 uppercase">
                <CheckCircle2 className="w-4 h-4" />
                <span>유연한 2가지 배포 옵션 제공</span>
              </div>
              <h4 className="text-2xl font-black text-white">
                사내 설치형(On-Premise) 또는 전용 단독 클라우드
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                전산실 PC/서버에 직접 설치하거나, 당사가 구축해 드리는 독립 단독 클라우드 인스턴스로 1분 만에 가동할 수 있습니다. 전담 IT 인력이 없어도 자가 치유(Auto-Healing) 메커니즘으로 무결한 영구 운영이 보장됩니다.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">사내 PC / 로컬 서버 패키지</div>
                  <div className="text-[11px] text-slate-400">데이터 완전 로컬 보관 (통신비 0원 페어링)</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center gap-3">
                <Lock className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">단독 프라이빗 클라우드</div>
                  <div className="text-[11px] text-slate-400">귀사 단독 인스턴스 격리 호스팅</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
