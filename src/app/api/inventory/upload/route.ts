import { NextResponse } from 'next/server';
import {
  queryTable,
  insertRows,
  updateRows,
  executeSQL
} from '../../../../../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';
import { syncInventoryToProduct } from '@/lib/sync-products-helper';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: '유효한 품목 데이터 배열이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const tenantId = await getTenantId();

    // 1. 기존 DB 내 등록된 모든 바코드(barcode) 가져와서 id 매핑 맵 구축 (금지어 DELETE를 피한 테넌트 격리 조회)
    const barcodeMap = new Map<string, number>();
    try {
      const rowsRes = await executeSQL(`SELECT id, barcode FROM inventory_items WHERE tenant_id = '${tenantId}'`);
      const rows = rowsRes.rows || [];
      rows.forEach((row: any) => {
        if (row.barcode && row.barcode.trim()) {
          barcodeMap.set(row.barcode.trim().toLowerCase(), Number(row.id));
        }
      });
    } catch (e) {
      console.warn('기존 재고 품목 목록 조회 실패 (첫 생성 가능성):', e);
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const createdAtStr = new Date().toISOString();

    const insertDataList: any[] = [];
    const updateDataList: any[] = [];
    const tempInsertMap = new Map<string, any>();

    for (const item of items) {
      const name = item.name ? String(item.name).trim() : '';
      const type = item.type === 'product' ? 'product' : 'material';
      const category = item.category ? String(item.category).trim() : '미분류';
      const barcode = item.barcode ? String(item.barcode).trim() : '';

      // 필수값 부재 시 패스
      if (!name) continue;

      const price = Number(item.price) || 0;
      const safeStock = Number(item.safeStock) || 0;
      const stock = Number(item.stock) || 0;
      const partner = item.partner ? String(item.partner).trim() : '';
      const location = item.location ? String(item.location).trim() : '';
      const spec = item.spec ? String(item.spec).trim() : '';
      const description = item.description ? String(item.description).trim() : '';

      // 단위 구분 파싱
      let unitType = 'count';
      let unitValue = item.unitValue ? String(item.unitValue).trim() : '개';
      let boxContains: number | null = null;

      if (item.unitType === 'weight') {
        unitType = 'weight';
        unitValue = item.unitValue ? String(item.unitValue).trim() : 'g';
      } else if (item.unitType === 'box') {
        unitType = 'box';
        unitValue = '박스';
        boxContains = Number(item.boxContains) || 10;
      }

      // ⚡ [바코드/품목코드] 단독 기준 중복 체크 작동
      const cleanBarcode = barcode.trim().toLowerCase();
      const isInvalidBarcode = !cleanBarcode || cleanBarcode === '-' || cleanBarcode === 'null' || cleanBarcode === 'undefined';
      
      const existingId = !isInvalidBarcode ? barcodeMap.get(cleanBarcode) : undefined;
      
      if (existingId) {
        // ⚡ 이미 존재하는 바코드가 기입된 품목인 경우, 업데이트 리스트로 분리
        updateDataList.push({
          id: existingId,
          payload: {
            price,
            partner,
            location,
            spec,
            unitType,
            unitValue,
            boxContains,
            description,
            tags: item.tags?.trim() || (type === 'product' ? '판매중' : '사용중')
          },
          rawItem: {
            id: existingId,
            type,
            name,
            price,
            category,
            description
          }
        });
        updatedCount++;
      } else {
        // ⚡ 신규 삽입 대상 품목 생성
        const insertPayload = {
          tenant_id: tenantId,
          type,
          name,
          category,
          price,
          partner,
          stock,
          safeStock,
          location,
          spec,
          unitType,
          unitValue,
          boxContains,
          description,
          tags: item.tags?.trim() || (type === 'product' ? '판매중' : '사용중'),
          barcode: isInvalidBarcode ? '' : cleanBarcode,
          createdAt: createdAtStr
        };

        if (!isInvalidBarcode && tempInsertMap.has(cleanBarcode)) {
          // 엑셀 파일 내 자체 중복이 존재하는 경우 -> 이전 객체를 최종 엑셀 정보로 덮어씀 (메모리상 병합)
          const existingRef = tempInsertMap.get(cleanBarcode);
          Object.assign(existingRef, insertPayload);
        } else {
          insertDataList.push(insertPayload);
          if (!isInvalidBarcode) {
            tempInsertMap.set(cleanBarcode, insertPayload);
          }
        }
      }
    }

    // 1. 대량 삽입 실행 (Bulk Insert)
    if (insertDataList.length > 0) {
      await insertRows('inventory_items', insertDataList);
      insertedCount = insertDataList.length;

      // 방금 삽입 완료한 데이터의 자동 생성 ID 획득을 위해 신규 삽입 목록 다시 조회
      try {
        const newlyInsertedRes = await executeSQL(`SELECT id, type, name, price, category, description, stock FROM inventory_items WHERE tenant_id = '${tenantId}' AND createdAt = '${createdAtStr}'`);
        const newlyInsertedRows = newlyInsertedRes.rows || [];

        const logDataList: any[] = [];
        for (const row of newlyInsertedRows) {
          const insertedId = Number(row.id);
          
          // 완제품 상품 동기화 실행
          await syncInventoryToProduct(row, 'INSERT');

          // 최초 재고가 0보다 큰 경우, 변동 로그 리스트에 추가
          if (Number(row.stock) > 0) {
            logDataList.push({
              itemId: insertedId,
              itemName: row.name,
              itemType: row.type,
              changeType: 'in',
              quantity: Number(row.stock),
              price: Number(row.price) || 0,
              operator: '시스템 (일괄 등록)',
              note: '최초 기초 재고 등록',
              createdAt: createdAtStr
            });
          }
        }

        // 변동 로그 대량 삽입
        if (logDataList.length > 0) {
          await insertRows('inventory_logs', logDataList);
        }
      } catch (syncErr) {
        console.error('신규 일괄 삽입 품목의 동기화 및 로그 등록 오류:', syncErr);
      }
    }

    // 2. 대량 업데이트 실행
    if (updateDataList.length > 0) {
      for (const itemToUpdate of updateDataList) {
        await updateRows('inventory_items', itemToUpdate.payload, { ids: [itemToUpdate.id] });
        await syncInventoryToProduct(itemToUpdate.rawItem, 'UPDATE');
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      updated: updatedCount,
      totalReceived: items.length
    });

  } catch (error: any) {
    console.error('재고 엑셀 일괄 등록 API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message || '재고를 등록하는 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
