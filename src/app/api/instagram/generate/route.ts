export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, generateInstagramContent } from '../../../../../egdesk-helpers';

// 이지데스크 순정 Instagram MCP 헬퍼 도구를 통한 컨텐츠(문구 + 이미지) 생성
export async function POST(req: Request) {
  try {
    const { product_id, prompt, tone_style, generate_image, custom_image_prompt } = await req.json();

    // 1. 상품 정보 조회 (선택 사항)
    let productName = prompt || '추천 상품';
    if (product_id) {
      const prodRes = await queryTable('products', { filters: { id: String(product_id), deleted_at: null } });
      if (prodRes.rows && prodRes.rows.length > 0) {
        productName = prodRes.rows[0].name;
      }
    }

    console.log(`🚀 [EGDesk MCP] generateInstagramContent 순정 도구 호출 시작 (상품명: ${productName}, 어조: ${tone_style})`);

    // 2. 이지데스크 순정 generateInstagramContent MCP 헬퍼 도구 호출
    const mcpResult = await generateInstagramContent({
      topic: prompt || productName,
      productName: productName,
      contentGoal: `${tone_style || '인플루언서형'} 어조로 상품을 돋보이게 소개하는 인스타그램 마케팅`,
      visualBrief: custom_image_prompt || `High-end 8k commercial product photography of "${productName}". Clean minimal background, studio camera lighting, photorealistic product shot.`,
      generateImage: generate_image !== false,
      extraInstructions: prompt ? `사용자 강조사항: ${prompt}` : undefined
    });

    if (mcpResult && mcpResult.success) {
      // 캡션 정리
      const finalCaption = mcpResult.content?.caption || `${mcpResult.content?.hook || ''}\n\n${mcpResult.content?.body || ''}\n\n${(mcpResult.content?.hashtags || []).join(' ')}`;
      
      // 생성된 실물 로컬 이미지 파일 경로 획득
      const localImagePath = mcpResult.image?.filePath || '';
      
      // 이미지 URL 반환 (로컬 파일 경거나 이미지 미작성 시 폴백)
      const finalImageUrl = localImagePath || '';

      console.log(`🎉 [EGDesk MCP] generateInstagramContent 성공! (이미지 경로: ${localImagePath})`);

      return NextResponse.json({
        success: true,
        text: finalCaption.trim(),
        image_url: finalImageUrl,
        imagePath: localImagePath,
        mcpResult: mcpResult
      });
    } else {
      console.warn('⚠️ [EGDesk MCP] generateInstagramContent 실패 또는 미반환, 폴백 처리:', mcpResult);
      return NextResponse.json({
        success: false,
        error: mcpResult?.imageError || mcpResult?.hint || '이지데스크 MCP 컨텐츠 생성 도구 실행 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('인스타그램 MCP 컨텐츠 생성 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
