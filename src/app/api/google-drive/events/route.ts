import { NextResponse } from 'next/server';
import { listDriveEvents } from '@/lib/egdesk-helpers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const downloadedOnly = searchParams.get('downloadedOnly') === 'true';
    const since = searchParams.get('since') || undefined;

    const res = await listDriveEvents({
      limit,
      downloadedOnly,
      since
    });

    const events = res?.events || res || [];

    return NextResponse.json({
      success: true,
      events: Array.isArray(events) ? events : []
    });
  } catch (error: any) {
    console.error('Google Drive events API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '드라이브 이벤트 내역 조회 실패' },
      { status: 500 }
    );
  }
}
