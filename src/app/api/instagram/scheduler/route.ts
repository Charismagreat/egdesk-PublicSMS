export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';

export async function GET() {
  try {
    // 1. 인스타그램 설정 조회
    const settingsRes = await queryTable('instagram_marketing_settings', { filters: { id: '1' } });
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

    // 3. 이미 인스타그램 게시글로 등록된 상품들의 ID 조회
    const postsRes = await queryTable('crm_instagram_posts', {});
    const posts = postsRes.rows || [];
    const postedProductIds = new Set(posts.map((post: any) => post.product_id).filter(Boolean));

    // 아직 포스팅되지 않은 상품 중에서 하나를 선정 (모두 포스팅되었다면 랜덤 선정)
    let targetProduct = products.find((prod: any) => !postedProductIds.has(prod.id));
    if (!targetProduct) {
      targetProduct = products[Math.floor(Math.random() * products.length)];
    }

    // 4. 상품 기반 오토파일럿 피드 생성 (로컬 하이엔드 AI 마케터 엔진 탑재)
    const selectedTone = settings.tone_style || '인플루언서형';
    const productName = targetProduct.name;
    const priceText = targetProduct.price ? `${Number(targetProduct.price).toLocaleString()}원` : '특별 혜택가';
    
    // 톤에 따른 오토파일럿 문구 및 해시태그 즉석 설계
    let content = '';
    if (selectedTone === '인플루언서형') {
      content = `✨ 울 인친님들 주목!! 사장님 강추 최애템 오픈합니다아-! 💖\n\n오늘 오토파일럿 마케터가 픽한 아이템은 바로 [${productName}] 이에요! 🥰\n가격도 무려 ${priceText} 라는 혜택가로 데려왔어요! 진짜 놓치면 100% 후회하는 꿀템!! 🏃‍♂️💨\n\n고민은 배송을 늦출 뿐인 거 다들 아시죠? 😉 프로필 링크 타고 바로 구경해보세요!! ✨✨\n\n#${productName} #인플루언서강추 #감성템 #소장각 #데일리스타일 #득템찬스 #일상소통`;
    } else if (selectedTone === '세련된형') {
      content = `시간이 흘러도 머무는 정갈한 가치.\n오토파일럿 큐레이터가 제안하는 [${productName}] 입니다. 🌿🕊️\n\n일상의 작은 쉼표가 되어줄 아름다운 오브제. 엄선된 퀄리티와 감도 높은 디자인을 ${priceText}의 합리적인 제안으로 전달해 드립니다.\n\n프로필의 상세 링크를 통해 당신만의 무드를 선사할 기회를 확인하세요.\n\n#${productName} #감도높은일상 #미니멀라이프 #브랜드디자인 #오브제샵 #인테리어소품 #셀렉샵`;
    } else if (selectedTone === '전문가형') {
      content = `📊 [업무 & 일상 성능 혁신] 스마트한 선택을 위한 프리미엄 솔루션\n\n디테일의 격차를 실현한 [${productName}] 제품의 오늘 특별 구성을 안내해 드립니다. ✨\n\n- 철저한 사후 관리 및 완성도 높은 디자인 적용\n- 특별 혜택가 제안: ${priceText}\n\n제품의 탁월한 내구성과 독자적인 설계를 지금 프로필 구매 상세 링크에서 면밀히 확인해 보세요.\n\n#${productName} #스마트컨슈머 #고품격스펙 #기능성가구 #기술혁신 #오피스인테리어`;
    } else {
      content = `🚨 통장 잔고 눈감아..🚨\n\n오늘의 무인 마케터 레이더에 딱 걸려버린 대박 아이템 [${productName}]! 💸🤣\n진짜 이건 실물 보고 "와 미쳤다" 소리 지를 수밖에 없었어요!!\n사장님이 특별히 ${priceText} 이라는 대혜자 가격에 풉니다! 🤩👍\n\n텅장 되기 전에 얼른 프로필 링크로 오셔서 구경하세요 ㅋㅋㅋ 현기증 납니다!! 😉👌\n\n#${productName} #지름신강림 #탕진잼 #꿀잼템 #인스타꿀템 #인생은장비빨 #내돈내산추천`;
    }

    const randomSeed = Math.floor(Math.random() * 1000);
    const imageUrl = targetProduct.main_image_url || `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80&sig=${randomSeed}`;

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
      content: content,
      image_url: imageUrl,
      scheduled_at: scheduledDate.toISOString(),
      posted_at: null,
      error_message: null,
      likes_count: 0,
      comments_count: 0
    };

    await insertRows('crm_instagram_posts', [newPost]);

    return NextResponse.json({
      success: true,
      triggered: true,
      message: `오토파일럿 스케줄링 성공! 대상 상품 [${productName}]이 ${scheduledDate.toLocaleString()} 예약 피드로 자동 생성되었습니다.`,
      post: newPost
    });

  } catch (error: any) {
    console.error('오토파일럿 스케줄러 구동 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
