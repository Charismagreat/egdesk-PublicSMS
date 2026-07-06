export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getGmAutomation } from '@/lib/google-messages';

/**
 * Google 메시지 연동 설정 API (멀티 디바이스 대응)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId') || 'default';

    const automation = getGmAutomation(deviceId);
    const result = await automation.setupConnection();
    if (result.success) {
      return NextResponse.json({ message: '연동 성공', deviceId });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
