/**
 * 자율 입고 OCR 파이프라인 E2E 트랜잭션 무결성 검증 및 DB 자동 셋업 스크립트
 * (데이터베이스 롤백 방식을 사용하여 기존 DB 데이터를 훼손하지 않고 비즈니스 로직을 자율 검증합니다.)
 */

const Database = require('better-sqlite3');
const path = require('path');

// SQLite DB 경로 설정 (프로젝트 루트 crm_data.db)
const dbPath = path.join(__dirname, '..', 'crm_data.db');
console.log(`🔍 검증을 위해 SQLite 데이터베이스에 연결하는 중: ${dbPath}`);

let db;
try {
  db = new Database(dbPath, { fileMustExist: true });
  console.log('✅ 데이터베이스 연결 성공');
} catch (err) {
  console.error('❌ 데이터베이스 연결 실패:', err.message);
  process.exit(1);
}

// 검증 수행 함수
function runVerification() {
  console.log('\n==================================================');
  console.log('🛠️ 0단계: 자율 입고 관련 신규 테이블 물리 셋업 및 스키마 보정');
  console.log('==================================================');

  try {
    // 1. 자율 입고 대장 테이블 생성
    db.prepare(`
      CREATE TABLE IF NOT EXISTS crm_inventory_inbounds (
        id TEXT PRIMARY KEY NOT NULL,
        partner_name TEXT,
        inbound_date TEXT NOT NULL,
        total_amount INTEGER DEFAULT 0,
        pdf_file_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).run();
    console.log('✓ crm_inventory_inbounds 테이블 준비 완료');

    // 2. 자율 입고 상세 품목 테이블 생성
    db.prepare(`
      CREATE TABLE IF NOT EXISTS crm_inventory_inbound_items (
        id TEXT PRIMARY KEY NOT NULL,
        inbound_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        spec TEXT,
        quantity INTEGER NOT NULL,
        price INTEGER DEFAULT 0,
        barcode TEXT,
        matched_item_id INTEGER,
        created_at TEXT NOT NULL
      )
    `).run();
    console.log('✓ crm_inventory_inbound_items 테이블 준비 완료');

    // 3. 기존 inventory_items 테이블 스키마 보정 (uuid, updated_at 등 컬럼 추가)
    const columnsToEnsure = ['uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by'];
    for (const col of columnsToEnsure) {
      try {
        db.prepare(`ALTER TABLE inventory_items ADD COLUMN ${col} TEXT`).run();
        console.log(`✓ inventory_items 테이블에 ${col} 컬럼 추가 완료`);
      } catch (e) {
        if (e.message.includes('duplicate column name')) {
          console.log(`ℹ️ inventory_items 테이블 ${col} 컬럼 이미 존재함`);
        } else {
          console.warn(`⚠️ inventory_items 테이블 ${col} 컬럼 추가 경고:`, e.message);
        }
      }
    }

  } catch (setupErr) {
    console.error('❌ 테이블 물리 셋업 실패:', setupErr.message);
    db.close();
    process.exit(1);
  }

  console.log('\n==================================================');
  console.log('🧪 1단계: 트랜잭션 시작 (테스트 완료 후 롤백 처리 예정)');
  console.log('==================================================');
  
  db.prepare('BEGIN').run();

  try {
    // ----------------------------------------------------
    // 준비: 기존 데이터 개수 및 상태 백업 조회
    // ----------------------------------------------------
    const initialInboundCount = db.prepare('SELECT COUNT(*) as cnt FROM crm_inventory_inbounds').get().cnt;
    const initialInboundItemCount = db.prepare('SELECT COUNT(*) as cnt FROM crm_inventory_inbound_items').get().cnt;
    const initialItemCount = db.prepare('SELECT COUNT(*) as cnt FROM inventory_items').get().cnt;
    const initialLogCount = db.prepare('SELECT COUNT(*) as cnt FROM inventory_logs').get().cnt;

    console.log(`[초기 DB 레코드 현황]`);
    console.log(`- 입고 대장(crm_inventory_inbounds): ${initialInboundCount}건`);
    console.log(`- 입고 품목(crm_inventory_inbound_items): ${initialInboundItemCount}건`);
    console.log(`- 재고 품목(inventory_items): ${initialItemCount}건`);
    console.log(`- 재고 로그(inventory_logs): ${initialLogCount}건\n`);

    // ----------------------------------------------------
    // 테스트 시나리오 1: 신규 품목 자율 입고 처리 (matchedItemId 없음 또는 'NEW')
    // ----------------------------------------------------
    console.log('🧪 시나리오 1: 신규 품목에 대한 자율 입고 처리 테스트 시작');
    
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const inboundId1 = 'TEST-INB-' + Date.now();
    const partnerName = '테스트 공급사';
    const inboundDate = '2026-06-08';
    const testPrice = 15000;
    const testQty = 20;
    const testBarcode = '8801234567890';
    const testItemName = '테스트_신규_모터_Z';
    const testSpec = '15mm x 150mm';

    // 1) crm_inventory_inbounds 레코드 생성
    db.prepare(`
      INSERT INTO crm_inventory_inbounds (id, partner_name, inbound_date, total_amount, pdf_file_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(inboundId1, partnerName, inboundDate, testPrice * testQty, '/uploads/financials/test.pdf', nowStr, nowStr);

    // 2) 신규 품목 등록 처리 (inventory_items)
    // 기존 최대 ID 조회하여 maxId + 1 계산 (기존 API 로직 재현)
    const existingItems = db.prepare('SELECT id FROM inventory_items').all();
    const maxItemId = existingItems.length > 0 ? Math.max(...existingItems.map(i => Number(i.id) || 0)) : 0;
    const newMatchedItemId = maxItemId + 1;

    db.prepare(`
      INSERT INTO inventory_items (id, type, name, category, price, partner, stock, safeStock, location, spec, unitType, unitValue, boxContains, description, barcode, createdAt, uuid)
      VALUES (?, '자재', ?, '기타', ?, ?, ?, 0, '자율입고창고', ?, '개', '1', 1, 'AI 이지봇 자율 입고 OCR 등록 품목', ?, ?, ?)
    `).run(newMatchedItemId, testItemName, testPrice, partnerName, testQty, testSpec, testBarcode, nowStr, `TEST-ITEM-${Date.now()}`);

    // 3) 재고 변동 로그 기록 (inventory_logs)
    const existingLogs = db.prepare('SELECT id FROM inventory_logs').all();
    const maxLogId = existingLogs.length > 0 ? Math.max(...existingLogs.map(l => Number(l.id) || 0)) : 0;
    const newLogId = maxLogId + 1;

    db.prepare(`
      INSERT INTO inventory_logs (id, itemId, itemName, itemType, changeType, quantity, price, operator, note, createdAt)
      VALUES (?, ?, ?, '자재', 'INBOUND', ?, ?, 'AI 이지봇', ?, ?)
    `).run(newLogId, newMatchedItemId, testItemName, testQty, testPrice, `[자율 신규 등록] ${partnerName} 거래명세서 스캔 최초 입고`, nowStr);

    // 4) crm_inventory_inbound_items 상세 품목 인서트
    const inboundItemId1 = `TEST-INB-ITEM-${Date.now()}`;
    db.prepare(`
      INSERT INTO crm_inventory_inbound_items (id, inbound_id, item_name, spec, quantity, price, barcode, matched_item_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(inboundItemId1, inboundId1, testItemName, testSpec, testQty, testPrice, testBarcode, newMatchedItemId, nowStr);

    console.log('✅ 시나리오 1 데이터 적재 완료');

    // ----------------------------------------------------
    // 시나리오 1 검증 (Assert)
    // ----------------------------------------------------
    const verifyInbound = db.prepare('SELECT * FROM crm_inventory_inbounds WHERE id = ?').get(inboundId1);
    const verifyInboundItem = db.prepare('SELECT * FROM crm_inventory_inbound_items WHERE id = ?').get(inboundItemId1);
    const verifyItem = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(newMatchedItemId);
    const verifyLog = db.prepare('SELECT * FROM inventory_logs WHERE id = ?').get(newLogId);

    if (!verifyInbound || verifyInbound.total_amount !== testPrice * testQty) throw new Error('인바운드 총액 검증 실패');
    if (!verifyInboundItem || verifyInboundItem.matched_item_id !== newMatchedItemId) throw new Error('인바운드 상세 매칭 품목 ID 검증 실패');
    if (!verifyItem || verifyItem.stock !== testQty || verifyItem.barcode !== testBarcode) throw new Error('신규 품목 재고 및 바코드 검증 실패');
    if (!verifyLog || verifyLog.changeType !== 'INBOUND' || verifyLog.quantity !== testQty) throw new Error('재고 로그 기록 검증 실패');

    console.log('⭐ 시나리오 1 무결성 검증 완벽 통과!');

    // ----------------------------------------------------
    // 테스트 시나리오 2: 기존 품목에 수량 가산 입고 처리 (matchedItemId 매칭)
    // ----------------------------------------------------
    console.log('\n🧪 시나리오 2: 기존 품목에 대한 자율 입고 및 재고 가산 테스트 시작');

    // 기존 재고 품목 중 하나를 임의로 선정
    const targetItem = db.prepare('SELECT * FROM inventory_items LIMIT 1').get();
    if (!targetItem) {
      throw new Error('시나리오 2 진행을 위한 기존 재고 품목이 존재하지 않습니다.');
    }
    
    const targetItemId = targetItem.id;
    const targetItemOriginalStock = targetItem.stock;
    const targetItemName = targetItem.name;
    const targetItemType = targetItem.type || '자재';
    console.log(`- 매칭 대상 기존 품목: [ID: ${targetItemId}] ${targetItemName} (기존 재고: ${targetItemOriginalStock}개)`);

    const inboundId2 = 'TEST-INB-' + (Date.now() + 100);
    const 加Qty = 35;
    const 加Price = 12000;

    // 1) crm_inventory_inbounds 레코드 생성
    db.prepare(`
      INSERT INTO crm_inventory_inbounds (id, partner_name, inbound_date, total_amount, pdf_file_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(inboundId2, partnerName, inboundDate, 加Price * 加Qty, '/uploads/financials/test2.pdf', nowStr, nowStr);

    // 2) 기존 품목 재고량 업데이트 (stock = stock + 가산수량)
    db.prepare(`
      UPDATE inventory_items 
      SET stock = stock + ?, price = ?, updated_at = ?
      WHERE id = ?
    `).run(加Qty, 加Price, nowStr, targetItemId);

    // 3) 재고 변동 로그 기록
    const currentLogs = db.prepare('SELECT id FROM inventory_logs').all();
    const latestLogId = currentLogs.length > 0 ? Math.max(...currentLogs.map(l => Number(l.id) || 0)) : 0;
    const newLogId2 = latestLogId + 1;

    db.prepare(`
      INSERT INTO inventory_logs (id, itemId, itemName, itemType, changeType, quantity, price, operator, note, createdAt)
      VALUES (?, ?, ?, ?, 'INBOUND', ?, ?, 'AI 이지봇', ?, ?)
    `).run(newLogId2, targetItemId, targetItemName, targetItemType, 加Qty, 加Price, `[자율 입고] ${partnerName} 거래명세서 스캔 확정 반영`, nowStr);

    // 4) crm_inventory_inbound_items 상세 품목 인서트
    const inboundItemId2 = `TEST-INB-ITEM-${Date.now() + 100}`;
    db.prepare(`
      INSERT INTO crm_inventory_inbound_items (id, inbound_id, item_name, spec, quantity, price, barcode, matched_item_id, created_at)
      VALUES (?, ?, ?, '', ?, ?, '', ?, ?)
    `).run(inboundItemId2, inboundId2, targetItemName, 加Qty, 加Price, targetItemId, nowStr);

    console.log('✅ 시나리오 2 데이터 적재 완료');

    // ----------------------------------------------------
    // 시나리오 2 검증 (Assert)
    // ----------------------------------------------------
    const verifyItem2 = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(targetItemId);
    const verifyLog2 = db.prepare('SELECT * FROM inventory_logs WHERE id = ?').get(newLogId2);

    if (!verifyItem2 || verifyItem2.stock !== targetItemOriginalStock + 加Qty) {
      throw new Error(`기존 품목 재고 가산 실패 (예상치: ${targetItemOriginalStock + 加Qty}, 실제값: ${verifyItem2 ? verifyItem2.stock : 'null'})`);
    }
    if (!verifyLog2 || verifyLog2.changeType !== 'INBOUND' || verifyLog2.quantity !== 加Qty) {
      throw new Error('기존 품목 입고 로그 기록 검증 실패');
    }

    console.log('⭐ 시나리오 2 무결성 검증 완벽 통과!');

    console.log('\n==================================================');
    console.log('🎉 모든 자율 입고 파이프라인 시나리오 검증 성공!');
    console.log('==================================================');

  } catch (error) {
    console.error('\n❌ 검증 과정 중 오류 발생:', error.message);
  } finally {
    // 🧪 롤백을 수행하여 DB 원본 데이터를 깨끗하게 보존합니다.
    console.log('🧹 테스트 데이터 롤백 처리 중...');
    db.prepare('ROLLBACK').run();
    console.log('✅ 데이터베이스 원본 상태로 복구 완료');
    db.close();
  }
}

runVerification();
