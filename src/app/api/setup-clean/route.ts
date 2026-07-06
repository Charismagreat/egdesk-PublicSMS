export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { listTables, executeSQL } from '../../../../egdesk-helpers';

export async function GET() {
  try {
    // 1. 실제 테이블 목록 조회 (존재 여부 확인용)
    const tablesRes = await listTables();
    const activeTablesSet = new Set((tablesRes.tables || []).map((t: any) => t.tableName || t.name));

    // 2. 비즈니스 샘플 데이터가 적재되는 테이블 명단 정의
    const tablesToClean = [
      'crm_customers',
      'message_templates',
      'message_logs',
      'ad_templates',
      'products',
      'crm_transactions',
      'crm_orders',
      'crm_payments',
      'crm_reservations',
      'crm_deliveries',
      'crm_instagram_posts',
      'crm_naver_blog_posts',
      'coupons',
      'crm_coupons_restrictions',
      'crm_point_history',
      'crm_estimates',
      'crm_estimate_items',
      'crm_purchase_orders',
      'crm_sales_orders',
      'crm_partners',
      'crm_partner_contacts',
      'crm_snaptasks',
      'crm_snaptask_items',
      'crm_snaptask_actions',
      'inventory_items',
      'crm_inventory_inbounds',
      'crm_inventory_inbound_items',
      'ai_token_usage_logs',
      'tracked_items',
      'target_urls',
      'price_histories',
      'alert_rules',
      'alert_logs',
      'inventory_logs',
      'crm_expenses',
      'expense_departments',
      'expense_employees',
      'expense_projects',
      'shared_dashboards',
      'system_mail_logs',
      'crm_employment_certificate_logs',
      'crm_web_form_logs',
      'easybot_action_audit_logs',
      'safety_policies',
      'safety_risk_assessments',
      'safety_tbm_logs',
      'safety_near_misses',
      'safety_inspect_logs',
      'crm_financial_statements',
      'crm_recruitment_applicants',
      'crm_grant_announcements',
      'crm_grant_bookmarks',
      'crm_grant_rnd_plans',
      'crm_grant_company_profile',
      'crm_quality_checklist_submissions',
      'crm_quality_ncr_items',
      'crm_quality_ncr_similar_cases',
      'crm_quality_sensors_status',
      'crm_quality_sensors_contribution',
      'crm_quality_sensors_timeline',
      'crm_quality_spc_config',
      'crm_quality_spc_predictions',
      'crm_quality_spc_features',
      'crm_quality_spc_samples',
      'crm_quality_vision_model',
      'crm_quality_vision_logs',
      'crm_facilities',
      'crm_facility_checklists',
      'crm_facility_repair_logs',
      'crm_facility_repair_solutions',
      'crm_facility_predictive_summary',
      'crm_facility_predictive_vibration',
      'crm_facility_predictive_fft',
      'crm_facility_predictive_part_rul',
      'rnd_centers',
      'rnd_staffs',
      'rnd_spaces',
      'rnd_logs',
      'rnd_compliance_alarms',
      'crm_credential_vault',
      'crm_credential_emergency_requests',
      'crm_credential_audit_logs',
      'crm_attendance',
      'crm_annual_leaves',
      'crm_operator_leave_balances',
      'crm_company_events',
      'crm_company_event_types',
      'crm_operator_contract_settings',
      'crm_operator_profiles',
      'crm_operator_salaries',
      'crm_operator_careers',
      'crm_operator_licenses',
      'crm_operator_education',
      'crm_operator_families',
      'crm_operator_job_history',
      'crm_operator_promotions',
      'crm_operator_projects',
      'crm_operator_reputations',
      'crm_operator_incidents',
      'crm_operator_medical',
      'crm_operator_awards',
      'crm_operator_ai_briefing_histories',
      'crm_facility_events',
      'crm_facility_layout',
      'crm_facility_oee_downtime',
      'crm_facility_oee_stats',
      'crm_facility_parts',
      'crm_energy_equipments',
      'crm_energy_savings',
      'crm_finance_forecasts',
      'crm_finance_products',
      'crm_labor_contracts',
      'crm_labor_stats',
      'crm_meetings',
      'crm_operator_family_events',
      'crm_partner_credit_risks',
      'crm_production_bottlenecks',
      'crm_production_due_risk',
      'crm_production_gantt_tasks',
      'crm_production_unscheduled_orders',
      'crm_safety_alerts',
      'crm_safety_zones',
      'crm_scm_shipments',
      'crm_scm_suppliers',
      'exchange_rate_histories',
      'exchange_rates',
      'pms_projects',
      'user_feedbacks'
    ];

    // 3. 각 테이블의 모든 데이터 삭제 및 AUTOINCREMENT 시퀀스 초기화 (순차 비동기)
    for (const table of tablesToClean) {
      if (activeTablesSet.has(table)) {
        await executeSQL(`DELETE FROM "${table}"`);
        await executeSQL(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
        console.log(`Cleared and reset index for table: ${table}`);
      }
    }

    // 4. crm_operators 테이블에서 최고관리자(admin) 계정 제외한 나머지 일괄 삭제
    if (activeTablesSet.has('crm_operators')) {
      await executeSQL("DELETE FROM crm_operators WHERE username != 'admin'");
      console.log("Cleared non-admin accounts from crm_operators.");
    }

    // 5. 마케팅/포인트 필수 설정(ID=1)을 제외한 환경설정 레코드 정리
    const settingsTables = ['instagram_marketing_settings', 'naver_blog_marketing_settings', 'expense_settings'];
    for (const st of settingsTables) {
      if (activeTablesSet.has(st)) {
        await executeSQL(`DELETE FROM "${st}" WHERE id != 1`);
        console.log(`Cleared ID!=1 rows from ${st}.`);
      }
    }

    return NextResponse.json({
      success: true,
      message: '클린 데이터베이스 초기화가 완료되었습니다. 최고관리자(admin) 및 시스템 필수 설정을 제외한 모든 비즈니스 샘플 데이터가 성공적으로 소멸되었습니다. ✨'
    });
  } catch (error: any) {
    console.error('Clean Database Initialization Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
