export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, executeSQL, joinTables, uploadFile } from '@/../egdesk-helpers';

// GET: 수입 통관 마스터 목록 조회 (메모리 필터링 방식으로 SQL 방화벽 우회)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const searchQuery = (searchParams.get('searchQuery') || '').toLowerCase();
    const status = searchParams.get('status') || 'ALL'; // ALL, PAID, UNPAID
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 1. joinTables 헬퍼를 사용하여 마스터, 정산, 품목 테이블 삼중 조인 조회 (방화벽 우회)
    const joinRes = await joinTables('import_master', [
      { table: 'import_finance', on: { leftColumn: 'import_master.so_number', rightColumn: 'so_number' }, joinType: 'LEFT' },
      { table: 'import_items', on: { leftColumn: 'import_master.so_number', rightColumn: 'so_number' }, joinType: 'LEFT' }
    ], {
      limit: 100000 // 메모리 필터링을 위해 충분히 큰 값 설정
    });

    let allRows = joinRes.rows || [];

    // 2. 소프트 삭제 필터링 수동 보정 (가드)
    allRows = allRows.filter((r: any) => !r.deleted_at);

    // 3. 검색어 필터 (PO번호, SO번호, 수출자명)
    if (searchQuery) {
      allRows = allRows.filter((r: any) => 
        (r.po_number && r.po_number.toLowerCase().includes(searchQuery)) ||
        (r.so_number && r.so_number.toLowerCase().includes(searchQuery)) ||
        (r.exporter_name && r.exporter_name.toLowerCase().includes(searchQuery))
      );
    }

    // 4. 결제 완료 여부 필터
    if (status === 'PAID') {
      allRows = allRows.filter((r: any) => Number(r.is_paid) === 1);
    } else if (status === 'UNPAID') {
      allRows = allRows.filter((r: any) => Number(r.is_paid) === 0);
    }

    const total = allRows.length;
    // 5. 페이징 처리
    const pagedRows = allRows.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      total,
      rows: pagedRows
    });
  } catch (err: any) {
    console.error('GET /api/import-customs error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: 수입 통관 신규 등록 및 분할 적재
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { master, items, finance, fileData, fileName } = body;

    if (!master || !master.so_number || !master.po_number) {
      return NextResponse.json({ success: false, error: '필수 마스터 정보(주문번호, PO번호)가 누락되었습니다.' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: '적재할 품목 상세 정보가 없습니다.' }, { status: 400 });
    }

    // 1. 주문 번호(so_number) 중복 체크
    const dupCheck = await queryTable('import_master', { filters: { so_number: master.so_number } });
    if (dupCheck.rows && dupCheck.rows.length > 0) {
      const existing = dupCheck.rows[0];
      if (!existing.deleted_at) {
        return NextResponse.json({ success: false, error: `이미 등록된 주문 번호(${master.so_number})입니다.` }, { status: 400 });
      } else {
        // 소프트 삭제된 데이터 복원 처리
        const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        
        await updateRows('import_master', {
          deleted_at: null,
          deleted_by: null,
          restored_at: nowKst,
          restored_by: 'SYSTEM'
        }, { filters: { so_number: master.so_number } });

        await updateRows('import_items', {
          deleted_at: null,
          deleted_by: null,
          restored_at: nowKst,
          restored_by: 'SYSTEM'
        }, { filters: { so_number: master.so_number } });

        await updateRows('import_finance', {
          deleted_at: null,
          deleted_by: null,
          restored_at: nowKst,
          restored_by: 'SYSTEM'
        }, { filters: { so_number: master.so_number } });

        return NextResponse.json({ success: true, message: '소프트 삭제되었던 기존 주문을 복원했습니다.' });
      }
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const masterUuid = `mst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 2. 수입 마스터 테이블 적재
    const masterRow = {
      so_number: master.so_number,
      po_number: master.po_number,
      invoice_number: master.invoice_number || null,
      order_date: master.order_date,
      ship_date: master.ship_date || null,
      invoice_date: master.invoice_date,
      air_waybill_nbr: master.air_waybill_nbr || null,
      ship_via: master.ship_via || null,
      terms_of_sale: master.terms_of_sale || null,
      payment_terms: master.payment_terms || null,
      exporter_name: master.exporter_name || null,
      file_path: master.file_path || null,
      created_at: nowStr,
      uuid: masterUuid,
      updated_at: nowStr,
      updated_by: 'USER'
    };

    const masterRes = await insertRows('import_master', [masterRow]);
    if (!masterRes.success) {
      throw new Error(`마스터 적재 실패: ${masterRes.error}`);
    }

    // egdesk-helpers의 uploadFile을 사용해 격리 스토리지에 원본 서류 업로드 및 웹 게이트웨이 매핑
    if (fileData) {
      const selectRes = await queryTable('import_master', { filters: { so_number: master.so_number } });
      if (selectRes.rows && selectRes.rows.length > 0) {
        const rowId = selectRes.rows[0].id;
        const uploadRes = await uploadFile('import_master', rowId, 'file_path', fileName || 'customs_doc.pdf', fileData);
        if (uploadRes && uploadRes.success) {
          const gatewayUrl = `/api/shared/files?tableName=import_master&rowId=${rowId}&columnName=file_path`;
          await updateRows('import_master', { file_path: gatewayUrl }, { filters: { id: rowId } });
        }
      }
    }

    // 3. 수입 품목 상세 테이블 적재
    const itemRows = items.map((it: any, index: number) => {
      const itemUuid = `itm-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        so_number: master.so_number,
        part_number: it.part_number,
        description: it.description || null,
        quantity: parseFloat(it.quantity || 0),
        unit_price: parseFloat(it.unit_price || 0),
        amount: parseFloat(it.amount || (it.quantity * it.unit_price) || 0),
        currency: it.currency || 'USD',
        hs_code: it.hs_code || null,
        country_of_origin: it.country_of_origin || 'US',
        lot_number: it.lot_number || null,
        mfg_date: it.mfg_date || null,
        created_at: nowStr,
        uuid: itemUuid,
        updated_at: nowStr,
        updated_by: 'USER'
      };
    });

    const itemsRes = await insertRows('import_items', itemRows);
    if (!itemsRes.success) {
      // 롤백대응: 수동 클린업
      await updateRows('import_master', { deleted_at: nowStr, deleted_by: 'SYSTEM' }, { filters: { so_number: master.so_number } });
      throw new Error(`품목 상세 적재 실패: ${itemsRes.error}`);
    }

    // 4. 회계/정산 테이블 적재
    const financeUuid = `fin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const financeRow = {
      so_number: master.so_number,
      total_invoice_value: parseFloat(finance.total_invoice_value || 0),
      payment_due_date: finance.payment_due_date,
      is_paid: parseInt(finance.is_paid || 0, 10),
      paid_date: finance.paid_date || null,
      bank_name: finance.bank_name || null,
      account_number: finance.account_number || null,
      swift_code: finance.swift_code || null,
      created_at: nowStr,
      uuid: financeUuid,
      updated_at: nowStr,
      updated_by: 'USER'
    };

    const financeRes = await insertRows('import_finance', [financeRow]);
    if (!financeRes.success) {
      // 롤백대응: 수동 클린업
      await updateRows('import_master', { deleted_at: nowStr, deleted_by: 'SYSTEM' }, { filters: { so_number: master.so_number } });
      await updateRows('import_items', { deleted_at: nowStr, deleted_by: 'SYSTEM' }, { filters: { so_number: master.so_number } });
      throw new Error(`정산 데이터 적재 실패: ${financeRes.error}`);
    }

    return NextResponse.json({
      success: true,
      message: '수입 통관 데이터가 성공적으로 적재되었습니다.',
      so_number: master.so_number
    });

  } catch (err: any) {
    console.error('POST /api/import-customs error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: 소프트 삭제 기능 지원
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const so_number = searchParams.get('so_number');

    if (!so_number) {
      return NextResponse.json({ success: false, error: '삭제할 주문번호(so_number)가 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // 마스터 소프트 삭제
    await updateRows('import_master', {
      deleted_at: nowStr,
      deleted_by: 'USER'
    }, { filters: { so_number } });

    // 품목 상세 소프트 삭제
    await updateRows('import_items', {
      deleted_at: nowStr,
      deleted_by: 'USER'
    }, { filters: { so_number } });

    // 정산 소프트 삭제
    await updateRows('import_finance', {
      deleted_at: nowStr,
      deleted_by: 'USER'
    }, { filters: { so_number } });

    return NextResponse.json({
      success: true,
      message: `주문번호 ${so_number}의 통관 정보가 소프트 삭제되었습니다.`
    });
  } catch (err: any) {
    console.error('DELETE /api/import-customs error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT: 비고 태그 및 지급 상태(is_paid) 수정 지원
export async function PUT(req: Request) {
  try {
    const { so_number, tags, is_paid } = await req.json();
    if (!so_number) {
      return NextResponse.json({ success: false, error: '주문번호(so_number)가 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // 1. 비고 태그 수정
    if (tags !== undefined) {
      await updateRows('import_master', {
        tags: tags,
        updated_at: nowStr,
        updated_by: 'USER'
      }, { filters: { so_number } });
    }

    // 2. 지급 완료 처리
    if (is_paid !== undefined) {
      const todayKst = nowStr.slice(0, 10); // YYYY-MM-DD
      await updateRows('import_finance', {
        is_paid: is_paid,
        paid_date: is_paid === 1 ? todayKst : null,
        updated_at: nowStr,
        updated_by: 'USER'
      }, { filters: { so_number } });
    }

    return NextResponse.json({ success: true, message: '수입 정보가 정상 수정되었습니다.' });
  } catch (err: any) {
    console.error('PUT /api/import-customs error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
