import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';

export async function POST(req: Request) {
  try {
    const { product_id, prompt, tone_style, generate_image } = await req.json();

    // 1. DB에서 구글 AI API 키 조회
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    // 2. 상품 정보 조회 (선택 사항)
    let productInfo = '';
    let productName = '신상품';
    let productDescription = '인증된 프리미엄 퀄리티 추천 상품';
    let productImageUrl = '';
    
    if (product_id) {
      const prodRes = await queryTable('products', { filters: { id: String(product_id), deleted_at: null } });
      if (prodRes.rows && prodRes.rows.length > 0) {
        const prod = prodRes.rows[0];
        productName = prod.name;
        productDescription = prod.description || '인증된 프리미엄 퀄리티 추천 상품';
        productImageUrl = prod.main_image_url || '';
        productInfo = `
상품명: ${prod.name}
가격: ${prod.price ? `${prod.price.toLocaleString()}원` : '별도 문의'}
상품 설명: ${productDescription}
상품 URL: ${prod.url || ''}
        `;
      }
    }

    // 3. AI 피드 본문 및 해시태그 생성
    let generatedText = '';
    const selectedTone = tone_style || '인플루언서형';

    const systemPrompt = `
당신은 소상공인을 위한 프리미엄 인스타그램 전문 마케터 및 카피라이터입니다.
다음 상품 및 사용자 요청에 근거하여, 인스타그램 피드에 올릴 매력적이고 세련된 홍보 문구와 해시태그를 한국어로 작성해주세요.

[상품 정보]
${productInfo || '공통 마케팅 프로모션'}

[사용자 요청 사항]
${prompt || '이 상품을 인스타그램 피드로 돋보이게 소개해주세요.'}

[작성 스타일 (톤앤매너)]
- '${selectedTone}' 스타일로 작성해주세요.
  * 인플루언서형: 친근하고 일상적이며 이모지를 풍부하게 섞고 "~해요", "~했답니다!" 체 사용.
  * 세련된형: 감성적이고 여유로운 느낌, 고급스러우며 톤다운된 문체 사용.
  * 전문가형: 제품의 기능과 장점, 신뢰할 수 있는 수치나 팩트 위주로 차분하게 설명.
  * 유머형: 트렌디한 밈이나 재치 있는 유머, 반전 매력을 주어 가볍고 재미있게 소통.

[출력 요구 조건]
1. 반드시 아래 태그 포맷으로 분리해서 반환할 것:
[HOOK]
1초 시선강탈 훅 문장
[/HOOK]
[CAPTION]
본문 세부 홍보 캡션
[/CAPTION]
[HASHTAGS]
추천 인스타그램 해시태그 5~10개
[/HASHTAGS]
2. 마크다운 기호(# header 등)는 쓰지 말 것.
`;

    if (apiKey) {
      try {
        const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              { parts: [{ text: `위 상품 정보를 바탕으로 ${selectedTone} 어조의 피드 본문과 추천 해시태그를 생성해주세요.` }] }
            ],
            generationConfig: {
              temperature: 0.85
            }
          })
        });

        if (response.ok) {
          const geminiData = await response.json();
          generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          // AI 토큰 사용량 로깅
          try {
            const prompt_tokens = geminiData.usageMetadata?.promptTokenCount || 0;
            const completion_tokens = geminiData.usageMetadata?.candidatesTokenCount || 0;
            const total_tokens = geminiData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
            const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            await insertRows('ai_token_usage_logs', [{
              id: logId,
              model: 'gemini-3.5-flash',
              purpose: 'INSTAGRAM_POST_GEN',
              prompt_tokens,
              completion_tokens,
              total_tokens,
              created_at: logTime
            }]);
          } catch (e: any) {
            console.error('AI 토큰 로깅 실패:', e.message);
          }
        }
      } catch (err) {
        console.error('Gemini API 호출 중 오류 발생, 폴백 문구 작동:', err);
      }
    }

    // Gemini API가 없거나 에러가 났을 때 작동하는 하이엔드 로컬 카피라이팅 폴백 엔진
    if (!generatedText) {
      const fallbackTemplates: Record<string, string[]> = {
        '인플루언서형': [
          `✨ 요새 문의 폭발한 바로 그 아이템.. 대려왔어요! 💖\n\n진짜 실물 깡패에 가성비까지 미쳐버린 [${productName}] 입니당! 🥰\n직접 써보자마자 이건 무조건 울 인친님들께 공유해야겠다 싶었어요!!\n\n한정 수량으로 데려온 아이라 품절되기 전에 무조건 겟하셔야 해요! 🏃‍♂️💨\n\n상세 정보 및 구매는 프로필 링크를 클릭해주세요! 💌\n\n#${productName} #인스타핫템 #감성템 #득템찬스 #일상소통 #소장각 #데일리스타일`,
          `공구 문의 정말 많았던 [${productName}] 드디어 오픈합니다! 🥳🎉\n\n이것만 있으면 평범한 일상도 완전 감성 가득해지는 마법.. 다들 아시죠? 🌿✨\n직접 꼼꼼하게 검증하고 데려온 만큼 퀄리티는 백프로 보장해요! 👍\n\n놓치면 후회할 특별 구성, 지금 바로 프로필에서 확인해보세요! 💕\n\n#${productName} #오픈런 #감성사진 #라이프스타일 #인생템 #강추템 #인플루언서추천`
        ],
        '세련된형': [
          `공간의 분위기를 차분하게 채우는 고유의 아름다움.\n[${productName}]을 소개합니다. 🕊️🌿\n\n불필요한 디테일은 덜어내고, 본연의 감도 높은 텍스처와 실루엣에만 집중했습니다. 일상 속에서 잔잔하고 은은하게 머물며 당신만의 특별한 결을 완성해 드립니다.\n\n오직 엄선된 수량만 제작되어 한정 오픈됩니다.\n\n자세한 가치는 프로필의 여정에서 이어집니다.\n\n#${productName} #미니멀리즘 #오브제 #감도높은일상 #브랜드스토리 #라이프에센셜 #모던클래식`,
          `시간이 흘러도 변치 않는 가치와 절제된 우아함.\n오늘 제안해 드리는 제품은 [${productName}] 입니다. ✨\n\n소유하는 것만으로도 나만의 취향과 안목을 증명해 주는 감각적인 아이템. 지친 하루 끝에 진정한 위로를 선사하는 프리미엄 퀄리티를 직접 경험해 보세요.\n\n프로필 링크를 통해 감성적인 가치를 만나보실 수 있습니다.\n\n#${productName} #프리미엄라이프 #취향저격 #홈스타일링 #클래식디자인 #감성셀렉샵`
        ],
        '전문가형': [
          `[신상품 분석] 압도적인 퍼포먼스와 정교한 설계의 집약체, [${productName}] 📊💻\n\n핵심 기술력과 까다로운 검증 프로세스를 통해 탄생한 프리미엄 스펙을 공개합니다.\n기존 모델 대비 극대화된 사용 편의성과 내구성을 갖추어 최적의 업무/일상 능률을 보장합니다.\n\n📌 주요 특징\n- 비교 불가한 뛰어난 소재와 내구성\n- 현대적 감각을 결합한 세련된 설계\n- 완벽한 사후 관리 서비스 제공\n\n품격 있는 완성도와 디테일의 격차를 지금 직접 확인해보시기 바랍니다.\n\n#${productName} #기술의격차 #스펙완성 #프로페셔널 #혁신제품 #스마트초이스 #전문가강추`,
        ],
        '유머형': [
          `🚨 지갑 털림 주의!! 🚨\n\n아니 사장님이 미쳤어요.. 드디어 들고 온 [${productName}] 💸🤣\n이거 사고 제 통장은 텅장이 되었지만, 마음은 200% 배부르다는 게 학계의 정설..★\n\n써보자마자 "와 이건 문명 혁명이다" 외치며 주변 영업하고 다녔습니다 ㅋㅋㅋ\n고민은 배송만 늦출 뿐! 다들 아시죠? 😉👌\n\n빨리 프로필 타고 겟하러 오세요! 현기증 난단 말이에요 ㅠㅠ\n\n#${productName} #지름신강림 #내돈내산강추 #탕진잼 #꿀잼일상 #잇템 #유머스타그램`
        ]
      };

      const templates = fallbackTemplates[selectedTone] || fallbackTemplates['인플루언서형'];
      generatedText = templates[Math.floor(Math.random() * templates.length)];
    }

    // 4. Google Imagen 3 (imagen-3.0-generate-002) AI 이미지 직접 생성 Engine
    // 요구사항: "상품명 + 상품 상세 설명 + 사용자 프롬프트" 기반 조합
    let imageUrl = productImageUrl || '';

    if (generate_image) {
      const combinedImagePrompt = `Professional aesthetic Instagram 1:1 photograph of product "${productName}". Details: ${productDescription}. User emphasis: ${prompt || 'lifestyle aesthetic clean photography'}. 8k resolution, studio lighting, photorealistic, clean background, luxury instagram post.`;

      if (apiKey) {
        try {
          console.log(`✨ [Instagram AI] Google Imagen 3 이미지 생성 시도: "${productName}"`);
          const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
          const imagenRes = await fetch(imagenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [{ prompt: combinedImagePrompt }],
              parameters: { sampleCount: 1, aspectRatio: '1:1', outputOptions: { mimeType: 'image/jpeg' } }
            })
          });

          if (imagenRes.ok) {
            const imagenJson = await imagenRes.json();
            const b64Data = imagenJson?.predictions?.[0]?.bytesBase64Encoded;
            if (b64Data) {
              imageUrl = `data:image/jpeg;base64,${b64Data}`;
              console.log('🎉 [Instagram AI] Google Imagen 3 1:1 이미지 실시간 생성 성공!');
            }
          }
        } catch (imagenErr: any) {
          console.warn('⚠️ [Instagram AI] Google Imagen 3 생성 예외, Pollinations AI 폴백 사용:', imagenErr.message);
        }
      }

      // API Key가 없거나 Imagen 3 실패 시 Pollinations AI 고화질 렌더링 폴백
      if (!imageUrl || imageUrl === productImageUrl) {
        const randomSeed = Math.floor(Math.random() * 1000000);
        const seedKeywords = encodeURIComponent(`${productName} ${productDescription} ${prompt || ''}`.slice(0, 80));
        imageUrl = `https://image.pollinations.ai/prompt/${seedKeywords}?width=800&height=800&seed=${randomSeed}&nologo=true`;
      }
    }

    return NextResponse.json({
      success: true,
      text: generatedText,
      image_url: imageUrl
    });

  } catch (error: any) {
    console.error('AI 생성 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
