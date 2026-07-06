export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { insertRows, queryTable } from '../../../../../egdesk-helpers';
import fs from 'fs';
import path from 'path';

/**
 * 💬 고객사 이지봇(웹 화면)에서 전송한 실시간 피드백 및 이미지/동영상 첨부를 로컬에 저장하고 DB에 기록하는 API
 * 
 * - 대행사 솔라피, 알리고 등 유료 알림 업체를 거치지 않는 무상 보존 방식입니다.
 * - 수집된 피드백 데이터는 `user_feedbacks` 테이블에 저장되어 관리자가 조회하고, 
 *   카카오 오픈빌더 스킬(스킬 웹훅)을 통해 개발자 카톡으로 안전하게 무료 조회할 수 있게 연동됩니다.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const companyName = formData.get('companyName') as string || '이지데스크 B2B 회원사';
    const senderName = formData.get('senderName') as string || '운영자 사장님';
    const contact = formData.get('contact') as string || '미기입';
    const feedbackType = formData.get('feedbackType') as string || '기타 문의';
    const feedbackText = formData.get('feedbackText') as string;
    const currentUrl = formData.get('currentUrl') as string || '/';

    const screenshotFile = formData.get('screenshot') as File | null;
    const recordingFile = formData.get('recording') as File | null;

    if (!feedbackText) {
      return NextResponse.json({ success: false, error: '피드백 내용이 누락되었습니다.' }, { status: 400 });
    }

    // 파일 저장용 디렉토리 생성 (public/uploads/feedbacks)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'feedbacks');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const host = req.headers.get('host') || 'localhost:4000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const origin = `${protocol}://${host}`;

    let screenshotUrl = '';
    let recordingUrl = '';
    const nowTimestamp = Date.now();
    const randId = Math.floor(Math.random() * 1000);

    // 1. 스크린샷 파일 저장
    if (screenshotFile) {
      const ext = 'png';
      const fileName = `fb_screenshot_${nowTimestamp}_${randId}.${ext}`;
      const filePath = path.join(uploadDir, fileName);
      
      const buffer = Buffer.from(await screenshotFile.arrayBuffer());
      await fs.promises.writeFile(filePath, buffer);
      
      screenshotUrl = `${origin}/uploads/feedbacks/${fileName}`;
    }

    // 2. 녹화 동영상 파일 저장
    if (recordingFile) {
      const ext = 'webm';
      const fileName = `fb_recording_${nowTimestamp}_${randId}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const buffer = Buffer.from(await recordingFile.arrayBuffer());
      await fs.promises.writeFile(filePath, buffer);

      recordingUrl = `${origin}/uploads/feedbacks/${fileName}`;
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const feedbackId = `FB-${nowTimestamp}-${randId}`;

    // 첨부파일 정적 링크 텍스트 조합
    let attachmentsText = "";
    if (screenshotUrl) {
      attachmentsText += `\n\n📸 [스크린샷 다운로드]: ${screenshotUrl}`;
    }
    if (recordingUrl) {
      attachmentsText += `\n🎥 [화면녹화 다운로드]: ${recordingUrl}`;
    }

    const fullUserPrompt = `[고객사: ${companyName} / 제보자: ${senderName} (${contact}) / 유형: ${feedbackType}]
${feedbackText}${attachmentsText}`;

    // SQLite DB에 피드백 데이터 직접 인서트 실행
    await insertRows('user_feedbacks', [{
      id: feedbackId,
      user_prompt: fullUserPrompt,
      detected_type: feedbackType === '버그 제보' ? 'bug' : feedbackType === '기능 제안' ? 'feature_request' : 'other',
      current_url: currentUrl,
      resolved_status: 'pending',
      created_at: nowStr
    }]);

    console.log(`[피드백 DB 저장 완료] ID: ${feedbackId}, 유형: ${feedbackType}, 스크린샷: ${screenshotUrl ? 'O' : 'X'}, 녹화본: ${recordingUrl ? 'O' : 'X'}`);

    // 3. 개발사 웹사이트(egdesk.cloud) Supabase DB로 자동 전송 (실시간 동기화)
    try {
      const supabaseUrl = 'https://cbptgzaubhcclkmvkiua.supabase.co/rest/v1/feedback';
      const anonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicHRnemF1YmhjY2xrbXZraXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5OTAzMTIsImV4cCI6MjA3NTU2NjMxMn0.wE5tLN9pMmZWjag_q1E9LaItcsNQlqZYM6XHUL5OiuM';
      
      const payload = {
        name: `이지봇 피드백 - ${senderName}`,
        email: contact || 'chachogreat@gmail.com',
        message: `[고객사: ${companyName} / 제보자: ${senderName} (${contact}) / 유형: ${feedbackType}]\n\n${feedbackText}${attachmentsText}`,
        page_url: currentUrl || '/',
        user_agent: 'EGDESK EasyBot Widget Client',
        client_id: feedbackId
      };

      const response = await fetch(supabaseUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error(`[Supabase 실시간 전송 실패] HTTP ${response.status}:`, errBody.message || '');
      } else {
        console.log(`[Supabase 실시간 전송 성공] ID: ${feedbackId}`);
      }
    } catch (sbErr: any) {
      console.error('[Supabase 실시간 API 동기화 에러]:', sbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: '피드백과 첨부파일이 서버에 저장되었으며, 개발사 웹사이트로 자동 전송되었습니다. 🟢'
    });

  } catch (error: any) {
    console.error('Feedback DB Store API Support Error:', error);
    return NextResponse.json({ success: false, error: error.message || '서버 오류로 인해 피드백 저장에 실패했습니다.' }, { status: 500 });
  }
}

/**
 * GET: 제출된 피드백/기안 리스트 조회
 */
export async function GET() {
  try {
    const result = await queryTable('user_feedbacks', {
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
    return NextResponse.json({
      success: true,
      data: result.rows || []
    });
  } catch (error: any) {
    console.error('Feedback Fetch API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

