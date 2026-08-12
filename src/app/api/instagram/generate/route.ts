export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, generateInstagramContent } from '../../../../../egdesk-helpers';

// 60초 타임아웃 래퍼 함수
function withTimeout<T>(promise: Promise<T>, ms: number = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`이지데스크 MCP 서버 응답 타임아웃 (${ms / 1000}초 대기 초과)`));
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

// 이지데스크 순정 Instagram MCP 헬퍼 도구를 통한 컨텐츠(문구 + 이미지) 단일 전용 생성
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

    console.log(`🚀 [EGDesk MCP] 순정 generateInstagramContent 도구 단일 호출 시도 (상품명: ${productName}, 타임아웃 가드 60초)`);

    let mcpResult: any = null;
    let mcpErrorLog: string | null = null;

    // 2. 이지데스크 순정 generateInstagramContent MCP 헬퍼 도구 호출 (60초 감시)
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
        60000 // 60초 타임아웃 제한
      );
    } catch (mcpErr: any) {
      mcpErrorLog = `[EGDesk MCP 도구 예외] ${mcpErr.message || String(mcpErr)}`;
      console.error(`❌ ${mcpErrorLog}`);
    }

    // 3. MCP 도구 결과 검증 및 에러 처리
    if (mcpResult && mcpResult.success) {
      const finalCaption = mcpResult.content?.caption || `${mcpResult.content?.hook || ''}\n\n${mcpResult.content?.body || ''}\n\n${(mcpResult.content?.hashtags || []).join(' ')}`;
      const localImagePath = mcpResult.image?.filePath || '';

      // 로컬 파일 경로를 브라우저용 Base64 Data URI로 안전 변환
      let webImageUrl = localImagePath;
      if (localImagePath && typeof window === 'undefined') {
        try {
          const fs = require('fs');
          const path = require('path');
          if (fs.existsSync(localImagePath)) {
            const fileBuffer = fs.readFileSync(localImagePath);
            const ext = path.extname(localImagePath).toLowerCase().replace('.', '') || 'jpeg';
            const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            webImageUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
            console.log(`🖼️ [EGDesk MCP] 로컬 이미지(${localImagePath})를 웹용 Base64 포맷으로 변환 성공!`);
          }
        } catch (fileErr: any) {
          console.warn('⚠️ 로컬 이미지 Base64 변환 예외:', fileErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        text: finalCaption.trim(),
        image_url: webImageUrl,
        imagePath: localImagePath,
        mcpResult: mcpResult
      });
    }

    // MCP 도구가 실패했거나 오류 발생 시 우회 없이 순정 에러 로그 반환
    const detailedErrorMessage = mcpErrorLog || mcpResult?.imageError || mcpResult?.hint || '이지데스크 MCP 도구가 컨텐츠 생성에 실패했습니다.';
    console.error('❌ [EGDesk MCP Error Log]', detailedErrorMessage);

    return NextResponse.json({
      success: false,
      error: detailedErrorMessage,
      mcpResult: mcpResult
    }, { status: 500 });

  } catch (error: any) {
    console.error('인스타그램 MCP 컨텐츠 생성 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
