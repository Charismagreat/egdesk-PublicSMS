import { apiFetch } from '@/lib/api';
import { useState, useEffect, useCallback } from "react";
import { CreditRiskStats, CreditSummary, OverdueAgingDetail, ToastState } from "../types";

export function useCreditRisk() {
  const [stats, setStats] = useState<CreditRiskStats[]>([]);
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [aging, setAging] = useState<OverdueAgingDetail | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // 토스트 메시지 유틸리티
  const showToast = useCallback((message: string, type: ToastState["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // 1. 초기 통계 및 리스크 데이터 로드
  const fetchCreditRiskData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/production/credit");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setSummary(data.summary);
        setAging(data.aging);
        if (data.stats.length > 0) {
          // 기본적으로 첫 번째 위험 거래처(CRITICAL 또는 WARNING)를 선택
          const riskPartner = data.stats.find((s: CreditRiskStats) => s.riskLevel === "CRITICAL" || s.riskLevel === "WARNING");
          setSelectedPartnerId(riskPartner ? riskPartner.id : data.stats[0].id);
        }
      } else {
        showToast(data.error || "데이터 로드 실패", "error");
      }
    } catch (err: any) {
      showToast(err.message || "서버 통신 오류", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCreditRiskData();
  }, [fetchCreditRiskData]);

  // 2. 실시간 신용 위험도 재연산 스캔
  const recalculateCreditRisk = useCallback(async () => {
    setIsRecalculating(true);
    try {
      const res = await apiFetch("/api/production/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recalculate" })
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setSummary(data.summary);
        setAging(data.aging);
        showToast(data.message || "실시간 신용 재진단이 완료되었습니다.", "success");
      } else {
        showToast(data.error || "재진단 연산 실패", "error");
      }
    } catch (err: any) {
      showToast(err.message || "재진단 중 서버 오류가 발생했습니다.", "error");
    } finally {
      setIsRecalculating(false);
    }
  }, [showToast]);

  // 3. AI 법률 준수 독촉 SMS 전송
  const sendOverdueSms = useCallback(async (partnerId: string, message: string) => {
    setIsSending(true);
    try {
      const res = await apiFetch("/api/production/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_sms", partnerId, message })
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setSummary(data.summary);
        setAging(data.aging);
        showToast(data.message || "독촉 문자가 정상 발송되었습니다.", "success");
      } else {
        showToast(data.error || "문자 전송에 실패했습니다.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "SMS 연동 처리 중 서버 오류가 발생했습니다.", "error");
    } finally {
      setIsSending(false);
    }
  }, [showToast]);

  // 4. 채권 회수 최고(독촉) 고지서 표준 서식 새 탭 인쇄 기능
  const handlePrintNotice = useCallback((partnerId: string) => {
    const partner = stats.find(s => s.id === partnerId);
    if (!partner) {
      showToast("인쇄할 거래처 정보를 찾을 수 없습니다.", "error");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("팝업 차단을 해제해 주세요.", "warning");
      return;
    }

    const todayStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    const overdueLimitDate = new Date();
    overdueLimitDate.setDate(overdueLimitDate.getDate() + 7);
    const limitDateStr = overdueLimitDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

    // 최고 고지서 인쇄용 HTML 템플릿 주입
    printWindow.document.write(`
      <html>
      <head>
        <title>미수채권 변제 최고서 - ${partner.companyName}</title>
        <style>
          body { font-family: 'Malgun Gothic', 'Dotum', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 50px; }
          .header h1 { font-size: 28px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 15px; margin: 0; }
          .meta-info { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .meta-info td { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; }
          .meta-info td.title { background-color: #f7f7f7; font-weight: bold; width: 15%; }
          .content { font-size: 14px; margin-bottom: 40px; }
          .content p { margin: 12px 0; }
          .highlight { font-weight: bold; color: #d9534f; }
          .bank-box { background-color: #f9f9f9; border: 1px solid #ccc; padding: 15px; border-radius: 4px; text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 60px; font-size: 14px; }
          .stamp-area { display: flex; justify-content: flex-end; margin-top: 40px; }
          .stamp { width: 120px; height: 120px; border: 2px dashed #999; display: flex; items-center: center; justify-content: center; font-size: 12px; color: #999; border-radius: 50%; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>미수채권 변제 최고 고지서</h1>
        </div>

        <table class="meta-info">
          <tr>
            <td class="title">수신처</td>
            <td>${partner.companyName} 대표 귀하</td>
            <td class="title">발신처</td>
            <td>이지데스크 [FreeSMS] 채권회수단</td>
          </tr>
          <tr>
            <td class="title">수신인 연락처</td>
            <td>${partner.managerName} 담당자 (${partner.managerPhone})</td>
            <td class="title">작성일자</td>
            <td>${todayStr}</td>
          </tr>
          <tr>
            <td class="title">최고 채권액</td>
            <td colspan="3" class="highlight">금 ${partner.overdueAmount.toLocaleString()} 원 정</td>
          </tr>
        </table>

        <div class="content">
          <p>귀사의 일익 번창하심을 기원합니다.</p>
          <p>당사는 귀사와의 지속적이고 원만한 B2B 거래를 희망하며 지원을 아끼지 않았으나, 현재 귀사의 미수채권 총액 <b>금 ${partner.overdueAmount.toLocaleString()}원</b>이 납기일로부터 <span class="highlight">${partner.overdueDays}일간 연체</span> 중에 있습니다.</p>
          <p>수차례 구두 및 서면 안내에도 불구하고 변제가 지연되어 당사 경영 및 운영 흐름에 상당한 지장을 초래하고 있습니다. 본 최고서를 수령하신 날로부터 7일 이내(<span class="highlight">${limitDateStr}까지</span>)에 아래 지정 계좌로 채권을 전액 변제 완료해 주실 것을 엄중히 요청드립니다.</p>
          
          <div class="bank-box">
            입금 지정 계좌: ${partner.virtualAccount}
          </div>

          <p>만일 명시된 기일 내에 입금 또는 정당한 채권 변제 소명이 이뤄지지 않을 경우, 불가피하게 법적인 채권추심 절차(지급명령 신청, 가압류 등) 및 신용평가기관에 채권연체정보가 등록되어 귀사의 신용등급 하락 등의 중대한 영향이 미칠 수 있음을 사전에 엄중 고지합니다.</p>
          <p>당사는 부득이한 법적 대응으로 향후 상호 신뢰와 비즈니스 파트너십이 훼손되지 않기를 원하오니, 기한 내 성실한 입금 조치를 간곡히 촉구합니다.</p>
        </div>

        <div class="stamp-area">
          <div style="text-align: right;">
            <p style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">이지데스크 대표이사 (인)</p>
            <p style="font-size: 12px; color: #777;">(본 서식은 법률 고문실의 표준 양식으로 직인이 생략되었습니다.)</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 40px;" class="no-print">
          <button onclick="window.print()" style="padding: 10px 24px; background-color: #2e6da4; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">최고서 즉시 인쇄</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [stats, showToast]);

  return {
    isLoading,
    isRecalculating,
    isSending,
    toast,
    stats,
    summary,
    aging,
    selectedPartnerId,
    recalculateCreditRisk,
    sendOverdueSms,
    handlePrintNotice,
    setSelectedPartnerId
  };
}
