import React from "react";

export function HeroSection() {
  return (
    <div className="relative overflow-hidden bg-slate-900 text-white pb-12 pt-24 sm:pt-32 lg:pt-40">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[1000px] h-[1000px] rounded-full bg-gradient-to-bl from-blue-500/30 to-purple-600/40 blur-3xl opacity-60 animate-pulse mix-blend-screen" style={{ animationDuration: '8s' }}></div>
        <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-cyan-400/20 to-blue-600/30 blur-3xl opacity-50 mix-blend-screen"></div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center sm:text-left">
        <div className="max-w-3xl">
          <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-slate-300 tracking-tight mb-8 leading-[1.1]">
            가장 완벽한 상품을<br />가장 빠르게.
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-10 font-medium max-w-2xl leading-relaxed">
            최고의 품질을 자랑하는 다양한 상품들이 준비되어 있습니다.<br className="hidden sm:block" />지금 바로 확인하시고 간편하게 주문하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
