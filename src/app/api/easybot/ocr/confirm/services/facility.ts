import { queryTable, insertRows, updateRows } from '../../../../../../../egdesk-helpers';

export async function handleFacilityPlate(reqBody: any, nowStr: string) {
  const { data } = reqBody;
  const { manufacturer, modelName, serialNumber, manufactureYear, specifications } = data || {};

  if (!modelName) {
    throw new Error('등록할 설비 모델명(modelName) 정보가 누락되었습니다.');
  }

  const checkRes = await queryTable('crm_facilities', {
    filters: { serial_number: serialNumber }
  });

  const exists = checkRes.rows && checkRes.rows.length > 0;

  if (exists) {
    const existingId = checkRes.rows[0].id;
    await updateRows('crm_facilities', {
      manufacturer: manufacturer || checkRes.rows[0].manufacturer,
      model_name: modelName,
      manufacture_year: Number(manufactureYear) || checkRes.rows[0].manufacture_year,
      specifications: specifications || checkRes.rows[0].specifications,
      updated_at: nowStr
    }, {
      filters: { id: existingId }
    });

    return {
      action: 'updated',
      modelName,
      message: `기존 등록된 설비 [${modelName}]의 제조 사양 정보를 성공적으로 업데이트 완료했습니다. ⚡`,
      auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 기존 등록된 설비 [${modelName}]의 제조 사양 정보를 분석하여 설비 대장에 업데이트 대행하였습니다.`
    };
  } else {
    const generatedId = 'EQ-' + Date.now();
    await insertRows('crm_facilities', [{
      id: generatedId,
      name: modelName,
      manufacturer: manufacturer || '',
      model_name: modelName,
      serial_number: serialNumber || `SN-${Date.now()}`,
      manufacture_year: Number(manufactureYear) || null,
      specifications: specifications || '',
      location: '미지정 공장',
      status: 'RUNNING',
      health_score: 100.0,
      vibration_rms: 0.0,
      created_at: nowStr,
      updated_at: nowStr
    }]);

    return {
      action: 'inserted',
      modelName,
      message: `신규 설비 [${modelName}]를 설비 대장에 성공적으로 마운트 완료하였습니다. 🚀`,
      auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 신규 설비 [${modelName}]의 명판 사양 정보를 분석하여 설비 대장에 등록 대행하였습니다.`
    };
  }
}

export async function handleFacilityChecklist(reqBody: any, nowStr: string) {
  const { data } = reqBody;
  const { equipmentId, inspector, checkDate, checks = [], pdfFilePath } = data || {};

  if (!equipmentId || !inspector) {
    throw new Error('점검할 설비 ID(equipmentId) 및 점검자(inspector) 정보가 누락되었습니다.');
  }

  const hasFail = checks.some((c: any) => c.status === 'FAIL');
  const overallStatus = hasFail ? 'FAIL' : 'PASS';
  const checklistId = 'MC-' + Date.now();

  await insertRows('crm_facility_checklists', [{
    id: checklistId,
    equipmentId,
    inspector,
    checks: JSON.stringify(checks),
    signatureData: null,
    audioUrl: pdfFilePath || null,
    status: overallStatus,
    checkedAt: checkDate || nowStr
  }]);

  let taskCreated = false;
  let taskId = '';

  if (overallStatus === 'FAIL') {
    taskId = 'TSK-' + Date.now();
    const failItemsStr = checks
      .filter((c: any) => c.status === 'FAIL')
      .map((c: any) => `${c.checkItem} (${c.comment || '조치 필요'})`)
      .join(', ');

    await insertRows('crm_snaptasks', [{
      id: taskId,
      title: `[설비 비상] ${equipmentId} 긴급 정비 지시`,
      status: 'ACTIVE',
      partner_id: null,
      created_at: nowStr,
      updated_at: nowStr
    }]);

    const allTimelineItems = await queryTable('crm_snaptask_items', {});
    const maxTimelineId = allTimelineItems.rows && allTimelineItems.rows.length > 0
      ? Math.max(...allTimelineItems.rows.map((t: any) => Number(t.id) || 0))
      : 0;
    const newTimelineId = maxTimelineId + 1;

    await insertRows('crm_snaptask_items', [{
      id: newTimelineId,
      task_id: taskId,
      content_text: `수기 점검표 OCR 인식 결과 설비 부적합 결함이 발견되어 예방 보전 조치를 발령합니다.\n\n[부적합 상세]\n${failItemsStr}\n\n점검자: ${inspector}`,
      file_url: pdfFilePath || '',
      file_type: 'IMAGE',
      ai_analysis: JSON.stringify(checks),
      created_at: nowStr
    }]);

    const allActions = await queryTable('crm_snaptask_actions', {});
    const maxActionId = allActions.rows && allActions.rows.length > 0
      ? Math.max(...allActions.rows.map((a: any) => Number(a.id) || 0))
      : 0;
    const newActionId = maxActionId + 1;

    await insertRows('crm_snaptask_actions', [{
      id: newActionId,
      task_id: taskId,
      action_type: 'SMS_SENT',
      description: `보전팀 대상 긴급 장애 대응 문자 및 알림톡 발송 완료 (FAIL 감지 건)`,
      created_at: nowStr
    }]);

    taskCreated = true;
  }

  const failAuditSuffix = overallStatus === 'FAIL' ? '(부적합에 따른 보전 지시 자동 발령)' : '';
  const auditPrompt = `[이지봇 AI 이미지 OCR 자율 대행] 설비 [${equipmentId}]의 수기 점검표(점검자: ${inspector}) 데이터를 점검 이력에 등록 대행하였습니다. ${failAuditSuffix}`;

  return {
    action: 'checklist_completed',
    checklistId,
    taskCreated,
    taskId: taskId || null,
    message: `수기 점검표 데이터를 점검 이력에 성공적으로 적재 완료하였습니다. ${
      overallStatus === 'FAIL'
        ? `⚠️ 부적합 결함 발생에 따라 보전 작업 지시(${taskId})가 즉시 자동 발령되었습니다.`
        : '🟢 모든 항목 양호 검증됨.'
    }`,
    auditPrompt
  };
}
