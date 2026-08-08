async function testSettingsApiSessionCheck() {
  console.log('📡 Testing GET /api/naver-blog/settings live session validation...');
  const res = await fetch('http://localhost:4000/api/naver-blog/settings');
  const json = await res.json();
  console.log('API Response:', JSON.stringify(json, null, 2));
}

testSettingsApiSessionCheck().catch(console.error);
