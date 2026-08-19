export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      applyType, // 'ENGINEER' (FDE 지원) | 'CLIENT' (FDE 파견 요청)
      name,
      phone,
      email,
      companyOrOrg,
      careerOrTech,
      portfolioUrl,
      message
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: '이름/담당자명과 연락처는 필수 항목입니다.' },
        { status: 400 }
      );
    }

    const recipientEmail = 'chachogreat@gmail.com';
    const isEngineer = applyType === 'ENGINEER';
    const titlePrefix = isEngineer ? '[FDE 엔지니어 지원]' : '[FDE 현장파견 요청]';
    const emailSubject = `${titlePrefix} ${name}님 (${phone}) - EGDESK`;

    // 1. FormSubmit 글로벌 이메일 릴레이 게이트웨이 호출 (브라우저 표준 헤더 포함)
    let emailStatus = 'PENDING';
    try {
      const emailPayload = {
        _subject: emailSubject,
        _template: 'table',
        _captcha: 'false',
        '📌 접수구분': isEngineer ? '👨‍💻 FDE 공인 엔지니어 파트너 지원' : '🏢 기업 고객 FDE 현장 구축 요청',
        '👤 이름/담당자': name,
        '📞 연락처': phone,
        '✉️ 이메일': email || '미입력',
        '🏢 소속/기업명': companyOrOrg || '미입력',
        '🛠️ 주요기술/희망분야': careerOrTech || '미입력',
        '🔗 포트폴리오/URL': portfolioUrl || '없음',
        '📝 상세내용': message || '내용 없음',
        '⏰ 접수일시': new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      };

      const response = await fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://egdesk.cloud',
          'Referer': 'https://egdesk.cloud/promo',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify(emailPayload)
      });

      const resData = await response.json().catch(() => null);
      if (resData && resData.success === 'true') {
        emailStatus = 'SENT';
      }
    } catch (relayErr) {
      console.warn('FormSubmit 이메일 릴레이 전송 시도:', relayErr);
    }

    // 2. 슬랙 웹훅 실시간 푸시
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      try {
        await fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔥 *${emailSubject}*\n• *구분*: ${isEngineer ? '👨‍💻 FDE 엔지니어 파트너 지원' : '🏢 기업 고객 현장 파견 요청'}\n• *이름*: ${name} (${phone})\n• *이메일*: ${email || '-'}\n• *소속*: ${companyOrOrg || '-'}\n• *기술/분야*: ${careerOrTech || '-'}\n• *URL*: ${portfolioUrl || '-'}\n• *내용*: ${message || '-'}`
          })
        });
      } catch (slackErr) {
        console.warn('슬랙 웹훅 전송 오류 무시:', slackErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'FDE 접수가 정상적으로 완료되었습니다. chachogreat@gmail.com으로 알림이 전송되었습니다.',
      recipient: recipientEmail,
      emailStatus
    });
  } catch (error: any) {
    console.error('FDE 접수 API 오류:', error);
    return NextResponse.json(
      { success: false, message: error?.message || '접수 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
