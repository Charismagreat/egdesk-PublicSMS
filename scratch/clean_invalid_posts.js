process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable, deleteRows } = require('../egdesk-helpers');

async function cleanInvalidPosts() {
  try {
    console.log('1. [포스팅 이력 정리] crm_naver_blog_posts 테이블 조회중...');
    const postsRes = await queryTable('crm_naver_blog_posts', { limit: 1000 });
    const posts = postsRes.rows || [];
    console.log(`현재 총 포스팅 이력 건수: ${posts.length} 건`);

    const prodsRes = await queryTable('products', { limit: 50000 });
    const prods = prodsRes.rows || [];
    const validProdIds = new Set(prods.map(p => String(p.id)));

    // 존재하지 않는 상품(WSD-YL970(B) 등)과 관련된 포스팅 건 추출
    const invalidPosts = posts.filter(p => 
      !p.deleted_at && (
        !p.product_id || 
        !validProdIds.has(String(p.product_id)) ||
        (p.title && p.title.includes('WSD-YL970(B)'))
      )
    );

    console.log(`제거할 무효/더미 포스팅 건수: ${invalidPosts.length} 건`);

    if (invalidPosts.length > 0) {
      const invalidIds = invalidPosts.map(p => Number(p.id));
      console.log('삭제 대상 IDs:', invalidIds);
      const delRes = await deleteRows('crm_naver_blog_posts', { ids: invalidIds });
      console.log('deleteRows 결과:', JSON.stringify(delRes, null, 2));
    }

  } catch (err) {
    console.error('포스팅 정리 중 오류:', err.message);
  }
}

cleanInvalidPosts();
