export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';
import { gmAutomation } from '@/lib/google-messages';
import { setupDatabase } from '@/lib/setup-db';

// ⏳ 당일 활성 대기자 목록 및 단건 상태 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const waitingId = searchParams.get('id');
    const tenantId = (await getTenantId()) || 'default';
    const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

    const waitingFilters: any = { waiting_date: todayStr };
    if (tenantId && tenantId !== 'all') {
      waitingFilters.tenant_id = tenantId;
    }

    let result;
    try {
      result = await queryTable('crm_waitings', {
        filters: waitingFilters,
        orderBy: 'waiting_no',
        orderDirection: 'ASC'
      });
    } catch (tblErr: any) {
      if (tblErr.message?.includes('Table not found')) {
        await setupDatabase();
        result = await queryTable('crm_waitings', {
          filters: waitingFilters,
          orderBy: 'waiting_no',
          orderDirection: 'ASC'
        });
      } else {
        throw tblErr;
      }
    }

    // 1. 단건 상세 조회 (손님 대기표 실시간 현황 화면)
    if (waitingId) {
      const singleRes = await queryTable('crm_waitings', {
        filters: { id: waitingId }
      });
      const waiting = (singleRes.rows || []).find((w: any) => !w.deleted_at);
      if (!waiting) {
        return NextResponse.json({ success: false, error: '대기 정보를 찾을 수 없습니다.' }, { status: 404 });
      }

      // 내 앞 대기 팀 수 계산 (나보다 먼저 등록되었고 아직 WAITING 상태인 팀 수)
      const allActiveRes = await queryTable('crm_waitings', {
        filters: { ...waitingFilters, waiting_date: waiting.waiting_date || todayStr },
        orderBy: 'waiting_no',
        orderDirection: 'ASC'
      });
      const activeList = (allActiveRes.rows || []).filter((w: any) => !w.deleted_at && w.status === 'WAITING');
      const aheadCount = activeList.filter((w: any) => Number(w.waiting_no) < Number(waiting.waiting_no)).length;

      return NextResponse.json({
        success: true,
        waiting,
        aheadCount,
        totalWaitingCount: activeList.length
      });
    }

    // 2. 전체 대기자 목록 조회 (관리자 화면)
    const waitings = (result.rows || []).filter((w: any) => !w.deleted_at);
    const activeWaitings = waitings.filter((w: any) => w.status === 'WAITING' || w.status === 'CALLED');

    return NextResponse.json({
      success: true,
      waitings,
      activeWaitings,
      activeCount: activeWaitings.filter((w: any) => w.status === 'WAITING').length,
      calledCount: activeWaitings.filter((w: any) => w.status === 'CALLED').length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ⏳ 신규 대기표 발급 (고객 모바일 접수)
export async function POST(req: Request) {
  try {
    const rawTenantId = await getTenantId();
    const tenantId = rawTenantId || 'default';
    const data = await req.json();
    const { customerName, customerPhone, partySize } = data;

    if (!customerPhone) {
      return NextResponse.json({ success: false, error: '연락처를 입력해 주세요.' }, { status: 400 });
    }

    const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const id = `WAIT-${Date.now()}`;

    // 오늘 등록된 대기자 조회하여 대기번호(waiting_no) 자동 채번
    const waitingQueryFilters: any = { waiting_date: todayStr };
    if (tenantId && tenantId !== 'all') {
      waitingQueryFilters.tenant_id = tenantId;
    }

    let todayRes;
    try {
      todayRes = await queryTable('crm_waitings', {
        filters: waitingQueryFilters
      });
    } catch (tblErr: any) {
      if (tblErr.message?.includes('Table not found')) {
        await setupDatabase();
        todayRes = await queryTable('crm_waitings', {
          filters: waitingQueryFilters
        });
      } else {
        throw tblErr;
      }
    }
    const todayRows = (todayRes.rows || []).filter((w: any) => !w.deleted_at);
    const maxNo = todayRows.reduce((max: number, w: any) => Math.max(max, Number(w.waiting_no) || 0), 0);
    const waitingNo = maxNo + 1;

    // 내 앞 대기 팀 수 계산
    const currentActiveWaitings = todayRows.filter((w: any) => w.status === 'WAITING');
    const aheadCount = currentActiveWaitings.length;

    // crm_waitings 테이블에 저장
    await insertRows('crm_waitings', [{
      id,
      waiting_no: waitingNo,
      customer_name: customerName || `손님(${customerPhone.slice(-4)})`,
      customer_phone: customerPhone,
      party_size: Number(partySize) || 2,
      status: 'WAITING',
      waiting_date: todayStr,
      called_at: '',
      seated_at: '',
      assigned_table: '',
      pre_orders: '',
      pre_order_total: 0,
      created_at: nowStr,
      tenant_id: tenantId
    }]);

    // 📱 손님에게 대기표 접수 확인 문자(SMS) 자동 발송
    try {
      const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
      if (cleanPhone) {
        const smsMsg = `[EGDESK 웨이팅 접수 완료]\n고객님, 대기 등록이 완료되었습니다.\n- 대기번호: ${waitingNo}번\n- 이용 인원: ${partySize || 2}명\n- 현재 내 앞 대기: ${aheadCount}팀\n차례가 되면 문자로 안내해 드리겠습니다.`;
        await gmAutomation.sendSMS(cleanPhone, smsMsg);
      }
    } catch (smsErr: any) {
      console.error('[Waiting SMS Send Failed]:', smsErr.message);
    }

    return NextResponse.json({
      success: true,
      waitingId: id,
      waitingNo,
      aheadCount
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ⏳ 대기 상태 변경 (입장 호출 / 착석 배정 / 취소)
export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const { id, action, assignedTable, preOrders, preOrderTotal, revertType } = data;

    if (!id) {
      return NextResponse.json({ success: false, error: '대기 ID가 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // 대상 대기 정보 조회
    const targetRes = await queryTable('crm_waitings', { filters: { id } });
    const target = (targetRes.rows || [])[0];
    if (!target) {
      return NextResponse.json({ success: false, error: '대기 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const updates: any = { updated_at: nowStr };

    if (action === 'pre_order') {
      // 🍽️ 0. 사전 메뉴 주문 접수 (고객 모바일)
      updates.pre_orders = typeof preOrders === 'string' ? preOrders : JSON.stringify(preOrders || []);
      updates.pre_order_total = Number(preOrderTotal) || 0;
    } else if (action === 'call') {
      // 📢 1. 입장 호출
      updates.status = 'CALLED';
      updates.called_at = nowStr;

      // 손님에게 입장 안내 SMS 발송
      try {
        const cleanPhone = (target.customer_phone || '').replace(/[^0-9]/g, '');
        if (cleanPhone) {
          const smsMsg = `[EGDESK 입장 안내]\n고객님(대기 ${target.waiting_no}번), 테이블이 준비되었습니다!\n지금 매장 카운터로 입장해 주시기 바랍니다.\n(5분 내 미입장 시 대기가 자동 취소될 수 있습니다)`;
          await gmAutomation.sendSMS(cleanPhone, smsMsg);
        }
      } catch (smsErr: any) {
        console.error('[Entry Call SMS Send Failed]:', smsErr.message);
      }
    } else if (action === 'remind') {
      // 🔔 2. 2차 리마인드 재호출 (노쇼 방지)
      try {
        const cleanPhone = (target.customer_phone || '').replace(/[^0-9]/g, '');
        if (cleanPhone) {
          const smsMsg = `[EGDESK 입장 재안내 (마지막 호출)]\n고객님(대기 ${target.waiting_no}번), 현재 입장이 지연되고 있습니다.\n2분 내 카운터로 입장하지 않으실 경우 다음 대기팀으로 순서가 변경되오니 서둘러 입장해 주세요.`;
          await gmAutomation.sendSMS(cleanPhone, smsMsg);
        }
      } catch (smsErr: any) {
        console.error('[Remind SMS Send Failed]:', smsErr.message);
      }
    } else if (action === 'seat') {
      // 🪑 3. 착석 완료 (테이블 배정)
      updates.status = 'SEATED';
      updates.seated_at = nowStr;
      updates.assigned_table = assignedTable || '';

      // 💡 사전 주문(Pre-orders)이 있는 경우 crm_orders 테이블에 해당 테이블의 정식 주문으로 자동 승격/생성!
      const rawPreOrders = target.pre_orders;
      if (rawPreOrders) {
        try {
          const items = typeof rawPreOrders === 'string' ? JSON.parse(rawPreOrders) : rawPreOrders;
          if (Array.isArray(items) && items.length > 0) {
            const tableNum = assignedTable || '1';
            const orderRows = items.map((item: any, idx: number) => ({
              id: `ORD-${Date.now()}-${idx + 1}`,
              tenant_id: target.tenant_id || 'default',
              customer_name: `테이블 ${tableNum}`,
              customer_phone: target.customer_phone || '',
              product_name: item.name || item.product_name,
              quantity: String(item.quantity || 1),
              total_price: String((Number(item.price) || 0) * (Number(item.quantity) || 1)),
              delivery_method: '테이블오더',
              shipping_address: '',
              tracking_number: '',
              customer_memo: item.memo ? `[사전주문] ${item.memo}` : `[대기 ${target.waiting_no}번 사전주문]`,
              order_date: nowStr,
              status: '접수'
            }));
            await insertRows('crm_orders', orderRows);
            console.log(`✓ [Pre-order Converted] 대기 ${target.waiting_no}번 사전주문 ${orderRows.length}건이 테이블 ${tableNum}번에 자동 등록되었습니다.`);
          }
        } catch (orderErr: any) {
          console.error('[Pre-order to crm_orders failed]:', orderErr.message);
        }
      }

      // 🚨 3-1. 입장 임박(내 앞 1~2팀) 자동 사전 알림 (Auto Ahead Alert)
      try {
        const remainingWaitingsRes = await queryTable('crm_waitings', {
          filters: { status: 'WAITING' },
          orderBy: 'id',
          orderDirection: 'ASC'
        });
        const remainingList = (remainingWaitingsRes.rows || []).filter((w: any) => !w.deleted_at && w.id !== id);
        
        // 내 앞 1팀, 2팀 손님에게 사전 준비 알림 발송 (중복 방지: ahead_alerted !== 1)
        const aheadTargets = remainingList.slice(0, 2);
        for (let i = 0; i < aheadTargets.length; i++) {
          const aheadWait = aheadTargets[i];
          if (!aheadWait.ahead_alerted) {
            const cleanPhone = (aheadWait.customer_phone || '').replace(/[^0-9]/g, '');
            if (cleanPhone) {
              const aheadCount = i; // 0이면 바로 다음 순서(앞 0팀), 1이면 앞 1팀
              const aheadMsg = `[EGDESK 웨이팅 입장 임박 안내]\n고객님(대기 ${aheadWait.waiting_no}번), 현재 고객님 앞 대기 ${aheadCount === 0 ? '0팀(다음 입장 순서)' : '1팀'}입니다!\n곧 입장이 시작되오니 매장 입구 근처로 이동해 주시기 바랍니다.`;
              await gmAutomation.sendSMS(cleanPhone, aheadMsg);
              await updateRows('crm_waitings', { ahead_alerted: 1 }, { filters: { id: aheadWait.id } });
              console.log(`✓ [Ahead Alert Sent] 대기 ${aheadWait.waiting_no}번 손님에게 입장 임박 SMS 발송 완료.`);
            }
          }
        }
      } catch (aheadErr: any) {
        console.error('[Auto Ahead Alert Failed]:', aheadErr.message);
      }
    } else if (action === 'change_table') {
      // 🔀 4. 자리 이동 (테이블 변경)
      const oldTable = target.assigned_table;
      const newTable = assignedTable || '1';
      updates.assigned_table = newTable;

      // 이전 테이블의 미결제 주문들을 새 테이블로 자동 이관
      if (oldTable && oldTable !== newTable) {
        try {
          const oldTableOrdersRes = await queryTable('crm_orders', {
            filters: { customer_name: `테이블 ${oldTable}` }
          });
          const activeOrders = (oldTableOrdersRes.rows || []).filter((o: any) => 
            o.status !== '결제완료' && o.status !== '주문취소' && !o.deleted_at
          );

          for (const ord of activeOrders) {
            await updateRows('crm_orders', {
              customer_name: `테이블 ${newTable}`,
              customer_memo: ord.customer_memo ? `${ord.customer_memo} (테이블 ${oldTable}➔${newTable} 이동)` : `[테이블 ${oldTable}➔${newTable} 이동]`
            }, { filters: { id: ord.id } });
          }
          console.log(`✓ [Table Changed] 대기 ${target.waiting_no}번 손님이 테이블 ${oldTable}번 ➔ ${newTable}번으로 이동 (주문 ${activeOrders.length}건 이관 완료)`);
        } catch (moveErr: any) {
          console.error('[Table Change Order Migration Failed]:', moveErr.message);
        }
      }
    } else if (action === 'revert_seat') {
      // ↩️ 5. 착석 취소 (오배정 대기 복원 또는 손님 퇴장 처리)
      const isRevertToWait = revertType === 'wait'; // 'wait' = 대기복원, 'exit' = 손님퇴장
      const assignedTableNum = target.assigned_table;

      if (isRevertToWait) {
        updates.status = 'WAITING';
        updates.assigned_table = '';
        updates.seated_at = '';
      } else {
        updates.status = 'CANCELLED';
      }

      // 배정되었던 테이블의 미결제 주문(사전주문 등) 자동 취소 처리
      if (assignedTableNum) {
        try {
          const tableOrdersRes = await queryTable('crm_orders', {
            filters: { customer_name: `테이블 ${assignedTableNum}` }
          });
          const activeOrders = (tableOrdersRes.rows || []).filter((o: any) => 
            o.status !== '결제완료' && o.status !== '주문취소' && !o.deleted_at
          );

          for (const ord of activeOrders) {
            await updateRows('crm_orders', {
              status: '주문취소',
              customer_memo: ord.customer_memo ? `${ord.customer_memo} [착석취소/퇴장]` : `[착석취소/퇴장]`
            }, { filters: { id: ord.id } });
          }
          console.log(`✓ [Seat Reverted] 대기 ${target.waiting_no}번 착석 취소 처리 완료 (테이블 ${assignedTableNum}번 미결제 주문 ${activeOrders.length}건 정리)`);
        } catch (revertErr: any) {
          console.error('[Revert Seat Order Cleanup Failed]:', revertErr.message);
        }
      }
    } else if (action === 'cancel') {
      // ❌ 6. 대기 취소
      updates.status = 'CANCELLED';
    }

    await updateRows('crm_waitings', updates, { filters: { id } });

    return NextResponse.json({ success: true, action, updates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
