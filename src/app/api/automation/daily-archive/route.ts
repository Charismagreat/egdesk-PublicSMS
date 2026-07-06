export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { executeSQL, queryTable } from '../../../../../egdesk-helpers';
import { sendMail } from '../../../../lib/email';
import { callAI } from '../../../../lib/ai-router';

/**
 * POST: 일일 현장 안전 TBM 및 품질/설비 점검 데이터 자동 아카이빙 이메일 전송
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { targetDate } = body;

    // 1. 타겟 날짜 설정 (기본값: 오늘 YYYY-MM-DD)
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const dateStr = targetDate || now.toISOString().substring(0, 10);

    console.log(`[Daily Archive] Starting archiving for date: ${dateStr}`);

    // 2. 당일 현장 데이터 수집 (안전한 queryTable 이용)
    // 2-1. 안전 TBM 로그
    const tbmRes = await queryTable('safety_tbm_logs', {
      filters: { tbm_date: dateStr }
    });
    const tbmLogs = tbmRes.rows || [];

    // 2-2. 품질 체크리스트 제출 이력
    const qualityRes = await queryTable('crm_quality_checklist_submissions', {});
    const allQualityLogs = qualityRes.rows || [];
    const qualityLogs = allQualityLogs.filter((q: any) => q.submittedAt && q.submittedAt.startsWith(dateStr));

    // 2-3. 안전점검 감사 대장
    const inspectRes = await queryTable('safety_inspect_logs', {
      filters: { inspect_date: dateStr }
    });
    const inspectLogs = inspectRes.rows || [];

    // 3. 아카이빙 발송 판단 (데이터가 아예 없다면 굳이 발송하지 않음)
    if (tbmLogs.length === 0 && qualityLogs.length === 0 && inspectLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: `${dateStr} 날짜에 제출된 안전 TBM, 품질 검사 또는 설비 점검 데이터가 없어 아카이빙 메일 전송을 생략했습니다.`
      });
    }

    // 4. AI 현장 품질/안전 분석 요약 보고서 작성
    const aiPrompt = `
    다음은 이지데스크 사업장의 일일 현장 데이터(${dateStr}) 내역입니다:
    
    [안전 TBM 회의 로그 - ${tbmLogs.length}건]:
    ${tbmLogs.map((t: any) => `- 리더: ${t.work_leader}, 참석자수: ${t.attendees_count}명, 요약: ${t.tbm_script.substring(0, 100)}...`).join('\n')}
    
    [안전점검 감사 로그 - ${inspectLogs.length}건]:
    ${inspectLogs.map((i: any) => `- 점검명: ${i.inspect_title}, 점검자: ${i.inspector_name}`).join('\n')}
    
    [품질/설비 체크리스트 제출 - ${qualityLogs.length}건]:
    ${qualityLogs.map((q: any) => `- LotNo: ${q.lotNo}, 검사자: ${q.inspector}, 상태: ${q.status}`).join('\n')}

    이 현장 상태를 종합 분석하여 공장장 및 품질/안전 보건 최고책임자에게 제출할 '일일 안전 및 품질 종합 리포트 요약'을 작성해 주세요.
    - 리포트는 격조 높은 경영 보고서 톤앤매너로 작성해 주시고, 
    - 금일 현장 안전 수칙 준수율 평가, 품질 리스크 특이사항, 그리고 안전 보건상 조치해야 할 주요 조치사항 1가지를 명확히 제안해 주세요.
    - 한국어로 신뢰감 있게 작성해 주시기 바랍니다.
    `;

    const aiRes = await callAI({
      prompt: aiPrompt,
      systemPrompt: '당신은 제조업 및 안전보건환경(EHS), 품질보증(QA) 분야의 최고 전문 컨설턴트입니다.',
      purpose: 'daily_safety_quality_archive',
      temperature: 0.2
    });

    const aiAnalysisSummary = aiRes.text || '금일 현장 데이터에 대한 AI 요약을 생성하지 못했습니다.';

    // 5. 수신 메일 정보 조회 (system_settings에서 archive_email 조회, 없으면 본사 이메일)
    let archiveDestinationEmail = 'chachogreat@gmail.com';
    let companyName = '이지데스크 사업소';

    try {
      // 회사명 조회
      const companySetting = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
      if (companySetting.rows?.[0]?.value) {
        const p = JSON.parse(companySetting.rows[0].value);
        if (p.email) archiveDestinationEmail = p.email;
        if (p.companyName) companyName = p.companyName;
      }

      // 전용 아카이빙 주소 설정이 있는지 조회
      const archiveEmailSetting = await queryTable('system_settings', { filters: { key: 'email_archive_destination' } });
      if (archiveEmailSetting.rows?.[0]?.value) {
        archiveDestinationEmail = archiveEmailSetting.rows[0].value;
      }
    } catch (e) {
      console.warn('아카이빙 수신처 설정 로드 실패:', e);
    }

    // 6. 미려하고 품격 있는 종합 리포트 HTML 조립
    const emailBodyHtml = `
      <div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; max-width: 700px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; color: #334155; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- 상단 헤더 그라데이션 -->
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 30px; text-align: center; color: white;">
          <span style="background-color: #f1f5f9; color: #1e293b; font-size: 10px; font-weight: bold; padding: 4px 12px; border-radius: 9999px;">RPA 안전/품질 아카이브</span>
          <h2 style="margin-top: 10px; margin-bottom: 5px; font-size: 20px;">${companyName} 일일 현장 안전·품질 종합 보고서</h2>
          <p style="font-size: 12px; opacity: 0.8; margin: 0;">조회 기준일자: ${dateStr}</p>
        </div>

        <div style="padding: 30px 24px;">
          <!-- 1. AI 종합 분석 요약 -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; margin-bottom: 25px;">
            <span style="font-size: 11px; font-weight: bold; color: #4f46e5; text-transform: uppercase; display: block; margin-bottom: 8px;">🧠 AI 현장 경영 분석 요약</span>
            <div style="font-size: 13px; color: #334155; line-height: 1.8; white-space: pre-line; text-align: left;">
              ${aiAnalysisSummary.replace(/\n/g, '<br/>')}
            </div>
          </div>

          <!-- 2. 세부 세션 내역 요약 -->
          <h3 style="font-size: 14px; font-weight: bold; color: #0f172a; border-left: 4px solid #1e293b; padding-left: 8px; margin-bottom: 12px;">📊 수집된 세부 작업 내역</h3>
          
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-bottom: 25px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 10px; color: #475569;">점검 분류</th>
                <th style="padding: 10px; color: #475569;">점검 항목/리더</th>
                <th style="padding: 10px; color: #475569; text-align: center;">결과/참석자</th>
                <th style="padding: 10px; color: #475569; text-align: right;">등록시간</th>
              </tr>
            </thead>
            <tbody>
              <!-- TBM 데이터 행 -->
              ${tbmLogs.map((t: any) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-weight: bold; color: #059669;">안전 TBM</td>
                  <td style="padding: 10px;">작업 리더: ${t.work_leader}</td>
                  <td style="padding: 10px; text-align: center; color: #059669; font-weight: bold;">${t.attendees_count}명 참여</td>
                  <td style="padding: 10px; text-align: right; color: #94a3b8;">${t.created_at.substring(11, 16)}</td>
                </tr>
              `).join('')}

              <!-- 안전 점검 로그 행 -->
              ${inspectLogs.map((i: any) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-weight: bold; color: #2563eb;">안전점검</td>
                  <td style="padding: 10px;">${i.inspect_title} (점검자: ${i.inspector_name})</td>
                  <td style="padding: 10px; text-align: center; color: #2563eb; font-weight: bold;">점검 완료</td>
                  <td style="padding: 10px; text-align: right; color: #94a3b8;">${i.created_at.substring(11, 16)}</td>
                </tr>
              `).join('')}

              <!-- 품질 검사 행 -->
              ${qualityLogs.map((q: any) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-weight: bold; color: #d97706;">품질검사</td>
                  <td style="padding: 10px;">Lot: ${q.lotNo} (검사자: ${q.inspector})</td>
                  <td style="padding: 10px; text-align: center; color: ${q.status === 'PASS' || q.status === '합격' ? '#059669' : '#dc2626'}; font-weight: bold;">
                    ${q.status}
                  </td>
                  <td style="padding: 10px; text-align: right; color: #94a3b8;">${q.submittedAt.substring(11, 16)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; font-size: 11px; color: #64748b; line-height: 1.6;">
            <p style="margin: 0; font-weight: bold; color: #475569; margin-bottom: 3px;">💡 아카이브 안내 사항</p>
            <p style="margin: 0;">본 이메일 리포트는 이지데스크 스마트 팩토리 RPA 엔진에 의해 생성되어 현장 기록 백업 목적으로 발송되었습니다. 원본 데이터는 사내 데이터베이스 안전 검수 아카이브에 영구 보존됩니다.</p>
          </div>
        </div>

        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">본 이메일은 발신 전용입니다. 문의 사항은 이지데스크 EHS 총괄 부서로 연락주시기 바랍니다.</p>
        </div>
      </div>
    `;

    // 7. 정식 이메일 전송
    await sendMail({
      to: archiveDestinationEmail,
      subject: `[RPA 아카이브] ${dateStr} 현장 안전·품질 종합 보고서 📋`,
      html: emailBodyHtml,
      fromName: '이지데스크 안전보건봇'
    });

    console.log(`[Daily Archive] Archiving email successfully sent to ${archiveDestinationEmail}`);

    return NextResponse.json({
      success: true,
      message: `${dateStr} 현장 일일 보고서가 안전 보관용 이메일(${archiveDestinationEmail})로 성공적으로 백업 및 아카이빙되었습니다.`,
      details: {
        tbmCount: tbmLogs.length,
        qualityCount: qualityLogs.length,
        inspectCount: inspectLogs.length,
        sentTo: archiveDestinationEmail
      }
    });

  } catch (error: any) {
    console.error('Daily archive API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
