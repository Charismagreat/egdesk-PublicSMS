export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable } from '@/../egdesk-helpers';

// GET: 특정 so_number 기준 상세 데이터 조회 (SQL 방화벽 차단 우회)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const so_number = searchParams.get('so_number');

    if (!so_number) {
      return NextResponse.json({ success: false, error: '주문번호(so_number)가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 마스터 정보 조회
    const masterRes = await queryTable('import_master', {
      filters: { so_number }
    });
    
    const masterRows = masterRes.rows || [];
    // 소프트 삭제된 데이터 거르기
    const activeMaster = masterRows.filter((r: any) => !r.deleted_at);
    
    if (activeMaster.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않거나 삭제된 주문입니다.' }, { status: 404 });
    }
    const master = activeMaster[0];

    // 2. 품목 목록 조회
    const itemsRes = await queryTable('import_items', {
      filters: { so_number }
    });
    const itemRows = itemsRes.rows || [];
    const items = itemRows.filter((r: any) => !r.deleted_at);

    // 3. 정산 정보 조회
    const financeRes = await queryTable('import_finance', {
      filters: { so_number }
    });
    const financeRows = financeRes.rows || [];
    const financeActive = financeRows.filter((r: any) => !r.deleted_at);
    const finance = financeActive.length > 0 ? financeActive[0] : null;

    return NextResponse.json({
      success: true,
      master,
      items,
      finance
    });

  } catch (err: any) {
    console.error('GET /api/import-customs/detail error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
