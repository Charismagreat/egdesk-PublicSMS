export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';
import { exec } from 'child_process';
import path from 'path';

// RPA 발행 데몬 백그라운드 자동 기동 헬퍼 (publish-rpa 경유로 싱글톤 락 준수)
async function triggerRpaDaemon(requestUrl?: string) {
  try {
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4002';
    if (requestUrl) {
      try {
        const u = new URL(requestUrl);
        baseUrl = `${u.protocol}//${u.host}`;
      } catch (e) {}
    }
    await fetch(`${baseUrl}/api/naver-blog/publish-rpa`, { method: 'POST' });
  } catch (err: any) {
    console.error('❌ [Scheduler] RPA 데몬 트리거 실패:', err.message);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetProductIdParam = searchParams.get('productId');
    const targetProductIdsParam = searchParams.get('productIds'); // 다중 선택된 상품 ID들 ("PROD-1,PROD-2")

    // 0. 예약 시각이 지난 포스트 탐색 및 RPA 자동 기동
    const allPostsRes = await queryTable('crm_naver_blog_posts', { limit: 10000 });
    const nowIso = new Date().toISOString();
    const pendingPosts = (allPostsRes.rows || []).filter(
      (p: any) => p.status === 'SCHEDULED' && p.scheduled_at && p.scheduled_at <= nowIso
    );
    if (pendingPosts.length > 0) {
      console.log(`⏰ [Scheduler] 발행 시각이 경과한 예약 포스트 ${pendingPosts.length}건 감지! RPA 데몬을 기동합니다.`);
      triggerRpaDaemon(req.url);
    }

    // 1. 네이버 블로그 설정 조회
    const settingsRes = await queryTable('naver_blog_marketing_settings', { filters: { id: '1' } });
    const settings = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0] : null;

    if (!settings) {
      return NextResponse.json({ success: false, error: '설정 테이블이 초기화되지 않았습니다.' }, { status: 400 });
    }

    if (Number(settings.is_autopilot) !== 1) {
      if (pendingPosts.length > 0) {
        return NextResponse.json({
          success: true,
          triggered: true,
          message: `오토파일럿은 OFF 상태이지만, 발행 시각이 도래한 예약 포스트 ${pendingPosts.length}건에 대해 RPA 발행 데몬을 실행했습니다.`
        });
      }
      return NextResponse.json({ 
        success: true, 
        triggered: false, 
        message: '현재 오토파일럿 모드가 비활성화 상태입니다. 상단 스위치를 ON으로 전환 후 즉시 구동해 주세요.' 
      });
    }

    // 2. 사용자가 선택한 단일/다중 상품 파라미터 체크
    let targetProduct: any = null;

    if (targetProductIdsParam) {
      const idsArr = targetProductIdsParam.split(',').map(s => s.trim()).filter(Boolean);
      if (idsArr.length > 0) {
        // 선택된 상품 풀(Pool) 중에서 픽업 (아직 포스팅 안 된 상품 우선, 또는 무작위 픽업)
        const poolProductsRes = await queryTable('products', { limit: 10000 });
        const poolProducts = (poolProductsRes.rows || []).filter((p: any) => !p.deleted_at && idsArr.includes(String(p.id)));

        if (poolProducts.length > 0) {
          const postsRes = await queryTable('crm_naver_blog_posts', { limit: 10000 });
          const posts = postsRes.rows || [];
          const postedProductIds = new Set(posts.map((post: any) => post.product_id).filter(Boolean));

          targetProduct = poolProducts.find((prod: any) => !postedProductIds.has(prod.id));
          if (!targetProduct) {
            targetProduct = poolProducts[Math.floor(Math.random() * poolProducts.length)];
          }
        }
      }
    }

    if (!targetProduct && targetProductIdParam) {
      try {
        const singleRes = await queryTable('products', { filters: { id: targetProductIdParam } });
        if (singleRes.rows && singleRes.rows.length > 0) {
          targetProduct = singleRes.rows[0];
        }
      } catch (e: any) {
        console.warn('핀포인트 상품 조회 실패, 전체 스캔 폴백:', e.message);
      }
    }

    // 3. 선택 상품 파라미터가 없거나 핀포인트 조회 실패 시 전체 상품 목록에서 자동 선정
    if (!targetProduct) {
      const productsRes = await queryTable('products', { limit: 10000 });
      const allProducts = (productsRes.rows || []).filter((p: any) => !p.deleted_at);

      if (allProducts.length === 0) {
        return NextResponse.json({ 
          success: true, 
          triggered: false, 
          message: '오토파일럿 대상 상품이 없습니다. 먼저 상품을 선택/등록해주세요.' 
        });
      }

      const postsRes = await queryTable('crm_naver_blog_posts', { limit: 10000 });
      const posts = postsRes.rows || [];
      const postedProductIds = new Set(posts.map((post: any) => post.product_id).filter(Boolean));

      targetProduct = allProducts.find((prod: any) => !postedProductIds.has(prod.id));
      if (!targetProduct) {
        targetProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
      }
    }

    // 4. 상품 기반 고품질 AI 오토파일럿 블로그 원고 실시간 집필
    const selectedTone = settings.tone_style || '솔직리뷰형';
    const productName = targetProduct.name;
    const priceText = targetProduct.price ? `${Number(targetProduct.price).toLocaleString()}원` : '합리적인 가격대';
    const descriptionText = targetProduct.description || '최고의 선택과 만족감을 선사하는 웰메이드 가전 제품';
    const brandName = targetProduct.brand || '인기 브랜드';
    
    // 오토파일럿 전용 자동 가상 속성 매핑 (Product Spec-to-Keyword) 키워드 3개 선정
    let targetKeywords = `${productName} 추천, ${productName} 솔직후기, ${brandName} 가전`;
    let title = '';
    let content = '';

    if (selectedTone === '정보제공형') {
오늘은 최근 인스타그램이나 커뮤니티에서 정말 핫하게 떠오르고 있는 품절 대란 주인공, [${productName}] 을 데려왔습니다!
제가 직접 내돈내산으로 구매해 약 3주간 꼼꼼하게 실사용해보고 적는 100% 리얼 후기예요. 💸

일단 처음에 [${priceText}] 대의 가격을 보고 '과연 돈값을 할까?' 싶었는데, 박스를 뜯어보고 직접 써보는 순간 그런 걱정이 싹 사라졌답니다.

■ 실제로 느껴본 솔직한 장점
- 디자인이 너무 고급스럽고 예뻐서 거실/방 분위기가 확 살아나요!
- 설명서 없이도 누구나 금방 조작할 수 있을 만큼 사용법이 아주 직관적이고 편해요.

■ 아주 미세한 한 가지 단점
- 워낙 인기가 많다 보니 배송이 약간 밀릴 수 있다는 점 외에는 대만족입니다! 👍

고민은 배송만 늦출 뿐! 고민하고 계셨던 이웃님들이라면 이번 혜택 기회에 꼭 득템하셔서 삶의 질 수직상승을 경험해 보세요! 😊

#${productName.replace(/\s+/g, '')} #솔직후기 #내돈내산 #리얼리뷰 #사용후기 #강력추천 #삶의질향상`;
    } else if (selectedTone === '전문가형' || selectedTone === '전문칼럼형') {
      targetKeywords = `${productName} 스펙, 테크 리뷰 ${productName}, 프리미엄 가전`;
      title = `[전문가 분석] ${productName} 하드웨어 완성도와 가격 대비 가치 심층 고찰`;
      content = `현대 가전 시장에서 기기의 원초적 사용 편의성과 기술적 완성도는 어떻게 정의될까요?

본 고찰에서는 차세대 혁신 유틸리티 모델로 주목받고 있는 [${productName}] 에 대해 정교한 하드웨어 빌드 퀄리티 및 가격 포지셔닝 관점에서 다각적으로 분석해보도록 하겠습니다.

제조사가 책정한 [${priceText}] 의 시장 포지셔닝은 타사 동급 모델과 비교했을 때 매우 합리적이고 공격적인 정책으로 분석됩니다.

■ 구조적 메커니즘 및 팩트 분석
1. 안정적이고 일관된 작업 효율을 보장하는 고내구성 파츠 설계
2. 마이크로 단위의 정밀 가공 처리가 돋보이는 외장 하우징 빌드 퀄리티
3. 소음 및 전력 소모를 획기적으로 경감시켜 친환경 기준을 만족하는 고효율 파워팩

결론적으로, [${productName}] 은 기술적 완성도와 소비자의 실리적 가치를 조화롭게 양립시킨 명작으로 평가할 수 있습니다. 지혜로운 고기능성 소비를 추구하는 전문가분들께 훌륭한 선택지입니다.

#${productName.replace(/\s+/g, '')} #전문가리뷰 #제품분석 #스펙리뷰 #프리미엄가전 #테크리뷰`;
    } else {
      // 친근한일상형
      targetKeywords = `일상속 ${productName} 추천, 신혼가전`;
      title = `소소한 주말 일상, 드디어 우리 집에 온 ${productName} 자랑해요! 💕🌿`;
      content = `이웃님들 즐거운 주말 보내고 계시나요? 😊
저는 이번 주말에 남편이랑 큰맘 먹고 들인 [${productName}] 덕분에 너무너무 행복한 홈카페 분위기를 즐기고 있어요.

그동안 [${priceText}] 이라는 비용 때문에 살까 말까 고민만 진짜 100번 넘게 한 것 같은데, 진작 살 걸 왜 이제야 샀나 모르겠어요! ㅎㅎ

우리 집 거실 한 켠에 예쁘게 자리 잡은 모습을 보니 볼 때마다 배가 부르고 힐링이 따로 없네요. 신혼가전이나 집들이 선물로도 완전 제격일 것 같아요.

가족들과 다 같이 둘러앉아 따뜻한 차 한잔 마시며 주말 힐링 일상을 보내는 소소한 일기였습니다. 울 다정한 이웃님들도 감기 조심하시고 따뜻한 하루 보내세요! ❤️

#${productName.replace(/\s+/g, '')} #소소한일상 #신혼가전 #인테리어그램 #살림일기 #힐링템`;
    }

    const randomSeed1 = Math.floor(Math.random() * 1000);
    const randomSeed2 = Math.floor(Math.random() * 1000) + 1000;
    const imageUrl = targetProduct.main_image_url || `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80&sig=${randomSeed1}`;
    const subImageUrl = `https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80&sig=${randomSeed2}`;

    // 5. 오토파일럿 예약글 생성
    // 스케줄러 시간 분석 ("10:00" -> 오늘 혹은 내일 설정 시간)
    const today = new Date();
    const timeParts = (settings.autopilot_time || "10:00").split(":");
    const scheduledDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(timeParts[0]), Number(timeParts[1] || 0));
    
    // 이미 오늘 설정 시각이 지났다면 내일로 예약 설정
    if (scheduledDate.getTime() < today.getTime()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const newPost = {
      id: Date.now(),
      product_id: targetProduct.id,
      status: 'SCHEDULED', // 오토파일럿으로 예약 완료 상태 적재
      title: title,
      content: content,
      target_keywords: targetKeywords,
      image_url: imageUrl,
      sub_image_url: subImageUrl,
      scheduled_at: scheduledDate.toISOString(),
      posted_at: null,
      error_message: null,
      views_count: 0,
      likes_count: 0
    };

    await insertRows('crm_naver_blog_posts', [newPost]);

    // 예약 일시가 현재 시각 이하이면 바로 RPA 데몬 기동
    if (new Date(newPost.scheduled_at) <= new Date()) {
      triggerRpaDaemon();
    }

    return NextResponse.json({
      success: true,
      triggered: true,
      message: `네이버 블로그 오토파일럿 스케줄링 성공! 대상 상품 [${productName}]이 ${scheduledDate.toLocaleString()} 예약 포스팅으로 자동 생성되었습니다.`,
      post: newPost
    });

  } catch (error: any) {
    console.error('네이버 블로그 오토파일럿 스케줄러 구동 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
