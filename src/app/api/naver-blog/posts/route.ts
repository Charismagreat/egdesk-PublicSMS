export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows } from '../../../../../egdesk-helpers';

// 네이버 공감 수치 비동기 수집 헬퍼 함수
async function syncNaverLikes(posts: any[]) {
  const targetPosts = posts.filter((p: any) => p.status === 'POSTED' && p.post_url);
  for (const post of targetPosts) {
    try {
      const urlObj = new URL(post.post_url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        const blogId = pathParts[0];
        const logNo = pathParts[1];
        const likeApiUrl = `https://blog.like.naver.com/v1/search/contents?suppress_response_codes=true&q=BLOG[${blogId}_${logNo}]`;
        const likeRes = await fetch(likeApiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': post.post_url
          }
        }).catch(() => null);

        if (likeRes && likeRes.ok) {
          const likeData = await likeRes.json().catch(() => null);
          const reactions = likeData?.contents?.[0]?.reactions || [];
          const totalLikes = reactions.reduce((sum: number, r: any) => sum + (Number(r.count) || 0), 0);

          if (totalLikes !== post.likes_count) {
            post.likes_count = totalLikes;
            await updateRows('crm_naver_blog_posts', { likes_count: totalLikes }, { ids: [post.id] }).catch(() => {});
          }
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ [Metrics Sync] Post ${post.id} metrics fetch error:`, err.message);
    }
  }
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

    // 3. 비동기 실시간 네이버 공감 수치 동기화 (응답 지연 방지 백그라운드 구동)
    syncNaverLikes(mergedPosts).catch(() => {});

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
