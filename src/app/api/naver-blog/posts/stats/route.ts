export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, updateRows } from '../../../../../../egdesk-helpers';

// RPA 데몬 및 통계 수집기로부터 방문수(조회수) 일괄 배치 업데이트 API
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { stats } = body; // Array of { logNo?: string, post_url?: string, views: number }

    if (!Array.isArray(stats) || stats.length === 0) {
      return NextResponse.json({ success: false, error: '유효한 통계 데이터가 제공되지 않았습니다.' }, { status: 400 });
    }

    const postsRes = await queryTable('crm_naver_blog_posts', {});
    const posts = postsRes.rows || [];
    let updatedCount = 0;

    for (const item of stats) {
      const targetViews = Number(item.views) || 0;
      let matchedPost: any = null;

      if (item.logNo) {
        matchedPost = posts.find((p: any) => p.post_url && p.post_url.includes(item.logNo));
      } else if (item.post_url) {
        matchedPost = posts.find((p: any) => p.post_url === item.post_url);
      }

      if (matchedPost && matchedPost.views_count !== targetViews) {
        await updateRows('crm_naver_blog_posts', { views_count: targetViews }, { filters: { id: String(matchedPost.id) } });
        updatedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${updatedCount}개 포스팅의 실시간 방문수(조회수) 동기화가 완료되었습니다.`,
      updatedCount 
    });
  } catch (error: any) {
    console.error('❌ [Posts Stats API Error]:', error);
    return NextResponse.json({ success: false, error: error.message || '서버 내부 오류' }, { status: 500 });
  }
}
