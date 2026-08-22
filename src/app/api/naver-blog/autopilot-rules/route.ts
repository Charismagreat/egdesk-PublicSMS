export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

// 기본 시드 규칙 정의
const DEFAULT_RULES = [
  {
    id: 1,
    name: '매일 아침 정보제공형 포스팅',
    interval_type: 'DAILY',
    scheduled_time: '07:45',
    tone_style: '정보제공형',
    is_active: 1
  },
  {
    id: 2,
    name: '주말 오후 친근한일상형 내돈내산',
    interval_type: 'WEEKEND',
    scheduled_time: '14:00',
    tone_style: '친근한일상형',
    is_active: 1
  }
];

// egdesk-helpers.ts 의 queryTable 함수만을 사용하여 DB에서 테넌트별 규칙 목록 조회
async function getRulesFromDb(tenantId: string): Promise<any[]> {
  try {
    const pageId = `naver_blog_autopilot_rules_${tenantId}`;
    let res = await queryTable('crm_custom_page_data', { filters: { page_id: pageId } });
    
    // 테넌트 전용 데이터가 없는데 default 테넌트인 경우 하위 호환 조회
    if ((!res.rows || res.rows.length === 0) && tenantId === 'default') {
      res = await queryTable('crm_custom_page_data', { filters: { page_id: 'naver_blog_autopilot_rules' } });
    }

    if (res.rows && res.rows.length > 0) {
      const rowData = res.rows[0].row_data;
      if (rowData) {
        const parsed = JSON.parse(rowData);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('egdesk-helpers queryTable 조회 오류:', e);
  }
  return DEFAULT_RULES;
}

// egdesk-helpers.ts 의 insertRows / updateRows 함수만을 사용하여 DB에 테넌트별 규칙 데이터 반영
async function saveRulesToDb(rules: any[], tenantId: string): Promise<boolean> {
  try {
    const pageId = `naver_blog_autopilot_rules_${tenantId}`;
    const res = await queryTable('crm_custom_page_data', { filters: { page_id: pageId } });
    const rowStr = JSON.stringify(rules);
    if (res.rows && res.rows.length > 0) {
      await updateRows('crm_custom_page_data', { row_data: rowStr }, { filters: { page_id: pageId } });
    } else {
      await insertRows('crm_custom_page_data', [{
        id: Date.now(),
        page_id: pageId,
        row_data: rowStr,
        tenant_id: tenantId
      }]);
    }
    return true;
  } catch (e: any) {
    console.error('egdesk-helpers DB 저장 오류:', e);
    throw new Error('DB 저장 실패: ' + e.message);
  }
}

export async function GET(req: Request) {
  try {
    const rawTenantId = await getTenantId();
    const tenantId = rawTenantId || 'default';
    const rules = await getRulesFromDb(tenantId);
    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    return NextResponse.json({ success: false, rules: DEFAULT_RULES, error: error.message });
  }
}

export async function POST(req: Request) {
  try {
    const rawTenantId = await getTenantId();
    const tenantId = rawTenantId || 'default';

    const data = await req.json();
    const { action, rule, ruleId } = data;
    let rules = await getRulesFromDb(tenantId);

    if (action === 'create') {
      const newRule = {
        id: Date.now(),
        name: rule.name || '새 오토파일럿 규칙',
        interval_type: rule.interval_type || 'DAILY',
        scheduled_time: rule.scheduled_time || '10:00',
        tone_style: rule.tone_style || '정보제공형',
        is_active: rule.is_active !== undefined ? Number(rule.is_active) : 1,
        created_at: new Date().toISOString()
      };
      rules = [newRule, ...rules];
    } else if (action === 'update' && ruleId) {
      rules = rules.map(r => r.id === Number(ruleId) ? { ...r, ...rule } : r);
    } else if (action === 'toggle' && ruleId) {
      rules = rules.map(r => r.id === Number(ruleId) ? { ...r, is_active: Number(r.is_active) === 1 ? 0 : 1 } : r);
    } else if (action === 'delete' && ruleId) {
      rules = rules.filter(r => r.id !== Number(ruleId));
    }

    await saveRulesToDb(rules, tenantId);
    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    console.error('오토파일럿 규칙 DB 조작 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
