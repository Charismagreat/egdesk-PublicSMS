const { createTable, queryTable, insertRows, updateRows, deleteRows, deleteTable } = require('../egdesk-helpers');

async function run() {
  console.log('RND 테이블 생성을 수동으로 시작합니다...');

  const safeCreateTable = async (displayName, columns, options) => {
    try {
      await createTable(displayName, columns, options);
      console.log(`Table "${options.tableName}" created/verified.`);
    } catch (e) {
      if (e.message.includes('UNIQUE constraint failed') || e.message.includes('table_name')) {
        console.log(`Table metadata mismatch for "${options.tableName}". Recreating...`);
        try {
          await deleteTable(options.tableName);
          await createTable(displayName, columns, options);
          console.log(`Table "${options.tableName}" recreated.`);
        } catch (recreateErr) {
          console.error(`Failed to recreate "${options.tableName}":`, recreateErr.message);
        }
      } else {
        console.error(`Error creating "${options.tableName}":`, e.message);
      }
    }
  };

  // 1. rnd_centers
  await safeCreateTable('기업부설연구소 기본 정보', [
    { name: 'center_id', type: 'INTEGER', notNull: true },
    { name: 'company_id', type: 'INTEGER', notNull: true },
    { name: 'center_name', type: 'TEXT', notNull: true },
    { name: 'center_type', type: 'TEXT', notNull: true },
    { name: 'established_date', type: 'TEXT', notNull: true },
    { name: 'koita_reg_number', type: 'TEXT' },
    { name: 'postal_code', type: 'TEXT', notNull: true },
    { name: 'address_road', type: 'TEXT', notNull: true },
    { name: 'address_detail', type: 'TEXT' },
    { name: 'total_area_sqm', type: 'REAL', notNull: true },
    { name: 'is_active', type: 'INTEGER', defaultValue: 1 }
  ], { tableName: 'rnd_centers', uniqueKeyColumns: ['center_id'] });

  // 2. rnd_staffs
  await safeCreateTable('연구원 정보 및 자격 정보', [
    { name: 'staff_id', type: 'INTEGER', notNull: true },
    { name: 'center_id', type: 'INTEGER', notNull: true },
    { name: 'user_id', type: 'INTEGER', notNull: true },
    { name: 'staff_role', type: 'TEXT', notNull: true },
    { name: 'employment_status', type: 'TEXT', defaultValue: 'ACTIVE' },
    { name: 'degree_level', type: 'TEXT', notNull: true },
    { name: 'major_name', type: 'TEXT', notNull: true },
    { name: 'major_category', type: 'TEXT', notNull: true },
    { name: 'graduation_cert_ocr_json', type: 'TEXT' },
    { name: 'qualification_status', type: 'TEXT', defaultValue: 'PENDING' },
    { name: 'joined_date', type: 'TEXT', notNull: true },
    { name: 'resigned_date', type: 'TEXT' }
  ], { tableName: 'rnd_staffs', uniqueKeyColumns: ['staff_id'] });

  // 3. rnd_spaces
  await safeCreateTable('연구 공간 자가 실사 및 Vision AI 분석 이력', [
    { name: 'space_check_id', type: 'INTEGER', notNull: true },
    { name: 'center_id', type: 'INTEGER', notNull: true },
    { name: 'check_date', type: 'TEXT', notNull: true },
    { name: 'image_url_entrance', type: 'TEXT', notNull: true },
    { name: 'image_url_layout', type: 'TEXT', notNull: true },
    { name: 'ai_analysis_result', type: 'TEXT' },
    { name: 'signage_status', type: 'TEXT', defaultValue: 'FAIL' },
    { name: 'partition_status', type: 'TEXT', defaultValue: 'PASS' },
    { name: 'overall_status', type: 'TEXT', defaultValue: '보완필요' },
    { name: 'inspector_notes', type: 'TEXT' },
    { name: 'created_at', type: 'TEXT' }
  ], { tableName: 'rnd_spaces', uniqueKeyColumns: ['space_check_id'] });

  // 4. rnd_logs
  await safeCreateTable('R&D 연구개발 일지 및 AI 생성 데이터', [
    { name: 'log_id', type: 'INTEGER', notNull: true },
    { name: 'center_id', type: 'INTEGER', notNull: true },
    { name: 'author_id', type: 'INTEGER', notNull: true },
    { name: 'work_date', type: 'TEXT', notNull: true },
    { name: 'raw_source', type: 'TEXT', notNull: true },
    { name: 'raw_content', type: 'TEXT' },
    { name: 'audio_file_url', type: 'TEXT' },
    { name: 'ai_generated_title', type: 'TEXT' },
    { name: 'ai_generated_content', type: 'TEXT' },
    { name: 'approval_status', type: 'TEXT', defaultValue: 'DRAFT' },
    { name: 'approver_id', type: 'INTEGER' },
    { name: 'approved_at', type: 'TEXT' },
    { name: 'blockchain_hash', type: 'TEXT' },
    { name: 'created_at', type: 'TEXT' },
    { name: 'updated_at', type: 'TEXT' }
  ], { tableName: 'rnd_logs', uniqueKeyColumns: ['log_id'] });

  // 5. rnd_compliance_alarms
  await safeCreateTable('규제 준수 모니터링 및 알림', [
    { name: 'alarm_id', type: 'INTEGER', notNull: true },
    { name: 'center_id', type: 'INTEGER', notNull: true },
    { name: 'category', type: 'TEXT', notNull: true },
    { name: 'severity', type: 'TEXT', defaultValue: 'INFO' },
    { name: 'message', type: 'TEXT', notNull: true },
    { name: 'due_date', type: 'TEXT' },
    { name: 'is_resolved', type: 'INTEGER', defaultValue: 0 },
    { name: 'resolved_at', type: 'TEXT' },
    { name: 'created_at', type: 'TEXT' }
  ], { tableName: 'rnd_compliance_alarms', uniqueKeyColumns: ['alarm_id'] });

  // Seeding
  try {
    const check = await queryTable('rnd_centers', {});
    if (!check.rows || check.rows.length === 0) {
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      
      await insertRows('rnd_centers', [{
        center_id: 1,
        company_id: 1,
        center_name: '이지데스크 지능형 소프트웨어 연구소',
        center_type: 'RESEARCH_CENTER',
        established_date: '2024-03-15',
        koita_reg_number: 'KOITA-2024-8899',
        postal_code: '06159',
        address_road: '서울특별시 강남구 테헤란로 427',
        address_detail: '삼정빌딩 12층 1205호',
        total_area_sqm: 45.50,
        is_active: 1
      }]);

      await insertRows('rnd_staffs', [
        { staff_id: 1, center_id: 1, user_id: 2, staff_role: 'DIRECTOR', employment_status: 'ACTIVE', degree_level: 'DOCTOR', major_name: '컴퓨터공학과', major_category: 'ENGINEERING', qualification_status: 'QUALIFIED', joined_date: '2024-03-15' },
        { staff_id: 2, center_id: 1, user_id: 3, staff_role: 'RESEARCHER', employment_status: 'ACTIVE', degree_level: 'MASTER', major_name: '수학과', major_category: 'NATURAL_SCIENCE', qualification_status: 'QUALIFIED', joined_date: '2024-03-15' },
        { staff_id: 3, center_id: 1, user_id: 4, staff_role: 'RESEARCHER', employment_status: 'ACTIVE', degree_level: 'BACHELOR', major_name: '정보통신공학과', major_category: 'ENGINEERING', qualification_status: 'QUALIFIED', joined_date: '2024-05-01' },
        { staff_id: 4, center_id: 1, user_id: 6, staff_role: 'ASSISTANT', employment_status: 'ACTIVE', degree_level: 'ASSOCIATE', major_name: '컴퓨터소프트웨어과', major_category: 'ENGINEERING', qualification_status: 'QUALIFIED', joined_date: '2025-01-10' }
      ]);

      await insertRows('rnd_spaces', [{
        space_check_id: 1,
        center_id: 1,
        check_date: '2026-03-08',
        image_url_entrance: '/images/rnd/entrance_good.jpg',
        image_url_layout: '/images/rnd/layout_need_improvement.jpg',
        ai_analysis_result: JSON.stringify({
          signage_detected: true, signage_text: "기업부설연구소", partition_detected: true, estimated_partition_height_m: 1.05, mixed_staff_detected: false,
          notes: "출입구 현판은 명확히 부착되어 있으나, 내부 파티션의 높이가 약 1.05m로 추정되어 기준치 1.2m에 소폭 미달합니다."
        }),
        signage_status: 'PASS', partition_status: 'FAIL', overall_status: '보완필요', inspector_notes: '파티션 높이 보완(1.2m 이상 파티션 추가 덧대기) 조치 후 재점검 필요.', created_at: nowStr
      }]);

      await insertRows('rnd_logs', [
        {
          log_id: 1, center_id: 1, author_id: 2, work_date: '2026-06-05', raw_source: 'GITHUB',
          raw_content: 'Commit: feat(auth): OAuth2.0 소셜 로그인 연동 모듈 최적화 및 카카오 로그인 예외처리 보정',
          ai_generated_title: 'OAuth2.0 소셜 로그인 모듈 연동 및 예외 처리 성능 개선',
          ai_generated_content: '1. 연구 배경: 다중 소셜 로그인 인프라 구축 시 발생하는 토큰 갱신 병목 및 특정 벤더(카카오)의 null API 응답 대응 방안 연구.\n2. 실험 방법: 네트워크 요청 타임아웃을 2.5초로 튜닝하고, 커스텀 미들웨어를 구축하여 비정상 세션의 토큰 클렌징 알고리즘 수립.\n3. 결과 분석: 예외 처리 로직 적용 후 비정상 로그아웃 비율이 기존 대비 94% 감소하였으며, 세션 동기화 안정성 확보.\n4. 향후 계획: 모바일 웹뷰 환경에서의 하이브리드 토큰 전달 성능 테스트 실시.',
          approval_status: 'APPROVED', approver_id: 1, approved_at: nowStr, blockchain_hash: '1a2b3c4d5e6f7g8h9i0j9k8l7m6n5o4p3q2r1s0t9u8v7w6x5y4z3a2b1c0d9e8f', created_at: nowStr, updated_at: nowStr
        },
        {
          log_id: 2, center_id: 1, author_id: 3, work_date: '2026-06-08', raw_source: 'VOICE',
          raw_content: '음성 입력: 오늘 공간 적격성 자동 판단을 위한 비전 AI 모델을 튜닝했는데 요로 버전8 바운딩박스 아이오유 임계치를 0.5에서 0.6으로 바꾸면서 정밀도가 개선되는지 테스트를 진행했어.',
          ai_generated_title: 'YOLOv8 모델 바운딩 박스 임계치 튜닝을 통한 공간 적격성 판별 정밀도 향상 실험',
          ai_generated_content: '1. 연구 배경: Vision AI 기반 사무 공간 물적 독립성 판별 시 인접 파티션과의 중첩에 따른 오탐지율 최소화 연구.\n2. 실험 방법: Object Detection(YOLOv8) 모델의 Bounding Box IoU(Intersection over Union) 임계값 설정을 0.5에서 0.65까지 0.05 단위로 변화시키며 정밀도(Precision)와 재현율(Recall) 분석.\n3. 결과 분석: 임계치를 0.60으로 상향 시 파티션 경계부의 오검출율이 18.2% 감소하였으며, 전체 Map@50 성능이 3.4% 향상됨을 확인.\n4. 향후 계획: 파티션 높이의 정량적 센티미터 추정을 위한 앵커 개체(책상 높이 등) 매핑 3D depth 알고리즘 보완.',
          approval_status: 'PENDING', created_at: nowStr, updated_at: nowStr
        }
      ]);

      await insertRows('rnd_compliance_alarms', [{
        alarm_id: 1, center_id: 1, category: 'SPACE_CHECK', severity: 'WARNING',
        message: '기업부설연구소 물적 독립 공간 자가진단 주기(분기 1회)가 90일을 초과하였습니다. 신속히 자가진단 카메라를 가동하여 촬영 이미지를 분석해 주세요.',
        due_date: '2026-06-30', is_resolved: 0, created_at: nowStr
      }]);

      console.log('✓ RND Seeding 완료!');
    }
  } catch (err) {
    console.error('Seeding error:', err.message);
  }

  console.log('모든 작업 완료!');
}

run().catch(console.error);
