export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows, updateRows } from '../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

async function getTenantIdFromToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    const payload = decodeJwt(token);
    return (payload.tenant_id as string) || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const tenantId = await getTenantIdFromToken();
    const templates = await queryTable('message_templates', {});
    const activeTemplates = (templates.rows || []).filter((t: any) => {
      if (t.deleted_at) return false;
      if (tenantId && t.tenant_id && t.tenant_id !== tenantId) return false;
      return true;
    });
    return NextResponse.json({ success: true, templates: activeTemplates });
  } catch (error: any) {
    console.error('Error fetching message templates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, content } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 });
    }

    const tenantId = await getTenantIdFromToken();
    const newTemplate = {
      id: Date.now(),
      title,
      content,
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    };

    // egdesk-helpers.ts의 insertRows를 사용하여 안정적으로 데이터베이스에 행 추가
    await insertRows('message_templates', [newTemplate]);

    return NextResponse.json({ success: true, template: newTemplate });
  } catch (error: any) {
    console.error('Error saving message template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 });
    }

    // egdesk-helpers.ts의 deleteRows를 사용하여 실제 DB에서 삭제 수행
    await deleteRows('message_templates', { filters: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting message template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, title, content } = await req.json();
    if (!id || !title || !content) {
      return NextResponse.json({ success: false, error: 'ID, title and content are required' }, { status: 400 });
    }

    // egdesk-helpers.ts의 updateRows를 사용하여 실제 DB 레코드 수정 수행
    await updateRows('message_templates', { title, content }, { filters: { id: String(id) } });

    return NextResponse.json({ success: true, template: { id, title, content } });
  } catch (error: any) {
    console.error('Error updating message template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
