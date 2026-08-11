export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { listInstagramSchedules } from '../../../../../egdesk-helpers';

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
