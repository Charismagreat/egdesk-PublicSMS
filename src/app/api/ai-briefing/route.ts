export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCustomerInsights, generateMarketingStrategy } from '@/lib/ai-marketer';
import { generateOmniChannelContent } from '@/lib/ai-content-generator';
import { queryTable, insertRows } from '../../../../egdesk-helpers';
import { sendMail } from '../../../lib/email';

/**
 * GET: 오늘의 AI 브리핑 데이터 생성
 * 날씨, 요일, CRM 분석, AI 전략 제안, 옴니채널 마케팅 콘텐츠를 단일 팩으로 병합하여 반환합니다.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const weather = searchParams.get('weather') || '비';
    
    // 요일 계산
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const currentDay = days[new Date().getDay()];

    // 1. CRM 분석 및 핵심 인사이트 도출
    const insights = await getCustomerInsights();

    // 2. 오늘의 AI 맞춤형 마케팅 전략 생성
    const strategy = await generateMarketingStrategy({
      weather,
      dayOfWeek: currentDay
    });

    const generateContent = searchParams.get('generateContent') === 'true';

    // 3. 옴니채널 AI 활성화 상태 확인
    const enabledRes = await queryTable('system_settings', { filters: { key: 'omnichannel_ai_enabled' } });
    const omnichannelAiEnabled = enabledRes.rows && enabledRes.rows.length > 0 ? enabledRes.rows[0].value !== 'false' : true;

    // 4. 옴니채널 AI 크리에이티브 콘텐츠 생성
    let contentPack = null;
    if (generateContent) {
      contentPack = await generateOmniChannelContent(
        strategy.strategyTitle,
        strategy.strategyDescription,
        insights.popularProducts
      );
    }

    // 5. 모바일 알림 브리핑 텍스트 생성 (카카오톡/문자용)
    const mobileBriefingText = `🔔 [이지데스크 AI 아침 브리핑]
사장님, 오늘 비 내리는 ${currentDay} 아지트 매장을 위한 성장 플랜이 준비되었습니다!

📈 분석 리포트:
• 이탈 우려 고객: ${insights.churnRiskCount}명 발견!
• 단골 VIP 고객: ${insights.vipCount}명 대기 중.

🎯 오늘의 추천 마케팅:
"${strategy.strategyTitle}"
- 타겟: ${strategy.targetGroup === 'churn_risk' ? '이탈 우려 고객군' : strategy.targetGroup === 'vip' ? 'VIP 우수 고객군' : '신규 가입 고객군'} (${strategy.targetIds.length}명)
- 예상 기대 효과: ${strategy.estimatedRevenue} (전환율 약 ${strategy.estimatedConversionRate})

👉 대시보드에서 원클릭 승인하시면 초개인화 감성 문자 즉시 전송 및 블로그/인스타그램 포스팅이 30초 내에 자동 배포됩니다. 오늘도 힘차게 파이팅입니다! 💪`;

    return NextResponse.json({
      success: true,
      weather,
      dayOfWeek: currentDay,
      insights,
      strategy,
      contentPack,
      mobileBriefingText,
      omnichannelAiEnabled
    });
  } catch (error: any) {
    console.error('API Briefing GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 사장님의 마케팅 플랜 승인 및 오토파일럿 실행
 * 고객 문자 즉시 발송 등록 및 SNS 포스팅 자동 등록
 */
export async function POST(req: Request) {
  try {
    const { strategy, contentPack } = await req.json();

    if (!strategy || !contentPack) {
      return NextResponse.json({ success: false, error: 'Strategy and Content Pack are required.' }, { status: 400 });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 1. 타겟 고객 조회 및 문자 발송 로그 등록
    const targetIds: number[] = strategy.targetIds || [];
    let sentSmsCount = 0;
    let sentEmailCount = 0;

    if (targetIds.length > 0) {
      // 데이터베이스에서 고객 전화번호 목록 추출
      const customersRes = await queryTable('crm_customers', {});
      const allCustomers = customersRes.rows || [];
      const targetCustomers = allCustomers.filter((c: any) => targetIds.includes(Number(c.id)));

      // 1-1. 문자 발송 로그 등록
      const smsLogs = targetCustomers.map((c: any, index: number) => {
        // 이름에 대한 초개인화 메시지 치환
        const personalizedMsg = strategy.smsContent.replace(/\{이름\}/g, c.name);
        return {
          id: Date.now() + index, // 고유 ID 부여
          customer_id: c.id,
          phone: c.phone,
          message: personalizedMsg,
          status: 'SUCCESS',
          created_at: nowStr
        };
      });

      if (smsLogs.length > 0) {
        await insertRows('message_logs', smsLogs);
        sentSmsCount = smsLogs.length;
      }

      // 1-2. 이메일 뉴스레터 발송 연동 (email 필드가 존재하는 타겟팅 고객)
      if (contentPack.newsletter && contentPack.newsletter.html) {
        const emailTargets = targetCustomers.filter((c: any) => c.email && c.email.trim() !== '');
        for (const c of emailTargets) {
          try {
            // 이메일 본문 내 {이름} 치환
            const personalizedHtml = contentPack.newsletter.html.replace(/\{이름\}/g, c.name);
            await sendMail({
              to: c.email,
              subject: contentPack.newsletter.subject,
              html: personalizedHtml,
              fromName: '이지데스크 AI 비서'
            });
            sentEmailCount++;
          } catch (mailErr: any) {
            console.warn(`뉴스레터 이메일 발송 실패 (${c.email}):`, mailErr.message);
          }
        }
      }
    }

    // 2. 네이버 블로그 포스팅 자동 예약 등록
    const blogId = Date.now() + 100;
    await insertRows('crm_naver_blog_posts', [{
      id: blogId,
      product_id: 'AI_CAMPAIGN',
      status: 'SCHEDULED', // 봇이 확인 후 실제 네이버에 배포 예정
      title: contentPack.blog.title,
      content: contentPack.blog.body,
      target_keywords: contentPack.blog.tags.slice(0, 3).join(','),
      image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80', // 시네마틱 레스토랑 테마
      sub_image_url: '',
      scheduled_at: nowStr,
      posted_at: '',
      error_message: '',
      views_count: 0,
      likes_count: 0
    }]);

    // 3. 인스타그램 포스팅 자동 예약 등록
    const instaId = Date.now() + 200;
    await insertRows('crm_instagram_posts', [{
      id: instaId,
      product_id: 'AI_CAMPAIGN',
      status: 'SCHEDULED',
      content: `${contentPack.instagram.caption}\n\n${contentPack.instagram.hashtags.map((h: string) => `#${h}`).join(' ')}`,
      image_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80', // 분위기 좋은 카페 감성
      scheduled_at: nowStr,
      posted_at: '',
      error_message: '',
      likes_count: 0,
      comments_count: 0
    }]);

    return NextResponse.json({
      success: true,
      message: 'AI 자율 마케팅 캠페인이 성공적으로 가동되었습니다.',
      details: {
        smsSent: sentSmsCount,
        emailSent: sentEmailCount,
        blogScheduled: true,
        instagramScheduled: true
      }
    });

  } catch (error: any) {
    console.error('API Briefing POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
