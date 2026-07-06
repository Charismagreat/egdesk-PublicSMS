import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// 세션 검증 헬퍼
async function verifySession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return { isAuthorized: false, role: 'GUEST', name: 'Unknown', operatorId: null };
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    const operatorId = Number(payload.id) || null;
    
    return {
      isAuthorized: role === 'SUPER_ADMIN' || role === 'OPERATOR',
      role,
      name,
      operatorId
    };
  } catch (e) {
    return { isAuthorized: false, role: 'GUEST', name: 'Unknown', operatorId: null };
  }
}

export async function POST(req: Request) {
  try {
    // 1. 세션 권한 검증
    const { isAuthorized } = await verifySession();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 로그인이 필요합니다.' }, { status: 403 });
    }

    // 2. FormData 파싱
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ success: false, error: '업로드할 PDF 파일이 누락되었습니다.' }, { status: 400 });
    }

    // 3. 파일 저장 경로 설정 및 디렉토리 생성
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'financials');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = path.extname(file.name);
    const fileName = `financial_${Date.now()}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    // 파일 로컬 저장
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, fileBuffer);

    const relativePath = `/uploads/financials/${fileName}`;

    // 4. Gemini API Key 및 Model 조회
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: '구글 AI API 키가 시스템에 설정되지 않았습니다. [시스템 설정 > AI 설정]에서 입력해 주세요.'
      }, { status: 400 });
    }

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-2.5-flash';

    // 5. PDF 파일을 Base64로 인코딩하여 Gemini API 요청
    const pdfBase64 = fileBuffer.toString('base64');

    const promptText = `
이 PDF 문서는 국세청 표준 재무제표(재무상태표, 손익계산서 등)입니다.
문서 전체의 텍스트와 숫자 테이블을 정밀하게 해독 및 분석하여, 다음 핵심 6대 지표 수치, 대상 기업명, 회계연도와 함께 **문서에 포함된 모든 상세 계정과목(자산, 부채, 자본, 매출/수익, 비용/지출 항목) 목록**을 추출하여 JSON 형식으로만 반환해 주세요.

모든 금액 수치는 반드시 원화(KRW) 단위 정수로 기입해야 하며, 만약 원본 문서 내에서 단위가 백만원(백만) 또는 천원(천) 등으로 표기되어 있다면 정확하게 원 단위로 환산(예: 150백만 -> 150000000)해야 합니다.
특정 수치가 도저히 존재하지 않거나 식별 불가능한 경우에는 0으로 지정해 주세요.

상세 계정과목(detailedItems) 분류(category) 규칙:
- 자산 항목: 'ASSETS'
- 부채 항목: 'LIABILITIES'
- 자본 항목: 'EQUITY'
- 매출 및 수익 항목: 'REVENUE'
- 비용 및 지출 항목(급여, 복리후생비, 임차료, 감가상각비 등): 'EXPENSES'

JSON 출력 형식 예시 (이 구조와 정확히 동일해야 함):
{
  "companyName": "대상 기업명",
  "fiscalYear": 2025,
  "fiscalQuarter": "YR",
  "totalAssets": 120000000,
  "totalLiabilities": 80000000,
  "totalEquity": 40000000,
  "revenue": 150000000,
  "operatingIncome": 12000000,
  "netIncome": 9000000,
  "detailedItems": [
    { "category": "ASSETS", "accountName": "현금및현금성자산", "amount": 20000000 },
    { "category": "LIABILITIES", "accountName": "단기차입금", "amount": 30000000 },
    { "category": "EXPENSES", "accountName": "급여", "amount": 15000000 },
    { "category": "EXPENSES", "accountName": "복리후생비", "amount": 3000000 }
  ]
}
`;

    console.log(`[Gemini PDF OCR] Model: ${selectedModel} 호출 시작...`);
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBase64
                }
              },
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API 호출 중 오류가 발생했습니다.');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // AI 토큰 사용량 로깅
    try {
      const prompt_tokens = data.usageMetadata?.promptTokenCount || 0;
      const completion_tokens = data.usageMetadata?.candidatesTokenCount || 0;
      const total_tokens = data.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('ai_token_usage_logs', [{
        id: logId,
        model: selectedModel || 'gemini-3.5-flash',
        purpose: 'FINANCIAL_STATEMENT_OCR',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }
    
    let parsedResult = {
      companyName: '',
      fiscalYear: new Date().getFullYear() - 1,
      fiscalQuarter: 'YR',
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      revenue: 0,
      operatingIncome: 0,
      netIncome: 0,
      detailedItems: [] as Array<{ category: string, accountName: string, amount: number }>
    };

    try {
      parsedResult = JSON.parse(text.trim());
    } catch (e) {
      console.error('Gemini JSON 파싱 오류:', text);
      return NextResponse.json({
        success: false,
        error: 'Gemini AI의 분석 결과 형식(JSON)이 올바르지 않습니다. 다시 한 번 시도해 주세요.',
        rawText: text
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '국세청 재무제표 PDF를 성공적으로 파싱했습니다.',
      filePath: relativePath,
      data: parsedResult
    });

  } catch (error: any) {
    console.error('Financials Upload API Error:', error);
    return NextResponse.json({ success: false, error: error.message || '서버 내부 에러가 발생했습니다.' }, { status: 500 });
  }
}
