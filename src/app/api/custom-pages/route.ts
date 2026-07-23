import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { 
  queryTable, 
  insertRows, 
  updateRows, 
  callAiCaller 
} from '../../../../egdesk-helpers';
import * as XLSX from 'xlsx';

// 💡 JWT 토큰 복호화 기반 테넌트 ID 해석 헬퍼
async function resolveTenantId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return 'default';
    const payload = decodeJwt(token);
    return (payload.tenant_id as string) || 'default';
  } catch {
    return 'default';
  }
}

// 💡 JWT 토큰 복호화 기반 현재 유저명 해석 헬퍼
async function resolveCurrentUser(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return 'system';
    const payload = decodeJwt(token);
    return (payload.username as string) || 'system';
  } catch {
    return 'system';
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'get_pages';
    const tenantId = await resolveTenantId();

    // 1. 개설된 맞춤형 페이지 목록 로드
    if (action === 'get_pages') {
      const res = await queryTable('crm_custom_pages', {
        filters: { tenant_id: tenantId }
      });
      let pages = res.rows || [];
      pages = pages.filter((p: any) => !p.deleted_at);
      // 최신 생성 순 정렬
      pages.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
      return NextResponse.json({ success: true, pages });
    }

    // 2. 특정 페이지 상세 내역 및 가공 데이터 로드
    if (action === 'get_page_detail') {
      const slug = searchParams.get('slug') || '';
      if (!slug) {
        return NextResponse.json({ success: false, error: '페이지 슬러그(slug)가 필요합니다.' }, { status: 400 });
      }

      // 페이지 상세 설계 정보 조회
      const pageRes = await queryTable('crm_custom_pages', {
        filters: { page_slug: slug, tenant_id: tenantId }
      });
      const pageList = pageRes.rows || [];
      const page = pageList.find((p: any) => !p.deleted_at);

      if (!page) {
        return NextResponse.json({ success: false, error: '존재하지 않거나 삭제된 맞춤형 서비스입니다.' }, { status: 404 });
      }

      // 페이지 하위 적재 데이터 전체 조회
      const dataRes = await queryTable('crm_custom_page_data', {
        filters: { page_id: page.id, tenant_id: tenantId }
      });
      let rowsList = dataRes.rows || [];
      rowsList = rowsList.filter((r: any) => !r.deleted_at);
      
      // 최신 등록 순 정렬 폴백
      rowsList.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));

      // row_data JSON 문자열을 객체로 역직렬화하여 바인딩
      const enrichedRows = rowsList.map((r: any) => {
        let rowObj = {};
        try {
          rowObj = typeof r.row_data === 'string' ? JSON.parse(r.row_data) : r.row_data;
        } catch (e) {
          rowObj = {};
        }
        return {
          id: r.id,
          created_at: r.created_at,
          created_by: r.created_by,
          ...rowObj
        };
      });

      return NextResponse.json({
        success: true,
        page: {
          id: page.id,
          page_title: page.page_title,
          page_slug: page.page_slug,
          ui_schema: typeof page.ui_schema === 'string' ? JSON.parse(page.ui_schema) : page.ui_schema,
          data_schema: typeof page.data_schema === 'string' ? JSON.parse(page.data_schema) : page.data_schema
        },
        rows: enrichedRows
      });
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 GET action입니다.' }, { status: 400 });
  } catch (err: any) {
    console.error('[CUSTOM_PAGES_GET_ERROR]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || '';
    const tenantId = await resolveTenantId();
    const currentUser = await resolveCurrentUser();
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // 1. 엑셀 업로드 기반 AI 페이지 자동 창조
    if (action === 'upload_excel') {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ success: false, error: '업로드할 엑셀 파일이 필요합니다.' }, { status: 400 });
      }

      // 버퍼 변환 및 파싱
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const excelRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (excelRows.length === 0) {
        return NextResponse.json({ success: false, error: '엑셀 데이터가 비어있거나 읽을 수 없습니다.' }, { status: 400 });
      }

      // 첫 번째 행 기반으로 헤더 목록과 샘플 데이터 추출
      const sampleHeaders = Object.keys(excelRows[0]);
      const sampleRows = excelRows.slice(0, 5);

      // AI에 던질 프롬프트 구성
      const prompt = `
당신은 기업용 맞춤형 웹페이지를 동적 설계하는 전문 소프트웨어 아키텍트입니다.
제공된 [엑셀 컬럼명]과 [샘플 데이터]를 정독하고, 이 데이터를 ERP/CRM 화면에서 관리하기 위한 1) 정밀 페이지 타이틀, 2) 영문 슬러그, 3) 입출력 UI 컴포넌트 목록(UI Schema) 및 데이터 규격(Data Schema)을 지능적으로 설계해 주십시오.

[엑셀 컬럼 목록]
${JSON.stringify(sampleHeaders)}

[샘플 데이터 5행]
${JSON.stringify(sampleRows)}

[설계 규칙]
1. page_title: 엑셀의 용도를 직관적으로 드러내는 정갈한 한글 페이지 제목 (예: "상품 원가 및 입고 단가 관리")
2. page_slug: 브라우저 URL 경로에 쓰일 영문 소문자/하이픈 조합 (예: "item-cost-management")
3. ui_schema: 화면 레이아웃과 입력 폼을 결정합니다.
   - components 배열 내에 각 엑셀 컬럼을 맵핑하십시오.
   - id: 엑셀 컬럼 헤더명을 가급적 살리거나 영문화한 소문자 식별자 (예: "col_item_name"). 
   - type: 데이터 형식에 맞춰 지정하십시오: "TEXT_INPUT", "NUMBER_INPUT", "DATE_PICKER", "SELECT_BOX".
   - label: 엑셀 컬럼명을 그대로 사용하여 유저가 알아보기 쉽게 라벨화.
   - grid_width: 화면 GRID 너비 (전체 12 중 차지할 너비, 4 또는 6 또는 12 지정).
4. data_schema: 데이터베이스 저장 시 활용할 물리 컬럼 규격 정의.
   - fields 배열 내에 각 컴포넌트 id와 데이터 타입("TEXT", "NUMBER")을 명시적으로 매핑하십시오.

반드시 아래 JSON 형식으로만 응답해 주세요. 마크다운(\`\`\`json) 기호를 절대 포함하지 마십시오.
{
  "page_title": "제목",
  "page_slug": "슬러그",
  "ui_schema": {
    "layout": "GRID",
    "components": [
      { "id": "컴포넌트ID", "type": "TEXT_INPUT", "label": "라벨", "grid_width": 6 }
    ]
  },
  "data_schema": {
    "fields": [
      { "id": "컴포넌트ID", "type": "TEXT" }
    ]
  }
}
`;

      const aiRes = await callAiCaller(prompt);
      let parsedSchema: any = null;
      try {
        if (aiRes.json && typeof aiRes.json === 'object') {
          parsedSchema = aiRes.json;
        } else {
          const cleanJsonText = aiRes.content.trim()
            .replace(/^```json\s*/i, '')
            .replace(/```$/, '')
            .trim();
          parsedSchema = JSON.parse(cleanJsonText);
        }
      } catch (e: any) {
        console.error('Schema Parsing error:', e);
        return NextResponse.json({ success: false, error: 'AI가 생성한 스키마 규격이 JSON 파싱에 실패했습니다: ' + e.message }, { status: 500 });
      }

      const pageId = `PAGE-${Date.now()}`;
      const pageSlug = parsedSchema.page_slug || `page-${Date.now()}`;
      const pageTitle = parsedSchema.page_title || file.name.replace(/\.[^/.]+$/, "");

      // 2. crm_custom_pages 마스터 저장
      await insertRows('crm_custom_pages', [{
        id: pageId,
        page_slug: pageSlug,
        page_title: pageTitle,
        ui_schema: JSON.stringify(parsedSchema.ui_schema),
        data_schema: JSON.stringify(parsedSchema.data_schema),
        tenant_id: tenantId,
        uuid: pageId,
        created_at: nowStr,
        created_by: currentUser,
        updated_at: nowStr,
        updated_by: currentUser
      }]);

      // 3. 엑셀의 모든 행을 데이터베이스 규격에 맞춰 가공 후 crm_custom_page_data에 인서트
      const fields = parsedSchema.data_schema.fields || [];
      const dataRowsToInsert: any[] = [];

      for (const [index, row] of excelRows.entries()) {
        const rowObj: Record<string, any> = {};
        
        fields.forEach((field: any, fieldIdx: number) => {
          const originalHeader = sampleHeaders[fieldIdx] || "";
          let val = row[originalHeader] !== undefined ? row[originalHeader] : "";
          if (field.type === 'NUMBER') {
            val = val !== "" ? Number(val) : 0;
            if (isNaN(val)) val = 0;
          }
          rowObj[field.id] = val;
        });

        const rowId = Date.now() + index;
        dataRowsToInsert.push({
          id: rowId,
          page_id: pageId,
          row_data: JSON.stringify(rowObj),
          tenant_id: tenantId,
          uuid: `ROW-${rowId}`,
          created_at: nowStr,
          created_by: currentUser,
          updated_at: nowStr,
          updated_by: currentUser
        });
      }

      if (dataRowsToInsert.length > 0) {
        await insertRows('crm_custom_page_data', dataRowsToInsert);
      }

      return NextResponse.json({
        success: true,
        message: '엑셀 데이터를 기반으로 맞춤형 AI 서비스가 빌드 완료되었습니다!',
        page_slug: pageSlug,
        page_title: pageTitle
      });
    }

    // 2. 동적 웹 폼 데이터 추가/수정 (save_row)
    if (action === 'save_row') {
      const body = await request.json();
      const { page_id, row_id, data } = body;

      if (!page_id || !data) {
        return NextResponse.json({ success: false, error: '페이지 ID와 데이터 객체가 필요합니다.' }, { status: 400 });
      }

      if (row_id) {
        await updateRows('crm_custom_page_data', {
          row_data: JSON.stringify(data),
          updated_at: nowStr,
          updated_by: currentUser
        }, {
          filters: { id: row_id, page_id, tenant_id: tenantId }
        });

        return NextResponse.json({ success: true, message: '기록이 수정되었습니다.' });
      } else {
        const newRowId = Date.now();
        await insertRows('crm_custom_page_data', [{
          id: newRowId,
          page_id,
          row_data: JSON.stringify(data),
          tenant_id: tenantId,
          uuid: `ROW-${newRowId}`,
          created_at: nowStr,
          created_by: currentUser,
          updated_at: nowStr,
          updated_by: currentUser
        }]);

        return NextResponse.json({ success: true, message: '새로운 기록이 등록되었습니다.' });
      }
    }

    // 3. 동적 데이터 행 삭제 (delete_row)
    if (action === 'delete_row') {
      const body = await request.json();
      const { row_id } = body;

      if (!row_id) {
        return NextResponse.json({ success: false, error: '삭제할 행 ID가 필요합니다.' }, { status: 400 });
      }

      await updateRows('crm_custom_page_data', {
        deleted_at: nowStr,
        deleted_by: currentUser,
        updated_at: nowStr,
        updated_by: currentUser
      }, {
        filters: { id: row_id, tenant_id: tenantId }
      });

      return NextResponse.json({ success: true, message: '해당 기록이 삭제되었습니다.' });
    }

    // 4. 맞춤형 페이지 대장 자체 삭제 (delete_page)
    if (action === 'delete_page') {
      const body = await request.json();
      const { page_id } = body;

      if (!page_id) {
        return NextResponse.json({ success: false, error: '삭제할 페이지 ID가 필요합니다.' }, { status: 400 });
      }

      // 페이지 마스터 소프트 삭제
      await updateRows('crm_custom_pages', {
        deleted_at: nowStr,
        deleted_by: currentUser,
        updated_at: nowStr,
        updated_by: currentUser
      }, {
        filters: { id: page_id, tenant_id: tenantId }
      });

      // 하위 종속된 데이터 레코드 전체 소프트 삭제 일괄 진행
      await updateRows('crm_custom_page_data', {
        deleted_at: nowStr,
        deleted_by: currentUser,
        updated_at: nowStr,
        updated_by: currentUser
      }, {
        filters: { page_id: page_id, tenant_id: tenantId }
      });

      return NextResponse.json({ success: true, message: '맞춤형 서비스 대장이 영구 삭제 처리되었습니다.' });
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 POST action입니다.' }, { status: 400 });
  } catch (err: any) {
    console.error('[CUSTOM_PAGES_POST_ERROR]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
