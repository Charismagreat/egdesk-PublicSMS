import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows, deleteRows, executeSQL } from '../../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';


// 🧠 지능형 자연어 한글 룰 파서 (Regex & Pattern Extractor)
function parseNaturalRule(text: string) {
  const cleanText = text.replace(/\s+/g, " ");

  // 1. 카드사 파싱 (예: "BC카드이고", "삼성카드이고")
  let cardCompanyName = null;
  const cardMatch = cleanText.match(/(BC카드|국민카드|삼성카드|신한카드|현대카드|롯데카드)/);
  if (cardMatch) {
    cardCompanyName = cardMatch[1];
  }

  // 2. 카드번호 뒤 4자리 파싱 (예: "카드번호 뒤 4자리 숫자가 6975이며")
  let cardNumberEnd = null;
  const numMatch = cleanText.match(/(?:카드번호 뒤\s*4자리|카드번호\s*뒷자리)\s*(?:숫자가|가)?\s*(\d{4})/);
  if (numMatch) {
    cardNumberEnd = numMatch[1];
  }

  // 3. 휴일 여부 파싱 (예: "사용일이 휴일이 아니고", "휴일이 아니고")
  let isHoliday = null;
  if (cleanText.includes("휴일이 아니고") || cleanText.includes("평일이고")) {
    isHoliday = false;
  } else if (cleanText.includes("휴일이고") || cleanText.includes("주말이고")) {
    isHoliday = true;
  }

  // 4. 시간 범위 파싱 (예: "오전 6시부터 오후 6시 사이에")
  let timeRange = null;
  const timeMatch = cleanText.match(/(오전|오후)\s*(\d+)시부터\s*(오전|오후)\s*(\d+)시/);
  if (timeMatch) {
    let startHour = parseInt(timeMatch[2]);
    let endHour = parseInt(timeMatch[4]);
    
    if (timeMatch[1] === "오후" && startHour < 12) startHour += 12;
    if (timeMatch[1] === "오전" && startHour === 12) startHour = 0;
    
    if (timeMatch[3] === "오후" && endHour < 12) endHour += 12;
    if (timeMatch[3] === "오전" && endHour === 12) endHour = 0;

    const formatTime = (h: number) => String(h).padStart(2, "0") + ":00";
    timeRange = {
      start: formatTime(startHour),
      end: formatTime(endHour)
    };
  }

  // 5. 금액 한도 파싱 (예: "20만원이하의 금액", "50000원이하")
  let amountMax = null;
  let amountMin = null;
  
  // 만원 단위 파싱
  const kmatchMax = cleanText.match(/(\d+)\s*만원\s*(이하)/);
  if (kmatchMax) {
    amountMax = parseInt(kmatchMax[1]) * 10000;
  }
  const kmatchMin = cleanText.match(/(\d+)\s*만원\s*(이상)/);
  if (kmatchMin) {
    amountMin = parseInt(kmatchMin[1]) * 10000;
  }
  
  // 원 단위 파싱 fallback
  if (!amountMax) {
    const rmatchMax = cleanText.match(/(\d+)\s*원\s*(이하)/);
    if (rmatchMax) amountMax = parseInt(rmatchMax[1]);
  }
  if (!amountMin) {
    const rmatchMin = cleanText.match(/(\d+)\s*원\s*(이상)/);
    if (rmatchMin) amountMin = parseInt(rmatchMin[1]);
  }

  // 6. 비고 차량번호/메모 키워드 파싱 (예: "차량번호 뒤 4자리 숫자가 1234인 경우")
  let memoContains = null;
  const memoMatch = cleanText.match(/(?:차량번호 뒤\s*4자리|차량번호\s*뒷자리|지출태그|태그|비고에)\s*(?:숫자가|가)?\s*(\d{4}|[가-힣a-zA-Z0-9]+)/);
  if (memoMatch) {
    memoContains = memoMatch[1];
  } else {
    // 일반 키워드 추론 매칭 (예: "태그에 'SCM'이 있고")
    const keywordMatch = cleanText.match(/태그에\s*['"“‘]([가-힣\s\w]+)['"”’]/);
    if (keywordMatch) {
      memoContains = keywordMatch[1];
    }
  }

  // 7. 결과 계정과목 소분류 파싱 (예: "차량유지비로 분류해야합니다", "접대비로 분류")
  let targetCategory = "";
  const catMatch = cleanText.match(/([가-힣\s]+)(?:으)?로\s*(?:분류|정산|지정)/);
  if (catMatch) {
    targetCategory = catMatch[1].trim();
  }

  if (!targetCategory) {
    throw new Error("자연어 규칙에서 자동 분류할 대상 '계정과목'을 판독해내지 못했습니다. (예: '차량유지비로 분류해야합니다' 구문 필요)");
  }

  return {
    cardCompanyName,
    cardNumberEnd,
    isHoliday,
    timeRange,
    amountMax,
    amountMin,
    memoContains,
    targetCategory
  };
}

// 📅 휴일 여부 계산기 (한국 주말 및 기본 공휴일 판독 헬퍼)
function checkIsHoliday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay();
  // 0: 일요일, 6: 토요일 -> 주말은 무조건 휴일
  if (day === 0 || day === 6) return true;

  // 한국 법정 공휴일 기본 사전 매핑 (MM-DD 포맷)
  const holidayMap = [
    "01-01", // 신정
    "03-01", // 삼일절
    "05-05", // 어린이날
    "06-06", // 현충일
    "08-15", // 광복절
    "10-03", // 개천절
    "10-09", // 한글날
    "12-25"  // 성탄절
  ];

  const monthDay = dateStr.substring(5); // "YYYY-MM-DD" -> "MM-DD"
  if (holidayMap.includes(monthDay)) return true;

  return false;
}

// 🕒 시간 범위 판독 헬퍼 (HH:MM:SS format)
function isTimeInRange(timeStr: string, startStr: string, endStr: string): boolean {
  if (!timeStr) return false;
  
  // "22:33:22" -> "22:33"
  const cleanTime = timeStr.substring(0, 5); 
  return cleanTime >= startStr && cleanTime <= endStr;
}

// 🚀 [RPA 엔진] 활성 규칙들을 스캔하여 해당하는 카드 승인 데이터를 자동 분류 & 대장 동기화 일괄 집행
async function applyRulesToTransactions() {
  // 1. 활성화 상태인 규칙 목록 로드
  const rulesRes = await executeSQL("SELECT * FROM natural_rules WHERE is_active = 1");
  let rules = rulesRes.rows || [];
  // JS 레벨에서 소프트 삭제 필터링
  rules = rules.filter((r: any) => !r.deleted_at);
  if (rules.length === 0) return 0;

  // 2. 미확정 거래 건 로드 (또는 규칙에 의해 자동 지정된 거래 건 포함)
  // 수동으로 계정과목을 강제 확정한 건은 건드리지 않고, 비어 있거나 규칙에 의해 기 자동화 처리된 건들을 재판독 대상으로 지정
  const txsRes = await executeSQL(`
    SELECT * FROM card_transactions 
    WHERE category IS NULL 
       OR category = '' 
       OR applied_rule_id IS NOT NULL
  `);
  let txs = txsRes.rows || [];
  // JS 레벨에서 소프트 삭제 필터링
  txs = txs.filter((t: any) => !t.deleted_at);

  let matchCount = 0;

  for (const tx of txs) {
    let matchedRule: any = null;

    for (const rule of rules) {
      const cond = JSON.parse(rule.structured_json);

      // (A) 카드사 조건
      if (cond.cardCompanyName) {
        const txCard = tx.cardCompanyName || "";
        if (!txCard.includes(cond.cardCompanyName)) continue;
      }

      // (B) 카드번호 뒷자리 조건
      if (cond.cardNumberEnd) {
        const txNum = tx.cardNumber || "";
        const cleanNum = txNum.replace(/[^0-9]/g, "");
        if (!cleanNum.endsWith(cond.cardNumberEnd)) continue;
      }

      // (C) 휴일 조건
      if (cond.isHoliday !== null) {
        const holidayApplied = checkIsHoliday(tx.date);
        if (holidayApplied !== cond.isHoliday) continue;
      }

      // (D) 시간대 조건
      if (cond.timeRange) {
        if (!isTimeInRange(tx.time, cond.timeRange.start, cond.timeRange.end)) continue;
      }

      // (E) 금액 한도 조건
      if (cond.amountMax !== null && tx.amount > cond.amountMax) continue;
      if (cond.amountMin !== null && tx.amount < cond.amountMin) continue;

      // (F) 비고(지출 태그) 조건
      if (cond.memoContains) {
        const txMemo = tx.memo || "";
        const txMerchant = tx.merchantName || "";
        const combined = `${txMemo} ${txMerchant}`;
        if (!combined.includes(cond.memoContains)) continue;
      }

      // 모든 조건 충족!
      matchedRule = rule;
      break; 
    }

    // 매칭 결과 반영
    if (matchedRule) {
      // DB에 계정과목 자동 갱신 및 룰 마크 마킹!
      await updateRows("card_transactions", {
        category: matchedRule.target_category,
        applied_rule_id: matchedRule.id,
        applied_rule_text: matchedRule.natural_text,
        updated_at: new Date().toISOString()
      }, {
        filters: { id: tx.id }
      });
      matchCount++;

      // 지출 대장(crm_expenses) 양방향 RPA 실시간 동기화
      try {
        await updateRows('crm_expenses', {
          category: matchedRule.target_category,
          memo: tx.memo || "",
          updated_at: new Date().toISOString()
        }, {
          filters: { id: `exp-card-${tx.id}` }
        });
      } catch (err: any) {
        console.warn(`[Rules Sync Warning] crm_expenses sync failed for card tx ${tx.id}:`, err.message);
      }
    } else {
      // 과거에 룰이 적용되어 자동분류 되었으나, 룰이 정지/삭제되었거나 조건에서 탈락한 건은 롤백
      if (tx.applied_rule_id) {
        await updateRows("card_transactions", {
          category: '',
          applied_rule_id: null,
          applied_rule_text: null,
          updated_at: new Date().toISOString()
        }, {
          filters: { id: tx.id }
        });

        try {
          await updateRows('crm_expenses', {
            category: "",
            memo: tx.memo || "",
            updated_at: new Date().toISOString()
          }, {
            filters: { id: `exp-card-${tx.id}` }
          });
        } catch (err) {}
      }
    }
  }

  return matchCount;
}

// ==========================================
// 🔑 1. GET: 등록된 전체 자연어 규칙 목록 조회
// ==========================================
export async function GET() {
  try {
    const rulesRes = await executeSQL("SELECT * FROM natural_rules ORDER BY created_at DESC");
    let rules = rulesRes.rows || [];
    // JS 레벨에서 소프트 삭제 필터링
    rules = rules.filter((r: any) => !r.deleted_at);
    
    return NextResponse.json({
      success: true,
      rules: rules.map((r: any) => ({
        ...r,
        is_active: Boolean(r.is_active),
        structured: JSON.parse(r.structured_json)
      }))
    });
  } catch (error: any) {
    console.error("Rules GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🧠 룰 간 정합성 경합 및 충돌 감지 헬퍼 함수
function detectRuleConflict(newRule: any, existingRules: any[]) {
  for (const r of existingRules) {
    if (!r.is_active) continue;
    
    let cond;
    try {
      cond = JSON.parse(r.structured_json);
    } catch (e) {
      continue;
    }

    // 1. 카드사 교집합 체크
    if (newRule.cardCompanyName && cond.cardCompanyName && newRule.cardCompanyName !== cond.cardCompanyName) {
      continue;
    }

    // 2. 카드번호 뒷자리 교집합 체크
    if (newRule.cardNumberEnd && cond.cardNumberEnd && newRule.cardNumberEnd !== cond.cardNumberEnd) {
      continue;
    }

    // 3. 평일/휴일 여부 교집합 체크
    if (newRule.isHoliday !== null && cond.isHoliday !== null && newRule.isHoliday !== cond.isHoliday) {
      continue;
    }

    // 4. 시간 범위 교집합 체크
    if (newRule.timeRange && cond.timeRange) {
      const aStart = newRule.timeRange.start;
      const aEnd = newRule.timeRange.end;
      const bStart = cond.timeRange.start;
      const bEnd = cond.timeRange.end;
      if (aEnd < bStart || aStart > bEnd) {
        continue;
      }
    }

    // 5. 금액 범위 교집합 체크
    const aMin = newRule.amountMin !== null ? newRule.amountMin : 0;
    const aMax = newRule.amountMax !== null ? newRule.amountMax : Infinity;
    const bMin = cond.amountMin !== null ? cond.amountMin : 0;
    const bMax = cond.amountMax !== null ? cond.amountMax : Infinity;
    if (aMax < bMin || aMin > bMax) {
      continue;
    }

    // 6. 메모/태그 키워드 교집합 체크
    if (newRule.memoContains && cond.memoContains) {
      const aMemo = String(newRule.memoContains).toLowerCase();
      const bMemo = String(cond.memoContains).toLowerCase();
      if (!aMemo.includes(bMemo) && !bMemo.includes(aMemo)) {
        continue;
      }
    }

    // 💡 모든 조건의 교집합이 존재함
    // 이때, 타겟 계정과목이 서로 다르면 "경합/충돌"로 진단
    if (newRule.targetCategory !== r.target_category) {
      return {
        conflict: true,
        conflictingRuleText: r.natural_text,
        conflictingRuleCategory: r.target_category,
        newRuleCategory: newRule.targetCategory
      };
    }
  }

  return { conflict: false };
}

// ==========================================
// 🔑 2. POST: 자연어 규칙 등록 및 즉시 일괄 분류 기동
// ==========================================
export async function POST(request: NextRequest) {
  try {
    // 최고 관리자 세션 체크
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: "인증 세션이 없습니다." }, { status: 401 });
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    if (role !== 'SUPER_ADMIN' && role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: "최고 관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { naturalText, force, previewOnly } = await request.json();
    if (!naturalText || !naturalText.trim()) {
      return NextResponse.json({ success: false, error: "등록할 자연어 규칙 텍스트가 전달되지 않았습니다." }, { status: 400 });
    }

    // 💡 자연어 파싱 기동
    const parsed = parseNaturalRule(naturalText);

    // ⚡ [드라이런 시뮬레이션] 영향을 받는 건 미리보기 요청인 경우
    if (previewOnly) {
      const txsRes = await executeSQL(`
        SELECT * FROM card_transactions 
        WHERE category IS NULL 
           OR category = '' 
           OR applied_rule_id IS NOT NULL
      `);
      let txs = txsRes.rows || [];
      txs = txs.filter((t: any) => !t.deleted_at);

      const previewList = [];
      for (const tx of txs) {
        // (A) 카드사 조건
        if (parsed.cardCompanyName) {
          const txCard = tx.cardCompanyName || "";
          if (!txCard.includes(parsed.cardCompanyName)) continue;
        }

        // (B) 카드번호 뒷자리 조건
        if (parsed.cardNumberEnd) {
          const txNum = tx.cardNumber || "";
          const cleanNum = txNum.replace(/[^0-9]/g, "");
          if (!cleanNum.endsWith(parsed.cardNumberEnd)) continue;
        }

        // (C) 휴일 조건
        if (parsed.isHoliday !== null) {
          const holidayApplied = checkIsHoliday(tx.date);
          if (holidayApplied !== parsed.isHoliday) continue;
        }

        // (D) 시간대 조건
        if (parsed.timeRange) {
          if (!isTimeInRange(tx.time, parsed.timeRange.start, parsed.timeRange.end)) continue;
        }

        // (E) 금액 한도 조건
        if (parsed.amountMax !== null && tx.amount > parsed.amountMax) continue;
        if (parsed.amountMin !== null && tx.amount < parsed.amountMin) continue;

        // (F) 비고(지출 태그) 조건
        if (parsed.memoContains) {
          const txMemo = tx.memo || "";
          const txMerchant = tx.merchantName || "";
          const combined = `${txMemo} ${txMerchant}`;
          if (!combined.includes(parsed.memoContains)) continue;
        }

        // 조건 충족!
        previewList.push({
          id: tx.id,
          date: tx.date,
          time: tx.time || "",
          cardCompanyName: tx.cardCompanyName || "",
          cardNumber: tx.cardNumber || "",
          merchantName: tx.merchantName || "",
          amount: tx.amount,
          currentCategory: tx.category || "미지정",
          targetCategory: parsed.targetCategory,
          memo: tx.memo || ""
        });
      }

      return NextResponse.json({
        success: true,
        conflict: false,
        previewList,
        parsedCondition: parsed
      });
    }

    // ⚡ [경합/충돌 예방] force 플래그가 참이 아닐 경우 기존 룰과의 충돌 분석 집행
    if (!force) {
      const existingRulesRes = await executeSQL("SELECT * FROM natural_rules WHERE is_active = 1");
      let existingRules = existingRulesRes.rows || [];
      existingRules = existingRules.filter((r: any) => !r.deleted_at);

      const conflictResult = detectRuleConflict(parsed, existingRules);
      if (conflictResult.conflict) {
        return NextResponse.json({
          success: true,
          conflict: true,
          error: `[충돌 우려 감지] 입력하신 규칙은 기존의 활성 규칙 ("${conflictResult.conflictingRuleText}" -> 계정과목: ${conflictResult.conflictingRuleCategory})과 매칭 조건이 대단히 유사하거나 중복되어 정산 경합이 발생할 수 있습니다.\n\n새 규칙의 계정과목: ${conflictResult.newRuleCategory}\n\n그래도 기존 룰보다 최우선하여 강제로 등록하시겠습니까?`,
        });
      }
    }

    const ruleId = `rule-${Date.now()}`;
    const createdAt = new Date().toISOString();

    await insertRows("natural_rules", [{
      id: ruleId,
      natural_text: naturalText.trim(),
      structured_json: JSON.stringify(parsed),
      target_category: parsed.targetCategory,
      is_active: 1,
      created_at: createdAt,
      updated_at: createdAt
    }]);

    console.log(`[Rules API] 새 자연어 규칙 등록 성공: ${ruleId}`);

    // ⚡ 즉시 RPA 자동 분류 매칭기 실행!
    const appliedCount = await applyRulesToTransactions();

    return NextResponse.json({
      success: true,
      conflict: false,
      message: `자연어 규칙이 성공적으로 등록되었습니다! 조건 분석 완료 및 총 ${appliedCount}건의 카드 사용 내역이 자동으로 분류 완료되었습니다.`,
      rule: {
        id: ruleId,
        natural_text: naturalText,
        target_category: parsed.targetCategory,
        is_active: true,
        structured: parsed
      },
      appliedCount
    });

  } catch (error: any) {
    console.error("Rules POST error:", error);
    return NextResponse.json({ success: false, error: error.message || "자연어 규칙 등록 중 예외가 발생했습니다." }, { status: 500 });
  }
}

// ==========================================
// 🔑 3. PUT: 규칙 활성화 여부(is_active) 토글 및 재배치
// ==========================================
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: "인증 세션이 없습니다." }, { status: 401 });
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    if (role !== 'SUPER_ADMIN' && role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: "최고 관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { id, isActive } = await request.json();
    if (!id) return NextResponse.json({ success: false, error: "규칙 ID는 필수값입니다." }, { status: 400 });

    await updateRows("natural_rules", {
      is_active: isActive ? 1 : 0,
      updated_at: new Date().toISOString()
    }, {
      filters: { id }
    });

    console.log(`[Rules API] 규칙 활성화 여부 변경 완료: ID ${id} -> ${isActive}`);

    // 상태 재적용을 위해 매칭 엔진 기동
    const appliedCount = await applyRulesToTransactions();

    return NextResponse.json({
      success: true,
      message: `규칙 상태가 성공적으로 변경되었습니다. 규칙 재적용 스캔을 통해 총 ${appliedCount}건의 카드 정산이 실시간 업데이트되었습니다.`,
      appliedCount
    });

  } catch (error: any) {
    console.error("Rules PUT error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ==========================================
// 🔑 4. DELETE: 규칙 삭제 및 연동 상태 롤백
// ==========================================
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: "인증 세션이 없습니다." }, { status: 401 });
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    if (role !== 'SUPER_ADMIN' && role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: "최고 관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: "삭제할 규칙 ID는 필수값입니다." }, { status: 400 });

    // 소프트 삭제 처리
    await updateRows("natural_rules", {
      deleted_at: new Date().toISOString(),
      deleted_by: (payload.username as string || 'system')
    }, {
      filters: { id }
    });

    console.log(`[Rules API] 규칙 삭제 성공: ID ${id}`);

    // 지워진 룰의 영향력을 롤백하기 위해 매칭 엔진 재기동
    const appliedCount = await applyRulesToTransactions();

    return NextResponse.json({
      success: true,
      message: "자연어 정산 규칙이 성공적으로 삭제되었으며, 기존에 룰로 지정되었던 미확정 내역들도 안전하게 초기화되었습니다."
    });

  } catch (error: any) {
    console.error("Rules DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
