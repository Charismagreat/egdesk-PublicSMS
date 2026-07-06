const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// 1. 환경 변수 주입 (dotenv 로드)
const dotenv = require('dotenv');
const envFiles = ['.env.development.local', '.env.local', '.env'];
for (const ef of envFiles) {
  const efPath = path.join(__dirname, '..', ef);
  if (fs.existsSync(efPath)) {
    dotenv.config({ path: efPath });
  }
}

console.log("🪙 [Grant Sync Daemon] 정부 지원금 실시간 크롤링 & RAG 적재 데몬 기동 시작...");

// 2. egdesk-helpers 공식 함수 수입
const { queryTable, insertRows, updateRows } = require('../egdesk-helpers');

// 3. system_settings 테이블 안전 Upsert 헬퍼
async function upsertSystemSetting(key, value) {
  try {
    const res = await queryTable('system_settings', { filters: { key } });

    if (res && res.rows && res.rows.length > 0) {
      await updateRows('system_settings', { value }, { filters: { key } });
    } else {
      await insertRows('system_settings', [{ key, value }]);
    }
  } catch (err) {
    console.error(`❌ [Grant Sync Daemon] system_settings [${key}] upsert 실패:`, err.message);
  }
}

// 4. 날짜 파싱 헬퍼
function parseEndDate(periodStr) {
  if (!periodStr) return '2099-12-31';
  if (periodStr.includes('~')) {
    const parts = periodStr.split('~');
    return parts[1].trim();
  }
  return '2099-12-31';
}

// 5. 예산 파싱 헬퍼
function parseBudget(title) {
  const billionMatch = title.match(/(\d+(?:\.\d+)?)\s*억/);
  if (billionMatch) {
    return parseFloat(billionMatch[1]) * 100000000;
  }
  const millionMatch = title.match(/(\d+)\s*만/);
  if (millionMatch) {
    return parseInt(millionMatch[1]) * 10000;
  }
  return 100000000; // 디폴트 1억
}

// 6. 동기화 핵심 작업 함수
async function performSync() {
  let browser;
  try {
    // 1. 기존 등록된 공고 ID 조회 (중복 적재 방지)
    console.log('[Grant Sync Daemon] Fetching existing announcements from EGDesk MCP...');
    const existingRes = await queryTable('crm_grant_announcements', { limit: 100000 });
    
    const existingIds = new Set((existingRes?.rows || []).map(r => r.id));
    console.log(`[Grant Sync Daemon] Found ${existingIds.size} existing announcements.`);

    // Playwright 브라우저 기동
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const scrapedAnnouncements = [];
    let cpage = 1;
    const maxPages = 300; // 건수 제한 없음 요구사항 대응

    while (cpage <= maxPages) {
      const targetUrl = `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do?cpage=${cpage}`;
      console.log(`[Grant Sync Daemon] 크롤링 중.. Page ${cpage}/${maxPages}`);
      
      try {
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 35000 });
      } catch (gotoErr) {
        console.error(`[Grant Sync Daemon] Page ${cpage} 로딩 실패 (타임아웃 등):`, gotoErr.message);
        break;
      }
      
      const rows = await page.$$('table tbody tr');
      if (rows.length === 0) {
        console.log(`[Grant Sync Daemon] No more rows found on page ${cpage}. Stopping.`);
        break;
      }

      let validRowsCount = 0;
      let newRowsCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const tr = rows[i];
        const isHeader = await tr.$('th');
        if (isHeader) continue;

        const tds = await tr.$$('td');
        if (tds.length < 5) continue;

        validRowsCount++;

        const title = await tds[2].innerText().then(t => t.trim());
        const linkEl = await tds[2].$('a');
        const href = linkEl ? await linkEl.getAttribute('href') : '';
        const periodStr = await tds[3].innerText().then(t => t.trim());
        const agency = await tds[4].innerText().then(t => t.trim());

        const pblancIdMatch = href ? href.match(/pblancId=([^&]+)/) : null;
        const pblancId = pblancIdMatch ? pblancIdMatch[1] : `TEMP-${Math.random().toString(36).substr(2, 9)}`;
        const grantId = `GR-${pblancId}`;

        // 중복 적재 방지
        if (existingIds.has(grantId)) continue;

        newRowsCount++;

        const endDate = parseEndDate(periodStr);
        const budget = parseBudget(title);

        scrapedAnnouncements.push({
          id: grantId,
          title,
          agency,
          match_score: 70, // 기본 적합도 세팅
          budget,
          end_date: endDate
        });
      }

      // 해당 페이지에 정상 공고가 존재하는데 새로운 공고가 0건이면, 수집 완료 시점 도달로 간주하고 중단
      if (validRowsCount > 0 && newRowsCount === 0) {
        console.log(`[Grant Sync Daemon] All announcements on page ${cpage} already exist in DB. Stopping pagination.`);
        break;
      }

      cpage++;
    }

    let insertedCount = 0;
    if (scrapedAnnouncements.length > 0) {
      console.log(`[Grant Sync Daemon] Syncing ${scrapedAnnouncements.length} new announcements to EGDesk MCP...`);
      // API 페이로드 크기 제한을 예방하기 위해 50건씩 청크 단위로 나누어 인서트 진행
      const chunkSize = 50;
      for (let i = 0; i < scrapedAnnouncements.length; i += chunkSize) {
        const chunk = scrapedAnnouncements.slice(i, i + chunkSize);
        await insertRows('crm_grant_announcements', chunk);
      }
      insertedCount = scrapedAnnouncements.length;
    }

    console.log(`✅ [Grant Sync Daemon] 동기화 작업 완료! 신규 공고 ${insertedCount}건 DB 적재 완료.`);

  } catch (error) {
    console.error("❌ [Grant Sync Daemon] 동기화 예외 오류 발생:", error.message);
  } finally {
    if (browser) {
      try { await browser.close(); } catch(e) {}
    }
  }
}

// 7. 스케줄 동적 체크 및 반복 실행 엔진
async function checkAndSync() {
  try {
    // 1. 설정된 동기화 주기(시간 단위) 및 마지막 동기화 일시 조회
    const settingsRes = await queryTable('system_settings', { limit: 1000 });
    const rows = settingsRes?.rows || [];
    
    let intervalHours = 12;
    const intervalRow = rows.find(r => r.key === 'grant_sync_interval');
    if (intervalRow) {
      intervalHours = parseInt(intervalRow.value, 10) || 12;
    }

    let lastSyncStr = '';
    const lastSyncRow = rows.find(r => r.key === 'grant_last_sync_time');
    if (lastSyncRow) {
      lastSyncStr = lastSyncRow.value;
    }

    const now = new Date();
    const nowEpoch = now.getTime();
    
    let shouldSync = false;
    if (!lastSyncStr) {
      // 마지막 동기화 기록이 없으면 최초 실행
      shouldSync = true;
    } else {
      const lastSyncEpoch = new Date(lastSyncStr).getTime();
      const elapsedHours = (nowEpoch - lastSyncEpoch) / (1000 * 60 * 60);
      if (elapsedHours >= intervalHours) {
        shouldSync = true;
      }
    }

    if (shouldSync) {
      console.log(`⏰ [Grant Sync Daemon] 스케줄 기준 충족 (주기: ${intervalHours}시간, 경과: ${lastSyncStr ? (nowEpoch - new Date(lastSyncStr).getTime()) / (1000 * 60 * 60) : '최초'}시간). 동기화를 시작합니다.`);
      await performSync();
      
      // 동기화 완료 후 DB에 마지막 동기화 시간 기록
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await upsertSystemSetting('grant_last_sync_time', nowStr);
    } else {
      console.log(`💤 [Grant Sync Daemon] 스케줄 대기 중.. (주기: ${intervalHours}시간, 마지막 갱신: ${lastSyncStr || '기록 없음'})`);
    }

  } catch (err) {
    console.error("❌ [Grant Sync Daemon] 스케줄 체크 중 오류:", err.message);
  }
}

// 최초 3초 후 체크 가동, 이후 매 30분(1800000ms)마다 주기적으로 체크
setTimeout(checkAndSync, 3000);
const checkInterval = 30 * 60 * 1000; // 30분 간격
setInterval(checkAndSync, checkInterval);
