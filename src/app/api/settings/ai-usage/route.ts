export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, aggregateTable } from '@/../egdesk-helpers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'today'; // 'today', 'week', 'month', 'all'

    // 1. 기간 필터 설정 (Filters 객체화)
    const filters: Record<string, string> = {};
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = nowKST.toISOString().split('T')[0];
    
    if (range === 'today') {
      filters['date(created_at)'] = todayStr;
    } else if (range === 'week') {
      const oneWeekAgo = new Date(nowKST.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekStr = oneWeekAgo.toISOString().split('T')[0];
      filters['date(created_at) >='] = weekStr;
    } else if (range === 'month') {
      const oneMonthAgo = new Date(nowKST.getTime() - 30 * 24 * 60 * 60 * 1000);
      const monthStr = oneMonthAgo.toISOString().split('T')[0];
      filters['date(created_at) >='] = monthStr;
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));
    const offset = (page - 1) * limit;

    // 2. 누적 소비량 통계 집계 실행 (aggregateTable API 사용)
    const [countRes, promptRes, completionRes, totalRes, totalLogsRes] = await Promise.all([
      aggregateTable('ai_token_usage_logs', 'id', 'COUNT', { filters }),
      aggregateTable('ai_token_usage_logs', 'prompt_tokens', 'SUM', { filters }),
      aggregateTable('ai_token_usage_logs', 'completion_tokens', 'SUM', { filters }),
      aggregateTable('ai_token_usage_logs', 'total_tokens', 'SUM', { filters }),
      aggregateTable('ai_token_usage_logs', 'id', 'COUNT'), // 감사록 총 데이터 수 (필터 없음)
    ]);

    const summary = {
      api_calls: Number(countRes?.value || 0),
      total_prompt_tokens: Number(promptRes?.value || 0),
      total_completion_tokens: Number(completionRes?.value || 0),
      total_tokens: Number(totalRes?.value || 0)
    };

    const totalLogs = Number(totalLogsRes?.value || 0);

    // 3. 사용 목적(Purpose)별 통계 집계 실행 (queryTable에서 limit 적용 후 가공 처리)
    // GROUP BY 대신 전체 데이터를 안전하게 뽑아 JS단에서 Reduce 집계 처리하여 완벽하고 확실히 반환합니다.
    const allLogsResult = await queryTable('ai_token_usage_logs', { filters, limit: 1000 });
    const allLogs = allLogsResult?.rows || [];

    const purposeMap: Record<string, { calls: number; tokens: number }> = {};
    const modelMap: Record<string, { calls: number; tokens: number }> = {};

    allLogs.forEach((log: any) => {
      const purpose = log.purpose || 'unknown';
      const model = log.model || 'unknown';
      const tokens = Number(log.total_tokens || 0);

      // Purpose 집계
      if (!purposeMap[purpose]) purposeMap[purpose] = { calls: 0, tokens: 0 };
      purposeMap[purpose].calls += 1;
      purposeMap[purpose].tokens += tokens;

      // Model 집계
      if (!modelMap[model]) modelMap[model] = { calls: 0, tokens: 0 };
      modelMap[model].calls += 1;
      modelMap[model].tokens += tokens;
    });

    const purposeResult = Object.entries(purposeMap).map(([purpose, stat]) => ({
      purpose,
      calls: stat.calls,
      tokens: stat.tokens
    })).sort((a, b) => b.tokens - a.tokens);

    const modelResult = Object.entries(modelMap).map(([model, stat]) => ({
      model,
      calls: stat.calls,
      tokens: stat.tokens
    })).sort((a, b) => b.tokens - a.tokens);

    // 5. 최근 토큰 트랜잭션 페이지네이션 조회
    const recentLogsResult = await queryTable('ai_token_usage_logs', {
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit,
      offset
    });

    const logsResult = recentLogsResult?.rows || [];

    return NextResponse.json({
      success: true,
      summary,
      purposes: purposeResult,
      models: modelResult,
      recentLogs: logsResult.map((l: any) => ({
        id: l.id,
        model: l.model,
        purpose: l.purpose,
        prompt_tokens: l.prompt_tokens,
        completion_tokens: l.completion_tokens,
        total_tokens: l.total_tokens,
        user_name: l.user_name || '시스템',
        menu_path: l.menu_path || '백그라운드',
        created_at: l.created_at
      })),
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
