export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '@/../egdesk-helpers';
import { setupDatabase } from '@/lib/setup-db';

export async function GET() {
  try {
    let res;
    try {
      res = await queryTable('expense_categories', { orderBy: 'created_at', orderDirection: 'ASC' });
    } catch (dbErr: any) {
      console.log('expense_categories table not found. Attempting setupDatabase...');
      await setupDatabase();
      res = await queryTable('expense_categories', { orderBy: 'created_at', orderDirection: 'ASC' });
    }
    
    return NextResponse.json({ success: true, categories: res.rows || [] });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // 1. 대량 일괄 등록 (Bulk Import) 분기 처리
    if (body.categories && Array.isArray(body.categories)) {
      const rawCategories = body.categories;
      
      // 1-1. 유효성 1차 검사 (대/중/소 모두 존재하는지)
      const validCategories = rawCategories.filter(
        (cat: any) => cat.main_category?.trim() && cat.mid_category?.trim() && cat.sub_category?.trim()
      );

      if (validCategories.length === 0) {
        return NextResponse.json({ success: false, error: '등록할 유효한 계정 과목 데이터가 존재하지 않습니다.' }, { status: 400 });
      }

      // 1-2. 기존 DB에 등록된 전체 카테고리 로드 (중복 비교용)
      const existingRes = await queryTable('expense_categories');
      const existingList = existingRes.rows || [];
      
      const isDuplicate = (main: string, mid: string, sub: string) => {
        return existingList.some(
          (ex: any) => 
            ex.main_category.trim() === main.trim() &&
            ex.mid_category.trim() === mid.trim() &&
            ex.sub_category.trim() === sub.trim()
        );
      };

      // 1-3. 중복 및 공백 클렌징 & 자체 중복 제거 (Self-deduplication)
      const uniqueNewCategories: any[] = [];
      const seenKeys = new Set<string>();

      for (const cat of validCategories) {
        const main = cat.main_category.trim();
        const mid = cat.mid_category.trim();
        const sub = cat.sub_category.trim();
        const key = `${main}|||${mid}|||${sub}`;

        // 자체 중복 및 DB 중복 비교 차단
        if (!seenKeys.has(key) && !isDuplicate(main, mid, sub)) {
          seenKeys.add(key);
          uniqueNewCategories.push({
            main,
            mid,
            sub
          });
        }
      }

      if (uniqueNewCategories.length === 0) {
        return NextResponse.json({ success: true, addedCount: 0, message: '모든 항목이 이미 등록되어 있어 추가된 내역이 없습니다.' });
      }

      // 1-4. id 부여 및 벌크 적재 준비
      const baseTime = Date.now();
      const rowsToInsert = uniqueNewCategories.map((cat, index) => ({
        id: `cat-${baseTime}-${index}`,
        main_category: cat.main,
        mid_category: cat.mid,
        sub_category: cat.sub,
        created_at: nowStr
      }));

      // 1-5. SQLite DB 대량 일괄 적재
      await insertRows('expense_categories', rowsToInsert);

      return NextResponse.json({ success: true, addedCount: rowsToInsert.length });
    }

    // 2. 단일 계정 과목 등록 (기존 하위 호환성 유지)
    const { main_category, mid_category, sub_category } = body;

    if (!main_category || !mid_category || !sub_category) {
      return NextResponse.json({ success: false, error: '대분류, 중분류, 소분류 항목이 모두 필요합니다.' }, { status: 400 });
    }

    const main = main_category.trim();
    const mid = mid_category.trim();
    const sub = sub_category.trim();

    // 중복 체크
    const dupCheck = await queryTable('expense_categories', {
      filters: {
        main_category: main,
        mid_category: mid,
        sub_category: sub
      }
    });

    if (dupCheck.rows && dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: '이미 존재하는 계정 과목입니다.' }, { status: 400 });
    }

    const id = `cat-${Date.now()}`;

    await insertRows('expense_categories', [{
      id,
      main_category: main,
      mid_category: mid,
      sub_category: sub,
      created_at: nowStr
    }]);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error adding category:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 계정 과목 ID가 필요합니다.' }, { status: 400 });
    }

    await deleteRows('expense_categories', { ids: [Number(id)] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
