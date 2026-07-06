import { EGDESK_CONFIG } from '../egdesk.config';

async function runTest() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- Starting API E2E Test ---');

  // 1. Create Coupon
  console.log('1. Creating Coupon...');
  let res = await fetch(`${baseUrl}/api/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'TEST50',
      name: '5000원 테스트 쿠폰',
      discount_type: 'amount',
      discount_value: 5000,
      min_order_amount: 10000
    })
  });
  let data = await res.json();
  console.log('Coupon Creation:', data);
  if (!data.success) throw new Error('Coupon creation failed');

  // 2. Create Product
  console.log('2. Creating Product...');
  res = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '프리미엄 테스트 상품',
      price: '15000',
      category: '식사류',
      available_methods: '매장에서,가져가기,배달,배송'
    })
  });
  data = await res.json();
  console.log('Product Creation:', data);

  // 3. Verify Coupon
  console.log('3. Verifying Coupon...');
  res = await fetch(`${baseUrl}/api/coupons/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'TEST50', orderAmount: 15000 })
  });
  data = await res.json();
  console.log('Coupon Verification:', data);
  if (!data.success) throw new Error('Coupon verification failed');

  // 4. Create Order
  console.log('4. Creating Order...');
  res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: '홍길동',
      customerPhone: '010-1234-5678',
      productName: '프리미엄 테스트 상품',
      quantity: '1',
      totalPrice: '10000', // 15000 - 5000
      deliveryMethod: '매장에서',
      shippingAddress: '',
      customerMemo: '[쿠폰사용: TEST50 (-5000원 할인)]',
      status: '결제대기'
    })
  });
  data = await res.json();
  console.log('Order Creation:', data);

  // 5. Create Reservation
  console.log('5. Creating Reservation...');
  res = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: '이몽룡',
      customerPhone: '010-9876-5432',
      serviceName: '호텔 숙박권 [쿠폰사용: TEST50 (-5000원)]',
      reservationDate: '2026-06-01',
      reservationTime: '15:00',
      status: '예약접수'
    })
  });
  data = await res.json();
  console.log('Reservation Creation:', data);

  console.log('--- Test Completed Successfully ---');
}

runTest().catch(console.error);
