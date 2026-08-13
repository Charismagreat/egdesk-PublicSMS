export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { listInstagramSchedules, callInstagramTool } from '../../../../../egdesk-helpers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('connectionId') || undefined;

    const res = await listInstagramSchedules(connectionId);
    if (res && res.success) {
      return NextResponse.json({ success: true, schedules: res.schedules || [] });
    }
    return NextResponse.json({ success: true, schedules: [] });
  } catch (error: any) {
    console.error('인스타그램 MCP 스케줄 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await callInstagramTool('instagram_schedule_create', body);
    return NextResponse.json({ success: true, result: res });
  } catch (error: any) {
    console.error('인스타그램 MCP 스케줄 생성 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
