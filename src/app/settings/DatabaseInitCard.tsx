'use client';

import React, { useState } from 'react';
import { Database, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function DatabaseInitCard() {
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 데이터베이스 테이블 빌드 및 관리자 생성 원클릭 통합 핸들러
  const handleSystemInitialize = async () => {
    const confirmSetup = window.confirm(
      '⚡ 원클릭 시스템 빌드 및 동기화를 시작하시겠습니까?\n' +
      '이 작업은 필수 데이터베이스 테이블 스키마를 동기화하고, 기본 최고관리자 계정을 자동 주입합니다.'
    );
    if (!confirmSetup) return;

    setLoading(true);
    setMessage(null);

    try {
      // 1단계: 필수 테이블 스키마 생성 및 동기화 (/api/setup)
      const resSetup = await apiFetch('/api/setup');
      const dataSetup = await resSetup.json();

      if (!dataSetup.success) {
        throw new Error(dataSetup.error || '데이터베이스 테이블 동기화에 실패했습니다.');
      }

      // 2단계: 최고관리자 계정 안전 생성 및 정비 (/api/setup-admin)
      const resAdmin = await apiFetch('/api/setup-admin');
      const dataAdmin = await resAdmin.json();

      if (!dataAdmin.success) {
        throw new Error(dataAdmin.error || '최고관리자 계정 생성에 실패했습니다.');
      }

      // 성공 피드백 표기
      setMessage({
        type: 'success',
        text: '데이터베이스 테이블 빌드 및 최고관리자 계정(admin) 세팅이 원클릭으로 완벽하게 완료되었습니다! 즉시 서비스를 이용하실 수 있습니다. ⚡🔑'
      });
    } catch (err: any) {
      console.error('System initialization error:', err);
      setMessage({
        type: 'error',
        text: err.message || '시스템 초기화 도중 예상치 못한 오류가 발생했습니다. 다시 시도해 주세요.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md mt-6 p-5 relative overflow-hidden">
      {/* 컴팩트 가로 1행 구성 */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-5">
        
        {/* 1. 타이틀 및 요약 설명 (왼쪽) */}
        <div className="flex items-center gap-3 w-full xl:w-auto min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              데이터베이스 및 시스템 동기화
              <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                원클릭 초기화
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate leading-relaxed">
              필수 테이블 스키마 구축 및 최고관리자 마스터 계정(<code>admin</code>) 셋업을 동시에 처리합니다.
            </p>
          </div>
        </div>

        {/* 2. 안전/경고 미니 배너 (가운데) */}
        <div className="flex-1 max-w-xl w-full xl:w-auto bg-amber-50/60 border border-amber-100/60 px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-[11px] text-amber-800">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-medium leading-normal">
            <strong>최초 설치/PC 교체 시 필수 실행</strong> (기존 비즈니스 데이터는 안전하게 보존되며 누락된 테이블만 빌드됨)
          </span>
        </div>

        {/* 3. 제어 액션 영역 (오른쪽) */}
        <div className="flex items-center gap-2 w-full xl:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={handleSystemInitialize}
            disabled={loading}
            className={`flex-1 xl:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all border-0 shadow-sm ${
              loading
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 cursor-pointer'
            }`}
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            <span>원클릭 시스템 빌드 및 동기화</span>
          </button>
          <a
            href="/api/setup"
            target="_blank"
            rel="noreferrer"
            className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-55/60 hover:text-slate-700 transition-colors bg-white shrink-0"
            title="새 창으로 API 직접 실행"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

      </div>

      {/* 결과 메시지 피드백 팝업 알림 (조건부 표출) */}
      {message && (
        <div
          className={`mt-4 flex items-start gap-2.5 p-3 rounded-xl border text-[11px] font-semibold animate-fadeIn ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{message.text}</span>
        </div>
      )}
    </div>
  );
}
