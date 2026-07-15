process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';
process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

const helpers = require('../egdesk-helpers.js');

const nationalTaxCategories = [
  // 1. 판매비와관리비 (국세청 표준손익계산서 지정 비용 과목)
  { main_category: "판매비와관리비", mid_category: "인건비", sub_category: "급여" },
  { main_category: "판매비와관리비", mid_category: "인건비", sub_category: "퇴직급여" },
  { main_category: "판매비와관리비", mid_category: "복리후생", sub_category: "복리후생비" },
  { main_category: "판매비와관리비", mid_category: "여정/통신", sub_category: "여비교통비" },
  { main_category: "판매비와관리비", mid_category: "여정/통신", sub_category: "통신비" },
  { main_category: "판매비와관리비", mid_category: "에너지/유틸", sub_category: "수도광열비" },
  { main_category: "판매비와관리비", mid_category: "공과/세금", sub_category: "세금과공과" },
  { main_category: "판매비와관리비", mid_category: "임대/감가", sub_category: "감가상각비" },
  { main_category: "판매비와관리비", mid_category: "임대/감가", sub_category: "지급임차료" },
  { main_category: "판매비와관리비", mid_category: "유지/보수", sub_category: "수선비" },
  { main_category: "판매비와관리비", mid_category: "유지/보수", sub_category: "보험료" },
  { main_category: "판매비와관리비", mid_category: "유지/보수", sub_category: "차량유지비" },
  { main_category: "판매비와관리비", mid_category: "업무/선전", sub_category: "기업업무추진비(접대비)" },
  { main_category: "판매비와관리비", mid_category: "업무/선전", sub_category: "광고선전비" },
  { main_category: "판매비와관리비", mid_category: "업무/선전", sub_category: "교육훈련비" },
  { main_category: "판매비와관리비", mid_category: "업무/선전", sub_category: "회의비" },
  { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "소모품비" },
  { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "도서인쇄비" },
  { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "지급수수료" },
  { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "경상연구개발비" },
  { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "대손상각비" },
  { main_category: "판매비와관리비", mid_category: "소모/기타", sub_category: "기타판매비와관리비" },

  // 2. 제조경비 (국세청 표준제조원가명세서 지정 비용 과목)
  { main_category: "제조경비", mid_category: "원자재", sub_category: "원재료비" },
  { main_category: "제조경비", mid_category: "원자재", sub_category: "부재료비" },
  { main_category: "제조경비", mid_category: "공장 노무비", sub_category: "임금" },
  { main_category: "제조경비", mid_category: "공장 노무비", sub_category: "급여" },
  { main_category: "제조경비", mid_category: "공장 노무비", sub_category: "퇴직급여" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "복리후생비" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "여비교통비" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "가스수도료" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "전력비" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "세금과공과" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "감가상각비" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "지급임차료" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "수선비" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "보험료" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "소모품비" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "외주가공비" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "특허권사용료" },
  { main_category: "제조경비", mid_category: "공장 경비", sub_category: "기타제조경비" },

  // 3. 영업외비용 (국세청 표준손익계산서 지정 영업외 비용 과목)
  { main_category: "영업외비용", mid_category: "금융/통상", sub_category: "이자비용" },
  { main_category: "영업외비용", mid_category: "금융/통상", sub_category: "외환차손" },
  { main_category: "영업외비용", mid_category: "금융/통상", sub_category: "외화환산손실" },
  { main_category: "영업외비용", mid_category: "금융/통상", sub_category: "매출채권처분손실" },
  { main_category: "영업외비용", mid_category: "자산/손실", sub_category: "유형자산처분손실" },
  { main_category: "영업외비용", mid_category: "자산/손실", sub_category: "투자자산처분손실" },
  { main_category: "영업외비용", mid_category: "자산/손실", sub_category: "재고자산감모손실" },
  { main_category: "영업외비용", mid_category: "자산/손실", sub_category: "재해손실" },
  { main_category: "영업외비용", mid_category: "기부/기타", sub_category: "기부금" },
  { main_category: "영업외비용", mid_category: "기부/기타", sub_category: "잡손실" },

  // 4. 법인세비용 (국세청 표준손익계산서 세금 항목)
  { main_category: "법인세비용", mid_category: "법인세", sub_category: "법인세비용" }
];

async function run() {
  try {
    console.log('1. 기존 사용자 격리 공간의 4대 대분류 계정과목 삭제 진행 중...');
    
    // 4대 대분류별로 deleteRows 실행
    const del1 = await helpers.deleteRows('expense_categories', { filters: { main_category: '판매비와관리비' } });
    console.log('판매비와관리비 삭제 완료:', JSON.stringify(del1));

    const del2 = await helpers.deleteRows('expense_categories', { filters: { main_category: '제조경비' } });
    console.log('제조경비 삭제 완료:', JSON.stringify(del2));

    const del3 = await helpers.deleteRows('expense_categories', { filters: { main_category: '영업외비용' } });
    console.log('영업외비용 삭제 완료:', JSON.stringify(del3));

    const del4 = await helpers.deleteRows('expense_categories', { filters: { main_category: '법인세비용' } });
    console.log('법인세비용 삭제 완료:', JSON.stringify(del4));

    console.log('2. 국세청 표준 계정과목 목록 조립 중...');
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const baseTime = Date.now();

    const rowsToInsert = nationalTaxCategories.map((cat, index) => ({
      id: `cat-nt-${baseTime}-${index}`,
      main_category: cat.main_category,
      mid_category: cat.mid_category,
      sub_category: cat.sub_category,
      created_at: nowStr
    }));

    console.log(`총 ${rowsToInsert.length}개의 국세청 표준 계정과목 데이터를 조립했습니다.`);

    console.log('3. DB에 일괄 적재(insertRows) 실행 중...');
    await helpers.insertRows('expense_categories', rowsToInsert);
    console.log(`🟢 성공적으로 ${rowsToInsert.length}개의 국세청 표준 계정과목이 사용자 격리 공간에 완벽하게 이식되었습니다!`);
  } catch (err) {
    console.error('❌ 국세청 표준 계정과목 동기화 실패:', err.message);
  }
}

run();
