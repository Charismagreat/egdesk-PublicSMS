import { NextResponse } from 'next/server';
import { gmAutomation } from '@/lib/google-messages';
import { insertRows } from '@/../egdesk-helpers';

// Next.js 개발 중 핫 리로드 시 유실되지 않도록 글로벌 객체에 바인딩
const otpStore = (global as any).otpStore || new Map<string, { code: string; expiresAt: number }>();
if (process.env.NODE_ENV !== 'production') {
  (global as any).otpStore = otpStore;
}

/**
 * 적립 포인트 사용을 위한 SMS 2차 OTP 보안 인증 API 엔드포인트
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, phone, code } = body;
    
    if (!phone) {
      return NextResponse.json({
        success: false,
        error: '휴대전화번호(phone)가 필요합니다.'
      }, { status: 400 });
    }
    
    const formattedPhone = phone.trim().replace(/[^0-9]/g, '');
    
    // ==========================================
    // 1. OTP 발송 처리 (action === 'send')
    // ==========================================
    if (action === 'send') {
      // 4자리 난수 인증코드 생성
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = Date.now() + 3 * 60 * 1000; // 3분 유효
      
      // 스토어에 임시 보관
      otpStore.set(formattedPhone, { code: otpCode, expiresAt });
      
      const message = `[이지데스크] 포인트 결제 사용 승인 인증번호는 [${otpCode}] 입니다. (3분 이내 입력)`;
      
      // Google Messages RPA 발송 연동
      const result = await gmAutomation.sendSMS(formattedPhone, message);
      
      // DB 발송 내역에 안전하게 로그 적재
      const now = new Date().toISOString();
      const logId = Math.floor(Math.random() * 1000000);
      
      await insertRows('message_logs', [{
        id: logId,
        customer_id: null,
        phone: formattedPhone,
        message: message,
        status: result.success ? 'SUCCESS' : 'FAILED',
        created_at: now
      }]).catch((e: any) => console.error('OTP 발송 로그 DB 적재 실패:', e.message));
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: `인증번호 전송에 실패하였습니다: ${result.error}`
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: '인증번호가 문자로 정상 발송되었습니다.'
      });
    } 
    
    // ==========================================
    // 2. OTP 검증 처리 (action === 'verify')
    // ==========================================
    else if (action === 'verify') {
      if (!code) {
        return NextResponse.json({
          success: false,
          error: '인증코드(code)가 필요합니다.'
        }, { status: 400 });
      }
      
      const cached = otpStore.get(formattedPhone);
      
      if (!cached) {
        return NextResponse.json({
          success: false,
          error: '발급된 인증번호가 없거나 만료되었습니다. 다시 발송해 주세요.'
        }, { status: 400 });
      }
      
      if (Date.now() > cached.expiresAt) {
        otpStore.delete(formattedPhone); // 만료값 제거
        return NextResponse.json({
          success: false,
          error: '인증 유효시간(3분)이 만료되었습니다. 다시 발송해 주세요.'
        }, { status: 400 });
      }
      
      if (cached.code !== code.trim()) {
        return NextResponse.json({
          success: false,
          error: '인증번호가 일치하지 않습니다. 정확히 입력해 주세요.'
        }, { status: 400 });
      }
      
      // 검증 성공 시 세션/보관 정보에서 일시 안전 소멸 처리
      otpStore.delete(formattedPhone);
      
      return NextResponse.json({
        success: true,
        message: '휴대전화 본인 인증에 성공하였습니다.'
      });
    }
    
    // 지원하지 않는 액션
    return NextResponse.json({
      success: false,
      error: '올바르지 않은 액션(action)입니다.'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('포인트 OTP 인증 처리 중 예외 발생:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
