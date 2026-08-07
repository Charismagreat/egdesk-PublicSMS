export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../../egdesk-helpers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // DRAFT, SCHEDULED, POSTED, FAILED 필터
    
    const filters: any = { deleted_at: null };
    if (status) {
      filters.status = status;
    }

    // 1. 소프트 삭제되지 않은 인스타그램 게시글 목록 조회
    const postsRes = await queryTable('crm_instagram_posts', { filters });
    const posts = postsRes.rows || [];

    // 2. 연관된 상품 정보 매핑을 위해 전체 상품 조회 (소프트 삭제된 상품 제외)
    const productsRes = await queryTable('products', { filters: { deleted_at: null } });
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
    console.error('인스타그램 게시글 리스트 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Meta Graph API 2-Step Container Content Publishing 공식 미디어 발행 헬퍼
async function publishToMetaInstagramGraphApi(imageUrl: string, caption: string) {
  try {
    const settingsRes = await queryTable('instagram_marketing_settings', { limit: 100 });
    const existingRows = settingsRes?.rows || [];
    const activeRows = existingRows.filter((r: any) => !r.deleted_at);
    const sorted = [...(activeRows.length > 0 ? activeRows : existingRows)].sort((a: any, b: any) => Number(b.id) - Number(a.id));
    const settings = sorted.find((r: any) => r.access_token || r.ig_user_id || r.instagram_username) || sorted[0];

    const accessToken = settings?.access_token?.trim() || '';
    let igUserId = settings?.ig_user_id?.trim() || '';

    if (!accessToken || !igUserId) {
      return { 
        success: false, 
        error: 'Meta Graph API 연동 정보(Graph Access Token 및 Business User ID)가 설정되어 있지 않습니다. 설정 탭에서 정보를 저장해 주세요.' 
      };
    }

    // Facebook Page ID가 전달된 경우, 연결된 진짜 Instagram Business Account ID (1784...) 자동 탐색 헬퍼
    try {
      const pageLookupRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}?fields=instagram_business_account&access_token=${accessToken}`);
      if (pageLookupRes.ok) {
        const pageData = await pageLookupRes.json();
        if (pageData.instagram_business_account?.id) {
          console.log(`💡 [Meta API Helper] 입력된 ID(${igUserId})에서 인스타그램 비즈니스 ID(${pageData.instagram_business_account.id}) 자동 감지!`);
          igUserId = pageData.instagram_business_account.id;
        }
      }
    } catch (e) {
      // Ignore lookup fallback
    }

    // Meta API는 인스타그램 서버에서 다운로드 가능한 공개 HTTP/HTTPS 이미지 URL을 필수 요구합니다.
    let validPublicImageUrl = imageUrl;
    if (!validPublicImageUrl || validPublicImageUrl.startsWith('data:image') || validPublicImageUrl.startsWith('blob:')) {
      validPublicImageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
    }

    console.log(`📡 [Meta API Step 1] IG User ID (${igUserId}) 미디어 컨테이너 생성을 요청합니다...`);
    const containerParams = new URLSearchParams();
    containerParams.append('image_url', validPublicImageUrl);
    containerParams.append('caption', caption);
    containerParams.append('access_token', accessToken);

    const step1Res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerParams.toString()
    });

    const step1Data = await step1Res.json();
    if (!step1Res.ok || !step1Data.id) {
      const errDetail = step1Data.error?.message || JSON.stringify(step1Data);
      const errType = step1Data.error?.type || 'OAuthException';
      const errCode = step1Data.error?.code || step1Res.status;
      console.warn(`⚠️ [Meta API Step 1] 미디어 컨테이너 생성 실패: [${errCode}] ${errDetail}`);
      return { success: false, error: `Meta API 미디어 업로드 실패 [오류코드 ${errCode}]: ${errDetail} (권한: instagram_content_publish 필요)` };
    }

    const creationId = step1Data.id;
    console.log(`✅ [Meta API Step 1 Success] creation_id 획득: ${creationId}`);

    // Step 2: Media Publish
    console.log(`📡 [Meta API Step 2] creation_id (${creationId}) 포스트 실제 발행 승인을 요청합니다...`);
    const publishParams = new URLSearchParams();
    publishParams.append('creation_id', creationId);
    publishParams.append('access_token', accessToken);

    const step2Res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishParams.toString()
    });

    const step2Data = await step2Res.json();
    if (!step2Res.ok || !step2Data.id) {
      const errDetail = step2Data.error?.message || JSON.stringify(step2Data);
      const errCode = step2Data.error?.code || step2Res.status;
      console.warn(`⚠️ [Meta API Step 2] 미디어 발행 승인 실패: ${errDetail}`);
      return { success: false, error: `Meta API 발행 승인 실패 [오류코드 ${errCode}]: ${errDetail}` };
    }

    console.log(`🎉 [Meta API Step 2 Success] 인스타그램 실제 피드 게시 성공! Media ID: ${step2Data.id}`);
    return { success: true, mediaId: step2Data.id, isSimulated: false };

  } catch (err: any) {
    console.error('❌ [Meta API Error] Meta Graph API 통신 예외:', err.message);
    return { success: false, error: err.message };
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { product_id, status, content, image_url, scheduled_at } = data;

    if (!status) {
      return NextResponse.json({ success: false, error: '상태값(status)은 필수입니다.' }, { status: 400 });
    }

    let isPosted = status === 'POSTED';
    let errorMessage: string | null = null;

    if (isPosted) {
      const pubResult = await publishToMetaInstagramGraphApi(image_url, content);
      if (!pubResult.success) {
        return NextResponse.json({ success: false, error: pubResult.error || 'Meta API 미디어 발행 실패' }, { status: 400 });
      }
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const uuidStr = 'IGP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    // 새 포스트 삽입 (감사 7종 컬럼 반영)
    const newPost = {
      id: Date.now(),
      uuid: uuidStr,
      product_id: product_id || null,
      status: isPosted ? 'POSTED' : (errorMessage ? 'FAILED' : (status || 'DRAFT')),
      content: content || '',
      image_url: image_url || '',
      scheduled_at: scheduled_at || new Date().toISOString(),
      posted_at: isPosted ? new Date().toISOString() : null,
      error_message: errorMessage,
      likes_count: 0,
      comments_count: 0,
      updated_at: nowStr,
      updated_by: 'admin',
      deleted_at: null,
      deleted_by: null,
      restored_at: null,
      restored_by: null,
    };

    await insertRows('crm_instagram_posts', [newPost]);

    return NextResponse.json({ success: true, post: newPost });
  } catch (error: any) {
    console.error('인스타그램 게시글 등록 에러:', error);
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
    const postRes = await queryTable('crm_instagram_posts', { filters: { id: String(id), deleted_at: null } });
    if (!postRes.rows || postRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    const existingPost = postRes.rows[0];
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const finalUpdates: any = {
      ...updates,
      updated_at: nowStr,
      updated_by: 'admin',
    };

    if (updates.status === 'POSTED') {
      const pubResult = await publishToMetaInstagramGraphApi(
        updates.image_url || existingPost.image_url,
        updates.content || existingPost.content
      );

      if (!pubResult.success) {
        finalUpdates.status = 'FAILED';
        finalUpdates.error_message = pubResult.error;
        await updateRows('crm_instagram_posts', finalUpdates, { filters: { id: String(id) } });
        return NextResponse.json({ success: false, error: pubResult.error }, { status: 400 });
      }

      finalUpdates.posted_at = new Date().toISOString();
      finalUpdates.error_message = null;
    }

    await updateRows('crm_instagram_posts', finalUpdates, { filters: { id: String(id) } });

    return NextResponse.json({ success: true, message: '수정 완료되었습니다.' });
  } catch (error: any) {
    console.error('인스타그램 게시글 수정 에러:', error);
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

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    // 물리 삭제 대신 소프트 삭제 적용
    await updateRows('crm_instagram_posts', {
      deleted_at: nowStr,
      deleted_by: 'admin',
    }, { filters: { id: String(id) } });

    return NextResponse.json({ success: true, message: '소프트 삭제 완료되었습니다.' });
  } catch (error: any) {
    console.error('인스타그램 게시글 삭제 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
