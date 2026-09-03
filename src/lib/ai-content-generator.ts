import { insertRows, getGeminiApiKey } from '../../egdesk-helpers';
import { getAppSetting } from '@/lib/app-settings';
import { getTenantId } from '@/lib/tenant';

export interface BlogContent {
  title: string;
  body: string;
  tags: string[];
  imagePrompt: string; // 이미지 생성 인공지능용 팁
}

export interface InstagramContent {
  caption: string;
  hashtags: string[];
  visualDirection: string; // 사진 구도 가이드
}

export interface YoutubeShortsContent {
  sceneList: Array<{
    sceneNum: number;
    visualDescription: string; // 화면 지시
    voiceScript: string; // 성우 나레이션 대본
    duration: string; // 추천 초 (e.g. "3초")
  }>;
  audioTrack: string; // 배경 음악 무드 추천
}

export interface NewsletterContent {
  subject: string;
  html: string;
}

export interface OmniChannelPack {
  blog: BlogContent;
  instagram: InstagramContent;
  shorts: YoutubeShortsContent;
  newsletter: NewsletterContent;
}


/**
 * AI 기반으로 네이버 블로그, 인스타그램, 유튜브 쇼츠용 프리미엄 마케팅 콘텐츠를 자동 생성합니다.
 */
export async function generateOmniChannelContent(
  strategyTitle: string,
  description: string,
  popularProducts: string[]
): Promise<OmniChannelPack> {
  let apiKey: string | null = null;
  let isEnabled = false; // 기본값: 비활성화(false)
  try {
    const tenantId = await getTenantId();
    apiKey = await getAppSetting('google_ai_api_key', tenantId);

    const enabledValue = await getAppSetting('omnichannel_ai_enabled', tenantId);
    if (enabledValue !== null) {
      isEnabled = enabledValue === 'true';
    }

    if (apiKey && !apiKey.startsWith('AIzaSy')) {
      try {
        const decryptedKeyRes = await getGeminiApiKey({ name: apiKey });
        if (decryptedKeyRes && decryptedKeyRes.success && decryptedKeyRes.apiKey) {
          apiKey = decryptedKeyRes.apiKey;
        }
      } catch (keyErr) {
        console.error('⚠️ [marketing] EGDesk에서 API 키 해독에 실패했습니다:', keyErr);
      }
    }
  } catch (e) {
    console.error('Failed to get settings, fallback to local content generator', e);
  }

  const menu = popularProducts[0] || '시그니처 메뉴';

  if (apiKey && isEnabled) {
    try {
      const systemPrompt = `
You are an expert copywriter, digital marketer, and content creator specializing in Naver Blog SEO, Instagram influencer feed creation, high-retention TikTok/YouTube Shorts scripts, and engaging HTML email newsletters.
Your task is to generate a comprehensive content package for four channels based on the provided strategy title, description, and primary menu item.

Strategy: ${strategyTitle}
Concept: ${description}
Primary Menu: ${menu}

Output must be in valid Korean, in strict JSON format using this EXACT structure:
{
  "blog": {
    "title": "String (SEO optimized blog title)",
    "body": "String (Long-form blog post, min 3 paragraphs with highly engaging, friendly Korean tone)",
    "tags": ["String", "String"],
    "imagePrompt": "String (English prompt for image generation)"
  },
  "instagram": {
    "caption": "String (Short, trendy Instagram caption with emojis)",
    "hashtags": ["String", "String"],
    "visualDirection": "String (Instructions on how to take the photo)"
  },
  "shorts": {
    "sceneList": [
      {
        "sceneNum": 1,
        "visualDescription": "String (Visual cues)",
        "voiceScript": "String (Spoken voiceover)",
        "duration": "String"
      }
    ],
    "audioTrack": "String (BGM style suggestion)"
  },
  "newsletter": {
    "subject": "String (Sensory and personalized email subject)",
    "html": "String (Beautiful responsive HTML template using inline CSS. Use a light background, elegant fonts, rounded cards, a green or blue call-to-action button, clear margins, and personalized tone targeting a VIP or churn-risk customer depending on the concept. DO NOT include any markdown code blocks inside the HTML string)"
  }
}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: `Generate a premium marketing content pack for ${strategyTitle}.` }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // 🕒 토큰 소모량 측정 기록 추가
        if (data.usageMetadata) {
          try {
            const u = data.usageMetadata;
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            await insertRows('ai_token_usage_logs', [{
              id: `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              model: 'gemini-3.5-flash',
              purpose: 'marketing-content-pack',
              prompt_tokens: u.promptTokenCount || 0,
              completion_tokens: u.candidatesTokenCount || 0,
              total_tokens: u.totalTokenCount || 0,
              created_at: nowStr
            }]);
          } catch (logErr) {
            console.error('마케팅 AI 토큰 사용량 기록 실패:', logErr);
          }
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const resJson = JSON.parse(text);
        if (resJson.blog && resJson.instagram && resJson.shorts && resJson.newsletter) {
          return resJson as OmniChannelPack;
        }
      }
    } catch (e) {
      console.error('Gemini API Error for content generation, using fallback pack:', e);
    }
  }

  // 고품격 프리미엄 콘텐츠 폴백 팩 (API 미설정 또는 오류 시에도 압도적인 결과 제공)
  return {
    blog: {
      title: `[일상/맛집] 비 오는 화요일에 어울리는 감성 아지트와 바삭한 빗소리 레시피`,
      body: `안녕하세요! 빗소리가 기분 좋게 귓가를 스치는 촉촉한 화요일이네요. ☔️

비가 오는 날이면 유난히 마음이 차분해지고, 따뜻하고 포근한 골목길 아지트가 생각나곤 합니다. 문득 창밖을 보다가, 이런 날에 완벽하게 어울리는 우리 매장만의 단골 시그니처 메뉴인 **${menu}** 이야기를 전해드리고 싶어 찾아왔어요.

저희 매장의 **${menu}**는 겉은 빗소리처럼 경쾌하게 바삭하고, 속은 놀랍도록 촉촉하고 고소한 육즙으로 꽉 차 있어 비 오는 날의 우울함을 단번에 씻어주는 시그니처 요리랍니다. 잔잔하게 흐르는 로파이(Lo-Fi) 음악과 노란 조명 아래에서, 갓 조리되어 김이 모락모락 피어오르는 플레이트를 앞에 두고 소중한 분과 도란도란 이야기를 나누다 보면, 궂은 날씨마저 아주 특별한 낭만으로 변하게 됩니다.

오늘 하루, 이 낭만적인 무드에 동참해 주시는 분들을 위해 특별한 온기가 담긴 서비스까지 마련해 두고 기다리고 있으니, 언제든 편하게 발걸음해 주셔요. 지친 하루 끝의 따스한 안식처가 되어드릴게요.`,
      tags: ['동네맛집', '감성카페', '비오는날데이트', `${menu}맛집`, '동네아지트', '단골추천'],
      imagePrompt: 'Cozy restaurant interior on a rainy day, warm soft yellow lights, a beautifully plated gourmet meal on a wooden table, steam rising from the plate, rain drops on the window in the background, cinematic photography style.'
    },
    instagram: {
      caption: `비 내리는 화요일 감성 가득 채우기 완성...☕️☔️

차분하게 떨어지는 빗소리를 들으며 즐기는 겉바속촉 ${menu}의 맛이란! 한 입 베어 무는 순간 기분이 사르르 녹아내려요.

오늘 하루, 비를 뚫고 찾아와주시는 소중한 분들만을 위해 깜짝 미니 사이드 메뉴 서비스도 대기 중이랍니다. 빗길 조심해서 감성 충전하러 오세요! 

📌 위치: 프로필 링크 클릭!
📌 혜택: 이 게시물을 보여주시면 단골 서비스 증정! ✨`,
      hashtags: ['맛스타그램', '비오는날감성', '동네카페', `${menu}`, '인스타핫플', '단골아지트', '소통'],
      visualDirection: '창가에 맺힌 빗방울을 아웃포커싱하고, 따뜻한 김이 피어오르는 메뉴를 노란 조명 아래 클로즈업하여 촬영하세요.'
    },
    shorts: {
      sceneList: [
        {
          sceneNum: 1,
          visualDescription: '클로즈업: 유리창에 내리는 빗방울과 그 뒤로 따스하게 빛나는 은은한 노란색 매장 조명 비추기.',
          voiceScript: '비 내리는 화요일, 유난히 따뜻하고 아늑한 공간이 그리워지지 않나요?',
          duration: '3초'
        },
        {
          sceneNum: 2,
          visualDescription: '지글지글 요리 장면: 뜨거운 팬 위에서 바삭하게 튀겨지듯 조리되며 모락모락 김이 나는 시그니처 메뉴 클로즈업.',
          voiceScript: '빗소리보다 더 바삭하고 소리까지 맛있는, 오늘의 숨겨진 힐링 레시피.',
          duration: '4초'
        },
        {
          sceneNum: 3,
          visualDescription: '한 입 먹는 연출: 바삭하게 포크로 찌르는 순간의 ASMR 극대화 및 소스가 사르르 흘러내리는 샷.',
          voiceScript: '오직 오늘만 맛볼 수 있는 입안 가득 찬 행복, 겉바속촉 시그니처!',
          duration: '4초'
        },
        {
          sceneNum: 4,
          visualDescription: '사장님이 웃으며 빗길 조심하라는 인사 카드 또는 매장 주소 자막이 감각적으로 나타나는 화면.',
          voiceScript: '지금 프로필을 누르고 비 오는 날 단골 한정 혜택을 챙겨보세요. 따뜻하게 기다릴게요!',
          duration: '4초'
        }
      ],
      audioTrack: '차분하면서도 리드미컬한 어쿠스틱 로파이(Acoustic Lo-Fi) 재즈 비트 BGM'
    },
    newsletter: {
      subject: `☔️ 비 오는 날엔 바삭한 ${menu}와 따뜻한 차 한 잔 어떠세요?`,
      html: `
        <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #334155; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">비 오는 날의 특별한 선물 🎁</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">차분한 빗소리와 함께 깊어지는 맛의 조화</p>
          </div>
          
          <div style="padding: 30px 24px; line-height: 1.7; font-size: 14px;">
            <p style="margin-top: 0; font-size: 16px; font-weight: 700; color: #1e293b;">안녕하세요, 이지데스크 단골 고객님!</p>
            <p>오늘처럼 촉촉하게 비가 내리는 날엔 유독 소중한 사람과 함께 아늑한 공간에서 따스한 대화를 나누고 싶어지죠. 그런 특별한 낭만을 위해 저희 매장에서 <b>오늘의 시그니처 추천 메뉴인 ${menu}</b>를 정성스레 준비했습니다.</p>
            
            <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; text-align: center;">
              <span style="font-size: 12px; font-weight: bold; color: #4f46e5; display: block; margin-bottom: 5px;">⚡️ 단골 고객 한정 비 오는 날 깜짝 혜택</span>
              <span style="font-size: 18px; font-weight: 900; color: #0f172a;">${menu} 주문 시, 따뜻한 웰컴 티 1잔 무료!</span>
              <p style="margin: 5px 0 0 0; font-size: 11px; color: #64748b;">* 본 메일을 매장 직원에게 보여주시면 즉시 혜택이 적용됩니다.</p>
            </div>

            <p>겉은 빗소리처럼 경쾌하게 바삭하고, 속은 놀랍도록 부드러운 육즙으로 꽉 채운 ${menu}와 함께 오늘 하루 궂은 날씨마저 아주 아늑하고 특별한 기억으로 바꿔보세요. 빗길 조심하시고, 편안한 걸음으로 찾아와주시길 기다리겠습니다.</p>
            
            <div style="text-align: center; margin-top: 35px; margin-bottom: 15px;">
              <a href="https://naver.me/ezdesk" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-align: center; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">오늘의 힐링 예약하기 ➔</a>
            </div>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 5px 0;">본 이메일은 이지데스크 단골 고객 케어 시스템에 의해 자동 발송되었습니다.</p>
            <p style="margin: 0;">수신 거부를 원하시면 매장 고객센터 또는 프로필 관리에서 설정을 변경해 주시기 바랍니다.</p>
          </div>
        </div>
      `
    }
  };
}
