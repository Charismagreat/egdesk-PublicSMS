import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { callAI } from '@/lib/ai-router';

export const dynamic = 'force-dynamic';

// 🔑 최고관리자 권한 검증 헬퍼
async function verifySuperAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return false;
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    return role === 'SUPER_ADMIN';
  } catch (e) {
    return false;
  }
}

// 📂 [POST] 자연어 질문을 정교한 SQLite SQL 쿼리로 실시간 번역 (공통 AI 라우터 탑재)
export async function POST(request: Request) {
  try {
    const isAuthorized = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const { prompt, tablesSchema } = await request.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: '번역할 자연어 요청(prompt)이 누락되었습니다.' }, { status: 400 });
    }

    // 1. 데이터베이스 스키마 요약 문자열 조립 (AI 전송 컨텍스트)
    const schemaSummary = Array.isArray(tablesSchema) 
      ? tablesSchema.map((t: any) => `- 테이블명: "${t.name}" (실시간 레코드: ${t.count}개)`).join('\n')
      : '테이블 정보가 존재하지 않습니다.';

    // 2. AI 전용 시스템 지침 (System Instruction) 구성
    const systemPrompt = `
너는 최고의 SQLite3 데이터베이스 전문가이자, 이지데스크(EGDesk) 서버의 비즈니스 데이터 어시스턴트야.
사용자가 한글 자연어로 요청한 비즈니스 데이터 요구사항을 분석하여, 데이터베이스에 바로 날릴 수 있는 **오류 없는 단 하나의 SQLite3 SQL 쿼리**로 번역하는 것이 너의 의무야.

[중요 제약 조건]
1. 반드시 아래에 나열된 실제 테이블명만을 기반으로 쿼리를 작성해야 해. 임의로 가상의 테이블이나 존재하지 않는 테이블을 유추해내서는 절대 안 돼!
2. 모든 문자열 비교나 컬럼 매핑 시, 제공된 스키마에 부합하는 형태로 쿼리를 가공해. (예: 대소문자나 컬럼명 정확히 매치)
3. SQLite3에 최적화된 SQL 구문이어야 해. MySQL이나 PostgreSQL 전용 구문을 쓰면 컴파일 에러가 나니 주의해. (예: 데이터 형식, 내장 함수 등)
4. 응답은 반드시 유효한 JSON 형식으로만 응답해야 하며, 그 외의 주석, 설명, 백틱(\`\`\`) 마크다운 등은 일체 포함되어서는 안 돼.

[실시간 가동 가능한 데이터베이스 테이블 목록]
${schemaSummary}

[출력 형식 예시 - 오직 이 포맷으로만 응답]
{
  "sql": "SELECT * FROM crm_expenses ORDER BY id DESC LIMIT 5;"
}
`;

    // 3. 공통 AI 라우터를 경유하여 호출 (스마트 하이브리드 분기 및 로깅 연동)
    const aiResult = await callAI({
      prompt: `사용자 자연어 요청: "${prompt}"`,
      systemPrompt,
      purpose: 'easybot-sql-generation', // 통계 대시보드 purpose 매핑
      responseMimeType: 'application/json',
      temperature: 0.2 // 정확도 극대화를 위해 온도를 매우 낮춤
    });

    const rawText = aiResult.text || '{}';
    
    // JSON 안전 분석
    let resultSql = "";
    try {
      const parsed = JSON.parse(rawText.trim());
      resultSql = parsed.sql || "";
    } catch (e) {
      // JSON 파싱 실패 대비 폴백 구문 추출 (정규식 기반)
      const match = rawText.match(/"sql"\s*:\s*"([^"]+)"/);
      if (match) {
        resultSql = match[1];
      } else {
        resultSql = rawText;
      }
    }

    return NextResponse.json({ 
      success: true, 
      sql: resultSql 
    });

  } catch (error: any) {
    console.error('AI SQL Translate Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
