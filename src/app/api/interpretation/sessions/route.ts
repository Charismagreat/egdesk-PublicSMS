export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, executeSQL } from '@/../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// 한국 시간 타임스탬프 헬퍼
function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 쿠키 파서
function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 사용자 인증 헬퍼
async function verifyUser(req?: Request) {
  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('auth_token')?.value;
  } catch (e) {
    console.error('[verifyUser] cookies() 읽기 실패:', e);
  }

  if (!token && req) {
    const cookieHeader = req.headers.get('cookie');
    token = getCookieValue(cookieHeader, 'auth_token') || undefined;
  }

  if (!token) return { isAuthenticated: false, username: 'system' };
  try {
    const payload = decodeJwt(token);
    return {
      isAuthenticated: true,
      username: (payload.username || 'admin') as string
    };
  } catch {
    return { isAuthenticated: false, username: 'system' };
  }
}

/**
 * GET: 과거 통역 세션 리스트 조회 (soft delete 필터링 'deleted_at IS NULL' 기본 적용)
 */
export async function GET(req: Request) {
  const { isAuthenticated, username } = await verifyUser(req);
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';

    if (action === 'detail') {
      const uuid = searchParams.get('uuid');
      if (!uuid) {
        return NextResponse.json({ success: false, error: '조회할 세션 UUID가 필요합니다.' }, { status: 400 });
      }

      // 단일 세션 상세 및 발화 로그 결합 조회
      const sessionRes = await queryTable('crm_interpretation_sessions', {
        filters: { uuid, deleted_at: null }
      });

      if (!sessionRes.rows || sessionRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: '존재하지 않거나 삭제된 세션입니다.' }, { status: 404 });
      }

      const logsRes = await queryTable('crm_interpretation_logs', {
        filters: { session_uuid: uuid, deleted_at: null },
        orderBy: 'created_at',
        orderDirection: 'ASC'
      });

      return NextResponse.json({
        success: true,
        session: sessionRes.rows[0],
        logs: logsRes.rows || []
      });
    }

    // 목록 조회 (소프트 삭제되지 않은 것만)
    const sessionsRes = await queryTable('crm_interpretation_sessions', {
      filters: { user_id: username, deleted_at: null },
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });

    return NextResponse.json({
      success: true,
      sessions: sessionsRes.rows || []
    });

  } catch (err: any) {
    console.error('GET /api/interpretation/sessions error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: 신규 통역 세션 생성
 */
export async function POST(req: Request) {
  const { isAuthenticated, username } = await verifyUser(req);
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { source_lang, target_lang, tone_manner } = body;

    if (!source_lang || !target_lang || !tone_manner) {
      return NextResponse.json({ success: false, error: '필수 설정 항목이 누락되었습니다.' }, { status: 400 });
    }

    const uuid = crypto.randomUUID();
    const timestamp = getKoreanTimestamp();

    // 순차 ID 발급을 위해 현재 최대 ID 조회
    const maxIdRes = await executeSQL('SELECT MAX(id) as maxId FROM crm_interpretation_sessions');
    const nextId = (maxIdRes.rows?.[0]?.maxId || 0) + 1;

    const sessionData = {
      id: nextId,
      uuid,
      user_id: username,
      source_lang,
      target_lang,
      tone_manner,
      file_path: null,
      audio_file_path: null,
      created_at: timestamp,
      updated_at: timestamp,
      updated_by: username
    };

    await insertRows('crm_interpretation_sessions', [sessionData]);

    return NextResponse.json({
      success: true,
      session_uuid: uuid,
      message: '신규 통역 세션이 성공적으로 개설되었습니다.'
    });

  } catch (err: any) {
    console.error('POST /api/interpretation/sessions error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PATCH: 통역 세션 종료 및 녹음 파일/텍스트 일괄 업로드 처리
 */
export async function PATCH(req: Request) {
  const { isAuthenticated, username } = await verifyUser(req);
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const uuid = formData.get('session_uuid') as string;
    const audioFile = formData.get('audio') as File | null;

    if (!uuid) {
      return NextResponse.json({ success: false, error: '종료할 세션 UUID가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 해당 세션의 발화 내역 조회
    const logsRes = await queryTable('crm_interpretation_logs', {
      filters: { session_uuid: uuid, deleted_at: null },
      orderBy: 'created_at',
      orderDirection: 'ASC'
    });
    const logs = logsRes.rows || [];

    // 2. 텍스트 스크립트 작성
    let scriptText = `==================================================\n`;
    scriptText += ` 글로벌 비즈니스 AI 동시통역 스크립트\n`;
    scriptText += ` 세션 UUID: ${uuid}\n`;
    scriptText += ` 생성 일시: ${getKoreanTimestamp()}\n`;
    scriptText += `==================================================\n\n`;

    logs.forEach((log: any, index: number) => {
      const speaker = log.speaker_role === 'host' ? '임직원(Host)' : '상대방(Guest)';
      scriptText += `[${index + 1}] ${speaker} (${log.created_at})\n`;
      scriptText += `   원문: ${log.original_text}\n`;
      scriptText += `   번역: ${log.translated_text}\n\n`;
    });

    const publicDir = path.join(process.cwd(), 'public');
    
    // 스크립트 파일 저장
    const transcriptsDir = path.join(publicDir, 'uploads', 'transcripts');
    if (!fs.existsSync(transcriptsDir)) {
      fs.mkdirSync(transcriptsDir, { recursive: true });
    }
    const transcriptFileName = `${uuid}.txt`;
    const transcriptFilePath = path.join(transcriptsDir, transcriptFileName);
    fs.writeFileSync(transcriptFilePath, scriptText, 'utf-8');
    const dbTranscriptPath = `/uploads/transcripts/${transcriptFileName}`;

    // 3. 오디오 파일이 있으면 물리적으로 저장
    let dbAudioPath = null;
    if (audioFile) {
      const recordingsDir = path.join(publicDir, 'uploads', 'recordings');
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
      }
      const audioFileName = `${uuid}.wav`;
      const audioFilePath = path.join(recordingsDir, audioFileName);
      
      const audioBytes = await audioFile.arrayBuffer();
      const audioBuffer = Buffer.from(audioBytes);
      fs.writeFileSync(audioFilePath, audioBuffer);
      dbAudioPath = `/uploads/recordings/${audioFileName}`;
    }

    // 4. DB 세션 상태 최종 업데이트
    const timestamp = getKoreanTimestamp();
    const updateData = {
      file_path: dbTranscriptPath,
      audio_file_path: dbAudioPath,
      updated_at: timestamp,
      updated_by: username
    };

    await updateRows('crm_interpretation_sessions', updateData, {
      filters: { uuid }
    });

    return NextResponse.json({
      success: true,
      message: '통역 세션이 종료되었으며 대화 스크립트 및 음성이 안전하게 저장되었습니다.',
      file_path: dbTranscriptPath,
      audio_file_path: dbAudioPath
    });

  } catch (err: any) {
    console.error('PATCH /api/interpretation/sessions error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
