import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { queryTable, insertRows, updateRows } from '../../../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

/**
 * 신청기간 텍스트 파싱 헬퍼 (예: "2026-06-22 ~ 2026-06-26" -> "2026-06-26")
 */
function parseEndDate(periodStr: string): string {
  if (!periodStr) return '2099-12-31';
  if (periodStr.includes('~')) {
    const parts = periodStr.split('~');
    return parts[1].trim();
  }
  return '2099-12-31';
}

/**
 * 제목 및 본문 텍스트 분석을 통한 예산 추정 헬퍼
 */
function parseBudget(title: string): number {
  const billionMatch = title.match(/(\d+(?:\.\d+)?)\s*억/);
  if (billionMatch) {
    return parseFloat(billionMatch[1]) * 100000000;
  }
  const millionMatch = title.match(/(\d+)\s*만/);
  if (millionMatch) {
    return parseInt(millionMatch[1]) * 10000;
  }
  // 기본값 1억 원
  return 100000000;
}

/**
 * POST /api/production/grant/sync: 기업마당 지원사업 공고 실시간 Playwright 크롤링 및 SQLite 적재
 */
export async function POST(request: Request) {
  let browser;
  try {
    const { searchPages = 0 } = await request.json().catch(() => ({ searchPages: 0 }));
    
    // 1. 기존 DB에 등록된 공고 ID들 조회 (중복 인서트 방지)
    const existingRes = await queryTable('crm_grant_announcements', { limit: 100000 });
    const existingIds = new Set((existingRes.rows || []).map((r: any) => r.id));

    // 2. Playwright 브라우저 가동
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const scrapedAnnouncements: any[] = [];

    // 3. 다중 페이지 크롤링 루프 (건수 제한 없음 대응)
    let cpage = 1;
    // searchPages가 명시적으로 지정되지 않은 경우(0 또는 음수), 넉넉하게 100페이지까지 탐색 가능하게 설정
    const maxPages = searchPages > 0 ? searchPages : 100;

    while (cpage <= maxPages) {
      const targetUrl = `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do?cpage=${cpage}`;
      console.log(`[RPA Crawler] Navigating to page ${cpage}: ${targetUrl}`);
      
      try {
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (gotoErr: any) {
        console.error(`[RPA Crawler] Page ${cpage} 로딩 실패 (타임아웃 등):`, gotoErr.message);
        break;
      }
      
      // 테이블 행 요소 파싱
      const rows = await page.$$('table tbody tr');
      if (rows.length === 0) {
        console.log(`[RPA Crawler] No rows found on page ${cpage}. Stopping pagination.`);
        break;
      }

      let validRowsCount = 0;
      let newRowsCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const tr = rows[i];
        
        // 헤더 행 건너뛰기 (th 태그가 있으면 스킵)
        const isHeader = await tr.$('th');
        if (isHeader) continue;

        const tds = await tr.$$('td');
        if (tds.length < 5) continue;

        validRowsCount++;

        // 컬럼 매핑
        const category = await tds[1].innerText().then(t => t.trim());
        const title = await tds[2].innerText().then(t => t.trim());
        
        const linkEl = await tds[2].$('a');
        const href = linkEl ? await linkEl.getAttribute('href') : '';
        
        const periodStr = await tds[3].innerText().then(t => t.trim());
        const agency = await tds[4].innerText().then(t => t.trim());

        // href 주소에서 pblancId 파싱 (예: pblancId=PBLN_000000000123194)
        const pblancIdMatch = href ? href.match(/pblancId=([^&]+)/) : null;
        const pblancId = pblancIdMatch ? pblancIdMatch[1] : `TEMP-${Math.random().toString(36).substr(2, 9)}`;
        const grantId = `GR-${pblancId}`;

        // 이미 적재된 공고라면 건너뛰기
        if (existingIds.has(grantId)) {
          continue;
        }

        newRowsCount++;

        const endDate = parseEndDate(periodStr);
        const budget = parseBudget(title);

        scrapedAnnouncements.push({
          id: grantId,
          title,
          agency,
          match_score: 70, // 기본 매칭 스코어 설정 (Gemini RAG 호출 시 상세 갱신)
          budget,
          end_date: endDate
        });
      }

      // 해당 페이지에 정상 공고가 존재하는데 새로운 공고가 0건이면, 수집 완료 시점 도달로 간주하고 중단
      if (validRowsCount > 0 && newRowsCount === 0) {
        console.log(`[RPA Crawler] All announcements on page ${cpage} already exist in DB. Stopping pagination.`);
        break;
      }

      cpage++;
    }

    let insertedCount = 0;
    // 4. 새롭게 발견된 공고 DB 적재
    if (scrapedAnnouncements.length > 0) {
      // 10개씩 청크 분할하여 안전 인서트
      const chunkSize = 10;
      for (let i = 0; i < scrapedAnnouncements.length; i += chunkSize) {
        const chunk = scrapedAnnouncements.slice(i, i + chunkSize);
        await insertRows('crm_grant_announcements', chunk);
        insertedCount += chunk.length;
      }
    }

    // 마지막 성공 시간 기록 (한국 시간 기준 포맷팅)
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const lastSyncCheck = await queryTable('system_settings', { filters: { key: 'grant_last_sync_time' } });
    if (lastSyncCheck.rows && lastSyncCheck.rows.length > 0) {
      await updateRows('system_settings', { value: nowStr }, { filters: { key: 'grant_last_sync_time' } });
    } else {
      await insertRows('system_settings', [{ key: 'grant_last_sync_time', value: nowStr }]);
    }

    return NextResponse.json({
      success: true,
      message: `실시간 지원사업 동기화가 완료되었습니다. 신규 공고 ${insertedCount}건이 DB에 적재되었습니다.`,
      scrapedCount: scrapedAnnouncements.length,
      insertedCount
    });

  } catch (error: any) {
    console.error('[RPA Crawler Error] Failed to sync bizinfo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
