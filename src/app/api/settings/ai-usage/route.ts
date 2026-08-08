export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { executeSQL } from '@/../egdesk-helpers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'today'; // 'today', 'week', 'month', 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '15', 10));
    const offset = (page - 1) * limit;

    // 한국 표준시 (KST, UTC+9) 기준 날짜 계산
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);

    // 오늘 날짜 YYYY-MM-DD
    const todayStr = kstNow.toISOString().split('T')[0];

    let whereClause = "";
    const params: any[] = [];

    if (range === 'today') {
      whereClause = " WHERE created_at >= ? ";
      params.push(`${todayStr} 00:00:00`);
    } else if (range === 'week') {
      const d = new Date(kstNow.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekStr = d.toISOString().split('T')[0];
      whereClause = " WHERE created_at >= ? ";
      params.push(`${weekStr} 00:00:00`);
    } else if (range === 'month') {
      const d = new Date(kstNow.getTime() - 30 * 24 * 60 * 60 * 1000);
      const monthStr = d.toISOString().split('T')[0];
      whereClause = " WHERE created_at >= ? ";
      params.push(`${monthStr} 00:00:00`);
    }
    // range === 'all' 인 경우 WHERE 절 생략

    // 1. 기간별 요약 통계 SQL
    const summarySql = `
      SELECT 
        COUNT(*) as api_calls,
        COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as total_completion_tokens,
        COALESCE(SUM(total_tokens), 0) as total_tokens
      FROM ai_token_usage_logs
      ${whereClause}
    `;

    const summaryRes = await executeSQL(summarySql, params);
    const summaryRow = summaryRes.rows?.[0] || {};
    const summary = {
      api_calls: Number(summaryRow.api_calls || 0),
      total_prompt_tokens: Number(summaryRow.total_prompt_tokens || 0),
      total_completion_tokens: Number(summaryRow.total_completion_tokens || 0),
      total_tokens: Number(summaryRow.total_tokens || 0)
    };

    // 2. 사용 목적(Purpose)별 통계 SQL (기간 필터 적용)
    const purposeSql = `
      SELECT 
        COALESCE(purpose, 'unknown') as purpose,
        COUNT(*) as calls,
        COALESCE(SUM(total_tokens), 0) as tokens
      FROM ai_token_usage_logs
      ${whereClause}
      GROUP BY purpose
      ORDER BY tokens DESC
    `;
    const purposeRes = await executeSQL(purposeSql, params);
    const purposes = (purposeRes.rows || []).map((r: any) => ({
      purpose: r.purpose,
      calls: Number(r.calls || 0),
      tokens: Number(r.tokens || 0)
    }));

    // 3. 모델(Model)별 통계 SQL (기간 필터 적용)
    const modelSql = `
      SELECT 
        COALESCE(model, 'unknown') as model,
        COUNT(*) as calls,
        COALESCE(SUM(total_tokens), 0) as tokens
      FROM ai_token_usage_logs
      ${whereClause}
      GROUP BY model
      ORDER BY tokens DESC
    `;
    const modelRes = await executeSQL(modelSql, params);
    const models = (modelRes.rows || []).map((r: any) => ({
      model: r.model,
      calls: Number(r.calls || 0),
      tokens: Number(r.tokens || 0)
    }));

    // 4. 기간별 감사록 로그 전체 건수 및 최근 페이지네이션 로그 SQL
    const totalCountSql = `SELECT COUNT(*) as cnt FROM ai_token_usage_logs ${whereClause}`;
    const countRes = await executeSQL(totalCountSql, params);
    const totalLogs = Number(countRes.rows?.[0]?.cnt || 0);

    const logsSql = `
      SELECT id, model, purpose, prompt_tokens, completion_tokens, total_tokens, user_name, menu_path, created_at
      FROM ai_token_usage_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const logsRes = await executeSQL(logsSql, [...params, limit, offset]);
    const recentLogs = (logsRes.rows || []).map((l: any) => ({
      id: String(l.id),
      model: l.model,
      purpose: l.purpose,
      prompt_tokens: Number(l.prompt_tokens || 0),
      completion_tokens: Number(l.completion_tokens || 0),
      total_tokens: Number(l.total_tokens || 0),
      user_name: l.user_name || '시스템',
      menu_path: l.menu_path || '백그라운드',
      created_at: l.created_at
    }));

    return NextResponse.json({
      success: true,
      summary,
      purposes,
      models,
      recentLogs,
      pagination: {
        total: totalLogs,
        page,
        limit,
        totalPages: Math.ceil(totalLogs / limit)
      }
    });

  } catch (error: any) {
    console.error('AI 토큰 통계 API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message || '토큰 통계를 분석하는 도중 서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}
