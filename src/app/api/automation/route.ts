export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, deleteRows, insertRows } from '../../../../egdesk-helpers';

// Helper to interact with MCP for saving settings using egdesk-helpers.ts
async function saveSetting(key: string, value: string) {
  // 기존 설정 데이터 키 삭제
  await deleteRows('system_settings', { filters: { key } });

  // 새로운 데이터 안전하게 삽입
  await insertRows('system_settings', [{ 
    key, 
    value, 
    created_at: new Date().toISOString() 
  }]);
}

export async function GET() {
  try {
    const settings = await queryTable('system_settings', {});
    const ruleRow = settings.rows?.find((r: any) => r.key === 'automation_rules');
    const rules = ruleRow ? JSON.parse(ruleRow.value) : {};
    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    console.error('Error fetching automation rules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { rules } = await req.json();
    if (!rules) {
      return NextResponse.json({ success: false, error: 'Rules object is required' }, { status: 400 });
    }

    await saveSetting('automation_rules', JSON.stringify(rules));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving automation rules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
