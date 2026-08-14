"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Users, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  BellRing, 
  XCircle,
  UtensilsCrossed,
  Sparkles
} from "lucide-react";

export default function CustomerWaitingStatusPage() {
  const params = useParams();
  const router = useRouter();
  const waitingId = params?.id as string;

  const [waitingData, setWaitingData] = useState<any>(null);
  const [aheadCount, setAheadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 대기 상태 단건 조회 함수
  const fetchStatus = async () => {
    if (!waitingId) return;
    try {
      setRefreshing(true);
      const res = await fetch(`/api/waitings?id=${waitingId}`);
      const data = await res.json();
      if (data.success && data.waiting) {
        setWaitingData(data.waiting);
        setAheadCount(data.aheadCount || 0);

        // 만약 방금 호출(CALLED)되었을 때 진동 알림
        if (data.waiting.status === 'CALLED' && typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 400]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch waiting status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // 5초마다 실시간 순서 자동 갱신
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [waitingId]);

  // 대기 취소 처리
  const handleCancel = async () => {
    if (!confirm('대기를 취소하시겠습니까? 취소 후에는 다시 등록하셔야 합니다.')) {
      return;
    }
    try {
      const res = await fetch('/api/waitings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: waitingId, action: 'cancel' })
      });
      const data = await res.json();
      if (data.success) {
        alert('대기가 취소되었습니다.');
        router.push('/waiting');
      }
    } catch (err) {
      alert('취소 처리 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 text-sm font-bold">대기 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!waitingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 border border-slate-200 shadow-sm">
          <XCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-black text-slate-800">대기 정보를 찾을 수 없습니다</h2>
          <p className="text-xs text-slate-500">이미 취소되었거나 유효하지 않은 대기표입니다.</p>
          <button
            onClick={() => router.push('/waiting')}
            className="w-full py-3 bg-orange-600 text-white font-bold text-xs rounded-xl border-0 cursor-pointer"
          >
            새로 대기 등록하기
          </button>
        </div>
      </div>
    );
  }

  const isCalled = waitingData.status === 'CALLED';
  const isSeated = waitingData.status === 'SEATED';
  const isCancelled = waitingData.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md mx-auto w-full space-y-5">
        
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span className="text-sm font-black text-slate-900">모바일 대기표</span>
          </div>

          <button
            onClick={fetchStatus}
            disabled={refreshing}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-600' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>

        {/* 🚨 1. 입장 호출 알림 배너 (호출되었을 때) */}
        {isCalled && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl p-6 shadow-xl shadow-emerald-500/20 text-center space-y-2 animate-bounce">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-2xl">
              <BellRing className="w-7 h-7 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-black">테이블이 준비되었습니다!</h2>
            <p className="text-emerald-100 text-xs font-medium">
              지금 매장 카운터로 입장해 주시기 바랍니다.
            </p>
          </div>
        )}

        {/* 2. 착석 완료 안내 */}
        {isSeated && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-black">착석이 완료되었습니다</h2>
            <p className="text-slate-400 text-xs">
              {waitingData.assigned_table ? `테이블 ${waitingData.assigned_table}번에 착석하셨습니다.` : '즐거운 식사 되세요!'}
            </p>
          </div>
        )}

        {/* 3. 대기표 메인 카드 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm text-center space-y-6 relative overflow-hidden">
          
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400">내 대기 번호</span>
            <div className="text-6xl font-black text-orange-600 tracking-tight flex items-center justify-center gap-2">
              <span>{waitingData.waiting_no}</span>
              <span className="text-2xl text-slate-400 font-bold">번</span>
            </div>
            <p className="text-slate-600 font-bold text-xs pt-1">
              {waitingData.customer_name} ({waitingData.party_size}명)
            </p>
          </div>

          {/* 내 앞 대기 팀 현황 */}
          {!isCalled && !isSeated && !isCancelled && (
            <div className="bg-orange-50/80 rounded-2xl p-5 border border-orange-200/60 space-y-1">
              <span className="text-xs font-bold text-orange-800">현재 내 앞 대기</span>
              <div className="text-3xl font-black text-slate-900">
                {aheadCount === 0 ? (
                  <span className="text-orange-650 flex items-center justify-center gap-1">
                    <Sparkles className="w-5 h-5" />
                    다음 입장 차례입니다!
                  </span>
                ) : (
                  <span>{aheadCount}팀</span>
                )}
              </div>
              <p className="text-[11px] text-orange-700 font-medium pt-1">
                예상 대기 시간: 약 {Math.max(3, aheadCount * 8)}분
              </p>
            </div>
          )}

          {/* 접수 상세 정보 */}
          <div className="border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-400">접수 일시</span>
              <span className="font-bold text-slate-700">{waitingData.created_at || '방금'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">연락처</span>
              <span className="font-bold text-slate-700">{waitingData.customer_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">상태</span>
              <span className={`font-black px-2 py-0.5 rounded-md text-[10px] ${
                isCalled ? 'bg-emerald-100 text-emerald-800' :
                isSeated ? 'bg-slate-200 text-slate-800' :
                isCancelled ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-900'
              }`}>
                {isCalled ? '입장 호출 중' : isSeated ? '착석 완료' : isCancelled ? '대기 취소' : '대기 접수중'}
              </span>
            </div>
          </div>

          {/* 대기 취소 버튼 */}
          {!isSeated && !isCancelled && (
            <button
              onClick={handleCancel}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition-all border-0 cursor-pointer"
            >
              대기 취소하기
            </button>
          )}

        </div>

        {/* 안내문구 */}
        <div className="bg-slate-100/80 rounded-2xl p-4 text-[11px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
            유의사항
          </p>
          <p>• 호출 문자를 받으신 후 5분 내로 매장에 오지 않으시면 다음 순서로 넘어갑니다.</p>
          <p>• 새로고침 버튼을 누르시면 실시간으로 대기 순서를 확인하실 수 있습니다.</p>
        </div>

      </div>

      <footer className="text-center text-[10px] text-slate-400 py-4">
        © EGDESK Smart Waiting System
      </footer>
    </div>
  );
}
