process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { insertRows, updateRows, queryTable, createTable } = require('../egdesk-helpers');

async function updateManuals() {
  try {
    console.log('1. crm_system_manuals 테이블 보장 중...');
    try {
      await createTable('crm_system_manuals', [
        { name: 'id', type: 'TEXT', isPrimaryKey: true },
        { name: 'category', type: 'TEXT' },
        { name: 'title', type: 'TEXT' },
        { name: 'content', type: 'TEXT' },
        { name: 'tags', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' }
      ]);
    } catch (tblErr) {
      console.log('테이블 생성 통과/이미 존재함:', tblErr.message);
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    const manualData = [
      {
        id: 'manual_products_ai',
        category: '상품관리',
        title: '상품 관리 AI 핵심 이용 가이드',
        content: `[상품 관리 AI 이용 및 신기능 가이드]
1. 🛍️ 판매 중 상품 & ⚙️ 승인 대기 완제품 (DRAFT) 탭 분리 운영.
2. [↩️ 승인 취소] 기능: 판매 중 상품 컬럼에서 [삭제] 대신 [승인 취소] 아이콘 버튼을 누르면 실수 없는 복구가 가능하도록 '승인 대기 완제품 (DRAFT)' 탭으로 안전하게 복귀시킵니다.
3. [원클릭 쿠폰 전체 변경]: '쿠폰 적용' 테이블 헤더 옆 [전체 허용 🟢] / [전체 제외 ⚪] 단추를 통해 판매 중인 전체/목록 상품의 쿠폰 제외 여부를 1초 만에 일괄 전환할 수 있습니다.
4. [출처 뱃지 & 필터링]:
   - [📦 재고 연동 | 0개]: 재고 마스터 완제품 연동 상품 (보라색 뱃지 및 실시간 재고 수량 표시)
   - [✍️ 직접 등록]: 상품 관리 AI에서 직접 등록한 쇼핑몰 전용 상품 (에메랄드 뱃지)
   - 상단 헤더 '전체 출처 | 📦 재고 연동 | ✍️ 직접 등록' 탭으로 즉시 필터링 가능.
5. [쿠폰 적용 기본값]: 신규 등록 및 연동 상품의 기본값은 '쿠폰 적용 제외 (비활성화)' 상태로 세팅됩니다.`,
        tags: '상품관리,승인취소,쿠폰일괄,재고연동,출처뱃지',
        created_at: nowStr,
        updated_at: nowStr
      },
      {
        id: 'manual_naver_blog_ai',
        category: '마케팅',
        title: 'N-BLOG 포스팅 AI 및 오토파일럿 이용 가이드',
        content: `[N-BLOG 포스팅 AI & 오토파일럿 이용 가이드]
1. 1단계 마케팅 대상 상품 선택: 등록된 전체 판매 중 상품(69건 전수)이 100% 로드되어 검색 및 조회가 가능합니다.
2. 복수 선택 풀(Pool) 자율 추출 모드:
   - 상품 카드 좌측 체크박스([☑️])로 원하는 N개 상품을 복수 선택 시, 오토파일럿 AI가 그 체크된 상품 풀(Pool) 범위 안에서만 1순위 미발행 상품을 자율 픽업하여 자동 포스팅을 집필합니다.
3. 선택 해제 및 AI 무작위 추천 모드:
   - 체크된 카드를 다시 누르거나 우측 상단 [전체 해제 ✖️] 버튼을 누르면 선택이 해제되며, 전체 상품 AI 추천 모드로 전환됩니다.
4. 오토파일럿 AI 즉시 구동: ON 스위치 상태에서 [🚀 오토파일럿 AI 즉시 구동] 클릭 시 1초 만에 자동 블로그 예약 원고가 빌드됩니다.`,
        tags: '네이버블로그,N-BLOG,오토파일럿,복수선택,풀자율추출,마케팅AI',
        created_at: nowStr,
        updated_at: nowStr
      }
    ];

    for (const m of manualData) {
      const checkRes = await queryTable('crm_system_manuals', { filters: { id: m.id } });
      if (checkRes.rows && checkRes.rows.length > 0) {
        await updateRows('crm_system_manuals', m, { filters: { id: m.id } });
        console.log(`매뉴얼 매핑 갱신 완료: ${m.title}`);
      } else {
        await insertRows('crm_system_manuals', [m]);
        console.log(`매뉴얼 신규 추가 완료: ${m.title}`);
      }
    }

    console.log('🎉 사용자 가이드 및 RAG 매뉴얼 갱신이 성공적으로 완성되었습니다!');
  } catch (err) {
    console.error('매뉴얼 갱신 에러:', err.message);
  }
}

updateManuals();
