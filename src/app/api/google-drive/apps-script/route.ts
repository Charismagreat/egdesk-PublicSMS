import { NextResponse } from 'next/server';
import { callAppsScriptTool } from '@/lib/egdesk-helpers';

export async function GET() {
  try {
    let projects: any[] = [];
    let triggers: any[] = [];

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
