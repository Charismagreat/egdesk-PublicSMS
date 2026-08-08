export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';

/**
 * 인스타그램 오토파일럿 백그라운드 크론 스케줄러 API
 * GET /api/cron/instagram-autopilot
 */
export async function GET() {
  try {
    // 1. 인스타그램 설정 조회 (소프트 삭제 제외)
    const settingsRes = await queryTable('instagram_marketing_settings', { filters: { id: '1', deleted_at: null } });
    const settings = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0] : null;

    if (!settings) {
      return NextResponse.json({ success: false, message: '인스타그램 마케팅 설정이 초기화되지 않았습니다.' }, { status: 400 });
    }

    if (Number(settings.is_autopilot) !== 1) {
      return NextResponse.json({
        success: true,
        triggered: false,
        message: '오토파일럿 모드가 비활성화 상태입니다.'
      });
    }

    // 2. 전체 상품 목록 조회 (소프트 삭제 제외)
    const productsRes = await queryTable('products', { filters: { deleted_at: null } });
    const products = productsRes.rows || [];

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        triggered: false,
        message: '오토파일럿 대상 상품이 등록되어 있지 않습니다.'
      });
    }

    // 3. 이미 인스타그램 게시글로 포스팅된 상품 ID 집합
    const postsRes = await queryTable('crm_instagram_posts', { filters: { deleted_at: null } });
    const posts = postsRes.rows || [];
    const postedProductIds = new Set(posts.map((p: any) => p.product_id).filter(Boolean));

    // 아직 포스팅되지 않은 상품 타겟팅 (없으면 전체 중 랜덤)
    let targetProduct = products.find((prod: any) => !postedProductIds.has(prod.id));
    if (!targetProduct) {
      targetProduct = products[Math.floor(Math.random() * products.length)];
    }

    // 4. 톤앤매너 카피라이팅 자동 생성
    const selectedTone = settings.tone_style || '인플루언서형';
    const productName = targetProduct.name;
    const priceText = targetProduct.price ? `${Number(targetProduct.price).toLocaleString()}원` : '특가 제안';

    let content = '';
    if (selectedTone === '인플루언서형') {
      content = `✨ 울 인친님들 주목!! 사장님 추천 꿀템 등장-! 💖\n\n오늘 오토파일럿 AI 마케터가 픽한 아이템은 [${productName}] 입니다! 🥰\n혜택가 ${priceText}로 준비했어요! 놓치기 전에 빠르게 구경해보세요! 🏃‍♂️💨\n\n상세 정보는 프로필 링크에서 바로 확인해보세요! ✨\n\n#${productName} #인천강추 #감성템 #소장각 #데일리추천 #득템찬스`;
    } else if (selectedTone === '세련된형') {
      content = `시간이 흘러도 변함없는 정갈한 가치.\n오토파일럿 큐레이터가 제안하는 [${productName}] 입니다. 🌿🕊️\n\n일상의 작은 쉼표가 되어줄 오브제. 감도 높은 디자인과 ${priceText}의 합리적인 제안을 만나보세요.\n\n#${productName} #감도높은일상 #미니멀라이프 #오브제 #셀렉샵`;
    } else if (selectedTone === '전문가형') {
      content = `📊 [성능 & 퀄리티 검증 솔루션] 프리미엄 아이템 제안\n\n정교한 완성도의 [${productName}] 제품을 안내해 드립니다. ✨\n\n- 특별 혜택가: ${priceText}\n- 철저한 사후 관리 및 세련된 디자인 적용\n\n상세 스펙과 활용 팁은 프로필 링크에서 면밀히 확인해보세요.\n\n#${productName} #스마트컨슈머 #고품격스펙 #기술혁신`;
    } else {
      content = `🚨 통장 잔고 주의!! 🚨\n\n오늘 마케터 레이더에 딱 걸린 대박 아이템 [${productName}]! 💸🤣\n사장님이 특별히 ${priceText}의 혜자스러운 가격으로 오픈합니다! 🤩\n\n품절되기 전에 얼른 프로필 타고 오세요!! 😉\n\n#${productName} #지름신강림 #탕진잼 #꿀잼템 #인스타핫템`;
    }

    const randomSeed = Math.floor(Math.random() * 1000);
    const imageUrl = targetProduct.main_image_url || `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80&sig=${randomSeed}`;

    // 5. 스케줄링 일시 계산
    const today = new Date();
    const timeParts = (settings.autopilot_time || "10:00").split(":");
    const scheduledDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(timeParts[0]), Number(timeParts[1] || 0));

    if (scheduledDate.getTime() < today.getTime()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const nowStr = today.toISOString().replace('T', ' ').slice(0, 19);
    const uuidStr = 'IGP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const newPost = {
      id: Date.now(),
      uuid: uuidStr,
      product_id: targetProduct.id,
      status: 'SCHEDULED',
      content: content,
      image_url: imageUrl,
      scheduled_at: scheduledDate.toISOString(),
      posted_at: null,
      error_message: null,
      likes_count: 0,
      comments_count: 0,
      updated_at: nowStr,
      updated_by: 'cron_scheduler',
      deleted_at: null,
      deleted_by: null,
      restored_at: null,
      restored_by: null,
    };

    await insertRows('crm_instagram_posts', [newPost]);

    return NextResponse.json({
      success: true,
      triggered: true,
      message: `[Cron Autopilot] 성공: 상품 [${productName}]의 피드가 ${scheduledDate.toLocaleString()} 예약 건으로 등록되었습니다.`,
      post: newPost
    });

  } catch (error: any) {
    console.error('인스타그램 크론 오토파일럿 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
