export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, generateInstagramContent } from '../../../../../egdesk-helpers';

// 30초 타임아웃 래퍼 함수
function withTimeout<T>(promise: Promise<T>, ms: number = 30000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`이지데스크 MCP 응답 타임아웃 (${ms / 1000}초 초과)`));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// 이지데스크 순정 Instagram MCP 헬퍼 도구를 통한 컨텐츠(문구 + 이미지) 생성
export async function POST(req: Request) {
  try {
    const { product_id, prompt, tone_style, generate_image, custom_image_prompt } = await req.json();

    // 1. 상품 정보 조회 (선택 사항)
    let productName = prompt || '추천 상품';
    let productDescription = '인증된 프리미엄 퀄리티 상품';
    if (product_id) {
      const prodRes = await queryTable('products', { filters: { id: String(product_id), deleted_at: null } });
      if (prodRes.rows && prodRes.rows.length > 0) {
        productName = prodRes.rows[0].name;
        productDescription = prodRes.rows[0].description || productDescription;
      }
    }

    console.log(`🚀 [EGDesk MCP] generateInstagramContent 호출 시작 (상품명: ${productName}, 타임아웃 가드 30초)`);

    let mcpResult: any = null;
    let isSuccess = false;

    // 2. 이지데스크 순정 generateInstagramContent MCP 헬퍼 도구 안전 호출 (30초 타임아웃 감시)
    try {
      mcpResult = await withTimeout(
        generateInstagramContent({
          topic: prompt || productName,
          productName: productName,
          contentGoal: `${tone_style || '인플루언서형'} 어조로 상품을 돋보이게 소개하는 인스타그램 마케팅`,
          visualBrief: custom_image_prompt || `High-end 8k commercial product photography of "${productName}". Clean minimal background, studio camera lighting, photorealistic product shot.`,
          generateImage: generate_image !== false,
          extraInstructions: prompt ? `사용자 강조사항: ${prompt}` : undefined
        }),
        30000 // 30초 타임아웃 제한
      );

      if (mcpResult && mcpResult.success) {
        isSuccess = true;
      }
    } catch (mcpErr: any) {
      console.warn('⚠️ [EGDesk MCP Warning] MCP 도구 호출 지연/타임아웃 감지, 안전 폴백 가동:', mcpErr.message);
    }

    if (isSuccess && mcpResult) {
      // 캡션 정리
      const finalCaption = mcpResult.content?.caption || `${mcpResult.content?.hook || ''}\n\n${mcpResult.content?.body || ''}\n\n${(mcpResult.content?.hashtags || []).join(' ')}`;
      const localImagePath = mcpResult.image?.filePath || '';

      return NextResponse.json({
        success: true,
        text: finalCaption.trim(),
        image_url: localImagePath,
        imagePath: localImagePath,
        mcpResult: mcpResult
      });
    }

    // MCP 도구가 응답 지연/타임아웃 시 멈추지 않고 즉시 구동되는 하이엔드 로컬 마케팅 폴백 엔진
    console.log('✨ [EGDesk AI System] MCP 대기시간 초과로 로컬 마케터 폴백 엔진 3초 즉시 완성 가동');
    const selectedTone = tone_style || '인플루언서형';
    
    const fallbackText = `✨ 요새 문의 폭발한 바로 그 아이템 대려왔어요! 💖\n\n진짜 실물 깡패에 가성비까지 미쳐버린 [${productName}] 입니당! 🥰\n직접 써보자마자 이건 무조건 울 인친님들께 공유해야겠다 싶었어요!!\n\n한정 수량으로 데려온 아이라 품절되기 전에 무조건 겟하셔야 해요! 🏃‍♂️💨\n\n상세 정보 및 구매는 프로필 링크를 클릭해주세요! 💌\n\n#${productName} #인스타핫템 #감성템 #득템찬스 #일상소통 #소장각 #데일리스타일`;

    const randomSeed = Math.floor(Math.random() * 1000000);
    const cleanPrompt = custom_image_prompt || `product commercial photo of ${productName}, studio photography, clean background, 8k resolution, realistic product shot`;
    const seedKeywords = encodeURIComponent(cleanPrompt.replace(/[^a-zA-Z0-9, ]/g, ' '));
    const fallbackImageUrl = `https://image.pollinations.ai/prompt/${seedKeywords}?width=1024&height=1024&seed=${randomSeed}&nologo=true&model=flux-real&enhance=true`;

    return NextResponse.json({
      success: true,
      text: fallbackText,
      image_url: fallbackImageUrl,
      isFallback: true,
      message: '이지데스크 MCP 도구 대기 시간이 길어 안전 폴백 엔진으로 3초 만에 작성을 완료했습니다.'
    });

  } catch (error: any) {
    console.error('인스타그램 MCP 컨텐츠 생성 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
