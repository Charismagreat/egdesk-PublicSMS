export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, updateRows, insertRows } from '../../../../../egdesk-helpers';

/**
 * 🗄️ SQLite 물리 DB 지원자 관리 API 엔드포인트
 */

// 1. 지원자 목록 조회 (GET)
export async function GET() {
  try {
    const res = await queryTable('crm_recruitment_applicants', {});
    const dbRows = res.rows || [];

    // 프론트엔드 CamelCase 타입(Applicant Interface)으로 변환 매핑
    const applicants = dbRows.map((row: any) => {
      let interviewLogs = [];
      try {
        interviewLogs = row.interview_logs ? JSON.parse(row.interview_logs) : [];
      } catch (e) {
        console.error('interview_logs 파싱 에러:', e);
      }

      let aiEvaluation = undefined;
      if (row.ai_evaluation) {
        try {
          aiEvaluation = JSON.parse(row.ai_evaluation);
        } catch (e) {
          console.error('ai_evaluation 파싱 에러:', e);
        }
      }

      return {
        id: row.id,
        name: row.name,
        age: row.age || '',
        phone: row.phone || '',
        experience: row.experience || '',
        motivation: row.motivation || '',
        matchingScore: Number(row.matching_score) || 0,
        status: row.status || 'applied',
        interviewLogs,
        aiEvaluation,
        signatureUrl: row.signature_url || undefined,
        signedAt: row.signed_at || undefined,
        resume_file_path: row.resume_file_path || '',
        tech_stacks: row.tech_stacks || ''
      };
    });

    return NextResponse.json({
      success: true,
      applicants
    });
  } catch (error: any) {
    console.error('Recruitment Applicants GET API 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 지원자 상태 및 면접 로그 업데이트 (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, status, interviewLogs, aiEvaluation, signatureUrl, signedAt } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '업데이트할 지원자 식별자(id)가 누락되었습니다.' }, { status: 400 });
    }

    // 기존 데이터 존재 여부 확인
    const check = await queryTable('crm_recruitment_applicants', { filters: { id } });
    if (!check.rows || check.rows.length === 0) {
      return NextResponse.json({ success: false, error: '해당 지원자 데이터를 찾을 수 없습니다.' }, { status: 444 });
    }

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (interviewLogs !== undefined) updates.interview_logs = JSON.stringify(interviewLogs);
    if (aiEvaluation !== undefined) updates.ai_evaluation = JSON.stringify(aiEvaluation);
    if (signatureUrl !== undefined) updates.signature_url = signatureUrl;
    if (signedAt !== undefined) updates.signed_at = signedAt;

    await updateRows('crm_recruitment_applicants', updates, { filters: { id } });

    return NextResponse.json({
      success: true,
      message: '지원자 정보 및 상태 동기화 저장을 완료하였습니다.'
    });
  } catch (error: any) {
    console.error('Recruitment Applicants POST API 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
