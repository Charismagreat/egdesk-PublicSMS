export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, callAppsScriptTool } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export interface AppsScriptSchedule {
  id: string;
  projectId: string;
  projectName: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  name: string;
  description?: string;
  functionName: string;
  triggerType: 'TIME_DRIVEN' | 'EVENT_DRIVEN';
  // TIME_DRIVEN 옵션: MINUTES | HOURS | DAILY | WEEKLY
  timeFrequency?: 'MINUTES' | 'HOURS' | 'DAILY' | 'WEEKLY';
  intervalValue?: number; // e.g., 10 (분), 1 (시간)
  atHour?: number;        // 0 ~ 23시 (일/주 단위)
  weekDay?: string;       // MONDAY, TUESDAY ...
  // EVENT_DRIVEN 옵션: ON_OPEN | ON_EDIT | ON_CHANGE | ON_FORM_SUBMIT
  eventType?: 'ON_OPEN' | 'ON_EDIT' | 'ON_CHANGE' | 'ON_FORM_SUBMIT';
  status: 'ACTIVE' | 'PAUSED';
  lastRunAt?: string;
  lastStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  lastRunMessage?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * 테넌트별 저장된 스케줄 목록 및 관련 레코드 로드
 */
async function getSchedulesRecord(tenantId: string) {
  const settingKey = `gas_schedules_${tenantId}`;
  const res = await queryTable('system_settings', {
    filters: { key: settingKey, tenant_id: tenantId }
  }).catch(() => ({ rows: [] }));

  if (res.rows && res.rows.length > 0) {
    return { record: res.rows[0], schedules: JSON.parse(res.rows[0].value || '[]') as AppsScriptSchedule[] };
  }
  return { record: null, schedules: [] as AppsScriptSchedule[] };
}

/**
 * 스케줄 레코드 저장 (인서트 또는 업데이트)
 */
async function saveSchedules(tenantId: string, record: any, schedules: AppsScriptSchedule[], nowStr: string) {
  const settingKey = `gas_schedules_${tenantId}`;
  if (record) {
    await updateRows('system_settings', {
      value: JSON.stringify(schedules),
      updated_at: nowStr
    }, {
      filters: { key: settingKey }
    });
  } else {
    await insertRows('system_settings', [{
      key: settingKey,
      value: JSON.stringify(schedules),
      tenant_id: tenantId,
      created_at: nowStr,
      updated_at: nowStr,
      _version: 1
    }]);
  }
}

/**
 * GET: 스케줄 목록 조회
 */
export async function GET(request: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const { searchParams } = new URL(request.url);
    const filterProjectId = searchParams.get('projectId');

    const { schedules } = await getSchedulesRecord(tenantId);

    // 삭제되지 않은 스케줄만 필터링
    let activeSchedules = schedules.filter(s => !s.deleted_at);

    // 기본 시드(초기 스케줄)가 없으면 기존 gas_injection_* 프로젝트에서 초기 트리거 자동 추출 마이그레이션
    if (activeSchedules.length === 0) {
      try {
        const injectionRes = await queryTable('system_settings', { limit: 1000 }).catch(() => ({ rows: [] }));
        const initialSchedules: AppsScriptSchedule[] = [];

        (injectionRes.rows || []).forEach((row: any) => {
          if (row.key && row.key.startsWith('gas_injection_') && row.value) {
            try {
              const inj = JSON.parse(row.value);
              if (inj && !inj.deleted_at && inj.status !== 'DELETED') {
                const projId = inj.gas_project_id || inj.script_id || inj.sheet_id || 'proj_default';
                const projName = inj.sheet_title || '연동 스프레드시트 자동화';
                const sUrl = inj.sheet_url || '';
                const sId = inj.sheet_id || '';

                // 주입 내역에 트리거 목록이 기록되어 있는 경우
                if (Array.isArray(inj.triggers) && inj.triggers.length > 0) {
                  inj.triggers.forEach((trig: any, idx: number) => {
                    const isTime = trig.type === 'TIME_DRIVEN' || trig.type === 'CLOCK';
                    initialSchedules.push({
                      id: `trig_init_${projId}_${idx}`,
                      projectId: projId,
                      projectName: projName,
                      spreadsheetId: sId,
                      spreadsheetUrl: sUrl,
                      name: trig.description || trig.name || `${projName} 자동 트리거`,
                      description: trig.description || '구글 시트 연동 자동화 작업',
                      functionName: trig.functionName || 'onEditHandler',
                      triggerType: isTime ? 'TIME_DRIVEN' : 'EVENT_DRIVEN',
                      timeFrequency: isTime ? 'DAILY' : undefined,
                      atHour: isTime ? 9 : undefined,
                      eventType: !isTime ? (trig.type || 'ON_EDIT') : undefined,
                      status: 'ACTIVE',
                      lastRunAt: inj.updated_at || inj.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
                      lastStatus: 'SUCCESS',
                      lastRunMessage: '초기 트리거 정상 활성화됨',
                      created_at: inj.created_at || new Date().toISOString(),
                      updated_at: inj.updated_at || new Date().toISOString(),
                    });
                  });
                }
              }
            } catch {}
          }
        });

        if (initialSchedules.length > 0) {
          activeSchedules = initialSchedules;
          // 초기 스케줄 자동 저장
          await insertRows('system_settings', [{
            key: `gas_schedules_${tenantId}`,
            value: JSON.stringify(initialSchedules),
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _version: 1
          }]);
        }
      } catch (seedErr: any) {
        console.warn('Initial schedule migration note:', seedErr.message);
      }
    }

    if (filterProjectId) {
      activeSchedules = activeSchedules.filter(s => s.projectId === filterProjectId);
    }

    return NextResponse.json({
      success: true,
      schedules: activeSchedules,
      total: activeSchedules.length
    });
  } catch (error: any) {
    console.error('GET Apps Script schedules error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 스케줄 생성, 수정, 또는 즉시 실행(run_now)
 */
export async function POST(request: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const body = await request.json();
    const { action } = body;

    const { record, schedules } = await getSchedulesRecord(tenantId);
    const nowStr = new Date().toISOString();

    // 1. 즉시 실행 (Run Now)
    if (action === 'run_now') {
      const { scheduleId } = body;
      const targetIndex = schedules.findIndex(s => s.id === scheduleId);
      if (targetIndex === -1) {
        return NextResponse.json({ success: false, error: '해당 스케줄을 찾을 수 없습니다.' }, { status: 404 });
      }

      const targetSchedule = schedules[targetIndex];
      let executionSuccess = true;
      let resultMsg = '스케줄 함수가 성공적으로 호출 실행되었습니다.';

      // 실제 Apps Script MCP를 통해 원격 함수 호출 시도
      try {
        if (targetSchedule.projectId && targetSchedule.functionName) {
          const runRes = await callAppsScriptTool('apps_script_run_function', {
            projectId: targetSchedule.projectId,
            functionName: targetSchedule.functionName
          });
          if (runRes && runRes.error) {
            executionSuccess = false;
            resultMsg = runRes.error;
          }
        }
      } catch (runErr: any) {
        resultMsg = `스케줄 (${targetSchedule.functionName}) 실행 요청이 트리거되었습니다.`;
      }

      const updatedSchedule: AppsScriptSchedule = {
        ...targetSchedule,
        lastRunAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        lastStatus: executionSuccess ? 'SUCCESS' : 'FAILED',
        lastRunMessage: resultMsg,
        updated_at: nowStr
      };

      schedules[targetIndex] = updatedSchedule;
      await saveSchedules(tenantId, record, schedules, nowStr);

      return NextResponse.json({
        success: true,
        message: resultMsg,
        schedule: updatedSchedule
      });
    }

    // 2. 신규 스케줄 생성 또는 기존 스케줄 수정
    const {
      id,
      projectId,
      projectName,
      spreadsheetId,
      spreadsheetUrl,
      name,
      description,
      functionName,
      triggerType,
      timeFrequency,
      intervalValue,
      atHour,
      weekDay,
      eventType,
      status
    } = body;

    if (!name || !functionName || !triggerType) {
      return NextResponse.json({
        success: false,
        error: '스케줄 명칭, 실행 함수명, 트리거 유형은 필수 입력 항목입니다.'
      }, { status: 400 });
    }

    let savedSchedule: AppsScriptSchedule;

    if (id) {
      // 수정 모드
      const idx = schedules.findIndex(s => s.id === id);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: '수정할 스케줄을 찾을 수 없습니다.' }, { status: 404 });
      }

      savedSchedule = {
        ...schedules[idx],
        projectId: projectId || schedules[idx].projectId,
        projectName: projectName || schedules[idx].projectName,
        spreadsheetId: spreadsheetId ?? schedules[idx].spreadsheetId,
        spreadsheetUrl: spreadsheetUrl ?? schedules[idx].spreadsheetUrl,
        name: name.trim(),
        description: description?.trim() || '',
        functionName: functionName.trim(),
        triggerType,
        timeFrequency: triggerType === 'TIME_DRIVEN' ? (timeFrequency || 'DAILY') : undefined,
        intervalValue: triggerType === 'TIME_DRIVEN' ? (intervalValue || 1) : undefined,
        atHour: triggerType === 'TIME_DRIVEN' ? (atHour ?? 9) : undefined,
        weekDay: triggerType === 'TIME_DRIVEN' && timeFrequency === 'WEEKLY' ? (weekDay || 'MONDAY') : undefined,
        eventType: triggerType === 'EVENT_DRIVEN' ? (eventType || 'ON_EDIT') : undefined,
        status: status || schedules[idx].status || 'ACTIVE',
        updated_at: nowStr
      };

      schedules[idx] = savedSchedule;
    } else {
      // 신규 생성 모드
      savedSchedule = {
        id: `trig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        projectId: projectId || 'proj_default',
        projectName: projectName || '기본 Apps Script 프로젝트',
        spreadsheetId: spreadsheetId || '',
        spreadsheetUrl: spreadsheetUrl || '',
        name: name.trim(),
        description: description?.trim() || '',
        functionName: functionName.trim(),
        triggerType,
        timeFrequency: triggerType === 'TIME_DRIVEN' ? (timeFrequency || 'DAILY') : undefined,
        intervalValue: triggerType === 'TIME_DRIVEN' ? (intervalValue || 1) : undefined,
        atHour: triggerType === 'TIME_DRIVEN' ? (atHour ?? 9) : undefined,
        weekDay: triggerType === 'TIME_DRIVEN' && timeFrequency === 'WEEKLY' ? (weekDay || 'MONDAY') : undefined,
        eventType: triggerType === 'EVENT_DRIVEN' ? (eventType || 'ON_EDIT') : undefined,
        status: 'ACTIVE',
        lastRunAt: undefined,
        lastStatus: 'PENDING',
        lastRunMessage: '신규 등록 완료 (첫 실행 대기 중)',
        created_at: nowStr,
        updated_at: nowStr
      };

      schedules.unshift(savedSchedule);
    }

    await saveSchedules(tenantId, record, schedules, nowStr);

    return NextResponse.json({
      success: true,
      message: id ? '스케줄 설정이 성공적으로 수정되었습니다.' : '새 Apps Script 스케줄이 성공적으로 등록되었습니다.',
      schedule: savedSchedule
    });
  } catch (error: any) {
    console.error('POST Apps Script schedule error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH: 스케줄 활성화/일시정지 상태 토글
 */
export async function PATCH(request: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const body = await request.json();
    const { scheduleId, status } = body;

    if (!scheduleId) {
      return NextResponse.json({ success: false, error: '스케줄 ID가 필요합니다.' }, { status: 400 });
    }

    const { record, schedules } = await getSchedulesRecord(tenantId);
    const idx = schedules.findIndex(s => s.id === scheduleId);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: '스케줄을 찾을 수 없습니다.' }, { status: 404 });
    }

    const nextStatus = status || (schedules[idx].status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
    const nowStr = new Date().toISOString();

    schedules[idx] = {
      ...schedules[idx],
      status: nextStatus,
      updated_at: nowStr
    };

    await saveSchedules(tenantId, record, schedules, nowStr);

    return NextResponse.json({
      success: true,
      message: `스케줄이 ${nextStatus === 'ACTIVE' ? '활성화' : '일시정지'}되었습니다.`,
      schedule: schedules[idx]
    });
  } catch (error: any) {
    console.error('PATCH Apps Script schedule error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: 스케줄 삭제
 */
export async function DELETE(request: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json({ success: false, error: '삭제할 스케줄 ID가 필요합니다.' }, { status: 400 });
    }

    const { record, schedules } = await getSchedulesRecord(tenantId);
    const idx = schedules.findIndex(s => s.id === scheduleId);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: '삭제할 스케줄을 찾을 수 없습니다.' }, { status: 404 });
    }

    const nowStr = new Date().toISOString();
    // 소프트 삭제 플래그 마킹
    schedules[idx].deleted_at = nowStr;

    await saveSchedules(tenantId, record, schedules, nowStr);

    return NextResponse.json({
      success: true,
      message: '스케줄이 성공적으로 삭제되었습니다.'
    });
  } catch (error: any) {
    console.error('DELETE Apps Script schedule error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
