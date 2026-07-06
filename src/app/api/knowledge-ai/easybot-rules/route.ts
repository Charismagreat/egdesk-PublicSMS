export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows, deleteRows, executeSQL } from '../../../../../egdesk-helpers';

// KST 날짜 포맷팅 헬퍼
function getKstNowStr() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * GET: 이지봇 규칙 리스트 및 변경 히스토리 타임라인 조회
 */
export async function GET(req: Request) {
  try {
    // 1. 규칙 조회 (소프트 삭제 필터링 기본 적용)
    // database-audit-rules 규격에 의거: deleted_at IS NULL 필수
    const rulesRes = await queryTable('easybot_rules', {
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
    const rules = (rulesRes.rows || []).filter((r: any) => !r.deleted_at);

    // 2. 히스토리 조회 및 조작자 실명(operators.name) 매핑
    let history: any[] = [];
    try {
      const histQuery = `
        SELECT h.*, o.name as operator_name
        FROM easybot_rules_history h
        LEFT JOIN crm_operators o ON h.operator_id = CAST(o.id AS TEXT)
        WHERE h.deleted_at IS NULL
        ORDER BY h.created_at DESC
      `;
      const histRes = await executeSQL(histQuery);
      history = histRes.rows || [];
    } catch (histErr) {
      console.warn('History query with JOIN failed, falling back to simple query:', histErr);
      const simpleHist = await queryTable('easybot_rules_history', {
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      history = simpleHist.rows || [];
    }

    return NextResponse.json({
      success: true,
      rules,
      history
    });
  } catch (error: any) {
    console.error('EasyBot Rules GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 이지봇 규칙 신규 등록 및 수정 (이력 기록 연동)
 */
export async function POST(req: Request) {
  try {
    // 1. 세션 권한 검증 가드
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다.' }, { status: 401 });
    }

    const sessionUser = decodeJwt(token);
    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '규칙을 변경할 권한이 없습니다. 최고관리자로 전환해 주세요.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      title,
      target_table,
      conditions_sql,
      assignee_id,
      task_priority,
      task_title_template,
      task_content_template,
      is_active = 1,
      change_reason = '관제 규칙 갱신'
    } = body;

    if (!title || !target_table || !conditions_sql || !assignee_id || !task_title_template || !task_content_template) {
      return NextResponse.json({ success: false, error: '필수 설정 입력 항목이 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = getKstNowStr();
    const operatorId = String(sessionUser.id || '1');

    if (id) {
      // ================= UPDATE 분기 =================
      // 기존 스냅샷 확보
      const prevRes = await queryTable('easybot_rules', { filters: { id } });
      const prevRule = prevRes.rows && prevRes.rows.length > 0 ? prevRes.rows[0] : null;

      if (!prevRule) {
        return NextResponse.json({ success: false, error: '수정할 대상을 찾을 수 없습니다.' }, { status: 404 });
      }

      // 수정 데이터 적재
      const updatedRule = {
        title,
        target_table,
        conditions_sql,
        assignee_id: String(assignee_id),
        task_priority,
        task_title_template,
        task_content_template,
        is_active: Number(is_active),
        updated_at: nowStr,
        updated_by: sessionUser.username || 'admin'
      };

      await updateRows('easybot_rules', updatedRule, { filters: { id } });

      // 이력 대장 기록 삽입
      await insertRows('easybot_rules_history', [{
        id: `rhist-${Date.now()}`,
        rule_id: id,
        action_type: 'UPDATE',
        previous_value_json: JSON.stringify(prevRule),
        new_value_json: JSON.stringify({ ...prevRule, ...updatedRule }),
        change_reason: change_reason || '규칙 속성 갱신',
        operator_id: operatorId,
        created_at: nowStr
      }]);

      return NextResponse.json({ success: true, message: '규칙이 성공적으로 수정되었으며 변경 이력이 등록되었습니다.' });

    } else {
      // ================= CREATE 분기 =================
      const newRuleId = `rule-${Date.now()}`;
      const newRule = {
        id: newRuleId,
        title,
        target_table,
        conditions_sql,
        assignee_id: String(assignee_id),
        task_priority,
        task_title_template,
        task_content_template,
        is_active: Number(is_active),
        created_at: nowStr
      };

      await insertRows('easybot_rules', [newRule]);

      // 이력 대장 기록 삽입
      await insertRows('easybot_rules_history', [{
        id: `rhist-${Date.now()}`,
        rule_id: newRuleId,
        action_type: 'CREATE',
        previous_value_json: null,
        new_value_json: JSON.stringify(newRule),
        change_reason: change_reason || '최초 규칙 신설',
        operator_id: operatorId,
        created_at: nowStr
      }]);

      return NextResponse.json({ success: true, message: '새로운 관제 규칙이 등록되었습니다.' });
    }

  } catch (error: any) {
    console.error('EasyBot Rules POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: 이지봇 규칙 비활성화 및 소프트 삭제 (이력 기록 연동)
 */
export async function DELETE(req: Request) {
  try {
    // 1. 세션 권한 검증 가드
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다.' }, { status: 401 });
    }

    const sessionUser = decodeJwt(token);
    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '규칙을 삭제할 권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const change_reason = searchParams.get('change_reason') || '규칙 삭제';

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 규칙 ID가 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = getKstNowStr();
    const operatorId = String(sessionUser.id || '1');

    // 기존 스냅샷 확보
    const prevRes = await queryTable('easybot_rules', { filters: { id } });
    const prevRule = prevRes.rows && prevRes.rows.length > 0 ? prevRes.rows[0] : null;

    if (!prevRule) {
      return NextResponse.json({ success: false, error: '삭제할 대상을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 소프트 삭제 처리 (database-audit-rules 규격 준수: deleted_at / deleted_by 세팅)
    const deletedFields = {
      is_active: 0,
      deleted_at: nowStr,
      deleted_by: sessionUser.username || 'admin'
    };

    await updateRows('easybot_rules', deletedFields, { filters: { id } });

    // 이력 대장 기록 삽입
    await insertRows('easybot_rules_history', [{
      id: `rhist-${Date.now()}`,
      rule_id: id,
      action_type: 'DELETE',
      previous_value_json: JSON.stringify(prevRule),
      new_value_json: JSON.stringify({ ...prevRule, ...deletedFields }),
      change_reason,
      operator_id: operatorId,
      created_at: nowStr
    }]);

    return NextResponse.json({ success: true, message: '규칙이 소프트 삭제되었습니다.' });

  } catch (error: any) {
    console.error('EasyBot Rules DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
