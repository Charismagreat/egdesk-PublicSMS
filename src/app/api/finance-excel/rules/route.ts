export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import {
  queryTable,
  insertRows,
  updateRows,
  executeSQL
} from "../../../../../egdesk-helpers";

// 🔑 세션 토큰 디코딩 및 격리 컨텍스트 획득 헬퍼
async function verifyUserRole() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    const username = payload.username as string || '';
    const tenantId = payload.tenant_id as string || 'default';
    
    const isAuthorized = role === 'SUPER_ADMIN' || role === 'SUB_OPERATOR' || role === 'PRESIDENT';
    
    return {
      isAuthorized,
      role,
      name,
      username,
      tenantId
    };
  } catch (e) {
    return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
  }
}

// 🧠 지능형 자연어 한글 룰 파서
function parseNaturalRule(text: string) {
  const cleanText = text.replace(/\s+/g, " ");

  let cardCompanyName = null;
  const cardMatch = cleanText.match(/(BC카드|국민카드|삼성카드|신한카드|현대카드|롯데카드)/);
  if (cardMatch) {
    cardCompanyName = cardMatch[1];
  }

  let cardNumberEnd = null;
  const numMatch = cleanText.match(/(?:카드번호 뒤\s*4자리|카드번호\s*뒷자리)\s*(?:숫자가|가)?\s*(\d{4})/);
  if (numMatch) {
    cardNumberEnd = numMatch[1];
  }

  let isHoliday = null;
  if (cleanText.includes("휴일이 아니고") || cleanText.includes("평일이고")) {
    isHoliday = false;
  } else if (cleanText.includes("휴일이고") || cleanText.includes("주말이고")) {
    isHoliday = true;
  }

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

  let amountMax = null;
  let amountMin = null;
  
  const kmatchMax = cleanText.match(/(\d+)\s*만원\s*(이하)/);
  if (kmatchMax) {
    amountMax = parseInt(kmatchMax[1]) * 10000;
  }
  const kmatchMin = cleanText.match(/(\d+)\s*만원\s*(이상)/);
  if (kmatchMin) {
    amountMin = parseInt(kmatchMin[1]) * 10000;
  }
  
  if (!amountMax) {
    const rmatchMax = cleanText.match(/(\d+)\s*원\s*(이하)/);
    if (rmatchMax) amountMax = parseInt(rmatchMax[1]);
  }
  if (!amountMin) {
    const rmatchMin = cleanText.match(/(\d+)\s*원\s*(이상)/);
    if (rmatchMin) amountMin = parseInt(rmatchMin[1]);
  }

  let memoContains = null;
  const memoMatch = cleanText.match(/(?:차량번호 뒤\s*4자리|차량번호\s*뒷자리|지출태그|태그|비고에)\s*(?:숫자가|가)?\s*(\d{4}|[가-힣a-zA-Z0-9]+)/);
  if (memoMatch) {
    memoContains = memoMatch[1];
  } else {
    const keywordMatch = cleanText.match(/태그에\s*['"“‘]([가-힣\s\w]+)['"”’]/);
    if (keywordMatch) {
      memoContains = keywordMatch[1];
    }
  }

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

function checkIsHoliday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay();
  if (day === 0 || day === 6) return true;

  const holidayMap = [
    "01-01", "03-01", "05-05", "06-06", "08-15", "10-03", "10-09", "12-25"
  ];
  const monthDay = dateStr.substring(5); 
  if (holidayMap.includes(monthDay)) return true;
  return false;
}

function isTimeInRange(timeStr: string, startStr: string, endStr: string): boolean {
  if (!timeStr) return false;
  const cleanTime = timeStr.substring(0, 5); 
  return cleanTime >= startStr && cleanTime <= endStr;
}

// 🚀 [RPA 엔진] 활성 규칙들을 스캔하여 해당하는 카드 승인 데이터를 자동 분류 & 대장 동기화 일괄 집행
async function applyRulesToTransactions(tenantId: string, username: string) {
  const rulesRes = await executeSQL(`SELECT * FROM excel_finance_rules WHERE tenant_id = '${tenantId}' AND is_active = 1 AND deleted_at IS NULL`);
  const rules = rulesRes.rows || [];
  
  // 미확정 거래 건 로드 (AppliedRuleId가 있는 것도 재판정 대상)
  const txsRes = await executeSQL(`
    SELECT * FROM excel_card_transactions 
    WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL AND (category IS NULL OR category = '' OR applied_rule_id IS NOT NULL)
  `);
  const txs = txsRes.rows || [];
  
  let matchCount = 0;
  const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  for (const tx of txs) {
    let matchedRule: any = null;

    for (const rule of rules) {
      const cond = JSON.parse(rule.structured_json);

      if (cond.cardCompanyName) {
        const txCard = tx.card_company_name || "";
        if (!txCard.includes(cond.cardCompanyName)) continue;
      }
      if (cond.cardNumberEnd) {
        const txNum = tx.card_number || "";
        const cleanNum = txNum.replace(/[^0-9]/g, "");
        if (!cleanNum.endsWith(cond.cardNumberEnd)) continue;
      }
      if (cond.isHoliday !== null) {
        const holidayApplied = checkIsHoliday(tx.approval_date);
        if (holidayApplied !== cond.isHoliday) continue;
      }
      if (cond.timeRange) {
        if (!isTimeInRange(tx.time, cond.timeRange.start, cond.timeRange.end)) continue;
      }
      if (cond.amountMax !== null && tx.amount > cond.amountMax) continue;
      if (cond.amountMin !== null && tx.amount < cond.amountMin) continue;
      if (cond.memoContains) {
        const txMemo = tx.memo || "";
        const txMerchant = tx.merchant_name || "";
        const combined = `${txMemo} ${txMerchant}`;
        if (!combined.includes(cond.memoContains)) continue;
      }

      matchedRule = rule;
      break; 
    }

    if (matchedRule) {
      const cond = JSON.parse(matchedRule.structured_json);
      await updateRows("excel_card_transactions", {
        category: cond.targetCategory,
        applied_rule_id: matchedRule.id,
        updated_at: nowStr,
        updated_by: username
      }, {
        filters: { id: tx.id, tenant_id: tenantId }
      });

      // 지출 대장 동기화 (RPA)
      try {
        await updateRows('crm_expenses', {
          category: cond.targetCategory,
          updated_at: nowStr,
          updated_by: username
        }, {
          filters: { id: `exp-excel-card-${tx.id}`, tenant_id: tenantId }
        });
      } catch (err: any) {
        console.warn("[Rules RPA Sync Warning] crm_expenses sync failed:", err.message);
      }
      matchCount++;
    } else {
      // 매칭되는 룰이 없는 경우 롤백 (이전에 룰로 지정되었던 것은 카테고리 비우기)
      if (tx.applied_rule_id) {
        await updateRows("excel_card_transactions", {
          category: "",
          applied_rule_id: null,
          updated_at: nowStr,
          updated_by: username
        }, {
          filters: { id: tx.id, tenant_id: tenantId }
        });

        try {
          await updateRows('crm_expenses', {
            category: "",
            updated_at: nowStr,
            updated_by: username
          }, {
            filters: { id: `exp-excel-card-${tx.id}`, tenant_id: tenantId }
          });
        } catch (err: any) {
          // ignore
        }
      }
    }
  }

  return matchCount;
}

// 🧠 [경합/충돌 예방] 규칙 간 중복 범위 분석 감지 헬퍼
function detectRuleConflict(newRule: any, existingRules: any[]) {
  for (const rule of existingRules) {
    const cond = JSON.parse(rule.structured_json);
    
    // 두 룰의 대상 카테고리가 다를 때만 충돌 판정 의미가 있음
    if (cond.targetCategory === newRule.targetCategory) continue;

    let overlaps = true;

    // 1. 카드사 충돌 검사
    if (cond.cardCompanyName && newRule.cardCompanyName && cond.cardCompanyName !== newRule.cardCompanyName) overlaps = false;
    
    // 2. 카드번호 뒷자리 충돌 검사
    if (cond.cardNumberEnd && newRule.cardNumberEnd && cond.cardNumberEnd !== newRule.cardNumberEnd) overlaps = false;

    // 3. 평일/휴일 충돌 검사
    if (cond.isHoliday !== null && newRule.isHoliday !== null && cond.isHoliday !== newRule.isHoliday) overlaps = false;

    // 4. 시간대 범위 교차 검사
    if (cond.timeRange && newRule.timeRange) {
      const s1 = cond.timeRange.start;
      const e1 = cond.timeRange.end;
      const s2 = newRule.timeRange.start;
      const e2 = newRule.timeRange.end;
      
      const noOverlap = (e1 < s2) || (e2 < s1);
      if (noOverlap) overlaps = false;
    }

    // 5. 금액 범위 교차 검사
    if (overlaps) {
      const min1 = cond.amountMin ?? 0;
      const max1 = cond.amountMax ?? Infinity;
      const min2 = newRule.amountMin ?? 0;
      const max2 = newRule.amountMax ?? Infinity;

      const noOverlap = (max1 < min2) || (max2 < min1);
      if (noOverlap) overlaps = false;
    }

    // 6. 지출태그(비고) 교차 검사
    if (cond.memoContains && newRule.memoContains && cond.memoContains !== newRule.memoContains) overlaps = false;

    if (overlaps) {
      return {
        conflict: true,
        conflictingRuleText: rule.natural_text,
        conflictingRuleCategory: cond.targetCategory,
        newRuleCategory: newRule.targetCategory
      };
    }
  }

  return { conflict: false };
}

// 📂 [GET] 해당 테넌트의 전체 정산 규칙 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { isAuthorized, tenantId } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const rulesRes = await queryTable('excel_finance_rules', {
      filters: { tenant_id: tenantId }
    });

    const activeRules = (rulesRes?.rows || []).filter((r: any) => !r.deleted_at);

    return NextResponse.json({
      success: true,
      rules: activeRules.map((r: any) => ({
        id: r.id,
        natural_text: r.natural_text,
        target_category: r.target_category,
        is_active: r.is_active === 1,
        structured: r.structured_json ? JSON.parse(r.structured_json) : null
      }))
    });
  } catch (error: any) {
    console.error("Rules GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 📂 [POST] 자연어 규칙 등록 및 일괄 재정산
export async function POST(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { naturalText, force, previewOnly } = await request.json();

    if (!naturalText || !naturalText.trim()) {
      return NextResponse.json({ success: false, error: "규칙 텍스트(naturalText)가 비어있습니다." }, { status: 400 });
    }

    // 1. 자연어 규칙 파싱
    let parsed;
    try {
      parsed = parseNaturalRule(naturalText);
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message || "자연어 규칙 해석에 실패했습니다." }, { status: 400 });
    }

    // 2. 미리보기만 요청된 경우 (임시 스캔 테스트)
    if (previewOnly) {
      const txsRes = await executeSQL(`
        SELECT * FROM excel_card_transactions 
        WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL AND (category IS NULL OR category = '' OR applied_rule_id IS NOT NULL)
      `);
      const txs = txsRes.rows || [];
      const previewList = [];

      for (const tx of txs) {
        if (parsed.cardCompanyName) {
          const txCard = tx.card_company_name || "";
          if (!txCard.includes(parsed.cardCompanyName)) continue;
        }
        if (parsed.cardNumberEnd) {
          const txNum = tx.card_number || "";
          const cleanNum = txNum.replace(/[^0-9]/g, "");
          if (!cleanNum.endsWith(parsed.cardNumberEnd)) continue;
        }
        if (parsed.isHoliday !== null) {
          const holidayApplied = checkIsHoliday(tx.approval_date);
          if (holidayApplied !== parsed.isHoliday) continue;
        }
        if (parsed.timeRange) {
          if (!isTimeInRange(tx.time, parsed.timeRange.start, parsed.timeRange.end)) continue;
        }
        if (parsed.amountMax !== null && tx.amount > parsed.amountMax) continue;
        if (parsed.amountMin !== null && tx.amount < parsed.amountMin) continue;
        if (parsed.memoContains) {
          const txMemo = tx.memo || "";
          const txMerchant = tx.merchant_name || "";
          const combined = `${txMemo} ${txMerchant}`;
          if (!combined.includes(parsed.memoContains)) continue;
        }

        previewList.push({
          id: tx.id,
          date: tx.approval_date,
          time: tx.time || "",
          cardCompanyName: tx.card_company_name || "",
          cardNumber: tx.card_number || "",
          merchantName: tx.merchant_name || "",
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

    // 3. 중복/충돌 감지 (force 옵션이 없을 때)
    if (!force) {
      const existingRulesRes = await executeSQL(`SELECT * FROM excel_finance_rules WHERE tenant_id = '${tenantId}' AND is_active = 1 AND deleted_at IS NULL`);
      const existingRules = existingRulesRes.rows || [];
      
      const conflictResult = detectRuleConflict(parsed, existingRules);
      if (conflictResult.conflict) {
        return NextResponse.json({
          success: true,
          conflict: true,
          error: `[충돌 우려 감지] 입력하신 규칙은 기존의 활성 규칙 ("${conflictResult.conflictingRuleText}" -> 계정과목: ${conflictResult.conflictingRuleCategory})과 매칭 조건이 대단히 유사하거나 중복되어 정산 경합이 발생할 수 있습니다.\n\n새 규칙의 계정과목: ${conflictResult.newRuleCategory}\n\n그래도 기존 룰보다 최우선하여 강제로 등록하시겠습니까?`,
        });
      }
    }

    // 4. 규칙 삽입
    const ruleId = `rule-${Date.now()}`;
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const uuid = `rule-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await insertRows("excel_finance_rules", [{
      id: ruleId,
      natural_text: naturalText.trim(),
      structured_json: JSON.stringify(parsed),
      target_category: parsed.targetCategory,
      is_active: 1,
      tenant_id: tenantId,
      uuid: uuid,
      updated_at: nowStr,
      updated_by: username
    }]);

    // 5. 즉시 자동 재배치 룰 스캔 가동
    const appliedCount = await applyRulesToTransactions(tenantId, username);

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

// 📂 [PUT] 규칙 상태 (활성화/비활성화) 변경
export async function PUT(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { id, isActive } = await request.json();
    if (!id) return NextResponse.json({ success: false, error: "규칙 ID는 필수값입니다." }, { status: 400 });

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await updateRows("excel_finance_rules", {
      is_active: isActive ? 1 : 0,
      updated_at: nowStr,
      updated_by: username
    }, {
      filters: { id, tenant_id: tenantId }
    });

    const appliedCount = await applyRulesToTransactions(tenantId, username);

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

// 📂 [DELETE] 규칙 소프트 삭제 처리
export async function DELETE(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: "삭제할 규칙 ID는 필수값입니다." }, { status: 400 });

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await updateRows("excel_finance_rules", {
      deleted_at: nowStr,
      deleted_by: username
    }, {
      filters: { id, tenant_id: tenantId }
    });

    const appliedCount = await applyRulesToTransactions(tenantId, username);

    return NextResponse.json({
      success: true,
      message: "자연어 정산 규칙이 성공적으로 삭제되었으며, 기존에 룰로 지정되었던 내역들도 안전하게 정비되었습니다."
    });
  } catch (error: any) {
    console.error("Rules DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
