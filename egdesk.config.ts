/**
 * EGDesk User Data Configuration
 * Generated at: 2026-07-08T05:56:16.247Z
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
    name: 'crm_company_event_types',
    displayName: '회사 일정 유형 마스터 대장',
    rowCount: 6,
    columnCount: 8,
    columns: ['id', '_version', 'type_key', 'type_name', 'color_theme', 'is_system', 'created_at', 'updated_at']
  } as TableDefinition,
  table2: {
    name: 'crm_operator_projects',
    displayName: '임직원 참여 프로젝트 대장',
    rowCount: 4,
    columnCount: 11,
    columns: ['id', '_version', 'operator_id', 'project_name', 'role_in_project', 'start_date', 'end_date', 'contribution_rate', 'performance_score', 'performance_evaluation', 'outcome_link']
  } as TableDefinition,
  table3: {
    name: 'crm_operator_job_history',
    displayName: '임직원 담당업무 변경이력 대장',
    rowCount: 4,
    columnCount: 7,
    columns: ['id', '_version', 'operator_id', 'assignment_date', 'job_description', 'prev_job_description', 'is_current']
  } as TableDefinition,
  table4: {
    name: 'crm_operator_families',
    displayName: '임직원 부양가족 대장',
    rowCount: 4,
    columnCount: 9,
    columns: ['id', '_version', 'operator_id', 'relation_type', 'name', 'birth_date', 'phone_number', 'is_dependent', 'remarks']
  } as TableDefinition,
  table5: {
    name: 'crm_operator_reputations',
    displayName: '임직원 다차원 평판 대장',
    rowCount: 5,
    columnCount: 10,
    columns: ['id', '_version', 'operator_id', 'evaluation_date', 'evaluator_id', 'source_type', 'score', 'positive_feedback', 'constructive_feedback', 'updated_at']
  } as TableDefinition,
  table6: {
    name: 'crm_operator_incidents',
    displayName: '임직원 대내외 사건사고 대장',
    rowCount: 2,
    columnCount: 10,
    columns: ['id', '_version', 'operator_id', 'occurred_date', 'severity', 'title', 'description', 'status', 'outcome', 'updated_at']
  } as TableDefinition,
  table7: {
    name: 'crm_operator_medical',
    displayName: '임직원 병력 치료 대장',
    rowCount: 1,
    columnCount: 9,
    columns: ['id', '_version', 'operator_id', 'diagnosis_name', 'treatment_start_date', 'treatment_end_date', 'hospital_name', 'sick_leave_days', 'work_limitations']
  } as TableDefinition,
  table8: {
    name: 'crm_operator_family_events',
    displayName: '임직원 경조사 지원 대장',
    rowCount: 2,
    columnCount: 8,
    columns: ['id', '_version', 'operator_id', 'event_date', 'relation', 'type', 'congratulation_money', 'wreath_provided']
  } as TableDefinition,
  table9: {
    name: 'crm_operator_awards',
    displayName: '임직원 상벌 징계 대장',
    rowCount: 2,
    columnCount: 9,
    columns: ['id', '_version', 'operator_id', 'record_date', 'type', 'title', 'content', 'authority', 'remarks']
  } as TableDefinition,
  table10: {
    name: 'crm_operator_promotions',
    displayName: '임직원 승진발령 대장',
    rowCount: 2,
    columnCount: 9,
    columns: ['id', '_version', 'operator_id', 'change_date', 'prev_dept', 'next_dept', 'prev_role', 'next_role', 'promotion_reason']
  } as TableDefinition,
  table11: {
    name: 'crm_operator_salaries',
    displayName: '임직원 급여상여 이력 대장',
    rowCount: 6,
    columnCount: 13,
    columns: ['id', '_version', 'operator_id', 'payment_year_month', 'base_salary', 'bonus_amount', 'weekly_holiday_allowance', 'overtime_allowance', 'meal_allowance', 'deduction_amount', 'net_salary', 'payment_date', 'status']
  } as TableDefinition,
  table12: {
    name: 'crm_operator_careers',
    displayName: '임직원 이전경력 대장',
    rowCount: 3,
    columnCount: 10,
    columns: ['id', '_version', 'operator_id', 'company_name', 'department', 'job_title', 'join_date', 'retire_date', 'assigned_task', 'leaving_reason']
  } as TableDefinition,
  table13: {
    name: 'crm_operator_licenses',
    displayName: '임직원 자격면허 대장',
    rowCount: 6,
    columnCount: 8,
    columns: ['id', '_version', 'operator_id', 'license_name', 'issuer', 'license_no', 'acquisition_date', 'expiry_date']
  } as TableDefinition,
  table14: {
    name: 'crm_operator_education',
    displayName: '임직원 학력이력 대장',
    rowCount: 5,
    columnCount: 9,
    columns: ['id', '_version', 'operator_id', 'school_name', 'major', 'degree', 'entrance_date', 'graduation_date', 'status']
  } as TableDefinition,
  table15: {
    name: 'crm_company_events',
    displayName: '전사 회사 일정 공유 대장',
    rowCount: 2,
    columnCount: 9,
    columns: ['id', '_version', 'title', 'start_date', 'end_date', 'event_type', 'description', 'created_by', 'created_at']
  } as TableDefinition,
  table16: {
    name: 'crm_operator_leave_balances',
    displayName: '직원별 연차 잔액 관리',
    rowCount: 2,
    columnCount: 7,
    columns: ['id', '_version', 'operator_id', 'total_allowed', 'used', 'remaining', 'updated_at']
  } as TableDefinition,
  table17: {
    name: 'crm_annual_leaves',
    displayName: '직원 연차 신청 결재 대장',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'operator_id', 'leave_type', 'start_date', 'end_date', 'days_spent', 'status', 'reason', 'reject_reason', 'approver_id', 'medical_certificate_path', 'created_at', 'updated_at']
  } as TableDefinition,
  table18: {
    name: 'crm_attendance',
    displayName: '직원 근태 대장',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', '_version', 'operator_id', 'work_date', 'clock_in', 'clock_out', 'status', 'working_hours', 'memo', 'created_at', 'updated_at']
  } as TableDefinition,
  table19: {
    name: 'import_finance',
    displayName: '수입 정산 관리',
    rowCount: 1,
    columnCount: 20,
    columns: ['id', '_version', 'finance_id', 'so_number', 'total_invoice_value', 'payment_due_date', 'is_paid', 'paid_date', 'bank_name', 'account_number', 'swift_code', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table20: {
    name: 'import_items',
    displayName: '수입 품목 상세',
    rowCount: 1,
    columnCount: 23,
    columns: ['id', '_version', 'item_id', 'so_number', 'part_number', 'description', 'quantity', 'unit_price', 'amount', 'currency', 'hs_code', 'country_of_origin', 'lot_number', 'mfg_date', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table21: {
    name: 'import_master',
    displayName: '수입 발주 마스터',
    rowCount: 1,
    columnCount: 24,
    columns: ['id', '_version', 'so_number', 'po_number', 'invoice_number', 'order_date', 'ship_date', 'invoice_date', 'air_waybill_nbr', 'ship_via', 'terms_of_sale', 'payment_terms', 'exporter_name', 'tags', 'file_path', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table22: {
    name: 'crm_inbound_excel_signatures',
    displayName: '엑셀 입고 자동 매핑',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'header_signature', 'partner_name', 'is_auto_approve', 'mapping_info', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table23: {
    name: 'crm_excel_signatures',
    displayName: '엑셀 헤더 자동 승인',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'header_signature', 'partner_name', 'transaction_type', 'is_auto_approve', 'mapping_info', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table24: {
    name: 'crm_interpretation_logs',
    displayName: '실시간 통역 AI 발화 로그',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'uuid', 'session_uuid', 'speaker_role', 'original_text', 'translated_text', 'audio_url', 'created_at', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table25: {
    name: 'crm_interpretation_sessions',
    displayName: '실시간 통역 AI 세션',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'uuid', 'user_id', 'source_lang', 'target_lang', 'tone_manner', 'file_path', 'audio_file_path', 'created_at', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table26: {
    name: 'easybot_rules_history',
    displayName: '이지봇 규칙 변경 이력 대장',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'rule_id', 'action_type', 'previous_value_json', 'new_value_json', 'change_reason', 'operator_id', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table27: {
    name: 'easybot_rules',
    displayName: '이지봇 자율 감시 규칙 대장',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', '_version', 'title', 'target_table', 'conditions_sql', 'assignee_id', 'task_priority', 'task_title_template', 'task_content_template', 'is_active', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table28: {
    name: 'crm_credential_audit_logs',
    displayName: '보안 인증 감사록',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'credential_id', 'operator_id', 'operator_name', 'action_type', 'access_reason', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table29: {
    name: 'crm_credential_emergency_requests',
    displayName: '보안 인증 비상 요청 대장',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'credential_id', 'requester_id', 'request_reason', 'status', 'approved_by', 'approved_at', 'expires_at', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table30: {
    name: 'crm_credential_vault',
    displayName: '보안 인증 정보 금고',
    rowCount: 0,
    columnCount: 20,
    columns: ['id', '_version', 'category', 'asset_name', 'login_id', 'encrypted_password', 'iv', 'auth_tag', 'remarks', 'owner_operator_id', 'status', 'created_at', 'updated_at', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table31: {
    name: 'rnd_compliance_alarms',
    displayName: '규제 준수 모니터링 및 알림',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', '_version', 'alarm_id', 'center_id', 'category', 'severity', 'message', 'due_date', 'is_resolved', 'resolved_at', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table32: {
    name: 'rnd_logs',
    displayName: 'R&D 연구개발 일지 및 AI 생성 데이터',
    rowCount: 0,
    columnCount: 24,
    columns: ['id', '_version', 'log_id', 'center_id', 'author_id', 'work_date', 'raw_source', 'raw_content', 'audio_file_url', 'ai_generated_title', 'ai_generated_content', 'approval_status', 'approver_id', 'approved_at', 'blockchain_hash', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table33: {
    name: 'rnd_spaces',
    displayName: '연구 공간 자가 실사 및 Vision AI 분석 이력',
    rowCount: 0,
    columnCount: 21,
    columns: ['id', '_version', 'space_check_id', 'center_id', 'check_date', 'image_url_entrance', 'image_url_layout', 'ai_analysis_result', 'signage_status', 'partition_status', 'overall_status', 'inspector_notes', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table34: {
    name: 'rnd_staffs',
    displayName: '연구원 정보 및 자격 정보',
    rowCount: 0,
    columnCount: 22,
    columns: ['id', '_version', 'staff_id', 'center_id', 'user_id', 'staff_role', 'employment_status', 'degree_level', 'major_name', 'major_category', 'graduation_cert_ocr_json', 'qualification_status', 'joined_date', 'resigned_date', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table35: {
    name: 'rnd_centers',
    displayName: '기업부설연구소 기본 정보',
    rowCount: 0,
    columnCount: 21,
    columns: ['id', '_version', 'center_id', 'company_id', 'center_name', 'center_type', 'established_date', 'koita_reg_number', 'postal_code', 'address_road', 'address_detail', 'total_area_sqm', 'is_active', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table36: {
    name: 'crm_facility_predictive_part_rul',
    displayName: '설비 부품 수명 RUL',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'equipmentId', 'partName', 'rulDays', 'status', 'percent', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table37: {
    name: 'crm_facility_predictive_fft',
    displayName: '설비 주파수 분석',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'equipmentId', 'frequency', 'amplitude', 'label', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table38: {
    name: 'crm_facility_predictive_vibration',
    displayName: '설비 진동 센서 이력',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', '_version', 'equipmentId', 'time', 'value', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table39: {
    name: 'crm_facility_predictive_summary',
    displayName: '설비 건전도 요약',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'equipmentId', 'equipmentName', 'healthScore', 'vibrationRms', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table40: {
    name: 'crm_facility_repair_solutions',
    displayName: '설비 고장 해결 가이드',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'errorCode', 'rootCause', 'actions', 'similarHistory', 'warehouse', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table41: {
    name: 'crm_facility_repair_logs',
    displayName: '설비 수리 이력 대장',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'date', 'equipmentId', 'equipmentName', 'errorCode', 'symptom', 'repairDesc', 'mechanic', 'cost', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table42: {
    name: 'crm_facility_checklists',
    displayName: '설비 예방 점검 이력',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'equipmentId', 'inspector', 'checks', 'signatureData', 'audioUrl', 'status', 'checkedAt', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table43: {
    name: 'crm_facilities',
    displayName: '설비 대장 관리',
    rowCount: 0,
    columnCount: 21,
    columns: ['id', '_version', 'name', 'manufacturer', 'model_name', 'serial_number', 'manufacture_year', 'specifications', 'location', 'status', 'health_score', 'vibration_rms', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table44: {
    name: 'crm_quality_vision_logs',
    displayName: '품질 비전 판정 이력',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'timestamp', 'itemName', 'anomalyScore', 'status', 'defectType', 'imageUrl', 'isReviewed', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table45: {
    name: 'crm_quality_vision_model',
    displayName: '품질 비전 AI 모델 상태',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'activeModel', 'goldenSamplesCount', 'lastTrainedAt', 'anomalyThreshold', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table46: {
    name: 'crm_quality_spc_features',
    displayName: 'SPC 요인 중요도',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', '_version', 'name', 'value', 'color', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table47: {
    name: 'crm_quality_spc_predictions',
    displayName: 'SPC 계측 예측',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'batch', 'value', 'cpk', 'timestamp', 'risk', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table48: {
    name: 'crm_quality_spc_samples',
    displayName: 'SPC 계측 샘플',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'batch', 'value', 'cpk', 'timestamp', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table49: {
    name: 'crm_quality_spc_config',
    displayName: 'SPC 공정 제어 설정',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'targetValue', 'ucl', 'lcl', 'usl', 'lsl', 'currentCpk', 'cpkStatus', 'futureRiskProbability', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table50: {
    name: 'crm_quality_sensors_timeline',
    displayName: '센서 시계열',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'time', 'vibration', 'current', 'temperature', 'anomalyScore', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table51: {
    name: 'crm_quality_sensors_contribution',
    displayName: '센서 기여도',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'name', 'rate', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table52: {
    name: 'crm_quality_sensors_status',
    displayName: '설비 센서 상태',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'equipmentName', 'operationalStatus', 'vibrationRms', 'motorCurrent', 'bearingTemp', 'anomalyScore', 'threshold', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table53: {
    name: 'crm_quality_ncr_similar_cases',
    displayName: '유사 NCR 사례',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'title', 'similarity', 'rootCause', 'actionTaken', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table54: {
    name: 'crm_quality_ncr_items',
    displayName: 'NCR 부적합 내역',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', '_version', 'date', 'itemName', 'defectCode', 'defectType', 'quantity', 'reporter', 'status', 'description', 'actionPlan', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table55: {
    name: 'crm_quality_checklist_submissions',
    displayName: '체크리스트 제출 내역',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'lotNo', 'inspector', 'checkItems', 'signatureData', 'photoUrl', 'status', 'submittedAt', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table56: {
    name: 'crm_grant_company_profile',
    displayName: '지원금 매칭용 기업 프로필',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'establishmentYear', 'employeeCount', 'patentsCount', 'femaleEmployeeRatio', 'youthEmployeeRatio', 'sector', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table57: {
    name: 'crm_grant_rnd_plans',
    displayName: '지원금 R&D 계획서',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'announcement_id', 'plan_data', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table58: {
    name: 'crm_grant_bookmarks',
    displayName: '지원금 북마크',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', '_version', 'announcement_id', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table59: {
    name: 'crm_grant_announcements',
    displayName: '정부 지원금 추천 공고',
    rowCount: 131,
    columnCount: 16,
    columns: ['id', '_version', 'title', 'agency', 'match_score', 'match_guide', 'budget', 'end_date', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table60: {
    name: 'crm_recruitment_applicants',
    displayName: '채용 지원자 관리',
    rowCount: 0,
    columnCount: 24,
    columns: ['id', '_version', 'name', 'age', 'phone', 'experience', 'motivation', 'matching_score', 'status', 'signature_url', 'signed_at', 'resume_file_path', 'tech_stacks', 'interview_logs', 'ai_evaluation', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table61: {
    name: 'crm_financial_analysis_logs',
    displayName: 'AI 재무 분석 로그',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'statement_id', 'z_score', 'risk_grade', 'forecast_text', 'consulting_text', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table62: {
    name: 'crm_financial_statement_items',
    displayName: '재무제표 상세 계정과목',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'statement_id', 'category', 'account_name', 'amount', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table63: {
    name: 'crm_financial_statements',
    displayName: '재무제표 관리',
    rowCount: 0,
    columnCount: 22,
    columns: ['id', '_version', 'company_id', 'company_type', 'fiscal_year', 'fiscal_quarter', 'total_assets', 'total_liabilities', 'total_equity', 'revenue', 'operating_income', 'net_income', 'pdf_file_path', 'parsed_raw_json', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table64: {
    name: 'safety_inspect_logs',
    displayName: '안전점검 감사 대장',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'inspect_title', 'inspect_date', 'inspector_name', 'checklist_json', 'fail_actions_json', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table65: {
    name: 'safety_near_misses',
    displayName: '아차사고 및 유해요소 제보 대장',
    rowCount: 0,
    columnCount: 20,
    columns: ['id', '_version', 'reporter_name', 'hazard_location', 'description', 'photo_url', 'risk_grade', 'action_status', 'action_description', 'action_photo_url', 'action_completed_at', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table66: {
    name: 'safety_tbm_logs',
    displayName: 'TBM 안전 교육 대장',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'tbm_date', 'work_leader', 'weather_info', 'tbm_script', 'attendees_count', 'attendee_signatures', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table67: {
    name: 'safety_risk_assessments',
    displayName: 'AI 위험성평가서',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'work_name', 'work_date', 'hazards_json', 'risk_level', 'evaluated_by', 'approved_at', 'status', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table68: {
    name: 'safety_policies',
    displayName: '안전보건방침 및 목표',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'year', 'policy_title', 'targets_json', 'established_at', 'established_by', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table69: {
    name: 'crm_partner_ai_reports',
    displayName: '거래처 AI 리스크 보고서',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'partner_id', 'company_name', 'report_type', 'risk_grade', 'summary', 'result_json', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table70: {
    name: 'easybot_action_audit_logs',
    displayName: '이지봇 AI 감사 로그',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'operator_username', 'original_prompt', 'action_name', 'arguments_json', 'status', 'execution_result', 'error_message', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table71: {
    name: 'crm_web_published_sites',
    displayName: '홈페이지 다변화 배포 관리',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'domain_type', 'domain_url', 'html_content', 'config_json', 'title', 'description', 'is_active', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table72: {
    name: 'crm_web_form_logs',
    displayName: '웹 양식 발급대장',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'template_id', 'record_id', 'record_name', 'print_data', 'issue_date', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table73: {
    name: 'crm_web_templates',
    displayName: '웹 양식 템플릿 마스터',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'template_name', 'html_content', 'web_html_content', 'document_type', 'is_active', 'is_print_active', 'is_web_active', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table74: {
    name: 'crm_employment_certificate_logs',
    displayName: '재직증명서 발급대장',
    rowCount: 0,
    columnCount: 21,
    columns: ['id', '_version', 'staff_id', 'staff_name', 'joined_date', 'degree_level', 'major_name', 'address', 'usage', 'issue_date', 'issue_dept', 'issue_by', 'extra_data', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table75: {
    name: 'form_mappings',
    displayName: '양식 데이터 필드 매핑',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'template_id', 'field_key', 'field_label', 'pos_x', 'pos_y', 'font_size', 'font_weight', 'text_align', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table76: {
    name: 'form_templates',
    displayName: '양식 템플릿 마스터',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'template_name', 'document_type', 'file_path', 'orientation', 'is_active', 'query_sql', 'query_params', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table77: {
    name: 'ai_contextual_help',
    displayName: 'AI 도움말 캐시',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'hint_key', 'hint_text', 'ai_explanation', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table78: {
    name: 'crm_meeting_tasks',
    displayName: '회의 할 일 및 일정',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'meeting_id', 'assignee_name', 'assignee_email', 'task_desc', 'due_date', 'status', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table79: {
    name: 'crm_meetings',
    displayName: '회의 대장',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'title', 'date', 'attendees', 'transcript', 'summary', 'status', 'audio_url', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table80: {
    name: 'crm_deadstock_proposals',
    displayName: '불용자재 제안 메일 로그',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'item_id', 'target_company', 'target_email', 'subject', 'content', 'status', 'replied_content', 'replied_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table81: {
    name: 'system_mail_logs',
    displayName: '메일 AI 관제 로그',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', '_version', 'sender', 'subject', 'received_at', 'ai_summary', 'intent', 'risk_level', 'action_type', 'action_result', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table82: {
    name: 'system_menu_settings',
    displayName: '시스템 메뉴 설정',
    rowCount: 47,
    columnCount: 13,
    columns: ['id', '_version', 'menu_href', 'is_enabled', 'sort_order', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table83: {
    name: 'shared_dashboards',
    displayName: '공유 대시보드 관리',
    rowCount: 0,
    columnCount: 24,
    columns: ['id', '_version', 'share_id', 'title', 'sql_query', 'table_name', 'display_name', 'chart_spec_json', 'briefing_markdown', 'refresh_interval', 'last_refreshed_at', 'created_at', 'is_active', 'sort_order', 'is_pinned', 'custom_title', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table84: {
    name: 'expense_projects',
    displayName: '지출 프로젝트 관리',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'name', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table85: {
    name: 'expense_employees',
    displayName: '지출 임직원 관리',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'name', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table86: {
    name: 'expense_departments',
    displayName: '지출 부서 관리',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'name', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table87: {
    name: 'expense_tags',
    displayName: '통합 공통 태그 관리',
    rowCount: 0,
    columnCount: 13,
    columns: ['id', '_version', 'name', 'scope', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table88: {
    name: 'expense_categories',
    displayName: '지출 계정과목 관리',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'main_category', 'mid_category', 'sub_category', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table89: {
    name: 'crm_governance_logs',
    displayName: 'AI 결재 및 데이터 거버넌스 감사록',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'doc_type', 'doc_id', 'doc_title', 'status', 'reason', 'operator', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table90: {
    name: 'expense_settings',
    displayName: '지출 예산 설정',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'monthly_budget', 'is_alert_enabled', 'alert_threshold_percent', 'alert_sms_template', 'alert_phone', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table91: {
    name: 'crm_expenses',
    displayName: '지출 내역',
    rowCount: 0,
    columnCount: 26,
    columns: ['id', '_version', 'title', 'category', 'amount', 'expense_date', 'payment_method', 'attachment_url', 'ai_analysis', 'memo', 'approval_status', 'approval_memo', 'approved_at', 'actual_expense_date', 'deduction_amount', 'transfer_fee', 'card_approval_no', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table92: {
    name: 'inventory_logs',
    displayName: '재고 변동 이력',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', '_version', 'itemId', 'itemName', 'itemType', 'changeType', 'quantity', 'price', 'operator', 'note', 'createdAt', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table93: {
    name: 'alert_logs',
    displayName: '가격 알림 발송 로그',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'log_id', 'rule_id', 'sent_price', 'sent_message', 'sent_at', 'api_response', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table94: {
    name: 'alert_rules',
    displayName: '가격 알림 규칙',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'rule_id', 'item_id', 'rule_name', 'condition_type', 'threshold_value', 'phone_number', 'sms_template', 'is_enabled', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table95: {
    name: 'price_histories',
    displayName: '수집 가격 이력',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'history_id', 'url_id', 'captured_price', 'captured_at', 'status', 'error_message', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table96: {
    name: 'target_urls',
    displayName: '가격 감시 URL',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', '_version', 'url_id', 'item_id', 'site_name', 'target_url', 'css_selector', 'xpath', 'cron_interval', 'is_active', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table97: {
    name: 'tracked_items',
    displayName: '가격 추적 품목',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'item_id', 'item_code', 'item_name', 'category', 'spec', 'base_price', 'target_margin_rate', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table98: {
    name: 'ai_token_usage_logs',
    displayName: 'AI 토큰 사용량 로그',
    rowCount: 9,
    columnCount: 18,
    columns: ['id', '_version', 'model', 'purpose', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'user_name', 'menu_path', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table99: {
    name: 'crm_inventory_inbound_items',
    displayName: '자율 입고 상세 품목',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'inbound_id', 'item_name', 'spec', 'quantity', 'price', 'barcode', 'matched_item_id', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table100: {
    name: 'crm_inventory_inbounds',
    displayName: '자율 입고 대장',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'partner_name', 'inbound_date', 'total_amount', 'pdf_file_path', 'file_hash', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table101: {
    name: 'inventory_items',
    displayName: '재고 품목',
    rowCount: 0,
    columnCount: 26,
    columns: ['id', '_version', 'type', 'name', 'category', 'price', 'partner', 'stock', 'safeStock', 'location', 'spec', 'unitType', 'unitValue', 'boxContains', 'description', 'tags', 'barcode', 'createdAt', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table102: {
    name: 'crm_partner_contacts',
    displayName: '거래처 담당자 명함첩',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'partner_id', 'name', 'position', 'phone', 'email', 'card_image_url', 'is_primary', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table103: {
    name: 'crm_snaptask_actions',
    displayName: '스냅태스크 AI 액션 감사록',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'task_id', 'action_type', 'description', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table104: {
    name: 'crm_snaptask_items',
    displayName: '스냅태스크 상세 내역',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'task_id', 'content_text', 'file_url', 'file_type', 'ai_analysis', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table105: {
    name: 'crm_snaptasks',
    displayName: '스냅태스크 관리',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'title', 'status', 'partner_id', 'created_at', 'updated_at', 'tenant_id', 'uuid', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table106: {
    name: 'crm_partners',
    displayName: '거래처 관리',
    rowCount: 0,
    columnCount: 27,
    columns: ['id', '_version', 'type', 'company_name', 'business_number', 'representative', 'phone', 'fax', 'manager_name', 'manager_phone', 'manager_position', 'manager_email', 'email', 'address', 'vip_level', 'credit_limit', 'business_license_url', 'memo', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table107: {
    name: 'crm_sales_orders',
    displayName: '수주서 관리',
    rowCount: 2,
    columnCount: 20,
    columns: ['id', '_version', 'estimate_id', 'client_order_no', 'customer_name', 'customer_phone', 'customer_manager', 'status', 'total_amount', 'delivery_date', 'order_date', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table108: {
    name: 'crm_purchase_orders',
    displayName: '발주서 관리',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'estimate_id', 'vendor_name', 'vendor_phone', 'status', 'total_amount', 'created_at', 'completed_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table109: {
    name: 'crm_estimate_items',
    displayName: '견적서 품목 상세',
    rowCount: 2,
    columnCount: 20,
    columns: ['id', '_version', 'estimate_id', 'product_id', 'item_code', 'product_name', 'spec', 'quantity', 'unit_price', 'amount', 'delivery_date', 'valid_item_code', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table110: {
    name: 'crm_estimates',
    displayName: '견적서 관리',
    rowCount: 2,
    columnCount: 23,
    columns: ['id', '_version', 'type', 'direction_status', 'partner_name', 'partner_phone', 'partner_manager', 'total_amount', 'file_url', 'business_license_url', 'ai_parsed', 'tags', 'created_at', 'uuid', 'sales_order_number', 'purchase_order_number', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table111: {
    name: 'crm_point_history',
    displayName: '적립금 내역',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'customer_id', 'transaction_type', 'amount', 'balance_after', 'description', 'related_entity_type', 'related_entity_id', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table112: {
    name: 'crm_coupons_restrictions',
    displayName: '쿠폰 제한 관리',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'coupon_id', 'restriction_type', 'target_type', 'target_value', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table113: {
    name: 'coupons',
    displayName: '쿠폰 관리',
    rowCount: 0,
    columnCount: 18,
    columns: ['id', '_version', 'code', 'name', 'discount_type', 'discount_value', 'min_order_amount', 'status', 'expires_at', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table114: {
    name: 'naver_blog_marketing_settings',
    displayName: '네이버 블로그 마케팅 설정',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'is_autopilot', 'autopilot_interval', 'autopilot_time', 'tone_style', 'naver_blog_id', 'api_client_id', 'api_client_secret', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table115: {
    name: 'crm_naver_blog_posts',
    displayName: '네이버 블로그 포스팅 이력 및 예약',
    rowCount: 0,
    columnCount: 22,
    columns: ['id', '_version', 'product_id', 'status', 'title', 'content', 'target_keywords', 'image_url', 'sub_image_url', 'scheduled_at', 'posted_at', 'error_message', 'views_count', 'likes_count', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table116: {
    name: 'instagram_marketing_settings',
    displayName: '인스타그램 마케팅 설정',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'is_autopilot', 'autopilot_interval', 'autopilot_time', 'tone_style', 'instagram_username', 'access_token', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table117: {
    name: 'crm_instagram_posts',
    displayName: '인스타그램 포스팅 이력 및 예약',
    rowCount: 0,
    columnCount: 19,
    columns: ['id', '_version', 'product_id', 'status', 'content', 'image_url', 'scheduled_at', 'posted_at', 'error_message', 'likes_count', 'comments_count', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table118: {
    name: 'crm_operators',
    displayName: '운영자 권한 관리',
    rowCount: 2,
    columnCount: 18,
    columns: ['id', '_version', 'username', 'password_hash', 'name', 'role', 'employee_number', 'phone', 'my_card_image_url', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table119: {
    name: 'system_settings',
    displayName: '시스템 설정',
    rowCount: 22,
    columnCount: 12,
    columns: ['id', '_version', 'key', 'value', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table120: {
    name: 'crm_deliveries',
    displayName: '배송 내역',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'customer_name', 'customer_phone', 'address', 'courier', 'tracking_number', 'status', 'order_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table121: {
    name: 'crm_reservations',
    displayName: '예약 내역',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'customer_name', 'customer_phone', 'service_name', 'reservation_date', 'reservation_time', 'status', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table122: {
    name: 'crm_payments',
    displayName: '결제 내역',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'customer_name', 'payment_method', 'amount', 'payment_date', 'status', 'order_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table123: {
    name: 'crm_orders',
    displayName: '주문 내역',
    rowCount: 0,
    columnCount: 22,
    columns: ['id', '_version', 'customer_name', 'customer_phone', 'product_name', 'quantity', 'total_price', 'delivery_method', 'shipping_address', 'tracking_number', 'attachment_url', 'customer_memo', 'order_date', 'status', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table124: {
    name: 'crm_transactions',
    displayName: '거래 내역',
    rowCount: 0,
    columnCount: 17,
    columns: ['id', '_version', 'customer_name', 'customer_phone', 'product_name', 'amount', 'order_date', 'status', 'order_id', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table125: {
    name: 'products',
    displayName: '광고 상품',
    rowCount: 0,
    columnCount: 21,
    columns: ['id', '_version', 'name', 'price', 'url', 'description', 'main_image_url', 'detail_image_url', 'available_methods', 'category', 'menu_category', 'is_coupon_excludable', 'is_estimate_price', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
  } as TableDefinition,
  table126: {
    name: 'ad_templates',
    displayName: '광고 템플릿',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'name', 'header', 'footer', 'opt_out', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table127: {
    name: 'message_logs',
    displayName: '발송 내역',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'customer_id', 'phone', 'message', 'status', 'created_at', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table128: {
    name: 'message_templates',
    displayName: '문자 템플릿',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'title', 'content', 'tenant_id', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by']
  } as TableDefinition,
  table129: {
    name: 'crm_customers',
    displayName: '고객 명단',
    rowCount: 0,
    columnCount: 21,
    columns: ['id', '_version', 'name', 'phone', 'email', 'tags', 'memo', 'address', 'shipping_address', 'recipient_name', 'recipient_phone', 'point_balance', 'created_at', 'uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'tenant_id']
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
  table1: 'crm_company_event_types',
  table2: 'crm_operator_projects',
  table3: 'crm_operator_job_history',
  table4: 'crm_operator_families',
  table5: 'crm_operator_reputations',
  table6: 'crm_operator_incidents',
  table7: 'crm_operator_medical',
  table8: 'crm_operator_family_events',
  table9: 'crm_operator_awards',
  table10: 'crm_operator_promotions',
  table11: 'crm_operator_salaries',
  table12: 'crm_operator_careers',
  table13: 'crm_operator_licenses',
  table14: 'crm_operator_education',
  table15: 'crm_company_events',
  table16: 'crm_operator_leave_balances',
  table17: 'crm_annual_leaves',
  table18: 'crm_attendance',
  table19: 'import_finance',
  table20: 'import_items',
  table21: 'import_master',
  table22: 'crm_inbound_excel_signatures',
  table23: 'crm_excel_signatures',
  table24: 'crm_interpretation_logs',
  table25: 'crm_interpretation_sessions',
  table26: 'easybot_rules_history',
  table27: 'easybot_rules',
  table28: 'crm_credential_audit_logs',
  table29: 'crm_credential_emergency_requests',
  table30: 'crm_credential_vault',
  table31: 'rnd_compliance_alarms',
  table32: 'rnd_logs',
  table33: 'rnd_spaces',
  table34: 'rnd_staffs',
  table35: 'rnd_centers',
  table36: 'crm_facility_predictive_part_rul',
  table37: 'crm_facility_predictive_fft',
  table38: 'crm_facility_predictive_vibration',
  table39: 'crm_facility_predictive_summary',
  table40: 'crm_facility_repair_solutions',
  table41: 'crm_facility_repair_logs',
  table42: 'crm_facility_checklists',
  table43: 'crm_facilities',
  table44: 'crm_quality_vision_logs',
  table45: 'crm_quality_vision_model',
  table46: 'crm_quality_spc_features',
  table47: 'crm_quality_spc_predictions',
  table48: 'crm_quality_spc_samples',
  table49: 'crm_quality_spc_config',
  table50: 'crm_quality_sensors_timeline',
  table51: 'crm_quality_sensors_contribution',
  table52: 'crm_quality_sensors_status',
  table53: 'crm_quality_ncr_similar_cases',
  table54: 'crm_quality_ncr_items',
  table55: 'crm_quality_checklist_submissions',
  table56: 'crm_grant_company_profile',
  table57: 'crm_grant_rnd_plans',
  table58: 'crm_grant_bookmarks',
  table59: 'crm_grant_announcements',
  table60: 'crm_recruitment_applicants',
  table61: 'crm_financial_analysis_logs',
  table62: 'crm_financial_statement_items',
  table63: 'crm_financial_statements',
  table64: 'safety_inspect_logs',
  table65: 'safety_near_misses',
  table66: 'safety_tbm_logs',
  table67: 'safety_risk_assessments',
  table68: 'safety_policies',
  table69: 'crm_partner_ai_reports',
  table70: 'easybot_action_audit_logs',
  table71: 'crm_web_published_sites',
  table72: 'crm_web_form_logs',
  table73: 'crm_web_templates',
  table74: 'crm_employment_certificate_logs',
  table75: 'form_mappings',
  table76: 'form_templates',
  table77: 'ai_contextual_help',
  table78: 'crm_meeting_tasks',
  table79: 'crm_meetings',
  table80: 'crm_deadstock_proposals',
  table81: 'system_mail_logs',
  table82: 'system_menu_settings',
  table83: 'shared_dashboards',
  table84: 'expense_projects',
  table85: 'expense_employees',
  table86: 'expense_departments',
  table87: 'expense_tags',
  table88: 'expense_categories',
  table89: 'crm_governance_logs',
  table90: 'expense_settings',
  table91: 'crm_expenses',
  table92: 'inventory_logs',
  table93: 'alert_logs',
  table94: 'alert_rules',
  table95: 'price_histories',
  table96: 'target_urls',
  table97: 'tracked_items',
  table98: 'ai_token_usage_logs',
  table99: 'crm_inventory_inbound_items',
  table100: 'crm_inventory_inbounds',
  table101: 'inventory_items',
  table102: 'crm_partner_contacts',
  table103: 'crm_snaptask_actions',
  table104: 'crm_snaptask_items',
  table105: 'crm_snaptasks',
  table106: 'crm_partners',
  table107: 'crm_sales_orders',
  table108: 'crm_purchase_orders',
  table109: 'crm_estimate_items',
  table110: 'crm_estimates',
  table111: 'crm_point_history',
  table112: 'crm_coupons_restrictions',
  table113: 'coupons',
  table114: 'naver_blog_marketing_settings',
  table115: 'crm_naver_blog_posts',
  table116: 'instagram_marketing_settings',
  table117: 'crm_instagram_posts',
  table118: 'crm_operators',
  table119: 'system_settings',
  table120: 'crm_deliveries',
  table121: 'crm_reservations',
  table122: 'crm_payments',
  table123: 'crm_orders',
  table124: 'crm_transactions',
  table125: 'products',
  table126: 'ad_templates',
  table127: 'message_logs',
  table128: 'message_templates',
  table129: 'crm_customers'
} as const;
