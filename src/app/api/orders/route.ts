export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows, updateRows, uploadFile } from '../../../../egdesk-helpers';
import { triggerAutomation } from '@/lib/automation-trigger';
import { PointService } from '@/lib/point-service';
import { getTenantId, getTenantSetting } from '@/lib/tenant';
import { gmAutomation } from '@/lib/google-messages';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryTenantId = searchParams.get('tenantId');
    const rawTenantId = await getTenantId();
    const tenantId = queryTenantId || rawTenantId || 'default';

    const result = await queryTable('crm_orders', {
      orderBy: 'order_date',
      orderDirection: 'DESC'
    });
    // 데이터베이스 감사 룰 준수: 소프트 삭제된 항목 배제 (deleted_at이 있는 주문은 반환 안 함)
    let activeOrders = (result.rows || []).filter((order: any) => !order.deleted_at);

    // 🛡️ 해당 테넌트 주문만 엄격히 격리 표시
    if (tenantId && tenantId !== 'all') {
      activeOrders = activeOrders.filter((order: any) => order.tenant_id === tenantId);
    }

    return NextResponse.json({ success: true, orders: activeOrders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const rawTenantId = await getTenantId();
    const data = await req.json();
    const tenantId = rawTenantId || data.tenant_id || 'default';
    const { 
      customerName, 
      customerPhone, 
      productName, 
      quantity, 
      totalPrice, 
      deliveryMethod, 
      shippingAddress, 
      status, 
      attachmentUrl, 
      customerMemo,
      isTaxRequested,
      businessNumber,
      companyName,
      representativeName,
      taxEmail,
      attachmentBase64,
      attachmentFilename
    } = data;
    const id = data.id || Date.now().toString();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let isNewPartner = false;

    // 📂 첨부파일(발주서/사업자등록증 등) 격리 스토리지 자동 저장
    let resolvedAttachmentUrl = attachmentUrl || '';
    if (attachmentBase64) {
      try {
        const base64Data = attachmentBase64.replace(/^data:.*?;base64,/, "");
        const uploadRes = await uploadFile(
          'crm_orders', 
          id, 
          'attachment_url', 
          attachmentFilename || 'order_invoice.pdf', 
          Buffer.from(base64Data, 'base64')
        );
        if (uploadRes.success && uploadRes.fileUrl) {
          resolvedAttachmentUrl = uploadRes.fileUrl;
          console.log(`✓ [Store File Uploaded] 게이트웨이 매핑 완료: ${resolvedAttachmentUrl}`);
        }
      } catch (uploadErr: any) {
        console.error('[Store File Upload Failure]:', uploadErr.message);
      }
    }

    // 💡 사업자 증빙 신청 여부에 따른 분기 처리
    if (isTaxRequested && businessNumber) {
      // 1. 기존 거래처(crm_partners) 조회
      const partnerRes = await queryTable('crm_partners', {
        filters: { business_number: businessNumber }
      });

      let partnerId: string | number;
      if (partnerRes.rows && partnerRes.rows.length > 0) {
        partnerId = partnerRes.rows[0].id;
      } else {
        isNewPartner = true;

        // 존재하지 않는 경우 신규 거래처 자동 가입 등록 (PENDING 상태로 가입)
        await insertRows('crm_partners', [{
          type: '매출처',
          company_name: companyName || '임시 거래처',
          business_number: businessNumber,
          representative: representativeName || '',
          phone: customerPhone,
          email: taxEmail || '',
          manager_name: customerName,
          manager_phone: customerPhone,
          manager_email: taxEmail || '',
          vip_level: 'PENDING', // 💡 승인 대기 상태 표기
          memo: '[승인대기] 스토어 발주서 주문 자동 가입',
          created_at: nowStr,
          tenant_id: tenantId || 'default'
        }]);

        // 새로 생성된 거래처 ID 재확인
        const newPartnerRes = await queryTable('crm_partners', {
          filters: { business_number: businessNumber }
        });
        partnerId = newPartnerRes.rows?.[0]?.id || Date.now();

        // 🚨 [방법 A]: 테넌트 최고 관리자(사장님)에게 실시간 문자(SMS/LMS) 즉시 전송
        try {
          let adminPhone = '';
          const profileVal = await getTenantSetting('my_company_profile');
          if (profileVal) {
            const parsed = JSON.parse(profileVal);
            adminPhone = parsed.phone || '';
          }
          
          if (adminPhone) {
            const formattedAdminPhone = adminPhone.replace(/[^0-9]/g, '');
            const smsMessage = `[EGDESK B2B 신규 발주 접수] 미등록 신규 거래처에서 스토어 발주 주문이 접수되었습니다.\n- 상호명: ${companyName || '임시 거래처'}\n- 사업자번호: ${businessNumber}\n- 담당자: ${customerName} (${customerPhone})\n- 발주금액: ${totalPrice ? Number(totalPrice).toLocaleString() : '0'}원\n관리자 화면에서 거래처 승인을 진행해주세요.`;
            
            // Google Messages RPA 발송 연동
            const smsResult = await gmAutomation.sendSMS(formattedAdminPhone, smsMessage);
            
            // DB message_logs에 이력 적재
            const logId = Math.floor(Math.random() * 1000000);
            await insertRows('message_logs', [{
              id: logId,
              customer_id: null,
              phone: formattedAdminPhone,
              message: smsMessage,
              status: smsResult.success ? 'SUCCESS' : 'FAILED',
              created_at: nowStr
            }]);
            console.log(`✓ [B2B 긴급 알림 문자 발송 완료] 사장님 번호: ${formattedAdminPhone}`);
          }
        } catch (smsErr: any) {
          console.error('[B2B 긴급 알림 문자 발송 실패]:', smsErr.message);
        }
      }

      // 2. 담당자(crm_partner_contacts) 조회 및 신규 등록
      const contactRes = await queryTable('crm_partner_contacts', {
        filters: { partner_id: String(partnerId), phone: customerPhone }
      });

      if (!contactRes.rows || contactRes.rows.length === 0) {
        const allContacts = await queryTable('crm_partner_contacts', {
          filters: { partner_id: String(partnerId) }
        });
        const isPrimary = (!allContacts.rows || allContacts.rows.length === 0) ? 1 : 0;

        await insertRows('crm_partner_contacts', [{
          partner_id: String(partnerId),
          name: customerName,
          phone: customerPhone,
          email: taxEmail || '',
          is_primary: isPrimary,
          created_at: nowStr
        }]);
      }
    } else {
      // 💡 일반 개인 주문인 경우 (B2C)
      // crm_customers 테이블에 해당 연락처로 등록된 기존 고객이 없는 경우 신규 등록
      const customerRes = await queryTable('crm_customers', {
        filters: { phone: customerPhone }
      });

      if (!customerRes.rows || customerRes.rows.length === 0) {
        await insertRows('crm_customers', [{
          name: customerName,
          phone: customerPhone,
          email: '',
          address: shippingAddress || '',
          shipping_address: shippingAddress || '',
          point_balance: 0,
          created_at: nowStr
        }]);
      }
    }

    // 1. 주문 내역 (crm_orders) 생성
    await insertRows('crm_orders', [{
      id,
      tenant_id: tenantId,
      customer_name: customerName,
      customer_phone: customerPhone,
      product_name: productName,
      quantity: quantity || '1',
      total_price: totalPrice || '',
      delivery_method: deliveryMethod || '택배배송',
      shipping_address: shippingAddress || '',
      tracking_number: '',
      attachment_url: resolvedAttachmentUrl,
      customer_memo: customerMemo || '',
      order_date: data.orderDate || new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
      status: isNewPartner ? '승인대기' : (status || '결제대기') // 💡 신규 B2B 주문 시 '승인대기' 처리
    }]);

    // 1-2. 수주 내역 (crm_sales_orders, 받은 발주서 관리 대장 연동) 자동 생성
    await insertRows('crm_sales_orders', [{
      id: 'SO-' + id,
      estimate_id: 'STORE',
      client_order_no: id,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_manager: customerName,
      status: isNewPartner ? 'REGISTERED' : 'CONFIRMED',
      total_amount: Number(totalPrice) || 0,
      order_date: data.orderDate || new Date().toISOString().split('T')[0],
      created_at: nowStr,
      tenant_id: tenantId
    }]);

    // 2. 거래 내역 (crm_transactions) 자동 연동 생성
    await insertRows('crm_transactions', [{
      id: 'TX_' + id + '_' + Math.random().toString().slice(2, 6),
      tenant_id: tenantId,
      customer_name: customerName,
      customer_phone: customerPhone,
      product_name: productName,
      amount: totalPrice || '',
      order_date: data.orderDate || new Date().toISOString().split('T')[0],
      status: isNewPartner ? '승인대기' : (status || '결제대기'),
      order_id: id // 원천 주문 ID 기록
    }]);

    // 3. 배송 내역 (crm_deliveries) 자동 연동 생성 (택배배송인 경우에만 생성)
    if ((deliveryMethod || '택배배송') === '택배배송' && shippingAddress) {
      await insertRows('crm_deliveries', [{
        id: 'DL_' + id + '_' + Math.random().toString().slice(2, 6),
        customer_name: customerName,
        customer_phone: customerPhone,
        address: shippingAddress,
        courier: '대한통운',
        tracking_number: '',
        status: '상품준비중',
        order_id: id // 원천 주문 ID 기록
      }]);
    }

    // Trigger automation in the background
    triggerAutomation('order_created', { 
      id, 
      name: customerName, 
      phone: customerPhone,
      상품명: productName,
      수량: quantity || '1',
      결제금액: totalPrice || '',
      주문일시: data.orderDate || new Date().toISOString().split('T')[0]
    });

    return NextResponse.json({ success: true, id, isNewPartner });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const { ids, updates } = data; // ids: string[], updates: { status?: string, tracking_number?: string }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: '선택된 주문이 없습니다.' }, { status: 400 });
    }

    for (const id of ids) {
      const orderRes = await queryTable('crm_orders', { filters: { id } });
      const order = orderRes.rows?.[0];

      if (order) {
        await updateRows('crm_orders', updates, { filters: { id } });

        // Automation Hooks based on new status
        if (updates.status === '결제완료' && order.status !== '결제완료') {
          triggerAutomation('payment_completed', {
            id, name: order.customer_name, phone: order.customer_phone, 결제금액: order.total_price
          });
          // Also insert to crm_payments
          await insertRows('crm_payments', [{
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            customer_name: order.customer_name,
            payment_method: '카드결제',
            amount: order.total_price || '0',
            payment_date: new Date().toISOString().split('T')[0],
            status: '결제완료',
            order_id: id // 원천 주문 ID 기록
          }]);

          // 포인트 자동 적립 연동 (설정된 적립률 적용)
          if (order.customer_phone && order.total_price) {
            try {
              const amt = Number(order.total_price);
              
              // system_settings에서 point_earning_rate 조회
              const rateRes = await queryTable('system_settings', { filters: { key: 'point_earning_rate' } });
              let rate = 1; // 기본값 1%
              if (rateRes.rows && rateRes.rows.length > 0) {
                const val = Number(rateRes.rows[0].value);
                if (!isNaN(val)) rate = val;
              }

              const earnedPoints = Math.floor(amt * (rate / 100));
              if (earnedPoints > 0) {
                await PointService.earnPoints(
                  order.customer_phone,
                  earnedPoints,
                  id,
                  '주문 완료 자동 적립'
                );
              }
            } catch (pointErr: any) {
              console.error('주문 결제완료 포인트 적립 실패:', pointErr.message);
            }
          }
        }

        if ((updates.status === '배송중' || updates.status === '배송시작') && order.status !== updates.status) {
          triggerAutomation('delivery_started', {
            id, name: order.customer_name, phone: order.customer_phone,
            운송장번호: updates.tracking_number || order.tracking_number || ''
          });
          // Also insert to crm_deliveries
          await insertRows('crm_deliveries', [{
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            address: order.shipping_address || '',
            courier: '기본택배',
            tracking_number: updates.tracking_number || order.tracking_number || '',
            status: updates.status,
            order_id: id // 원천 주문 ID 기록
          }]);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    await deleteRows('crm_orders', { filters: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
