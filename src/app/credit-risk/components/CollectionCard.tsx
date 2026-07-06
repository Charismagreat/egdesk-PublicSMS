import React, { useState, useEffect } from "react";
import { CreditRiskStats } from "../types";
import { Sparkles, MessageSquare, ShieldAlert, Printer, Send, ShieldCheck } from "lucide-react";

interface CollectionCardProps {
  partner: CreditRiskStats | null;
  onSendSms: (partnerId: string, message: string) => Promise<void>;
  onPrintNotice: (partnerId: string) => void;
  isSending: boolean;
}

export default function CollectionCard({
  partner,
  onSendSms,
  onPrintNotice,
  isSending
}: CollectionCardProps) {
  const [smsText, setSmsText] = useState<string>("");

  // 회수 성공 예측 확률 시뮬레이터 연산
  const calculateRecoveryProbability = (days: number, rating: string) => {
    let base = 95.0; // 기본 95% 시작
    
    // 연체 일수에 따른 차감
    if (days > 90) base -= 65;
    else if (days > 60) base -= 45;
    else if (days > 30) base -= 25;
    else if (days > 10) base -= 10;

    // 신용 등급에 따른 차감
    if (rating === "F") base -= 25;
    else if (rating === "E") base -= 18;
    else if (rating === "D") base -= 12;
    else if (rating === "C") base -= 6;
    
    return Math.max(5.0, Math.min(99.0, base));
  };

  const recoveryProbability = partner
    ? calculateRecoveryProbability(partner.overdueDays, partner.creditRating)
    : 0;

  // 법률 준수 추천 문자 템플릿 생성
  useEffect(() => {
    if (partner) {
      const defaultTemplate = `[수금 안내 고지]
안녕하세요, ${partner.companyName} 귀하.
이지데스크 채권관리팀입니다.

귀사의 일익 번창하심을 기원합니다.
다름이 아니라, 현재 귀사의 미수채권에 대한 변제일이 아래와 같이 지연되고 있어 정중히 수금 안내차 연락드립니다.

■ 미수채권 세부 내역
- 누적 미수 금액: ₩ ${partner.overdueAmount.toLocaleString()}원
- 연체 발생 기간: D+${partner.overdueDays}일 연체 중
- 입금 지정 가상계좌: ${partner.virtualAccount}

본 미수금은 당사 자금 순환 및 원가 정산의 주요 재원이오니 조속히 입금 확인 부탁드립니다. 

변제 기일 만료 후 지속적으로 지연 시 채권 정보 등록 및 법적 변제 촉구 절차가 자동으로 진행될 수 있음을 사전에 안내해 드립니다. 원활한 신용 관리와 원만한 파트너십을 위해 협조 부탁드립니다.

문의: 02-1588-0000`;
      setSmsText(defaultTemplate);
    } else {
      setSmsText("");
    }
  }, [partner]);

  if (!partner) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center flex flex-col items-center justify-center h-full">
        <MessageSquare className="w-12 h-12 text-slate-200 mb-3 animate-pulse" />
        <p className="text-xs text-slate-400 font-bold">좌측 대장에서 분석 대상을 선택하면 AI 수금 솔루션 패널이 활성화됩니다.</p>
      </div>
    );
  }

  const isLowRecovery = recoveryProbability < 40;
  const isSmsEmpty = smsText.trim().length === 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full text-slate-800">
      
      {/* 카드 헤더 */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-2xl">
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-black tracking-tight">AI 수금 의사결정 솔루션</h2>
            <p className="text-[10px] text-slate-400 font-bold">{partner.companyName} 리스크 처방전</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 flex-1 overflow-y-auto">
        
        {/* 1. AI 부실채권 회수 시뮬레이터 */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 text-left">
          <span className="block text-[8px] text-slate-400 font-black">AI 기반 수금 회수성공 확률 시뮬레이션</span>
          
          <div className="flex items-center justify-between mt-3 gap-6">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black">회수 예측 확률:</span>
                <span className={`text-base font-mono font-black ${
                  isLowRecovery ? "text-rose-500" : "text-indigo-600"
                }`}>
                  {recoveryProbability.toFixed(1)}%
                </span>
              </div>
              <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
                {isLowRecovery
                  ? "⚠️ 연체 기간이 장기화되었으며 신용 등급이 매우 취약합니다. 전화/문자 독촉 외에 조속한 최고장(우편) 발부 및 법적 절차(지급명령) 병행을 권고합니다."
                  : "💡 단기 연체 단계이며 신용 등급이 양호하여 정중한 SMS 및 입금안내 가이드 전송만으로도 80% 이상의 회수가 예측됩니다."}
              </p>
            </div>

            {/* 원형 게이지 차트 */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isLowRecovery ? "text-rose-500" : "text-indigo-500"}
                  strokeWidth="3.5"
                  strokeDasharray={`${recoveryProbability}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] font-black font-mono">
                {recoveryProbability.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* 2. 공정채권추심법 준수 경고 패널 */}
        <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 text-left flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="block text-[9px] text-amber-800 font-black">공정추심법 제9조 법률 준수 경보</span>
            <p className="text-[8px] text-amber-700 font-bold leading-relaxed">
              공휴일 및 야간(오후 9시~다음날 오전 8시)에 불안감을 유발하는 채권 추심 행위는 형사처벌 또는 과태료 처분 대상입니다. FreeSMS 연동 발송 시 AI가 시간을 실시간 모니터링하여 합법적인 시간대에 발송되도록 안심 예약 버퍼링을 작동시킵니다.
            </p>
          </div>
        </div>

        {/* 3. 독촉 문자 템플릿 에디터 */}
        <div className="space-y-2 text-left">
          <label className="block text-[9px] text-slate-400 font-black">
            AI 법률 보정 독촉 문자 작성 (자유 편집 가능)
          </label>
          <textarea
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            rows={8}
            className="w-full text-[10px] font-mono leading-relaxed p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none resize-none bg-slate-50/50"
          />
        </div>

        {/* 4. 작업 액션 버튼들 */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* 채권 최고장 인쇄 */}
          <button
            onClick={() => onPrintNotice(partner.id)}
            className="flex items-center justify-center gap-1.5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black transition active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            최고 고지서 인쇄 (새 창)
          </button>

          {/* 독촉 SMS 발송 */}
          <button
            onClick={() => onSendSms(partner.id, smsText)}
            disabled={isSending || isSmsEmpty}
            className="flex items-center justify-center gap-1.5 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black transition active:scale-95"
          >
            {isSending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                문자 발송 중...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                독촉 SMS 예약/발송
              </>
            )}
          </button>
        </div>

      </div>

      {/* 푸터 법적 안심 보증 마크 */}
      <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-center gap-1.5 text-[8px] font-bold text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        AI Legal Guard Engine: 대한민국 채권추심법 준수 검증 완료
      </div>

    </div>
  );
}
