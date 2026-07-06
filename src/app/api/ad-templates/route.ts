export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '../../../../egdesk-helpers';

// GET /api/ad-templates : 템플릿 목록 조회
export async function GET() {
  try {
    const result = await queryTable('ad_templates', {
      orderBy: 'id',
      orderDirection: 'DESC'
    });
    
    // 소프트 삭제 배제
    const activeRows = (result.rows || []).filter((r: any) => !r.deleted_at);
    
    // Camel Case 변환
    const templates = activeRows.map((r: any) => ({
      id: r.id,
      name: r.name,
      header: r.header,
      footer: r.footer,
      optOut: r.opt_out
    }));

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error('Failed to fetch ad_templates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/ad-templates : 새 템플릿 생성
export async function POST(req: Request) {
  try {
    const { id, name, header, footer, optOut } = await req.json();

    if (!name || !header || !footer) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const newId = id || Date.now().toString();

    await insertRows('ad_templates', [{
      id: newId,
      name,
      header,
      footer,
      opt_out: optOut || '010-0000-0000'
    }]);

    return NextResponse.json({ success: true, id: newId });
  } catch (error: any) {
    console.error('Failed to create ad_template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/ad-templates : 템플릿 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    await deleteRows('ad_templates', { filters: { id: id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete ad_template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
