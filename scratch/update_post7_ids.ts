import { updateRows } from '../egdesk-helpers';

async function updatePost7ById() {
  const targetUrl = 'https://blog.naver.com/nocodelife/224368717102';
  console.log(`Setting post_url of ID 7 to ${targetUrl}`);
  const res = await updateRows('crm_naver_blog_posts', { post_url: targetUrl }, { ids: [7] });
  console.log('✅ Successfully updated post 7 URL:', res);
}

updatePost7ById().catch(console.error);
