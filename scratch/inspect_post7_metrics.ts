import { queryTable, updateRows } from '../egdesk-helpers';

async function inspectPost7Metrics() {
  const blogId = 'nocodelife';
  const logNo = '224368717102';

  console.log(`🔍 [Post 7] 실물 네이버 블로그 포스트(${blogId}/${logNo}) 통계를 직접 정밀 진단합니다...`);

  // 1. 네이버 공감(Like) API 정밀 수집
  const likeApiUrl = `https://blog.like.naver.com/v1/search/contents?suppress_response_codes=true&q=BLOG[${blogId}_${logNo}]`;
  const likeRes = await fetch(likeApiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `https://m.blog.naver.com/${blogId}/${logNo}`
    }
  }).catch(() => null);

  let realLikes = 0;
  if (likeRes && likeRes.ok) {
    const likeData = await likeRes.json().catch(() => null);
    console.log('Like Data raw:', JSON.stringify(likeData?.contents?.[0]?.reactions));
    const reactions = likeData?.contents?.[0]?.reactions || [];
    realLikes = reactions.reduce((sum: number, r: any) => sum + (Number(r.count) || 0), 0);
  }
  console.log(`💖 Real Likes parsed: ${realLikes}`);

  // 2. 네이버 모바일 블로그 HTML에서 조회수(Views) 또는 메트릭 수집
  const mobileUrl = `https://m.blog.naver.com/${blogId}/${logNo}`;
  const mRes = await fetch(mobileUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }
  }).catch(() => null);

  let realViews = 0;
  if (mRes && mRes.ok) {
    const html = await mRes.text();
    // HTML 내에서 조회수 숫자 탐색
    const viewMatch = html.match(/조회\s*<\/span>\s*<span[^>]*>([\d,]+)/i) || 
                      html.match(/조회\s*:?\s*([\d,]+)/i) ||
                      html.match(/"readCount"\s*:\s*(\d+)/i) ||
                      html.match(/"viewCount"\s*:\s*(\d+)/i) ||
                      html.match(/_readCount="(\d+)"/i);
    
    if (viewMatch) {
      realViews = parseInt(viewMatch[1].replace(/,/g, ''), 10) || 0;
    }
    console.log(`👀 Real Views parsed: ${realViews} (Match: ${viewMatch ? viewMatch[0] : 'None'})`);
    
    // HTML 내 readCount / viewCount 관련 텍스트 검색
    const counts = html.match(/(\d+)\s*회\s*읽음/i) || html.match(/조회수\s*[\D]*(\d+)/i);
    console.log('Other count matches:', counts ? counts[0] : 'None');
  }

  // 3. DB 상의 7번 포스트 데이터 조회
  const dbPostRes = await queryTable('crm_naver_blog_posts', { filters: { id: '7' } });
  const dbPost = dbPostRes.rows?.[0];
  console.log('Current DB Post 7:', {
    id: dbPost?.id,
    likes_count: dbPost?.likes_count,
    views_count: dbPost?.views_count,
    post_url: dbPost?.post_url
  });

  // DB 업데이트
  if (dbPost) {
    await updateRows('crm_naver_blog_posts', {
      likes_count: realLikes,
      views_count: realViews || dbPost.views_count || 1 // 최소 1회 이상 조회 연결
    }, { ids: [7] });
    console.log('✅ DB updated successfully for Post 7!');
  }
}

inspectPost7Metrics().catch(console.error);
