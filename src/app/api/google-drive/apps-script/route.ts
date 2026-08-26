import { NextResponse } from 'next/server';
import { callAppsScriptTool, queryTable } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function GET() {
  try {
    const tenantId = (await getTenantId()) || 'default';
    let projects: any[] = [];
    let triggers: any[] = [];

    if (tenantId !== 'default') {
      const projDbRes = await queryTable('system_settings', {
        filters: { key: 'google_apps_script_projects', tenant_id: tenantId }
      }).catch(() => ({ rows: [] }));

      if (projDbRes.rows && projDbRes.rows.length > 0) {
        try {
          const parsed = JSON.parse(projDbRes.rows[0].value);
          projects = parsed.projects || [];
          triggers = parsed.triggers || [];
        } catch {}
      }
      // 신규 테넌트에 별도 등록된 프로젝트가 없으면 빈 배열 반환
      return NextResponse.json({
        success: true,
        projects: Array.isArray(projects) ? projects : [],
        triggers: Array.isArray(triggers) ? triggers : []
      });
    }

    try {
      const projRes = await callAppsScriptTool('apps_script_list_projects', {});
      projects = projRes?.projects || projRes || [];
    } catch (e: any) {
      console.warn('Apps script list projects warn:', e.message);
    }

    try {
      const trigRes = await callAppsScriptTool('apps_script_list_triggers', {});
      triggers = trigRes?.triggers || trigRes || [];
    } catch (e: any) {
      console.warn('Apps script list triggers warn:', e.message);
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
