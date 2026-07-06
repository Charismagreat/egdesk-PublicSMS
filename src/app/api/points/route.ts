export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PointService } from '@/lib/point-service';
import { queryTable } from '@/../egdesk-helpers';

/**
 * 포인트 정보 조회 및 어드민 수동 포인트를 조절하는 API 엔드포인트
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const customerId = searchParams.get('customerId');
    
    let customer: any = null;
    
    if (phone) {
      const formattedPhone = phone.trim().replace(/[^0-9]/g, '');
      const customerRes = await queryTable('crm_customers', {
        filters: { phone: formattedPhone }
      });
      if (customerRes.rows && customerRes.rows.length > 0) {
        customer = customerRes.rows[0];
      }
    } else if (customerId) {
      const customerRes = await queryTable('crm_customers', {
        filters: { id: customerId }
      });
      if (customerRes.rows && customerRes.rows.length > 0) {
        customer = customerRes.rows[0];
      }
    }
    
    if (!customer) {
      return NextResponse.json({
        success: false,
        error: '고객 정보를 찾을 수 없습니다.'
      }, { status: 404 });
    }
    
    // 포인트 히스토리(적립/사용 내역) 조회
    const historyRes = await queryTable('crm_point_history', {
      filters: { customer_id: customer.id },
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: 50 // 최근 50개만 조회
    });
    
    return NextResponse.json({
      success: true,
      balance: Number(customer.point_balance || 0),
      customerName: customer.name,
      customerId: customer.id,
      history: historyRes.rows || []
    });
  } catch (error: any) {
    console.error('포인트 정보 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, amount, reason } = body;
    
    if (!customerId || amount === undefined) {
      return NextResponse.json({
        success: false,
        error: '고객 식별자(customerId)와 조정 금액(amount)이 필요합니다.'
      }, { status: 400 });
    }
    
    const newBalance = await PointService.adjustPointsAdmin(
      Number(customerId),
      Number(amount),
      reason || '점주 수동 조정'
    );
    
    return NextResponse.json({
      success: true,
      newBalance,
      message: '성공적으로 포인트가 조정되었습니다.'
    });
  } catch (error: any) {
    console.error('어드민 포인트 조정 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
