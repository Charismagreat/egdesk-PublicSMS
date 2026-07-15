export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, deleteRows, updateRows } from '@/../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

async function getRoleFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return 'SUB_OPERATOR';
    const payload = decodeJwt(token);
    return payload.role as string || 'SUB_OPERATOR';
  } catch (e) {
    return 'SUB_OPERATOR';
  }
}

// YYYY-MM-DD 형식에서 월(YYYY-MM) 추출 헬퍼
function getYearMonth(dateStr: string) {
  return dateStr.slice(0, 7);
}

// YYYY-MM-DD 형식의 현재 날짜를 반환 (KST 기준)
function getKstDateStr() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 1000;
    
    // 1. 모든 지출 내역 조회
    const expensesRes = await queryTable('crm_expenses', {
      filters: { tenant_id: tenantId },
      limit,
      orderBy: 'expense_date',
      orderDirection: 'DESC'
    });
    const expenses = (expensesRes.rows || []).filter((exp: any) => !exp.deleted_at);

    // 2. 예산 설정 조회
    const settingsRes = await queryTable('expense_settings', { filters: { id: '1' } });
    const expenseSetting = settingsRes.rows?.[0] || {
      monthly_budget: 3000000,
      is_alert_enabled: 1,
      alert_threshold_percent: 90,
      alert_sms_template: '[🚨지출AI] 예산 {경보임계율}% 도달! 누적 {누적지출}원 (한도 {월예산}원)',
      alert_phone: '010-1234-5678'
    };

    // 3. 통계 집계 연산 (현재 월 기준 - 최종 실지출액 기준 합산)
    const currentMonthStr = getKstDateStr().slice(0, 7); // 예: '2026-05'
    let currentMonthTotal = 0;
    const categoryTotals: Record<string, number> = {};

    expenses.forEach((exp: any) => {
      const expMonth = getYearMonth(exp.expense_date);
      // 최종 실지출액 = 승인 금액 - 공제액 + 송금수수료
      const actualAmount = (Number(exp.amount) || 0) - (Number(exp.deduction_amount) || 0) + (Number(exp.transfer_fee) || 0);
      
      // 이번 달 누적 합산
      if (expMonth === currentMonthStr) {
        currentMonthTotal += actualAmount;
      }

      // 비목별 누적 합산
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + actualAmount;
    });

    // 비목별 데이터 리스트 정렬 가공
    const categoryStats = Object.keys(categoryTotals).map(cat => ({
      category: cat,
      amount: categoryTotals[cat],
      percentage: expenses.length > 0 
        ? Math.round((categoryTotals[cat] / expenses.reduce((a, b) => a + ((Number(b.amount) || 0) - (Number(b.deduction_amount) || 0) + (Number(b.transfer_fee) || 0)), 0)) * 100) 
        : 0
    })).sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      success: true,
      expenses,
      stats: {
        currentMonth: currentMonthStr,
        currentMonthTotal,
        monthlyBudget: expenseSetting.monthly_budget,
        budgetConsumptionRate: expenseSetting.monthly_budget > 0 
          ? Math.round((currentMonthTotal / expenseSetting.monthly_budget) * 100) 
          : 0,
        categoryStats
      },
      settings: expenseSetting
    });

  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, category, amount, expense_date, payment_method, attachment_url, ai_analysis, memo,
      actual_expense_date, deduction_amount, transfer_fee, card_approval_no, tags, evidence_id
    } = body;

    if (!title || !category || !amount || !expense_date || !payment_method) {
      return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    // 신용카드 결제인 경우 승인번호 중복 체크 수행 (소프트 삭제된 것 제외)
    if (card_approval_no) {
      const dupCheck = await queryTable('crm_expenses', { filters: { card_approval_no } });
      const validDup = (dupCheck.rows || []).filter((exp: any) => !exp.deleted_at);
      if (validDup.length > 0) {
        return NextResponse.json({
          success: false,
          error: `중복 등록 오류: 동일한 카드 승인번호(${card_approval_no})를 가진 영수증이 이미 등록되어 있습니다.`
        }, { status: 400 });
      }
    }

    // ⚡ 홈택스 세금계산서 등 증빙 중복 등록 방지 가드 작동
    if (evidence_id) {
      const dupCheck = await queryTable('crm_expenses', { filters: { evidence_id } });
      const validDup = (dupCheck.rows || []).filter((exp: any) => !exp.deleted_at);
      if (validDup.length > 0) {
        return NextResponse.json({
          success: false,
          error: `중복 등록 오류: 동일한 국세청 홈택스 증빙(${evidence_id})을 가진 지출결의서가 이미 등록되어 있습니다.`
        }, { status: 400 });
      }
    }

    const id = `exp-${Date.now()}`;
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await insertRows('crm_expenses', [{
      id,
      tenant_id: tenantId,
      title,
      category,
      amount: Number(amount),
      expense_date,
      payment_method,
      attachment_url: attachment_url || '',
      ai_analysis: ai_analysis ? (typeof ai_analysis === 'string' ? ai_analysis : JSON.stringify(ai_analysis)) : '',
      memo: memo || '',
      tags: tags || '',
      evidence_id: evidence_id || null,
      actual_expense_date: null, // 신규 등록 시에는 미결재(PENDING) 상태이므로 실제 지출일은 강제 무력화(Null)
      deduction_amount: 0,       // 신규 등록 시에는 미결재 상태이므로 공제액 0 강제
      transfer_fee: 0,           // 신규 등록 시에는 미결재 상태이므로 송금수수료 0 강제
      card_approval_no: card_approval_no || null,
      created_at: nowStr
    }]);

    // --- 🚨 예산 초과 방지 실시간 SMS 경보 체크 파이프라인 ---
    try {
      const settingsRes = await queryTable('expense_settings', { filters: { id: '1' } });
      const setting = settingsRes.rows?.[0];

      if (setting && setting.is_alert_enabled === 1 && setting.monthly_budget > 0) {
        const currentMonthStr = expense_date.slice(0, 7); // 등록한 지출 일자의 해당 연월
        
        // 이번 달 모든 지출 목록 다시 가져와 합산
        const expensesRes = await queryTable('crm_expenses', {});
        const currentMonthExpenses = (expensesRes.rows || []).filter((exp: any) => 
          !exp.deleted_at && getYearMonth(exp.expense_date) === currentMonthStr
        );
        const totalMonthAmount = currentMonthExpenses.reduce((sum: number, exp: any) => 
          sum + ((Number(exp.amount) || 0) - (Number(exp.deduction_amount) || 0) + (Number(exp.transfer_fee) || 0)), 0
        );

        const thresholdAmount = setting.monthly_budget * (setting.alert_threshold_percent / 100);

        // 현재 지출 등록으로 인해 비로소 임계값를 돌파하는 순간 파악
        if (totalMonthAmount >= thresholdAmount) {
          // 중복 발송을 막기 위해 system_settings 기반의 이달의 발송 플래그 체크
          const alertFlagKey = `expense_alert_sent_${currentMonthStr}`;
          const systemSettingsRes = await queryTable('system_settings', { filters: { key: alertFlagKey } });
          const isAlreadySent = systemSettingsRes.rows && systemSettingsRes.rows.length > 0;

          if (!isAlreadySent) {
            // SMS 발송 트리거
            let messageContent = setting.alert_sms_template;
            messageContent = messageContent.replace(/{경보임계율}/g, String(setting.alert_threshold_percent));
            messageContent = messageContent.replace(/{경보금액}/g, thresholdAmount.toLocaleString());
            messageContent = messageContent.replace(/{누적지출}/g, totalMonthAmount.toLocaleString());
            messageContent = messageContent.replace(/{월예산}/g, setting.monthly_budget.toLocaleString());

            console.log(`[Expense Alert] Threshold reached (${totalMonthAmount} / ${thresholdAmount}). Sending SMS to ${setting.alert_phone}...`);

            // 비동기로 문자 발송 API 호출 (Fire & Forget)
            const appPort = process.env.PORT || '4000';
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${appPort}`;
            fetch(`${appUrl}/api/sms/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phoneNumber: setting.alert_phone,
                message: messageContent,
                customerId: null
              })
            }).then(async (smsRes) => {
              const smsJson = await smsRes.json();
              if (smsJson.success) {
                // 발송 완료 플래그 기록하여 중복 방지
                await insertRows('system_settings', [{
                  key: alertFlagKey,
                  value: 'true'
                }]);
                console.log(`[Expense Alert] Sent flag saved for ${currentMonthStr}`);
              }
            }).catch(e => console.error('[Expense Alert] SMS Send trigger failed:', e));
          }
        }
      }
    } catch (alertError) {
      console.error('[Expense Alert] Safety trigger check failed:', alertError);
    }
    // ----------------------------------------------------

    // --- 🚨 [경조사비 자동 연동 파이프라인] 복리후생비 경조사비 지출 시 360도 경조사 대장에 자동 Upsert ---
    try {
      const isWelfare = category === '복리후생비';
      const keywords = ['축의', '조의', '경조', '결혼', '장례', '부의', '부모', '부친', '모친', '조부', '조모', '장인', '장모', '화환', '조화', '돌잔치', '출산'];
      const hasKeyword = keywords.some(k => title.includes(k) || (memo && memo.includes(k)));

      if (isWelfare && hasKeyword) {
        // 1. 임직원 매칭 (이름이 제목이나 메모에 포함되어 있는지)
        const opsRes = await queryTable('crm_operators', {});
        const ops = opsRes.rows || [];
        const matchedOp = ops.find((op: any) => title.includes(op.name) || (memo && memo.includes(op.name)));

        if (matchedOp) {
          // 2. 가족 관계 파싱
          let relation = '본인';
          if (title.includes('부친') || title.includes('친부') || title.includes('아버지')) relation = '부친';
          else if (title.includes('모친') || title.includes('친모') || title.includes('어머니')) relation = '모친';
          else if (title.includes('장인')) relation = '장인';
          else if (title.includes('장모')) relation = '장모';
          else if (title.includes('조부')) relation = '조부';
          else if (title.includes('조모')) relation = '조모';
          else if (title.includes('배우자') || title.includes('와이프') || title.includes('남편')) relation = '배우자';
          else if (title.includes('자녀') || title.includes('아들') || title.includes('딸')) relation = '자녀';

          // 3. 경조 구분 파싱
          let eventType = '결혼';
          if (title.includes('장례') || title.includes('상(喪)') || title.includes('조의') || title.includes('부의') || title.includes('사망')) {
            eventType = '장례';
          } else if (title.includes('돌') || title.includes('첫돌')) {
            eventType = '돌잔치';
          } else if (title.includes('출산') || title.includes('득남') || title.includes('득녀')) {
            eventType = '출산';
          } else if (title.includes('칠순') || title.includes('고희')) {
            eventType = '칠순';
          } else if (title.includes('팔순')) {
            eventType = '팔순';
          } else if (title.includes('화환') || title.includes('조화')) {
            eventType = '기타(화환제공)';
          }

          // 4. 화환/조화 제공 여부
          const wreath_provided = (title.includes('화환') || title.includes('조화') || (memo && (memo.includes('화환') || memo.includes('조화')))) ? 1 : 0;

          // 5. 경조금
          const congratulation_money = Number(amount) || 0;

          // 6. 경조사 지원 대장에 자동 추가
          const eventId = `fev-auto-${Date.now()}`;
          await insertRows('crm_operator_family_events', [{
            id: eventId,
            operator_id: String(matchedOp.id),
            event_date: expense_date,
            relation,
            type: eventType,
            congratulation_money,
            wreath_provided
          }]);
          console.log(`[Family Event Link] 지출 등록 연동으로 경조사 대장에 자동 등록되었습니다. 직원: ${matchedOp.name}, 사번: ${matchedOp.employee_number || '없음'}, 관계: ${relation}, 구분: ${eventType}, 금액: ${congratulation_money}원`);
        }
      }
    } catch (linkError) {
      console.error('[Family Event Link] Failed to auto-insert family event:', linkError);
    }

    return NextResponse.json({ success: true, id });

  } catch (error: any) {
    console.error('Error adding expense:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // 최고관리자 또는 대표자 권한 검증
    const role = await getRoleFromToken();
    if (role !== 'SUPER_ADMIN' && role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '최고관리자 또는 대표자만 지출 내역을 삭제할 수 있습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (!id && !idsParam) {
      return NextResponse.json({ success: false, error: '삭제할 ID가 필요합니다.' }, { status: 400 });
    }

    const idsToDelete = idsParam ? idsParam.split(',') : [id!];

    // 토큰에서 삭제 작업자 정보 추출
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    let deletedBy = 'system';
    if (token) {
      try {
        const payload = decodeJwt(token);
        deletedBy = (payload.username as string) || (payload.role as string) || 'system';
      } catch {}
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // 소프트 삭제 처리 (updateRows 활용)
    for (const idToDelete of idsToDelete) {
      await updateRows('crm_expenses', {
        deleted_at: nowStr,
        deleted_by: deletedBy
      }, { filters: { id: idToDelete } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    // 최고관리자 또는 대표자 권한 검증
    const role = await getRoleFromToken();
    if (role !== 'SUPER_ADMIN' && role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '최고관리자 또는 대표자만 지출 내역을 수정할 수 있습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      id, title, category, amount, expense_date, payment_method, attachment_url, ai_analysis, memo,
      actual_expense_date, deduction_amount, transfer_fee, card_approval_no, tags
    } = body;

    if (!id || !title || !category || !amount || !expense_date || !payment_method) {
      return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // 비즈니스 룰 강제 적용을 위해 기존 지출 정보 실시간 조회
    const currentExpenseRes = await queryTable('crm_expenses', { filters: { id } });
    const currentExpense = currentExpenseRes.rows?.[0];
    if (!currentExpense) {
      return NextResponse.json({ success: false, error: '존재하지 않는 지출 내역입니다.' }, { status: 404 });
    }

    const isApproved = currentExpense.approval_status === 'APPROVED';
    const finalPaymentMethod = payment_method || currentExpense.payment_method;
    const isTransferOrCash = ['계좌송금', '계좌이체', '현금'].includes(finalPaymentMethod);

    let finalActualExpenseDate = actual_expense_date || null;
    let finalDeductionAmount = deduction_amount ? Number(deduction_amount) : 0;
    let finalTransferFee = transfer_fee ? Number(transfer_fee) : 0;

    // 결제승인이 완료되고 결제수단이 계좌송금/현금인 경우에만 입력 값 허용
    if (!isApproved || !isTransferOrCash) {
      // 그외 수단/상태인 경우 지출일은 품의일, 공제액 0, 수수료 0 으로 강제
      finalActualExpenseDate = expense_date || currentExpense.expense_date;
      finalDeductionAmount = 0;
      finalTransferFee = 0;
    }

    await updateRows('crm_expenses', {
      title,
      category,
      amount: Number(amount),
      expense_date,
      payment_method,
      attachment_url: attachment_url || '',
      ai_analysis: ai_analysis ? (typeof ai_analysis === 'string' ? ai_analysis : JSON.stringify(ai_analysis)) : '',
      memo: memo || '',
      tags: tags || '',
      actual_expense_date: finalActualExpenseDate,
      deduction_amount: finalDeductionAmount,
      transfer_fee: finalTransferFee,
      card_approval_no: card_approval_no || null,
      created_at: nowStr // 수정일자 업데이트
    }, { filters: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
