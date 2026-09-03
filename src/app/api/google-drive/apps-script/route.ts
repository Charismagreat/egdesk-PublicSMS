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

    return NextResponse.json({
      success: true,
      projects: Array.isArray(projects) ? projects : [],
      triggers: Array.isArray(triggers) ? triggers : []
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
