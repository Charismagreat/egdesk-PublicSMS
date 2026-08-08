export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable } from '@/../egdesk-helpers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'today'; // 'today', 'week', 'month', 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '15', 10));
    const offset = (page - 1) * limit;

    // 1. egdesk-helpers.ts의 queryTable 표준 API를 사용하여 최신 AI 토큰 로그 데이터 조회
    const logsResult = await queryTable('ai_token_usage_logs', {
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: 5000
    });

    const allRows = logsResult?.rows || [];

    // 2. 한국 표준시 (KST, UTC+9) 기준 날짜 비교 기준선 계산
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStartStr = `${nowKST.toISOString().split('T')[0]}T00:00:00`;
    const todayDateOnly = nowKST.toISOString().split('T')[0];
    
    const weekAgoDate = new Date(nowKST.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStartStr = `${weekAgoDate.toISOString().split('T')[0]}T00:00:00`;
    const weekDateOnly = weekAgoDate.toISOString().split('T')[0];

    const monthAgoDate = new Date(nowKST.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthStartStr = `${monthAgoDate.toISOString().split('T')[0]}T00:00:00`;
    const monthDateOnly = monthAgoDate.toISOString().split('T')[0];

    // 3. 선택된 기간(range)에 맞춰 메모리 정밀 필터링
    const filteredRows = allRows.filter((row: any) => {
      if (range === 'all') return true;
      const createdAt = row.created_at || '';
      if (range === 'today') {
        return createdAt >= todayStartStr || createdAt.startsWith(todayDateOnly);
      } else if (range === 'week') {
        return createdAt >= weekStartStr || createdAt.startsWith(weekDateOnly) || createdAt >= weekDateOnly;
      } else if (range === 'month') {
        return createdAt >= monthStartStr || createdAt.startsWith(monthDateOnly) || createdAt >= monthDateOnly;
      }
      return true;
    });

    // 4. 요약 통계(summary) 집계
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    const purposeMap: Record<string, { calls: number; tokens: number }> = {};
    const modelMap: Record<string, { calls: number; tokens: number }> = {};

    filteredRows.forEach((row: any) => {
      const prompt = Number(row.prompt_tokens || 0);
      const completion = Number(row.completion_tokens || 0);
      const tokens = Number(row.total_tokens || 0);
      const purpose = row.purpose || 'unknown';
      const model = row.model || 'unknown';

      totalPromptTokens += prompt;
      totalCompletionTokens += completion;
      totalTokens += tokens;

      // 목적별 집계
      if (!purposeMap[purpose]) purposeMap[purpose] = { calls: 0, tokens: 0 };
      purposeMap[purpose].calls += 1;
      purposeMap[purpose].tokens += tokens;

      // 모델별 집계
      if (!modelMap[model]) modelMap[model] = { calls: 0, tokens: 0 };
      modelMap[model].calls += 1;
      modelMap[model].tokens += tokens;
    });

    const summary = {
      api_calls: filteredRows.length,
      total_prompt_tokens: totalPromptTokens,
      total_completion_tokens: totalCompletionTokens,
      total_tokens: totalTokens
    };

    // 5. 사용 목적별 및 모델별 내림차순 정렬 가공
    const purposes = Object.entries(purposeMap).map(([purpose, stat]) => ({
      purpose,
      calls: stat.calls,
      tokens: stat.tokens
    })).sort((a, b) => b.tokens - a.tokens);

    const models = Object.entries(modelMap).map(([model, stat]) => ({
      model,
      calls: stat.calls,
      tokens: stat.tokens
    })).sort((a, b) => b.tokens - a.tokens);

    // 6. 감사록 테이블 페이지네이션 슬라이스
    const totalLogs = filteredRows.length;
    const pagedRows = filteredRows.slice(offset, offset + limit);

    const recentLogs = pagedRows.map((l: any) => ({
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
        totalPages: Math.ceil(totalLogs / limit) || 1
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
