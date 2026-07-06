export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { local_llm_url } = await req.json();

    if (!local_llm_url) {
      return NextResponse.json({ success: false, error: '로컬 LLM API URL이 입력되지 않았습니다.' }, { status: 400 });
    }

    const cleanUrl = local_llm_url.replace(/\/$/, '');
    const tagsUrl = `${cleanUrl}/api/tags`;

    const response = await fetch(tagsUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Ollama 서버가 비정상 상태를 반환했습니다. (HTTP ${response.status})`
      });
    }

    const data = await response.json();
    const models = data.models || [];
    const modelNames = models.map((m: any) => m.name);

    return NextResponse.json({
      success: true,
      models: modelNames
    });

  } catch (err: any) {
    console.error('Ollama fetch models error:', err);
    return NextResponse.json({
      success: false,
      error: `모델 목록을 가져오는 중 오류가 발생했습니다. 사유: ${err.message}`
    }, { status: 500 });
  }
}
