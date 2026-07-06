export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

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
    throw new Error('최고관리자만 SMTP 설정을 변경하고 테스트할 수 있습니다.');
  }
}

export async function POST(req: Request) {
  try {
    // 1. 최고관리자 권한 가드
    await verifySuperAdmin();

    const { host, port, user, pass, to } = await req.json();

    if (!host || !port || !user || !pass || !to) {
      return NextResponse.json({
        success: false,
        error: '필수 입력 항목(호스트, 포트, 계정, 비밀번호, 테스트 수신 메일)이 누락되었습니다.'
      }, { status: 400 });
    }

    // 2. Nodemailer를 통한 실시간 SMTP 발송 검증
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: parseInt(port) === 465, // 465 포트는 SSL 암호화 연결 사용
      auth: {
        user,
        pass
      },
      connectionTimeout: 10000 // 연결 대기 시간 10초 제한
    });

    await transporter.sendMail({
      from: `"이지데스크 SMTP 테스트" <${user}>`,
      to,
      subject: '[이지데스크] 발송 메일 SMTP 연결 테스트 성공 🟢',
      html: `
        <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
          <h2 style="color: #10b981; margin-top: 0;">🟢 SMTP 연결 성공!</h2>
          <p style="font-size: 14px; color: #334155;">이지데스크 시스템 설정에서 입력하신 SMTP 정보가 성공적으로 검증되었습니다.</p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 15px 0;" />
          <ul style="font-size: 12px; color: #475569; padding-left: 20px; line-height: 1.6;">
            <li><b>메일 서버 호스트:</b> ${host}</li>
            <li><b>메일 서버 포트:</b> ${port}</li>
            <li><b>테스트 인증 계정:</b> ${user}</li>
          </ul>
          <p style="font-size: 11px; color: #94a3b8; margin-bottom: 0;">※ 본 메일은 메일 발송 서버의 유효성을 실시간 검증하기 위해 전송된 테스트 메일입니다.</p>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('SMTP 테스트 발송 에러:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'SMTP 연결 및 메일 발송에 실패했습니다. 호스트, 포트, 패스워드를 다시 확인해 주세요.'
    }, { status: 500 });
  }
}
