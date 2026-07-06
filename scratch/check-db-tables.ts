import { executeSQL } from '../egdesk-helpers.js';

async function listAllTables() {
  console.log('=== [DB 검증] tracked_items 현재 레코드 ===\n');
  try {
    const res = await executeSQL("SELECT * FROM tracked_items");
    console.log(JSON.stringify(res.rows, null, 2));
    
    console.log('\n=== [DB 검증] target_urls 현재 레코드 ===\n');
    const urls = await executeSQL("SELECT * FROM target_urls");
    console.log(JSON.stringify(urls.rows, null, 2));

    console.log('\n=== [DB 검증] price_histories 수집 개수 ===\n');
    const hist = await executeSQL("SELECT COUNT(*) as cnt FROM price_histories");
    console.log(JSON.stringify(hist.rows, null, 2));
  } catch (err: any) {
    console.error('에러 발생:', err.message);
  }
}

listAllTables();
