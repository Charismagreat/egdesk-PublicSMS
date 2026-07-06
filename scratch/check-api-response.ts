async function checkAPI() {
  console.log('=== [API 검증] http://localhost:3000/api/products 호출 ===\n');
  try {
    const res = await fetch('http://localhost:3000/api/products');
    const json = await res.json();
    console.log(`- API 호출 성공: ${json.success}`);
    console.log(`- 전체 반환된 상품 수: ${json.products ? json.products.length : 0}개`);
    
    if (json.success && json.products) {
      console.log('\n[API 반환 상품 목록]');
      json.products.forEach((p: any, idx: number) => {
        console.log(`[${idx + 1}] ID: ${p.id} | 이름: ${p.name} | category: "${p.category}" | menu_category: "${p.menu_category}"`);
      });
    }
  } catch (err: any) {
    console.error('API 호출 에러:', err.message);
  }
}

checkAPI();
