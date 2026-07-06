import { NextResponse } from 'next/server';
import { fetchGeminiWithFallback } from '../../../../../lib/gemini-fallback';
import { queryTable, getGeminiApiKey } from '@/../egdesk-helpers';
import crypto from 'crypto';

export const maxDuration = 60; // 60초 타임아웃
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file = data.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: '파일이 없습니다.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // 0. 파일 해시 기반 1단계 중복 등록 원천 차단
    const fileHash = crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
    console.log(`[DEBUG OCR] file.name: "${file.name}", size: ${file.size}, type: "${file.type}"`);
    console.log(`[DEBUG OCR] calculated fileHash: "${fileHash}", buffer length: ${buffer.byteLength}`);

    // SHA-256 해시 규격 검증 가드 (64자리 16진수)
    const isSha256 = /^[a-fA-F0-9]{64}$/.test(fileHash);
    
    if (isSha256) {
      const duplicateRes = await queryTable('crm_inventory_inbounds', { filters: { file_hash: fileHash } });
      console.log(`[DEBUG OCR] duplicateRes:`, JSON.stringify(duplicateRes));

      let duplicateRows = duplicateRes.rows || [];
      // 드라이버 필터 누락 가능성을 차단하기 위해 메모리 상에서 해시값 일치 및 소프트 삭제 여부 2차 교차 필터링
      duplicateRows = duplicateRows.filter((r: any) => 
        r.file_hash && 
        r.file_hash.toLowerCase() === fileHash.toLowerCase() && 
        !r.deleted_at
      );

      if (duplicateRows.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'DUPLICATE_FILE',
          message: '이미 입고 완료 처리된 동일한 명세서 파일입니다.'
        });
      }
    }

    // 1. DB에서 구글 AI 설정 정보 로드 및 이지데스크 연동 키 조회
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    let googleApiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    // 만약 DB에 키가 없거나 실물 구글 API 키 형식이 아닌 경우 (SaaS 환경 / ai-caller 활용 등)
    // 이지데스크 프록시를 통해 복호화된 키를 수신하여 구동합니다.
    if (!googleApiKey || !googleApiKey.startsWith('AIzaSy')) {
      try {
        const decryptedKeyRes = await getGeminiApiKey({ name: googleApiKey || '' });
        if (decryptedKeyRes && decryptedKeyRes.success && decryptedKeyRes.apiKey) {
          googleApiKey = decryptedKeyRes.apiKey;
        }
      } catch (keyErr: any) {
        console.error('⚠️ EGDesk에서 실제 구글 API 키를 해독해오는 데 실패했습니다:', keyErr.message);
      }
    }

    // 여전히 키가 없다면 이지데스크가 중계할 수 있도록 'wonconduct'로 폴백 세팅합니다.
    const apiKey = googleApiKey || 'wonconduct';

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-3.5-flash';

    // 2. 사내 품목 대장 사전 정보를 로딩하여 Fuzzy 매칭 정확도 향상 유도 (type 컬럼도 함께 전송)
    const itemsRes = await queryTable('inventory_items', {});
    const masterItems = (itemsRes && itemsRes.rows) ? itemsRes.rows : [];
    const itemReferenceText = masterItems.map((it: any) => 
      `- ID: ${it.id}, 품목명: ${it.name}, 규격: ${it.spec || ''}, 바코드: ${it.barcode || ''}, 구분: ${it.type || '자재'}`
    ).join('\n');

    // 3. Gemini Vision OCR 프롬프트 작성
    const prompt = `
제시된 거래명세서, 영수증, 또는 인보이스 이미지(PDF)에서 입고 처리용 명세 정보를 정확하게 추출하십시오.
최종 결과물은 반드시 아래 명시된 **순수 JSON 포맷**으로만 반환되어야 하며, 마크다운 코드 블록(\`\`\`json 등)이나 다른 텍스트는 절대 포함하지 마십시오.

### 📌 사내 등록 품목 대장 레퍼런스:
아래는 현재 시스템에 등록되어 있는 실제 품목들의 목록입니다. 이미지 속 품명과 가장 일치하거나 유사한 품목이 있으면 해당 품목의 ID(matchedItemId)를 매핑해 주십시오.
${itemReferenceText}

### 📌 추출 대상 및 JSON 구조 지침:
1. **partnerName**: 공급자(매출처, 납품자)의 상호명/업체명입니다. (문서 내에 기재가 없는 경우 빈 문자열 ""을 주입하십시오.)
2. **inboundDate**: 입고일자(거래일자)를 표준 "YYYY-MM-DD" 형태로 출력하십시오. (문서 내에 기재가 없으면 오늘 날짜를 지정하십시오.)
3. **originalTotalAmount**: 명세서상에 인쇄/기재된 최종 총 합계금액(공급가액 + 부가세 또는 최종 영수합계액)을 정수 숫자로 추출해 주십시오. (기재가 없거나 파싱 불능 시 0을 주입하십시오.)
4. **originalTotalQuantity**: 명세서상에 인쇄/기재된 최종 합계 수량(모든 품목의 수량을 합산한 총 수량 값)을 정수 숫자로 추출해 주십시오. (기재가 없거나 파싱 불능 시 0을 주입하십시오.)
5. **items**: 입고된 품목들의 배열입니다.
   - **itemName**: 품목의 이름
   - **spec**: 규격
   - **barcode**: 바코드 (있을 시 추출, 없으면 "")
   - **quantity**: 입고 수량 (숫자 정수)
   - **price**: 입고 단가 (숫자 정수)
   - **matchedItemId**: 위 '사내 등록 품목 대장 레퍼런스' 중 가장 일치하는 품목의 ID(숫자)를 적어주십시오. 신규 등록 품목인 경우 "NEW"를 기입하십시오.
   - **itemType**: 품목의 구분입니다. 반드시 "자재" 또는 "제품" 중 하나여야 합니다. 만약 'matchedItemId'가 기존 품목과 매핑되었다면 해당 레퍼런스 품목의 '구분' 값을 그대로 채워주십시오. 만약 신규 품목("NEW")인 경우, 품목명과 가격의 성격(예: 부품, 원단, 칩, 메모리 등은 "자재" / 완성된 기기, 세트 상품 등은 "제품")을 지능적으로 추론하여 지정하십시오.
    - **note**: 매핑에 사용되지 않은 다른 열들의 이름과 셀 데이터 전체를 기재해 주십시오. (예: "포장단위: 10개입, 제조사: 삼성" - **CRITICAL**: 이 필드에 실제 줄바꿈을 절대 포함하지 말고 필요시 "\\\\n" 문자열로 이스케이프 처리하십시오.)

최종 반환 JSON 형식:
{
  "partnerName": "공급사 상호명",
  "inboundDate": "YYYY-MM-DD",
  "originalTotalAmount": 4207880,
  "originalTotalQuantity": 11,
  "items": [
    {
      "itemName": "품목명",
      "spec": "규격",
      "barcode": "바코드 번호",
      "quantity": 10,
      "price": 25000,
      "matchedItemId": 12,
      "itemType": "자재",
      "note": "비고 및 미매핑 필드 정보"
    }
  ]
}
Do NOT output anything other than this JSON string. No markdown block wrapper.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          temperature: 0.7,
          responseSchema: {
            type: "OBJECT",
            properties: {
              partnerName: { type: "STRING" },
              inboundDate: { type: "STRING" },
              originalTotalAmount: { type: "INTEGER" },
              originalTotalQuantity: { type: "INTEGER" },
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    itemName: { type: "STRING" },
                    spec: { type: "STRING" },
                    barcode: { type: "STRING" },
                    quantity: { type: "INTEGER" },
                    price: { type: "INTEGER" },
                    matchedItemId: { type: "STRING" },
                    itemType: { type: "STRING" },
                    note: { type: "STRING" }
                  },
                  required: ["itemName", "quantity", "price"]
                }
              }
            },
            required: ["partnerName", "items"]
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini OCR API 통신 실패: HTTP ${response.status}`);
    }

    const aiData = await response.json();
    let responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 응답 정제 (혹시 있을 수 있는 마크다운 블록 래퍼 제거)
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsedOcr = JSON.parse(responseText);

      // 2차 거래 메타데이터 조합 중복 검사
      let isMetaDuplicate = false;
      if (parsedOcr.partnerName && parsedOcr.inboundDate) {
        const metaMatchRes = await queryTable('crm_inventory_inbounds', {
          filters: {
            partner_name: parsedOcr.partnerName,
            inbound_date: parsedOcr.inboundDate,
            total_amount: String(Number(parsedOcr.originalTotalAmount) || 0)
          }
        });
        if (metaMatchRes.rows && metaMatchRes.rows.length > 0) {
          isMetaDuplicate = true;
        }
      }

      return NextResponse.json({
        success: true,
        partnerName: parsedOcr.partnerName || '',
        inboundDate: parsedOcr.inboundDate || new Date(Date.now() + 9*60*60*1000).toISOString().slice(0, 10),
        originalTotalAmount: Number(parsedOcr.originalTotalAmount) || 0,
        originalTotalQuantity: Number(parsedOcr.originalTotalQuantity) || 0,
        isMetaDuplicate,
        fileHash,
        items: parsedOcr.items || []
      });
    } catch (parseError) {
      console.error('AI 응답 파싱 실패. 원본 응답:', responseText);
      return NextResponse.json({
        success: false,
        error: 'AI 분석 결과가 올바른 JSON 형식이 아닙니다.',
        rawResponse: responseText
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('자율 입고 AI OCR 처리 중 오류 발생:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '이미지 분석 도중 서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
