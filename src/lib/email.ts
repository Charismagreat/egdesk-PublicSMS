import { getAppSetting } from '@/lib/app-settings';
import { getTenantId } from '@/lib/tenant';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
  fromName?: string;
}

/**
 * DB에 저장된 SMTP 설정을 기반으로 이메일을 발송하는 공통 헬퍼 함수입니다.
 */
export async function sendMail(options: SendMailOptions) {
  const { to, subject, html, text, attachments, fromName = '이지데스크' } = options;

  // 1. 데이터베이스(system_settings)에서 SMTP 설정 정보 조회
  const tenantId = await getTenantId();
  const smtpHost = await getAppSetting('email_smtp_host', tenantId) ?? '';
  const smtpPortStr = await getAppSetting('email_smtp_port', tenantId);
  const smtpPort = parseInt(smtpPortStr ?? '465');
  const smtpUser = await getAppSetting('email_smtp_user', tenantId) ?? '';
  const smtpPass = await getAppSetting('email_smtp_pass', tenantId) ?? '';

  // 설정값 누락 시 명시적 에러 발생
  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error('발송용 이메일(SMTP) 설정이 등록되어 있지 않습니다. [시스템 설정 > 발송 메일 SMTP 계정 설정] 메뉴에서 메일 발송 서버를 먼저 등록해 주세요.');
  }

  // 2. Nodemailer 전송 인터페이스 초기화 및 전송 실행
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // 465일 때만 SSL 적용
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    connectionTimeout: 12000 // 연결 대기 제한시간 12초
  });

  await transporter.sendMail({
    from: `"${fromName}" <${smtpUser}>`,
    to,
    subject,
    html,
    text,
    attachments
  });
}
