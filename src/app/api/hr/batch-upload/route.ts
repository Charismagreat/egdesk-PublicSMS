export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import bcrypt from 'bcryptjs';
import { queryTable, insertRows, updateRows } from '@/../egdesk-helpers';

/**
 * 📊 POST: 전사 HR 인사 종합 데이터 엑셀/CSV 일괄 업서트 API
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다.' }, { status: 401 });
    }

    const body = await req.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: '업로드할 HR 데이터 행이 존재하지 않습니다.' }, { status: 400 });
    }

    // 기존 데이터 로딩
    const [existingUsersRes, existingOperatorsRes] = await Promise.all([
      queryTable('users'),
      queryTable('crm_operators')
    ]);

    const existingUsers = existingUsersRes.rows || [];
    const existingOperators = existingOperatorsRes.rows || [];

    const nowStr = new Date().toISOString();
    const todayDateStr = nowStr.split('T')[0];
    const defaultHashedPassword = await bcrypt.hash('1234', 10);

    let createdCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const name = String(row.name || row.성명 || row.이름 || '').trim();
      if (!name) continue;

      let username = String(row.username || row.아이디 || row.사번 || '').trim().toLowerCase();
      if (!username) {
        username = `emp_${Math.floor(Math.random() * 9000) + 1000}`;
      }

      const email = String(row.email || row.이메일 || `${username}@egdesk.cloud`).trim();
      const phone = String(row.phone || row.전화번호 || row.휴대폰 || '010-0000-0000').trim();
      const department = String(row.department || row.부서 || '경영지원팀').trim();
      const role = String(row.role || row.직급 || row.권한 || '일반직원').trim();
      const hireDate = String(row.hireDate || row.입사일 || todayDateStr).trim();
      const hourlyWage = Number(row.hourlyWage || row.시급 || 10030);
      const weeklyHours = Number(row.weeklyHours || row.주당근무시간 || 40);
      const allowHolidayPay = row.allowHolidayPay === 'Y' || row.주휴수당여부 === 'Y' || row.주휴수당 === '유' ? 1 : 1;
      
      // 학력 정보
      const schoolName = String(row.schoolName || row.최종출신학교 || row.학교명 || '').trim();
      const major = String(row.major || row.전공 || 'N/A').trim();
      const degree = String(row.degree || row.학위 || '학사').trim();
      const graduationDate = String(row.graduationDate || row.졸업일 || '2015-02-25').trim();

      // 경력 정보
      const companyName = String(row.companyName || row.이전회사명 || row.주요이전경력 || '').trim();
      const prevDept = String(row.prevDept || row.이전부서 || '기획팀').trim();
      const prevJobTitle = String(row.prevJobTitle || row.이전직급 || '대리').trim();
      const leavingReason = String(row.leavingReason || row.이직사유 || '이직').trim();

      // 1. 유저 계정 검사 및 등록/갱신
      const existingUser = existingUsers.find((u: any) => String(u.username).toLowerCase() === username);
      let userId: string;

      if (existingUser) {
        userId = String(existingUser.id);
        await updateRows('users', {
          name,
          email,
          phone,
          department,
          updated_at: nowStr
        }, { filters: { id: userId } });
        updatedCount++;
      } else {
        userId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await insertRows('users', [{
          id: userId,
          username,
          password: defaultHashedPassword,
          name,
          email,
          phone,
          role: 'EMPLOYEE',
          department,
          leave_balance: 15,
          created_at: nowStr,
          updated_at: nowStr
        }]);
        createdCount++;
      }

      // 2. crm_operators (직원 마스터) 등록/갱신
      const existingOp = existingOperators.find((o: any) => String(o.username).toLowerCase() === username || String(o.id) === userId);
      let opId = userId;

      if (existingOp) {
        opId = String(existingOp.id);
        await updateRows('crm_operators', {
          name,
          username,
          role: 'EMPLOYEE',
          is_active: '1',
          updated_at: nowStr
        }, { filters: { id: opId } });
      } else {
        await insertRows('crm_operators', [{
          id: opId,
          name,
          username,
          role: 'EMPLOYEE',
          employee_number: username.toUpperCase(),
          is_active: '1',
          created_at: nowStr,
          updated_at: nowStr
        }]);
      }

      // 3. 인적사항 프로필 (crm_operator_profiles) 업서트
      await updateRows('crm_operator_profiles', {
        department,
        hire_date: hireDate,
        updated_at: nowStr
      }, { filters: { operator_id: opId } }).catch(async () => {
        await insertRows('crm_operator_profiles', [{
          operator_id: opId,
          department,
          hire_date: hireDate,
          commute_area: '인근 통근',
          skills: '일반 사무, MS Office',
          backup_operator_id: 'none',
          created_at: nowStr,
          updated_at: nowStr
        }]);
      });

      // 4. 근로계약 조건 (crm_operator_contracts) 업서트
      await updateRows('crm_operator_contracts', {
        hourly_wage: hourlyWage,
        weekly_hours: weeklyHours,
        allow_weekly_holiday_paid: allowHolidayPay,
        updated_at: nowStr
      }, { filters: { operator_id: opId } }).catch(async () => {
        await insertRows('crm_operator_contracts', [{
          operator_id: opId,
          hourly_wage: hourlyWage,
          weekly_hours: weeklyHours,
          allow_weekly_holiday_paid: allowHolidayPay,
          overtime_paid: 1,
          work_days: '월,화,수,목,금',
          contract_memo: 'HR 엑셀 일괄 등록 완료',
          created_at: nowStr,
          updated_at: nowStr
        }]);
      });

      // 5. 학력 정보 추가 (입력되었을 경우)
      if (schoolName) {
        await insertRows('crm_operator_education', [{
          id: `edu_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          operator_id: opId,
          school_name: schoolName,
          major,
          degree,
          entrance_date: '2010-03-02',
          graduation_date: graduationDate,
          status: '졸업',
          created_at: nowStr,
          updated_at: nowStr
        }]);
      }

      // 6. 이전 경력 정보 추가 (입력되었을 경우)
      if (companyName) {
        await insertRows('crm_operator_careers', [{
          id: `car_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          operator_id: opId,
          company_name: companyName,
          department: prevDept,
          job_title: prevJobTitle,
          join_date: '2018-03-01',
          retire_date: '2023-12-31',
          leaving_reason: leavingReason,
          created_at: nowStr,
          updated_at: nowStr
        }]);
      }
    }

    return NextResponse.json({
      success: true,
      message: `🎉 전사 HR 인사 정보 일괄 업로드 완료! (신규 등록: ${createdCount}명, 갱신: ${updatedCount}명)`
    });
  } catch (err: any) {
    console.error('HR batch upload error:', err);
    return NextResponse.json({ success: false, error: err.message || 'HR 일괄 등록 처리 중 에러 발생' }, { status: 500 });
  }
}
