export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '@/../egdesk-helpers';

// GET /api/price-tracker/alerts : 알림 규칙 및 전송 로그 조회
export async function GET() {
  try {
    const rulesRes = await queryTable('alert_rules', { orderBy: 'rule_id', orderDirection: 'DESC' });
    const logsRes = await queryTable('alert_logs', { orderBy: 'log_id', orderDirection: 'DESC', limit: 15 });

    return NextResponse.json({
      success: true,
      rules: rulesRes.rows || [],
      logs: logsRes.rows || []
    });
  } catch (error: any) {
    console.error('Failed to fetch alert rules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/price-tracker/alerts : 신규 알림 규칙 등록
export async function POST(req: Request) {
  try {
    const { item_id, rule_name, condition_type, threshold_value, phone_number, sms_template } = await req.json();

    if (!item_id || !rule_name || !threshold_value || !phone_number || !sms_template) {
      return NextResponse.json({ success: false, error: '필수 정보가 입력되지 않았습니다.' }, { status: 400 });
    }

    const newRuleId = Date.now();
    await insertRows('alert_rules', [{
      rule_id: newRuleId,
      item_id: Number(item_id),
      rule_name,
      condition_type,
      threshold_value: Number(threshold_value),
      phone_number,
      sms_template,
      is_enabled: 1
    }]);

    return NextResponse.json({ success: true, rule_id: newRuleId, message: 'FreeSMS 가격 알림 규칙이 성공적으로 가동되었습니다.' });

  } catch (error: any) {
    console.error('Failed to create alert rule:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
