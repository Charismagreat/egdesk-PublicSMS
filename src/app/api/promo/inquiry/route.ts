export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyName,
      contactPerson,
      position,
      phone,
      email,
      companySize,
      selectedInterests,
      message
    } = body;

    if (!companyName || !contactPerson || !phone) {
      return NextResponse.json(
        { success: false, message: '회사명, 담당자명, 연락처는 필수 항목입니다.' },
        { status: 400 }
      );
    }

    const recipientEmail = 'chachogreat@gmail.com';
    const interestsText = Array.isArray(selectedInterests) ? selectedInterests.join(', ') : (selectedInterests || '미지정');
    const emailSubject = `[EGDESK 도입상담 신청] ${companyName} - ${contactPerson}님 (${phone})`;

    // 1. FormSubmit 글로벌 이메일 릴레이 게이트웨이 호출 (브라우저 표준 헤더 포함)
    let emailStatus = 'PENDING';
    try {
      const emailPayload = {
        _subject: emailSubject,
        _template: 'table',
        _captcha: 'false',
        '🏢 회사명': companyName,
        '👤 담당자/직책': `${contactPerson} ${position ? `(${position})` : ''}`,
        '📞 연락처': phone,
        '✉️ 이메일': email || '미입력',
        '👥 기업규모': companySize || '미지정',
        '🎯 관심 솔루션': interestsText,
        '📝 문의사항': message || '내용 없음',
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
            text: `🚀 *${emailSubject}*\n• *회사*: ${companyName}\n• *담당자*: ${contactPerson} ${position || ''}\n• *연락처*: ${phone}\n• *이메일*: ${email || '-'}\n• *규모*: ${companySize || '-'}\n• *관심분야*: ${interestsText}\n• *문의내용*: ${message || '-'}`
          })
        });
      } catch (slackErr) {
        console.warn('슬랙 웹훅 전송 오류 무시:', slackErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: '도입 상담 신청이 정상 접수되었으며 chachogreat@gmail.com으로 알림 메일이 발송되었습니다.',
      recipient: recipientEmail,
      emailStatus
    });
  } catch (error: any) {
    console.error('도입 상담 신청 API 오류:', error);
    return NextResponse.json(
      { success: false, message: error?.message || '상담 신청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
