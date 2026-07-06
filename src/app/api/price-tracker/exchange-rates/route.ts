export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, updateRows, insertRows } from '@/../egdesk-helpers';
import { exec } from 'child_process';
import path from 'path';

// GET /api/price-tracker/exchange-rates : DB에 저장된 실시간 환율, 10일간 이력, 데몬 관제 상태 통합 조회
export async function GET() {
  try {
    // 1. 실시간 환율 조회
    const ratesRes = await queryTable('exchange_rates', { orderBy: 'rate_id', orderDirection: 'ASC' });
    const rates = ratesRes.rows || [];

    // 2. 환율 변동 이력(올해 1월 1일부터의 누적 전체 이력) 조회 - 기본 100건 제한 해소를 위해 limit: 2000 추가
    const historiesRes = await queryTable('exchange_rate_histories', { 
      orderBy: 'captured_date', 
      orderDirection: 'ASC',
      limit: 2000
    });
    const histories = historiesRes.rows || [];

    // 3. 백그라운드 수집 데몬 기동 상태 조회 (system_settings 매핑)
    const statusRes = await queryTable('system_settings', { filters: { key: 'price_daemon_status' } });
    const lastRunRes = await queryTable('system_settings', { filters: { key: 'price_daemon_last_run' } });
    const pidRes = await queryTable('system_settings', { filters: { key: 'price_daemon_pid' } });

    const daemonInfo = {
      status: statusRes.rows && statusRes.rows.length > 0 ? statusRes.rows[0].value : 'STOPPED',
      last_run: lastRunRes.rows && lastRunRes.rows.length > 0 ? lastRunRes.rows[0].value : '기록 없음',
      pid: pidRes.rows && pidRes.rows.length > 0 ? pidRes.rows[0].value : 'N/A'
    };

    return NextResponse.json({ 
      success: true, 
      rates, 
      histories,
      daemon: daemonInfo
    });
  } catch (error: any) {
    console.error('통합 환율 및 데몬 상태 조회 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/price-tracker/exchange-rates : 실시간 환율 갱신 OR 백그라운드 수집 데몬 강제 실행 브릿지
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // A. 백그라운드 SCM 자율 수집 데몬 강제 가동 액션
    if (action === 'START_DAEMON') {
      const daemonScriptPath = path.join(process.cwd(), 'scripts', 'price_tracker_daemon.js');
      
      console.log(`🤖 [Bridge] 가격/환율 수집 백그라운드 데몬 강제 기동 실행 -> node "${daemonScriptPath}"`);
      
      // exec를 활용해 터미널에 백그라운드로 실행
      exec(`node "${daemonScriptPath}"`, (err, stdout, stderr) => {
        if (err) {
          console.error('❌ [Bridge] 백그라운드 데몬 가동 에러:', err.message);
          return;
        }
        console.log('✓ [Bridge] 백그라운드 데몬 자율 구동 성공');
      });

      // 가동 직후 모니터링 메타데이터 즉시 동기화
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      
      const checkStatus = await queryTable('system_settings', { filters: { key: 'price_daemon_status' } });
      if (checkStatus.rows && checkStatus.rows.length > 0) {
        await updateRows('system_settings', { value: 'RUNNING' }, { filters: { key: 'price_daemon_status' } });
        await updateRows('system_settings', { value: nowStr }, { filters: { key: 'price_daemon_last_run' } });
      } else {
        await insertRows('system_settings', [
          { key: 'price_daemon_status', value: 'RUNNING' },
          { key: 'price_daemon_last_run', value: nowStr }
        ]);
      }

      return NextResponse.json({ 
        success: true, 
        message: '백그라운드 가격/환율 수집 데몬이 서버 내부에서 성공적으로 가동되었습니다.' 
      });
    }

    // C. 지정된 기간 동안의 글로벌 환율 시계열 벌크 백필(Bulk Backfill) 복원 액션
    if (action === 'BULK_BACKFILL') {
      const { startDate: reqStart, endDate: reqEnd } = body;
      
      const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const startStr = reqStart || '2026-01-01';
      const endStr = reqEnd || todayStr;

      console.log(`⚡ [API] 실제 환율 지정 기간 소급 요청 수신: ${startStr} ~ ${endStr}`);

      const startDate = new Date(startStr);
      const endDate = new Date(endStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json({ success: false, error: '유효하지 않은 날짜 형식입니다. (YYYY-MM-DD)' }, { status: 400 });
      }

      if (startDate > endDate) {
        return NextResponse.json({ success: false, error: '시작일이 종료일보다 늦을 수 없습니다.' }, { status: 400 });
      }

      // 1. 기존에 이미 등록된 데이터가 있는지 확인하여 중복 적재 예방
      const existingRes = await queryTable('exchange_rate_histories', { limit: 2000 });
      const existing = existingRes.rows || [];
      const existingSet = new Set(existing.map((r: any) => `${r.currency_code}_${r.captured_date}`));

      const CURRENCIES = ['USD', 'EUR', 'JPY', 'CNY'];
      const rowsToInsert: any[] = [];
      let ignoreCount = 0;

      // 2. Frankfurter Open API 호출을 통해 실제 역사적 환율 이력 데이터 수집
      try {
        const queryUrl = `https://api.frankfurter.app/${startStr}..${endStr}?from=USD&to=KRW,EUR,JPY,CNY`;
        console.log(`📡 [API] Frankfurter API 역사 환율 호출 중 -> ${queryUrl}`);
        
        const response = await fetch(queryUrl);
        if (!response.ok) {
          throw new Error(`Frankfurter API HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const dates = Object.keys(data.rates || {}).sort();
        console.log(`✓ [API] Frankfurter 환율 데이터 획득 성공 (총 ${dates.length}일 분량)`);

        const baseStart = new Date('2026-01-01');

        for (const dateStr of dates) {
          const dayRates = data.rates[dateStr];
          const krwRate = dayRates.KRW;
          const eurInUsd = dayRates.EUR;
          const jpyInUsd = dayRates.JPY;
          const cnyInUsd = dayRates.CNY;

          if (!krwRate) continue;

          // USD 기준 타 통화 환율 역산 및 100엔 환산 처리
          const usdRate = Number(krwRate.toFixed(2));
          const eurRate = eurInUsd ? Number((krwRate / eurInUsd).toFixed(2)) : 1450.0;
          const jpyRate = jpyInUsd ? Number(((krwRate / jpyInUsd) * 100).toFixed(2)) : 880.0; // 100엔 기준
          const cnyRate = cnyInUsd ? Number((krwRate / cnyInUsd).toFixed(2)) : 190.0;

          const rateValues: Record<string, number> = {
            USD: usdRate,
            EUR: eurRate,
            JPY: jpyRate,
            CNY: cnyRate
          };

          const currentDate = new Date(dateStr);
          const offsetTime = currentDate.getTime() - baseStart.getTime();
          const t_offset = Math.round(offsetTime / (1000 * 60 * 60 * 24));

          for (const code of CURRENCIES) {
            const key = `${code}_${dateStr}`;
            if (existingSet.has(key)) {
              ignoreCount++;
              continue;
            }

            const rateValue = rateValues[code];
            const historyId = 2026000000 + Math.abs(t_offset) * 10 + CURRENCIES.indexOf(code);
            
            rowsToInsert.push({
              history_id: historyId,
              currency_code: code,
              rate_value: rateValue,
              captured_date: dateStr
            });
          }
        }
      } catch (apiErr: any) {
        console.error('❌ [API] Frankfurter API 호출 실패:', apiErr.message);
        return NextResponse.json({ 
          success: false, 
          error: `실제 환율 데이터를 가져오는 데 실패했습니다: ${apiErr.message}` 
        }, { status: 502 });
      }

      let insertedCount = 0;
      if (rowsToInsert.length > 0) {
        const CHUNK_SIZE = 100;
        for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
          const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
          await insertRows('exchange_rate_histories', chunk);
          insertedCount += chunk.length;
        }
      }

      console.log(`✓ [API] 지정 기간 실제 환율 벌크 백필 완성! ${startStr} ~ ${endStr} (삽입: ${insertedCount}건, 제외: ${ignoreCount}건)`);
      return NextResponse.json({
        success: true,
        message: `${startStr} ~ ${endStr} 기간 동안의 4대 외환 실제 환율 소급 적재가 완료되었습니다.`,
        inserted: insertedCount,
        ignored: ignoreCount
      });
    }

    // B. 기본 동기화 액션 (이전 호환성 유지)
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const todayStr = nowStr.slice(0, 10);
    let updatedRates: any[] = [];
    let apiSuccess = false;

    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates && data.rates.KRW) {
          const krwRate = data.rates.KRW;
          const eurInUsd = data.rates.EUR;
          const jpyInUsd = data.rates.JPY;
          const cnyInUsd = data.rates.CNY;

          const usdRate = Number(krwRate.toFixed(2));
          const eurRate = Number((krwRate / eurInUsd).toFixed(2));
          const jpyRate = Number(((krwRate / jpyInUsd) * 100).toFixed(2)); // 100엔 기준
          const cnyRate = Number((krwRate / cnyInUsd).toFixed(2));

          updatedRates = [
            { currency_code: 'USD', rate: usdRate, name: '미국 달러' },
            { currency_code: 'EUR', rate: eurRate, name: '유럽 유로' },
            { currency_code: 'JPY', rate: jpyRate, name: '일본 엔화 (100)' },
            { currency_code: 'CNY', rate: cnyRate, name: '중국 위안' }
          ];
          apiSuccess = true;
        }
      }
    } catch (fetchErr) {
      console.warn('⚠️ 실시간 환율 API fetch 실패. 백업 시뮬레이터 가동.', fetchErr);
    }

    if (!apiSuccess) {
      const existingRatesRes = await queryTable('exchange_rates', {});
      const existing = existingRatesRes.rows || [];

      if (existing.length > 0) {
        updatedRates = existing.map((r: any) => {
          const changePercent = (Math.random() * 1.0 - 0.5) / 100;
          return {
            currency_code: r.currency_code,
            rate: Number((r.current_rate * (1 + changePercent)).toFixed(2)),
            name: r.currency_name
          };
        });
      } else {
        updatedRates = [
          { currency_code: 'USD', rate: 1380.0, name: '미국 달러' },
          { currency_code: 'EUR', rate: 1495.0, name: '유럽 유로' },
          { currency_code: 'JPY', rate: 880.0, name: '일본 엔화 (100)' },
          { currency_code: 'CNY', rate: 190.5, name: '중국 위안' }
        ];
      }
    }

    for (const r of updatedRates) {
      const checkRes = await queryTable('exchange_rates', { filters: { currency_code: r.currency_code } });
      const rows = checkRes.rows || [];

      if (rows.length > 0) {
        const oldRate = rows[0].current_rate;
        const diff = r.rate - oldRate;
        const changeRate = Number(((diff / oldRate) * 100).toFixed(2));
        const changeDirection = diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'FLAT';

        await updateRows('exchange_rates', {
          current_rate: r.rate,
          change_rate: changeRate,
          change_direction: changeDirection,
          last_updated_at: nowStr
        }, { filters: { currency_code: r.currency_code } });
      } else {
        await insertRows('exchange_rates', [{
          rate_id: Date.now() + Math.floor(Math.random() * 100),
          currency_code: r.currency_code,
          currency_name: r.name,
          current_rate: r.rate,
          change_rate: 0.0,
          change_direction: 'FLAT',
          last_updated_at: nowStr
        }]);
      }

      // 오늘 날짜의 환율 변동 이력(Histories) 존재 여부 검정 및 삽입 (하루 1건)
      const checkHistory = await queryTable('exchange_rate_histories', {
        filters: { currency_code: r.currency_code, captured_date: todayStr }
      });
      if (!checkHistory.rows || checkHistory.rows.length === 0) {
        await insertRows('exchange_rate_histories', [{
          history_id: Date.now() + Math.floor(Math.random() * 100000),
          currency_code: r.currency_code,
          rate_value: r.rate,
          captured_date: todayStr
        }]);
      }
    }

    const finalRatesRes = await queryTable('exchange_rates', { orderBy: 'rate_id', orderDirection: 'ASC' });
    return NextResponse.json({ 
      success: true, 
      rates: finalRatesRes.rows || [],
      source: apiSuccess ? 'LIVE_API' : 'SIMULATION_FALLBACK',
      message: '환율 정보 동기화가 성공적으로 완료되었습니다.'
    });

  } catch (error: any) {
    console.error('환율 업데이트 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
