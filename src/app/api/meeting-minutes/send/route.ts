export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, updateRows } from '@/../egdesk-helpers';
import { sendMail } from '@/lib/email';

// 한국 시간 도우미 함수
function getKSTDateString() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

// 마크다운을 간단한 HTML로 변환해주는 파서
function simpleMarkdownToHtml(md: string): string {
  if (!md) return '';
  
  let html = md;
  
  // 제목 치환
  html = html.replace(/^### (.*$)/gim, '<h3 style="color: #4f46e5; margin-top: 18px; margin-bottom: 8px; font-size: 16px; border-left: 4px solid #4f46e5; padding-left: 8px;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="color: #4f46e5; margin-top: 22px; margin-bottom: 10px; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="color: #4f46e5; margin-top: 26px; margin-bottom: 12px; font-size: 20px;">$1</h1>');
  
  // 볼드 치환
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1f2937;">$1</strong>');
  
  // 리스트 아이템 치환
  html = html.replace(/^\* (.*$)/gim, '<li style="margin-bottom: 6px; color: #4b5563;">$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li style="margin-bottom: 6px; color: #4b5563;">$1</li>');
  
  // 리스트 감싸기 보정
  html = html.replace(/(<li style=".*?>.*?<\/li>)+/g, '<ul style="padding-left: 20px; margin-top: 8px; margin-bottom: 8px;">$&</ul>');
  
  // 개행 치환
  html = html.replace(/\n/g, '<br />');
  
  return html;
}

/**
 * POST: 참석자들에게 맞춤형 회의록 및 할 일 메일 SMTP 발송
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { meetingId, recipients } = body;

    if (!meetingId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: '회의 식별 번호와 수신자 이메일 목록은 필수입니다.' }, { status: 400 });
    }

    // 1. 회의 상세 정보 가져오기
    const meetingRes = await queryTable('crm_meetings', { filters: { id: String(meetingId), deleted_at: null } });
    if (!meetingRes.rows || meetingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않는 회의입니다.' }, { status: 404 });
    }
    const meeting = meetingRes.rows[0];

    // 2. 해당 회의의 할 일 목록 가져오기
    const tasksRes = await queryTable('crm_meeting_tasks', { filters: { meeting_id: String(meetingId), deleted_at: null } });
    const allTasks = tasksRes.rows || [];

    // HTML 내용 파싱
    const summaryHtml = simpleMarkdownToHtml(meeting.summary || '회의 요약 내용이 존재하지 않습니다.');

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    // 3. 참석자별로 맞춤형 이메일 발송
    for (const recipient of recipients) {
      const { name, email } = recipient;
      if (!email || !email.includes('@')) {
        failedCount++;
        errors.push(`${name || '미지정'}: 올바르지 않은 이메일 주소`);
        continue;
      }

      // 해당 수신인의 할 일 필터링
      const myTasks = allTasks.filter((t: any) => 
        (t.assignee_name || '').trim().toLowerCase() === name.trim().toLowerCase() ||
        (t.assignee_email || '').trim().toLowerCase() === email.trim().toLowerCase()
      );

      // 다른 참석자들의 할 일 필터링
      const otherTasks = allTasks.filter((t: any) => 
        (t.assignee_name || '').trim().toLowerCase() !== name.trim().toLowerCase() &&
        (t.assignee_email || '').trim().toLowerCase() !== email.trim().toLowerCase()
      );

      // 이메일 HTML 레이아웃 구축
      let myTasksHtml = '';
      if (myTasks.length > 0) {
        myTasksHtml = `
          <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <h4 style="margin-top: 0; margin-bottom: 8px; color: #b45309; font-size: 15px;">🎯 [${name}]님에게 배정된 회의 할 일 목록</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="border-bottom: 1px solid #f59e0b; text-align: left;">
                  <th style="padding: 6px 0; color: #78350f;">할 일 내용</th>
                  <th style="padding: 6px 0; color: #78350f; width: 100px;">기한</th>
                </tr>
              </thead>
              <tbody>
                ${myTasks.map((t: any) => `
                  <tr style="border-bottom: 1px solid #fef3c7;">
                    <td style="padding: 8px 0; color: #4b5563;">${t.task_desc}</td>
                    <td style="padding: 8px 0; color: #78350f; font-weight: bold;">${t.due_date}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } else {
        myTasksHtml = `
          <div style="background-color: #f3f4f6; border-left: 4px solid #9ca3af; padding: 12px; border-radius: 6px; margin-bottom: 24px; color: #6b7280; font-size: 14px;">
            📢 이번 회의에서 [${name}]님에게 배정된 개별 할 일은 없습니다.
          </div>
        `;
      }

      let otherTasksHtml = '';
      if (otherTasks.length > 0) {
        otherTasksHtml = `
          <div style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            <h4 style="margin-top: 0; margin-bottom: 10px; color: #4b5563; font-size: 14px;">👥 다른 참석자들의 할 일</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid #e5e7eb; text-align: left; color: #6b7280;">
                  <th style="padding: 4px 0;">담당자</th>
                  <th style="padding: 4px 0;">할 일 내용</th>
                  <th style="padding: 4px 0; width: 90px;">기한</th>
                </tr>
              </thead>
              <tbody>
                ${otherTasks.map((t: any) => `
                  <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 6px 0; color: #1f2937; font-weight: bold;">${t.assignee_name}</td>
                    <td style="padding: 6px 0; color: #6b7280;">${t.task_desc}</td>
                    <td style="padding: 6px 0; color: #4b5563;">${t.due_date}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
          <!-- 헤더 배너 -->
          <div style="background-color: #4f46e5; color: #ffffff; padding: 20px; border-radius: 6px 6px 0 0; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: -0.5px;">📋 회의 기록 및 업무 안내</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #c7d2fe;">${meeting.title}</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p style="font-size: 15px; color: #374151; margin-top: 0; line-height: 1.5;">
              안녕하세요, <strong>${name}</strong>님.<br />
              진행되었던 회의의 요약록과 배정된 할 일을 안내해 드립니다.
            </p>
            
            <!-- 1. 본인의 할 일 -->
            ${myTasksHtml}
            
            <!-- 2. 회의록 상세 요약 -->
            <div style="background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 6px; padding: 18px; margin-bottom: 24px;">
              <h4 style="margin-top: 0; margin-bottom: 12px; color: #1f2937; font-size: 15px; border-bottom: 2px solid #4f46e5; padding-bottom: 6px;">📝 회의 주요 요약</h4>
              <div style="font-size: 14px; line-height: 1.6; color: #4b5563;">
                ${summaryHtml}
              </div>
            </div>
            
            <!-- 3. 타인 업무 목록 -->
            ${otherTasksHtml}
          </div>
          
          <!-- 푸터 -->
          <div style="text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 20px;">
            본 메일은 이지데스크(EGDesk) 회의 기록 AI 시스템을 통해 자동 발송되었습니다.<br />
            &copy; EGDesk. All Rights Reserved.
          </div>
        </div>
      `;

      try {
        await sendMail({
          to: email,
          subject: `[회의록] ${meeting.title} - ${name}님 할일 안내`,
          html: emailHtml,
          fromName: '이지데스크 회의록 AI'
        });
        successCount++;
      } catch (mailErr: any) {
        console.error(`메일 발송 실패 (${name} - ${email}):`, mailErr);
        failedCount++;
        errors.push(`${name} (${email}): ${mailErr.message || String(mailErr)}`);
      }
    }

    // 발송 상태 업데이트 로그 저장
    const nowStr = getKSTDateString();
    await updateRows('crm_meetings', {
      updated_at: nowStr,
      updated_by: 'EMAIL_DISPATCHED'
    }, { filters: { id: String(meetingId) } });

    return NextResponse.json({
      success: true,
      message: `이메일 발송 작업 완료 (성공: ${successCount}건, 실패: ${failedCount}건)`,
      successCount,
      failedCount,
      errors
    });
  } catch (error: any) {
    console.error('회의록 메일 발송 오류:', error);
    return NextResponse.json({ success: false, error: '이메일을 발송하는 과정에서 오류가 발생했습니다.' }, { status: 500 });
  }
}
