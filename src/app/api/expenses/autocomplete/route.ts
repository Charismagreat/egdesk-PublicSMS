export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable } from '@/../egdesk-helpers';

export async function GET() {
  try {
    // 1. B2B 거래처 명단 조회 (crm_partners 테이블 - 거래처 관리 AI 연동)
    let partners: string[] = [];
    try {
      const partnersRes = await queryTable('crm_partners');
      if (partnersRes.rows && partnersRes.rows.length > 0) {
        partners = partnersRes.rows
          .map((p: any) => String(p.company_name || '').trim())
          .filter(Boolean);
      }
    } catch (e) {
      console.log('crm_partners query failed, using defaults.');
    }
    if (partners.length === 0) {
      partners = ['효성텍스타일', '동우일렉트릭', '대신정기화물', '스타벅스강남점', '알파문구', '쿠팡비즈니스'];
    }

    // 2. 사내 임직원 명단 조회 (expense_employees 테이블 - 사용자 동적 조작 연동)
    let staff: string[] = [];
    try {
      const empsRes = await queryTable('expense_employees');
      if (empsRes.rows && empsRes.rows.length > 0) {
        staff = empsRes.rows
          .map((emp: any) => String(emp.name || '').trim())
          .filter(Boolean);
      }
    } catch (e) {
      console.log('expense_employees query failed, using defaults.');
    }
    if (staff.length === 0) {
      staff = ['김경리', '홍길동', '이철수', '박영희', '최민수', '이영민'];
    }

    // 3. 사내 조직도 부서 명단 조회 (expense_departments 테이블 - 사용자 동적 조작 연동)
    let departments: string[] = [];
    try {
      const deptsRes = await queryTable('expense_departments');
      if (deptsRes.rows && deptsRes.rows.length > 0) {
        departments = deptsRes.rows
          .map((dept: any) => String(dept.name || '').trim())
          .filter(Boolean);
      }
    } catch (e) {
      console.log('expense_departments query failed, using defaults.');
    }
    if (departments.length === 0) {
      departments = ['경영지원팀', 'SCM팀', '물류운송부', '기술개발부', '영업본부', '인사총무부', '기획디자인팀', '마케팅홍보팀'];
    }

    // 4. 수행 프로젝트 명단 조회 (expense_projects 테이블 - 사용자 동적 조작 연동)
    let projects: string[] = [];
    try {
      const projsRes = await queryTable('expense_projects');
      if (projsRes.rows && projsRes.rows.length > 0) {
        projects = projsRes.rows
          .map((proj: any) => String(proj.name || '').trim())
          .filter(Boolean);
      }
    } catch (e) {
      console.log('expense_projects query failed, using defaults.');
    }
    if (projects.length === 0) {
      projects = ['FreeSMS 서비스 고도화', 'B2B 유통 플랫폼 개발', 'SCM 자율 관제 시스템', '오프라인 매장 POS 연동', '고객 마일리지 부스터 프로젝트'];
    }

    // 중복 제거 및 가나다 정렬
    const uniquePartners = Array.from(new Set(partners)).sort();
    const uniqueStaff = Array.from(new Set(staff)).sort();
    const uniqueDepts = Array.from(new Set(departments)).sort();
    const uniqueProjs = Array.from(new Set(projects)).sort();

    return NextResponse.json({
      success: true,
      data: {
        partners: uniquePartners,
        staff: uniqueStaff,
        departments: uniqueDepts,
        projects: uniqueProjs
      }
    });
  } catch (error: any) {
    console.error('Error fetching autocomplete dynamic B2B/organization entities:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
