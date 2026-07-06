export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { executeSQL } from '../../../../../../egdesk-helpers';

// 🚨 보안용 테이블 화이트리스트
const ALLOWED_TABLES = [
  'crm_expenses',
  'crm_orders',
  'crm_deliveries',
  'products',
  'crm_snaptasks'
];

/**
 * POST: 사용자가 입력한 조건식의 안전성 검증 및 기존 DB 내 영향 범위(매칭 건수/샘플) 분석
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
      return NextResponse.json({ success: false, error: '시뮬레이션 권한이 없습니다.' }, { status: 403 });
    }

    const { target_table, conditions_sql } = await req.json();

    if (!target_table) {
      return NextResponse.json({ success: false, error: '분석 대상 테이블명이 누락되었습니다.' }, { status: 400 });
    }

    // 2. 보안 가드 (1) - 테이블 화이트리스트 체크
    if (!ALLOWED_TABLES.includes(target_table)) {
      return NextResponse.json({ 
        success: false, 
        error: `보안 제한: 허용되지 않은 테이블입니다. (허용 테이블: ${ALLOWED_TABLES.join(', ')})` 
      }, { status: 400 });
    }

    // 3. 보안 가드 (2) - 악의적 SQL 인젝션 키워드 차단 및 다중 구문(;) 차단
    const cleanConditions = (conditions_sql || '').trim();
    if (cleanConditions) {
      const blackList = /union|insert|update|delete|drop|alter|create|replace|truncate|;/i;
      if (blackList.test(cleanConditions)) {
        return NextResponse.json({ 
          success: false, 
          error: '보안 오류: 조건식에 세미콜론(;) 또는 위험한 데이터 조작 키워드(UNION, DROP, DELETE 등)가 포함되어 있습니다. 안전한 조회 조건식만 입력해 주세요.' 
        }, { status: 400 });
      }
    }

    // 4. SQL 쿼리 빌드 및 영향도 분석
    // 데이터베이스 감사 규칙 준수: deleted_at IS NULL 필터 강제 추가
    const whereClause = cleanConditions ? `(${cleanConditions}) AND deleted_at IS NULL` : 'deleted_at IS NULL';
    const countQuery = `SELECT COUNT(*) as cnt FROM ${target_table} WHERE ${whereClause}`;
    const sampleQuery = `SELECT * FROM ${target_table} WHERE ${whereClause} ORDER BY created_at DESC LIMIT 3`;

    let totalCount = 0;
    let samples: any[] = [];

    try {
      // 카운트 쿼리 실행
      const countRes = await executeSQL(countQuery);
      totalCount = countRes.rows && countRes.rows.length > 0 ? Number(countRes.rows[0].cnt || 0) : 0;

      // 샘플 쿼리 실행
      const sampleRes = await executeSQL(sampleQuery);
      samples = sampleRes.rows || [];
    } catch (sqlErr: any) {
      console.warn('Simulation query execution failed:', sqlErr);
      return NextResponse.json({
        success: false,
        error: `조건식 구문 분석 오류: 올바른 SQL 조건절 문법에 맞게 입력해 주십시오. (에러 상세: ${sqlErr.message})`
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      count: totalCount,
      samples
    });

  } catch (error: any) {
    console.error('EasyBot Rule Simulation Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
