export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { createTable, queryTable, insertRows } from '../../../../../egdesk-helpers';

/**
 * 🛡️ 임직원 상세 인적사항(프로필) 테이블 자율 생성 및 데모 백필 (Self-Healing Auto-Migration)
 */
async function initProfilesDatabase() {
  try {
    // crm_operator_profiles 테이블 존재 여부 검사 (실패 시 즉각 신설)
    await queryTable('crm_operator_profiles', { limit: 1 }).catch(async () => {
      console.log('crm_operator_profiles 테이블이 발견되지 않아 즉석 신설을 진행합니다...');

      await createTable('임직원 인적사항 상세 대장', [
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'department', type: 'TEXT', defaultValue: '미정' },
        { name: 'hire_date', type: 'TEXT', notNull: true },
        { name: 'commute_area', type: 'TEXT', defaultValue: '인근 통근' },
        { name: 'skills', type: 'TEXT', defaultValue: '일반 서무' },
        { name: 'backup_operator_id', type: 'TEXT', defaultValue: 'none' },
        { name: 'updated_at', type: 'TEXT', notNull: true }
      ], {
        tableName: 'crm_operator_profiles',
        uniqueKeyColumns: ['operator_id']
      });

      // 기본 데모 4인 상세 프로필 백필 적재
      const nowStr = new Date().toISOString();
      const defaultProfiles = [
        {
          operator_id: '1',
          department: '대표이사실',
          hire_date: '2024-01-01',
          commute_area: '경기도 성남시 분당구 - 자차 통근',
          skills: '경영지원, SCM 총괄, ERP 시스템 관리',
          backup_operator_id: '2',
          tenant_id: 'default',
          updated_at: nowStr
        },
        {
          operator_id: '2',
          department: '구매팀',
          hire_date: '2025-03-10',
          commute_area: '서울 마포구 - 지하철 통근 (대중교통의존)',
          skills: '자재 관리, 발주 및 수주 조율, SCM 실무',
          backup_operator_id: '3',
          tenant_id: 'default',
          updated_at: nowStr
        },
        {
          operator_id: '3',
          department: '생산공장',
          hire_date: '2025-07-20',
          commute_area: '인천 부평구 - 지하철 통근 (원거리대중교통)',
          skills: '조립 라인 총괄, 자재 조달 조율, 기계 오퍼레이팅',
          backup_operator_id: '2',
          tenant_id: 'default',
          updated_at: nowStr
        },
        {
          operator_id: '4',
          department: '개발본부',
          hire_date: '2026-02-15',
          commute_area: '경기도 수원시 - 광역버스 통근 (원거리교통)',
          skills: 'IT 시스템 지원, 재고 전산 관리, 데이터 엔지니어링',
          backup_operator_id: '1',
          tenant_id: 'default',
          updated_at: nowStr
        }
      ];

      await insertRows('crm_operator_profiles', defaultProfiles);
      console.log('✓ 임직원 4인에 대한 인적사항 상세 프로필 데이터 백필 완료!');
    });
  } catch (err) {
    console.error('Profiles DB 초기화 및 백필 중 오류:', err);
  }
}

// 🔑 세션 토큰 디코딩 및 격리 컨텍스트 획득 헬퍼
async function verifyUserRole() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    const username = payload.username as string || '';
    const tenantId = payload.tenant_id as string || 'default';
    const isAuthorized = role === 'SUPER_ADMIN' || role === 'SUB_OPERATOR';
    return { isAuthorized, role, name, username, tenantId };
  } catch (e) {
    return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
  }
}

/**
 * GET: 전사 직원 목록과 병합된 상세 인적사항(프로필) 정보 조회
 */
export async function GET() {
  try {
    await initProfilesDatabase();

    const { isAuthorized, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    // 1. 직원 마스터 정보 조회 (테넌트 격리)
    const queryFilters: any = { is_active: '1' };
    if (loggedUsername !== 'admin') {
      queryFilters.tenant_id = tenantId;
    }
    const operatorsRes = await queryTable('crm_operators', { filters: queryFilters });
    const employees = operatorsRes.rows || [];

    // 2. 직원 상세 프로필 정보 조회 (테넌트 격리)
    const profileFilters: any = {};
    if (loggedUsername !== 'admin') {
      profileFilters.tenant_id = tenantId;
    }
    const profilesRes = await queryTable('crm_operator_profiles', { filters: profileFilters });
    const profiles = profilesRes.rows || [];

    // 3. 직원 마스터에 상세 프로필 1:1 병합
    const mergedProfiles = employees.map((emp: any) => {
      const pf = profiles.find((p: any) => String(p.operator_id) === String(emp.id)) || {
        department: '미정',
        hire_date: emp.created_at ? emp.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        commute_area: '인근 통근',
        skills: '일반 서무',
        backup_operator_id: 'none'
      };

      return {
        operator_id: emp.id,
        name: emp.name,
        username: emp.username,
        role: emp.role,
        employee_number: emp.employee_number,
        department: pf.department,
        hire_date: pf.hire_date,
        commute_area: pf.commute_area,
        skills: pf.skills,
        backup_operator_id: pf.backup_operator_id,
        updated_at: pf.updated_at || pf.created_at || new Date().toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      profiles: mergedProfiles
    });
  } catch (error: any) {
    console.error('Profiles GET API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 특정 직원의 상세 인적사항(프로필) 편집 및 갱신 (Upsert)
 */
export async function POST(req: Request) {
  try {
    await initProfilesDatabase();

    const { isAuthorized, tenantId, role: sessionRole } = await verifyUserRole();
    if (!isAuthorized || (sessionRole !== 'SUPER_ADMIN' && sessionRole !== 'PRESIDENT')) {
      return NextResponse.json({ success: false, error: '인적사항 변경 권한이 없습니다. 최고운영자 계정으로 로그인해 주세요.' }, { status: 403 });
    }

    const { operator_id, department, hire_date, commute_area, skills, backup_operator_id } = await req.json();

    if (!operator_id) {
      return NextResponse.json({ success: false, error: '인적사항을 변경할 직원 ID가 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date().toISOString();
    const updatedProfile = {
      operator_id: String(operator_id),
      department: department || '미정',
      hire_date: hire_date || new Date().toISOString().split('T')[0],
      commute_area: commute_area || '인근 통근',
      skills: skills || '일반 서무',
      backup_operator_id: backup_operator_id || 'none',
      tenant_id: tenantId,
      updated_at: nowStr
    };

    // Upsert 형태로 삽입/갱신
    await insertRows('crm_operator_profiles', [updatedProfile]);

    return NextResponse.json({
      success: true,
      message: '임직원 상세 인적사항이 실시간 성공적으로 갱신되었습니다 📝',
      profile: updatedProfile
    });

  } catch (error: any) {
    console.error('Profiles POST API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
