async function testApiResponse() {
  const url = 'http://localhost:4002/api/naver-blog/posts';
  console.log(`Fetching from ${url}...`);
  const res = await fetch(url);
  const data = await res.json();
  console.log('API Success:', data.success);
  console.log('Posts count:', data.posts ? data.posts.length : 0);
  
  if (data.posts) {
    const nowThreshold = Date.now() + 1800000;
    console.log('Now Timestamp:', new Date().toISOString(), `(${Date.now()})`);
    console.log('Now Threshold:', new Date(nowThreshold).toISOString(), `(${nowThreshold})`);
    
    for (const p of data.posts) {
      const scheduledTime = p.scheduled_at ? new Date(p.scheduled_at).getTime() : 0;
      const isStatusOk = p.status === 'SCHEDULED' || (p.status === 'POSTED' && !p.post_url);
      const isTimeOk = !p.scheduled_at || scheduledTime <= nowThreshold;
      console.log(`ID ${p.id}: status="${p.status}", scheduled_at="${p.scheduled_at}" (timeMs: ${scheduledTime}), isStatusOk=${isStatusOk}, isTimeOk=${isTimeOk}`);
    }
  }
}

testApiResponse().catch(console.error);
