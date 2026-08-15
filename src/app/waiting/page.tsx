"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Phone, 
  User, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  UtensilsCrossed
} from "lucide-react";

export default function CustomerWaitingRegistrationPage() {
  const router = useRouter();
  const [partySize, setPartySize] = useState<number>(2);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [currentWaitingCount, setCurrentWaitingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAgreed, setIsAgreed] = useState<boolean>(true);

  // 현재 활성 대기 팀 수 조회
  useEffect(() => {
    const fetchWaitingStats = async () => {
      try {
        const res = await fetch('/api/waitings');
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const data = await res.json();
        if (data.success) {
          setCurrentWaitingCount(data.activeCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch waitings:', err);
      }
    };
    fetchWaitingStats();
    const interval = setInterval(fetchWaitingStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // 전화번호 자동 하이픈 포맷팅
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    let formatted = raw;
    if (raw.length > 3 && raw.length <= 7) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
    } else if (raw.length > 7) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
    }
    setCustomerPhone(formatted);
  };

  // 대기 등록 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      alert('휴대폰 번호를 올바르게 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/waitings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partySize,
          customerName: customerName.trim() || undefined,
          customerPhone: cleanPhone
        })
      });
      const data = await res.json();
      if (data.success && data.waitingId) {
        router.push(`/waiting/${data.waitingId}`);
      } else {
        alert(data.error || '대기 등록에 실패했습니다.');
      }
    } catch (err) {
      alert('대기 등록 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md mx-auto w-full space-y-6">
        
        {/* 상단 매장 브랜딩 헤더 */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-3xl shadow-lg shadow-orange-500/20 text-white mb-2">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            매장 입장 대기 등록
          </h1>
          <p className="text-slate-500 text-xs font-medium">
            대기 등록을 하시면 카카오톡/문자로 입장 순서를 안내해 드립니다.
          </p>
        </div>

        {/* 실시간 현재 대기 현황 카드 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">현재 대기 팀</span>
              <span className="text-xl font-black text-slate-900">
                {currentWaitingCount}팀 대기 중
              </span>
            </div>
          </div>
          <div className="bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
            <span className="text-[11px] font-extrabold text-orange-650">
              예상 약 {currentWaitingCount * 8}분
            </span>
          </div>
        </div>

        {/* 대기 정보 입력 폼 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          
          {/* 인원수 선택 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-orange-600" />
              <span>방문 인원수</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPartySize(num)}
                  className={`py-3 rounded-2xl text-sm font-black transition-all border cursor-pointer ${
                    partySize === num
                      ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20 scale-105'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {num === 5 ? '5인+' : `${num}명`}
                </button>
              ))}
            </div>
          </div>

          {/* 휴대폰 번호 입력 (필수) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-orange-600" />
              <span>휴대폰 번호 <span className="text-red-500">*</span></span>
            </label>
            <input
              type="tel"
              required
              placeholder="010-0000-0000"
              value={customerPhone}
              onChange={handlePhoneChange}
              maxLength={13}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          {/* 고객명 입력 (선택) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>성함 또는 닉네임 (선택)</span>
            </label>
            <input
              type="text"
              placeholder="호출 시 사용할 이름"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={10}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          {/* 개인정보 수집 및 문자 수신 동의 */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
              />
              <span className="text-xs text-slate-500 font-medium">
                [필수] 대기 순서 안내 문자(SMS) 수신에 동의합니다.
              </span>
            </label>
          </div>

          {/* 접수 버튼 */}
          <button
            type="submit"
            disabled={loading || !isAgreed}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-base rounded-2xl shadow-lg shadow-orange-600/25 transition-all flex items-center justify-center gap-2 border-0 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>대기표 발급 중...</span>
            ) : (
              <>
                <span>대기 등록하고 번호표 받기</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* 안내사항 */}
        <div className="bg-slate-100/70 rounded-2xl p-4 text-[11px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
            이용 안내
          </p>
          <p>• 호출 후 5분 이내에 매장 카운터로 입장하지 않으시면 대기가 취소될 수 있습니다.</p>
          <p>• 5인 이상 단체 고객님의 경우 테이블 사정에 따라 대기 시간이 다소 길어질 수 있습니다.</p>
        </div>

      </div>

      {/* 하단 푸터 */}
      <footer className="text-center text-[10px] text-slate-400 py-4">
        © EGDESK Smart Waiting System
      </footer>
    </div>
  );
}
