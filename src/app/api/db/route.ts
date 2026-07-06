import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';
import { TABLES } from '../../../../egdesk.config';
import {
  listTables,
  getTableSchema,
  queryTable,
  executeSQL,
  insertRows,
  updateRows,
  deleteRows,
  deleteTable,
  aggregateTable
} from '../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

// 🔑 최고관리자 및 작업자 정보 동시 획득용 헬퍼
async function verifySuperAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return { isAuthorized: false, operatorName: 'Unknown' };
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    
    return {
      isAuthorized: role === 'SUPER_ADMIN',
      operatorName: name
    };
  } catch (e) {
    return { isAuthorized: false, operatorName: 'Unknown' };
  }
}

// 📂 [GET] 테이블 목록, 특정 테이블 스키마 DDL, 레코드 페이지네이션 조회 (egdesk-helpers 통일 적용)
export async function GET(request: Request) {
  try {
    const { isAuthorized, operatorName } = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const tableName = searchParams.get('tableName') || '';

    // 1. 모든 물리 테이블 목록 조회
    if (action === 'list') {
      const tablesRes = await listTables();
      const tablesList = tablesRes.tables || [];

      const tablesWithCount = [];
      for (const t of tablesList) {
        const name = t.tableName || t.name;
        
        try {
          const schemaInfo = await getTableSchema(name);
          const columns = schemaInfo.schema || [];
          const hasDeletedCol = columns.some((col: any) => col.name === 'deleted_at');
          
          // 소프트 삭제된 테이블인 경우 일반 감시 카운트는 deleted_at IS NULL인 항목만 계산
          const countCol = columns[0]?.name || 'id';
          const countRes = await aggregateTable(name, countCol, 'COUNT');
          let cnt = countRes.value || 0;
          
          if (cnt > 0 && hasDeletedCol) {
            const queryRes = await queryTable(name, { limit: 10000 });
            const rows = queryRes.rows || [];
            const nonDeletedRows = rows.filter((r: any) => r.deleted_at === null || r.deleted_at === undefined || r.deleted_at === '');
            cnt = nonDeletedRows.length;
          }
          
          // TABLES 설정을 기반으로 동적으로 displayName 매핑 (설정 파일 누락 시 물리명 폴백 적용)
          const foundTable = Object.values(TABLES).find((tbl: any) => tbl.name === name);
          const displayName = foundTable ? (foundTable as any).displayName : ((t as any).displayName || name);

          tablesWithCount.push({
            name,
            displayName,
            count: cnt
          });
        } catch (err) {
          tablesWithCount.push({
            name,
            displayName: t.displayName || name,
            count: 'Error'
          });
        }
      }

      return NextResponse.json({ success: true, tables: tablesWithCount });
    }

    // 2. 특정 테이블 컬럼 스키마 및 DDL 조회
    if (action === 'schema') {
      if (!tableName) {
        return NextResponse.json({ success: false, error: '테이블 이름(tableName)이 누락되었습니다.' }, { status: 400 });
      }

      const schemaInfo = await getTableSchema(tableName);
      const columnsDdl = (schemaInfo.schema || []).map((col: any) => {
        let typeStr = col.type || 'TEXT';
        if (col.notNull) typeStr += ' NOT NULL';
        if (col.defaultValue !== undefined && col.defaultValue !== null) {
          typeStr += ` DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`;
        }
        return `  ${col.name} ${typeStr}`;
      });
      const ddl = `CREATE TABLE ${tableName} (\n${columnsDdl.join(',\n')}\n);`;

      const mappedSchema = (schemaInfo.schema || []).map((col: any, idx: number) => ({
        cid: idx,
        name: col.name,
        type: col.type || 'TEXT',
        notnull: col.notNull ? 1 : 0,
        dflt_value: col.defaultValue !== undefined ? col.defaultValue : null,
        pk: col.name === 'id' ? 1 : 0
      }));

      return NextResponse.json({ 
        success: true, 
        tableName, 
        schema: mappedSchema,
        ddl 
      });
    }

    // 3. 특정 테이블의 원시 레코드 데이터 쿼리 (검색, 소프트 삭제 가드 연동)
    if (action === 'query') {
      if (!tableName) {
        return NextResponse.json({ success: false, error: '테이블 이름(tableName)이 누락되었습니다.' }, { status: 400 });
      }

      const limit = Number(searchParams.get('limit')) || 50;
      const offset = Number(searchParams.get('offset')) || 0;
      const searchKey = searchParams.get('searchKey') || '';
      const searchValue = searchParams.get('searchValue') || '';
      const showDeleted = searchParams.get('showDeleted') === 'true'; // 휴지통 보기 토글 스위치 대응

      const schemaInfo = await getTableSchema(tableName);
      const columns = schemaInfo.schema || [];
      const hasDeletedCol = columns.some((col: any) => col.name === 'deleted_at');
      const pkCol = columns.find((col: any) => col.pk === 1 || col.pk === true || col.name === 'id')?.name || 'id';

      // SQL 문자열 상의 금지어(DELETE 등) 에러 및 SQL Injection 우회를 위해 queryTable로 넉넉하게 가져와서 JS 레벨 필터링 처리
      const queryRes = await queryTable(tableName, {
        limit: 10000, // 최대 1만건까지 넉넉하게 조회
        orderBy: pkCol,
        orderDirection: 'DESC'
      });
      let rows = queryRes.rows || [];

      // 소프트 삭제 필터링 적용
      if (hasDeletedCol) {
        if (showDeleted) {
          // 휴지통 모드: 삭제된 데이터만 (deleted_at이 있는 항목)
          rows = rows.filter((r: any) => r.deleted_at !== null && r.deleted_at !== undefined && r.deleted_at !== '');
        } else {
          // 일반 모드: 삭제되지 않은 데이터만 (deleted_at이 없거나 빈 항목)
          rows = rows.filter((r: any) => r.deleted_at === null || r.deleted_at === undefined || r.deleted_at === '');
        }
      }

      // 검색 조건 필터링 적용 (searchValue가 존재할 때)
      if (searchValue) {
        const cleanVal = searchValue.toLowerCase();
        if (searchKey) {
          rows = rows.filter((r: any) => String(r[searchKey] || '').toLowerCase().includes(cleanVal));
        } else {
          // 전체 컬럼 대상 통합 검색 (OR 결합 형태)
          rows = rows.filter((r: any) => 
            columns.some((col: any) => String(r[col.name] || '').toLowerCase().includes(cleanVal))
          );
        }
      }

      // 페이지네이션 가공
      const total = rows.length;
      const paginatedRows = rows.slice(offset, offset + limit);

      return NextResponse.json({ 
        success: true, 
        tableName, 
        rows: paginatedRows,
        total,
        limit,
        offset
      });
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 요청(action)입니다.' }, { status: 400 });
  } catch (error: any) {
    console.error("GET DB Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 📥 [POST] 원시 SQL 실행 및 레코드 삽입 (INSERT) (egdesk-helpers 통일 적용)
export async function POST(request: Request) {
  try {
    const { isAuthorized, operatorName } = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const { action, query, tableName, rows } = await request.json();

    // 1. 커스텀 원시 SQL 직접 실행 (플레이그라운드 샌드박스)
    if (action === 'execute') {
      if (!query) {
        return NextResponse.json({ success: false, error: '실행할 SQL 쿼리가 없습니다.' }, { status: 400 });
      }

      // 파괴적인 악성 작업 시도 사전 방지 (Safety Check)
      const normalizedQuery = query.trim().toUpperCase();
      if (normalizedQuery.startsWith('DROP DATABASE')) {
        return NextResponse.json({ success: false, error: '보안 정책상 DATABASE 전체 파괴는 차단됩니다.' }, { status: 400 });
      }

      const res = await executeSQL(query);
      
      // SELECT 쿼리인 경우 데이터 로우 반환
      if (normalizedQuery.startsWith('SELECT') || normalizedQuery.startsWith('PRAGMA')) {
        return NextResponse.json({ success: true, rows: res.rows || [] });
      } else {
        // CUD 쿼리인 경우 영향받은 로우 수 반환
        return NextResponse.json({ 
          success: true, 
          rows: [],
          affectedRows: res.affectedRows || 0,
          lastInsertRowid: res.lastInsertRowid || null
        });
      }
    }

    // 2. 특정 테이블의 레코드 삽입 (INSERT) - 감사용 고유 UUID 및 생성일 자동 부여
    if (action === 'insert') {
      if (!tableName || !rows || !Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ success: false, error: '테이블 이름 또는 삽입 데이터가 유효하지 않습니다.' }, { status: 400 });
      }

      const schemaInfo = await getTableSchema(tableName);
      const columns = schemaInfo.schema || [];
      const hasUuid = columns.some((col: any) => col.name === 'uuid');
      const hasCreatedAt = columns.some((col: any) => col.name === 'created_at');

      const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      
      const preparedRows = rows.map(row => {
        const newRow = { ...row };
        // UUIDv4 동적 자동 주입
        if (hasUuid && (!newRow.uuid || newRow.uuid === '')) {
          newRow.uuid = crypto.randomUUID();
        }
        // created_at 자동 주입
        if (hasCreatedAt && (!newRow.created_at || newRow.created_at === '')) {
          newRow.created_at = now;
        }
        return newRow;
      });

      await insertRows(tableName, preparedRows);
      return NextResponse.json({ success: true, message: `${rows.length}건의 레코드가 감사추적 UUID와 함께 주입되었습니다.` });
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 요청(action)입니다.' }, { status: 400 });
  } catch (error: any) {
    console.error("POST DB Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✏️ [PUT] 기존 레코드 갱신 (UPDATE) / 소프트 삭제 레코드 복원 (RESTORE) (egdesk-helpers 통일 적용)
export async function PUT(request: Request) {
  try {
    const { isAuthorized, operatorName } = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const { action, tableName, rows, id } = await request.json();

    // 1. 소프트 삭제 레코드 복원 액션 (RESTORE)
    if (action === 'restore') {
      if (!tableName || !id) {
        return NextResponse.json({ success: false, error: '테이블 명칭 혹은 복구할 레코드 고유 ID가 무효합니다.' }, { status: 400 });
      }

      const schemaInfo = await getTableSchema(tableName);
      const columns = schemaInfo.schema || [];
      const hasRestored = columns.some((col: any) => col.name === 'restored_at');
      const pkCol = columns.find((col: any) => col.pk === 1 || col.pk === true || col.name === 'id')?.name || 'id';

      const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

      if (hasRestored) {
        await updateRows(tableName, {
          deleted_at: null,
          deleted_by: null,
          restored_at: now,
          restored_by: operatorName
        }, { filters: { [pkCol]: String(id) } });
      } else {
        await updateRows(tableName, {
          deleted_at: null
        }, { filters: { [pkCol]: String(id) } });
      }

      return NextResponse.json({ 
        success: true, 
        message: `물리 테이블 [${tableName}]의 레코드(ID ${id})가 최고관리자(${operatorName})에 의해 성공적으로 복구되었습니다.` 
      });
    }

    // 2. 일반 레코드 데이터 수정 (UPDATE) - 수정 이력 및 최종 수정자 낙인 찍기
    if (!tableName || !rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: '갱신 데이터 및 대상 테이블이 불분명합니다.' }, { status: 400 });
    }

    const schemaInfo = await getTableSchema(tableName);
    const columns = schemaInfo.schema || [];
    const hasUpdatedAt = columns.some((col: any) => col.name === 'updated_at');
    const hasUpdatedBy = columns.some((col: any) => col.name === 'updated_by');
    const pkCol = columns.find((col: any) => col.pk === 1 || col.pk === true || col.name === 'id')?.name || 'id';

    const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    for (const row of rows) {
      const pkVal = row[pkCol];
      if (pkVal === undefined) continue;

      const updateData = { ...row };
      delete updateData[pkCol]; // PK 컬럼 제거

      // 감사용 수정 이력 강제 갱신
      if (hasUpdatedAt) updateData.updated_at = now;
      if (hasUpdatedBy) updateData.updated_by = operatorName;

      await updateRows(tableName, updateData, { filters: { [pkCol]: String(pkVal) } });
    }

    return NextResponse.json({ success: true, message: `${rows.length}건의 데이터가 성공적으로 갱신되었으며, 작업자(${operatorName}) 감사 이력이 영구 박제되었습니다.` });

  } catch (error: any) {
    console.error("PUT DB Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✕ [DELETE] 특정 레코드 삭제 (Soft/Hard) 및 테이블 완전 삭제 (DROP) (egdesk-helpers 통일 적용)
export async function DELETE(request: Request) {
  try {
    const { isAuthorized, operatorName } = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'deleteRows';
    const tableName = searchParams.get('tableName') || '';

    // 1. 특정 데이터 행 삭제 (감사 컬럼 유무 파악 -> Soft Delete / Hard Delete 자동 조율)
    if (action === 'deleteRows') {
      const idsParam = searchParams.get('ids') || '';
      if (!tableName || !idsParam) {
        return NextResponse.json({ success: false, error: '대상 테이블 혹은 삭제할 레코드 ID 목록이 누락되었습니다.' }, { status: 400 });
      }

      const ids = idsParam.split(',');
      if (ids.length === 0) {
        return NextResponse.json({ success: false, error: '삭제할 고유 기본키(ID) 리스트가 무효합니다.' }, { status: 400 });
      }

      const schemaInfo = await getTableSchema(tableName);
      const columns = schemaInfo.schema || [];
      const hasDeletedAt = columns.some((col: any) => col.name === 'deleted_at');
      const hasDeletedBy = columns.some((col: any) => col.name === 'deleted_by');
      const pkCol = columns.find((col: any) => col.pk === 1 || col.pk === true || col.name === 'id')?.name || 'id';

      const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

      if (hasDeletedAt) {
        // 소프트 딜리트 (Soft Delete) 모드로 자동 전향 실행
        for (const id of ids) {
          const deleteData: Record<string, any> = { deleted_at: now };
          if (hasDeletedBy) {
            deleteData.deleted_by = operatorName;
          }
          await updateRows(tableName, deleteData, { filters: { [pkCol]: String(id) } });
        }
        
        return NextResponse.json({ 
          success: true, 
          message: `${ids.length}건의 레코드가 영구 소멸되지 않고, 감사추적(삭제자 ${operatorName})과 함께 안전하게 소프트 삭제(휴지통 보관)로 자동 전환되었습니다.` 
        });
      } else {
        // 일반 시스템 테이블: Hard Delete 작동
        for (const id of ids) {
          await deleteRows(tableName, { filters: { [pkCol]: String(id) } });
        }
        return NextResponse.json({ success: true, message: `${ids.length}건의 레코드가 데이터베이스에서 완전 소멸(Hard Delete)되었습니다.` });
      }
    }

    // 2. 테이블 완전 drop 가드
    if (action === 'dropTable') {
      if (!tableName) {
        return NextResponse.json({ success: false, error: '삭제할 대상 테이블 이름이 지정되지 않았습니다.' }, { status: 400 });
      }

      // 중요 마스터 테이블 보호막 (Safety Check)
      const protectedTables = ['crm_operators', 'crm_expenses', 'crm_categories', 'crm_tags'];
      if (protectedTables.includes(tableName)) {
        return NextResponse.json({ 
          success: false, 
          error: '보안 정책 경고: 시스템 마스터 핵심 테이블은 안전을 위해 완전히 DROP할 수 없습니다. 레코드 데이터만 삭제하거나 쿼리를 개별 편집하십시오.' 
        }, { status: 400 });
      }

      await deleteTable(tableName);
      return NextResponse.json({ success: true, message: `물리 테이블 [${tableName}]이 데이터베이스에서 완전히 삭제(DROP)되었습니다.` });
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 요청(action)입니다.' }, { status: 400 });
  } catch (error: any) {
    console.error("DELETE DB Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
