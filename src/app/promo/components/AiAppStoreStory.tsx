"use client";

import React from "react";
import { 
  Lock, 
  Users, 
  Database, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  FolderArchive, 
  Layers, 
  Laptop, 
  Share2, 
  ShieldCheck, 
  Server,
  UserX,
  Boxes
} from "lucide-react";

export default function AiAppStoreStory() {
  return (
    <section id="ai-app-store-story" className="scroll-mt-20 py-20 md:py-28 bg-slate-900 text-slate-100 relative overflow-hidden">
      {/* 배경 은은한 조명 */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* 파트 1: 시대적 변화 & 숨겨진 병목 현상 */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>THE REAL BOTTLENECK IN ENTERPRISE AI</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            AI로 앱 만들기는 쉬워졌지만,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-rose-300">
              공유와 배포는 왜 막혀버릴까요?
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed">
            비개발자도 실무 도메인 지식으로 업무 효율을 높여줄 AI 에이전트 툴들을 쏟아내는 시대입니다.<br className="hidden sm:inline" />
            그러나 <strong>&quot;혼자 쓰는 단계&quot;</strong>를 지나 <strong>&quot;팀과 회사 전체로 확산시키는 단계&quot;</strong>에 들어서면 반드시 거대한 벽에 부딪힙니다.
          </p>
        </div>

        {/* 3대 현실적 병목 카드 */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 w-full mx-auto">
          
          {/* 병목 1: 외부 배포 불가 & 보안 위험 */}
          <div className="bg-slate-800/80 rounded-3xl p-7 border border-slate-700/80 hover:border-rose-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-400 flex items-center justify-center mb-5">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-rose-400 mb-1">병목 01. 보안과 유출 리스크</div>
              <h3 className="text-xl font-bold text-white mb-3">
                &quot;외부 배포는 보안 때문에 안 됩니다&quot;
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                공용 클라우드나 웹에 배포하자니 고객 정보, 단가표, 재무 데이터가 외부로 유출될까 두려워 결국 사내 배포를 포기하게 됩니다.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-700/60 text-xs text-rose-300 font-medium">
              ❌ 보안 검증 없는 외부 호스팅 불가
            </div>
          </div>

          {/* 병목 2: 노트북에 갇혀 사장화 */}
          <div className="bg-slate-800/80 rounded-3xl p-7 border border-slate-700/80 hover:border-amber-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-800/60 text-amber-400 flex items-center justify-center mb-5">
                <UserX className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-amber-400 mb-1">병목 02. 개인화 및 지식 사장화</div>
              <h3 className="text-xl font-bold text-white mb-3">
                &quot;만든 사람이 퇴사하면 사라집니다&quot;
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                개인 노트북에만 두고 나 혼자 쓰다가, 담당자가 이직하거나 PC를 바꾸면 그 유용한 AI 툴이 영영 사장되어 전사 자산화되지 못합니다.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-700/60 text-xs text-amber-300 font-medium">
              ❌ 전사 공유 통로 없는 섀도우 AI
            </div>
          </div>

          {/* 병목 3: 사내 데이터 권한 연동 불가 */}
          <div className="bg-slate-800/80 rounded-3xl p-7 border border-slate-700/80 hover:border-purple-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800/60 text-purple-400 flex items-center justify-center mb-5">
                <FolderArchive className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-purple-400 mb-1">병목 03. 데이터 권한 설정 한계</div>
              <h3 className="text-xl font-bold text-white mb-3">
                &quot;사내 데이터를 못 붙여 반쪽짜리 툴로 전락&quot;
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                진짜 쓸모 있으려면 사내 DB를 봐야 하는데, IT 전담팀이 없거나 수십 개 앱에 맞춘 보안/권한 통제가 불가능해 결국 버려집니다.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-700/60 text-xs text-purple-300 font-medium">
              ❌ 복잡한 권한 설정 감당 불가
            </div>
          </div>

        </div>

        {/* 파트 2: EGDESK 사내 AI 앱스토어 솔루션 공개 */}
        <div className="mt-20 w-full mx-auto bg-gradient-to-br from-indigo-950/90 via-slate-800/90 to-slate-900/90 rounded-3xl p-8 sm:p-12 border border-indigo-700/50 shadow-2xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 mb-3">
              <Boxes className="w-3.5 h-3.5" />
              <span>THE SOLUTION</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              그래서 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">EGDESK</span>를 만들었습니다
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              중소기업을 위한 프라이빗 사내 AI 앱스토어 &amp; 데이터 플랫폼
            </p>
          </div>

          {/* EGDESK 3대 플랫폼 기둥 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 기둥 1: 안전한 사내 배포 */}
            <div className="bg-slate-900/90 p-6 rounded-2xl border border-indigo-800/50 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">
                  1. 안전한 사내 배포
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  사내 인증된 구성원만 접근할 수 있는 격리된 프라이빗 환경을 제공하여 외부 유출 걱정 없이 안심하고 배포합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 사내 인증 구성원 전용 접근
              </div>
            </div>

            {/* 기둥 2: 권한·이력 관리 */}
            <div className="bg-slate-900/90 p-6 rounded-2xl border border-indigo-800/50 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">
                  2. 권한·이력 완벽 관리
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  로그인, 역할별 세부 권한 분기, 전사 7종 감사 이력(Audit Trail)을 단일 관제탑에서 완벽하게 통제합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 7종 감사 이력 &amp; 역할별 통제
              </div>
            </div>

            {/* 기둥 3: 사내 데이터 연동 */}
            <div className="bg-slate-900/90 p-6 rounded-2xl border border-indigo-800/50 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">
                  3. 사내 데이터 안전 연동
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  귀사의 실물 데이터(견적·재고·영수증·규정)와 직접 연결되어 사용자 권한에 맞는 데이터만 안전하게 AI 앱에 공급합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Zero-Leak 프라이빗 데이터 허브
              </div>
            </div>

          </div>

          {/* 하단 요약 문구 */}
          <div className="mt-8 text-center text-xs sm:text-sm text-indigo-200 font-medium">
            💡 직원들이 필요로 하는 수많은 AI 앱을 안전하게 올려두고, 회사 전체의 무기로 확산시키세요.
          </div>
        </div>

      </div>
    </section>
  );
}
