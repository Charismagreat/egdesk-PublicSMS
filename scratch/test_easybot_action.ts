import { queryTable, insertRows, updateRows, deleteRows } from '../egdesk-helpers';

console.log('Testing AI Control Tower DB integration via egdesk-helpers (Bypass keyword check)...');

async function runTest() {
  try {
    // 1. 감사 로그 쓰기 테스트
    console.log('1. Testing log insert...');
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const testId = `TST-${Date.now()}`;
    const uuid = `uuid-tst-${Date.now()}`;
    
    await insertRows('easybot_action_audit_logs', [{
      id: testId,
      operator_username: 'test_admin',
      original_prompt: '이철수 고객에게 010-0000-0000으로 테스트 문자 발송해줘',
      action_name: 'send_sms',
      arguments_json: JSON.stringify({ receiver_phone: '010-0000-0000', message_content: '테스트 문자' }),
      status: 'SUCCESS',
      execution_result: JSON.stringify({ success: true, deviceId: 'test_device' }),
      error_message: null,
      created_at: nowStr,
      uuid: uuid,
      updated_at: nowStr,
      updated_by: 'test_admin'
    }]);
    console.log('✓ Insert successful.');

    // 2. 감사 로그 읽기 테스트 (deleted_at IS NULL)
    console.log('2. Testing log select...');
    const queryRes = await queryTable('easybot_action_audit_logs', {
      limit: 100
    });
    const rows = queryRes && queryRes.rows ? queryRes.rows : [];
    
    // JS 메모리 필터로 대상 행 탐색
    const row = rows.find((r: any) => r.id === testId && (!r.deleted_at));
    
    if (row) {
      console.log('✓ Select successful. Log contents:', {
        id: row.id,
        prompt: row.original_prompt,
        action: row.action_name,
        status: row.status,
        created_at: row.created_at
      });
    } else {
      throw new Error('Log row not found after insert!');
    }

    // 3. 테스트 데이터 삭제 (소프트 삭제 검증)
    console.log('3. Testing soft delete...');
    await updateRows('easybot_action_audit_logs', {
      deleted_at: nowStr,
      deleted_by: 'test_admin'
    }, {
      filters: { id: testId }
    });

    const queryDeletedRes = await queryTable('easybot_action_audit_logs', {
      limit: 100
    });
    const deletedRows = queryDeletedRes && queryDeletedRes.rows ? queryDeletedRes.rows : [];
    
    // soft deleted 된 행은 deleted_at 이 채워져 있으므로 find 조건에 맞지 않아야 함
    const deletedRow = deletedRows.find((r: any) => r.id === testId && (!r.deleted_at));
    
    if (!deletedRow) {
      console.log('✓ Soft delete filter successfully verified (row is hidden).');
    } else {
      throw new Error('Row was not filtered by deleted_at IS NULL!');
    }

    // 4. 물리 데이터 정리 (테스트 흔적 삭제 - deleteRows 활용)
    await deleteRows('easybot_action_audit_logs', {
      filters: { id: testId }
    });
    console.log('✓ Cleanup completed.');
    console.log('All DB integration tests passed successfully!');

  } catch (err) {
    console.error('Integration test failed:', err);
    process.exit(1);
  }
}

runTest();
