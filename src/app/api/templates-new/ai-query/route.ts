export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, insertRows, executeSQL, listTables } from '../../../../../egdesk-helpers';
import fs from 'fs';
import { fetchGeminiWithFallback } from '@/lib/gemini-fallback';

// HTML에서 Mustache 변수 목록 추출 헬퍼
function extractMustacheFields(html: string): string[] {
  const fieldsSet = new Set<string>();
  const matches = html.matchAll(/\{\{([^}]+)\}\}/g);
  for (const match of matches) {
    const field = match[1].trim();
    if (field && !field.startsWith('/') && !field.startsWith('#') && !field.startsWith('^')) {
      fieldsSet.add(field);
    }
  }
  return Array.from(fieldsSet);
}

/**
 * GET: 발급 키워드 및 템플릿 변수를 대조하여 AI 쿼리 생성 후 실행 결과 반환
 * URL 파라미터: templateId, keyword
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('templateId');
    const keyword = searchParams.get('keyword') || '';

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'templateId가 누락되었습니다.' }, { status: 400 });
    }

    if (!keyword.trim()) {
      return NextResponse.json({ success: false, error: '검색 키워드를 입력해 주십시오.' }, { status: 400 });
    }

    // 1. 템플릿 정보 로드 (HTML 내용 획득)
    const res = await executeSQL(`SELECT * FROM crm_web_templates WHERE id = ${templateId} AND deleted_at IS NULL`);
    const rows = res.rows || [];
    const template = rows[0] || null;

    if (!template) {
      return NextResponse.json({ success: false, error: '해당 템플릿을 찾을 수 없거나 삭제되었습니다.' }, { status: 404 });
    }

    const htmlContent = template.html_content || '';
    const targetFields = extractMustacheFields(htmlContent);

    // 2. DB 내 모든 테이블 및 컬럼 구조 스캔 (listTables 이용)
    const tablesRes = await listTables();
    const tablesList = (tablesRes.tables || [])
      .filter((t: any) => {
        const name = t.tableName;
        return (
          !name.startsWith('sqlite_') &&
          !name.startsWith('import_') &&
          !name.startsWith('sync_') &&
          !name.startsWith('user_data_') &&
          name !== 'user_tables' &&
          !name.endsWith('_logs') &&
          !name.endsWith('_log') &&
          !name.endsWith('_histories') &&
          !name.endsWith('_history')
        );
      })
      .map((t: any) => ({ name: t.tableName }));

    const dbSchemas: Record<string, string[]> = {};
    for (const t of tablesList as any[]) {
      const name = t.name;
      const schemaRes = await executeSQL(`PRAGMA table_info("${name}");`);
      const schemaInfo = schemaRes.rows || [];
      dbSchemas[name] = schemaInfo.map((col: any) => col.name);
    }

    // 3. Gemini API 로드 설정
    let apiKey: string | null = null;
    let selectedModel = 'gemini-3.5-flash';
    try {
      const keyRes = await executeSQL(`SELECT value FROM system_settings WHERE key = 'google_ai_api_key'`);
      const settingsKeyRow = keyRes.rows?.[0] as any;
      apiKey = settingsKeyRow ? settingsKeyRow.value : null;

      const modelRes = await executeSQL(`SELECT value FROM system_settings WHERE key = 'google_ai_model'`);
      const settingsModelRow = modelRes.rows?.[0] as any;
      if (settingsModelRow && settingsModelRow.value) {
        selectedModel = settingsModelRow.value;
      } else {
        selectedModel = 'gemini-2.5-flash';
      }
    } catch (dbErr) {
      console.error('API 설정 로드 실패:', dbErr);
      selectedModel = 'gemini-2.5-flash';
    }

    if (!apiKey) {
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    }

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Google AI API Key가 설정되지 않았습니다. [시스템 설정]에서 구글 API 키를 먼저 입력하십시오.' 
      }, { status: 500 });
    }

    // 4. AI에게 최적의 SQLite3 SELECT 쿼리 조립 요청
    const schemaContext = Object.keys(dbSchemas).map(tName => {
      return `Table "${tName}" columns: [${dbSchemas[tName].join(', ')}]`;
    }).join('\n');

    const systemPrompt = `
You are an expert SQLite3 database administrator and SQL developer.
Your task is to build a single, valid, and efficient SELECT query to fetch data that best populates the required mustache variables of a form template, based on the provided database schema and the user's search keyword.

Mustache variables to populate: [${targetFields.join(', ')}]
User's search keyword: "${keyword}" (This is usually a staff name, a customer name, an ID, etc. You must use this in the WHERE clause).

Available Database Schema:
${schemaContext}

Guidelines for SQL Generation:
1. Generate exactly ONE valid SELECT query. Do not include markdown formatting (like \`\`\`sql), explanations, or comments. Output ONLY the raw SQL string.
2. Select appropriate table(s) and use LEFT JOIN if the required columns are spread across multiple tables.
3. For example, if the keyword is a staff name like "홍길동" and we need to fill variables related to staff (like department, joined_date, staff_role, etc.), you should query "rnd_staffs" (or other personnel tables), LEFT JOIN "crm_operators" or "crm_operator_profiles" to match "name" or "user_id", and filter by the keyword.
4. Try to alias columns so they match the mustache variable names if possible (e.g., SELECT s.staff_role AS position, p.department ...). If not possible, the code will handle mapping, but clean aliasing is highly preferred.
5. In SQLite, CAST may be needed to join an INTEGER column with a TEXT column (e.g. \`ON CAST(o.id AS TEXT) = p.operator_id\`).
6. DO NOT include "deleted_at" or "deleted_by" columns or terms anywhere in the query (WHERE, SELECT, etc.). The system will handle soft-delete filtering in the backend. If you include 'delete' related terms, the API server will reject the query due to security filters.
7. Safely escape the search keyword in the query as a string literal: e.g. \`WHERE o.name = '홍길동'\` (or using LIKE if appropriate, but exact match is preferred for names/IDs).
8. Ensure the query returns exactly one row or uses \`LIMIT 1\`.
9. IMPORTANT: The "crm_estimate_items" table has a "spec" column which stores a JSON string. To access individual properties of this JSON column, you MUST use SQLite's json_extract() function.
   - Example properties inside "spec" JSON:
     * $.cost_breakdown.material_cost (자재비)
     * $.cost_breakdown.processing_cost (외주가공/작업비)
     * $.cost_breakdown.overhead_cost (일반관리비)
     * $.cost_breakdown.other_expenses (기타경비)
     * $.cost_breakdown.delivery_expense (운반비)
     * $.settlement_type (정산방식 - e.g., '1식', '시간당', '단가당')
     * $.delivery_date (품목별 납기일 - e.g., '2026-07-30')
   - Example query syntax: \`json_extract(spec, '$.cost_breakdown.material_cost') AS material_cost\`
`;

    console.log("Calling Gemini for dynamic SQL query generation...");
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API 호출에 실패했습니다: ${errText}`);
    }

    const aiData = await response.json();
    let generatedSql = (aiData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

    // AI 토큰 사용량 로깅
    try {
      const prompt_tokens = aiData.usageMetadata?.promptTokenCount || 0;
      const completion_tokens = aiData.usageMetadata?.candidatesTokenCount || 0;
      const total_tokens = aiData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('ai_token_usage_logs', [{
        id: logId,
        model: selectedModel || 'gemini-3.5-flash',
        purpose: 'TEMPLATE_AI_QUERY',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }

    // 마크다운 가드 지우기 (백틱 가드가 포함되는 경우가 간혹 있음)
    generatedSql = generatedSql.replace(/^```sql/i, '').replace(/^```/i, '').replace(/```$/, '').trim();

    console.log("🤖 AI Generated SQL Query:\n", generatedSql);

    // 5. 보안 검증 (DML 방지 가드)
    const upperSql = generatedSql.toUpperCase();
    const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'REPLACE', 'TRUNCATE'];
    const hasForbidden = forbiddenKeywords.some(keyword => {
      // 키워드가 독립된 토큰으로 쓰였는지 검사 (예: updated_at 내의 update는 허용하도록 공백/경계 매칭)
      const regex = new RegExp(`\\b${keyword}\\b`);
      return regex.test(upperSql);
    });

    if (hasForbidden) {
      return NextResponse.json({ 
        success: false, 
        error: '보안 검증 실패: AI가 유효하지 않거나 위험한 쓰기형 DML SQL문을 작성했습니다.',
        sql: generatedSql 
      }, { status: 400 });
    }

    // 6. DB 직접 쿼리 실행
    let recordData: any = null;
    try {
      const sqlRes = await executeSQL(generatedSql);
      const rows = sqlRes.rows || [];
      // 소프트 삭제된 레코드 필터링
      recordData = rows.find((r: any) => !r.deleted_at) || null;
    } catch (sqlErr: any) {
      console.error("SQL Execution error:", sqlErr);
      return NextResponse.json({
        success: false,
        error: `AI가 작성한 SQL 실행에 실패했습니다. (SQL 에러: ${sqlErr.message})`,
        sql: generatedSql
      }, { status: 500 });
    }

    if (!recordData) {
      return NextResponse.json({
        success: false,
        error: `"${keyword}"(으)로 등록된 데이터를 찾을 수 없습니다. 철자를 확인하거나 DB에 해당 명칭의 데이터가 실존하는지 확인해 주십시오.`,
        sql: generatedSql
      });
    }

    return NextResponse.json({
      success: true,
      data: recordData,
      sql: generatedSql,
      detectedFields: targetFields
    });

  } catch (err: any) {
    console.error('AI Query Route Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
