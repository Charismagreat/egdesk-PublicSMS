import { updateRows } from '../egdesk-helpers';

async function updatePost7() {
  const targetUrl = 'https://blog.naver.com/nocodelife/224368717102';
  console.log(`Setting post_url of ID 7 to ${targetUrl}`);
  await updateRows('crm_naver_blog_posts', { post_url: targetUrl }, { filters: { id: '7' } });
  console.log('Successfully updated post 7 URL!');
}

updatePost7().catch(console.error);
