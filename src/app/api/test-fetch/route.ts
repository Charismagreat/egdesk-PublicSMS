export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { gmAutomation } from '@/lib/google-messages';

export async function GET() {
  try {
    await gmAutomation.init(true);

    const storage = await (gmAutomation as any).page!.evaluate(() => {
      const result: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) result[key] = localStorage.getItem(key) || '';
      }
      return result;
    });

    return NextResponse.json({ storage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
