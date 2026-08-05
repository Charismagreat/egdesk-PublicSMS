export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows } from '../../../../../egdesk-helpers';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

// 네이버 공감 & 댓글 & 방문수(조회수) 수치 실시간 수집 헬퍼 함수
async function syncNaverMetrics(posts: any[]) {
  const targetPosts = posts.filter((p: any) => p.status === 'POSTED' && p.post_url);
  
  // 네이버 세션 쿠키 수집
  let cookieHeader = '';
  try {
    const sessionPath = path.join(process.cwd(), 'scripts', 'naver_session.json');
    if (fs.existsSync(sessionPath)) {
      const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      const cookies = sessionData.cookies || [];
      cookieHeader = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
    }
  } catch (e) {}

  const todayStr = new Date().toISOString().slice(0, 10);

  for (const post of targetPosts) {
    try {
      let blogId = '';
      let logNo = '';

      // 1) blog.naver.com/blogId/logNo 및 m.blog.naver.com/blogId/logNo 패턴
      const matchPath = post.post_url.match(/blog\.naver\.com\/([^\/\?]+)\/(\d+)/i);
      if (matchPath) {
        blogId = matchPath[1];
        logNo = matchPath[2];
      } else {
        // 2) ?blogId=...&logNo=... 쿼리파라미터 패턴
        const matchQuery = post.post_url.match(/blogId=([^&]+).*logNo=(\d+)/i) || post.post_url.match(/logNo=(\d+).*blogId=([^&]+)/i);
        if (matchQuery) {
          blogId = matchQuery[1];
          logNo = matchQuery[2];
        }
      }

      if (blogId && logNo) {
        let totalLikes = post.likes_count || 0;
        let likesFetched = false;
        let totalComments = post.comments_count || 0;
        let commentsFetched = false;
        let totalViews = post.views_count || 0;
        let viewsFetched = false;

        // A. 💖 공감 수치 수집 (1순위 공식 API)
        try {
          const sympathyApiUrl = `https://blog.naver.com/api/blogs/${blogId}/posts/${logNo}/sympathy-users`;
          const sympathyRes = await fetch(sympathyApiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': `https://blog.naver.com/${blogId}/${logNo}`
            }
          }).catch(() => null);

          if (sympathyRes && sympathyRes.ok) {
            const sympathyData = await sympathyRes.json().catch(() => null);
            if (sympathyData?.isSuccess && typeof sympathyData?.result?.totalCount === 'number') {
              totalLikes = sympathyData.result.totalCount;
              likesFetched = true;
            }
          }
        } catch (e) {}

        // B. 💬 댓글 수치 수집 (모바일 PostView 정규식 스크레이퍼)
        try {
          const mUrl = `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
          const mRes = await fetch(mUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
            }
          }).catch(() => null);

          if (mRes && mRes.ok) {
            const htmlText = await mRes.text().catch(() => '');
            const cMatch = htmlText.match(/commentCount="(\d+)"/i) || htmlText.match(/commentCount='(\d+)'/i) || htmlText.match(/commentCount:\s*"?(\d+)"?/i);
            if (cMatch) {
              totalComments = parseInt(cMatch[1], 10) || 0;
              commentsFetched = true;
            }
          }
        } catch (e) {}

        // C. 👁️ 방문수(조회수) 수집 (공식 네이버 통계 API)
        try {
          const cvApiUrl = `https://blog.stat.naver.com/api/blog/article/cv?timeDimension=DATE&startDate=${todayStr}&contentId=${logNo}`;
          const cvRes = await fetch(cvApiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': `https://blog.stat.naver.com/blog/article/${logNo}/cv`,
              'Cookie': cookieHeader
            }
          }).catch(() => null);

          if (cvRes && cvRes.ok) {
            const cvData = await cvRes.json().catch(() => null);
            const rows = cvData?.result?.statDataList?.[0]?.data?.rows;
            if (rows && Array.isArray(rows.cv) && rows.cv.length > 0) {
              // 최신 조회수 Sum / Max 파싱
              const sumViews = rows.cv.reduce((acc: number, val: number) => acc + (Number(val) || 0), 0);
              totalViews = sumViews;
              viewsFetched = true;
            }
          }
        } catch (e) {}

        // DB 업데이트 감지
        const updatePayload: any = {};
        if (likesFetched && totalLikes !== post.likes_count) {
          post.likes_count = totalLikes;
          updatePayload.likes_count = totalLikes;
        }
        if (commentsFetched && totalComments !== post.comments_count) {
          post.comments_count = totalComments;
          updatePayload.comments_count = totalComments;
        }
        if (viewsFetched && totalViews !== post.views_count) {
          post.views_count = totalViews;
          updatePayload.views_count = totalViews;
        }

        if (Object.keys(updatePayload).length > 0) {
          await updateRows('crm_naver_blog_posts', updatePayload, { filters: { id: String(post.id) } }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ [Metrics Sync] Post ${post.id} metrics fetch error:`, err.message);
    }
  }
}

// 🤖 지연된 예약 포스트 감지 시 RPA 데몬 자가 복구 헬퍼
let lastWatchdogTrigger = 0;
function autoHealRpaDaemon() {
  const now = Date.now();
  if (now - lastWatchdogTrigger < 30000) return; // 30초 쿨다운
  lastWatchdogTrigger = now;
  try {
    const daemonPath = path.join(process.cwd(), 'scripts', 'naver_rpa_daemon.js');
    const nodePath = process.execPath;
    const cmd = `start "" /min "${nodePath}" "${daemonPath}"`;
    exec(cmd, { cwd: process.cwd() }, () => {});
    console.log('🤖 [RPA Watchdog] 지연된 예약 포스트 감지 ➔ RPA 자동화 데몬 자가 복구(Self-Healing) 기동 완료');
  } catch (e) {}
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    
    const filters: any = {};
    if (status) {
      filters.status = status;
    }

    // 1. 네이버 블로그 게시글 목록 조회
    const postsRes = await queryTable('crm_naver_blog_posts', { filters });
    const posts = postsRes.rows || [];

    // 2. 예약 시각이 지났는데 아직 게재 안된 포스트 존재 시 RPA 데몬 자가 복구
    const nowTime = Date.now();
    const overduePost = posts.find((p: any) => p.status === 'SCHEDULED' && p.scheduled_at && new Date(p.scheduled_at).getTime() <= nowTime + 60000);
    if (overduePost) {
      autoHealRpaDaemon();
    }

    // 2. 연관된 상품 정보 매핑을 위해 전체 상품 조회
    const productsRes = await queryTable('products', {});
    const products = productsRes.rows || [];
    
    const productMap = new Map();
    products.forEach((prod: any) => {
      productMap.set(prod.id, prod);
    });

    let mergedPosts = posts
      .filter((post: any) => !post.deleted_at)
      .map((post: any) => {
        const product = post.product_id ? productMap.get(post.product_id) : null;
        return {
          ...post,
          product: product ? {
            id: product.id,
            name: product.name,
            price: product.price,
            main_image_url: product.main_image_url,
            url: product.url,
          } : null
        };
      });

    // 3. 실시간 네이버 블로그 공감 및 댓글 수치 즉시 수집 & DB 동기화
    await syncNaverMetrics(mergedPosts).catch(() => {});

    // 4. 최근 등록순 정렬 (가장 최근에 생성/등록된 포스트가 최상단 1순위에 배치)
    mergedPosts.sort((a: any, b: any) => {
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idB - idA;
    });

    return NextResponse.json({ success: true, posts: mergedPosts });
  } catch (error: any) {
    console.error('네이버 블로그 게시글 리스트 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { product_id, status, title, content, target_keywords, image_url, sub_image_url, scheduled_at } = data;

    if (!status) {
      return NextResponse.json({ success: false, error: '상태값(status)은 필수입니다.' }, { status: 400 });
    }

    // 새 포스트 삽입
    const newPost = {
      id: Date.now(), // 타임스탬프 기반 고유 ID 생성
      product_id: product_id || null,
      status: status || 'DRAFT',
      title: title || '제목 없음',
      content: content || '',
      target_keywords: target_keywords || '',
      image_url: image_url || '',
      sub_image_url: sub_image_url || '',
      scheduled_at: scheduled_at || new Date().toISOString(),
      posted_at: status === 'POSTED' ? new Date().toISOString() : null,
      error_message: null,
      views_count: 0,
      likes_count: 0
    };

    await insertRows('crm_naver_blog_posts', [newPost]);

    return NextResponse.json({ success: true, post: newPost });
  } catch (error: any) {
    console.error('네이버 블로그 게시글 등록 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const { id, updates } = data;

    if (!id) {
      return NextResponse.json({ success: false, error: '수정할 게시글 ID가 필요합니다.' }, { status: 400 });
    }

    // 존재하는지 확인
    const postRes = await queryTable('crm_naver_blog_posts', { filters: { id: String(id) } });
    if (!postRes.rows || postRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    // 즉시 발송(POSTED)인 경우 posted_at 추가 기록
    const finalUpdates = { ...updates };
    if (updates.status === 'POSTED') {
      finalUpdates.posted_at = new Date().toISOString();
      if (finalUpdates.views_count === undefined) finalUpdates.views_count = 0;
      if (finalUpdates.likes_count === undefined) finalUpdates.likes_count = 0;
    }

    await updateRows('crm_naver_blog_posts', finalUpdates, { filters: { id: String(id) } });

    return NextResponse.json({ success: true, message: '수정 완료되었습니다.' });
  } catch (error: any) {
    console.error('네이버 블로그 게시글 수정 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 게시글 ID가 필요합니다.' }, { status: 400 });
    }

    await deleteRows('crm_naver_blog_posts', { filters: { id: String(id) } });

    return NextResponse.json({ success: true, message: '삭제 완료되었습니다.' });
  } catch (error: any) {
    console.error('네이버 블로그 게시글 삭제 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
