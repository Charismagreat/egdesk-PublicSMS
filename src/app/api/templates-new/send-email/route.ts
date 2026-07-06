export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, executeSQL } from '../../../../../egdesk-helpers';
import { sendMail } from '../../../../lib/email';
import crypto from 'crypto';

// 한국 시간 기준 YYYY-MM-DD HH:MM:SS 타임스탬프 획득 헬퍼
function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * POST: 임직원 증명서 이메일 전송 및 발급 이력 적재
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { templateId, emailAddress, printDataPayload } = body;

    if (!templateId || !emailAddress || !printDataPayload) {
      return NextResponse.json({ success: false, error: '템플릿 ID, 이메일 주소, 사원 정보 데이터는 필수입니다.' }, { status: 400 });
    }

    // 1. 템플릿 HTML 조회
    const res = await queryTable('crm_web_templates', { filters: { id: String(templateId) } });
    const rows = res.rows || [];
    const template = rows.find((r: any) => !r.deleted_at) || null;

    if (!template) {
      return NextResponse.json({ success: false, error: '해당 증명서 템플릿을 찾을 수 없거나 삭제되었습니다.' }, { status: 404 });
    }

    // 2. Mustache 템플릿 간단 파싱 치환기 작동
    // {{variable}} 또는 {{ variable }} 형태로 기입된 Mustache 태그를 찾아 치환합니다.
    let parsedHtml = template.html_content || '';
    
    // printDataPayload의 모든 키-값 쌍을 매핑 치환
    Object.keys(printDataPayload).forEach((key) => {
      const val = printDataPayload[key] !== undefined && printDataPayload[key] !== null ? String(printDataPayload[key]) : '';
      
      // 공백 허용 정규식으로 {{key}}와 {{ key }} 모두 치환
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      parsedHtml = parsedHtml.replace(regex, val);
    });

    // 치환되지 않은 Mustache 변수들은 빈 칸 처리
    parsedHtml = parsedHtml.replace(/\{\{\s*[\w_]+\s*\}\}/g, '');

    // 3. SMTP 이메일 전송
    const docName = template.template_name || '증명서';
    const staffName = printDataPayload.staff_name || '임직원';
    
    await sendMail({
      to: emailAddress,
      subject: `[이지데스크] ${staffName}님의 정식 ${docName} 발급 메일입니다. 📄`,
      html: parsedHtml,
      fromName: '이지데스크 스마트인사'
    });

    // 4. 재직증명서 발급 대장(crm_employment_certificate_logs)에 감사 적재 (소프트 삭제 및 7종 감사 준수)
    const timestamp = getKoreanTimestamp();
    const logId = Date.now() + Math.floor(Math.random() * 1000);
    
    await insertRows('crm_employment_certificate_logs', [{
      id: logId,
      staff_id: printDataPayload.id || 0,
      staff_name: staffName,
      joined_date: printDataPayload.joined_date || '',
      degree_level: printDataPayload.degree_level || '학사',
      major_name: printDataPayload.major_name || '',
      address: printDataPayload.address || '',
      usage: printDataPayload.usage || '금융기관 제출용',
      issue_date: `${printDataPayload.issue_year}-${printDataPayload.issue_month}-${printDataPayload.issue_day}`,
      issue_dept: printDataPayload.issue_dept || '관리부',
      issue_by: '이메일 즉시 전송',
      extra_data: JSON.stringify({
        emailAddress,
        templateName: docName,
        printDataPayload
      }),
      uuid: crypto.randomUUID(),
      updated_at: timestamp,
      updated_by: 'system_operator'
    }]);

    console.log(`[Form Issuance] Certificate '${docName}' issued and email sent to ${emailAddress}`);

    return NextResponse.json({
      success: true,
      message: `[${docName}] 서류가 안전하게 발행되어 지정하신 이메일(${emailAddress})로 즉시 전송되었습니다.`,
      logId
    });

  } catch (error: any) {
    console.error('Templates-new send-email POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
