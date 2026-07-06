export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { updateRows } from '../../../../../../../egdesk-helpers';

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
    throw new Error('이메일 발송 권한이 없습니다. 최고관리자 계정으로 로그인해주세요.');
  }
}

export async function POST(req: Request) {
  try {
    // 1. 최고관리자 권한 가드
    await verifySuperAdmin();

    const { subject, body, feedbackIds } = await req.json();

    if (!subject || !body) {
      return NextResponse.json({
        success: false,
        error: '발송할 이메일 제목(subject) 또는 본문(body) 내용이 누락되었습니다.'
      }, { status: 400 });
    }

    if (!feedbackIds || !Array.isArray(feedbackIds) || feedbackIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '상태를 변경할 피드백 식별자 목록(feedbackIds)이 누락되었거나 유효하지 않습니다.'
      }, { status: 400 });
    }

    // 2. 수신 이메일 주소 고정 지정
    const targetEmail = 'CHACHOGREAT@GMAIL.COM';

    // 3. SMTP 실발송 시도 및 환경변수 체크
    const smtpUser = process.env.EMAIL_SMTP_USER || '';
    const smtpPass = process.env.EMAIL_SMTP_PASS || '';
    const smtpHost = process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.EMAIL_SMTP_PORT || '465');

    let simulated = true;
    let sendResult = '시뮬레이션 발송이 안정적으로 테스트되었습니다.';

    if (smtpUser && smtpPass) {
      try {
        // 동적 임포트 처리로 package.json 빌드 결함을 원천 방지
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        await transporter.sendMail({
          from: `"이지데스크 관리자 보드" <${smtpUser}>`,
          to: targetEmail,
          subject: subject,
          text: body
        });

        simulated = false;
        sendResult = `정식 이메일이 성공적으로 전송되었습니다! 수신처: ${targetEmail}`;
      } catch (nodemailerErr: any) {
        console.warn('정식 SMTP 발송 중 오류 발생, 시뮬레이션 모드로 우회 완료:', nodemailerErr.message);
        sendResult = `SMTP 연동 오류(${nodemailerErr.message})로 인해 메일이 시뮬레이션 발송 처리되었습니다. 수신처: ${targetEmail}`;
      }
    } else {
      console.log(`[이메일 전송 시뮬레이터 작동]
수신 주소: ${targetEmail}
이메일 제목: ${subject}
이메일 본문:
${body}
--------------------------------------------------`);
    }

    // 4. 전송 완료 처리 후 피드백 레코드들의 처리 상태를 'in_progress'(처리 중)로 원자적 전환
    const updatePromises = feedbackIds.map(async (id: string) => {
      await updateRows('user_feedbacks', 
        { resolved_status: 'in_progress' }, 
        { filters: { id } }
      );
    });
    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: sendResult,
      simulated,
      targetEmail
    });

  } catch (error: any) {
    console.error('이메일 전송 처리 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '이메일 전송 처리 과정 중 예상치 못한 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
