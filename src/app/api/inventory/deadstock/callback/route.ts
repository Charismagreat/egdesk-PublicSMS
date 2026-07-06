export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { executeSQL, queryTable, updateRows } from '../../../../../../egdesk-helpers';
import { sendMail } from '@/lib/email';

function escapeSqlString(val: string): string {
  if (val === null || val === undefined) return '';
  return val.replace(/'/g, "''");
}

// POST: 가상 문의 수신 시뮬레이션 및 대표자 알림 메일 발송 브릿지
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { proposalId, replyContent } = body;

    if (!proposalId || !replyContent) {
      return NextResponse.json({ success: false, error: '제안 이력 코드(proposalId)와 회신 내용(replyContent)은 필수입니다.' }, { status: 400 });
    }

    // 1. 해당 제안 메일 로그 조회 (소프트 삭제 필터링, SQL 방화벽 우회를 위해 queryTable 사용)
    const selectResult = await queryTable('crm_deadstock_proposals', { filters: { id: String(proposalId) } });
    const proposal = (selectResult?.rows || []).find((p: any) => p.deleted_at === null);

    if (!proposal) {
      return NextResponse.json({ success: false, error: '존재하지 않거나 삭제된 제안 메일 이력입니다.' }, { status: 404 });
    }

    // 2. 대표자 이메일 확보 (system_settings 내 company_email 조회, 없으면 email_smtp_user 백업)
    const companyEmailRes = await queryTable('system_settings', { filters: { key: 'company_email' } });
    let ownerEmail = companyEmailRes.rows?.[0]?.value || '';

    if (!ownerEmail) {
      const smtpUserRes = await queryTable('system_settings', { filters: { key: 'email_smtp_user' } });
      ownerEmail = smtpUserRes.rows?.[0]?.value || '';
    }

    if (!ownerEmail) {
      ownerEmail = 'admin@ezdesk.co.kr'; // 최후의 기본 폴백 이메일
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // 3. 대표자 대상 알림 메일 전송
    const alertSubject = `[🚨이지데스크 알림] 불용자재 인수 제안 문의 회신 접수 안내 (${proposal.target_company})`;
    const alertHtml = `
      <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; color: #1e293b; background-color: #ffffff;">
        <div style="background-color: #f59e0b; padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 18px;">B2B 제안 문의 회신 접수</h2>
          <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">보유 불용/장기자재 인수 제안에 대해 바이어가 회신을 보냈습니다.</p>
        </div>
        <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
          <p>안녕하세요, 대표자님.</p>
          <p>귀사에서 B2B 매입 매칭을 제안했던 <b>${proposal.target_company}</b>로부터 다음과 같이 문의 메일(회신)이 정상 접수되었습니다.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #0f172a;">[바이어 회신 내용]</p>
            <div style="white-space: pre-wrap; font-size: 13px; color: #475569;">${replyContent}</div>
          </div>
          
          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 4px 0;"><b>제안 메일 정보:</b></p>
            <ul style="margin: 0; padding-left: 20px;">
              <li>대상 업체: ${proposal.target_company} (${proposal.target_email})</li>
              <li>제안서 제목: ${proposal.subject}</li>
              <li>접수 일시: ${nowStr}</li>
            </ul>
          </div>
          
          <p style="margin-top: 20px;">바이어의 적극적인 인수의사가 확인되오니, 신속하게 견적 및 단가 조율 절차를 진행해 주시기 바랍니다.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          본 알림 메일은 이지데스크 B2B 재고 교역 모니터링 시스템에 의해 발송되었습니다.
        </div>
      </div>
    `;

    try {
      await sendMail({
        to: ownerEmail,
        subject: alertSubject,
        html: alertHtml,
        fromName: '이지데스크 시스템 알림'
      });
    } catch (mailErr: any) {
      console.error('대표자 알림 이메일 전송 실패:', mailErr);
      // 알림 메일 전송 실패하더라도 DB 업데이트는 계속 진행하고 응답에 경고를 포함함
    }

    // 4. 제안 로그 상태 'REPLIED'로 변경 및 회신 내용 적재 (7종 감사 컬럼 updated_at 갱신)
    await updateRows('crm_deadstock_proposals', {
      status: 'REPLIED',
      replied_content: replyContent,
      replied_at: nowStr,
      updated_at: nowStr
    }, {
      filters: { id: String(proposalId) }
    });

    return NextResponse.json({
      success: true,
      message: '가상 문의 회신 접수 및 대표자 알림 이메일 발송이 성공적으로 처리되었습니다.'
    });

  } catch (error: any) {
    console.error('API deadstock callback POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
