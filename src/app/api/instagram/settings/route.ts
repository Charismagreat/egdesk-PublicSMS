export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../../egdesk-helpers';

// 기본 설정 값 정의
const DEFAULT_SETTINGS = {
  id: 1,
  is_autopilot: 0, // 0: 수동 검토 모드, 1: 100% 무인 오토파일럿 모드
  autopilot_interval: 'DAILY', // DAILY, WEEKLY, BIWEEKLY
  autopilot_time: '10:00', // 발행 시간 (HH:MM)
  tone_style: '인플루언서형', // 인플루언서형, 세련된형, 전문가형, 유머형
  instagram_username: '', // 연동 계정
  access_token: '', // API 연동 토큰
};

export async function GET() {
  try {
    // ID가 1인 설정을 조회
    const result = await queryTable('instagram_marketing_settings', { filters: { id: '1' } });
    
    if (result.rows && result.rows.length > 0) {
      return NextResponse.json({ success: true, settings: result.rows[0] });
    }

    // 설정이 없을 경우 기본 설정값으로 생성 및 저장
    await insertRows('instagram_marketing_settings', [DEFAULT_SETTINGS]);
    return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS });
  } catch (error: any) {
    console.error('인스타그램 설정 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // 설정이 존재하는지 확인
    const checkExist = await queryTable('instagram_marketing_settings', { filters: { id: '1' } });
    
    const updates = {
      is_autopilot: data.is_autopilot !== undefined ? Number(data.is_autopilot) : 0,
      autopilot_interval: data.autopilot_interval || 'DAILY',
      autopilot_time: data.autopilot_time || '10:00',
      tone_style: data.tone_style || '인플루언서형',
      instagram_username: data.instagram_username || '',
      access_token: data.access_token || '',
    };

    if (checkExist.rows && checkExist.rows.length > 0) {
      // 존재하면 업데이트
      await updateRows('instagram_marketing_settings', updates, { filters: { id: '1' } });
    } else {
      // 존재하지 않으면 삽입
      await insertRows('instagram_marketing_settings', [{ id: 1, ...updates }]);
    }

    return NextResponse.json({ success: true, settings: { id: 1, ...updates } });
  } catch (error: any) {
    console.error('인스타그램 설정 저장 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
