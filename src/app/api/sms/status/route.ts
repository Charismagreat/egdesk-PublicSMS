export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getGmAutomation } from '@/lib/google-messages';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId') || 'default';

    const automation = getGmAutomation(deviceId);
    const isConnected = await automation.checkAuthStatus();
    return NextResponse.json({ success: true, isConnected, deviceId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
