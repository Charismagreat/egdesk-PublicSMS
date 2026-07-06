export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable } from '../../../../../../egdesk-helpers';

/**
 * 🤖 개발사 카카오톡 챗봇(오픈빌더) 전용 스킬(Skill) 웹훅 API
 * 
 * - 카카오 오픈빌더의 핵심 원리(카카오가 우리 서버로 전송)를 적용한 명품 웹훅 규격입니다.
 * - 카카오 챗봇 관리자센터의 [스킬] 메뉴에 본 API의 절대 경로 URL을 등록하면 동작합니다.
 * - 사용 대상: 피드백을 실시간 조회하고자 하는 개발자 전용 비서 챗봇.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('🤖 [카카오 챗봇 스킬 수신]', JSON.stringify(body, null, 2));

    // 1. 요청 사용자 정보 파싱 (카카오 고유 식별자 userKey 추출)
    const requestUserKey = body.userRequest?.user?.id;
    const chatbotUserKey = process.env.DEVELOPER_CHATBOT_USER_KEY || 'DEMO_RECEIVER_USER_KEY_XYZ';

    // 2. 보안 무결성 가드: 개발자 전용 알림이므로 타인의 조회를 차단
    if (chatbotUserKey !== 'DEMO_RECEIVER_USER_KEY_XYZ' && requestUserKey !== chatbotUserKey) {
      return NextResponse.json({
        version: '2.0',
        template: {
          outputs: [
            {
              simpleText: {
                text: '🔒 접근 권한이 제한되었습니다.\n\n이 챗봇은 개발사 공식 관리자만 접근할 수 있습니다. 등록된 userKey가 일치하지 않습니다.'
              }
            }
          ]
        }
      });
    }

    // 3. SQLite 데이터베이스에서 pending 상태인 미처리 피드백 최신 5건 조회
    const dbResult = await queryTable('user_feedbacks', {
      filters: { resolved_status: 'pending' },
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: 5
    });

    const feedbacks = dbResult.rows || [];

    let replyMessage = '';

    if (feedbacks.length === 0) {
      replyMessage = `🟢 [EGDESK 피드백 관제센터]

현재 대기 중인 미처리 피드백이 존재하지 않습니다.
모든 고객 요구사항이 신속히 반영된 완벽한 상태입니다! ⚡`;
    } else {
      replyMessage = `💬 [EGDESK 미처리 피드백 알림]

현재 미해결된 소중한 피드백이 총 ${feedbacks.length}건 대기 중입니다.

`;

      feedbacks.forEach((fb: any, index: number) => {
        // user_prompt에 저장된 포맷팅 데이터를 깔끔하게 파싱하거나 가독성 좋게 매핑
        const timeFormatted = fb.created_at || '시간 미상';
        const typeLabel = fb.detected_type === 'bug' ? '🔴 버그' : fb.detected_type === 'feature_request' ? '💡 제안' : '📝 일반';
        
        replyMessage += `[${index + 1}] 접수: ${timeFormatted} (${typeLabel})\n`;
        replyMessage += `${fb.user_prompt}\n`;
        replyMessage += `---------------------------\n\n`;
      });

      replyMessage += `※ 최고관리자 화면 [설정 > 피드백 관리] 탭에서 상세 내역 및 이메일 전송, 처리 상태를 직접 마킹할 수 있습니다. 🛠️`;
    }

    // 4. 카카오 i 오픈빌더 스킬 표준 2.0 JSON 응답 리턴
    return NextResponse.json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: replyMessage
            }
          }
        ]
      }
    });

  } catch (error: any) {
    console.error('Kakao Chatbot Skill API Support Error:', error);
    
    // 비상 예외 응답 처리
    return NextResponse.json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: `🚨 챗봇 스킬 서비스에 장애가 발생했습니다.\n\n오류 내용: ${error.message || '서버 내부 에러'}`
            }
          }
        ]
      }
    });
  }
}
