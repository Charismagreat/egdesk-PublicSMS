import { NextResponse } from 'next/server';
import { 
  queryTable, 
  insertRows, 
  updateRows, 
  executeSQL, 
  listInstagramConnections, 
  saveInstagramConnection,
  callInstagramTool
} from '../../../../../egdesk-helpers';
import { initInstagramAutopilotDaemon } from '@/lib/instagram-cron-daemon';

// 기본 설정 값 정의
const DEFAULT_SETTINGS = {
  id: 1,
  is_autopilot: 0, // 0: 수동 검토 모드, 1: 100% 무인 오토파일럿 모드
  autopilot_interval: 'DAILY', // DAILY, WEEKLY, BIWEEKLY
  autopilot_time: '10:00', // 발행 시간 (HH:MM)
  tone_style: '인플루언서형', // 인플루언서형, 세련된형, 전문가형, 유머형
  instagram_username: '', // 연동 계정
  access_token: '', // API 연동 토큰
  ig_user_id: '', // Meta Graph API 비즈니스 유저 ID
};

export async function GET() {
  try {
    // DB 컬럼 무손실 마이그레이션 안전 가드
    try {
      await executeSQL(`ALTER TABLE instagram_marketing_settings ADD COLUMN ig_user_id TEXT;`);
    } catch (e) {
      // 이미 컬럼이 존재하는 경우 지극히 정상
    }

    // 이지데스크 MCP 계정 연동 목록 조회 시도
    let mcpConnections: any[] = [];
    try {
      const connRes = await listInstagramConnections();
      if (connRes && connRes.success && Array.isArray(connRes.connections)) {
        mcpConnections = connRes.connections;
      }
    } catch (mcpErr) {
      console.warn('EGDesk Instagram MCP connections query fallback:', mcpErr);
    }

    // 설정 테이블 데이터 전체 조회 (규격 규칙: orderBy 'id' DESC 최신 정렬 필수 주입)
    const result = await queryTable('instagram_marketing_settings', { orderBy: 'id', orderDirection: 'DESC', limit: 100 });
    
    if (result && result.rows && result.rows.length > 0) {
      // deleted_at이 없는 최신 유효 행 선택
      const activeRows = result.rows.filter((r: any) => !r.deleted_at);
      const validSetting = activeRows[0] || result.rows[0];
      return NextResponse.json({ success: true, settings: validSetting, mcpConnections });
    }

    // 설정이 없을 경우 기본 설정값으로 생성 및 저장
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const initialSettings = {
      ...DEFAULT_SETTINGS,
      updated_at: nowStr,
      updated_by: 'system',
    };
    await insertRows('instagram_marketing_settings', [initialSettings]);
    return NextResponse.json({ success: true, settings: initialSettings, mcpConnections });
  } catch (error: any) {
    console.error('인스타그램 설정 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // DB 컬럼 무손실 마이그레이션 안전 가드
    try {
      await executeSQL(`ALTER TABLE instagram_marketing_settings ADD COLUMN ig_user_id TEXT;`);
    } catch (e) {
      // 이미 컬럼이 존재하는 경우 지극히 정상
    }

    const data = await req.json();
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    // 기존 설정 전체 조회 (최신순 정렬 필수 적용)
    const checkExist = await queryTable('instagram_marketing_settings', { orderBy: 'id', orderDirection: 'DESC', limit: 100 });
    const existingRows = checkExist?.rows || [];
    const activeRows = existingRows.filter((r: any) => !r.deleted_at);
    const current = activeRows[0] || existingRows[0] || DEFAULT_SETTINGS;
    const targetId = current.id || 1;

    const updates = {
      is_autopilot: data.is_autopilot !== undefined && data.is_autopilot !== null ? Number(data.is_autopilot) : Number(current.is_autopilot ?? 0),
      autopilot_interval: data.autopilot_interval !== undefined ? data.autopilot_interval : (current.autopilot_interval || 'DAILY'),
      autopilot_time: data.autopilot_time !== undefined ? data.autopilot_time : (current.autopilot_time || '10:00'),
      tone_style: data.tone_style !== undefined ? data.tone_style : (current.tone_style || '인플루언서형'),
      instagram_username: data.instagram_username !== undefined ? data.instagram_username : (current.instagram_username || ''),
      access_token: data.access_token !== undefined ? data.access_token : (current.access_token || ''),
      ig_user_id: data.ig_user_id !== undefined ? data.ig_user_id : (current.ig_user_id || ''),
      updated_at: nowStr,
      updated_by: 'admin',
    };

    // MCP 인스타그램 계정 동시 저장 시도 (비밀번호 및 유저네임이 있는 경우)
    if (data.instagram_username && data.password) {
      try {
        await saveInstagramConnection({
          name: data.instagram_username,
          username: data.instagram_username,
          password: data.password,
          handle: data.instagram_username.startsWith('@') ? data.instagram_username.substring(1) : data.instagram_username,
        });
      } catch (mcpSaveErr) {
        console.warn('EGDesk MCP saveInstagramConnection warning:', mcpSaveErr);
      }
    }

    // 이지데스크 MCP 서버에 실물 오토파일럿 스케줄 객체 정식 동기화 등록 (connectionId 및 topics 필수 항목 보장)
    try {
      let targetConnectionId: string | undefined = undefined;
      const connRes = await listInstagramConnections();
      if (connRes && connRes.success && Array.isArray(connRes.connections) && connRes.connections.length > 0) {
        const foundConn = connRes.connections.find((c: any) => c.username === updates.instagram_username) || connRes.connections[0];
        targetConnectionId = foundConn.id;
      }

      await callInstagramTool('instagram_schedule_create', {
        title: `EGDesk 인스타그램 오토파일럿 스케줄 (${updates.instagram_username || '메인 계정'})`,
        connectionId: targetConnectionId || '1786432604684',
        enabled: updates.is_autopilot === 1,
        frequencyType: (updates.autopilot_interval || 'DAILY').toLowerCase(),
        scheduledTime: updates.autopilot_time || '10:00',
        topics: ['신상품 추천', '특가 제안', '인플루언서 큐레이션'],
        toneStyle: updates.tone_style || '인플루언서형'
      });
    } catch (mcpSchedErr) {
      console.warn('EGDesk MCP instagram_schedule_create sync warning:', mcpSchedErr);
    }

    if (existingRows.length > 0) {
      for (const row of existingRows) {
        await updateRows('instagram_marketing_settings', updates, { filters: { id: row.id } });
      }
    } else {
      await insertRows('instagram_marketing_settings', [{ id: 1, ...updates }]);
    }

    return NextResponse.json({ success: true, settings: { id: targetId, ...updates } });
  } catch (error: any) {
    console.error('인스타그램 설정 저장 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
