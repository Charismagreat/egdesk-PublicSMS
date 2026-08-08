import { chromium } from 'playwright';
import { queryTable, updateRows } from '../egdesk-helpers';

async function runSyncViewsNowV2() {
  const blogId = 'nocodelife';
  console.log(`🚀 Fetching real-time views (readCount) for blog: ${blogId}...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const listUrl = `https://blog.naver.com/PostTitleListAsync.naver?blogId=${blogId}&viewdate=&currentPage=1&categoryNo=0&parentCategoryNo=0&countPerPage=50`;
  const response = await page.goto(listUrl, { waitUntil: 'domcontentloaded' });
  const jsonText = await response.text();

  let data: any = null;
  try { data = JSON.parse(jsonText); } catch (e) {}

  const postList = data?.postList || [];
  console.log(`Parsed ${postList.length} posts from Naver.`);

  const postsRes = await queryTable('crm_naver_blog_posts', {});
  const dbPosts = postsRes.rows || [];

  let updatedCount = 0;
  for (const item of postList) {
    const logNo = String(item.logNo);
    const readCount = Number(item.readCount) || 0;
    
    const matched = dbPosts.find((p: any) => p.post_url && p.post_url.includes(logNo));
    if (matched) {
      console.log(`📌 Post ID: ${matched.id}, LogNo: ${logNo}, Title: ${matched.title.slice(0, 20)}... ➔ readCount (Views): ${readCount}`);
      await updateRows('crm_naver_blog_posts', { views_count: readCount }, { filters: { id: String(matched.id) } });
      updatedCount++;
    }
  }

  console.log(`✅ Successfully updated ${updatedCount} posts views in DB!`);
  await browser.close();
}

runSyncViewsNowV2().catch(console.error);
