import { queryTable, updateRows } from '../egdesk-helpers';

async function fixPostUrls() {
  const postsRes = await queryTable('crm_naver_blog_posts', { limit: 10000 });
  const posts = postsRes.rows || [];
  
  console.log('--- ALL POSTS ---');
  for (const p of posts) {
    console.log(`ID: ${p.id}, Status: ${p.status}, Title: ${p.title}, PostURL: ${p.post_url}`);
    
    // 만약 POSTED 상태이면서 post_url이 없거나 section.blog.naver.com이면 보정
    if (p.status === 'POSTED' && (!p.post_url || p.post_url.includes('section.blog.naver.com'))) {
      const fixedUrl = 'https://blog.naver.com/nocodelife';
      console.log(`Fixing post ${p.id} post_url to ${fixedUrl}`);
      await updateRows('crm_naver_blog_posts', { post_url: fixedUrl }, { id: p.id });
    }
  }
}

fixPostUrls().catch(console.error);
