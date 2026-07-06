import { queryTable, insertRows } from '../../../../../../../egdesk-helpers';

export async function handleLegalDocument(reqBody: any, nowStr: string) {
  const { data } = reqBody;
  const { documentType, caseNumber, summary, deadline, actions = [], pdfFilePath } = data || {};

  const taskId = 'TSK-' + Date.now();
  const title = `[법률/소송] ${documentType} 대응 기한 (${caseNumber || '사건번호 미상'})`;

  // 1. 태스크 메인 등록
  await insertRows('crm_snaptasks', [{
    id: taskId,
    title,
    status: 'ACTIVE',
    partner_id: null,
    created_at: nowStr,
    updated_at: nowStr
  }]);

  // 2. 타임라인(SnapTask Items) 등록
  const allTimelineItems = await queryTable('crm_snaptask_items', {});
  const maxTimelineId = allTimelineItems.rows && allTimelineItems.rows.length > 0
    ? Math.max(...allTimelineItems.rows.map((t: any) => Number(t.id) || 0))
    : 0;
  const newTimelineId = maxTimelineId + 1;

  const actionsStr = Array.isArray(actions) 
    ? actions.map((a: any, idx: number) => `${idx + 1}. ${a}`).join('\n')
    : '';

  const contentText = `법률 상담 AI 분석 결과 도출된 중요 일정입니다.\n\n[사건번호] ${caseNumber || '미상'}\n[문서유형] ${documentType}\n[제출기한] ${deadline || '기한 정보 없음'}\n\n[문서 요약]\n${summary || '요약 없음'}\n\n[행동지침]\n${actionsStr}`;

  await insertRows('crm_snaptask_items', [{
    id: newTimelineId,
    task_id: taskId,
    content_text: contentText,
    file_url: pdfFilePath || '',
    file_type: 'IMAGE',
    ai_analysis: JSON.stringify({ documentType, caseNumber, summary, deadline, actions }),
    created_at: nowStr
  }]);

  return {
    action: 'legal_task_completed',
    taskId,
    message: `소송 문서 중요 일정 및 조치 사항이 회사 캘린더/태스크(지시번호: ${taskId})로 성공적으로 연동 등록되었습니다.`,
    auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 소송 문서 [${documentType}]에서 추출한 중요 일정 및 조치 사항을 회사 태스크(지시번호: ${taskId})에 등록 대행하였습니다.`
  };
}
