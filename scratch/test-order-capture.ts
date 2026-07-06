import { deleteRows, queryTable } from '../egdesk-helpers';

async function testOrderCapture() {
  console.log('=== [E2E 테스트] 모바일 주문 접수(/m/order-capture) 기능 테스트 ===\n');

  const baseUrl = 'http://localhost:3000';
  let uploadedUrl = '';
  let createdOrderId = '';

  try {
    // 1. 임시 이미지 데이터 생성 (1x1 PNG)
    const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789ccb00000002000173757b060000000049454e44ae426082';
    const pngBuffer = Buffer.from(pngHex, 'hex');
    const blob = new Blob([pngBuffer], { type: 'image/png' });
    const file = new File([blob], 'test-capture.png', { type: 'image/png' });

    // FormData 생성 및 파일 삽입
    const formData = new FormData();
    formData.append('file', file);

    console.log('[단계 1] 이미지 업로드 테스트 (/api/upload)...');
    const uploadRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!uploadRes.ok) {
      throw new Error(`이미지 업로드 API 실패: HTTP ${uploadRes.status}`);
    }

    const uploadResult = await uploadRes.json();
    console.log(' - 업로드 응답:', JSON.stringify(uploadResult));

    if (!uploadResult.success || !uploadResult.url) {
      throw new Error('이미지 업로드에 실패했습니다.');
    }
    
    uploadedUrl = uploadResult.url;
    console.log(' - 업로드 성공! 이미지 URL:', uploadedUrl);
    console.log('--------------------------------------------------');

    // 2. 주문 생성 요청
    console.log('[단계 2] 주문 접수 생성 테스트 (/api/orders)...');
    const testOrderData = {
      customerName: '홍길동(테스트)',
      customerPhone: '010-9999-8888',
      productName: 'E2E 자동화 테스트 메모 내역',
      quantity: '1',
      totalPrice: '0',
      deliveryMethod: '상담/캡처',
      status: '접수완료', // 바로 접수 선택 상황 시뮬레이션
      attachmentUrl: uploadedUrl
    };

    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOrderData)
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      throw new Error(`주문 생성 API 실패: HTTP ${orderRes.status} | 내용: ${errText}`);
    }

    const orderResult = await orderRes.json();
    console.log(' - 주문 생성 응답:', JSON.stringify(orderResult));

    if (!orderResult.success || !orderResult.id) {
      throw new Error('주문 생성에 실패했습니다.');
    }

    createdOrderId = orderResult.id;
    console.log(' - 주문 생성 성공! 주문 ID:', createdOrderId);
    console.log('--------------------------------------------------');

    // 3. 데이터베이스(DB) 정합성 확인
    console.log('[단계 3] DB 데이터 정합성 검증...');
    const dbResult = await queryTable('crm_orders', {
      filters: { id: createdOrderId }
    });

    if (!dbResult.rows || dbResult.rows.length === 0) {
      throw new Error('DB에 생성된 주문 건을 찾을 수 없습니다.');
    }

    const record = dbResult.rows[0];
    console.log(' - DB 레코드 조회 성공!');
    console.log(`   * 주문 ID: ${record.id}`);
    console.log(`   * 고객명: ${record.customer_name} (기대값: "홍길동(테스트)")`);
    console.log(`   * 연락처: ${record.customer_phone} (기대값: "010-9999-8888")`);
    console.log(`   * 메모/내용: ${record.product_name} (기대값: "E2E 자동화 테스트 메모 내역")`);
    console.log(`   * 첨부 이미지 URL: ${record.attachment_url} (기대값: "${uploadedUrl}")`);
    console.log(`   * 주문 접수 상태: ${record.status} (기대값: "접수완료")`);
    console.log(`   * 배송/수령 수단: ${record.delivery_method} (기대값: "상담/캡처")`);

    if (
      record.customer_name === '홍길동(테스트)' &&
      record.customer_phone === '010-9999-8888' &&
      record.attachment_url === uploadedUrl &&
      record.status === '접수완료'
    ) {
      console.log('\n>>> [성공] 모든 기능이 완벽하게 정상 작동하고 있습니다! <<<');
    } else {
      throw new Error('DB 데이터가 전송한 데이터와 일치하지 않습니다.');
    }

  } catch (err: any) {
    console.error('\n>>> [실패] 테스트 도중 오류가 발생했습니다! <<<');
    console.error('에러 내용:', err.message);
  } finally {
    // 4. 테스트 데이터 Clean up (DB 롤백 및 복구)
    if (createdOrderId) {
      console.log('\n[Clean-up] 테스트 데이터 제거 중...');
      try {
        await deleteRows('crm_orders', { filters: { id: createdOrderId } });
        console.log(' - DB 테스트 주문 레코드가 안전하게 삭제되었습니다.');
      } catch (cleanupErr: any) {
        console.error(' - 테스트 주문 레코드 삭제 중 실패:', cleanupErr.message);
      }
    }
  }
}

testOrderCapture();
