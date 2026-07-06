import { queryTable, insertRows, updateRows } from '../../egdesk-helpers';
import { triggerAutomation } from './automation-trigger';

/**
 * 고객의 포인트 정보를 조회하거나 생성 및 변경을 처리하는 비즈니스 엔진 서비스
 */
export class PointService {
  /**
   * 휴대전화번호를 기준으로 고객을 조회하고, 없으면 임시 단골 고객으로 자동 생성(Soft Sign-up)합니다.
   * @param phone 고객 휴대전화번호
   * @param name 임시 생성 시 사용할 이름 (생략 시 '단골적립회원')
   */
  static async getOrCreateCustomerByPhone(phone: string, name: string = '단골적립회원'): Promise<any> {
    const formattedPhone = phone.trim().replace(/[^0-9]/g, ''); // 숫자만 남김
    
    // 1. 기존 고객 조회
    const result = await queryTable('crm_customers', {
      filters: { phone: formattedPhone }
    });
    
    const customers = result.rows || [];
    if (customers.length > 0) {
      return customers[0];
    }
    
    // 2. 고객이 없으면 신규 가상 회원으로 생성
    const id = Math.floor(Math.random() * 1000000);
    const now = new Date().toISOString();
    
    const newCustomer = {
      id,
      name,
      phone: formattedPhone,
      tags: '임시회원,적립',
      memo: '포인트 적립을 통해 자동 등록된 임시 회원입니다.',
      address: '',
      shipping_address: '',
      recipient_name: '',
      recipient_phone: '',
      point_balance: 0, // 기본 잔액 0원
      created_at: now
    };
    
    await insertRows('crm_customers', [newCustomer]);
    return newCustomer;
  }

  /**
   * 휴대전화번호 기준으로 포인트를 자동 적립합니다. (Earn)
   * @param phone 고객 휴대전화번호
   * @param amount 적립할 포인트 금액
   * @param orderId 관련 주문 ID
   * @param description 적립 설명
   */
  static async earnPoints(phone: string, amount: number, orderId?: string, description: string = '구매 적립'): Promise<number> {
    if (amount <= 0) return 0;
    
    const customer = await this.getOrCreateCustomerByPhone(phone);
    const currentBalance = Number(customer.point_balance || 0);
    const newBalance = currentBalance + amount;
    
    // 1. 고객 테이블 잔액 업데이트
    await updateRows('crm_customers', {
      point_balance: newBalance
    }, {
      filters: { id: String(customer.id) }
    });
    
    // 2. 포인트 상세 적립 로그 이력 기록
    const historyId = 'PE_' + Date.now() + '_' + Math.random().toString().slice(2, 6);
    const now = new Date().toISOString();
    
    await insertRows('crm_point_history', [{
      id: historyId,
      customer_id: customer.id,
      transaction_type: 'EARN',
      amount: amount,
      balance_after: newBalance,
      description: orderId ? `${description} (주문: ${orderId})` : description,
    }]);

    // 자동화 발송 트리거 연동 (포인트 적립 안내)
    try {
      triggerAutomation('point_earned', {
        id: String(customer.id),
        name: customer.name || '단골적립회원',
        phone: customer.phone,
        적립포인트: amount,
        잔여포인트: newBalance
      });
    } catch (autoErr: any) {
      console.error('[PointService] Failed to trigger point_earned automation:', autoErr.message);
    }

    return newBalance;
  }

  /**
   * 휴대전화번호 기준으로 포인트를 결제에 차감하여 사용합니다. (Use)
   * @param phone 고객 휴대전화번호
   * @param amount 사용할 포인트 금액 (양수로 전달)
   * @param orderId 관련 주문 ID
   */
  static async redeemPoints(phone: string, amount: number, orderId?: string): Promise<number> {
    if (amount <= 0) {
      throw new Error('사용할 포인트는 0보다 커야 합니다.');
    }
    
    const formattedPhone = phone.trim().replace(/[^0-9]/g, '');
    const result = await queryTable('crm_customers', {
      filters: { phone: formattedPhone }
    });
    
    const customers = result.rows || [];
    if (customers.length === 0) {
      throw new Error('해당 전화번호로 등록된 고객 정보를 찾을 수 없습니다.');
    }
    
    const customer = customers[0];
    const currentBalance = Number(customer.point_balance || 0);
    
    if (currentBalance < amount) {
      throw new Error(`보유 포인트가 부족합니다. (보유: ${currentBalance}p, 요청: ${amount}p)`);
    }
    
    const newBalance = currentBalance - amount;
    
    // 1. 고객 테이블 잔액 차감 업데이트
    await updateRows('crm_customers', {
      point_balance: newBalance
    }, {
      filters: { id: String(customer.id) }
    });
    
    // 2. 포인트 사용 로그 이력 기록 (사용은 음수로 보관)
    const historyId = 'PU_' + Date.now() + '_' + Math.random().toString().slice(2, 6);
    const now = new Date().toISOString();
    
    await insertRows('crm_point_history', [{
      id: historyId,
      customer_id: customer.id,
      transaction_type: 'USE',
      amount: -amount, // 사용은 음수로 기록
      balance_after: newBalance,
      description: orderId ? `포인트 결제 차감 (주문: ${orderId})` : '포인트 결제 차감',
      related_entity_type: orderId ? 'ORDER' : '',
      related_entity_id: orderId || '',
      created_at: now
    }]);

    // 자동화 발송 트리거 연동 (포인트 차감 안내)
    try {
      triggerAutomation('point_redeemed', {
        id: String(customer.id),
        name: customer.name || '단골회원',
        phone: customer.phone || formattedPhone || phone,
        차감포인트: amount,
        잔여포인트: newBalance
      });
    } catch (autoErr: any) {
      console.error('[PointService] Failed to trigger point_redeemed automation:', autoErr.message);
    }

    return newBalance;
  }

  /**
   * 점주가 어드민 CRM에서 특정 고객의 포인트를 수동으로 충전/차감합니다. (Admin adjustment)
   * @param customerId 고객 고유 식별자(ID)
   * @param amount 증감할 포인트 양 (양수면 지급, 음수면 차감)
   * @param reason 수동 조정 사유
   */
  static async adjustPointsAdmin(customerId: number, amount: number, reason: string): Promise<number> {
    if (amount === 0) return 0;
    
    const result = await queryTable('crm_customers', {
      filters: { id: String(customerId) }
    });
    
    const customers = result.rows || [];
    if (customers.length === 0) {
      throw new Error('고객 정보를 찾을 수 없습니다.');
    }
    
    const customer = customers[0];
    const currentBalance = Number(customer.point_balance || 0);
    const newBalance = currentBalance + amount;
    
    if (newBalance < 0) {
      throw new Error(`차감 후 잔액이 0보다 작아질 수 없습니다. (보유: ${currentBalance}p, 차감요청: ${Math.abs(amount)}p)`);
    }
    
    // 1. 고객 테이블 잔액 업데이트
    await updateRows('crm_customers', {
      point_balance: newBalance
    }, {
      filters: { id: String(customerId) }
    });
    
    // 2. 포인트 수동 조정 로그 이력 기록
    const historyId = 'PA_' + Date.now() + '_' + Math.random().toString().slice(2, 6);
    const now = new Date().toISOString();
    
    await insertRows('crm_point_history', [{
      id: historyId,
      customer_id: customerId,
      transaction_type: 'ADMIN',
      amount: amount,
      balance_after: newBalance,
      description: reason || (amount > 0 ? '점주 수동 지급' : '점주 수동 차감'),
      related_entity_type: 'ADMIN',
      related_entity_id: 'SYSTEM',
      created_at: now
    }]);
    
    return newBalance;
  }
}
