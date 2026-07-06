const helpers = require('../egdesk-helpers.js');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. 특정 테이블 데이터 완전 삭제 유틸
async function clearTable(tableName) {
  try {
    const list = await helpers.queryTable(tableName, { limit: 1000 });
    const rows = list.rows || [];
    if (rows.length === 0) {
      console.log(`🧹 [Clear] 테이블이 이미 비어있습니다: ${tableName}`);
      return;
    }
    
    // getTableSchema를 보면 대부분 'id' 컬럼이 primary key
    for (const row of rows) {
      if (row.id !== undefined) {
        await helpers.deleteRows(tableName, { filters: { id: row.id } });
      }
    }
    console.log(`🧹 [Clear] 테이블 초기화 완료: ${tableName} (${rows.length}행 삭제됨)`);
  } catch (err) {
    console.error(`⚠️ [Clear] 테이블 초기화 실패: ${tableName}`, err.message);
  }
}

async function main() {
  console.log('==================================================');
  console.log('🚀 어반드레스(AVANDRESS) 전사 AI 데모 데이터베이스 전면 리셋 및 시딩');
  console.log('==================================================\n');

  // 1. 초기화 테이블 리스트
  const tablesToClear = [
    'crm_attendance',
    'crm_annual_leaves',
    'crm_customers',
    'coupons',
    'crm_coupons_restrictions',
    'products',
    'crm_orders',
    'crm_deliveries',
    'crm_estimates',
    'crm_estimate_items',
    'crm_purchase_orders',
    'crm_sales_orders',
    'crm_partners',
    'crm_snaptasks',
    'crm_snaptask_items',
    'crm_snaptask_actions',
    'crm_expenses',
    'crm_point_history'
  ];

  for (const table of tablesToClear) {
    await clearTable(table);
  }

  // crm_operators 테이블은 id !== 1인 임시 유저만 정리
  try {
    const operatorsRes = await helpers.queryTable('crm_operators', { limit: 100 });
    const operators = operatorsRes.rows || [];
    for (const op of operators) {
      if (op.id !== 1) { // 1번 admin은 보존
        await helpers.deleteRows('crm_operators', { filters: { id: op.id } });
      }
    }
    console.log('🧹 [Clear] crm_operators 테이블 내 1번(admin) 외 기존 임시 직원 정리 완료.');
  } catch (e) {
    console.error('⚠️ [Clear] crm_operators 정리 실패:', e.message);
  }

  console.log('\n[시작] 어반드레스 실무 가상 데이터 주입 중...');

  // 2. 어반드레스 실무진 (crm_operators) 등록
  const mockOperators = [
    {
      id: 2,
      username: 'jiwoo',
      password_hash: '$2b$10$FVbz4.quM91aCgG7Ji5fYeTGh1E2nj7bQYBDoodftqp6zLNz3v.CW', // admin과 동일 비밀번호
      name: '최지우',
      role: 'SUB_OPERATOR',
      created_at: '2026-06-05 09:00:00'
    },
    {
      id: 3,
      username: 'minju',
      password_hash: '$2b$10$FVbz4.quM91aCgG7Ji5fYeTGh1E2nj7bQYBDoodftqp6zLNz3v.CW',
      name: '박민주',
      role: 'SUB_OPERATOR',
      created_at: '2026-06-05 09:00:00'
    },
    {
      id: 4,
      username: 'seojun',
      password_hash: '$2b$10$FVbz4.quM91aCgG7Ji5fYeTGh1E2nj7bQYBDoodftqp6zLNz3v.CW',
      name: '김서준',
      role: 'SUB_OPERATOR',
      created_at: '2026-06-05 09:00:00'
    },
    {
      id: 5,
      username: 'kyungwoo',
      password_hash: '$2b$10$FVbz4.quM91aCgG7Ji5fYeTGh1E2nj7bQYBDoodftqp6zLNz3v.CW',
      name: '이경우',
      role: 'SUB_OPERATOR',
      created_at: '2026-06-05 09:00:00'
    }
  ];

  try {
    await helpers.insertRows('crm_operators', mockOperators);
    console.log('✅ crm_operators 실무진 4명 등록 완료 (최지우, 박민주, 김서준, 이경우).');
  } catch (e) {
    console.error('⚠️ crm_operators 주입 실패:', e.message);
  }

  // 3. 근태 정보 (crm_attendance) 주입
  const mockAttendance = [
    {
      id: 'ATT-20260605-01',
      operator_id: '3', // 박민주
      work_date: '2026-06-05',
      clock_in: '08:30',
      clock_out: null,
      status: 'PRESENT',
      working_hours: 0,
      memo: '물류창고 입고 검수 예정',
      created_at: '2026-06-05 08:30:00',
      updated_at: '2026-06-05 08:30:00'
    },
    {
      id: 'ATT-20260605-02',
      operator_id: '2', // 최지우
      work_date: '2026-06-05',
      clock_in: '08:45',
      clock_out: null,
      status: 'PRESENT',
      working_hours: 0,
      memo: '자사몰 기획전 캠페인 마감일',
      created_at: '2026-06-05 08:45:00',
      updated_at: '2026-06-05 08:45:00'
    },
    {
      id: 'ATT-20260605-03',
      operator_id: '4', // 김서준
      work_date: '2026-06-05',
      clock_in: '08:55',
      clock_out: null,
      status: 'PRESENT',
      working_hours: 0,
      memo: '월간 법인카드 매입세금계산서 대사',
      created_at: '2026-06-05 08:55:00',
      updated_at: '2026-06-05 08:55:00'
    },
    {
      id: 'ATT-20260605-04',
      operator_id: '5', // 이경우
      work_date: '2026-06-05',
      clock_in: '08:20',
      clock_out: null,
      status: 'OVERTIME_ALERT', // 초과근무 경고 상태
      working_hours: 12.5,
      memo: '주간 누적 53.5시간 초과 근무자 경보',
      created_at: '2026-06-05 08:20:00',
      updated_at: '2026-06-05 08:20:00'
    }
  ];

  try {
    await helpers.insertRows('crm_attendance', mockAttendance);
    console.log('✅ crm_attendance 근태 시드 데이터 4건 주입 완료.');
  } catch (e) {
    console.error('⚠️ crm_attendance 주입 실패:', e.message);
  }

  // 4. 상품 정보 (products) 주입
  const mockProducts = [
    {
      id: 'PD-URB-01',
      name: 'Felt 3D Pigment Zip-Up',
      price: '89000',
      url: 'http://urban.dress/products/felt-pigment-zipup',
      description: '체형 보완에 가장 탁월한 핏을 선사하는 시그니처 가을 피그먼트 지퍼업 아우터',
      category: '아우터',
      menu_category: 'F/W Outer',
      is_coupon_excludable: 0,
      is_estimate_price: 0,
      updated_at: '2026-06-05 09:00:00'
    },
    {
      id: 'PD-URB-02',
      name: 'Rizz Crop T-Shirt',
      price: '39000',
      url: 'http://urban.dress/products/rizz-crop-t',
      description: '어반드레스 베스트셀러 크롭 핏 반팔 티셔츠',
      category: '상의',
      menu_category: 'S/S Top',
      is_coupon_excludable: 0,
      is_estimate_price: 0,
      updated_at: '2026-06-05 09:00:00'
    },
    {
      id: 'PD-URB-03',
      name: 'Bubble Crop T-shirt 8COL',
      price: '29000',
      url: 'http://urban.dress/products/bubble-crop',
      description: '통기성이 좋은 여름용 여성 크롭 캐주얼 셔츠',
      category: '상의',
      menu_category: 'S/S Top',
      is_coupon_excludable: 0,
      is_estimate_price: 0,
      updated_at: '2026-06-05 09:00:00'
    }
  ];

  try {
    await helpers.insertRows('products', mockProducts);
    console.log('✅ products 가을 신상 및 베스트셀러 3종 주입 완료.');
  } catch (e) {
    console.error('⚠️ products 주입 실패:', e.message);
  }

  // 5. CRM 고객 명단 (crm_customers) 주입
  const mockCustomers = [
    {
      id: 1,
      name: '이민아',
      phone: '010-1234-5678',
      tags: 'VIP,90일미구매',
      memo: '지난 시즌 아우터 3회 구매 고객 (자사몰)',
      address: '서울특별시 강남구 역삼동 741-12',
      point_balance: 3500,
      created_at: '2025-10-12 10:00:00'
    },
    {
      id: 2,
      name: '강태오',
      phone: '010-9876-5432',
      tags: '90일미구매',
      memo: '무신사 입점몰에서 넘어와 첫 자사몰 가입',
      address: '경기도 성남시 분당구 삼평동 612',
      point_balance: 1200,
      created_at: '2025-11-05 14:30:00'
    },
    {
      id: 3,
      name: '윤서현',
      phone: '010-5555-4444',
      tags: 'VIP,자사몰활성화',
      memo: 'SNS 숏폼 바이럴 유입 VIP 고객',
      address: '부산광역시 해운대구 우동 1024',
      point_balance: 7200,
      created_at: '2026-01-20 11:20:00'
    }
  ];

  try {
    await helpers.insertRows('crm_customers', mockCustomers);
    console.log('✅ crm_customers CRM 대상 고객 3명 주입 완료.');
  } catch (e) {
    console.error('⚠️ crm_customers 주입 실패:', e.message);
  }

  // 6. 자사몰 쿠폰 (coupons) 주입
  const mockCoupons = [
    {
      id: 'CP-FALL-01',
      code: 'AVAN-FALL-15',
      name: '가을신상 런칭기념 자사몰 단독 15% 쿠폰',
      discount_type: 'PERCENT',
      discount_value: 15,
      min_order_amount: 50000,
      status: 'ACTIVE',
      expires_at: '2026-06-30',
      created_at: '2026-06-05 14:00:00'
    }
  ];

  try {
    await helpers.insertRows('coupons', mockCoupons);
    console.log('✅ coupons 자사몰 할인 쿠폰 1건 주입 완료.');
  } catch (e) {
    console.error('⚠️ coupons 주입 실패:', e.message);
  }

  // 7. 지출 대장 (crm_expenses) 주입
  const mockExpenses = [
    {
      id: 'EXP-URB-01',
      title: '디자인실 가을 신상 피그먼트 소재 품평회 간식비',
      category: '복리후생비',
      amount: 45000,
      expense_date: '2026-06-05',
      payment_method: '법인카드',
      ai_analysis: '과일 컵 및 음료수 4개 결제',
      memo: '최지우 마케팅 팀장 외 3명 품평 간담회',
      approval_status: 'APPROVED',
      created_at: '2026-06-05 15:00:00'
    },
    {
      id: 'EXP-URB-02',
      title: '무신사 메인 브랜드 위크 상단 배너 광고선전비',
      category: '광고선전비',
      amount: 1500000,
      expense_date: '2026-06-05',
      payment_method: '법인카드',
      ai_analysis: '무신사 입점사 대상 온라인 마케팅 광고 청구서 건',
      memo: '가을 신상 런칭 광고 노출 3일 집행 대금',
      approval_status: 'PENDING',
      created_at: '2026-06-05 16:30:00'
    }
  ];

  try {
    await helpers.insertRows('crm_expenses', mockExpenses);
    console.log('✅ crm_expenses 법인카드 결제 지출 대대장 2건 주입 완료.');
  } catch (e) {
    console.error('⚠️ crm_expenses 주입 실패:', e.message);
  }

  // 8. ⭐️ 스냅태스크 과거 완료 이력 데이터 주입 (직원 성과 랭킹 시각화용)
  // 최지우(jiwoo, 2), 박민주(minju, 3), 김서준(seojun, 4)의 성과 스냅태스크를 다량 주입합니다.
  console.log('\n[시작] 직원별 과거 7일간의 완료된 스냅태스크(업무량/성과 점수) 이력 주입 중...');

  const mockTasks = [];
  const mockTaskItems = [];

  // 과거 일주일치 날짜 생성
  const now = Date.now();
  
  // (1) 박민주 (물류팀 - 18건)
  for (let i = 1; i <= 18; i++) {
    const tid = `ST-MINJU-${100 + i}`;
    const dateStr = new Date(now - i * 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    
    mockTasks.push({
      id: tid,
      title: `[물류] 물류창고 입고 및 3PL 정합 처리 (#${i})`,
      status: 'COMPLETED', // 완료된 상태
      partner_id: null,
      created_at: dateStr,
      updated_at: dateStr
    });

    mockTaskItems.push({
      id: 200 + i,
      task_id: tid,
      content_text: `[완료 보고] 박민주 물류 매니저가 무신사/자사몰 배송 엑셀 데이터를 정합하여 ${10 * i}건의 통합 송장을 오류 없이 발행하였습니다.`,
      file_url: null,
      file_type: 'TEXT',
      ai_analysis: JSON.stringify({
        operator_name: '박민주',
        operator_id: '3', // 박민주
        performance_points: 15, // 업무량 가중치
        contribution_type: 'LOGISTICS'
      }),
      created_at: dateStr
    });
  }

  // (2) 최지우 (마케팅팀 - 14건)
  for (let i = 1; i <= 14; i++) {
    const tid = `ST-JIWOO-${100 + i}`;
    const dateStr = new Date(now - i * 11 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    
    mockTasks.push({
      id: tid,
      title: `[마케팅] 자사몰 CRM 쿠폰 캠페인 및 SNS 홍보 (#${i})`,
      status: 'COMPLETED',
      partner_id: null,
      created_at: dateStr,
      updated_at: dateStr
    });

    mockTaskItems.push({
      id: 300 + i,
      task_id: tid,
      content_text: `[완료 보고] 최지우 마케팅 팀장이 기획전 10% 쿠폰 대량 발급 및 인스타 릴스 숏폼 콘텐츠 업로드를 마쳤습니다. 기여 매출 ${1200000 * i}원 발생.`,
      file_url: null,
      file_type: 'TEXT',
      ai_analysis: JSON.stringify({
        operator_name: '최지우',
        operator_id: '2', // 최지우
        performance_points: 25, // 매출 기여 및 마케팅 가중치
        contribution_type: 'MARKETING',
        attributed_sales: 1200000 * i
      }),
      created_at: dateStr
    });
  }

  // (3) 김서준 (재무팀 - 12건)
  for (let i = 1; i <= 12; i++) {
    const tid = `ST-SEOJUN-${100 + i}`;
    const dateStr = new Date(now - i * 13 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    
    mockTasks.push({
      id: tid,
      title: `[재무] 법인카드 영수증 대사 및 홈택스 마감 (#${i})`,
      status: 'COMPLETED',
      partner_id: null,
      created_at: dateStr,
      updated_at: dateStr
    });

    mockTaskItems.push({
      id: 400 + i,
      task_id: tid,
      content_text: `[완료 보고] 김서준 재무 대리가 법인카드 및 매입세금계산서 대사 정산 전표 ${5 * i}건을 최종 승인 마쳤습니다.`,
      file_url: null,
      file_type: 'TEXT',
      ai_analysis: JSON.stringify({
        operator_name: '김서준',
        operator_id: '4', // 김서준
        performance_points: 10, // 행정 가중치
        contribution_type: 'FINANCE'
      }),
      created_at: dateStr
    });
  }

  try {
    // 순차 주입하여 충돌 방지
    await helpers.insertRows('crm_snaptasks', mockTasks);
    await helpers.insertRows('crm_snaptask_items', mockTaskItems);
    console.log(`✅ crm_snaptasks / crm_snaptask_items 과거 완료 성과 기록 총 ${mockTasks.length}건 주입 완료!`);
  } catch (e) {
    console.error('⚠️ 스냅태스크 완료 이력 주입 실패:', e.message);
  }

  console.log('\n==================================================');
  console.log('🎉 초기화 및 어반드레스(AVANDRESS) 맞춤 데이터 갱신 성공!');
  console.log('==================================================');
}

main();
