export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { executeSQL } from '@/../egdesk-helpers';

export async function GET() {
  try {
    const updateRes = await executeSQL(`UPDATE tax_invoices SET tenant_id = 'tenant-wontrading' WHERE tenant_id = 'tenant-default-id' OR tenant_id IS NULL OR tenant_id = 'default'`);
    const countRes = await executeSQL(`SELECT tenant_id, COUNT(*) as cnt FROM tax_invoices GROUP BY tenant_id`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'tax_invoices tenant_id migrated to tenant-wontrading successfully',
      updateResult: updateRes,
      distribution: countRes.rows 
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

