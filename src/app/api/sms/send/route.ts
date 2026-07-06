import { NextResponse } from 'next/server';
import { getGmAutomation } from '@/lib/google-messages';
import { insertRows, queryTable, executeSQL } from '@/../egdesk-helpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, message, customerId, deviceId } = body;
    
    if (!phoneNumber || !message) {
      return NextResponse.json({ success: false, error: 'Phone number and message are required' }, { status: 400 });
    }

    // 1. 등록된 발송 기기 리스트 로드 (기본 기기 포함)
    let smsDevices = [
      { phoneNumber: 'default', name: '기본 스마트폰 기기', isConnected: false, dailyLimit: 150 }
    ];
    try {
      const settingsRes = await queryTable('system_settings', { filters: { key: 'sms_devices' } });
      if (settingsRes.rows && settingsRes.rows.length > 0) {
        const parsed = JSON.parse(settingsRes.rows[0].value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          smsDevices = parsed;
        }
      }
    } catch (e) {
      console.error('Failed to fetch sms devices setting:', e);
    }

    // 2. 한국 시간(KST) 오늘 00:00:00 기준의 UTC 시작 시간 도출
    const nowKst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const startKst = new Date(nowKst);
    startKst.setUTCHours(0, 0, 0, 0);
    const startUtc = new Date(startKst.getTime() - 9 * 60 * 60 * 1000);
    const startStr = startUtc.toISOString();

    // 3. 지능형 다중 기기 로드밸런서 및 페일오버(Auto-Failover) 알고리즘 구동
    let targetDeviceId = deviceId || 'default';
    let finalLimit = 150;
    let selectedDevice = null;

    // 우선순위 정렬: 요청한 특정 기기를 1순위로 배치하되, 차단 상태라면 연결 가능성 높은 다른 기기를 순서대로 스크리닝
    const orderOfDevices = [...smsDevices];
    const requestedIdx = orderOfDevices.findIndex(d => d.phoneNumber === targetDeviceId);
    if (requestedIdx > -1) {
      const [req] = orderOfDevices.splice(requestedIdx, 1);
      orderOfDevices.unshift(req);
    }

    for (const dev of orderOfDevices) {
      const devId = dev.phoneNumber;
      const devLimit = Math.min(450, Math.max(1, dev.dailyLimit || 150));

      // 3-1. 이 기기의 오늘 성공한 발송 횟수 계산 (소프트 삭제 배제, 비가시 메타데이터 LIKE 검색)
      let devSentCount = 0;
      try {
        const countRes = await executeSQL(
          `SELECT COUNT(*) as count FROM message_logs WHERE status = 'SUCCESS' AND deleted_at IS NULL AND created_at >= '${startStr}' AND message LIKE '%[sender_device: ${devId}]%'`
        );
        if (countRes.rows && countRes.rows.length > 0) {
          devSentCount = parseInt(countRes.rows[0].count, 10) || 0;
        }
      } catch (e) {
        console.error(`Failed to count sent sms for device ${devId}:`, e);
      }

      // 3-2. 기기의 구글 메시지 페어링 연결 상태 실시간 체크
      let isDevConnected = false;
      try {
        const automation = getGmAutomation(devId);
        isDevConnected = await automation.checkAuthStatus();
      } catch (e) {
        console.error(`Failed to check auth status for device ${devId}:`, e);
      }

      // 연결이 정상이고 오늘 발송량이 개별 한도보다 적다면 이 기기를 전격 발송 대행 기기로 낙점!
      if (isDevConnected && devSentCount < devLimit) {
        selectedDevice = dev;
        targetDeviceId = devId;
        finalLimit = devLimit;
        break;
      }
    }

    // 4. 가용 가능한 기기가 아예 존재하지 않는 경우 차단 가드 발동
    if (!selectedDevice) {
      return NextResponse.json({
        success: false,
        error: `발송 가능한 기기가 존재하지 않습니다. 모든 연동 기기의 일일 무료 한도가 가득 찼거나, 스마트폰과의 연결 페어링이 끊겨 있습니다. (각 기기별 일일 한도 조절은 무료 문자 발송 AI 화면 우측 [발송 기기 멀티 허브]에서 가능합니다.)`
      }, { status: 429 });
    }

    // Call playwright automation to send message (지능형으로 획득한 기기 인스턴스 사용)
    const automation = getGmAutomation(targetDeviceId);
    const result = await automation.sendSMS(phoneNumber, message);
    
    // Log to DB (메시지 꼬리에 비가시 전송기기 메타데이터 서명 삽입)
    const logMessage = `${message}\n[sender_device: ${targetDeviceId}]`;
    const now = new Date().toISOString();
    const id = Math.floor(Math.random() * 1000000);
    
    await insertRows('message_logs', [
      {
        id,
        customer_id: customerId || null,
        phone: phoneNumber,
        message: logMessage,
        status: result.success ? 'SUCCESS' : 'FAILED',
        created_at: now
      }
    ]).catch(e => console.error('Failed to log message to DB:', e));

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, deviceId: targetDeviceId });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
