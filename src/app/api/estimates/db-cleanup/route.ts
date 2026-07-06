export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import fs from 'fs';

const dbPaths = [
  'C:/Users/CHARISMA/AppData/Roaming/EGDesk/user-data/development/projects/49a59fa4-40b6-40f4-8c3d-0231be79c7f9/user_data.db',
  'C:/Users/CHARISMA/AppData/Roaming/egdesk/user-data/development/projects/49a59fa4-40b6-40f4-8c3d-0231be79c7f9/user_data.db'
];

function getActiveDb() {
  for (const dbPath of dbPaths) {
    if (fs.existsSync(dbPath)) {
      return new Database(dbPath, { fileMustExist: true });
    }
  }
  throw new Error('데이터베이스 파일을 찾을 수 없습니다.');
}

export async function POST(req: Request) {
  console.log("=== POST /api/estimates/db-cleanup API START ===");
  let db;
  try {
    db = getActiveDb();

    // 트랜잭션으로 한 방에 삭제 및 시퀀스 초기화 진행
    const runTransaction = db.transaction(() => {
      const tables = [
        'crm_estimates',
        'crm_estimate_items',
        'crm_purchase_orders',
        'crm_sales_orders',
        'inventory_logs',
        'message_logs'
      ];

      for (const table of tables) {
        // 테이블 존재 여부 파악
        const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
        if (exists) {
          db.prepare(`DELETE FROM ${table}`).run();
          // auto_increment 시퀀스 리셋 (sqlite_sequence에 해당 테이블 데이터가 존재하면 지움)
          db.prepare("DELETE FROM sqlite_sequence WHERE name=?").run(table);
          console.log(`✓ Cleared table & sequence: ${table}`);
        }
      }
    });

    runTransaction();

    return NextResponse.json({
      success: true,
      message: 'SCM 거래 대장 4종 및 관련 이력 로그 2종이 성공적으로 초기화되었습니다.'
    });

  } catch (err: any) {
    console.error('POST /api/estimates/db-cleanup error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (db) db.close();
  }
}
