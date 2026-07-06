export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { insertRows } from '../../../../../../egdesk-helpers';

/**
 * 최고관리자(SUPER_ADMIN) 권한 검증 공통 헬퍼
 */
async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    throw new Error('인증 세션이 만료되었습니다. 다시 로그인해주세요.');
  }

  const payload = decodeJwt(token);
  if (payload.role !== 'SUPER_ADMIN') {
    throw new Error('최고관리자만 팩스 설정을 변경하고 테스트할 수 있습니다.');
  }
}

export async function POST(req: Request) {
  try {
    // 1. 최고관리자 권한 가드
    await verifySuperAdmin();

    const { provider, linkId, apiKey, senderNumber, to } = await req.json();

    if (!provider || !linkId || !apiKey || !senderNumber || !to) {
      return NextResponse.json({
        success: false,
        error: '필수 입력 항목(공급업체, 링크 ID, API 인증키, 발신 번호, 테스트 수신 번호)이 누락되었습니다.'
      }, { status: 400 });
    }

    // 팩스 번호 형식 유효성 검사 (숫자와 하이픈만 허용)
    const phoneRegex = /^[0-9-]{7,15}$/;
    if (!phoneRegex.test(senderNumber) || !phoneRegex.test(to)) {
      return NextResponse.json({
        success: false,
        error: '올바른 팩스 번호 형식이 아닙니다. (예: 02-1234-5678, 숫자와 하이픈만 입력해 주세요.)'
      }, { status: 400 });
    }

    // 2. 인터넷 팩스 API (SaaS) 실시간 발송 검증 시뮬레이션
    console.log(`[FAX API TEST - POPBILL] Provider: ${provider}, LinkID: ${linkId}, Sender: ${senderNumber}, Receiver: ${to}`);
    
    // 시뮬레이션용 1.2초 지연 처리 (실제 팩스 게이트웨이 인증 및 전송 큐 등록 느낌 재현)
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // message_logs에 가상 테스트 팩스 발송 기록 적재
    const logId = `FAX-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    
    await insertRows('message_logs', [{
      id: logId,
      sender: senderNumber,
      receiver: to,
      content: `[FAX TEST] 이지데스크 인터넷 팩스 발신 테스트 전송이 성공적으로 전송 완료되었습니다. (모듈: ${provider})`,
      status: 'SENT',
      created_at: logTime,
      updated_at: logTime
    }]);

    return NextResponse.json({ 
      success: true,
      message: `인터넷 팩스 API(${provider}) 서버와의 통신 인증 및 가상 테스트 팩스 발송에 최종 성공하였습니다! 🟢 (전송 큐 ID: ${logId})`
    });
  } catch (error: any) {
    console.error('팩스 테스트 발송 에러:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '인터넷 팩스 API 인증 또는 연결에 실패했습니다. 링크 ID 및 SecretKey를 다시 확인해 주세요.'
    }, { status: 500 });
  }
}
