import { queryTable } from '../egdesk-helpers';

async function testOrderCapturePreserve() {
  console.log('=== [E2E 실주문 기록 테스트] 주문 내역 화면 검증용 데이터 생성 ===\n');

  const baseUrl = 'http://localhost:3000';
  let uploadedUrl = '';
  let createdOrderId = '';

  try {
    // 1. 임시 이미지 데이터 생성 (1x1 PNG)
    const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789ccb00000002000173757b060000000049454e44ae426082';
    const pngBuffer = Buffer.from(pngHex, 'hex');
    const blob = new Blob([pngBuffer], { type: 'image/png' });
    const file = new File([blob], 'order-capture-proof.png', { type: 'image/png' });

    // FormData 생성 및 파일 삽입
    const formData = new FormData();
    formData.append('file', file);

    console.log('[단계 1] 실무 이미지 업로드 (/api/upload)...');
    const uploadRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!uploadRes.ok) {
      throw new Error(`이미지 업로드 API 실패: HTTP ${uploadRes.status}`);
    }

    const uploadResult = await uploadRes.json();
    if (!uploadResult.success || !uploadResult.url) {
      throw new Error('이미지 업로드에 실패했습니다.');
    }
    
    uploadedUrl = uploadResult.url;
    console.log(' - 업로드 완료. 경로:', uploadedUrl);

    // 2. 주문 생성 요청
    console.log('[단계 2] 실무 주문 접수 생성 (/api/orders)...');
    const testOrderData = {
      customerName: '홍길동(모바일캡처)',
      customerPhone: '010-1234-5678',
      productName: '갤럭시 S26 울트라 상담 접수건',
      quantity: '1',
      totalPrice: '1450000',
      deliveryMethod: '상담/캡처',
      status: '접수완료', 
      attachmentUrl: uploadedUrl,
      customerMemo: '카카오톡 캡처본 증빙 첨부 - 즉시 상담 필요'
    };

    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOrderData)
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      throw new Error(`주문 생성 실패: ${errText}`);
    }

    const orderResult = await orderRes.json();
    createdOrderId = orderResult.id;
    console.log(` - 주문 접수 성공! 생성된 주문 ID: ${createdOrderId}`);
    console.log('\n>>> [성공] 실제 주문 접수 건이 DB에 보존되었습니다! <<<');
    console.log('>>> 이제 PC 관리자 화면(http://localhost:3000/orders)을 새로고침하여 확인해보세요! <<<');

  } catch (err: any) {
    console.error('\n>>> [실패] 오류 발생! <<<');
    console.error(err.message);
  }
}

testOrderCapturePreserve();
