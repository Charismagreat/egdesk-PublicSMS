import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64, rawGoogleApiKey } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: '분석할 파일 데이터(Base64)가 누락되었습니다.' }, { status: 400 });
    }
    if (!rawGoogleApiKey || !rawGoogleApiKey.startsWith('AIzaSy')) {
      return NextResponse.json({ success: false, error: '유효한 구글 API 키(AIzaSy...)를 입력해 주세요.' }, { status: 400 });
    }

    const base64Image = imageBase64.replace(/^data:(image\/(png|jpeg|jpg|webp|heic|heif)|application\/pdf);base64,/, "");
    const mimeType = imageBase64.match(/^data:(image\/(png|jpeg|jpg|webp|heic|heif)|application\/pdf);base64,/)?.[1] || 'image/jpeg';

    const cleanInstruction = `
You are a highly advanced AI OCR scanner. 
Your job is to look at the provided image (which is a supply estimate / purchase order) and extract all the text and structured information you can see.
Write a clear markdown report of:
1. Buyer Company Name
2. Supplier Company Name
3. Representative Name
4. Items List with quantity and unit price
5. Document Number and Date
6. Memo and Remarks
`;

    // 📌 이지데스크 중계기를 완전히 우회하고 구글 Gemini API 직접 호출 실행
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${rawGoogleApiKey}`;

    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: cleanInstruction },
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
          responseMimeType: "text/plain"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ success: false, error: `구글 직접 통신 실패 (HTTP ${response.status}): ${errText}` }, { status: response.status });
    }

    const aiData = await response.json();
    const responseRawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '응답 텍스트를 파싱하지 못했습니다.';

    return NextResponse.json({
      success: true,
      raw_ocr_result: responseRawText,
      method: 'DIRECT_GOOGLE_API_OCR'
    });

  } catch (error: any) {
    console.error('Direct Google API debug OCR error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
