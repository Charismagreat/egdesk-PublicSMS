import { executeSQL } from '../egdesk-helpers';

async function updateSqlPost7() {
  const sql = `UPDATE crm_naver_blog_posts SET post_url = 'https://blog.naver.com/nocodelife/224368717102' WHERE id = 7`;
  console.log('Executing SQL:', sql);
  await executeSQL(sql);
  console.log('✅ Successfully updated post 7 URL via executeSQL!');
}

updateSqlPost7().catch(console.error);
