// @ts-nocheck
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function seed() {
  console.log('=== [1] 데이터베이스 시딩 프로세스 시작 ===');

  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
  const paths = [
    path.join(appData, 'EGDesk/database/user_data.db'),
    path.join(appData, 'egdesk/database/user_data.db')
  ];
  let dbPath = '';
  for (const p of paths) {
    if (fs.existsSync(p)) {
      dbPath = p;
      break;
    }
  }
  if (!dbPath) {
    dbPath = paths[0];
  }

  console.log(`Connecting to database at: ${dbPath}`);
  const db = new Database(dbPath);

  // 1. 기존 중요 설정 키 백업 (API key 등)
  console.log('\n• 기존 중요 설정 키 백업 중...');
  const keysToBackup = ['google_ai_api_key', 'google_ai_model', 'nts_api_key', 'omnichannel_ai_enabled', 'mydb_ai_skills'];
  const backedUpSettings = [];
  
  try {
    for (const k of keysToBackup) {
      const row = db.prepare("SELECT value FROM system_settings WHERE key = ?").get(k);
      if (row) {
        backedUpSettings.push({ key: k, value: row.value });
        console.log(` - 백업 완료: ${k} = ${row.value.slice(0, 10)}...`);
      }
    }
  } catch (err) {
    console.warn('⚠️ 설정 키 백업 중 경고 (테이블이 비어있음):', err.message);
  }

  // 2. 모든 테이블 데이터 삭제
  console.log('\n• 모든 테이블 데이터 삭제 중...');
  const tablesToClear = [
    'crm_customers', 'message_templates', 'message_logs', 'ad_templates', 'products',
    'crm_transactions', 'crm_orders', 'crm_payments', 'crm_reservations', 'crm_deliveries',
    'system_settings', 'crm_operators', 'crm_instagram_posts', 'crm_naver_blog_posts',
    'coupons', 'crm_coupons_restrictions', 'crm_point_history', 'crm_estimates',
    'crm_estimate_items', 'crm_purchase_orders', 'crm_sales_orders', 'crm_partners',
    'crm_snaptasks', 'crm_snaptask_items', 'crm_snaptask_actions', 'crm_partner_contacts',
    'inventory_items', 'crm_inventory_inbounds', 'crm_inventory_inbound_items',
    'tracked_items', 'target_urls', 'price_histories',
    'alert_rules', 'alert_logs', 'inventory_logs', 'crm_expenses', 'expense_settings',
    'expense_categories', 'expense_tags', 'expense_departments', 'expense_employees',
    'expense_projects', 'shared_dashboards', 'system_menu_settings', 'safety_policies',
    'safety_risk_assessments', 'safety_tbm_logs', 'safety_near_misses', 'safety_inspect_logs',
    'crm_financial_statements', 'crm_recruitment_applicants', 'crm_grant_announcements',
    'crm_grant_bookmarks', 'crm_grant_rnd_plans', 'crm_grant_company_profile',
    'crm_quality_checklist_submissions', 'crm_quality_ncr_items', 'crm_quality_ncr_similar_cases',
    'crm_quality_sensors_status', 'crm_quality_sensors_contribution', 'crm_quality_sensors_timeline',
    'crm_quality_spc_config', 'crm_quality_spc_samples', 'crm_quality_spc_predictions',
    'crm_quality_spc_features', 'crm_quality_vision_model', 'crm_quality_vision_logs',
    'crm_facilities', 'crm_facility_checklists', 'crm_facility_repair_logs',
    'crm_facility_repair_solutions', 'crm_facility_predictive_summary', 'crm_facility_predictive_vibration',
    'crm_facility_predictive_fft', 'crm_facility_predictive_part_rul', 'rnd_centers',
    'rnd_staffs', 'rnd_spaces', 'rnd_logs', 'rnd_compliance_alarms'
  ];

  db.transaction(() => {
    for (const t of tablesToClear) {
      try {
        db.prepare(`DELETE FROM ${t}`).run();
      } catch (err) {
        console.log(` - 테이블 ${t} 비우기 건너뜀: ${err.message}`);
      }
    }
  })();
  console.log('✓ 모든 기존 데이터 삭제 완료.');

  // 3. 백업된 중요 설정 키 복원
  console.log('\n• 백업된 중요 설정 키 복원 중...');
  db.transaction(() => {
    for (const s of backedUpSettings) {
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)").run(s.key, s.value);
    }
  })();
  console.log('✓ 중요 설정 복원 완료.');

  const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const getPastDateStr = (daysAgo) => {
    const d = new Date(Date.now() + 9 * 60 * 60 * 1000 - daysAgo * 24 * 60 * 60 * 1000);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  };
  const getPastDateOnlyStr = (daysAgo) => {
    const d = new Date(Date.now() + 9 * 60 * 60 * 1000 - daysAgo * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  };

  console.log('\n• (주)제이제이인터내셔널 데모 데이터 적재 시작...');
  db.transaction(() => {
    // [1] system_settings 본사 프로필 추가
    const companyProfile = {
      companyName: '(주)제이제이인터내셔널',
      representative: '임주희',
      businessNumber: '2708101761',
      address: '경기도 화성시 봉담읍 하가등길 26-4 (하가등리)',
      phone: '031-595-5801',
      email: 'contact@j-jintl.com'
    };
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)")
      .run('my_company_profile', JSON.stringify(companyProfile));
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)")
      .run('company_name', companyProfile.companyName);
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)")
      .run('company_business_number', '270-81-01761');
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)")
      .run('point_earning_rate', '1');
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)")
      .run('omnichannel_ai_enabled', '1');

    // [2] crm_operators (운영자 계정)
    db.prepare("INSERT INTO crm_operators (id, username, password_hash, name, role, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(1, 'admin', '$2b$10$wJx1.955Ypx9znqV8x6KVuFTrZaxAaf6TaEFc77Rz29ctUUD7jgz.', '임주희', 'SUPER_ADMIN', nowStr, 'op-uuid-1');
    db.prepare("INSERT INTO crm_operators (id, username, password_hash, name, role, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(2, 'gildong', '$2b$10$wJx1.955Ypx9znqV8x6KVuFTrZaxAaf6TaEFc77Rz29ctUUD7jgz.', '홍길동', 'SUPER_ADMIN', nowStr, 'op-uuid-2');
    db.prepare("INSERT INTO crm_operators (id, username, password_hash, name, role, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(3, 'kyeongri', '$2b$10$wJx1.955Ypx9znqV8x6KVuFTrZaxAaf6TaEFc77Rz29ctUUD7jgz.', '김경리', 'SUB_OPERATOR', nowStr, 'op-uuid-3');
    db.prepare("INSERT INTO crm_operators (id, username, password_hash, name, role, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(4, 'chulsoo', '$2b$10$wJx1.955Ypx9znqV8x6KVuFTrZaxAaf6TaEFc77Rz29ctUUD7jgz.', '이철수', 'SUB_OPERATOR', nowStr, 'op-uuid-4');
    db.prepare("INSERT INTO crm_operators (id, username, password_hash, name, role, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(5, 'younghee', '$2b$10$wJx1.955Ypx9znqV8x6KVuFTrZaxAaf6TaEFc77Rz29ctUUD7jgz.', '박영희', 'SUB_OPERATOR', nowStr, 'op-uuid-5');

    // [3] crm_customers (고객 명단)
    const customers = [
      [1, '이철수', '010-9988-1122', '단골,정비사', '블루핸즈 봉담점 책임정비사', '경기 화성시 봉담읍', 12500, nowStr],
      [2, '박영희', '010-5544-3322', 'VIP,대형바이어', '기아오토큐 하가등점 대표', '경기 화성시 효행로', 48000, nowStr],
      [3, '최민수', '010-8877-6655', '일반', '화성종합자동차부품센터 실무자', '경기 화성시 향남읍', 500, nowStr],
      [4, '강호동', '010-2233-4455', '단골', '제이엠 모터스 정비팀장', '경기 화성시 봉담읍', 3200, nowStr],
      [5, '신동엽', '010-6677-8899', '일반', '개인 자가정비 DIY 매니아', '서울시 관악구', 0, nowStr]
    ];
    for (const c of customers) {
      db.prepare("INSERT INTO crm_customers (id, name, phone, tags, memo, address, point_balance, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], `cust-uuid-${c[0]}`);
    }

    // [4] products (판매 채널별 상품 DB)
    const productsList = [
      // B2B 도매
      ['PROD-WS-01', 'R-134a 에어컨 냉매 벌크 (13.6kg x 10캔 파레트)', '1200000', '스토어용', 'B2B 도매', '파레트 단위 고압가스 충진 냉매 용기 세트', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758', 1],
      ['PROD-WS-02', 'R-1234yf 친환경 냉매 벌크 (5.0kg x 5캔 파레트)', '1150000', '스토어용', 'B2B 도매', '차세대 친환경 냉매 파레트 도매 패키지', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158', 1],
      ['PROD-WS-03', 'PAG 46 공조 오일 드럼 (200L)', '1500000', '스토어용', 'B2B 도매', '컴프레서 조립 라인용 고품질 PAG 윤활유 드럼', 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126', 1],
      // 대리점 납품
      ['PROD-AG-01', 'R-134a 차량용 에어컨 냉매 싱글 (13.6kg)', '150000', '스토어용', '대리점 납품', '표준 13.6kg 실린더 에어컨 냉매 가스', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd', 0],
      ['PROD-AG-02', 'R-1234yf 차세대 친환경 냉매 싱글 (5.0kg)', '280000', '스토어용', '대리점 납품', '신형 차종 호환 고순도 R1234yf 에어컨 가스', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758', 0],
      ['PROD-AG-03', '현대 아반떼 CN7 호환 순정형 에어컨 콤프레샤', '220000', '예약용', '대리점 납품', '아반떼 CN7 컴프레셔 어셈블리 정밀 교체 부품', 'https://images.unsplash.com/photo-1530047625168-4b19db921005', 0],
      ['PROD-AG-04', '기아 쏘렌토 MQ4 호환 순정형 에어컨 콤프레샤', '260000', '예약용', '대리점 납품', '쏘렌토 MQ4용 순정 규격 컴프레셔 부품', 'https://images.unsplash.com/photo-1530047625168-4b19db921005', 0],
      ['PROD-AG-05', '알루미늄 에어컨 콘덴서 A형', '95000', '예약용', '대리점 납품', '알루미늄 방열 핀 콘덴서 조립 어셈블리', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158', 0],
      // 소매 매장
      ['PROD-RT-01', '차량용 콤프레샤 오일 PAG 46 (250ml)', '18000', '테이블용', '소매 매장', '점도 PAG 46 고정밀 컴프레서 오일 캔', 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126', 0],
      ['PROD-RT-02', '친환경 하이브리드 POE 오일 (250ml)', '25000', '테이블용', '소매 매장', '하이브리드/전기차용 POE 콤프레샤 오일', 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126', 0],
      ['PROD-RT-03', '초미세먼지 차단 마이크로 에어 필터 (기본형)', '12000', '테이블용', '소매 매장', '차량 실내 공기 정화 캐빈 필터', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd', 0],
      ['PROD-RT-04', '활성탄 프리미엄 캐빈 필터 (고급형)', '22000', '테이블용', '소매 매장', '탈취 활성탄 성분 강화 프리미엄 필터', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd', 0],
      // 온라인 스토어
      ['PROD-ON-01', '셀프 차량용 에어컨 가스 충전 키트 (캔냉매 + 호스)', '35000', '스토어용', '온라인 스토어', 'DIY 에어컨 냉매 간편 보충 가스 및 주입 호스 세트', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758', 0],
      ['PROD-ON-02', '차량용 에바클리너 항균 스프레이', '15000', '스토어용', '온라인 스토어', '공조기 곰팡이 억제 및 냄새 탈취 세척 폼 스프레이', 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126', 0]
    ];
    for (const p of productsList) {
      db.prepare("INSERT INTO products (id, name, price, category, menu_category, description, main_image_url, is_coupon_excludable, uuid, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], `prod-uuid-${p[0]}`, nowStr);
    }

    // [5] inventory_items (재고 현황)
    const inventoryList = [
      [1, '스토어용', 'R-134a 에어컨 냉매 벌크', 'B2B 도매', 1200000, '한국가스켐(주)', 80, 20, '동탄 물류창고 파레트 A구역', '10캔/파레트', '파레트', '10캔', 1, 'B2B 파레트 도매용 냉매', '벌크,가스', '8801234567012', nowStr],
      [2, '스토어용', 'R-1234yf 친환경 냉매 벌크', 'B2B 도매', 1150000, '한국가스켐(주)', 45, 10, '동탄 물류창고 파레트 A구역', '5캔/파레트', '파레트', '5캔', 1, '친환경 냉매 벌크 파레트', '벌크,친환경', '8801234567029', nowStr],
      [3, '스토어용', 'R-134a 차량용 에어컨 냉매 싱글', '대리점 납품', 150000, '한국가스켐(주)', 250, 50, '용인 공조물류센터 B구역', '13.6kg 실린더', '캔', '13.6kg', 1, '대리점 소분 공급 냉매', '냉매,가스', '8801234567036', nowStr],
      [4, '스토어용', 'R-1234yf 차세대 친환경 냉매 싱글', '대리점 납품', 280000, '한국가스켐(주)', 120, 30, '용인 공조물류센터 B구역', '5.0kg 실린더', '캔', '5.0kg', 1, '친환경 싱글 냉매', '친환경,냉매', '8801234567043', nowStr],
      [5, '예약용', '현대 아반떼 CN7 호환 순정형 에어컨 콤프레샤', '대리점 납품', 220000, '(주)대진에스씨엠', 35, 15, '본사 부품 조립동 2층', 'CN7 호환', '개', '1개', 1, '아반떼 CN7 호환 콤프레샤 완제품', '부품,콤프', '8801234567050', nowStr],
      [6, '예약용', '기아 쏘렌토 MQ4 호환 순정형 에어컨 콤프레샤', '대리점 납품', 260000, '(주)대진에스씨엠', 20, 10, '본사 부품 조립동 2층', 'MQ4 호환', '개', '1개', 1, '쏘렌토 MQ4 호환 콤프레샤 완제품', '부품,콤프', '8801234567067', nowStr],
      [7, '예약용', '알루미늄 에어컨 콘덴서 A형', '대리점 납품', 95000, '(주)대진에스씨엠', 150, 40, '용인 공조물류센터 C구역', '알루미늄 핀타입', '개', '1개', 1, '알루미늄 콘덴서 어셈블리', '콘덴서,부품', '8801234567074', nowStr]
    ];
    for (const inv of inventoryList) {
      db.prepare("INSERT INTO inventory_items (id, type, name, category, price, partner, stock, safeStock, location, spec, unitType, unitValue, boxContains, description, tags, barcode, createdAt, uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(inv[0], inv[1], inv[2], inv[3], inv[4], inv[5], inv[6], inv[7], inv[8], inv[9], inv[10], inv[11], inv[12], inv[13], inv[14], inv[15], inv[16], `inv-uuid-${inv[0]}`);
    }

    // [6] crm_partners (거래처 리스트)
    const partnersList = [
      ['V-GAS-01', 'VENDOR', '한국가스켐(주)', '204-81-12345', '김가스', '02-888-9999', '가스 영업부', '010-8888-9999', 'sales@gaskhem.co.kr', '울산광역시 남구 화학로 77', 'NORMAL', 0, '냉매 충진 고압 가스 수입 및 충전 공급처', nowStr],
      ['V-MET-01', 'VENDOR', '(주)대진에스씨엠', '134-81-67890', '최대진', '031-222-3333', '자재 납품팀', '010-2222-3333', 'supply@daejinscm.co.kr', '경기도 화성시 봉담읍 하가등길 12', 'VIP', 0, '알루미늄 하우징, 사출 성형 금형 및 가공품 아웃소싱', nowStr],
      ['B-BLUE-01', 'BUYER', '현대블루핸즈 봉담점', '124-82-33445', '박정비', '031-555-1111', '부품 수령 담당', '010-5555-1111', 'bongdam@bluehands.co.kr', '경기도 화성시 봉담읍 동화길 45', 'VIP', 20000000, '대리점급 바이어 - 에어컨 가스 및 컴프레서 정기 납품처', nowStr],
      ['B-KIA-01', 'BUYER', '기아오토큐 하가등점', '270-85-99887', '정기아', '031-666-2222', '구매 파트 부장', '010-6666-2222', 'hagadeung@autoq.co.kr', '경기도 화성시 봉담읍 하가등길 8', 'NORMAL', 15000000, '신형 R-1234yf 친환경 냉매 및 콤프레샤 월간 정량 납품처', nowStr]
    ];
    for (const p of partnersList) {
      db.prepare("INSERT INTO crm_partners (id, type, company_name, business_number, representative, phone, manager_name, manager_phone, email, address, vip_level, credit_limit, memo, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], `part-uuid-${p[0]}`);
    }

    // [7] crm_partner_contacts (명함 담당자)
    db.prepare("INSERT INTO crm_partner_contacts (id, partner_id, name, position, phone, email, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(1, 'V-GAS-01', '최대리', '영업부 대리', '010-8888-9999', 'sales@gaskhem.co.kr', 1, nowStr);
    db.prepare("INSERT INTO crm_partner_contacts (id, partner_id, name, position, phone, email, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(2, 'B-BLUE-01', '박정비', '공장장', '010-5555-1111', 'bongdam@bluehands.co.kr', 1, nowStr);

    // [8] crm_estimates & items (견적서 관리)
    db.prepare("INSERT INTO crm_estimates (id, type, direction_status, partner_name, partner_phone, total_amount, file_url, ai_parsed, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run('EST-2026-IN01', 'INBOUND', 'RECEIVED', '한국가스켐(주)', '02-888-9999', 3500000, '/uploads/estimates/est_gas_inbound.pdf', 1, getPastDateStr(5), 'est-uuid-1');
    db.prepare("INSERT INTO crm_estimate_items (id, estimate_id, product_id, product_name, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(1, 'EST-2026-IN01', 'PROD-WS-01', 'R-134a 에어컨 냉매 벌크', 2, 1200000, 2400000);
    db.prepare("INSERT INTO crm_estimate_items (id, estimate_id, product_id, product_name, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(2, 'EST-2026-IN01', 'PROD-WS-03', 'PAG 46 공조 오일 드럼', 1, 1100000, 1100000);

    db.prepare("INSERT INTO crm_estimates (id, type, direction_status, partner_name, partner_phone, total_amount, file_url, ai_parsed, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run('EST-2026-OUT01', 'OUTBOUND', 'SENT', '현대블루핸즈 봉담점', '031-555-1111', 1040000, null, 1, getPastDateStr(3), 'est-uuid-2');
    db.prepare("INSERT INTO crm_estimate_items (id, estimate_id, product_id, product_name, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(3, 'EST-2026-OUT01', 'PROD-AG-01', 'R-134a 차량용 에어컨 냉매 싱글 (13.6kg)', 2, 150000, 300000);
    db.prepare("INSERT INTO crm_estimate_items (id, estimate_id, product_id, product_name, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(4, 'EST-2026-OUT01', 'PROD-AG-03', '현대 아반떼 CN7 호환 순정형 에어컨 콤프레샤', 2, 220000, 440000);
    db.prepare("INSERT INTO crm_estimate_items (id, estimate_id, product_id, product_name, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(5, 'EST-2026-OUT01', 'PROD-AG-05', '알루미늄 에어컨 콘덴서 A형', 3, 100000, 300000);

    // [9] crm_purchase_orders & crm_sales_orders
    db.prepare("INSERT INTO crm_purchase_orders (id, estimate_id, vendor_name, vendor_phone, status, total_amount, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run('PO-2026-001', 'EST-2026-IN01', '한국가스켐(주)', '02-888-9999', 'INBOUND_COMPLETED', 3500000, getPastDateStr(5), getPastDateStr(4));
    
    db.prepare("INSERT INTO crm_sales_orders (id, estimate_id, customer_name, customer_phone, status, total_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run('SO-2026-001', 'EST-2026-OUT01', '현대블루핸즈 봉담점', '031-555-1111', 'CONFIRMED', 1040000, getPastDateStr(3));

    // [10] crm_transactions & crm_orders & crm_payments & crm_deliveries
    db.prepare("INSERT INTO crm_transactions (id, customer_name, customer_phone, product_name, amount, order_date, status, order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run('TX-001', '이철수', '010-9988-1122', 'R-134a 차량용 에어컨 냉매 싱글 (13.6kg) 외 2건', '1040000', getPastDateOnlyStr(3), '결제완료', 'ORD-2026-001');

    db.prepare("INSERT INTO crm_orders (id, customer_name, customer_phone, product_name, quantity, total_price, delivery_method, shipping_address, tracking_number, order_date, status, uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run('ORD-2026-001', '이철수', '010-9988-1122', 'R-134a 싱글 외 2건', '7', '1040000', '배송', '경기 화성시 봉담읍 동화길 45 블루핸즈', 'CJ-99228811', getPastDateOnlyStr(3), '배송완료', 'ord-uuid-1');

    db.prepare("INSERT INTO crm_payments (id, customer_name, payment_method, amount, payment_date, status, order_id, uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run('PAY-2026-001', '이철수', '계좌송금', '1040000', getPastDateOnlyStr(3), '결제완료', 'ORD-2026-001', 'pay-uuid-1');

    db.prepare("INSERT INTO crm_deliveries (id, customer_name, customer_phone, address, courier, tracking_number, status, order_id, uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run('DEL-2026-001', '이철수', '010-9988-1122', '경기 화성시 봉담읍 동화길 45 블루핸즈', 'CJ대한통운', 'CJ-99228811', '배송완료', 'ORD-2026-001', 'del-uuid-1');

    // [11] crm_expenses (지출 대장)
    db.prepare("INSERT INTO expense_settings (id, monthly_budget, is_alert_enabled, alert_threshold_percent, alert_sms_template, alert_phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(1, 5000000, 1, 90, '[🚨지출AI] 예산 {경보임계율}% 도달! 누적 {누적지출}원 (한도 {월예산}원)', '010-5555-1111', nowStr);

    const expenseRecords = [
      ['exp-01', '1공장 냉매 압축 충진기 유압오일 매입', '원재료비', 180000, getPastDateOnlyStr(2), '계좌이체', '소액결제,부품구매', 'APPROVED', nowStr],
      ['exp-02', '공조 부품 용접용 고압 알루미늄 봉재 매입', '원재료비', 2450000, getPastDateOnlyStr(5), '계좌이체', '정기지출,벌크구매', 'APPROVED', nowStr],
      ['exp-03', 'R&D 연구원 지적재산 특허 출원 수수료', '지급수수료', 330000, getPastDateOnlyStr(8), '법인카드', '특허대행수수료', 'APPROVED', nowStr],
      ['exp-04', '동탄 물류창고 화물 트랙터 유류비 보조', '여비교통비', 125000, getPastDateOnlyStr(1), '법인카드', '유류비,정기지출', 'PENDING', nowStr],
      ['exp-05', '공조부품 기술세미나 참석 직원 식대 및 음료', '복리후생비', 98000, getPastDateOnlyStr(3), '법인카드', '직원식대,복지지원', 'APPROVED', nowStr]
    ];
    for (const exp of expenseRecords) {
      db.prepare("INSERT INTO crm_expenses (id, title, category, amount, expense_date, payment_method, memo, approval_status, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(exp[0], exp[1], exp[2], exp[3], exp[4], exp[5], exp[6], exp[7], exp[8], `exp-uuid-${exp[0]}`);
    }

    // [12] crm_financial_statements (2개 연도 재무제표)
    db.prepare("INSERT INTO crm_financial_statements (id, company_id, company_type, fiscal_year, fiscal_quarter, total_assets, total_liabilities, total_equity, revenue, operating_income, net_income, pdf_file_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run('fin-2024', 'MY-COMPANY', 'MY_COMPANY', 2024, 'YR', 1200000000, 400000000, 800000000, 1800000000, 150000000, 120000000, '/uploads/financials/financials_2024.pdf', nowStr, nowStr);
    db.prepare("INSERT INTO crm_financial_statements (id, company_id, company_type, fiscal_year, fiscal_quarter, total_assets, total_liabilities, total_equity, revenue, operating_income, net_income, pdf_file_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run('fin-2025', 'MY-COMPANY', 'MY_COMPANY', 2025, 'YR', 1500000000, 500000000, 1000000000, 2200000000, 210000000, 170000000, '/uploads/financials/financials_2025.pdf', nowStr, nowStr);

    // [13] tracked_items & target_urls & price_histories (가격 추적 AI)
    db.prepare("INSERT INTO tracked_items (item_id, item_code, item_name, category, spec, base_price, target_margin_rate, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(1, 'RAW-ALUM-01', '알루미늄 6061-T6 방열재', 'RAW_MATERIAL', 'T6 판재 2.0T', 3800.0, 15.0, nowStr);
    db.prepare("INSERT INTO target_urls (url_id, item_id, site_name, target_url, css_selector, cron_interval, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(1, 1, 'LME 알루미늄 고시 시세', 'https://www.lme.com/en/Metals/Non-ferrous/Aluminum', 'div.price-table__current-price > span', '0 9 * * *', 1, nowStr);
    const aluPrices = [3750, 3720, 3790, 3810, 3850, 3920, 3950, 4120, 4200, 4350];
    for (let i = 0; i < aluPrices.length; i++) {
      db.prepare("INSERT INTO price_histories (history_id, url_id, captured_price, captured_at, status) VALUES (?, ?, ?, ?, ?)")
        .run(i + 1, 1, aluPrices[i], getPastDateStr(10 - i), 'SUCCESS');
    }
    db.prepare("INSERT INTO alert_rules (rule_id, item_id, rule_name, condition_type, threshold_value, phone_number, sms_template, is_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(1, 1, '알루미늄 원가 폭등 및 마진 붕괴 알림', 'MARGIN_BREAKDOWN', 5.0, '010-9988-1122', '[🚨원가경보] {item_name} 마진 한계선 붕괴! 현재가:{captured_price}원', 1);

    db.prepare("INSERT INTO tracked_items (item_id, item_code, item_name, category, spec, base_price, target_margin_rate, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(2, 'COMP-AC-01', '타사 호환 에어컨 컴프레샤 A', 'COMPETITOR_PRODUCT', '현대 아반떼 MD 호환', 210000.0, 12.0, nowStr);
    db.prepare("INSERT INTO target_urls (url_id, item_id, site_name, target_url, css_selector, cron_interval, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(2, 2, '다나와 차량용 부품 카탈로그', 'https://prod.danawa.com/list/?cate=14238541', 'span.num_c', '0 10 * * *', 1, nowStr);
    const compPrices = [210000, 208000, 209000, 212000, 215000, 211000, 210000, 209000, 207000, 205000];
    for (let i = 0; i < compPrices.length; i++) {
      db.prepare("INSERT INTO price_histories (history_id, url_id, captured_price, captured_at, status) VALUES (?, ?, ?, ?, ?)")
        .run(i + 11, 2, compPrices[i], getPastDateStr(10 - i), 'SUCCESS');
    }

    // [14] R&D 연구소 관련 테이블 시딩 (rnd_centers, staffs, spaces, logs, alarms)
    db.prepare("INSERT INTO rnd_centers (center_id, company_id, center_name, center_type, established_date, koita_reg_number, postal_code, address_road, address_detail, total_area_sqm, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(1, 1, '(주)제이제이인터내셔널 친환경 자동차 공조 기술 연구소', 'RESEARCH_CENTER', '2024-03-15', 'KOITA-2024-8899', '18336', '경기도 화성시 봉담읍 하가등길 26-4', '본관 3층', 65.50, 1);
    
    db.prepare("INSERT INTO rnd_staffs (staff_id, center_id, user_id, staff_role, employment_status, degree_level, major_name, major_category, qualification_status, joined_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(1, 1, 2, 'DIRECTOR', 'ACTIVE', 'DOCTOR', '기계공학과 (공조 유체역학 전공)', 'ENGINEERING', 'QUALIFIED', '2024-03-15');
    db.prepare("INSERT INTO rnd_staffs (staff_id, center_id, user_id, staff_role, employment_status, degree_level, major_name, major_category, qualification_status, joined_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(2, 1, 4, 'RESEARCHER', 'ACTIVE', 'MASTER', '화학공학과 (친환경 가스 연구 전공)', 'ENGINEERING', 'QUALIFIED', '2024-03-15');
    db.prepare("INSERT INTO rnd_staffs (staff_id, center_id, user_id, staff_role, employment_status, degree_level, major_name, major_category, qualification_status, joined_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(3, 1, 5, 'RESEARCHER', 'ACTIVE', 'BACHELOR', '자동차공학과 (부품 정밀 설계)', 'ENGINEERING', 'QUALIFIED', '2024-05-01');
    db.prepare("INSERT INTO rnd_staffs (staff_id, center_id, user_id, staff_role, employment_status, degree_level, major_name, major_category, qualification_status, joined_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(4, 1, 6, 'ASSISTANT', 'ACTIVE', 'ASSOCIATE', '정밀기계설계학과', 'ENGINEERING', 'QUALIFIED', '2025-01-10');

    db.prepare("INSERT INTO rnd_spaces (space_check_id, center_id, check_date, image_url_entrance, image_url_layout, ai_analysis_result, signage_status, partition_status, overall_status, inspector_notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(1, 1, getPastDateOnlyStr(15), '/images/rnd/entrance_good.jpg', '/images/rnd/layout_need_improvement.jpg', 
      JSON.stringify({
        signage_detected: true,
        signage_text: "친환경 자동차 공조 기술 연구소",
        partition_detected: true,
        estimated_partition_height_m: 1.25,
        mixed_staff_detected: false,
        notes: "현판 및 1.2m 이상 규격 파티션 독립 구획 정상 확인."
      }), 'PASS', 'PASS', '합격', '독립 공간 1.25m 파티션 가구 재배치 조치 확인 완료됨. 전체 합격 상태.', nowStr);

    db.prepare("INSERT INTO rnd_logs (log_id, center_id, author_id, work_date, raw_source, raw_content, audio_file_url, ai_generated_title, ai_generated_content, approval_status, approver_id, approved_at, blockchain_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(1, 1, 4, getPastDateOnlyStr(2), 'GITHUB', 'Commit: feat(R1234yf): 고압가스 충진 밸브 어댑터 결속 고무 씰 O링 틈새 유격 최적화 수치 계산 적용', null,
      '친환경 냉매(R-1234yf) 노출 방지를 위한 고무 O링 치수 최적화', 
      '1. 연구 배경: 차세대 냉매 R-1234yf의 고온 조건 내 기체 분자 누출 최소화를 위한 하우징 기밀 씰 설계 최적화.\n2. 실험 방법: O링 틈새 간격을 0.05mm 단위로 축소 설계하여 가혹 고온(85도) 압력 테스트 실시.\n3. 결과 분석: O링 외경 간격을 기존 8.4mm에서 8.55mm로 튜닝 시 누출량이 98.2% 개선되었음을 확인.\n4. 향후 계획: 금형 사출 샘플을 통한 양산 기계 가공 공차 시뮬레이션 적용.',
      'APPROVED', 2, nowStr, '1a2b3c4d5e6f7g8h9i0j9k8l7m6n5o4p3q2r1s0t9u8v7w6x5y4z3a2b1c0d9e8f', nowStr, nowStr);

    db.prepare("INSERT INTO rnd_compliance_alarms (alarm_id, center_id, category, severity, message, due_date, is_resolved, resolved_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(1, 1, 'SPACE_CHECK', 'INFO', '기업부설연구소 물적 독립 공간 자가 실사(2분기)가 최근 15일 전에 완료되었습니다. 정상 유지 상태입니다.', getPastDateOnlyStr(-75), 1, getPastDateOnlyStr(15), nowStr);

    // [15] 안전보건방침 (SAPA) 관련 테이블 시딩
    db.prepare("INSERT INTO safety_policies (id, year, policy_title, targets_json, established_at, established_by) VALUES (?, ?, ?, ?, ?, ?)")
      .run(1, '2026', '전 임직원이 함께 참여하는 자율 안전보건 관리 구축', 
      JSON.stringify([
        '1공장 고압가스 충진설비 무재해 달성',
        '작업 전 LOTO 확인 및 툴박스미팅(TBM) 모바일 QR 서명 이행율 100%',
        '아차사고 발견 시 24시간 이내 모바일 현장 제보 활성화'
      ]), nowStr, '임주희');

    db.prepare("INSERT INTO safety_risk_assessments (id, work_name, work_date, hazards_json, risk_level, evaluated_by, approved_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run('risk-2026-001', '1공장 고압 냉매가스 충진라인 실린더 교체 및 유지보수', getPastDateOnlyStr(1),
      JSON.stringify([
        {
          hazard: '밸브 정비 중 잔류 고압 냉매 누출로 인한 동상 또는 호흡기 손상',
          type: '질식/가스누출',
          measure: '작업 전 라인 메인 밸브 전면 잠금 및 잔압 완전 릴리즈(LOTO) 확인. 동상 방지 안전장갑 및 마스크 필수 착용.'
        },
        {
          hazard: '압력 프레스 주변 가공 칩 비산으로 인한 보안경 미착용 시 안구 손상',
          type: '물체에 맞음',
          measure: '작업 구역 펜스 설치 및 전원 차단 경고판 부착. 보호구(보안경, 방전화) 미착용 시 작업 투입 제한.'
        }
      ]), '중', '홍길동', nowStr, 'APPROVED');

    db.prepare("INSERT INTO safety_tbm_logs (id, tbm_date, work_leader, weather_info, tbm_script, attendees_count, attendee_signatures, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run('tbm-2026-001', getPastDateOnlyStr(0), '홍길동', '맑음',
      '반갑습니다. 오늘 1공장 고압 냉매가스 충진라인 유지보수 작업을 시작하기 전에 LOTO 절차 이행을 점검합니다. 메인 가스 차단 밸브의 이중 잠금장치를 부착하고 전원 키는 SCM 보관함에 격리하였습니다. 가스 잔압 제거를 위해 5분간 드레인 밸브를 열어둘 테니 작업 전에 반드시 게이지 압력이 0 bar인지 눈으로 교차 검증해 주세요. 보호구 착용 철저히 하시고 안전합시다! 안전!',
      2, JSON.stringify([
        { worker_name: '이철수', signature_data: 'data:image/png;base64,iVBORw0KGgo...', signed_at: getPastDateStr(0) },
        { worker_name: '박영희', signature_data: 'data:image/png;base64,iVBORw0KGgo...', signed_at: getPastDateStr(0) }
      ]), nowStr);

    db.prepare("INSERT INTO safety_near_misses (id, reporter_name, hazard_location, description, photo_url, risk_grade, action_status, action_description, action_completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run('miss-2026-001', '이철수', '2공장 사출기 프레스 가동 축 주변', '프레스 가동 축 유압 실린더 하단에 호스 연결 조인트 부분 미세 윤활유 미끄러짐 오일 누유 발견. 용융 자재 이동 시 밟으면 낙상 위험 있어 조치 건의함.', null, 'HIGH', 'PENDING', null, null, nowStr);

    // [16] crm_facilities (설비 대장 마스터)
    db.prepare("INSERT INTO crm_facilities (id, name, manufacturer, model_name, serial_number, manufacture_year, specifications, location, status, health_score, vibration_rms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run('EQ-PRESS-01', '주력 냉매 압축 충진 프레스 A호기', '(주)대진에스씨엠', 'CP-500', 'SN-CP-500-2024', 2024, 'Pressure Force: 500Ton, Gas Capacity: 20L/min', '1공장 냉매 충진실', 'RUNNING', 94.2, 1.8, nowStr, nowStr);
    
    // [17] crm_facility_repair_solutions
    db.prepare("INSERT INTO crm_facility_repair_solutions (errorCode, rootCause, actions, similarHistory, warehouse) VALUES (?, ?, ?, ?, ?)")
      .run('E-102', '고압 실린더 압력 리밸브 마모 및 오링 손상에 의한 냉매 누출.', 
      JSON.stringify([
        '1. 실린더 게이트 가스 유입 라인을 LOTO 차단합니다.',
        '2. 유압 압력 밸브 가이드 고무 씰 마모 상태를 확인하고 규격 O링으로 즉각 교체합니다.',
        '3. 결속 후 가스 검지기로 미세 누출을 최종 감지합니다.'
      ]), '2025년 5월 고압 냉매 누출 유압 O링 패킹 교체 이력 있음.', '본사 자재 창고 B-3 랙에 고압 전용 실린더 O링 여분 10개 보유 중');

    // [18] crm_recruitment_applicants (채용 지원자)
    db.prepare("INSERT INTO crm_recruitment_applicants (id, name, age, phone, experience, motivation, matching_score, status, resume_file_path, tech_stacks, interview_logs, ai_evaluation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run('app-01', '강태우', '34', '010-3322-9988', '한온시스템 공조시스템 설계 5년 근무', '친환경 냉매 R-1234yf용 컴프레서 부품 정밀 설계 및 양산 라인 최적화 경험을 바탕으로, 제이지인터내셔널의 B2B 공조 부품 독자 모델 개발에 기여하고자 지원했습니다.', 95, 'applied', '/uploads/resumes/applicant_resume.pdf', 'AutoCAD, SolidWorks, CATIA, 공조냉동기계기사, 유체역학', '인성이 바르고 실무 설계 능력이 우수하여 기술 개발부 전임연구원 적격자로 판단됨.', '경력이 우수하며 취급하는 R-1234yf 친환경 도메인 일치도가 매우 높습니다. 1순위 추천.', nowStr);

    // [19] crm_snaptasks & items
    db.prepare("INSERT INTO crm_snaptasks (id, title, status, partner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run('task-2026-001', '[자재등록] 한국가스켐 고압가스 냉매 매입 명세서 건', 'ACTIVE', 'V-GAS-01', getPastDateStr(1), nowStr);
    db.prepare("INSERT INTO crm_snaptask_items (id, task_id, content_text, file_url, file_type, ai_analysis, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(1, 'task-2026-001', '한국가스켐에서 냉매 20개 매입 전송 건', '/uploads/invoices/purchase_invoice.png', 'IMAGE', 
      JSON.stringify({
        vendor: "한국가스켐(주)",
        items: [
          { name: "R-134a 에어컨 냉매 벌크", quantity: 2, price: 1200000, total: 2400000 },
          { name: "PAG 46 공조 오일 드럼", quantity: 1, price: 1100000, total: 1100000 }
        ],
        totalAmount: 3500000
      }), getPastDateStr(1));

    // [20] shared_dashboards & system_menu_settings
    db.prepare("INSERT INTO shared_dashboards (share_id, title, sql_query, table_name, display_name, chart_spec_json, briefing_markdown, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run('share-demo-1', '연도별 매출 및 부채 현황 분석', 'SELECT fiscal_year, revenue, total_assets, total_liabilities FROM crm_financial_statements', 'crm_financial_statements', '재무제표 관리', 
      JSON.stringify({ type: 'bar', x: 'fiscal_year', y: 'revenue' }), '2024년 대비 2025년 매출액이 약 22% 신장하였으며 자산 건전도 및 현금 유동 비율이 매우 안정적으로 관리되고 있습니다.', nowStr);

    const menus = [
      ['/', 1, 1],
      ['/estimates', 1, 2],
      ['/partners', 1, 3],
      ['/inventory', 1, 4],
      ['/expenses', 1, 5],
      ['/finance-cashflow', 1, 6],
      ['/safety-management', 1, 7],
      ['/rnd-management', 1, 8],
      ['/mail-management-ai', 1, 9]
    ];
    for (const m of menus) {
      db.prepare("INSERT OR REPLACE INTO system_menu_settings (menu_href, is_enabled, sort_order) VALUES (?, ?, ?)")
        .run(m[0], m[1], m[2]);
    }

  })();

  console.log('✓ 모든 데모 데이터 적재가 트랜잭션 내에서 완료되었습니다.');
  db.close();
}

seed().catch(err => {
  console.error('❌ 시딩 중 오류 발생:', err);
  process.exit(1);
});
