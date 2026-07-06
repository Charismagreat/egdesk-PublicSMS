import { NextResponse } from 'next/server';
import { 
  getKnowledgeDocument,
  updateKnowledgeDocument
} from '../../../../../egdesk-helpers';

/**
 * POST 핸들러: 수동 결재 승인 / 반려 처리 (수동 승인 시에도 A등급 최고 기밀 기본 유지)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document_id, approver_id, status, comments } = body;

    if (!document_id || !approver_id || !status) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. 기존 지식 문서 조회
    let originalDoc: any = null;
    try {
      originalDoc = await getKnowledgeDocument(document_id);
    } catch (err) {
      console.warn('결재할 지식 문서 조회 실패:', err);
      return NextResponse.json({ success: false, error: '지식 문서를 찾을 수 없습니다.' }, { status: 404 });
    }

    let updatedContent = originalDoc?.content || '';
    const newStatus = status === 'APPROVED' ? 'APPROVED_MANUAL' : 'REJECTED';

    if (updatedContent) {
      // 2. 문서 본문 내 결재상태 치환
      updatedContent = updatedContent.replace(/\*\s+\*\*결재상태\*\*:\s*([^\n]+)/g, `*   **결재상태**: ${newStatus}`);
      
      // 코멘트 및 감사 로그도 마크다운 하단에 추가하여 히스토리 추적 지원
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const logComment = `\n*   **결재 이력 [${now}]**: [${approver_id}]에 의해 결재가 [${status === 'APPROVED' ? '승인' : '반려'}]되었습니다. (의견: ${comments || '없음'})`;
      updatedContent += logComment;
    }

    // 3. MCP 지식 저장소 업데이트
    await updateKnowledgeDocument(document_id, {
      content: updatedContent
    });

    return NextResponse.json({ 
      success: true, 
      message: `성공적으로 결재가 ${status === 'APPROVED' ? '승인' : '반려'}되었습니다. 보안 락은 A등급(최고기밀)으로 엄격히 유지됩니다.`,
      document_id,
      status: newStatus
    });
  } catch (error: any) {
    console.error('POST /api/knowledge-ai/approve error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
