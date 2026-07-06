/**
 * EGDesk User Data Configuration
 * Generated at: 2026-07-06T04:22:38.376Z
 *
 * This file contains type-safe definitions for your EGDesk tables.
 */

export const EGDESK_CONFIG = {
  apiUrl: 'http://localhost:8080',
  apiKey: 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0',
} as const;

export interface TableDefinition {
  name: string;
  displayName: string;
  description?: string;
  /** Omitted or unknown until synced / counted */
  rowCount?: number;
  columnCount: number;
  columns: string[];
}

export const TABLES = {
  table1: {
    name: 'import_finance',
    displayName: '수입 정산 관리',
    rowCount: 1,
    columnCount: 19,
    columns: ['id', 'finance_id', 'so_number', 'total_invoice_value', 'payment_due_date', 'is_paid', 'paid_date', 'bank_name', 'account_number', 'swift_code', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table2: {
    name: 'import_items',
    displayName: '수입 품목 상세',
    rowCount: 1,
    columnCount: 22,
    columns: ['id', 'item_id', 'so_number', 'part_number', 'description', 'quantity', 'unit_price', 'amount', 'currency', 'hs_code', 'country_of_origin', 'lot_number', 'mfg_date', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table3: {
    name: 'import_master',
    displayName: '수입 발주 마스터',
    rowCount: 1,
    columnCount: 23,
    columns: ['id', 'so_number', 'po_number', 'invoice_number', 'order_date', 'ship_date', 'invoice_date', 'air_waybill_nbr', 'ship_via', 'terms_of_sale', 'payment_terms', 'exporter_name', 'tags', 'file_path', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table4: {
    name: 'crm_inbound_excel_signatures',
    displayName: '엑셀 입고 자동 매핑',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', 'header_signature', 'partner_name', 'is_auto_approve', 'mapping_info', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table5: {
    name: 'crm_excel_signatures',
    displayName: '엑셀 헤더 자동 승인',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'header_signature', 'partner_name', 'transaction_type', 'is_auto_approve', 'mapping_info', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table6: {
    name: 'crm_interpretation_logs',
    displayName: '실시간 통역 AI 발화 로그',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'uuid', 'session_uuid', 'speaker_role', 'original_text', 'translated_text', 'audio_url', 'created_at', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table7: {
    name: 'crm_interpretation_sessions',
    displayName: '실시간 통역 AI 세션',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'uuid', 'user_id', 'source_lang', 'target_lang', 'tone_manner', 'file_path', 'audio_file_path', 'created_at', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table8: {
    name: 'easybot_rules_history',
    displayName: '이지봇 규칙 변경 이력 대장',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'rule_id', 'action_type', 'previous_value_json', 'new_value_json', 'change_reason', 'operator_id', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table9: {
    name: 'easybot_rules',
    displayName: '이지봇 자율 감시 규칙 대장',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', 'title', 'target_table', 'conditions_sql', 'assignee_id', 'task_priority', 'task_title_template', 'task_content_template', 'is_active', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table10: {
    name: 'crm_credential_audit_logs',
    displayName: '보안 인증 감사록',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'credential_id', 'operator_id', 'operator_name', 'action_type', 'access_reason', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table11: {
    name: 'crm_credential_emergency_requests',
    displayName: '보안 인증 비상 요청 대장',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'credential_id', 'requester_id', 'request_reason', 'status', 'approved_by', 'approved_at', 'expires_at', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table12: {
    name: 'crm_credential_vault',
    displayName: '보안 인증 정보 금고',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', 'category', 'asset_name', 'login_id', 'encrypted_password', 'iv', 'auth_tag', 'remarks', 'owner_operator_id', 'status', 'created_at', 'updated_at', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table13: {
    name: 'rnd_compliance_alarms',
    displayName: '규제 준수 모니터링 및 알림',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', 'alarm_id', 'center_id', 'category', 'severity', 'message', 'due_date', 'is_resolved', 'resolved_at', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table14: {
    name: 'rnd_logs',
    displayName: 'R&D 연구개발 일지 및 AI 생성 데이터',
    rowCount: 0,
    columnCount: 23,
    columns: ['id', 'log_id', 'center_id', 'author_id', 'work_date', 'raw_source', 'raw_content', 'audio_file_url', 'ai_generated_title', 'ai_generated_content', 'approval_status', 'approver_id', 'approved_at', 'blockchain_hash', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table15: {
    name: 'rnd_spaces',
    displayName: '연구 공간 자가 실사 및 Vision AI 분석 이력',
    rowCount: 0,
    columnCount: 20,
    columns: ['id', 'space_check_id', 'center_id', 'check_date', 'image_url_entrance', 'image_url_layout', 'ai_analysis_result', 'signage_status', 'partition_status', 'overall_status', 'inspector_notes', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table16: {
    name: 'rnd_staffs',
    displayName: '연구원 정보 및 자격 정보',
    rowCount: 0,
    columnCount: 21,
    columns: ['id', 'staff_id', 'center_id', 'user_id', 'staff_role', 'employment_status', 'degree_level', 'major_name', 'major_category', 'graduation_cert_ocr_json', 'qualification_status', 'joined_date', 'resigned_date', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table17: {
    name: 'rnd_centers',
    displayName: '기업부설연구소 기본 정보',
    rowCount: 0,
    columnCount: 20,
    columns: ['id', 'center_id', 'company_id', 'center_name', 'center_type', 'established_date', 'koita_reg_number', 'postal_code', 'address_road', 'address_detail', 'total_area_sqm', 'is_active', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table18: {
    name: 'crm_facility_predictive_part_rul',
    displayName: '설비 부품 수명 RUL',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', 'equipmentId', 'partName', 'rulDays', 'status', 'percent', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table19: {
    name: 'crm_facility_predictive_fft',
    displayName: '설비 주파수 분석',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', 'equipmentId', 'frequency', 'amplitude', 'label', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table20: {
    name: 'crm_facility_predictive_vibration',
    displayName: '설비 진동 센서 이력',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', 'equipmentId', 'time', 'value', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table21: {
    name: 'crm_facility_predictive_summary',
    displayName: '설비 건전도 요약',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', 'equipmentId', 'equipmentName', 'healthScore', 'vibrationRms', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table22: {
    name: 'crm_facility_repair_solutions',
    displayName: '설비 고장 해결 가이드',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', 'errorCode', 'rootCause', 'actions', 'similarHistory', 'warehouse', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table23: {
    name: 'crm_facility_repair_logs',
    displayName: '설비 수리 이력 대장',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'date', 'equipmentId', 'equipmentName', 'errorCode', 'symptom', 'repairDesc', 'mechanic', 'cost', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table24: {
    name: 'crm_facility_checklists',
    displayName: '설비 예방 점검 이력',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'equipmentId', 'inspector', 'checks', 'signatureData', 'audioUrl', 'status', 'checkedAt', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table25: {
    name: 'crm_facilities',
    displayName: '설비 대장 관리',
    rowCount: 0,
    columnCount: 20,
    columns: ['id', 'name', 'manufacturer', 'model_name', 'serial_number', 'manufacture_year', 'specifications', 'location', 'status', 'health_score', 'vibration_rms', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table26: {
    name: 'crm_quality_vision_logs',
    displayName: '품질 비전 판정 이력',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'timestamp', 'itemName', 'anomalyScore', 'status', 'defectType', 'imageUrl', 'isReviewed', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table27: {
    name: 'crm_quality_vision_model',
    displayName: '품질 비전 AI 모델 상태',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', 'activeModel', 'goldenSamplesCount', 'lastTrainedAt', 'anomalyThreshold', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table28: {
    name: 'crm_quality_spc_features',
    displayName: 'SPC 요인 중요도',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', 'name', 'value', 'color', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table29: {
    name: 'crm_quality_spc_predictions',
    displayName: 'SPC 계측 예측',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', 'batch', 'value', 'cpk', 'timestamp', 'risk', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table30: {
    name: 'crm_quality_spc_samples',
    displayName: 'SPC 계측 샘플',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', 'batch', 'value', 'cpk', 'timestamp', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table31: {
    name: 'crm_quality_spc_config',
    displayName: 'SPC 공정 제어 설정',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'targetValue', 'ucl', 'lcl', 'usl', 'lsl', 'currentCpk', 'cpkStatus', 'futureRiskProbability', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table32: {
    name: 'crm_quality_sensors_timeline',
    displayName: '센서 시계열',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', 'time', 'vibration', 'current', 'temperature', 'anomalyScore', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table33: {
    name: 'crm_quality_sensors_contribution',
    displayName: '센서 기여도',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', 'name', 'rate', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table34: {
    name: 'crm_quality_sensors_status',
    displayName: '설비 센서 상태',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'equipmentName', 'operationalStatus', 'vibrationRms', 'motorCurrent', 'bearingTemp', 'anomalyScore', 'threshold', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table35: {
    name: 'crm_quality_ncr_similar_cases',
    displayName: '유사 NCR 사례',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', 'title', 'similarity', 'rootCause', 'actionTaken', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table36: {
    name: 'crm_quality_ncr_items',
    displayName: 'NCR 부적합 내역',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', 'date', 'itemName', 'defectCode', 'defectType', 'quantity', 'reporter', 'status', 'description', 'actionPlan', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table37: {
    name: 'crm_quality_checklist_submissions',
    displayName: '체크리스트 제출 내역',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'lotNo', 'inspector', 'checkItems', 'signatureData', 'photoUrl', 'status', 'submittedAt', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table38: {
    name: 'crm_grant_company_profile',
    displayName: '지원금 매칭용 기업 프로필',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'establishmentYear', 'employeeCount', 'patentsCount', 'femaleEmployeeRatio', 'youthEmployeeRatio', 'sector', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table39: {
    name: 'crm_grant_rnd_plans',
    displayName: '지원금 R&D 계획서',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', 'announcement_id', 'plan_data', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table40: {
    name: 'crm_grant_bookmarks',
    displayName: '지원금 북마크',
    rowCount: 0,
    columnCount: 10,
    columns: ['id', 'announcement_id', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table41: {
    name: 'crm_grant_announcements',
    displayName: '정부 지원금 추천 공고',
    rowCount: 75,
    columnCount: 15,
    columns: ['id', 'title', 'agency', 'match_score', 'match_guide', 'budget', 'end_date', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table42: {
    name: 'crm_recruitment_applicants',
    displayName: '채용 지원자 관리',
    rowCount: 0,
    columnCount: 23,
    columns: ['id', 'name', 'age', 'phone', 'experience', 'motivation', 'matching_score', 'status', 'signature_url', 'signed_at', 'resume_file_path', 'tech_stacks', 'interview_logs', 'ai_evaluation', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table43: {
    name: 'crm_financial_analysis_logs',
    displayName: 'AI 재무 분석 로그',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'statement_id', 'z_score', 'risk_grade', 'forecast_text', 'consulting_text', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table44: {
    name: 'crm_financial_statement_items',
    displayName: '재무제표 상세 계정과목',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', 'statement_id', 'category', 'account_name', 'amount', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table45: {
    name: 'crm_financial_statements',
    displayName: '재무제표 관리',
    rowCount: 0,
    columnCount: 21,
    columns: ['id', 'company_id', 'company_type', 'fiscal_year', 'fiscal_quarter', 'total_assets', 'total_liabilities', 'total_equity', 'revenue', 'operating_income', 'net_income', 'pdf_file_path', 'parsed_raw_json', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table46: {
    name: 'safety_inspect_logs',
    displayName: '안전점검 감사 대장',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'inspect_title', 'inspect_date', 'inspector_name', 'checklist_json', 'fail_actions_json', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table47: {
    name: 'safety_near_misses',
    displayName: '아차사고 및 유해요소 제보 대장',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', 'reporter_name', 'hazard_location', 'description', 'photo_url', 'risk_grade', 'action_status', 'action_description', 'action_photo_url', 'action_completed_at', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table48: {
    name: 'safety_tbm_logs',
    displayName: 'TBM 안전 교육 대장',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'tbm_date', 'work_leader', 'weather_info', 'tbm_script', 'attendees_count', 'attendee_signatures', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table49: {
    name: 'safety_risk_assessments',
    displayName: 'AI 위험성평가서',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'work_name', 'work_date', 'hazards_json', 'risk_level', 'evaluated_by', 'approved_at', 'status', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table50: {
    name: 'safety_policies',
    displayName: '안전보건방침 및 목표',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', 'year', 'policy_title', 'targets_json', 'established_at', 'established_by', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table51: {
    name: 'crm_partner_ai_reports',
    displayName: '거래처 AI 리스크 보고서',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'partner_id', 'company_name', 'report_type', 'risk_grade', 'summary', 'result_json', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table52: {
    name: 'easybot_action_audit_logs',
    displayName: '이지봇 AI 감사 로그',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'operator_username', 'original_prompt', 'action_name', 'arguments_json', 'status', 'execution_result', 'error_message', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table53: {
    name: 'crm_web_published_sites',
    displayName: '홈페이지 다변화 배포 관리',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'domain_type', 'domain_url', 'html_content', 'config_json', 'title', 'description', 'is_active', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table54: {
    name: 'crm_web_form_logs',
    displayName: '웹 양식 발급대장',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', 'template_id', 'record_id', 'record_name', 'print_data', 'issue_date', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table55: {
    name: 'crm_web_templates',
    displayName: '웹 양식 템플릿 마스터',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'template_name', 'html_content', 'web_html_content', 'document_type', 'is_active', 'is_print_active', 'is_web_active', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table56: {
    name: 'crm_employment_certificate_logs',
    displayName: '재직증명서 발급대장',
    rowCount: 0,
    columnCount: 20,
    columns: ['id', 'staff_id', 'staff_name', 'joined_date', 'degree_level', 'major_name', 'address', 'usage', 'issue_date', 'issue_dept', 'issue_by', 'extra_data', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table57: {
    name: 'form_mappings',
    displayName: '양식 데이터 필드 매핑',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'template_id', 'field_key', 'field_label', 'pos_x', 'pos_y', 'font_size', 'font_weight', 'text_align', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table58: {
    name: 'form_templates',
    displayName: '양식 템플릿 마스터',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'template_name', 'document_type', 'file_path', 'orientation', 'is_active', 'query_sql', 'query_params', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table59: {
    name: 'ai_contextual_help',
    displayName: 'AI 도움말 캐시',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', 'hint_key', 'hint_text', 'ai_explanation', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table60: {
    name: 'crm_meeting_tasks',
    displayName: '회의 할 일 및 일정',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'meeting_id', 'assignee_name', 'assignee_email', 'task_desc', 'due_date', 'status', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table61: {
    name: 'crm_meetings',
    displayName: '회의 대장',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'title', 'date', 'attendees', 'transcript', 'summary', 'status', 'audio_url', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table62: {
    name: 'crm_deadstock_proposals',
    displayName: '불용자재 제안 메일 로그',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'item_id', 'target_company', 'target_email', 'subject', 'content', 'status', 'replied_content', 'replied_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table63: {
    name: 'system_mail_logs',
    displayName: '메일 AI 관제 로그',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', 'sender', 'subject', 'received_at', 'ai_summary', 'intent', 'risk_level', 'action_type', 'action_result', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table64: {
    name: 'system_menu_settings',
    displayName: '시스템 메뉴 설정',
    rowCount: 46,
    columnCount: 12,
    columns: ['id', 'menu_href', 'is_enabled', 'sort_order', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table65: {
    name: 'shared_dashboards',
    displayName: '공유 대시보드 관리',
    rowCount: 0,
    columnCount: 23,
    columns: ['id', 'share_id', 'title', 'sql_query', 'table_name', 'display_name', 'chart_spec_json', 'briefing_markdown', 'refresh_interval', 'last_refreshed_at', 'created_at', 'is_active', 'sort_order', 'is_pinned', 'custom_title', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table66: {
    name: 'expense_projects',
    displayName: '지출 프로젝트 관리',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', 'name', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table67: {
    name: 'expense_employees',
    displayName: '지출 임직원 관리',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', 'name', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table68: {
    name: 'expense_departments',
    displayName: '지출 부서 관리',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', 'name', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table69: {
    name: 'expense_tags',
    displayName: '통합 공통 태그 관리',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', 'name', 'scope', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table70: {
    name: 'expense_categories',
    displayName: '지출 계정과목 관리',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', 'main_category', 'mid_category', 'sub_category', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table71: {
    name: 'crm_governance_logs',
    displayName: 'AI 결재 및 데이터 거버넌스 감사록',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'doc_type', 'doc_id', 'doc_title', 'status', 'reason', 'operator', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table72: {
    name: 'expense_settings',
    displayName: '지출 예산 설정',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'monthly_budget', 'is_alert_enabled', 'alert_threshold_percent', 'alert_sms_template', 'alert_phone', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table73: {
    name: 'crm_expenses',
    displayName: '지출 내역',
    rowCount: 0,
    columnCount: 25,
    columns: ['id', 'title', 'category', 'amount', 'expense_date', 'payment_method', 'attachment_url', 'ai_analysis', 'memo', 'approval_status', 'approval_memo', 'approved_at', 'actual_expense_date', 'deduction_amount', 'transfer_fee', 'card_approval_no', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table74: {
    name: 'inventory_logs',
    displayName: '재고 변동 이력',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', 'itemId', 'itemName', 'itemType', 'changeType', 'quantity', 'price', 'operator', 'note', 'createdAt', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table75: {
    name: 'alert_logs',
    displayName: '가격 알림 발송 로그',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'log_id', 'rule_id', 'sent_price', 'sent_message', 'sent_at', 'api_response', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table76: {
    name: 'alert_rules',
    displayName: '가격 알림 규칙',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'rule_id', 'item_id', 'rule_name', 'condition_type', 'threshold_value', 'phone_number', 'sms_template', 'is_enabled', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table77: {
    name: 'price_histories',
    displayName: '수집 가격 이력',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'history_id', 'url_id', 'captured_price', 'captured_at', 'status', 'error_message', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table78: {
    name: 'target_urls',
    displayName: '가격 감시 URL',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', 'url_id', 'item_id', 'site_name', 'target_url', 'css_selector', 'xpath', 'cron_interval', 'is_active', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table79: {
    name: 'tracked_items',
    displayName: '가격 추적 품목',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'item_id', 'item_code', 'item_name', 'category', 'spec', 'base_price', 'target_margin_rate', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table80: {
    name: 'ai_token_usage_logs',
    displayName: 'AI 토큰 사용량 로그',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'model', 'purpose', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'user_name', 'menu_path', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table81: {
    name: 'crm_inventory_inbound_items',
    displayName: '자율 입고 상세 품목',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'inbound_id', 'item_name', 'spec', 'quantity', 'price', 'barcode', 'matched_item_id', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table82: {
    name: 'crm_inventory_inbounds',
    displayName: '자율 입고 대장',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'partner_name', 'inbound_date', 'total_amount', 'pdf_file_path', 'file_hash', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table83: {
    name: 'inventory_items',
    displayName: '재고 품목',
    rowCount: 0,
    columnCount: 25,
    columns: ['id', 'type', 'name', 'category', 'price', 'partner', 'stock', 'safeStock', 'location', 'spec', 'unitType', 'unitValue', 'boxContains', 'description', 'tags', 'barcode', 'createdAt', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table84: {
    name: 'crm_partner_contacts',
    displayName: '거래처 담당자 명함첩',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'partner_id', 'name', 'position', 'phone', 'email', 'card_image_url', 'is_primary', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table85: {
    name: 'crm_snaptask_actions',
    displayName: '스냅태스크 AI 액션 감사록',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', 'task_id', 'action_type', 'description', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table86: {
    name: 'crm_snaptask_items',
    displayName: '스냅태스크 상세 내역',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'task_id', 'content_text', 'file_url', 'file_type', 'ai_analysis', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table87: {
    name: 'crm_snaptasks',
    displayName: '스냅태스크 관리',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', 'title', 'status', 'partner_id', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table88: {
    name: 'crm_partners',
    displayName: '거래처 관리',
    rowCount: 0,
    columnCount: 26,
    columns: ['id', 'type', 'company_name', 'business_number', 'representative', 'phone', 'fax', 'manager_name', 'manager_phone', 'manager_position', 'manager_email', 'email', 'address', 'vip_level', 'credit_limit', 'business_license_url', 'memo', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table89: {
    name: 'crm_sales_orders',
    displayName: '수주서 관리',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', 'estimate_id', 'client_order_no', 'customer_name', 'customer_phone', 'customer_manager', 'status', 'total_amount', 'delivery_date', 'order_date', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table90: {
    name: 'crm_purchase_orders',
    displayName: '발주서 관리',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'estimate_id', 'vendor_name', 'vendor_phone', 'status', 'total_amount', 'created_at', 'completed_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table91: {
    name: 'crm_estimate_items',
    displayName: '견적서 품목 상세',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', 'estimate_id', 'product_id', 'item_code', 'product_name', 'spec', 'quantity', 'unit_price', 'amount', 'delivery_date', 'valid_item_code', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table92: {
    name: 'crm_estimates',
    displayName: '견적서 관리',
    rowCount: 0,
    columnCount: 22,
    columns: ['id', 'type', 'direction_status', 'partner_name', 'partner_phone', 'partner_manager', 'total_amount', 'file_url', 'business_license_url', 'ai_parsed', 'tags', 'created_at', 'uuid', 'sales_order_number', 'purchase_order_number', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table93: {
    name: 'crm_point_history',
    displayName: '적립금 내역',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'customer_id', 'transaction_type', 'amount', 'balance_after', 'description', 'related_entity_type', 'related_entity_id', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table94: {
    name: 'crm_coupons_restrictions',
    displayName: '쿠폰 제한 관리',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', 'coupon_id', 'restriction_type', 'target_type', 'target_value', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table95: {
    name: 'coupons',
    displayName: '쿠폰 관리',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', 'code', 'name', 'discount_type', 'discount_value', 'min_order_amount', 'status', 'expires_at', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table96: {
    name: 'naver_blog_marketing_settings',
    displayName: '네이버 블로그 마케팅 설정',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'is_autopilot', 'autopilot_interval', 'autopilot_time', 'tone_style', 'naver_blog_id', 'api_client_id', 'api_client_secret', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table97: {
    name: 'crm_naver_blog_posts',
    displayName: '네이버 블로그 포스팅 이력 및 예약',
    rowCount: 0,
    columnCount: 21,
    columns: ['id', 'product_id', 'status', 'title', 'content', 'target_keywords', 'image_url', 'sub_image_url', 'scheduled_at', 'posted_at', 'error_message', 'views_count', 'likes_count', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table98: {
    name: 'instagram_marketing_settings',
    displayName: '인스타그램 마케팅 설정',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'is_autopilot', 'autopilot_interval', 'autopilot_time', 'tone_style', 'instagram_username', 'access_token', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table99: {
    name: 'crm_instagram_posts',
    displayName: '인스타그램 포스팅 이력 및 예약',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', 'product_id', 'status', 'content', 'image_url', 'scheduled_at', 'posted_at', 'error_message', 'likes_count', 'comments_count', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table100: {
    name: 'crm_operators',
    displayName: '운영자 권한 관리',
    rowCount: 2,
    columnCount: 17,
    columns: ['id', 'username', 'password_hash', 'name', 'role', 'employee_number', 'phone', 'my_card_image_url', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table101: {
    name: 'system_settings',
    displayName: '시스템 설정',
    rowCount: 16,
    columnCount: 11,
    columns: ['id', 'key', 'value', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table102: {
    name: 'crm_deliveries',
    displayName: '배송 내역',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'customer_name', 'customer_phone', 'address', 'courier', 'tracking_number', 'status', 'order_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table103: {
    name: 'crm_reservations',
    displayName: '예약 내역',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'customer_name', 'customer_phone', 'service_name', 'reservation_date', 'reservation_time', 'status', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table104: {
    name: 'crm_payments',
    displayName: '결제 내역',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', 'customer_name', 'payment_method', 'amount', 'payment_date', 'status', 'order_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table105: {
    name: 'crm_orders',
    displayName: '주문 내역',
    rowCount: 0,
    columnCount: 21,
    columns: ['id', 'customer_name', 'customer_phone', 'product_name', 'quantity', 'total_price', 'delivery_method', 'shipping_address', 'tracking_number', 'attachment_url', 'customer_memo', 'order_date', 'status', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table106: {
    name: 'crm_transactions',
    displayName: '거래 내역',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', 'customer_name', 'customer_phone', 'product_name', 'amount', 'order_date', 'status', 'order_id', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table107: {
    name: 'products',
    displayName: '광고 상품',
    rowCount: 0,
    columnCount: 20,
    columns: ['id', 'name', 'price', 'url', 'description', 'main_image_url', 'detail_image_url', 'available_methods', 'category', 'menu_category', 'is_coupon_excludable', 'is_estimate_price', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table108: {
    name: 'ad_templates',
    displayName: '광고 템플릿',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', 'name', 'header', 'footer', 'opt_out', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table109: {
    name: 'message_logs',
    displayName: '발송 내역',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', 'customer_id', 'phone', 'message', 'status', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table110: {
    name: 'message_templates',
    displayName: '문자 템플릿',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', 'title', 'content', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table111: {
    name: 'crm_customers',
    displayName: '고객 명단',
    rowCount: 0,
    columnCount: 20,
    columns: ['id', 'name', 'phone', 'email', 'tags', 'memo', 'address', 'shipping_address', 'recipient_name', 'recipient_phone', 'point_balance', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition
} as const;


// Main table (first table by default)
export const MAIN_TABLE = TABLES.table1;


// Helper to get table by name
export function getTableByName(tableName: string): TableDefinition | undefined {
  return Object.values(TABLES).find(t => t.name === tableName);
}

// Export table names for easy access
export const TABLE_NAMES = {
  table1: 'import_finance',
  table2: 'import_items',
  table3: 'import_master',
  table4: 'crm_inbound_excel_signatures',
  table5: 'crm_excel_signatures',
  table6: 'crm_interpretation_logs',
  table7: 'crm_interpretation_sessions',
  table8: 'easybot_rules_history',
  table9: 'easybot_rules',
  table10: 'crm_credential_audit_logs',
  table11: 'crm_credential_emergency_requests',
  table12: 'crm_credential_vault',
  table13: 'rnd_compliance_alarms',
  table14: 'rnd_logs',
  table15: 'rnd_spaces',
  table16: 'rnd_staffs',
  table17: 'rnd_centers',
  table18: 'crm_facility_predictive_part_rul',
  table19: 'crm_facility_predictive_fft',
  table20: 'crm_facility_predictive_vibration',
  table21: 'crm_facility_predictive_summary',
  table22: 'crm_facility_repair_solutions',
  table23: 'crm_facility_repair_logs',
  table24: 'crm_facility_checklists',
  table25: 'crm_facilities',
  table26: 'crm_quality_vision_logs',
  table27: 'crm_quality_vision_model',
  table28: 'crm_quality_spc_features',
  table29: 'crm_quality_spc_predictions',
  table30: 'crm_quality_spc_samples',
  table31: 'crm_quality_spc_config',
  table32: 'crm_quality_sensors_timeline',
  table33: 'crm_quality_sensors_contribution',
  table34: 'crm_quality_sensors_status',
  table35: 'crm_quality_ncr_similar_cases',
  table36: 'crm_quality_ncr_items',
  table37: 'crm_quality_checklist_submissions',
  table38: 'crm_grant_company_profile',
  table39: 'crm_grant_rnd_plans',
  table40: 'crm_grant_bookmarks',
  table41: 'crm_grant_announcements',
  table42: 'crm_recruitment_applicants',
  table43: 'crm_financial_analysis_logs',
  table44: 'crm_financial_statement_items',
  table45: 'crm_financial_statements',
  table46: 'safety_inspect_logs',
  table47: 'safety_near_misses',
  table48: 'safety_tbm_logs',
  table49: 'safety_risk_assessments',
  table50: 'safety_policies',
  table51: 'crm_partner_ai_reports',
  table52: 'easybot_action_audit_logs',
  table53: 'crm_web_published_sites',
  table54: 'crm_web_form_logs',
  table55: 'crm_web_templates',
  table56: 'crm_employment_certificate_logs',
  table57: 'form_mappings',
  table58: 'form_templates',
  table59: 'ai_contextual_help',
  table60: 'crm_meeting_tasks',
  table61: 'crm_meetings',
  table62: 'crm_deadstock_proposals',
  table63: 'system_mail_logs',
  table64: 'system_menu_settings',
  table65: 'shared_dashboards',
  table66: 'expense_projects',
  table67: 'expense_employees',
  table68: 'expense_departments',
  table69: 'expense_tags',
  table70: 'expense_categories',
  table71: 'crm_governance_logs',
  table72: 'expense_settings',
  table73: 'crm_expenses',
  table74: 'inventory_logs',
  table75: 'alert_logs',
  table76: 'alert_rules',
  table77: 'price_histories',
  table78: 'target_urls',
  table79: 'tracked_items',
  table80: 'ai_token_usage_logs',
  table81: 'crm_inventory_inbound_items',
  table82: 'crm_inventory_inbounds',
  table83: 'inventory_items',
  table84: 'crm_partner_contacts',
  table85: 'crm_snaptask_actions',
  table86: 'crm_snaptask_items',
  table87: 'crm_snaptasks',
  table88: 'crm_partners',
  table89: 'crm_sales_orders',
  table90: 'crm_purchase_orders',
  table91: 'crm_estimate_items',
  table92: 'crm_estimates',
  table93: 'crm_point_history',
  table94: 'crm_coupons_restrictions',
  table95: 'coupons',
  table96: 'naver_blog_marketing_settings',
  table97: 'crm_naver_blog_posts',
  table98: 'instagram_marketing_settings',
  table99: 'crm_instagram_posts',
  table100: 'crm_operators',
  table101: 'system_settings',
  table102: 'crm_deliveries',
  table103: 'crm_reservations',
  table104: 'crm_payments',
  table105: 'crm_orders',
  table106: 'crm_transactions',
  table107: 'products',
  table108: 'ad_templates',
  table109: 'message_logs',
  table110: 'message_templates',
  table111: 'crm_customers'
} as const;
