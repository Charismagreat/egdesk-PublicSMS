export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { createTable, queryTable, insertRows, deleteRows } from '../../../../../../egdesk-helpers';

/**
 * 🛡️ 회사 일정 유형 마스터 대장 데이터베이스 자율 마이그레이션 (Self-Healing Auto-Migration)
 */
async function initCompanyEventTypesDatabase() {
  try {
    // 테이블 존재 여부 확인 차원 쿼리 (실패하면 테이블이 없는 것)
    await queryTable('crm_company_event_types', { limit: 1 }).catch(async () => {
      console.log('회사 일정 유형 마스터 대장 테이블이 발견되지 않아 자율 생성을 시작합니다...');
      
      // 1. crm_company_event_types 테이블 신설
      await createTable('회사 일정 유형 마스터 대장', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'type_key', type: 'TEXT', notNull: true },
        { name: 'type_name', type: 'TEXT', notNull: true },
        { name: 'color_theme', type: 'TEXT', notNull: true }, // Indigo, Rose, Amber, Purple, Emerald, Cyan, Lime, Teal, Pink, Slate
        { name: 'is_system', type: 'INTEGER', defaultValue: 0 }, // 1이면 기본 제공 시스템 유형 (UX 가이드용)
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'updated_at', type: 'TEXT', notNull: true }
      ], {
        tableName: 'crm_company_event_types',
        uniqueKeyColumns: ['id']
      });

      // 2. 기본 6대 필수 일정 유형 백필 (Seeding)
      const nowStr = new Date().toISOString();
      const defaultTypes = [
        {
          id: 'type-seed-1',
          type_key: 'COMPANY_EVENT',
          type_name: '회사 공동 행사',
          color_theme: 'Indigo',
          is_system: 1,
          created_at: nowStr,
          updated_at: nowStr
        },
        {
          id: 'type-seed-2',
          type_key: 'HOLIDAY',
          type_name: '공식 휴일/빨간날',
          color_theme: 'Rose',
          is_system: 1,
          created_at: nowStr,
          updated_at: nowStr
        },
        {
          id: 'type-seed-3',
          type_key: 'DEPT_EVENT',
          type_name: '부서별/팀별 세션',
          color_theme: 'Cyan',
          is_system: 1,
          created_at: nowStr,
          updated_at: nowStr
        },
        {
          id: 'type-seed-4',
          type_key: 'DEADLINE',
          type_name: '업무 마감/제출 기한',
          color_theme: 'Amber',
          is_system: 1,
          created_at: nowStr,
          updated_at: nowStr
        },
        {
          id: 'type-seed-5',
          type_key: 'LEGAL',
          type_name: '법정 의무 교육/검진',
          color_theme: 'Purple',
          is_system: 1,
          created_at: nowStr,
          updated_at: nowStr
        },
        {
          id: 'type-seed-6',
          type_key: 'EDUCATION',
          type_name: '전사 직무 교육/세미나',
          color_theme: 'Emerald',
          is_system: 1,
          created_at: nowStr,
          updated_at: nowStr
        }
      ];

      await insertRows('crm_company_event_types', defaultTypes).catch(e => console.error(e));
      console.log('✓ 기존 6대 기본 일정 유형 백필 인서트 완료');
    });
  } catch (err) {
    console.error('회사 일정 유형 마스터 대장 마이그레이션 실패:', err);
  }
}

/**
 * 📂 일정 유형 마스터 리스트 조회
 */
export async function GET() {
  try {
    // DB 테이블 자동 생성 및 백필 작동
    await initCompanyEventTypesDatabase();

    const typesRes = await queryTable('crm_company_event_types', { orderBy: 'created_at', orderDirection: 'ASC' });
    const eventTypes = typesRes.rows || [];

    return NextResponse.json({
      success: true,
      types: eventTypes
    });
  } catch (error: any) {
    console.error('Event Types GET API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * 📂 일정 유형 신규 생성 & 무결성 락 검증 기반 삭제
 */
export async function POST(req: Request) {
  try {
    await initCompanyEventTypesDatabase();

    const { action, type_name, color_theme, type_key } = await req.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const sessionUser = decodeJwt(token);

    // 최고관리자 및 대표자 권한 가드
    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '회사 마스터 대장을 편집할 권한이 없습니다. (최고관리자 전용)' }, { status: 403 });
    }

    const now = new Date();

    // ==========================================
    // 📂 액션 1: 신규 일정 유형 추가 (CREATE)
    // ==========================================
    if (action === 'CREATE') {
      if (!type_name || !color_theme) {
        return NextResponse.json({ success: false, error: '일정 유형 이름과 색상 테마를 올바르게 선택해 주세요.' }, { status: 400 });
      }

      const trimmedName = type_name.trim();

      // 한글명 중복 검사
      const existingRes = await queryTable('crm_company_event_types', { filters: { type_name: trimmedName } });
      if (existingRes.rows && existingRes.rows.length > 0) {
        return NextResponse.json({ success: false, error: '이미 동일한 이름의 일정 유형이 마스터 대장에 등록되어 있습니다.' }, { status: 400 });
      }

      // 고유 Key 생성
      const timestamp = Date.now();
      const generatedKey = `CUSTOM_TYPE_${timestamp}`;

      const newType = {
        id: `type-${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
        type_key: generatedKey,
        type_name: trimmedName,
        color_theme,
        is_system: 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await insertRows('crm_company_event_types', [newType]);

      return NextResponse.json({
        success: true,
        message: `신규 일정 유형 [${trimmedName}]이 성공적으로 마스터 대장에 추가되었습니다 🎨`,
        type: newType
      });
    }

    // ==========================================
    // 📂 액션 2: 일정 유형 삭제 (DELETE) + 무결성 락 검증
    // ==========================================
    if (action === 'DELETE') {
      if (!type_key) {
        return NextResponse.json({ success: false, error: '삭제할 일정 유형의 고유 Key가 누락되었습니다.' }, { status: 400 });
      }

      // 무결성 락 검증: crm_company_events 테이블에서 해당 event_type을 사용하는 일정이 1건이라도 존재하는지 검사
      const existingEventsRes = await queryTable('crm_company_events', { filters: { event_type: type_key } });
      const attachedCount = existingEventsRes.rows ? existingEventsRes.rows.length : 0;

      if (attachedCount > 0) {
        return NextResponse.json({
          success: false,
          error: `현재 이 일정 유형을 사용 중인 캘린더 일정이 ${attachedCount}건 등록되어 있습니다. 데이터 무결성을 위해 삭제를 차단합니다. 일정을 먼저 변경하거나 삭제해 주세요 🔒`
        }, { status: 400 });
      }

      // 안전성 체크 통과 시 삭제 집행
      await deleteRows('crm_company_event_types', { filters: { type_key } });

      return NextResponse.json({
        success: true,
        message: '일정 유형이 마스터 대장에서 안전하게 제거 완료되었습니다 🗑️'
      });
    }

    return NextResponse.json({ success: false, error: '잘못된 액션 요청입니다.' }, { status: 400 });

  } catch (error: any) {
    console.error('Event Types POST API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
