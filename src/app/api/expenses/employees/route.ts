export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '@/../egdesk-helpers';
import { setupDatabase } from '@/lib/setup-db';

export async function GET() {
  try {
    let res;
    try {
      res = await queryTable('expense_employees', { orderBy: 'created_at', orderDirection: 'ASC' });
    } catch (dbErr) {
      console.log('expense_employees table not found. Attempting setupDatabase...');
      await setupDatabase();
      res = await queryTable('expense_employees', { orderBy: 'created_at', orderDirection: 'ASC' });
    }
    return NextResponse.json({ success: true, employees: res.rows || [] });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: '임직원 이름이 필요합니다.' }, { status: 400 });
    }

    const cleanName = name.trim();

    // 중복 체크
    const dupCheck = await queryTable('expense_employees', {
      filters: { name: cleanName }
    });

    if (dupCheck.rows && dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: '이미 등록된 임직원입니다.' }, { status: 400 });
    }

    const id = `emp-${Date.now()}`;
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await insertRows('expense_employees', [{
      id,
      name: cleanName,
      created_at: nowStr
    }]);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error adding employee:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 임직원 ID가 필요합니다.' }, { status: 400 });
    }

    await deleteRows('expense_employees', { ids: [Number(id)] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
