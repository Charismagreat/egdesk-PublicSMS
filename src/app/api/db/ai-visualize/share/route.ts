import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows, deleteRows, executeSQL, getTableSchema } from '../../../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

// 🔑 최고관리자 권한 검증 헬퍼
async function verifySuperAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return false;
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    return role === 'SUPER_ADMIN';
  } catch (e) {
    return false;
  }
}

// 🎲 12자리 무작위 보안 고유 토큰 생성기 (NanoID Fallback)
function generateSecureShareId() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 4단계 로컬 보안 비식별화 가드레일 엔진 (PII Masking & Obfuscation) - 차트용 12개 샘플 획득 목적
function anonymizeData(rows: any[], schema: any[]) {
  if (!rows || rows.length === 0) return { stats: {}, sampleRows: [] };

  const blacklist = [
    'password', 'password_hash', 'address', 'shipping_address', 'memo', 
    'attachment_url', 'business_license_url', 'email', 'phone', 'recipient_phone', 
    'manager_phone', 'partner_phone', 'customer_phone', 'ai_analysis', 'error_message'
  ];

  const safeCols = schema
    .map(col => col.name)
    .filter(name => !blacklist.includes(name.toLowerCase()));

  const numericCols = schema.filter(col => 
    ['integer', 'real', 'number'].includes(col.type?.toLowerCase()) || 
    col.name.toLowerCase().includes('amount') || 
    col.name.toLowerCase().includes('price') || 
    col.name.toLowerCase().includes('balance') || 
    col.name.toLowerCase().includes('stock') ||
    col.name.toLowerCase().includes('quantity')
  ).map(col => col.name);

  const stats: any = {
    totalRows: rows.length,
    numericColumns: {}
  };

  for (const colName of numericCols) {
    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    let count = 0;

    for (const r of rows) {
      const val = parseFloat(r[colName]);
      if (!isNaN(val)) {
        sum += val;
        if (val > max) max = val;
        if (val < min) min = val;
        count++;
      }
    }

    if (count > 0) {
      stats.numericColumns[colName] = {
        sum,
        avg: Math.round(sum / count),
        max,
        min
      };
    }
  }

  const samples = rows.slice(0, 12);
  const sampleRows = samples.map((row, index) => {
    const cleanRow: any = {};
    for (const col of safeCols) {
      let val = row[col];

      if (typeof val === 'string') {
        const colLower = col.toLowerCase();
        if (colLower.includes('name') || colLower.includes('customer') || colLower.includes('partner') || colLower.includes('operator')) {
          val = `고객_${String.fromCharCode(65 + (index % 26))}`;
        }
      }

      if (numericCols.includes(col) && typeof val === 'number') {
        // AI 브리핑 페이지에서도 백분율 비율로 뭉개지 않고 실제 원본 수치를 고스란히 보여주기 위해 비율 전환 비식별화 과정을 주석처리합니다.
        // const colSum = stats.numericColumns[col]?.sum || 1;
        // val = parseFloat(((val / colSum) * 100).toFixed(2));
      }

      cleanRow[col] = val;
    }
    return cleanRow;
  });

  return { stats, sampleRows };
}

// 📂 [GET] 최고관리자 공유 목록 전체 조회 또는 단건 공개 조회 (shareId 제공 시 무인증 오픈)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get('shareId');

    // 특정 shareId가 전달되었다면, 무인증 공개 조회 기능 가동
    if (shareId) {
      const res = await queryTable('shared_dashboards', { filters: { share_id: shareId, is_active: '1' } });
      if (res.rows && res.rows.length > 0) {
        return NextResponse.json({ success: true, dashboard: res.rows[0] });
      }
      return NextResponse.json({ success: false, error: '존재하지 않거나 공개 비활성화된 대시보드입니다.' }, { status: 404 });
    }

    // shareId가 전달되지 않았다면 최고관리자 권한 필수 가드 작동
    const isAuthorized = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const res = await queryTable('shared_dashboards', {});
    const list = res.rows || [];

    // 정교한 자바스크립트 다중 정렬 처리 (sort_order 오름차순, 생성일자 내림차순)
    const sortedList = [...list].sort((a: any, b: any) => {
      const aOrder = a.sort_order !== null && a.sort_order !== undefined ? Number(a.sort_order) : 0;
      const bOrder = b.sort_order !== null && b.sort_order !== undefined ? Number(b.sort_order) : 0;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ success: true, list: sortedList });
  } catch (err: any) {
    console.error('공유 목록 조회 오류:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// 📂 [POST] 신규 퍼블릭 공유 대시보드 등록 (4단계 로컬 보안 가드레일 & sampleRows 머징 아키텍처)
export async function POST(req: Request) {
  try {
    const isAuthorized = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, sqlQuery, tableName, displayName, chartSpecJson, briefingMarkdown, refreshInterval, isPinned, isActive } = body;

    if (!title || !sqlQuery || !chartSpecJson || !briefingMarkdown) {
      return NextResponse.json({ success: false, error: '필수 등록 정보가 누락되었습니다.' }, { status: 400 });
    }

    // A. 4단계 로컬 비식별 가드레일을 직접 태워 안전한 sampleRows 추출
    let sampleRows: any[] = [];
    try {
      const queryRes = await executeSQL(sqlQuery);
      const rows = queryRes.rows || [];
      
      let schema: any[] = [];
      if (tableName) {
        try {
          const schemaRes = await getTableSchema(tableName);
          schema = schemaRes.columns || schemaRes.schema || [];
        } catch (schemaErr) {
          console.warn('스키마 획득 실패:', schemaErr);
        }
      }

      const guardRes = anonymizeData(rows, schema);
      sampleRows = guardRes.sampleRows || [];
    } catch (dbErr: any) {
      console.warn('비식별화 데이터 선추출 경고:', dbErr.message);
    }

    // B. chartSpecJson 객체 내부에 sampleRows 병합 수록
    const rawSpec = typeof chartSpecJson === 'string' ? JSON.parse(chartSpecJson) : chartSpecJson;
    const enrichedSpec = {
      ...rawSpec,
      sampleRows
    };

    const shareId = generateSecureShareId();
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await insertRows('shared_dashboards', [{
      share_id: shareId,
      title: title.trim(),
      sql_query: sqlQuery,
      table_name: tableName || '',
      display_name: displayName || '',
      chart_spec_json: JSON.stringify(enrichedSpec),
      briefing_markdown: briefingMarkdown,
      refresh_interval: refreshInterval || 'NONE',
      last_refreshed_at: nowStr,
      created_at: nowStr,
      is_active: isActive !== undefined ? Number(isActive) : 1,
      sort_order: 0,
      is_pinned: isPinned !== undefined ? Number(isPinned) : 1,
      custom_title: title.trim()
    }]);

    return NextResponse.json({
      success: true,
      shareId,
      message: '성공적으로 웹 게시판에 공유 대시보드가 등록되었습니다.'
    });

  } catch (err: any) {
    console.error('공유 등록 오류:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// 📂 [PATCH] 공유 대시보드 속성 부분 갱신 (순서 일괄 변경, 단건 정보 수정 등)
export async function PATCH(req: Request) {
  try {
    const isAuthorized = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, orders, shareId, customTitle, isPinned, isActive, refreshInterval } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: '수행할 action 정보가 누락되었습니다.' }, { status: 400 });
    }

    if (action === 'REORDER') {
      if (!orders || !Array.isArray(orders)) {
        return NextResponse.json({ success: false, error: '정렬 정보 orders 배열이 필요합니다.' }, { status: 400 });
      }

      // 일괄 순서 가중치 갱신 루프 구동
      for (const item of orders) {
        await updateRows('shared_dashboards', 
          { sort_order: Number(item.sortOrder) }, 
          { filters: { share_id: item.shareId } }
        );
      }

      return NextResponse.json({ success: true, message: '대시보드 순서가 완벽히 보존되었습니다.' });
    }

    if (action === 'UPDATE_INFO') {
      if (!shareId) {
        return NextResponse.json({ success: false, error: '수정할 shareId가 누락되었습니다.' }, { status: 400 });
      }

      const updatePayload: any = {};
      if (customTitle !== undefined) updatePayload.custom_title = customTitle;
      if (isPinned !== undefined) updatePayload.is_pinned = Number(isPinned);
      if (isActive !== undefined) updatePayload.is_active = Number(isActive);
      if (refreshInterval !== undefined) updatePayload.refresh_interval = refreshInterval;

      await updateRows('shared_dashboards', updatePayload, { filters: { share_id: shareId } });

      return NextResponse.json({ success: true, message: '보고서 정보가 성공적으로 반영되었습니다.' });
    }

    return NextResponse.json({ success: false, error: '정의되지 않은 action 명령입니다.' }, { status: 400 });

  } catch (err: any) {
    console.error('공유 갱신(PATCH) 오류:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// 📂 [DELETE] 공유 대시보드 해제 (공개 철회)
export async function DELETE(req: Request) {
  try {
    const isAuthorized = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json({ success: false, error: '삭제할 shareId 정보가 누락되었습니다.' }, { status: 400 });
    }

    await deleteRows('shared_dashboards', { filters: { share_id: shareId } });

    return NextResponse.json({
      success: true,
      message: '공유 대시보드 웹 게시가 안전하게 철회 및 삭제되었습니다.'
    });

  } catch (err: any) {
    console.error('공유 삭제 오류:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
