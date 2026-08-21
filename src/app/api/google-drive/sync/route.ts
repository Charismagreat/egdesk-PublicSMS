import { NextResponse } from 'next/server';
import { 
  pollDriveChanges, 
  startDrivePollLoop, 
  stopDrivePollLoop, 
  watchDriveChanges, 
  stopDriveWatch,
  getDriveStatus 
} from '@/lib/egdesk-helpers';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'poll', download = true, intervalSeconds = 60, webhookBaseUrl = '', ttlSeconds = 86400 } = body;

    let result: any;

    switch (action) {
      case 'poll':
        result = await pollDriveChanges({ download });
        break;
      case 'start_loop':
        result = await startDrivePollLoop({ intervalSeconds, download });
        break;
      case 'stop_loop':
        result = await stopDrivePollLoop();
        break;
      case 'watch':
        if (!webhookBaseUrl) {
          return NextResponse.json({ success: false, error: 'webhookBaseUrl이 필요합니다.' }, { status: 400 });
        }
        result = await watchDriveChanges({ webhookBaseUrl, ttlSeconds });
        break;
      case 'stop_watch':
        result = await stopDriveWatch();
        break;
      default:
        return NextResponse.json({ success: false, error: `알 수 없는 액션: ${action}` }, { status: 400 });
    }

    const latestStatus = await getDriveStatus().catch(() => ({}));

    return NextResponse.json({
      success: true,
      action,
      data: result,
      status: latestStatus
    });
  } catch (error: any) {
    console.error('Google Drive sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '드라이브 동기화 제어 실패' },
      { status: 500 }
    );
  }
}
