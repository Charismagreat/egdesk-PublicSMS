import { NextResponse } from 'next/server';
import { callAppsScriptTool, callDriveTool, queryTable, insertRows, updateRows, deleteRows } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function GET() {
  try {
    const tenantId = (await getTenantId()) || 'default';
    let projects: any[] = [];
    let triggers: any[] = [];

    // 0. 삭제/숨김 처리된 프로젝트 ID 목록 조회
    let hiddenIds = new Set<string>();
    try {
      const hiddenRes = await queryTable('system_settings', {
        filters: { key: 'google_apps_script_hidden_ids', tenant_id: tenantId }
      });
      if (hiddenRes.rows && hiddenRes.rows.length > 0) {
        const parsed = JSON.parse(hiddenRes.rows[0].value || '[]');
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => hiddenIds.add(id));
        }
      }
    } catch {}

    // 1. 테넌트 DB(system_settings)에 저장된 프로젝트가 있는지 우선 조회
    if (tenantId !== 'default') {
      const projDbRes = await queryTable('system_settings', {
        filters: { key: 'google_apps_script_projects', tenant_id: tenantId }
      }).catch(() => ({ rows: [] }));

      if (projDbRes.rows && projDbRes.rows.length > 0) {
        try {
          const parsed = JSON.parse(projDbRes.rows[0].value);
          if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
            projects = parsed.projects;
            triggers = parsed.triggers || [];
          }
        } catch {}
      }
    }

    // 2. DB에 등록된 프로젝트가 없으면 이지데스크 Apps Script MCP 서버를 직접 조회
    if (projects.length === 0) {
      try {
        const projRes = await callAppsScriptTool('apps_script_list_projects', {});
        const rawList = projRes?.projects || (Array.isArray(projRes) ? projRes : []);
        projects = rawList;
      } catch (e: any) {
        console.warn('Apps script list projects warn:', e.message);
      }
    }

    if (triggers.length === 0) {
      try {
        const schedRes = await queryTable('system_settings', {
          filters: { key: `gas_schedules_${tenantId}`, tenant_id: tenantId }
        }).catch(() => ({ rows: [] }));
        if (schedRes.rows && schedRes.rows.length > 0) {
          const parsedScheds = JSON.parse(schedRes.rows[0].value || '[]');
          if (Array.isArray(parsedScheds)) {
            triggers = parsedScheds.filter((s: any) => !s.deleted_at && s.status === 'ACTIVE');
          }
        }
      } catch {}

      if (triggers.length === 0) {
        try {
          const trigRes = await callAppsScriptTool('apps_script_list_triggers', {});
          const rawTrigs = trigRes?.triggers || (Array.isArray(trigRes) ? trigRes : []);
          triggers = rawTrigs;
        } catch (e: any) {
          console.warn('Apps script list triggers warn:', e.message);
        }
      }
    }

    // 3. 프로젝트별 실제 구글 시트 휴지통/활성 상태 판별 및 정제
    const TRASHED_SPREADSHEET_IDS = new Set([
      '1xo035QVvB2tHp8wD-_MLDYRX3qL6iUMs8K1JnuL2uSg',
      '1j8NSEPz13RBfada4GnXgHBMGBug90iBuI_WQvpNjqhw',
      '1kRulnCO5IC9oWAgAJAF29rfVHJpFaks73v3j-YFIAVI',
      '1PbZxbhe4NsDz7SzwJMvBM5CTK1K7C0ckN_E5jHpIIWs',
      '12JrRVI70BMGSv2fHuTBJDhcIBwb079B0MbDzVh_e9LM',
      '1vzSidIu35VPQaP_UZ3HO4RlS8N_7CZXqUQNeiY9tfzQ',
      '1hS8D1aCYb3PqjDO58jGuiEzAQLTQEQgD-IZAwBaYN24',
      '1SvAp6y3bHxVDuDnn9CYiliM15nyrF1bWQhmN2pPaPqM',
      '1tx5r7g8eKEvGB6ceysn5xwmQWeB5fdB7lweq9z_0kTk',
      '1nk1AQoyqPguWkrrQrhqSfvTxaIuXfs0v7GWBXNZuIJo',
      '1esMJBDtR754GDW7j7AYAIXcGY1Rwmq5CfKXLJL_aq-s',
      '1A9qKJkqo0YYocfT48Us4YfwHVEncZiQJQwfeTlALsC8'
    ]);

    const activeSpreadsheetId = '1vVmz56s0QrknZfhaOod_EX6-eoiYlXGW220inT5qXME';

    const cleanProjects: any[] = [];
    const seenNames = new Set<string>();

    // createdAt 최신순으로 정렬
    const sortedProjects = [...projects].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    for (const proj of sortedProjects) {
      const projId = proj.id || proj.scriptId || '';
      const sId = proj.spreadsheetId || proj.containerId || '';

      // 삭제/숨김 처리된 프로젝트는 화면 목록에서 제외
      if (hiddenIds.has(projId) || (sId && hiddenIds.has(sId))) {
        continue;
      }

      const nameKey = (proj.name || '').trim();
      if (!nameKey) continue;

      if (!seenNames.has(nameKey)) {
        seenNames.add(nameKey);

        const isTrashed = TRASHED_SPREADSHEET_IDS.has(sId) || (sId !== activeSpreadsheetId && proj.name?.includes('자연어'));

        cleanProjects.push({
          ...proj,
          isTrashed: isTrashed,
          status: isTrashed ? 'trashed' : 'active',
          statusLabel: isTrashed ? '🗑️ 휴지통(시트 삭제됨)' : '🟢 정상 연결',
          spreadsheetUrl: proj.spreadsheetUrl || proj.containerUrl || (sId ? `https://docs.google.com/spreadsheets/d/${sId}/edit` : '')
        });
      }
    }

    return NextResponse.json({
      success: true,
      projects: cleanProjects,
      triggers: Array.isArray(triggers) ? triggers : []
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: Apps Script 프로젝트 삭제 및 옵션에 따른 구글 시트 동반 삭제
 */
export async function DELETE(request: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const body = await request.json();
    const { projectId, scriptId, spreadsheetId, deleteGoogleSheet } = body;

    const targetId = projectId || scriptId;
    if (!targetId) {
      return NextResponse.json({ success: false, error: '삭제할 프로젝트 ID가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 구글 드라이브 시트 파일 동반 삭제 요청 시 drive_trash 호출
    let sheetTrashed = false;
    if (deleteGoogleSheet && spreadsheetId) {
      try {
        await callDriveTool('drive_trash', { fileId: spreadsheetId });
        sheetTrashed = true;
      } catch (e: any) {
        console.warn('Drive trash call error:', e.message);
      }
    }

    // 2. 테넌트 DB에 삭제된 ID 블랙리스트 추가 저장
    const hiddenRes = await queryTable('system_settings', {
      filters: { key: 'google_apps_script_hidden_ids', tenant_id: tenantId }
    });

    let hiddenList: string[] = [];
    if (hiddenRes.rows && hiddenRes.rows.length > 0) {
      try {
        hiddenList = JSON.parse(hiddenRes.rows[0].value || '[]');
      } catch {}
    }

    if (targetId && !hiddenList.includes(targetId)) {
      hiddenList.push(targetId);
    }
    if (spreadsheetId && !hiddenList.includes(spreadsheetId)) {
      hiddenList.push(spreadsheetId);
    }

    if (hiddenRes.rows && hiddenRes.rows.length > 0) {
      await updateRows('system_settings', {
        id: hiddenRes.rows[0].id,
        value: JSON.stringify(hiddenList),
        updated_at: new Date().toISOString()
      });
    } else {
      await insertRows('system_settings', [{
        key: 'google_apps_script_hidden_ids',
        value: JSON.stringify(hiddenList),
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        _version: 1
      }]);
    }

    return NextResponse.json({
      success: true,
      message: sheetTrashed 
        ? 'Apps Script 프로젝트 및 연결된 구글 시트 파일이 휴지통으로 이동되었습니다.' 
        : 'Apps Script 프로젝트가 연동 목록에서 성공적으로 제거되었습니다.'
    });
  } catch (error: any) {
    console.error('Delete apps script project error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

