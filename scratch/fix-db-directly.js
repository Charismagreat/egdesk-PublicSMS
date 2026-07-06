const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'crm_data.db');
console.log('🔄 [물리 복구] SQLite DB에 직접 테이블 강제 생성 중... (경로: ' + dbPath + ')');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('✗ DB 연결 실패:', err.message);
    process.exit(1);
  }
  
  db.serialize(() => {
    // 1. inventory_items 테이블 물리 생성
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        partner TEXT,
        stock INTEGER NOT NULL,
        safeStock INTEGER NOT NULL,
        location TEXT,
        spec TEXT,
        unitType TEXT,
        unitValue TEXT,
        boxContains INTEGER,
        description TEXT,
        tags TEXT,
        barcode TEXT,
        createdAt TEXT NOT NULL
      )
    `, (err1) => {
      if (err1) console.error('✗ inventory_items 생성 실패:', err1.message);
      else console.log('✓ inventory_items 물리 테이블 생성/확인 완료!');
    });

    // 2. inventory_logs 테이블 물리 생성
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        itemId INTEGER NOT NULL,
        itemName TEXT NOT NULL,
        itemType TEXT NOT NULL,
        changeType TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        operator TEXT NOT NULL,
        note TEXT,
        createdAt TEXT NOT NULL
      )
    `, (err2) => {
      if (err2) console.error('✗ inventory_logs 생성 실패:', err2.message);
      else console.log('✓ inventory_logs 물리 테이블 생성/확인 완료!');
    });

    // 3. 더미 데이터 자율 시딩
    db.all("SELECT count(*) as count FROM inventory_items", [], (err3, rows) => {
      if (err3) {
        console.error('조회 실패:', err3.message);
        return;
      }
      
      if (rows && rows[0].count === 0) {
        console.log('• 데이터가 비어있어 기본 SCM 더미 데이터를 시딩합니다...');
        const nowStr = new Date().toISOString();
        
        const stmt = db.prepare(`
          INSERT INTO inventory_items (type, name, category, price, partner, stock, safeStock, location, spec, unitType, unitValue, boxContains, description, tags, barcode, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run('material', '초경량 모터 V2', '전동부품', 12500, '한성정밀(주)', 50, 15, 'A홀 3번 선반', '15mm', 'count', '개', 10, '고효율 BLDC 모터', '사용중', '880123456789', nowStr);
        stmt.run('product', '써모글로우 텀블러 500ml', '리빙웨어', 8700, '글로벌 트레이딩', 120, 30, 'B홀 12번 적재함', '고진공', 'count', '개', null, '진공 텀블러', '판매중', '880987654321', nowStr);
        stmt.finalize();
        
        console.log('✓ 더미 데이터 2종 시딩 완료!');
      } else {
        console.log(`✓ 기존에 이미 ${rows[0].count}개의 재고 데이터가 존재하고 있습니다. 시딩 생략.`);
      }
      
      db.close(() => {
        console.log('💾 SQLite 직접 강제 패치 및 연결 안전 해제 완료!');
      });
    });
  });
});
