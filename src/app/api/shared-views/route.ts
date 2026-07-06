import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, deleteRows, getTableSchema, executeSQL, listTables } from '../../../../egdesk-helpers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// 🔑 최고관리자 인증 획득용 헬퍼 (저장 및 삭제용)
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

// 🛡️ 영문 테이블명 및 컬럼명 SQL 인젝션 방어용 안전 정규식 검증
const SAFE_SQL_NAME_REGEX = /^[a-zA-Z0-9_]+$/;

// 📂 [GET] 데이터 공유 뷰 설정 로드 및 안전 필터링된 레코드 데이터 쿼리
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash') || '';
    const limit = Number(searchParams.get('limit')) || 2000;
    const offset = Number(searchParams.get('offset')) || 0;
    const searchKey = searchParams.get('searchKey') || '';
    const searchValue = searchParams.get('searchValue') || '';

    if (!hash) {
      const { isAuthorized } = await verifySuperAdmin();
      if (!isAuthorized) {
        return NextResponse.json({ success: false, error: '공유 뷰 해시(hash)가 누락되었습니다.' }, { status: 400 });
      }

      const allSharedViewsRes = await executeSQL(`
        SELECT * FROM system_shared_views ORDER BY created_at DESC
      `);
      const allSharedViews = allSharedViewsRes.rows || [];

      return NextResponse.json({
        success: true,
        sharedViews: allSharedViews || []
      });
    }

    // 1. system_shared_views 테이블에서 공유 뷰 설정 조회
    const sharedViewRes = await queryTable('system_shared_views', { filters: { share_hash: hash } });
    const sharedView = sharedViewRes.rows && sharedViewRes.rows.length > 0 ? sharedViewRes.rows[0] : null;

    if (!sharedView) {
      return NextResponse.json({ success: false, error: '존재하지 않거나 삭제된 공유 링크입니다.' }, { status: 404 });
    }

    const {
      source_table,
      friendly_table_name,
      column_mappings,
      default_sort_column,
      default_sort_direction,
      allow_csv_download
    } = sharedView;

    // 2. 물리 테이블 명칭 검증 (안전 검사)
    if (!SAFE_SQL_NAME_REGEX.test(source_table)) {
      return NextResponse.json({ success: false, error: '안전하지 않은 테이블 이름 구조입니다.' }, { status: 400 });
    }

    // 3. 컬럼 매핑 JSON 파싱
    let mappings: any[] = [];
    try {
      mappings = JSON.parse(column_mappings);
    } catch (e) {
      return NextResponse.json({ success: false, error: '컬럼 매핑 데이터 포맷이 올바르지 않습니다.' }, { status: 500 });
    }

    // 4. 노출 컬럼 식별 및 보안 가드레일 (visible: true인 항목만 추출)
    const visibleColumns = mappings.filter((col: any) => col.visible === true);
    if (visibleColumns.length === 0) {
      return NextResponse.json({ success: false, error: '공유할 수 있는 노출형 컬럼이 지정되지 않았습니다.' }, { status: 400 });
    }

    // 컬럼명 안전 검증 및 더블 쿼트 감싸기
    const safeSelectedCols = visibleColumns
      .map((col: any) => col.physical)
      .filter((colName: string) => SAFE_SQL_NAME_REGEX.test(colName))
      .map((colName: string) => `"${colName}"`);

    if (safeSelectedCols.length === 0) {
      return NextResponse.json({ success: false, error: '사용 가능한 안전한 노출 컬럼이 없습니다.' }, { status: 400 });
    }

    // 5. 동적 쿼리 조립 (SELECT [노출 컬럼들] FROM [원본 테이블])
    let baseQuery = `SELECT ${safeSelectedCols.join(', ')} FROM "${source_table}"`;
    let countQuery = `SELECT COUNT(*) as cnt FROM "${source_table}"`;
    
    // 조건절 조립용 배열
    const conditions: string[] = [];

    // 원본 테이블에 소프트 삭제 필드(deleted_at)가 있는지 체크하여, 존재하면 null 필터 적용 (보안 유지)
    const tableInfo = await getTableSchema(source_table);
    const hasDeletedAt = (tableInfo.columns || []).some((col: any) => col.name === 'deleted_at');
    if (hasDeletedAt) {
      conditions.push(`"deleted_at" IS NULL`);
    }

    // 검색 필터 적용 (노출되기로 결정된 컬럼 중 검색 키가 유효할 때만 적용)
    if (searchKey && searchValue) {
      const isSearchColVisible = visibleColumns.some((col: any) => col.physical === searchKey);
      if (isSearchColVisible && SAFE_SQL_NAME_REGEX.test(searchKey)) {
        const escapedVal = searchValue.replace(/'/g, "''");
        conditions.push(`"${searchKey}" LIKE '%${escapedVal}%'`);
      }
    }

    // WHERE 조건 조합
    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    baseQuery += whereClause;
    countQuery += whereClause;

    // 5.1. 다단계 정렬 조건 조립 (column_mappings 내의 sortOrder 및 sortDirection 사용)
    const sortConditions: string[] = [];
    
    // sortOrder가 정의되어 있고 정렬 방향이 유효한 것들만 필터링 후 정렬
    const sortedMappings = [...visibleColumns]
      .filter((col: any) => col.sortOrder && col.sortOrder > 0 && (col.sortDirection === 'ASC' || col.sortDirection === 'DESC'))
      .sort((a: any, b: any) => Number(a.sortOrder) - Number(b.sortOrder));

    if (sortedMappings.length > 0) {
      for (const col of sortedMappings) {
        if (SAFE_SQL_NAME_REGEX.test(col.physical)) {
          sortConditions.push(`"${col.physical}" ${col.sortDirection}`);
        }
      }
    }

    if (sortConditions.length > 0) {
      baseQuery += ` ORDER BY ${sortConditions.join(', ')}`;
    } else {
      // 레거시/기본 정렬 호환성 유지
      let sortBy = default_sort_column || '';
      let sortDir = (default_sort_direction || 'DESC').toUpperCase();
      if (sortDir !== 'ASC' && sortDir !== 'DESC') sortDir = 'DESC';

      const isSortColVisible = visibleColumns.some((col: any) => col.physical === sortBy);
      if (sortBy && isSortColVisible && SAFE_SQL_NAME_REGEX.test(sortBy)) {
        baseQuery += ` ORDER BY "${sortBy}" ${sortDir}`;
      } else {
        const firstCol = visibleColumns[0].physical;
        if (SAFE_SQL_NAME_REGEX.test(firstCol)) {
          baseQuery += ` ORDER BY "${firstCol}" DESC`;
        }
      }
    }

    // 페이징 한계 주입
    baseQuery += ` LIMIT ${limit} OFFSET ${offset}`;

    // 6. DB 실행 및 반환
    const rowsRes = await executeSQL(baseQuery);
    const rows = rowsRes.rows || [];
    const countRes = await executeSQL(countQuery);
    const total = countRes.rows?.[0]?.cnt || 0;

    // 보안 강화: 브라우저에 비공개 맵핑 정보는 일절 누출하지 않고, visible = true 인 한글 명칭 및 정렬 필터하여 반환
    const cleanMappings = visibleColumns.map((col: any) => ({
      physical: col.physical,
      friendly: col.friendly || col.physical,
      sortOrder: col.sortOrder || 0,
      sortDirection: col.sortDirection || 'NONE'
    }));

    return NextResponse.json({
      success: true,
      friendlyTableName: friendly_table_name,
      allowCsvDownload: allow_csv_download === 1,
      columnMappings: cleanMappings,
      rows: rows || [],
      total,
      limit,
      offset
    });

  } catch (error: any) {
    console.error("GET Shared View API Error:", error);
    return NextResponse.json({ success: false, error: '데이터를 가져오는 중 서버 에러가 발생했습니다.' }, { status: 500 });
  }
}

// 📥 [POST] 최고관리자가 새로운 한글 친화형 커스텀 공유 테이블 뷰를 등록/갱신
export async function POST(request: Request) {
  try {
    // 최고 관리자 인증 검증
    const { isAuthorized, operatorName } = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const {
      sourceTable,
      friendlyTableName,
      columnMappings,
      defaultSortColumn,
      defaultSortDirection,
      allowCsvDownload
    } = await request.json();

    // 필수 유효성 검사
    if (!sourceTable || !friendlyTableName || !columnMappings || !Array.isArray(columnMappings)) {
      return NextResponse.json({ success: false, error: '필수 파라미터가 유효하지 않거나 누락되었습니다.' }, { status: 400 });
    }

    if (!SAFE_SQL_NAME_REGEX.test(sourceTable)) {
      return NextResponse.json({ success: false, error: '안전하지 않은 원본 테이블 이름입니다.' }, { status: 400 });
    }

    // 원본 테이블 실제 존재 여부 검사
    const tableCheckRes = await listTables();
    const tables = tableCheckRes.tables || [];
    const tableCheck = tables.some((t: any) => t.tableName === sourceTable);

    if (!tableCheck) {
      return NextResponse.json({ success: false, error: `물리 테이블 '${sourceTable}'이 존재하지 않습니다.` }, { status: 400 });
    }

    // 맵핑 내역의 개별 컬럼 명칭 유효성 추가 검사
    for (const mapping of columnMappings) {
      if (!mapping.physical || !SAFE_SQL_NAME_REGEX.test(mapping.physical)) {
        return NextResponse.json({ success: false, error: `안전하지 않은 영문 컬럼 명칭이 포함되어 있습니다: ${mapping.physical}` }, { status: 400 });
      }
    }

    // share_hash 생성 (32글자 랜덤 난수 해시)
    const shareHash = crypto.randomBytes(16).toString('hex');
    // view_id 생성
    const viewId = `SV-${Date.now()}-${crypto.randomInt(1000, 9999)}`;

    // 매핑 데이터 stringify
    const columnMappingsStr = JSON.stringify(columnMappings);

    // system_shared_views에 데이터 적재
    await insertRows('system_shared_views', [{
      view_id: viewId,
      share_hash: shareHash,
      source_table: sourceTable,
      friendly_table_name: friendlyTableName,
      column_mappings: columnMappingsStr,
      default_sort_column: defaultSortColumn || null,
      default_sort_direction: defaultSortDirection || 'DESC',
      allow_csv_download: allowCsvDownload ? 1 : 0
    }]);

    return NextResponse.json({
      success: true,
      message: '데이터 공유 뷰가 성공적으로 생성되었습니다.',
      viewId,
      shareHash,
      friendlyTableName
    });

  } catch (error: any) {
    console.error("POST Shared View API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✕ [DELETE] 최고관리자가 특정 데이터 공유 뷰를 폐쇄/삭제
export async function DELETE(request: Request) {
  try {
    const { isAuthorized, operatorName } = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const viewId = searchParams.get('viewId') || '';

    if (!viewId) {
      return NextResponse.json({ success: false, error: '삭제할 공유 뷰 ID(viewId)가 누락되었습니다.' }, { status: 400 });
    }

    // 공유 뷰 존재 여부 확인
    const viewCheckRes = await queryTable('system_shared_views', { filters: { view_id: viewId } });
    const viewCheck = viewCheckRes.rows && viewCheckRes.rows.length > 0 ? viewCheckRes.rows[0] : null;
    if (!viewCheck) {
      return NextResponse.json({ success: false, error: '존재하지 않거나 이미 폐쇄된 공유 뷰입니다.' }, { status: 400 });
    }

    // system_shared_views에서 레코드 삭제
    await deleteRows('system_shared_views', { filters: { view_id: viewId } });

    return NextResponse.json({
      success: true,
      message: `데이터 공유 뷰 '${viewCheck.friendly_table_name}'(ID: ${viewId})가 최고관리자(${operatorName})에 의해 성공적으로 폐쇄되었습니다.`
    });

  } catch (error: any) {
    console.error("DELETE Shared View API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
