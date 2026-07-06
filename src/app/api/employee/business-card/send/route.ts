export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { queryTable, insertRows } from '@/../egdesk-helpers';

export async function POST(req: Request) {
  try {
    const { operatorId, targetPhone, targetEmail, targetName } = await req.json();

    if (!operatorId) {
      return NextResponse.json({ success: false, error: '발신 직원의 operatorId가 누락되었습니다.' }, { status: 400 });
    }

    if (!targetPhone && !targetEmail) {
      return NextResponse.json({ success: false, error: '수신 상대방의 휴대전화번호 또는 이메일 중 최소 하나는 입력해야 합니다.' }, { status: 400 });
    }

    // 1. 발신 직원(crm_operators) 정보 조회
    const operatorRes = await queryTable('crm_operators', { filters: { id: operatorId.toString() } });
    if (!operatorRes.rows || operatorRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '지정된 직원 계정을 찾을 수 없습니다.' }, { status: 404 });
    }
    const operator = operatorRes.rows[0];
    const operatorName = operator.name || '임직원';
    const operatorEmail = operator.username || ''; // crm_operators 에서는 username 컬럼에 이메일 형식이 들어가기도 함
    const myCardImageUrl = operator.my_card_image_url || '';

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    let smsSendResult = '문자 미발송';
    let emailSendResult = '이메일 미발송';
    let simulatedEmail = true;

    // 호스트 도메인 추적 (기본값 설정)
    const hostUrl = req.headers.get('origin') || 'http://localhost:4000';

    // 2. 상대방 휴대전화번호로 명함 문자(SMS) 자동 전송
    if (targetPhone) {
      const cleanPhone = targetPhone.replace(/\D/g, '');
      const myCardLink = myCardImageUrl ? `${hostUrl}${myCardImageUrl}` : '';
      
      const smsMessage = `[이지데스크 명함교환]
안녕하세요, ${targetName || '담당자'}님. 오늘 미팅한 이지데스크의 ${operatorName}입니다.
제 연락망과 모바일 명함 이미지를 전달해 드립니다.

■ 내 연락 정보
- 이름: ${operatorName}
- 이메일: ${operatorEmail}
${myCardLink ? `- 모바일 명함 링크: ${myCardLink}` : ''}

감사합니다. 즐거운 하루 되십시오.`;

      try {
        await insertRows('message_logs', [{
          id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          customer_id: null,
          phone: cleanPhone,
          message: smsMessage,
          status: 'SUCCESS',
          created_at: nowStr
        }]);
        smsSendResult = `성공 (수신번호: ${targetPhone})`;
      } catch (smsErr: any) {
        console.error('SMS 발송 대장 기록 실패:', smsErr);
        smsSendResult = `실패 (오류: ${smsErr.message})`;
      }
    }

    // 3. 상대방 이메일로 명함 및 첨부파일 메일 자동 전송
    if (targetEmail) {
      const emailSubject = `[이지데스크 명함교환] ${operatorName}의 모바일 명함입니다.`;
      
      const emailBodyHtml = `
        <div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">안녕하세요, ${targetName || '담당자'}님!</h2>
          <p style="font-size: 14px; color: #334155; margin-top: 0;">오늘 나눈 소중한 시간에 감사드리며, 이지데스크(EGDesk)의 <b>${operatorName}</b> 명함을 회신해 드립니다.</p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="font-size: 13px; font-weight: bold; color: #1e293b; margin-bottom: 6px;">■ 내 연락처 정보</p>
          <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
            <tr>
              <td style="width: 80px; padding: 4px 0; font-weight: bold;">성명</td>
              <td style="padding: 4px 0;">: ${operatorName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">이메일</td>
              <td style="padding: 4px 0;">: ${operatorEmail}</td>
            </tr>
          </table>
          ${myCardImageUrl ? `<div style="margin-top: 20px; text-align: center;"><p style="font-size: 11px; color: #64748b; margin-bottom: 8px;">[모바일 명함 이미지 미리보기]</p><img src="${hostUrl}${myCardImageUrl}" alt="명함 이미지" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" /></div>` : ''}
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">※ 본 메일은 이지데스크 모바일 명함 비서 서비스를 통해 자동 발송되었습니다.</p>
        </div>
      `;

      // 1순위 DB에서만 SMTP 설정정보 로드 (환경변수 fallback 및 시뮬레이션 제거)
      const hostSetting = await queryTable('system_settings', { filters: { key: 'email_smtp_host' } });
      const portSetting = await queryTable('system_settings', { filters: { key: 'email_smtp_port' } });
      const userSetting = await queryTable('system_settings', { filters: { key: 'email_smtp_user' } });
      const passSetting = await queryTable('system_settings', { filters: { key: 'email_smtp_pass' } });

      const smtpHost = hostSetting.rows?.[0]?.value || '';
      const smtpPort = parseInt(portSetting.rows?.[0]?.value || '465');
      const smtpUser = userSetting.rows?.[0]?.value || '';
      const smtpPass = passSetting.rows?.[0]?.value || '';

      if (!smtpHost || !smtpUser || !smtpPass) {
        return NextResponse.json({
          success: false,
          error: '발송용 이메일(SMTP) 설정이 되어 있지 않습니다. [시스템 설정 > 발송 메일 SMTP 계정 설정] 메뉴에서 메일 계정(호스트, 포트, 이메일, 16자리 구글 앱 비밀번호 등)을 먼저 안전하게 등록하고 전송해 주세요.'
        }, { status: 400 });
      }

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

        // 내 명함 이미지 첨부 설정
        const attachments = [];
        if (myCardImageUrl) {
          const absoluteImagePath = path.join(process.cwd(), 'public', myCardImageUrl.replace(/^\//, ''));
          if (fs.existsSync(absoluteImagePath)) {
            attachments.push({
              filename: `${operatorName}_명함.png`,
              path: absoluteImagePath
            });
          }
        }

        await transporter.sendMail({
          from: `"${operatorName} via EGDesk" <${smtpUser}>`,
          to: targetEmail,
          subject: emailSubject,
          html: emailBodyHtml,
          attachments
        });

        simulatedEmail = false;
        emailSendResult = `성공 (정식 SMTP 발송 완료: ${targetEmail})`;
      } catch (nodemailerErr: any) {
        console.error('SMTP 실발송 오류:', nodemailerErr.message);
        return NextResponse.json({
          success: false,
          error: `이메일 발송 중 서버 에러가 발생했습니다: ${nodemailerErr.message}. [시스템 설정] 페이지에서 SMTP 등록 정보를 다시 한 번 정밀 확인해 주세요.`
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      sms: smsSendResult,
      email: emailSendResult,
      simulated: simulatedEmail
    });

  } catch (err: any) {
    console.error('명함 상대방 발송 API 에러:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
