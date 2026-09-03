import { NextResponse } from 'next/server';
import { callAppsScriptTool, queryTable } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function GET() {
  try {
    const tenantId = (await getTenantId()) || 'default';
    let projects: any[] = [];
    let triggers: any[] = [];

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
        const trigRes = await callAppsScriptTool('apps_script_list_triggers', {});
        const rawTrigs = trigRes?.triggers || (Array.isArray(trigRes) ? trigRes : []);
        triggers = rawTrigs;
      } catch (e: any) {
        console.warn('Apps script list triggers warn:', e.message);
      }
    }

    // 3. 프로젝트별 실제 구글 시트 휴지통/활성 상태 판별 및 정제
    // 사용자가 휴지통으로 이동한 이전 테스트 시트 ID 목록
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
      const nameKey = (proj.name || '').trim();
      if (!nameKey) continue;

      if (!seenNames.has(nameKey)) {
        seenNames.add(nameKey);

        const sId = proj.spreadsheetId || proj.containerId || '';
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
