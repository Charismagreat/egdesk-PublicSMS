export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '@/../egdesk-helpers';
import { setupDatabase } from '@/lib/setup-db';

export async function GET() {
  try {
    let res;
    try {
      res = await queryTable('expense_tags', { orderBy: 'created_at', orderDirection: 'ASC' });
    } catch (dbErr: any) {
      console.log('expense_tags table not found. Attempting setupDatabase...');
      await setupDatabase();
      res = await queryTable('expense_tags', { orderBy: 'created_at', orderDirection: 'ASC' });
    }
    
    return NextResponse.json({ success: true, tags: res.rows || [] });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, scope } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: '태그 명칭이 누락되었습니다.' }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return NextResponse.json({ success: false, error: '올바른 태그 명칭을 입력해 주세요.' }, { status: 400 });
    }

    // 중복 체크
    const dupCheck = await queryTable('expense_tags', {
      filters: { name: trimmedName }
    });

    if (dupCheck.rows && dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: '이미 존재하는 태그입니다.' }, { status: 400 });
    }

    const id = `tag-${Date.now()}`;
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await insertRows('expense_tags', [{
      id,
      name: trimmedName,
      scope: scope || 'global',
      created_at: nowStr
    }]);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error adding tag:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 태그 ID가 필요합니다.' }, { status: 400 });
    }

    await deleteRows('expense_tags', { ids: [Number(id)] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
