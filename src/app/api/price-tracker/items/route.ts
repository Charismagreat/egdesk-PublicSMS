export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows } from '@/../egdesk-helpers';

// GET /api/price-tracker/items : 가격 추적 품목 리스트 조회 및 실시간 마진율 연동 계산
export async function GET() {
  try {
    const itemsRes = await queryTable('tracked_items', { orderBy: 'item_id', orderDirection: 'DESC' });
    const items = (itemsRes.rows || []).filter((item: any) => !item.deleted_at);

    // 각 품목별 최신 가격을 이력에서 조회하여 마진율 실시간 동적 매핑
    const enrichedItems = await Promise.all(items.map(async (item: any) => {
      // url_id 추출을 위해 target_urls 조회
      let urlsRes = await queryTable('target_urls', { filters: { item_id: String(item.item_id) } });
      let urls = urlsRes.rows || [];

      // 🧹 [실시간 구버전 다나와 중개 노드 소탕 가드]
      // 조회 결과 중 prod.danawa.com/info/?pcode= 가 들어있는 노드가 있다면 즉시 소멸 처리
      const oldDanawaNodes = urls.filter((u: any) => u.target_url && u.target_url.includes('prod.danawa.com/info/?pcode='));
      if (oldDanawaNodes.length > 0) {
        console.log(`🧹 [Items-GET-Guard] 잘못 매핑된 구버전 다나와 중개 노드 ${oldDanawaNodes.length}개 발견. 실시간 청소 기동.`);
        for (const node of oldDanawaNodes) {
          await deleteRows('target_urls', { filters: { url_id: String(node.url_id) } });
        }
        // 삭제 후 다시 조회하여 최신 노드 정보 동기화
        urlsRes = await queryTable('target_urls', { filters: { item_id: String(item.item_id) } });
        urls = urlsRes.rows || [];
      }
      
      let latestPrice = 0;
      let latestKrwPrice = 0;
      let latestTime = '-';
      let latestSiteName = '수집기 매핑 없음';
      let latestSiteUrl = '#';
      const activePrices: any[] = [];

      // 외화 계산을 위한 환율 가중치 조회 (fallback용으로 가져옴)
      let usdRate = 1380;
      let jpyRate = 8.8; // 100엔 기준
      let eurRate = 1480;
      let cnyRate = 190;
      try {
        const ratesRes = await queryTable('exchange_rates', {});
        const rates = ratesRes.rows || [];
        const usdObj = rates.find((r: any) => r.currency_code === 'USD');
        if (usdObj) usdRate = Number(usdObj.current_rate || 1380);
        const jpyObj = rates.find((r: any) => r.currency_code === 'JPY');
        if (jpyObj) jpyRate = Number(jpyObj.current_rate || 880) / 100;
        const eurObj = rates.find((r: any) => r.currency_code === 'EUR');
        if (eurObj) eurRate = Number(eurObj.current_rate || 1480);
        const cnyObj = rates.find((r: any) => r.currency_code === 'CNY');
        if (cnyObj) cnyRate = Number(cnyObj.current_rate || 190);
      } catch (rateErr) {
        console.warn('exchange_rates 조회 실패 (기본값 작동):', rateErr);
      }

      const getKrwPrice = (price: number, currency: string) => {
        if (!currency || currency === 'KRW') return price;
        if (currency === 'USD') return price * usdRate;
        if (currency === 'JPY') return price * jpyRate;
        if (currency === 'EUR') return price * eurRate;
        if (currency === 'CNY') return price * cnyRate;
        return price;
      };

      if (urls.length > 0) {

        for (const url of urls) {
          const historyRes = await queryTable('price_histories', {
            filters: { url_id: String(url.url_id), status: 'SUCCESS' },
            orderBy: 'captured_at',
            orderDirection: 'DESC',
            limit: 1
          });
          const histories = historyRes.rows || [];
          if (histories.length > 0) {
            const rawPrice = Number(histories[0].captured_price || 0);
            
            // 수집된 화폐 정보는 target_urls나 price_histories에 명시되어 있지 않다면, site_name이나 url을 분석해서 알아낼 수 있다.
            let currency = 'KRW';
            const siteLower = (url.site_name || '').toLowerCase();
            const urlLower = (url.target_url || '').toLowerCase();
            if (siteLower.includes('아마존') || siteLower.includes('amazon') || siteLower.includes('알리') || siteLower.includes('aliexpress') || urlLower.includes('amazon.com') || urlLower.includes('aliexpress.com')) {
              currency = 'USD';
            } else if (
              siteLower.includes('타오바오') || siteLower.includes('taobao') ||
              siteLower.includes('티몰') || siteLower.includes('tmall') ||
              urlLower.includes('taobao.com') || urlLower.includes('tmall.com') || urlLower.includes('1688.com')
            ) {
              currency = 'CNY';
            } else if (
              siteLower.includes('야후재팬') || siteLower.includes('yahoo.co.jp') ||
              siteLower.includes('라쿠텐') || siteLower.includes('rakuten') ||
              urlLower.includes('yahoo.co.jp') || urlLower.includes('rakuten.co.jp')
            ) {
              currency = 'JPY';
            } else if (
              siteLower.includes('유로') || siteLower.includes('euro') ||
              urlLower.includes('.de') || urlLower.includes('.fr') || urlLower.includes('.it') || urlLower.includes('.es')
            ) {
              currency = 'EUR';
            }
            
            const krwPrice = getKrwPrice(rawPrice, currency);
            activePrices.push({
              price: rawPrice,
              krwPrice: krwPrice,
              time: histories[0].captured_at || '-',
              siteName: url.site_name || '알 수 없음',
              siteUrl: url.target_url || '#',
              currency: currency
            });
          }
        }

        if (activePrices.length > 0) {
          // 원화 환산가 기준 최저가(Min) 노드 색출!
          const minPriceObj = activePrices.reduce((prev, curr) => prev.krwPrice < curr.krwPrice ? prev : curr);
          latestKrwPrice = minPriceObj.krwPrice;
          
          const itemCurrency = item.currency_code || 'KRW';
          if (itemCurrency === 'KRW') {
            latestPrice = minPriceObj.krwPrice;
          } else {
            // 품목 자체의 해외 통화 기준에 맞추어 역산해서 대입
            if (itemCurrency === 'USD') latestPrice = Number((minPriceObj.krwPrice / usdRate).toFixed(2));
            else if (itemCurrency === 'JPY') latestPrice = Number((minPriceObj.krwPrice / jpyRate).toFixed(2));
            else if (itemCurrency === 'EUR') latestPrice = Number((minPriceObj.krwPrice / eurRate).toFixed(2));
            else if (itemCurrency === 'CNY') latestPrice = Number((minPriceObj.krwPrice / cnyRate).toFixed(2));
            else latestPrice = minPriceObj.price;
          }
          latestTime = minPriceObj.time;
          latestSiteName = minPriceObj.siteName;
          latestSiteUrl = minPriceObj.siteUrl;
        }
      }

      // 원화(KRW) 기준 기준가격 계산
      const basePriceKrw = getKrwPrice(item.base_price, item.currency_code || 'KRW');

      // 실시간 마진 계산: (기준가 - 수집된가격) / 기준가 * 100
      let currentMarginRate = 0;
      if (item.base_price > 0 && latestPrice > 0) {
        // 원자재의 경우 (자사기준가 - 원자재시장가) / 자사기준가
        // 완제품 경쟁가의 경우 (경쟁사시장가 - 자사기준원가) / 경쟁사시장가
        if (item.category === 'RAW_MATERIAL') {
          currentMarginRate = ((item.base_price - latestPrice) / item.base_price) * 100;
        } else {
          currentMarginRate = ((latestPrice - item.base_price) / latestPrice) * 100;
        }
      }

      return {
        ...item,
        latest_price: latestPrice,
        latest_krw_price: latestKrwPrice,
        base_price_krw: basePriceKrw,
        latest_captured_at: latestTime,
        latest_site_name: latestSiteName,
        latest_site_url: latestSiteUrl,
        current_margin_rate: Number(currentMarginRate.toFixed(2)),
        collectors_count: urls.length,
        collectors_prices: activePrices
      };
    }));

    return NextResponse.json({ success: true, items: enrichedItems });
  } catch (error: any) {
    console.error('Failed to fetch tracked items:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/price-tracker/items : 신규 가격 추적 품목 등록
export async function POST(req: Request) {
  try {
    const { item_code, item_name, category, spec, base_price, target_margin_rate, currency_code } = await req.json();

    if (!item_code || !item_name || !base_price) {
      return NextResponse.json({ success: false, error: '필수 정보가 누락되었습니다. (품목코드, 품목명, 기준가)' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const newId = Date.now();

    await insertRows('tracked_items', [{
      item_id: newId,
      item_code,
      item_name,
      category: category || 'RAW_MATERIAL',
      spec: spec || null,
      base_price: Number(base_price),
      target_margin_rate: Number(target_margin_rate || 10),
      currency_code: currency_code || 'KRW',
      created_at: nowStr
    }]);

    return NextResponse.json({ success: true, item_id: newId });
  } catch (error: any) {
    console.error('Failed to create tracked item:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/price-tracker/items : 추적 품목 수정
export async function PUT(req: Request) {
  try {
    const { item_id, item_code, item_name, category, spec, base_price, target_margin_rate, currency_code } = await req.json();

    if (!item_id) {
      return NextResponse.json({ success: false, error: '품목 ID가 누락되었습니다.' }, { status: 400 });
    }

    await updateRows('tracked_items', {
      item_code,
      item_name,
      category,
      spec: spec || null,
      base_price: Number(base_price),
      target_margin_rate: Number(target_margin_rate || 10),
      currency_code: currency_code || 'KRW'
    }, { filters: { item_id: String(item_id) } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update tracked item:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/price-tracker/items : 추적 품목 삭제 (및 연관 감시 URL들 동반 삭제)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('item_id');

    if (!itemId) {
      return NextResponse.json({ success: false, error: '품목 ID가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 해당 품목에 연결된 target_urls 조회
    const urlsRes = await queryTable('target_urls', { filters: { item_id: itemId } });
    const urls = urlsRes.rows || [];

    // 2. 각 URL에 종속된 price_histories 및 alert_rules 삭제
    for (const url of urls) {
      try {
        await deleteRows('price_histories', { filters: { url_id: String(url.url_id) } });
        await deleteRows('alert_rules', { filters: { url_id: String(url.url_id) } });
      } catch (subErr) {
        console.warn(`⚠️ url_id ${url.url_id} 관련 이력/알림룰 삭제 실패:`, subErr);
      }
    }

    // 3. target_urls 에서 해당 품목 관련 URL 데이터 전체 삭제
    await deleteRows('target_urls', { filters: { item_id: itemId } });

    // 4. tracked_items 테이블에서 품목 자체 삭제
    await deleteRows('tracked_items', { filters: { item_id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete tracked item:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

