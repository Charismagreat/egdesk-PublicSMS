import { NextResponse } from 'next/server';

// 💡 하위 호환성을 위해 기존 엔드포인트를 유지하며, 내부 요청은 신설된 공용 AI 도움말 API(/api/ai/contextual-help)로 포워딩합니다.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Node 환경에서의 절대 경로 fetch 처리를 위해 NEXT_PUBLIC_EGDESK_API_URL 또는 localhost 포트 4000 사용
    const baseUrl = process.env.NEXT_PUBLIC_EGDESK_API_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/api/ai/contextual-help`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...body,
        pagePath: body.pagePath || '/expenses' // 기존 지출관리 요청에는 pagePath가 누락되어 있을 수 있으므로 기본값 매핑
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || '공용 AI 도움말 API 호출 실패');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('기존 지출관리 도움말 API 위임 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
