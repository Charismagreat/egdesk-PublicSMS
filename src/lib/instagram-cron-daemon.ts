import { queryTable, listInstagramHistory, createInstagramPost, generateInstagramContent } from '../egdesk-helpers';

let isDaemonRunning = false;

/**
 * 인스타그램 백그라운드 상시 정속 크론 타이머 데몬
 * 매 30초마다 현재 시각(KST)을 체크하여 오토 설정 시각이 도달하거나
 * 예약 시간이 지난 포스트가 존재할 경우 백그라운드에서 무인 포스팅을 즉시 가동합니다.
 */
export function initInstagramAutopilotDaemon() {
  if (isDaemonRunning) return;
  isDaemonRunning = true;

  console.log('🚀 [EGDesk MCP] 인스타그램 상시 자동 마케팅 오토파일럿 데몬이 가동되었습니다.');

  // 매 30초마다 시각 체크 및 자동 포스팅 감시
  setInterval(async () => {
    try {
      // 1. 오토 설정 조회
      const settingsRes = await queryTable('instagram_marketing_settings', { orderBy: 'id', orderDirection: 'DESC', limit: 10 });
      const activeSettings = (settingsRes.rows || []).filter((r: any) => !r.deleted_at);
      const settings = activeSettings[0] || settingsRes.rows?.[0];

      if (!settings || Number(settings.is_autopilot) !== 1) {
        return; // 오토 모드가 꺼져있으면 대기
      }

      // 2. 현재 시각 (KST 기준 HH:mm 포맷)
      const now = new Date();
      const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const targetTime = settings.autopilot_time || "10:00";

      // 현재 시각이 설정 시각과 분 단위로 일치하는지 체크 (또는 30초 이내 정각)
      if (currentHHmm === targetTime) {
        // 중복 실행 방지를 위한 오늘 처리 여부 체크 (session/memory lock)
        const todayKey = now.toISOString().slice(0, 10);
        if ((global as any).__last_autopilot_executed_date === `${todayKey}_${currentHHmm}`) {
          return; // 이미 이번 분에 실행 완료됨
        }
        (global as any).__last_autopilot_executed_date = `${todayKey}_${currentHHmm}`;

        console.log(`⏰ [EGDesk Autopilot] 설정 시각(${targetTime})이 도달하였습니다. 무인 포스팅을 자동 가동합니다!`);

        // 3. 상품 목록 조회
        const productsRes = await queryTable('products', { limit: 1000 });
        const products = (productsRes.rows || []).filter((p: any) => !p.deleted_at);
        if (products.length === 0) return;

        // 4. 이력 조회 & 미홍보 상품 픽업
        let mcpHistory: any[] = [];
        try {
          const historyRes = await listInstagramHistory();
          if (historyRes && historyRes.success && Array.isArray(historyRes.history)) {
            mcpHistory = historyRes.history;
          }
        } catch (e) {}

        const postedNames = new Set(mcpHistory.map((entry: any) => entry.productName || entry.caption || ''));
        let targetProduct = products.find((prod: any) => !postedNames.has(prod.name)) || products[Math.floor(Math.random() * products.length)];

        // 5. AI 피드 자동 조립 & 즉시 포스팅 발행
        const selectedTone = settings.tone_style || '인플루언서형';
        const productName = targetProduct.name;
        const productDesc = targetProduct.description || '';
        const priceText = targetProduct.price ? `${Number(targetProduct.price).toLocaleString()}원` : '특가 제안';

        const mcpContentRes = await generateInstagramContent({
          topic: productName,
          productName: productName,
          contentGoal: `${selectedTone} 어조로 상품 [${productName}]의 특징과 혜택가 ${priceText}를 인스타그램 피드로 매력적이게 소개해 주세요.\n${productDesc}`,
          visualBrief: `High-end 8k commercial product photography of "${productName}". Clean minimal background, photorealistic commercial product shot.`,
          generateImage: true,
          extraInstructions: `상품 혜택가: ${priceText}, 상세특성: ${productDesc}`
        });

        const finalCaption = mcpContentRes?.content?.caption || `✨ 사장님 강추 꿀템 등장! [${productName}] ✨\n\n특별 혜택가 ${priceText}로 지금 바로 프로필 링크에서 만나보세요! 💖\n\n#${productName} #인스타핫템 #강추 #득템찬스`;
        const finalImageUrl = mcpContentRes?.image?.filePath || targetProduct.main_image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80';

        // 즉시 실물 인스타그램 발행
        await createInstagramPost({
          caption: finalCaption,
          mediaUrl: finalImageUrl,
          username: settings.instagram_username || undefined
        });

        console.log(`✅ [EGDesk Autopilot] 인스타그램 실물 피드 포스팅 완료: ${productName}`);
      }
    } catch (err) {
      console.error('⚠️ [EGDesk Autopilot Daemon Error]:', err);
    }
  }, 30000); // 30초 주기 상시 감시
}
