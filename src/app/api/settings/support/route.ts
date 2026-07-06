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
    throw new Error('기술 지원 요청 권한이 없습니다. 최고관리자 계정으로 로그인해주세요.');
  }
}

export async function POST(req: Request) {
  try {
    // 1. 최고관리자 권한 가드
    await verifySuperAdmin();

    const {
      subject,
      body,
      supportType,
      preferredDate,
      preferredTime,
      companyName,
      position,
      requesterName,
      requesterPhone,
      requesterEmail
    } = await req.json();

    if (!subject || !body || !companyName || !requesterName || !requesterPhone || !requesterEmail) {
      return NextResponse.json({
        success: false,
        error: '필수 입력 항목(제목, 내용, 회사명, 요청자명, 연락처, 이메일)이 누락되었습니다.'
      }, { status: 400 });
    }

    // 수신 이메일 주소 고정 (사용자 요청에 맞춰 chachogreat@gmail.com으로 설정)
    const targetEmail = 'chachogreat@gmail.com';

    // 이메일 본문 서식 구성 (가독성 높은 한글 리포트 스타일)
    const emailBody = `
==================================================
   [EGDESK SMS] 기술 지원 요청 접수
==================================================

■ 요청 제목: ${subject}
■ 지원 방식: ${supportType === 'remote' ? '원격 접속 지원 💻' : '현장 방문 지원 🚗'}
■ 희망 일정: ${preferredDate} (${preferredTime})

--------------------------------------------------
   요청사 및 담당자 정보
--------------------------------------------------
■ 회사명: ${companyName}
■ 담당자: ${requesterName} ${position ? `[${position}]` : ''}
■ 연락처: ${requesterPhone}
■ 이메일: ${requesterEmail}

--------------------------------------------------
   기술 지원 요청 상세 내용
--------------------------------------------------
${body}

==================================================
`;

    // SMTP 실발송 시도 및 환경변수 체크
    const smtpUser = process.env.EMAIL_SMTP_USER || '';
    const smtpPass = process.env.EMAIL_SMTP_PASS || '';
    const smtpHost = process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.EMAIL_SMTP_PORT || '465');

    let simulated = true;
    let sendResult = '기술 지원 요청이 시뮬레이션 모드로 접수되었습니다.';

    if (smtpUser && smtpPass) {
      try {
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
          from: `"이지데스크 기술지원팀" <${smtpUser}>`,
          to: targetEmail,
          subject: `[기술 지원 요청] ${subject} (${companyName})`,
          text: emailBody
        });

        simulated = false;
        sendResult = `기술 지원 요청이 이메일로 발송되었습니다! 수신처: ${targetEmail}`;
      } catch (nodemailerErr: any) {
        console.warn('정식 SMTP 발송 중 오류 발생, 시뮬레이션 모드로 우회 완료:', nodemailerErr.message);
        sendResult = `SMTP 연동 오류(${nodemailerErr.message})로 인해 기술 지원 요청이 시뮬레이션 접수 처리되었습니다. 수신처: ${targetEmail}`;
      }
    } else {
      console.log(`[기술 지원 요청 이메일 전송 시뮬레이터 작동]
수신 주소: ${targetEmail}
이메일 제목: [기술 지원 요청] ${subject} (${companyName})
이메일 본문:
${emailBody}
--------------------------------------------------`);
    }

    return NextResponse.json({
      success: true,
      message: sendResult,
      simulated,
      targetEmail
    });

  } catch (error: any) {
    console.error('기술 지원 요청 처리 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '기술 지원 요청 처리 과정 중 예상치 못한 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
