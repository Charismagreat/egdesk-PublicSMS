export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { 
  queryTable,
  listBusinessIdentitySnapshots,
  listKnowledgeDocuments,
  getKnowledgeDocument,
  insertRows
} from '../../../../../egdesk-helpers';

/**
 * 지식 문서 본문에서 메타데이터 정보를 추출하는 헬퍼 함수
 */
function parseDocContent(content: string) {
  const result = {
    creator_id: 'sales_staff',
    dept_code: 'SALES',
    security_level: 'C',
    status: 'APPROVED_AUTO',
    autopilot_score: 90.0,
    metadata: {} as Record<string, any>,
    parsedBody: content || '',
    doc_type: 'REPORT'
  };

  if (!content) return result;

  // 메타데이터 영역 파싱
  const creatorMatch = content.match(/\*\s+\*\*작성자\*\*:\s*([^\n]+)/);
  if (creatorMatch) result.creator_id = creatorMatch[1].trim();

  const deptMatch = content.match(/\*\s+\*\*부서\*\*:\s*([^\n]+)/);
  if (deptMatch) result.dept_code = deptMatch[1].trim();

  const securityMatch = content.match(/\*\s+\*\*보안등급\*\*:\s*([^\n]+)/);
  if (securityMatch) result.security_level = securityMatch[1].trim();

  const statusMatch = content.match(/\*\s+\*\*결재상태\*\*:\s*([^\n]+)/);
  if (statusMatch) result.status = statusMatch[1].trim();

  const scoreMatch = content.match(/\*\s+\*\*파서스코어\*\*:\s*([^\n]+)/);
  if (scoreMatch) result.autopilot_score = parseFloat(scoreMatch[1].trim()) || 90.0;

  const metadataMatch = content.match(/\*\s+\*\*메타데이터\*\*:\s*([^\n]+)/);
  if (metadataMatch) {
    try {
      result.metadata = JSON.parse(metadataMatch[1].trim());
      if (result.metadata && result.metadata.doc_type) {
        result.doc_type = result.metadata.doc_type;
      }
    } catch (e) {
      console.warn('Metadata parse error:', e);
    }
  }

  // 본문 내용만 추출 (메타데이터 구분선 전까지)
  const dividerIndex = content.lastIndexOf('\n\n--- \n*   **작성자**:');
  if (dividerIndex !== -1) {
    result.parsedBody = content.substring(0, dividerIndex).trim();
  }

  return result;
}

/**
 * POST: 승인된 지식 문서를 RAG 분석하여 맞춤형 이지봇 지침 초안 생성
 */
export async function POST(req: Request) {
  try {
    // 1. 최고관리자 권한 검증 가드
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const sessionUser = decodeJwt(token);
    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '이지봇 지침 자율 생성 권한이 없습니다. 최고관리자 계정으로 진행해 주세요.' }, { status: 403 });
    }

    // 2. system_settings에서 Google API Key 및 모델 조회
    const keyRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = keyRes.rows && keyRes.rows.length > 0 ? keyRes.rows[0].value : null;

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const model = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-2.0-flash';

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: '구글 AI API Key가 등록되지 않았습니다. [시스템 설정] 또는 [AI 설정]에서 API Key를 먼저 저장해 주세요.' 
      }, { status: 400 });
    }

    // 3. 대표 스냅샷 ID 획득
    let snapshotId = 'default_snapshot';
    try {
      const snapshotListRes = await listBusinessIdentitySnapshots();
      const snapshots = snapshotListRes?.snapshots || snapshotListRes || [];
      if (snapshots && snapshots.length > 0) {
        snapshotId = snapshots[0].id || snapshots[0].uuid || snapshotId;
      }
    } catch (err) {
      console.warn('스냅샷 리스트 획득 실패:', err);
    }

    // 4. MCP 지식 저장소 문서 조회
    let approvedDocs: any[] = [];
    try {
      const docsRes = await listKnowledgeDocuments(snapshotId);
      const rawDocs = docsRes?.documents || docsRes || [];

      const detailDocs = await Promise.all(
        rawDocs.map(async (d: any) => {
          const docId = d.id || d.document_id || d.uuid;
          if (!d.content && docId) {
            try {
              const detail = await getKnowledgeDocument(docId);
              return { ...d, ...detail };
            } catch (err) {
              return d;
            }
          }
          return d;
        })
      );

      // 승인 완료된 문서만 필터링 (APPROVED_AUTO, APPROVED_MANUAL, APPROVED 등)
      approvedDocs = detailDocs
        .map((doc: any) => {
          const parsed = parseDocContent(doc.content);
          return {
            ...doc,
            ...parsed
          };
        })
        .filter((doc: any) => doc.status && doc.status.startsWith('APPROVED'));
    } catch (dbErr) {
      console.warn('knowledge_documents 조회 실패:', dbErr);
    }

    if (approvedDocs.length === 0) {
      return NextResponse.json({
        success: false,
        error: '지식관리 AI에 [승인 완료(APPROVED)]된 사내 지식 문서가 없습니다. 먼저 지식 문서 업로드 및 보안 검토 심사를 완료해 주세요.'
      }, { status: 400 });
    }

    // 5. 지식 문서 텍스트 요약 컨텍스트 빌드
    const docsContext = approvedDocs.map((doc, idx) => {
      return `[문서 ${idx + 1}]
제목: ${doc.title}
종류: ${doc.doc_type}
본문 내용:
${doc.parsedBody}
------------------------------------`;
    }).join('\n\n');

    // 6. Gemini 프롬프트 설계
    const generatorPrompt = `
당신은 사내 지식 문서를 심층 RAG 분석하여 이지봇(EasyBot) 자율 관제 시스템 설정을 자동으로 빌드해주는 비즈니스 인텔리전스 AI 모델입니다.

[요구사항]:
제공된 사내 승인 지식 문서들을 종합 분석하여 두 가지 항목을 추출해 주십시오:
1. "companyContext": 이 회사가 어떤 회사(회사명, 주요 제조/판매 품목, 주요 타겟층/납품기업, 비즈니스 핵심 리스크 및 취약점 등)인지를 설명하는 정규화된 텍스트.
2. "agentInstructions": 데이터베이스 변경 이벤트를 실시간 감지할 때 AI 이지봇이 취해야 할 위험 감지 수칙 및 후속 조치 지침. 
   - 예: "1. crm_expenses 테이블에 심야 시간대 결제나 한도 초과 감지 시 경고 스냅태스크 생성 및 재무 담당자 배정"
   - 예: "2. crm_orders 테이블에 대량 수주 발생 시 자재 수급 및 안전재고(products 테이블) 대사 요청"
   - 각 규칙을 번호 매겨서 줄바꿈 형태로 적절히 작성해 주세요.

[분석 대상 사내 지식 문서 목록]:
${docsContext}

반드시 다음의 JSON 규격으로만 응답해 주세요. 다른 일반 텍스트 설명은 배제하십시오.
{
  "companyContext": "회사의 비즈니스 소개글 정보",
  "agentInstructions": "1. 이벤트 감지 룰 1\\n2. 이벤트 감지 룰 2\\n3. 이벤트 감지 룰 3"
}
`;

    // 7. Gemini API 호출
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "당신은 사내 지식을 완벽히 이해하고 이지봇 비즈니스 규칙과 회사 소개를 요약하는 똑똑한 어시스턴트입니다." }] },
        contents: [{ role: 'user', parts: [{ text: generatorPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API 호출 중 오류가 발생했습니다.');
    }

    const resData = await response.json();
    const resultText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // AI 토큰 사용량 로깅
    try {
      const prompt_tokens = resData.usageMetadata?.promptTokenCount || 0;
      const completion_tokens = resData.usageMetadata?.candidatesTokenCount || 0;
      const total_tokens = resData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('ai_token_usage_logs', [{
        id: logId,
        model: model || 'gemini-3.5-flash',
        purpose: 'EASYBOT_SETUP',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }

    let parsedResult = { companyContext: "", agentInstructions: "" };
    try {
      parsedResult = JSON.parse(resultText);
    } catch (jsonErr) {
      console.error('Gemini 결과 JSON 파싱 실패:', resultText);
      return NextResponse.json({ 
        success: false, 
        error: 'AI가 반환한 결과를 처리하지 못했습니다. 다시 시도해 주세요.' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      companyContext: parsedResult.companyContext || "추출된 회사 정보가 없습니다.",
      agentInstructions: parsedResult.agentInstructions || "추출된 작동 지침이 없습니다."
    });

  } catch (error: any) {
    console.error('EasyBot Setup Generator API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
