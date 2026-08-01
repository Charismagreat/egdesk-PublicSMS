process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable } = require('../egdesk-helpers');

async function inspectProducts() {
  try {
    const res = await queryTable('products', { limit: 100 });
    const products = res.rows || [];
    console.log('총 Products 레코드 건수 (limit 100):', products.length);
    
    // 오토실매입형, SD-150(A), DP-90(II) 찾기
    const autoSeal = products.find(p => p.name && p.name.includes('오토실매입형'));
    console.log('오토실매입형 상품:', JSON.stringify(autoSeal, null, 2));

    const wsdItem = products.find(p => p.name && p.name.includes('WSD-YL970(B)'));
    console.log('WSD-YL970(B) 상품:', JSON.stringify(wsdItem, null, 2));

  } catch (err) {
    console.error('Inspect Error:', err);
  }
}

inspectProducts();
