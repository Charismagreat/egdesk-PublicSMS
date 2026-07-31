"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MessageLogsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sms?tab=LOGS");
  }, [router]);

  return (
    <div className="p-8 text-center space-y-2">
      <p className="text-sm font-bold text-slate-600">📱 통합 SMS 문자 관제 센터(발송 내역 탭)로 이동 중입니다...</p>
    </div>
  );
}
