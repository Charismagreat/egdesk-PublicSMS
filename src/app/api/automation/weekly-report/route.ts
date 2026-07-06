export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable } from '../../../../../egdesk-helpers';
import { sendMail } from '../../../../lib/email';
import { callAI } from '../../../../lib/ai-router';

/**
 * POST: AI 주간 경영 분석 리포트 자동 생성 및 사장님 이메일 발송
 */
export async function POST(req: Request) {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = new Date(sevenDaysAgo.getTime() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // 1. 최근 7일간의 데이터베이스 지표 수집
    // 고객 정보
    const customersRes = await queryTable('crm_customers', { limit: 1000 });
    const recentCustomers = (customersRes.rows || []).filter((c: any) => c.created_at >= sevenDaysAgoStr);

    // 무료문자 전송 로그
    const logsRes = await queryTable('message_logs', { limit: 5000 });
    const recentLogs = (logsRes.rows || []).filter((l: any) => l.created_at >= sevenDaysAgoStr);
    const successLogs = recentLogs.filter((l: any) => l.status === 'SUCCESS' || l.status === '성공');

    // 견적서(매출액) 발행 로그
    const estimatesRes = await queryTable('crm_estimates', { limit: 1000 });
    const recentEstimates = (estimatesRes.rows || []).filter((e: any) => e.created_at >= sevenDaysAgoStr);
    const recentSales = recentEstimates.filter((e: any) => e.type === 'OUTBOUND');
    const totalSalesAmount = recentSales.reduce((acc: number, cur: any) => acc + (cur.total_amount || 0), 0);

    // 2. AI 경영 분석 지문 빌드 및 호출
    const prompt = `
    다음은 이지데스크 매장의 최근 7일간(기준일시: ${sevenDaysAgoStr} ~ 현재) 운영 지표 데이터입니다.
    - 신규 등록 고객 수: ${recentCustomers.length}명
    - 총 문자 발송 시도: ${recentLogs.length}건 (발송 성공: ${successLogs.length}건)
    - 신규 견적서(매출) 발행 건수: ${recentSales.length}건 (합계 금액: ${totalSalesAmount.toLocaleString()}원)

    이 데이터를 바탕으로 사장님께 전달할 '주간 매장 경영 분석 리포트'를 품격 있고 통찰력 넘치는 한글로 작성해 주세요.
    보고서에는 다음 4가지 항목이 정밀하게 구분되어 포함되어야 합니다:
    1. [운영 지표 총평 및 요약]
    2. [마케팅 성과 분석] (문자 마케팅 발송 효율성 평가)
    3. [매출 및 자금 흐름 예측] (발행된 견적 데이터를 토대로 한 수금 예측)
    4. [다음 주 AI 마케팅 권고 시나리오] (매장 활성화를 위한 추천 액션 1가지)

    답변은 일반 텍스트 포맷으로 각 섹션을 명확히 구분하여 작성해 주세요.
    `;

    const aiRes = await callAI({
      prompt,
      systemPrompt: '당신은 이지데스크(EGDesk)의 수석 경영 컨설턴트 AI 어시스턴트입니다. 사장님께 격조 있고 통찰력 높은 리포트를 보고해야 합니다.',
      purpose: 'weekly_business_report',
      temperature: 0.7
    });

    const reportContent = aiRes.text || 'AI 주간 비즈니스 보고서 생성에 실패했습니다.';

    // 3. 본사 이메일 및 상호명 정보 로드
    let bossEmail = 'chachogreat@gmail.com';
    let companyName = '이지데스크 본사';
    try {
      const companySetting = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
      if (companySetting.rows?.[0]?.value) {
        const p = JSON.parse(companySetting.rows[0].value);
        if (p.email) bossEmail = p.email;
        if (p.companyName) companyName = p.companyName;
      }
    } catch (e) {
      console.warn('본사 정보 로드 실패:', e);
    }

    // 4. HTML 형식의 주간 리포트 레이아웃 조립
    const emailBodyHtml = `
      <div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 20px; padding: 30px; color: #334155; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 25px;">
          <span style="background-color: #f0fdf4; color: #16a34a; font-size: 10px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; border: 1px solid #bbf7d0;">AI 주간 비즈니스 레포트</span>
          <h2 style="color: #0f172a; margin-top: 10px; margin-bottom: 5px; font-size: 20px;">${companyName} 주간 경영 분석</h2>
          <p style="font-size: 11px; color: #64748b; margin-top: 0;">최근 7일간의 CRM 및 견적 매출 정보를 기반으로 동적 생성되었습니다.</p>
        </div>

        <!-- 주요 운영 지표 요약 대시보드 -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: center;">
          <tr>
            <td style="width: 33%; padding: 4px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                <span style="font-size: 11px; color: #64748b; font-weight: bold;">신규 등록 고객</span>
                <p style="font-size: 18px; font-weight: 800; color: #2563eb; margin: 5px 0 0 0;">+${recentCustomers.length}명</p>
              </div>
            </td>
            <td style="width: 33%; padding: 4px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                <span style="font-size: 11px; color: #64748b; font-weight: bold;">무료 문자 발송</span>
                <p style="font-size: 18px; font-weight: 800; color: #7c3aed; margin: 5px 0 0 0;">${successLogs.length}건</p>
              </div>
            </td>
            <td style="width: 33%; padding: 4px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                <span style="font-size: 11px; color: #64748b; font-weight: bold;">발행 매출액</span>
                <p style="font-size: 16px; font-weight: 800; color: #16a34a; margin: 7px 0 0 0;">${totalSalesAmount.toLocaleString()}원</p>
              </div>
            </td>
          </tr>
        </table>

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />

        <!-- AI 분석 본문 -->
        <div style="font-size: 13px; color: #334155; line-height: 1.8; white-space: pre-line; background-color: #fcfcfc; border: 1px solid #f8fafc; border-radius: 16px; padding: 22px; text-align: left;">
          ${reportContent.replace(/\n/g, '<br/>')}
        </div>

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
        <p style="font-size: 10px; color: #94a3b8; margin-bottom: 0; text-align: center; line-height: 1.4;">
          본 이메일은 이지데스크 AI 자율 마케팅 모듈에 의해 자동 빌드된 사장님 전용 리포트입니다.<br/>
          ※ 수신 정보 변경은 [시스템 설정 > 우리 회사 정보]의 이메일 항목을 수정해 주세요.
        </p>
      </div>
    `;

    // 5. 정식 이메일 전송
    await sendMail({
      to: bossEmail,
      subject: `[이지데스크 AI] ${companyName} 주간 경영 분석 보고서 📊`,
      html: emailBodyHtml,
      fromName: '이지데스크 AI 비서'
    });

    return NextResponse.json({ success: true, message: `주간 분석 리포트가 성공적으로 이메일(${bossEmail})로 전송되었습니다.` });

  } catch (error: any) {
    console.error('Weekly report api POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
