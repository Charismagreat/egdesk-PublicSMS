async function testDaemonFetch() {
  console.log('Testing exact daemon fetch logic...');
  const testUrl = 'http://localhost:4002';
  const cleanUrl = testUrl.replace(/\/$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  
  try {
    const resList = await fetch(`${cleanUrl}/api/naver-blog/posts`, { signal: controller.signal });
    clearTimeout(timeoutId);
    console.log('resList ok:', resList.ok, 'status:', resList.status);
    const dataList = await resList.json();
    console.log('dataList success:', dataList.success, 'isArray:', Array.isArray(dataList.posts), 'count:', dataList.posts?.length);
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

testDaemonFetch().catch(console.error);
