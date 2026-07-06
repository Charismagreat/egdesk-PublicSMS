async function verify() {
  const API_URL = 'http://localhost:4003/api/import-customs';

  try {
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`HTTP 에러 발생 (${res.status}):`, text.slice(0, 500));
      return;
    }

    const json = await res.json();
    console.log("=== Next.js API 기반 데이터 검증 결과 ===");
    if (json.success) {
      console.log("성공적으로 테이블과 시드 데이터를 조회했습니다!");
      console.log("조회된 건수:", json.total);
      console.table(json.rows);
    } else {
      console.error("API 쿼리 에러:", json.error || json);
    }
  } catch (err) {
    console.error("통신 에러:", err);
  }
}

verify();
