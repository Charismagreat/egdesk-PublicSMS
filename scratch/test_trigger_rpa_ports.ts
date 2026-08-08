async function testTriggerRpaPorts() {
  const candidatePorts = [4000, 4002, 4001, 4003, 3000];

  for (const port of candidatePorts) {
    const url = `http://localhost:${port}/api/naver-blog/publish-rpa`;
    console.log(`\nTesting port ${port}: ${url}`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`Port ${port} HTTP Status:`, res.status);
      const json = await res.json();
      console.log(`Port ${port} JSON:`, JSON.stringify(json, null, 2));
      break;
    } catch (e: any) {
      console.log(`Port ${port} failed: ${e.message}`);
    }
  }
}

testTriggerRpaPorts().catch(console.error);
