import { queryTable } from '../egdesk-helpers';

async function inspectDaemonLogLive() {
  console.log('🔍 Checking Post 10 details...');
  const res = await queryTable('crm_naver_blog_posts', { filters: { id: '10' } });
  console.log('Post 10 Row:', JSON.stringify(res.rows[0], null, 2));

  // 포트 스캔 테스트
  for (const port of [4000, 4002, 3000]) {
    try {
      const resApi = await fetch(`http://localhost:${port}/api/naver-blog/posts`);
      if (resApi.ok) {
        const data = await resApi.json();
        console.log(`Port ${port} is active! Posts count: ${data.posts?.length}`);
      }
    } catch (e) {
      console.log(`Port ${port} inactive:`, (e as any).message);
    }
  }
}

inspectDaemonLogLive().catch(console.error);
