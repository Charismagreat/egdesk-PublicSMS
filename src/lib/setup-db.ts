import { TABLES, COLUMN_DEFINITIONS, TableName } from '../../egdesk.schema';
import { createTable, queryTable, insertRows, updateRows, deleteRows, deleteTable, executeSQL, getTableSchema, listTables } from '../../egdesk-helpers';

export async function setupDatabase() {
  const SHOULD_SEED_DEMO = process.env.SEED_DEMO_DATA === 'true';
  const safeCreateTable = async (displayName: string, columns: any[], options: any) => {
    const tableName = options.tableName;
    const auditCols = [
      { name: 'tenant_id', type: 'TEXT' },
      { name: 'uuid', type: 'TEXT' },
      { name: 'updated_at', type: 'TEXT' },
      { name: 'updated_by', type: 'TEXT' },
      { name: 'deleted_at', type: 'TEXT' },
      { name: 'deleted_by', type: 'TEXT' },
      { name: 'restored_at', type: 'TEXT' },
      { name: 'restored_by', type: 'TEXT' }
    ];

    try {
      // 1. 스키마 정의에 7종 감사 컬럼 및 tenant_id 주입 (신규 생성 대비)
      for (const aCol of auditCols) {
        const hasCol = columns.some(c => c.name.toLowerCase() === aCol.name.toLowerCase());
        if (!hasCol) {
          columns.push({ ...aCol });
        }
      }

      // 2. 물리 SQLite DB에 테이블이 이미 존재하는지 검증하여 무분별한 드롭 방지
      let exists = false;
      try {
        const checkRes = await listTables();
        const tables = checkRes.tables || [];
        exists = tables.some((t: any) => t.tableName === tableName);
      } catch (err) {
        exists = false;
      }

      if (exists) {
        // [자동 마이그레이션] 이미 존재하는 테이블의 누락 감사 컬럼 및 명세 컬럼 자동 보정
        try {
          const schemaInfo = await getTableSchema(tableName);
          const existingColNames = (schemaInfo?.schema || []).map((c: any) => c.name.toLowerCase());
          
          let needsMigration = false;
          
          // 1. 감사 컬럼 누락 여부 검사
          for (const aCol of auditCols) {
            if (!existingColNames.includes(aCol.name.toLowerCase())) {
              needsMigration = true;
              break;
            }
          }

          // 2. 일반 명세 컬럼 누락 여부 검사
          if (!needsMigration) {
            for (const col of columns) {
              if (!existingColNames.includes(col.name.toLowerCase())) {
                needsMigration = true;
                break;
              }
            }
          }

          if (needsMigration) {
            console.log(`[Auto-Migration] Table "${tableName}" requires schema updates. Starting data-preserving migration...`);
            
            // A. 기존 데이터 백업 (Read) - 1,000건 단위 분할 백업으로 MCP 제한 극복
            const existingRows: any[] = [];
            let offset = 0;
            const batchSize = 1000;
            while (true) {
              const batchRes = await queryTable(tableName, { limit: batchSize, offset });
              const batchRows = batchRes.rows || [];
              existingRows.push(...batchRows);
              if (batchRows.length < batchSize) {
                break;
              }
              offset += batchSize;
            }
            console.log(`[Auto-Migration] Backed up ${existingRows.length} rows from "${tableName}".`);

            // B. 기존 테이블 제거 (Drop)
            await deleteTable(tableName);
            console.log(`[Auto-Migration] Dropped legacy table "${tableName}".`);

            // C. 새로운 스키마로 테이블 생성 (Recreate)
            await createTable(displayName, columns, options);
            console.log(`[Auto-Migration] Re-created table "${tableName}" with updated schema.`);

            // D. 백업 데이터 복원 (Restore)
            if (existingRows.length > 0) {
              const restoreRes = await insertRows(tableName, existingRows);
              if (restoreRes.success) {
                console.log(`[Auto-Migration] Successfully restored ${existingRows.length} rows into "${tableName}".`);
              } else {
                throw new Error(restoreRes.error || "Data restoration failed");
              }
            }
            console.log(`[Auto-Migration] Schema update for table "${tableName}" completed successfully without data loss.`);
          }
        } catch (alterErr: any) {
          console.error(`[Auto-Migration Error] Failed to migrate table "${tableName}":`, alterErr.message);
        }
        return;
      }

      // 3. 물리적으로는 없는데 메타데이터만 꼬여있는 경우, 선제 정리 후 깨끗하게 생성
      console.log(`Table "${tableName}" does not exist physically. Re-creating...`);
      try {
        await deleteTable(tableName);
      } catch (e) {
        // 이미 테이블이 없는 경우 무시
      }

      await createTable(displayName, columns, options);
      console.log(`Table "${tableName}" created successfully.`);
    } catch (e: any) {
      console.error(`Error creating table "${tableName}":`, e.message);
    }
  };

  console.log('Starting database setup for egdesk-FreeSMS...');

  // TABLES와 COLUMN_DEFINITIONS를 순회하며 동적으로 테이블 물리적 자동 생성 및 마이그레이션
  for (const tableKey of Object.keys(TABLES) as TableName[]) {
    const tableMeta = TABLES[tableKey];
    const columns = COLUMN_DEFINITIONS[tableKey];
    const options: any = {
      tableName: tableMeta.name,
    };
    if ((tableMeta as any).uniqueKeyColumns) {
      options.uniqueKeyColumns = (tableMeta as any).uniqueKeyColumns;
    }
    if ((tableMeta as any).duplicateAction) {
      options.duplicateAction = (tableMeta as any).duplicateAction;
    }
    await safeCreateTable(tableMeta.displayName, columns as unknown as any[], options);
  }

  // 💡 [신규] 태스크 폴더 테이블 2종 생성
  await safeCreateTable('태스크 폴더', [
    { name: 'id', type: 'INTEGER', notNull: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'description', type: 'TEXT' },
    { name: 'created_by', type: 'TEXT' },
    { name: 'created_at', type: 'TEXT' }
  ], { tableName: 'crm_task_folders', uniqueKeyColumns: ['id'] });

  await safeCreateTable('태스크 폴더 수집자료', [
    { name: 'id', type: 'INTEGER', notNull: true },
    { name: 'folder_id', type: 'INTEGER', notNull: true },
    { name: 'type', type: 'TEXT' },
    { name: 'tags', type: 'TEXT' },
    { name: 'title', type: 'TEXT', notNull: true },
    { name: 'content', type: 'TEXT' },
    { name: 'file_name', type: 'TEXT' },
    { name: 'file_size', type: 'TEXT' },
    { name: 'file_url', type: 'TEXT' },
    { name: 'created_at', type: 'TEXT' }
  ], { tableName: 'crm_task_folder_items', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 자율 실행 규칙 테이블 생성
  await safeCreateTable('AI 자율 실행 통제 규칙', [
    { name: 'id', type: 'INTEGER', notNull: true },
    { name: 'rule_name', type: 'TEXT', notNull: true },
    { name: 'rule_expression', type: 'TEXT', notNull: true },
    { name: 'structured_rule', type: 'TEXT' },
    { name: 'is_active', type: 'INTEGER', notNull: true },
    { name: 'created_at', type: 'TEXT', notNull: true }
  ], { tableName: 'crm_governance_rules', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 일일 업무 보고서 테이블 생성
  await safeCreateTable('일일 업무 보고서', [
    { name: 'id', type: 'INTEGER', notNull: true },
    { name: 'report_date', type: 'TEXT', notNull: true },
    { name: 'operator', type: 'TEXT', notNull: true },
    { name: 'ai_summary', type: 'TEXT' },
    { name: 'report_content', type: 'TEXT' },
    { name: 'status', type: 'TEXT', notNull: true },
    { name: 'comment', type: 'TEXT' },
    { name: 'approver', type: 'TEXT' },
    { name: 'approved_at', type: 'TEXT' }
  ], { tableName: 'crm_daily_reports', uniqueKeyColumns: ['id'] });

  // 💡 [신규] AI 추천 후속 업무 관제 테이블 생성
  await safeCreateTable('AI 추천 후속 업무 관제', [
    { name: 'id', type: 'INTEGER', notNull: true },
    { name: 'report_id', type: 'INTEGER', notNull: true },
    { name: 'task_title', type: 'TEXT', notNull: true },
    { name: 'task_description', type: 'TEXT' },
    { name: 'assignee_id', type: 'TEXT' },
    { name: 'due_date', type: 'TEXT' },
    { name: 'status', type: 'TEXT', notNull: true }
  ], { tableName: 'crm_governance_pending_tasks', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 대표자 자연어 지시 마스터 테이블 생성
  await safeCreateTable('대표자 자연어 지시 마스터', [
    { name: 'id', type: 'TEXT', notNull: true },
    { name: 'raw_command', type: 'TEXT', notNull: true },
    { name: 'status', type: 'TEXT', notNull: true }
  ], { tableName: 'crm_governance_commands', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 하위 분해 세부 작업 테이블 생성
  await safeCreateTable('하위 분해 세부 작업', [
    { name: 'id', type: 'TEXT', notNull: true },
    { name: 'command_id', type: 'TEXT', notNull: true },
    { name: 'task_title', type: 'TEXT', notNull: true },
    { name: 'task_description', type: 'TEXT' },
    { name: 'executor_type', type: 'TEXT', notNull: true }, // AI, STAFF
    { name: 'assignee_id', type: 'TEXT' },
    { name: 'due_date', type: 'TEXT' },
    { name: 'status', type: 'TEXT', notNull: true }, // PENDING, RUNNING, COMPLETED, FAILED
    { name: 'result_detail', type: 'TEXT' }
  ], { tableName: 'crm_governance_subtasks', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 자금/원가 제품 기초 데이터 테이블 생성
  await safeCreateTable('제품 표준 원가 분석 기초 데이터', [
    { name: 'id', type: 'TEXT', notNull: true },
    { name: 'productName', type: 'TEXT', notNull: true },
    { name: 'materialCost', type: 'INTEGER' },
    { name: 'laborCost', type: 'INTEGER' },
    { name: 'expenseCost', type: 'INTEGER' },
    { name: 'sellingPrice', type: 'INTEGER' }
  ], { tableName: 'crm_finance_products', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 자금/수금 지출 예후 시계열 테이블 생성
  await safeCreateTable('자금 수금 지출 예후 시계열 대장', [
    { name: 'id', type: 'TEXT', notNull: true },
    { name: 'date', type: 'TEXT', notNull: true },
    { name: 'type', type: 'TEXT', notNull: true },
    { name: 'title', type: 'TEXT' },
    { name: 'partnerName', type: 'TEXT' },
    { name: 'amount', type: 'INTEGER' },
    { name: 'isOverdue', type: 'INTEGER' },
    { name: 'contact', type: 'TEXT' }
  ], { tableName: 'crm_finance_forecasts', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 맞춤형 커스텀 페이지 마스터 테이블 생성
  await safeCreateTable('맞춤형 커스텀 페이지 마스터', [
    { name: 'id', type: 'TEXT', notNull: true },
    { name: 'page_slug', type: 'TEXT', notNull: true },
    { name: 'page_title', type: 'TEXT', notNull: true },
    { name: 'ui_schema', type: 'TEXT', notNull: true },
    { name: 'data_schema', type: 'TEXT', notNull: true }
  ], { tableName: 'crm_custom_pages', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 네이버 블로그 포스팅 이력 및 예약 대장 테이블 생성 (post_url 보장)
  await safeCreateTable('네이버 블로그 포스팅 이력 및 예약', [
    { name: 'id', type: 'INTEGER', notNull: true },
    { name: 'product_id', type: 'TEXT' },
    { name: 'status', type: 'TEXT', notNull: true },
    { name: 'title', type: 'TEXT' },
    { name: 'content', type: 'TEXT' },
    { name: 'target_keywords', type: 'TEXT' },
    { name: 'image_url', type: 'TEXT' },
    { name: 'sub_image_url', type: 'TEXT' },
    { name: 'scheduled_at', type: 'TEXT' },
    { name: 'posted_at', type: 'TEXT' },
    { name: 'post_url', type: 'TEXT' },
    { name: 'error_message', type: 'TEXT' },
    { name: 'views_count', type: 'INTEGER' },
    { name: 'likes_count', type: 'INTEGER' },
    { name: 'comments_count', type: 'INTEGER' }
  ], { tableName: 'crm_naver_blog_posts', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 네이버 블로그 마케팅 설정 대장 테이블 생성 (자동 로그인 ID/PW 컬럼 포함)
  await safeCreateTable('네이버 블로그 마케팅 설정 대장', [
    { name: 'id', type: 'INTEGER', notNull: true },
    { name: 'is_autopilot', type: 'INTEGER' },
    { name: 'autopilot_interval', type: 'TEXT' },
    { name: 'autopilot_time', type: 'TEXT' },
    { name: 'tone_style', type: 'TEXT' },
    { name: 'naver_blog_id', type: 'TEXT' },
    { name: 'naver_login_id', type: 'TEXT' },
    { name: 'naver_login_pw', type: 'TEXT' },
    { name: 'api_client_id', type: 'TEXT' },
    { name: 'api_client_secret', type: 'TEXT' }
  ], { tableName: 'naver_blog_marketing_settings', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 네이버 블로그 다중 오토파일럿 마케팅 규칙 대장 테이블 생성
  await safeCreateTable('네이버 블로그 오토파일럿 규칙 대장', [
    { name: 'id', type: 'INTEGER', notNull: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'interval_type', type: 'TEXT' },
    { name: 'scheduled_time', type: 'TEXT' },
    { name: 'tone_style', type: 'TEXT' },
    { name: 'is_active', type: 'INTEGER' }
  ], { tableName: 'naver_blog_autopilot_rules', uniqueKeyColumns: ['id'] });

  // 💡 [신규] 맞춤형 커스텀 페이지 데이터 테이블 생성
  await safeCreateTable('맞춤형 커스텀 페이지 데이터', [
    { name: 'id', type: 'INTEGER', notNull: true },
    { name: 'page_id', type: 'TEXT', notNull: true },
    { name: 'row_data', type: 'TEXT', notNull: true }
  ], { tableName: 'crm_custom_page_data', uniqueKeyColumns: ['id'] });

  // 초기 시범 자율 규칙 시딩 (테넌트: tenant-guest-id-2222)
  try {
    const rulesCheck = await queryTable('crm_governance_rules', { limit: 1 });
    if (!rulesCheck.rows || rulesCheck.rows.length === 0) {
      console.log('➡️ AI 자율 실행 통제 규칙 시범 데이터 시딩을 시작합니다.');
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('crm_governance_rules', [{
        id: 1,
        rule_name: '김직원 소액 수입통관 자동 승인 규칙',
        rule_expression: '김직원이 상신한 수입통관 중 500만원 이하의 건은 자동 승인 처리한다.',
        structured_rule: JSON.stringify({
          operator: '김직원',
          doc_type: 'import_customs',
          max_amount: 5000000
        }),
        is_active: 1,
        created_at: nowStr,
        tenant_id: 'tenant-guest-id-2222',
        uuid: 'rule-1',
        updated_at: nowStr,
        updated_by: 'SUPER_ADMIN'
      }]);
    }
  } catch (err: any) {
    console.warn('Rules seed skipped:', err.message);
  }

  // 효성전기 영업 데모 데이터 삭제 조치 (예시 제거)
  try {
    await deleteRows('crm_task_folder_items', { filters: { folder_id: '1' } });
    await deleteRows('crm_task_folders', { ids: [1] });
  } catch (err: any) {
    console.warn('Cleanup of legacy seed data skipped:', err.message);
  }

  // 54. 수입 통관 실제 레퍼런스 데이터 시딩 (ERP 검증용 1건)
  try {
    const masterCheck = await queryTable('import_master', { limit: 1 });
    if (!masterCheck.rows || masterCheck.rows.length === 0) {
      console.log('➡️ 수입 통관 실제 레퍼런스 데이터 시딩을 시작합니다.');
      
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      
      await insertRows('import_master', [{
        so_number: '3254222',
        po_number: 'WONEC-S2625',
        invoice_number: 'INV-3254222',
        order_date: '2026-03-12',
        ship_date: '2026-03-25',
        invoice_date: '2026-03-25',
        air_waybill_nbr: '483391031320',
        ship_via: 'FED-EX INTERNATIONAL',
        terms_of_sale: 'EXW',
        payment_terms: 'NET60',
        exporter_name: 'BAL SEAL ENGINEERING LLC',
        file_path: '/uploads/customs/20260630수입통관서류.pdf',
        created_at: nowStr,
        uuid: 'master-uuid-3254222'
      }]);

      await insertRows('import_items', [{
        item_id: 1,
        so_number: '3254222',
        part_number: 'X639451',
        description: 'ELECTRICAL CONNECTORS',
        quantity: 20.00,
        unit_price: 25.00,
        amount: 500.00,
        currency: 'USD',
        hs_code: '8536.90.4000',
        country_of_origin: 'US',
        lot_number: '2994383',
        mfg_date: '2026-03-20',
        created_at: nowStr,
        uuid: 'item-uuid-1'
      }]);

      await insertRows('import_finance', [{
        finance_id: 1,
        so_number: '3254222',
        total_invoice_value: 500.00,
        payment_due_date: '2026-05-24',
        is_paid: 0,
        paid_date: null,
        bank_name: 'Bank of America, N.A.',
        account_number: '385015956275',
        swift_code: 'BOFAUS3N',
        created_at: nowStr,
        uuid: 'finance-uuid-1'
      }]);

      console.log('✓ 수입 통관 실제 레퍼런스 데이터 시딩 완료.');
    }

    // 55. 자금/원가 시뮬레이션 기초 데이터 시딩
    const finProdCheck = await queryTable('crm_finance_products', {});
    if (!finProdCheck.rows || finProdCheck.rows.length === 0) {
      await insertRows('crm_finance_products', [
        { id: 'PROD-01', productName: '고정밀 전자 커넥터 모듈 A', materialCost: 12000, laborCost: 8000, expenseCost: 4000, sellingPrice: 32000 },
        { id: 'PROD-02', productName: '자동차용 와이어링 하네스 B', materialCost: 25000, laborCost: 15000, expenseCost: 7000, sellingPrice: 65000 },
        { id: 'PROD-03', productName: '반도체 검사 소켓 소모품 C', materialCost: 45000, laborCost: 28000, expenseCost: 12000, sellingPrice: 110000 }
      ]);
    }

    const finForecastCheck = await queryTable('crm_finance_forecasts', {});
    if (!finForecastCheck.rows || finForecastCheck.rows.length === 0) {
      await insertRows('crm_finance_forecasts', [
        { id: 'FC-01', date: '2026-06-10', type: 'INCOME', title: '동우일렉트릭 수주 잔금 입금', partnerName: '동우일렉트릭', amount: 45000000, isOverdue: 0, contact: '010-1234-5678' },
        { id: 'FC-02', date: '2026-06-15', type: 'EXPENSE', title: '원자재 수입 통관 관세/부가세 납부', partnerName: '인천세관', amount: 12500000, isOverdue: 0, contact: '02-123-4567' },
        { id: 'FC-03', date: '2026-06-20', type: 'INCOME', title: '아시아세미콘 2분기 공급 수금', partnerName: '아시아세미콘', amount: 32000000, isOverdue: 0, contact: '010-9876-5432' }
      ]);
    }

    // 기존 데이터에 file_path가 비어 있을 경우 백필 갱신
    await updateRows('import_master', {
      file_path: '/uploads/customs/20260630수입통관서류.pdf'
    }, {
      filters: { so_number: '3254222' }
    }).catch(() => null);
  } catch (err: any) {
    console.error('⚠️ 수입 통관 데이터 시딩 에러:', err.message);
  }

  // 55. 최초 최고관리자 및 게스트 계정 자동 시딩 및 구버전 보정
  try {
    const adminCheck = await queryTable('crm_operators', { filters: { username: 'admin' } });
    const guestCheck = await queryTable('crm_operators', { filters: { username: 'guest' } });
    
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash('admin123', 10);
    const guest_password_hash = await bcrypt.hash('1234', 10);
    const dateStr = new Date().toISOString();

    // admin 계정이 아예 없거나, 존재하더라도 tenant_id가 비어있다면(구버전 데이터) 업데이트 또는 생성
    if (!adminCheck.rows || adminCheck.rows.length === 0) {
      console.log('➡️ 최초 기동: 디폴트 시스템 운영자 계정을 생성합니다.');
      await insertRows('crm_operators', [
        {
          id: 1,
          username: 'admin',
          password_hash: password_hash,
          name: '시스템 운영자',
          role: 'SYSTEM_ADMIN',
          tenant_id: 'tenant-admin-id-1111',
          created_at: dateStr
        }
      ]);
    } else {
      // 💡 [롤 개편 가드] 기존 admin의 role을 SYSTEM_ADMIN으로 강제 동기화 보정
      await updateRows('crm_operators', {
        name: '시스템 운영자',
        role: 'SYSTEM_ADMIN',
        tenant_id: 'tenant-admin-id-1111',
        updated_at: dateStr
      }, {
        filters: { username: 'admin' }
      });
    }

    // guest 계정이 아예 없거나, 존재하더라도 tenant_id가 비어있다면 업데이트 또는 생성
    if (!guestCheck.rows || guestCheck.rows.length === 0) {
      console.log('➡️ 최초 기동: 테스트 게스트 계정을 생성합니다.');
      await insertRows('crm_operators', [
        {
          id: 2,
          username: 'guest',
          password_hash: guest_password_hash,
          name: '테스트게스트',
          role: 'TENANT_ADMIN',
          tenant_id: 'tenant-guest-id-2222',
          created_at: dateStr
        }
      ]);
    } else {
      // 💡 [롤 개편 가드] 기존 guest의 role을 TENANT_ADMIN으로 강제 동기화 보정
      await updateRows('crm_operators', {
        role: 'TENANT_ADMIN',
        tenant_id: 'tenant-guest-id-2222',
        updated_at: dateStr
      }, {
        filters: { username: 'guest' }
      });
    }
  } catch (err: any) {
    console.error('⚠️ 최고관리자 계정 자동 생성 및 보정 에러:', err.message);
  }

  // 56. 기본 계정과목 자동 시딩
  try {
    const catCheck = await queryTable('expense_categories', { limit: 1 });
    if (!catCheck.rows || catCheck.rows.length === 0) {
      console.log('➡️ 최초 기동: 디폴트 국세청 표준 계정과목 목록을 생성합니다.');
      
      const nationalTaxCategories = [
        { main_category: "판매비와관리비", mid_category: "인건비", sub_category: "급여" },
        { main_category: "판매비와관리비", mid_category: "인건비", sub_category: "퇴직급여" },
        { main_category: "판매비와관리비", mid_category: "복리후생", sub_category: "복리후생비" },
        { main_category: "판매비와관리비", mid_category: "여정/통신", sub_category: "여비교통비" },
        { main_category: "판매비와관리비", mid_category: "여정/통신", sub_category: "통신비" },
        { main_category: "판매비와관리비", mid_category: "에너지/유틸", sub_category: "수도광열비" },
        { main_category: "판매비와관리비", mid_category: "공과/세금", sub_category: "세금과공과" },
        { main_category: "판매비와관리비", mid_category: "임대/감가", sub_category: "감가상각비" },
        { main_category: "판매비와관리비", mid_category: "임대/감가", sub_category: "지급임차료" },
        { main_category: "판매비와관리비", mid_category: "유지/보수", sub_category: "수선비" },
        { main_category: "판매비와관리비", mid_category: "유지/보수", sub_category: "보험료" },
        { main_category: "판매비와관리비", mid_category: "유지/보수", sub_category: "차량유지비" },
        { main_category: "판매비와관리비", mid_category: "업무/선전", sub_category: "기업업무추진비(접대비)" },
        { main_category: "판매비와관리비", mid_category: "업무/선전", sub_category: "광고선전비" },
        { main_category: "판매비와관리비", mid_category: "업무/선전", sub_category: "교육훈련비" },
        { main_category: "판매비와관리비", mid_category: "업무/선전", sub_category: "회의비" },
        { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "소모품비" },
        { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "도서인쇄비" },
        { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "지급수수료" },
        { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "경상연구개발비" },
        { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "대손상각비" },
        { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "기타판매비와관리비" },
        { main_category: "제조경비", mid_category: "원자재", sub_category: "원재료비" },
        { main_category: "제조경비", mid_category: "원자재", sub_category: "부재료비" },
        { main_category: "제조경비", mid_category: "공장 노무비", sub_category: "임금" },
        { main_category: "제조경비", mid_category: "공장 노무비", sub_category: "급여" },
        { main_category: "제조경비", mid_category: "공장 노무비", sub_category: "퇴직급여" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "복리후생비" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "여비교통비" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "가스수도료" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "전력비" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "세금과공과" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "감가상각비" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "지급임차료" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "수선비" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "보험료" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "소모품비" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "외주가공비" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "특허권사용료" },
        { main_category: "제조경비", mid_category: "공장 경비", sub_category: "기타제조경비" },
        { main_category: "영업외비용", mid_category: "금융/통상", sub_category: "이자비용" },
        { main_category: "영업외비용", mid_category: "금융/통상", sub_category: "외환차손" },
        { main_category: "영업외비용", mid_category: "금융/통상", sub_category: "외화환산손실" },
        { main_category: "영업외비용", mid_category: "금융/통상", sub_category: "매출채권처분손실" },
        { main_category: "영업외비용", mid_category: "자산/손실", sub_category: "유형자산처분손실" },
        { main_category: "영업외비용", mid_category: "자산/손실", sub_category: "투자자산처분손실" },
        { main_category: "영업외비용", mid_category: "자산/손실", sub_category: "재고자산감모손실" },
        { main_category: "영업외비용", mid_category: "자산/손실", sub_category: "재해손실" },
        { main_category: "영업외비용", mid_category: "기부/기타", sub_category: "기부금" },
        { main_category: "영업외비용", mid_category: "기부/기타", sub_category: "잡손실" },
        { main_category: "법인세비용", mid_category: "법인세", sub_category: "법인세비용" }
      ];

      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      const baseTime = Date.now();

      const rowsToInsert = nationalTaxCategories.map((cat, index) => ({
        id: `cat-nt-${baseTime}-${index}`,
        main_category: cat.main_category,
        mid_category: cat.mid_category,
        sub_category: cat.sub_category,
        is_active: 1,
        created_at: nowStr
      }));

      await insertRows('expense_categories', rowsToInsert);
      console.log('✓ 국세청 표준 계정과목 목록 자동 시딩 완료.');
    }
  } catch (err: any) {
    console.error('⚠️ 계정과목 목록 자동 생성 및 보정 에러:', err.message);
  }

  // 57. 기존 등록된 재고 완제품 상품 DRAFT 백필 처리
  try {
    console.log('➡️ 기존 등록된 재고 완제품 백필 검사를 수행합니다.');
    
    // 재고에서 삭제되지 않은 완제품 목록 조회 (1,000건 제한 우회 페칭)
    const finishedGoods: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    while (true) {
      const batchRes = await queryTable('inventory_items', { limit: batchSize, offset });
      const batchRows = batchRes.rows || [];
      const filtered = batchRows.filter((item: any) => 
        !item.deleted_at && (item.type === '완제품' || item.type === 'product')
      );
      finishedGoods.push(...filtered);
      if (batchRows.length < batchSize) {
        break;
      }
      offset += batchSize;
    }

    if (finishedGoods.length > 0) {
      // 이미 연동 매핑되어 등록되어 있는 상품 정보 조회 (1,000건 제한 우회 페칭)
      const existingProducts: any[] = [];
      let prodOffset = 0;
      while (true) {
        const batchRes = await queryTable('products', { limit: batchSize, offset: prodOffset });
        const batchRows = batchRes.rows || [];
        existingProducts.push(...batchRows);
        if (batchRows.length < batchSize) {
          break;
        }
        prodOffset += batchSize;
      }

      const mappedInventoryIds = new Set(
        existingProducts
          .map((p: any) => p.inventory_item_id)
          .filter((id: any) => id !== null && id !== undefined)
      );

      // 매핑되어 있지 않은 완제품 추출
      const missingFinishedGoods = finishedGoods.filter((item: any) => !mappedInventoryIds.has(item.id));

      if (missingFinishedGoods.length > 0) {
        console.log(`➡️ 누락된 기존 완제품 ${missingFinishedGoods.length}건에 대해 상품 DRAFT 백필을 시작합니다.`);
        
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const rowsToInsert = missingFinishedGoods.map((item: any) => {
          const newProductId = `PROD-${item.id}`;
          return {
            id: newProductId,
            tenant_id: item.tenant_id || 'default',
            name: item.name || '',
            price: item.price !== undefined && item.price !== null ? String(item.price) : '0',
            description: item.description || '',
            category: item.category || '',
            status: 'DRAFT',
            inventory_item_id: item.id,
            uuid: item.uuid || null,
            is_estimate_price: 0,
            is_coupon_excludable: 0,
            created_at: nowStr,
            updated_at: nowStr,
            updated_by: 'system_backfill'
          };
        });

        await insertRows('products', rowsToInsert);
        console.log(`✓ 기존 완제품 ${missingFinishedGoods.length}건 백필 완료.`);
      } else {
        console.log('✓ 모든 기존 완제품이 이미 상품 테이블에 연동되어 있습니다.');
      }
    } else {
      console.log('✓ 재고 대장에 등록된 완제품이 존재하지 않습니다.');
    }
  } catch (err: any) {
    console.error('⚠️ 기존 완제품 상품 백필 중 에러:', err.message);
  }

  // 58. 전사 통합 작업 감사 로그 테이블 (crm_audit_logs) 신설
  try {
    await safeCreateTable('전사 통합 작업 감사 로그', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator', type: 'TEXT', notNull: true },
      { name: 'source', type: 'TEXT', notNull: true },
      { name: 'action_type', type: 'TEXT', notNull: true },
      { name: 'doc_type', type: 'TEXT', notNull: true },
      { name: 'doc_id', type: 'TEXT' },
      { name: 'doc_title', type: 'TEXT', notNull: true },
      { name: 'detail_json', type: 'TEXT' }
    ], {
      tableName: 'crm_audit_logs',
      uniqueKeyColumns: ['id'],
      duplicateAction: 'skip'
    });
    console.log('✓ 전사 통합 작업 감사 로그 테이블 신설 완료.');
  } catch (err: any) {
    console.error('⚠️ 전사 통합 감사 로그 테이블 생성 에러:', err.message);
  }

  // 59. 테넌트 인증서 관리 테이블 (tenant_certificates)
  try {
    await safeCreateTable('테넌트 인증서', [
      { name: 'id', type: 'INTEGER', notNull: true },
      { name: 'cert_name', type: 'TEXT', notNull: true },
      { name: 'cert_number', type: 'TEXT' },
      { name: 'issuer', type: 'TEXT' },
      { name: 'issue_date', type: 'TEXT' },
      { name: 'expire_date', type: 'TEXT' },
      { name: 'renewal_status', type: 'TEXT' },
      { name: 'attachment_file_id', type: 'TEXT' },
      { name: 'folder_id', type: 'INTEGER' }
    ], { tableName: 'tenant_certificates', uniqueKeyColumns: ['id'] });
    console.log('✓ 테넌트 인증서 테이블 신설 완료.');
  } catch (err: any) {
    console.error('⚠️ 테넌트 인증서 테이블 생성 에러:', err.message);
  }

  // 60. 테넌트 특허 및 지식재산권 관리 테이블 (tenant_patents)
  try {
    await safeCreateTable('테넌트 특허 및 지식재산권', [
      { name: 'id', type: 'INTEGER', notNull: true },
      { name: 'ip_type', type: 'TEXT', notNull: true },
      { name: 'title', type: 'TEXT', notNull: true },
      { name: 'application_number', type: 'TEXT' },
      { name: 'registration_number', type: 'TEXT' },
      { name: 'applicant', type: 'TEXT' },
      { name: 'registration_date', type: 'TEXT' },
      { name: 'next_annual_fee_date', type: 'TEXT' },
      { name: 'current_annual_year', type: 'INTEGER' },
      { name: 'annual_fee_amount', type: 'INTEGER' },
      { name: 'attachment_file_id', type: 'TEXT' },
      { name: 'folder_id', type: 'INTEGER' }
    ], { tableName: 'tenant_patents', uniqueKeyColumns: ['id'] });
    console.log('✓ 테넌트 특허 및 지식재산권 테이블 신설 완료.');
  } catch (err: any) {
    console.error('⚠️ 테넌트 특허 테이블 생성 에러:', err.message);
  }

  // 61. AI 폴더 태스크 & 캘린더 할 일 테이블 (cert_patent_tasks)
  try {
    await safeCreateTable('AI 인증특허 태스크', [
      { name: 'id', type: 'INTEGER', notNull: true },
      { name: 'folder_id', type: 'INTEGER' },
      { name: 'task_type', type: 'TEXT', notNull: true },
      { name: 'title', type: 'TEXT', notNull: true },
      { name: 'description', type: 'TEXT' },
      { name: 'due_date', type: 'TEXT' },
      { name: 'status', type: 'TEXT', notNull: true },
      { name: 'assigned_to', type: 'TEXT' },
      { name: 'assigned_by', type: 'TEXT' },
      { name: 'assigned_at', type: 'TEXT' },
      { name: 'source_file_id', type: 'TEXT' },
      { name: 'source_file_name', type: 'TEXT' },
      { name: 'ai_analysis_result', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' }
    ], { tableName: 'cert_patent_tasks', uniqueKeyColumns: ['id'] });
    console.log('✓ AI 인증특허 태스크 테이블 신설 완료.');
  } catch (err: any) {
    console.error('⚠️ AI 인증특허 태스크 테이블 생성 에러:', err.message);
  }

  // 🏢 사업장/현장 마스터 테이블 생성 (7종 감사 컬럼 주입)
  try {
    await safeCreateTable('사업장/현장 마스터', [
      { name: 'id', type: 'INTEGER', notNull: true },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'address', type: 'TEXT' },
      { name: 'latitude', type: 'REAL' },
      { name: 'longitude', type: 'REAL' },
      { name: 'radius_meters', type: 'INTEGER' },
      { name: 'is_main', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' }
    ], { tableName: 'crm_workplaces', uniqueKeyColumns: ['id'] });
    console.log('✓ 사업장 마스터 테이블 신설 완료.');
  } catch (err: any) {
    console.error('⚠️ 사업장 마스터 테이블 생성 에러:', err.message);
  }

  // 👔 임직원 마스터 테이블 소속 사업장 컬럼 보정
  try {
    await safeCreateTable('임직원 마스터', [
      { name: 'id', type: 'INTEGER', notNull: true },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'email', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'department', type: 'TEXT' },
      { name: 'position', type: 'TEXT' },
      { name: 'workplace_id', type: 'INTEGER' },
      { name: 'workplace_name', type: 'TEXT' },
      { name: 'role', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' }
    ], { tableName: 'crm_employees', uniqueKeyColumns: ['id'] });
    console.log('✓ 임직원 마스터 소속 사업장 컬럼 보정 완료.');
  } catch (err: any) {
    console.error('⚠️ 임직원 마스터 컬럼 보정 에러:', err.message);
  }

  console.log('Database setup complete.');
}

