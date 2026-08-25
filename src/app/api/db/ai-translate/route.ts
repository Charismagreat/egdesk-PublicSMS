import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { callAiCaller, executeSQL } from '@/../egdesk-helpers';

export const dynamic = 'force-dynamic';

// 🔑 최고관리자 및 작업자 정보, 테넌트 식별자 동시 획득용 헬퍼
async function verifyUserRole() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    // 로컬 개발 환경이거나 쿠키가 없는 경우에도 개발자/관리자 기본 허용
    if (!token) return { isAuthorized: true, username: 'admin' };
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const username = payload.username as string || '';
    
    // 관리자/운영자/임직원 모두 자연어 SQL 번역 기능 활용 허용
    const isAuthorized = role === 'SUPER_ADMIN' || 
                         role === 'SUB_OPERATOR' || 
                         role === 'TENANT_ADMIN' || 
                         role === 'ADMIN' || 
                         role === 'OPERATOR' ||
                         role === 'EMPLOYEE' ||
                         username === 'admin' ||
                         !role;
    
    return {
      isAuthorized,
      username
    };
  } catch (e) {
    return { isAuthorized: true, username: 'admin' };
  }
}

// 📂 [POST] 자연어 질문을 정교한 SQLite SQL 쿼리로 실시간 번역 (AI Caller 탑재)
export async function POST(request: Request) {
  try {
    const { isAuthorized } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 관리자 로그인 후 이용해 주세요.' }, { status: 403 });
    }

    const { prompt, tablesSchema } = await request.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: '번역할 자연어 요청(prompt)이 누락되었습니다.' }, { status: 400 });
    }

    // 1. 실시간 SQLite 스키마 카탈로그 자동 추출
    let schemaSummary = '';
    try {
      const schemaRes = await executeSQL(`
        SELECT name, sql 
        FROM sqlite_master 
        WHERE type='table' 
          AND name NOT LIKE 'sqlite_%' 
          AND name NOT LIKE '_cf_%'
          AND name NOT LIKE 'user_data_%'
        ORDER BY name;
      `);
      if (schemaRes?.rows && schemaRes.rows.length > 0) {
        schemaSummary = schemaRes.rows
          .map((r: any) => `Table: ${r.name}\nSchema: ${r.sql?.replace(/\s+/g, ' ').trim()}`)
          .join('\n\n');
      }
    } catch (e) {}

    if (!schemaSummary) {
      schemaSummary = Array.isArray(tablesSchema) 
        ? tablesSchema.map((t: any) => `- 테이블명: "${t.name}" (실시간 레코드: ${t.count}개)`).join('\n')
        : '테이블 정보가 존재하지 않습니다.';
    }

    // 2. AI 전용 시스템 지침 (System Instruction) 구성
    const systemPrompt = `
너는 최고의 SQLite3 데이터베이스 전문가이자, 이지데스크(EGDesk) 서버의 비즈니스 데이터 어시스턴트야.
사용자가 한글 자연어로 요청한 비즈니스 데이터 요구사항을 분석하여, 데이터베이스에 바로 날릴 수 있는 **오류 없는 단 하나의 SQLite3 SELECT 쿼리**로 번역하는 것이 너의 의무야.

[중요 제약 조건]
1. 반드시 아래에 나열된 실제 테이블명과 컬럼명만을 기반으로 쿼리를 작성해야 해. 임의로 가상의 테이블이나 컬럼을 유추해내서는 절대 안 돼!
2. 비즈니스 매핑 가이드:
   - 매입처, 최대 매입처, 매입액: tax_invoices (WHERE type = 'PURCHASE' OR invoice_type = 'purchase' GROUP BY supplier_corp_name, supplier_corp_num ORDER BY SUM(total_amount) DESC LIMIT 10)
   - 매출처, 최대 매출처, 매출액: tax_invoices (WHERE type = 'SALES' OR invoice_type = 'sales' GROUP BY buyer_corp_name, buyer_corp_num ORDER BY SUM(total_amount) DESC LIMIT 10)
   - 일반 거래처/고객 정보: crm_partners (type='VENDOR' or 'CUSTOMER')
   - 일반 지출/경비: crm_expenses
   - 재고/품목: inventory_items
   - 근태/직원: crm_attendance JOIN crm_operators
3. 오직 데이터 조회(SELECT) 쿼리만 안전하게 생성해야 해.
4. 응답은 반드시 유효한 JSON 형식으로만 응답해야 해:
{
  "sql": "SELECT supplier_corp_name, SUM(total_amount) AS total_purchase_amount FROM tax_invoices WHERE type = 'PURCHASE' OR invoice_type = 'purchase' GROUP BY supplier_corp_name ORDER BY total_purchase_amount DESC LIMIT 1;"
}

[실시간 데이터베이스 스키마 카탈로그]
${schemaSummary}
`;

    // 3. 이지데스크 표준 AI Caller MCP 호출
    const callerRes = await callAiCaller(`사용자 요청: "${prompt}"`, {
      systemPrompt,
      caller: 'my-db-ai-translate',
      temperature: 0.1
    });

    const rawText = callerRes.content || '{}';
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    
    let resultSql = "";
    try {
      const parsed = JSON.parse(cleanJson);
      resultSql = parsed.sql || "";
    } catch (e) {
      const match = rawText.match(/"sql"\s*:\s*"([^"]+)"/);
      if (match) {
        resultSql = match[1];
      } else {
        resultSql = rawText;
      }
    }

    return NextResponse.json({ 
      success: true, 
      sql: resultSql 
    });

  } catch (error: any) {
    console.error('AI SQL Translate Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
