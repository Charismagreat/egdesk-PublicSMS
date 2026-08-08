async function testTriggerStartPopup() {
  const url = 'http://localhost:4002/api/naver-blog/publish-rpa';
  console.log(`🚀 Sending POST request to ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('HTTP Status:', res.status);
    const json = await res.json();
    console.log('Response JSON:', JSON.stringify(json, null, 2));
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

testTriggerStartPopup().catch(console.error);
