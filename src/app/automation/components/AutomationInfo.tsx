import React from "react";
import { Info } from "lucide-react";

export function AutomationInfo() {
  return (
    <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl mb-8 flex flex-col md:flex-row items-start gap-4 shadow-sm animate-fade-in">
      <Info className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
      <div className="text-sm text-blue-800 leading-relaxed space-y-2 text-left">
        <p className="font-semibold text-slate-800">
          <strong>작동 원리:</strong> 아래 목록에서 자동 알림을 전송할 상황(이벤트)을 'On'으로 켜고, 발송할 '템플릿'을 연결해두면 끝입니다. 
          각 이벤트가 발생할 때 자동으로 고객의 전화번호를 추출하여 문자를 쏩니다.
        </p>
        <div className="bg-white/80 p-3.5 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-1.5 mt-1 font-semibold">
          <p className="font-extrabold text-blue-900 mb-1 flex items-center">💡 템플릿 내 사용 가능한 예약어 변수</p>
          <p>• <strong>포인트 변수</strong>: <code>{"{적립포인트}"}</code> (새로 적립된 액수), <code>{"{차감포인트}"}</code> (결제 시 사용된 액수), <code>{"{잔여포인트}"}</code> (사용 후 남은 최종 잔액)</p>
          <p>• <strong>쿠폰 변수 (수동/단체 문자용)</strong>: <code>{"{쿠폰코드}"}</code> (자동 맵핑되어 전송되는 난수 쿠폰 코드)</p>
          <p>• <strong>B2B / SCM 특화 변수</strong>: <code>{"{상호명}"}</code> (거래처 회사명), <code>{"{담당자명}"}</code> (B2B 담당자 성함), <code>{"{금액}"}</code> (견적/수주 총합계금액), <code>{"{수주번호}"}</code> (확정 수주 고유코드)</p>
          <p>• <strong>기본 변수</strong>: <code>{"{이름}"}</code> (고객 성명), <code>{"{연락처}"}</code> (고객 번호)</p>
        </div>
        <p className="text-[11px] text-blue-600 font-bold">* 주의: 연결할 템플릿은 사전에 <b>[무료 문자 발송 AI]</b> 메뉴의 메시지 작성 칸에서 <b>[+ 템플릿으로 저장]</b>을 미리 클릭하여 등록해 두셔야 아래 목록에 나타납니다.</p>
      </div>
    </div>
  );
}
