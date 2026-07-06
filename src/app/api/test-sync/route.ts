export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { gmAutomation } from '@/lib/google-messages';

export async function GET() {
  try {
    const result = await gmAutomation.syncContacts();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
