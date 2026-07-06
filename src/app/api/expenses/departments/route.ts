export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '@/../egdesk-helpers';
import { setupDatabase } from '@/lib/setup-db';

export async function GET() {
  try {
    let res;
    try {
      res = await queryTable('expense_departments', { orderBy: 'created_at', orderDirection: 'ASC' });
    } catch (dbErr) {
      console.log('expense_departments table not found. Attempting setupDatabase...');
      await setupDatabase();
      res = await queryTable('expense_departments', { orderBy: 'created_at', orderDirection: 'ASC' });
    }
    return NextResponse.json({ success: true, departments: res.rows || [] });
  } catch (error: any) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: '부서 명칭이 필요합니다.' }, { status: 400 });
    }

    const cleanName = name.trim();

    // 중복 체크
    const dupCheck = await queryTable('expense_departments', {
      filters: { name: cleanName }
    });

    if (dupCheck.rows && dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: '이미 존재하는 부서입니다.' }, { status: 400 });
    }

    const id = `dept-${Date.now()}`;
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await insertRows('expense_departments', [{
      id,
      name: cleanName,
      created_at: nowStr
    }]);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error adding department:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 부서 ID가 필요합니다.' }, { status: 400 });
    }

    await deleteRows('expense_departments', { ids: [Number(id)] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
