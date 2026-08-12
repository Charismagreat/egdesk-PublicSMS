export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { 
  queryTable, 
  listInstagramHistory, 
  createInstagramPost, 
  generateInstagramContent 
} from '../../../../../egdesk-helpers';

/**
 * 이지데스크 순정 MCP 기반 인스타그램 오토파일럿 백그라운드 크론 스케줄러 API
 * GET /api/cron/instagram-autopilot
 */
export async function GET() {
  try {
    // 1. 인스타그램 최신 설정 조회 (규칙: orderBy 'id' DESC 적용)
    const settingsRes = await queryTable('instagram_marketing_settings', { orderBy: 'id', orderDirection: 'DESC', limit: 100 });
    const activeSettings = (settingsRes.rows || []).filter((r: any) => !r.deleted_at);
    const settings = activeSettings[0] || settingsRes.rows?.[0] || null;

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

    // 2. 전체 마스터 상품 목록 조회 (소프트 삭제 제외)
    const productsRes = await queryTable('products', { limit: 1000 });
    const allProducts = productsRes.rows || [];
    const products = allProducts.filter((prod: any) => !prod.deleted_at);

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        triggered: false,
        message: '오토파일럿 대상 상품이 등록되어 있지 않습니다.'
      });
    }

    // 3. 이지데스크 순정 MCP 이력 조회를 통한 라운드 로빈 대상 상품 픽업
    let mcpHistory: any[] = [];
    try {
      const historyRes = await listInstagramHistory();
      if (historyRes && historyRes.success && Array.isArray(historyRes.history)) {
        mcpHistory = historyRes.history;
      }
    } catch (hErr) {
      console.warn('EGDesk MCP history fetch warning in autopilot:', hErr);
    }

    // 이전 이력에 등록된 상품명 집합 추출
    const postedNames = new Set(mcpHistory.map((entry: any) => entry.productName || entry.caption || ''));

    // 1순위: 아직 홍보되지 않은 순차 라운드-로빈 상품 선택
    let targetProduct = products.find((prod: any) => !postedNames.has(prod.name));
    if (!targetProduct) {
      // 2순위: 모두 한 번씩 홍보되었으면 순차 무작위 로테이션 선택
      targetProduct = products[Math.floor(Math.random() * products.length)];
    }

    const selectedTone = settings.tone_style || '인플루언서형';
    const productName = targetProduct.name;
    const productDesc = targetProduct.description || '';
    const priceText = targetProduct.price ? `${Number(targetProduct.price).toLocaleString()}원` : '특가 제안';

    // 4. 이지데스크 순정 generateInstagramContent MCP 헬퍼를 활용한 카피라이팅 & 이미지 자동 조립
    let mcpContentRes: any = null;
    try {
      mcpContentRes = await generateInstagramContent({
        topic: productName,
        productName: productName,
        contentGoal: `${selectedTone} 어조로 상품 [${productName}]의 특징과 혜택가 ${priceText}를 인스타그램 피드로 매력적이게 소개해 주세요.\n${productDesc}`,
        visualBrief: `High-end 8k commercial product photography of "${productName}". Clean minimal background, photorealistic commercial product shot.`,
        generateImage: true,
        extraInstructions: `상품 혜택가: ${priceText}, 상세특성: ${productDesc}`
      });
    } catch (genErr) {
      console.warn('EGDesk MCP content generation warning in autopilot:', genErr);
    }

    const finalCaption = mcpContentRes?.content?.caption || `✨ 사장님 강추 꿀템 등장! [${productName}] ✨\n\n특별 혜택가 ${priceText}로 지금 바로 프로필 링크에서 만나보세요! 💖\n\n#${productName} #인스타핫템 #강추 #득템찬스`;
    const finalImageUrl = mcpContentRes?.image?.filePath || targetProduct.main_image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80';

    // 5. 스케줄링 일시 계산 (설정 시간 기준)
    const today = new Date();
    const timeParts = (settings.autopilot_time || "10:00").split(":");
    const scheduledDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(timeParts[0]), Number(timeParts[1] || 0));

    if (scheduledDate.getTime() < today.getTime()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    // 6. 이지데스크 순정 createInstagramPost MCP 도구를 통한 오토파일럿 포스팅 자동 등록
    let mcpPostResult: any = null;
    try {
      mcpPostResult = await createInstagramPost({
        caption: finalCaption,
        mediaUrl: finalImageUrl,
        scheduledAt: scheduledDate.toISOString(),
        username: settings.instagram_username || undefined
      });
    } catch (postErr: any) {
      console.error('EGDesk MCP createInstagramPost error in autopilot:', postErr);
    }

    return NextResponse.json({
      success: true,
      triggered: true,
      message: `[EGDesk MCP 오토파일럿] 성공: 상품 [${productName}]의 피드가 ${scheduledDate.toLocaleString()} 예약 포스팅으로 자동 등록되었습니다.`,
      post: mcpPostResult || { productName, scheduledAt: scheduledDate.toISOString() }
    });

  } catch (error: any) {
    console.error('인스타그램 크론 오토파일럿 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
