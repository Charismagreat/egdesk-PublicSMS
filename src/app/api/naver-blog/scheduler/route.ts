export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';

export async function GET() {
  try {
    // 1. 네이버 블로그 설정 조회
    const settingsRes = await queryTable('naver_blog_marketing_settings', { filters: { id: '1' } });
    const settings = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0] : null;

    if (!settings) {
      return NextResponse.json({ success: false, error: '설정 테이블이 초기화되지 않았습니다.' }, { status: 400 });
    }

    if (Number(settings.is_autopilot) !== 1) {
      return NextResponse.json({ 
        success: true, 
        triggered: false, 
        message: '현재 오토파일럿 모드가 비활성화 상태입니다. 수동 검토 모드로 동작 중입니다.' 
      });
    }

    // 2. 전체 상품 목록 조회
    const productsRes = await queryTable('products', {});
    const products = productsRes.rows || [];

    if (products.length === 0) {
      return NextResponse.json({ 
        success: true, 
        triggered: false, 
        message: '오토파일럿 대상 상품이 없습니다. 먼저 상품을 등록해주세요.' 
      });
    }

    // 3. 이미 네이버 블로그 게시글로 등록된 상품들의 ID 조회
    const postsRes = await queryTable('crm_naver_blog_posts', {});
    const posts = postsRes.rows || [];
    const postedProductIds = new Set(posts.map((post: any) => post.product_id).filter(Boolean));

    // 아직 포스팅되지 않은 상품 중에서 하나를 선정 (모두 포스팅되었다면 랜덤 선정)
    let targetProduct = products.find((prod: any) => !postedProductIds.has(prod.id));
    if (!targetProduct) {
      targetProduct = products[Math.floor(Math.random() * products.length)];
    }

    // 4. 상품 기반 오토파일럿 블로그 포스트 자동 생성
    const selectedTone = settings.tone_style || '정보제공형';
    const productName = targetProduct.name;
    const priceText = targetProduct.price ? `${Number(targetProduct.price).toLocaleString()}원` : '합리적인 가격대';
    const descriptionText = targetProduct.description || '최고의 선택';
    
    // 오토파일럿 전용 자동 가상 속성 매핑 (Product Spec-to-Keyword) 키워드 3개 선정
    let targetKeywords = '';
    let title = '';
    let content = '';

    if (selectedTone === '정보제공형') {
      targetKeywords = `${productName} 추천, ${productName} 가격, 가성비 가전`;
      title = `[가전 스펙 분석] ${productName}의 주요 특징 및 스마트한 추천 이유`;
      content = `안녕하세요. 오늘 소개해드릴 인기 상품은 바로 [${productName}] 입니다.

이 제품은 최근 많은 분들의 스마트한 소비 트렌드에 발맞추어 출시된 웰메이드 모델입니다.
현재 시장 판매가는 [${priceText}] 선으로 형성되어 있어 뛰어난 가성비를 자랑하는 가전제품으로 인기를 모으고 있습니다.

■ ${productName}의 핵심 스펙 포인트
1. 실사용자의 눈높이에 맞춘 세련된 미니멀리즘 디자인
2. 장시간 작동 시에도 안전성과 고성능을 유지하는 튼튼한 하드웨어 설계
3. 어떤 공간에 두어도 위화감 없이 모던하게 스며드는 컬러 및 마감 텍스처

가성비 좋은 신제품을 고민하고 계시다면, 해당 모델을 적극 추천해 드립니다. 
상세한 가격 정보와 추가 문의사항은 댓글로 남겨주시면 정성껏 답변해 드리겠습니다. 감사합니다.

#${productName.replace(/\s+/g, '')} #가성비가전 #스펙리뷰 #인기가전추천 #합리적소비`;
    } else if (selectedTone === '솔직리뷰형') {
      targetKeywords = `${productName} 솔직후기, 내돈내산 ${productName}, 여름 가전`;
      title = `품절 대란 ${productName} 내돈내산 3주 사용 솔직 후기 (장단점 대공개!)`;
      content = `여러분 안녕하세요! 🌸 
오늘도 제 블로그에 방문해 주셔서 너무너무 감사해요!!

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
