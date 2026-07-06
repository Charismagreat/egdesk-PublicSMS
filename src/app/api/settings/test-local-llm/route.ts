export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { local_llm_url, local_llm_model } = await req.json();

    if (!local_llm_url) {
      return NextResponse.json({ success: false, error: '로컬 LLM API URL이 입력되지 않았습니다.' }, { status: 400 });
    }

    if (!local_llm_model) {
      return NextResponse.json({ success: false, error: '검증할 로컬 모델명이 지정되지 않았습니다.' }, { status: 400 });
    }

    // 1. Ollama의 /api/tags 엔드포인트를 호출하여 로컬 서버 상태 및 다운로드된 모델 목록 조회
    const cleanUrl = local_llm_url.replace(/\/$/, '');
    const tagsUrl = `${cleanUrl}/api/tags`;

    let response: Response;
    try {
      response = await fetch(tagsUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        // 5초 타임아웃 방어 (Next.js fetch options)
        signal: AbortSignal.timeout(5000)
      });
    } catch (fetchErr: any) {
      console.error('Ollama connection test failed:', fetchErr);
      return NextResponse.json({
        success: false,
        error: `로컬 LLM(Ollama) 서버와 연결할 수 없습니다. 서버가 구동 중인지, 혹은 URL(${cleanUrl})이 올바른지 점검해 주세요. (에러: ${fetchErr.message})`
      });
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Ollama 서버가 비정상 상태를 반환했습니다. (HTTP ${response.status})`
      });
    }

    const data = await response.json();
    const models = data.models || [];

    // 2. 사용자가 지정한 모델명이 리스트에 존재하는지 검사 (대소문자 및 태그 무관 매칭 방어)
    const normalizedModel = local_llm_model.trim().toLowerCase();
    const hasModel = models.some((m: any) => {
      const name = String(m.name || '').toLowerCase();
      // 'gemma2' 입력 시 'gemma2:latest' 등 접미사(tag)를 포함하고 있거나 완전히 일치하는지 체크
      return name === normalizedModel || name.startsWith(`${normalizedModel}:`) || normalizedModel.startsWith(`${name}:`);
    });

    if (!hasModel) {
      const availableModelsText = models.map((m: any) => m.name).join(', ') || '없음';
      return NextResponse.json({
        success: false,
        error: `로컬 LLM 서버와 정상적으로 연결되었으나, 지정한 모델('${local_llm_model}')을 찾을 수 없습니다. 로컬 터미널에서 'ollama run ${localLlmModelName(local_llm_model)}'을 기동하여 모델을 먼저 다운로드해 주세요. (현재 다운로드된 모델: [${availableModelsText}])`
      });
    }

    return NextResponse.json({
      success: true,
      message: `로컬 LLM(Ollama) 서버 및 모델('${local_llm_model}') 연결 확인에 성공했습니다.`
    });

  } catch (err: any) {
    console.error('Ollama connection test controller error:', err);
    return NextResponse.json({
      success: false,
      error: `서버 내부 에러가 발생했습니다. 사유: ${err.message}`
    }, { status: 500 });
  }
}

/**
 * 사용자 입력 모델명에 적절한 기본 태그(:latest 등) 보정 도우미
 */
function localLlmModelName(model: string): string {
  if (!model.includes(':')) {
    return `${model}:latest`;
  }
  return model;
}
