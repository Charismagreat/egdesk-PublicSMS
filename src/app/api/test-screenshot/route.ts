export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { gmAutomation } from '@/lib/google-messages';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    await gmAutomation.init(true);
    const p = (gmAutomation as any).page!;
    
    // Take screenshot
    const buf = await p.screenshot();
    const dest = path.join(process.cwd(), 'artifacts', 'debug.png');
    
    // Make sure artifacts folder exists
    if (!fs.existsSync(path.dirname(dest))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
    }
    fs.writeFileSync(dest, buf);
    
    // Dump HTML body
    const html = await p.evaluate(() => document.body.innerHTML);
    fs.writeFileSync(path.join(process.cwd(), 'artifacts', 'debug.html'), html);

    return NextResponse.json({ success: true, message: 'Screenshot saved' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
