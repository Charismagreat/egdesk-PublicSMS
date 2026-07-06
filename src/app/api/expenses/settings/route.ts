export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, updateRows } from '@/../egdesk-helpers';

export async function GET() {
  try {
    const response = await queryTable('expense_settings', { filters: { id: '1' } });
    const setting = response.rows?.[0] || null;
    return NextResponse.json({ success: true, data: setting });
  } catch (error: any) {
    console.error('Error fetching expense settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { monthly_budget, is_alert_enabled, alert_threshold_percent, alert_sms_template, alert_phone } = body;

    if (monthly_budget === undefined || is_alert_enabled === undefined || alert_threshold_percent === undefined || !alert_sms_template || !alert_phone) {
      return NextResponse.json({ success: false, error: '필수 설정 항목이 누락되었습니다.' }, { status: 400 });
    }

    await updateRows('expense_settings', {
      monthly_budget: Number(monthly_budget),
      is_alert_enabled: Number(is_alert_enabled),
      alert_threshold_percent: Number(alert_threshold_percent),
      alert_sms_template,
      alert_phone
    }, { filters: { id: '1' } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating expense settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
