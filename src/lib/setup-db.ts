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
            
            // A. 기존 데이터 백업 (Read)
            const readRes = await queryTable(tableName, { limit: 500000 });
            const existingRows = readRes.rows || [];
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
      console.log('➡️ 최초 기동: 디폴트 최고관리자 계정을 생성합니다.');
      await insertRows('crm_operators', [
        {
          id: 1,
          username: 'admin',
          password_hash: password_hash,
          name: '최고관리자',
          role: 'SUPER_ADMIN',
          tenant_id: 'tenant-admin-id-1111',
          created_at: dateStr
        }
      ]);
    } else if (!adminCheck.rows[0].tenant_id || adminCheck.rows[0].tenant_id === '') {
      console.log('⚙️ 최초 기동: 구버전 최고관리자 계정의 테넌트 및 비밀번호 정보를 자동 정규화 보정합니다.');
      await updateRows('crm_operators', {
        password_hash: password_hash,
        tenant_id: 'tenant-admin-id-1111',
        role: 'SUPER_ADMIN',
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
          role: 'SUPER_ADMIN',
          tenant_id: 'tenant-guest-id-2222',
          created_at: dateStr
        }
      ]);
    } else if (!guestCheck.rows[0].tenant_id || guestCheck.rows[0].tenant_id === '') {
      console.log('⚙️ 최초 기동: 테스트 게스트 계정의 테넌트 및 비밀번호 정보를 자동 정규화 보정합니다.');
      await updateRows('crm_operators', {
        password_hash: guest_password_hash,
        tenant_id: 'tenant-guest-id-2222',
        role: 'SUPER_ADMIN',
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

  console.log('Database setup complete.');
}
