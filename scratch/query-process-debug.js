// Native fetch will be used

async function main() {
  try {
    const url = 'http://localhost:4000/api/estimates/process?action=debug_db';
    console.log(`Fetching debug DB from ${url}...`);
    const res = await fetch(url);
    const json = await res.json();
    console.log('--- debug_db 응답 결과 ---');
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('호출 중 에러:', err.message);
  }
}

main();
