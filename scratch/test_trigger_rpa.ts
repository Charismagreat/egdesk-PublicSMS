async function testTriggerRpa() {
  console.log('🚀 Triggering /api/naver-blog/publish-rpa API directly...');
  
  try {
    const res = await fetch('http://localhost:4000/api/naver-blog/publish-rpa', {
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

testTriggerRpa().catch(console.error);
