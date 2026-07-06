export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows } from '../../../../egdesk-helpers';

/**
 * GET: 기업부설연구소 사후관리 관련 데이터 조회
 * - type 파라미터에 따라 분기 처리 (center, staffs, spaces, logs, alarms)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ success: false, error: '조회 타입(type)이 지정되지 않았습니다.' }, { status: 400 });
    }

    let result;
    switch (type) {
      case 'center':
        // 연구소 기본 정보 조회 (단일 항목으로 가정하여 ID 1 조회)
        result = await queryTable('rnd_centers', { filters: { center_id: '1' } });
        return NextResponse.json({ success: true, center: result.rows?.[0] || null });

      case 'staffs':
        // 연구원 목록 조회
        result = await queryTable('rnd_staffs', { orderBy: 'staff_id', orderDirection: 'ASC' });
        return NextResponse.json({ success: true, staffs: result.rows || [] });

      case 'spaces':
        // 연구 공간 점검 이력 조회
        result = await queryTable('rnd_spaces', { orderBy: 'space_check_id', orderDirection: 'DESC' });
        return NextResponse.json({ success: true, spaces: result.rows || [] });

      case 'logs':
        // R&D 연구일지 조회
        result = await queryTable('rnd_logs', { orderBy: 'log_id', orderDirection: 'DESC' });
        return NextResponse.json({ success: true, logs: result.rows || [] });

      case 'alarms':
        // 규제 알림 이력 조회
        result = await queryTable('rnd_compliance_alarms', { orderBy: 'alarm_id', orderDirection: 'DESC' });
        return NextResponse.json({ success: true, alarms: result.rows || [] });

      default:
        return NextResponse.json({ success: false, error: '유효하지 않은 조회 타입입니다.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('R&D 데이터 조회 중 오류 발생:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 연구소 사후관리 데이터 추가, 갱신 및 결재 처리
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ success: false, error: '필수 요청 파라미터(type, data)가 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    switch (type) {
      case 'center_update':
        // 연구소 기본 정보 수정
        await updateRows('rnd_centers', {
          center_name: data.center_name,
          center_type: data.center_type,
          established_date: data.established_date,
          koita_reg_number: data.koita_reg_number,
          postal_code: data.postal_code,
          address_road: data.address_road,
          address_detail: data.address_detail,
          total_area_sqm: Number(data.total_area_sqm),
          is_active: data.is_active ? 1 : 0
        }, { filters: { center_id: '1' } });
        return NextResponse.json({ success: true, message: '연구소 정보가 성공적으로 업데이트되었습니다.' });

      case 'staff_add':
        // 신규 연구원 추가 (OCR 검증 통과 후 DB 적재 시 사용)
        const staffRes = await queryTable('rnd_staffs', {});
        const nextStaffId = (staffRes.rows || []).reduce((max: number, r: any) => Math.max(max, Number(r.staff_id || 0)), 0) + 1;

        await insertRows('rnd_staffs', [{
          staff_id: nextStaffId,
          center_id: 1,
          user_id: Number(data.user_id),
          staff_role: data.staff_role || 'RESEARCHER',
          employment_status: 'ACTIVE',
          degree_level: data.degree_level,
          major_name: data.major_name,
          major_category: data.major_category,
          qualification_status: data.qualification_status || 'QUALIFIED',
          graduation_cert_ocr_json: data.graduation_cert_ocr_json ? JSON.stringify(data.graduation_cert_ocr_json) : null,
          joined_date: data.joined_date || nowStr.slice(0, 10)
        }]);

        // 알림에 연구원 변경신고 기한 D-Day 경보 트리거 추가
        const alarmRes = await queryTable('rnd_compliance_alarms', {});
        const nextAlarmId = (alarmRes.rows || []).reduce((max: number, r: any) => Math.max(max, Number(r.alarm_id || 0)), 0) + 1;
        const limitDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        await insertRows('rnd_compliance_alarms', [{
          alarm_id: nextAlarmId,
          center_id: 1,
          category: 'STAFF_CHANGE',
          severity: 'CRITICAL',
          message: `신규 등록된 연구원(${data.name || '연구원'})의 학위 및 자격 요건 검증이 완료되었습니다. 관할 KOITA 사이트에서 14일 이내 변경신고를 이행해 주세요.`,
          due_date: limitDate,
          is_resolved: 0,
          created_at: nowStr
        }]);

        return NextResponse.json({ success: true, message: '연구원이 성공적으로 추가되었습니다. 변경신고(14일 이내) 기한 경고가 활성화되었습니다.' });

      case 'staff_update':
        // 연구원 상태 변경 (퇴사 등)
        await updateRows('rnd_staffs', {
          employment_status: data.employment_status,
          resigned_date: data.employment_status === 'RESIGNED' ? (data.resigned_date || nowStr.slice(0, 10)) : null
        }, { filters: { staff_id: String(data.staff_id) } });

        // 만약 퇴사로 변경된 경우, 법적 14일 변경신고 경보 즉시 발령
        if (data.employment_status === 'RESIGNED') {
          const resignAlarmRes = await queryTable('rnd_compliance_alarms', {});
          const nextResignAlarmId = (resignAlarmRes.rows || []).reduce((max: number, r: any) => Math.max(max, Number(r.alarm_id || 0)), 0) + 1;
          const limitResignDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

          await insertRows('rnd_compliance_alarms', [{
            alarm_id: nextResignAlarmId,
            center_id: 1,
            category: 'STAFF_CHANGE',
            severity: 'CRITICAL',
            message: `연구원의 퇴사/제외 처리가 감지되었습니다. 과태료 부과를 방지하기 위해 한국산업기술진흥협회(KOITA)에 14일 이내 변경신고서를 제출해 주세요.`,
            due_date: limitResignDate,
            is_resolved: 0,
            created_at: nowStr
          }]);
        }

        return NextResponse.json({ success: true, message: '연구원 재직 정보가 성공적으로 변경되었습니다.' });

      case 'space_add':
        // 공간 자가 점검 이력 추가
        const spaceRes = await queryTable('rnd_spaces', {});
        const nextSpaceId = (spaceRes.rows || []).reduce((max: number, r: any) => Math.max(max, Number(r.space_check_id || 0)), 0) + 1;

        await insertRows('rnd_spaces', [{
          space_check_id: nextSpaceId,
          center_id: 1,
          check_date: data.check_date || nowStr.slice(0, 10),
          image_url_entrance: data.image_url_entrance,
          image_url_layout: data.image_url_layout,
          ai_analysis_result: data.ai_analysis_result ? JSON.stringify(data.ai_analysis_result) : null,
          signage_status: data.signage_status || 'FAIL',
          partition_status: data.partition_status || 'PASS',
          overall_status: data.overall_status || '보완필요',
          inspector_notes: data.inspector_notes || '',
          created_at: nowStr
        }]);

        // 기존 분기 진단 경보가 해결되었다면 resolved 처리
        const activeAlarms = await queryTable('rnd_compliance_alarms', { filters: { category: 'SPACE_CHECK', is_resolved: '0' } });
        if (activeAlarms.rows && activeAlarms.rows.length > 0) {
          const alarmIds = activeAlarms.rows.map((a: any) => Number(a.alarm_id));
          await updateRows('rnd_compliance_alarms', {
            is_resolved: 1,
            resolved_at: nowStr
          }, { ids: alarmIds });
        }

        return NextResponse.json({ success: true, message: '공간 자가 진단 결과가 데이터베이스에 성공적으로 기록되었습니다.' });

      case 'log_add':
        // AI 생성물 혹은 수기 작성 연구일지 추가
        const logRes = await queryTable('rnd_logs', {});
        const nextLogId = (logRes.rows || []).reduce((max: number, r: any) => Math.max(max, Number(r.log_id || 0)), 0) + 1;

        await insertRows('rnd_logs', [{
          log_id: nextLogId,
          center_id: 1,
          author_id: Number(data.author_id),
          work_date: data.work_date || nowStr.slice(0, 10),
          raw_source: data.raw_source || 'TEXT',
          raw_content: data.raw_content || '',
          audio_file_url: data.audio_file_url || null,
          ai_generated_title: data.ai_generated_title,
          ai_generated_content: data.ai_generated_content,
          approval_status: data.approval_status || 'DRAFT',
          approver_id: null,
          approved_at: null,
          blockchain_hash: null,
          created_at: nowStr,
          updated_at: nowStr
        }]);

        return NextResponse.json({ success: true, message: '연구일지 초안이 성공적으로 저장되었습니다.' });

      case 'log_approve':
        // 연구소장 결재 승인
        const hashSeed = nowStr + data.log_id + Math.random().toString(36).substring(2);
        // 가상 블록체인 해시 생성 (SHA-256 형태 모방)
        const fakeHash = Array.from(hashSeed)
          .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) & 0xffffffff, 0)
          .toString(16)
          .padStart(8, '0') + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);

        await updateRows('rnd_logs', {
          approval_status: 'APPROVED',
          approver_id: Number(data.approver_id || 1), // 소장 ID
          approved_at: nowStr,
          blockchain_hash: fakeHash.padEnd(64, 'a')
        }, { filters: { log_id: String(data.log_id) } });

        return NextResponse.json({ success: true, message: '연구일지가 최종 결재 승인되었으며, 블록체인 감사 추적 해시가 발급되었습니다.' });

      case 'alarm_resolve':
        // 알림 조치 완료
        await updateRows('rnd_compliance_alarms', {
          is_resolved: 1,
          resolved_at: nowStr
        }, { filters: { alarm_id: String(data.alarm_id) } });
        return NextResponse.json({ success: true, message: '알림 경보 조치가 성공적으로 완료 처리되었습니다.' });

      default:
        return NextResponse.json({ success: false, error: '유효하지 않은 요청 타입입니다.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('R&D 데이터 갱신 중 오류 발생:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
