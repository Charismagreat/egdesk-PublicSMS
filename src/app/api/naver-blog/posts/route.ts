export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows } from '../../../../../egdesk-helpers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // DRAFT, SCHEDULED, POSTED, FAILED 필터
    
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
    
    // 상품 ID를 키로 하는 Map 생성
    const productMap = new Map();
    products.forEach((prod: any) => {
      productMap.set(prod.id, prod);
    });

    // 게시글 목록에 상품 정보 결합
    const mergedPosts = posts.map((post: any) => {
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

    // scheduled_at을 기준으로 정렬 (예약 시간이 가까운 것/최신 것 순)
    mergedPosts.sort((a: any, b: any) => {
      const dateA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const dateB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return dateB - dateA; // 내림차순 정렬
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
      finalUpdates.views_count = Math.floor(Math.random() * 80) + 20; // 20~100 사이의 가상 조회수 부여
      finalUpdates.likes_count = Math.floor(Math.random() * 15) + 3;  // 3~18 사이의 가상 공감수 부여
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
