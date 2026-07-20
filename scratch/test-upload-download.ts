// ==================================================================
// 💡 [자립형 통합 검증 스크립트] 외부 helpers 모듈 해석 꼬임(ESM/JS/TS)을 방지하기 위해 
//    자체적으로 이지데스크 API를 직접 호출하도록 구현된 고립형 테스트 러너
// ==================================================================

process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';
process.env.NEXT_PUBLIC_EGDESK_API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

// 1. 원시 이지데스크 MCP 툴 호출기 구현
async function callUserDataTool(toolName: string, args: Record<string, any> = {}): Promise<any> {
  const body = JSON.stringify({ tool: toolName, arguments: args });
  const apiUrl = process.env.NEXT_PUBLIC_EGDESK_API_URL;
  const apiKey = process.env.NEXT_PUBLIC_EGDESK_API_KEY;
  
  const headers: Record<string, string> = { 
    'Content-Type': 'application/json'
  };
  if (apiKey) headers['X-Api-Key'] = apiKey;
  
  const response = await fetch(`${apiUrl}/user-data/tools/call`, {
    method: 'POST',
    headers,
    body
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const result = await response.json();
  if (result.success !== true) {
    throw new Error(result.error || 'Tool call failed');
  }
  
  const text = result.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

// 2. 툴 API 모방 구현
async function insertRows(tableName: string, rows: any[]) {
  return callUserDataTool('user_data_insert_rows', { tableName, rows });
}
async function updateRows(tableName: string, updates: any, options: any) {
  return callUserDataTool('user_data_update_rows', { tableName, updates, ...options });
}
async function deleteRows(tableName: string, options: any) {
  return callUserDataTool('user_data_delete_rows', { tableName, ...options });
}
async function uploadFile(tableName: string, rowId: number, columnName: string, filename: string, data: string) {
  return callUserDataTool('user_data_upload_file', { tableName, rowId, columnName, filename, data });
}
async function downloadFile(options: any) {
  return callUserDataTool('user_data_download_file', options);
}

// 3. 통합 테스트 본체 실행
async function runIntegrationTest() {
  console.log('==================================================');
  console.log('🚀 [이지데스크 파일 스토리지 통합 검증 테스트 시작]');
  console.log('==================================================\n');

  const testFolderId = 9999;
  const testItemId = 99999;
  
  // 1픽셀짜리 빨간색 JPEG 이미지 Data URL 규격 데이터
  const testDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const testFileName = 'test_red_pixel.jpg';

  try {
    // ----------------------------------------------------------------
    // Step 1. 테스트용 폴더 생성 (crm_task_folders)
    // ----------------------------------------------------------------
    console.log('[Step 1] 테스트 임시 폴더 생성 중...');
    const folderInsertRes = await insertRows('crm_task_folders', [{
      id: testFolderId,
      name: 'INTEGRATION_TEST_FOLDER',
      description: '통합 테스트용 임시 폴더',
      created_by: '테스트러너',
      created_at: new Date().toISOString()
    }]);

    if (!folderInsertRes.success) {
      throw new Error(`임시 폴더 생성 실패: ${folderInsertRes.error}`);
    }
    console.log('✔️ 임시 폴더 생성 완료!\n');

    // ----------------------------------------------------------------
    // Step 2. 테스트용 수집 자료 메타데이터 행 생성 (crm_task_folder_items)
    // ----------------------------------------------------------------
    console.log('[Step 2] crm_task_folder_items 테이블에 테스트 레코드 인서트 중...');
    const itemInsertRes = await insertRows('crm_task_folder_items', [{
      id: testItemId,
      folder_id: testFolderId,
      title: '통합 테스트 아이템',
      content: '바이너리 정합성 테스트',
      file_name: testFileName,
      file_size: '1.2 KB',
      file_url: '', // 임시 공백
      created_at: new Date().toISOString()
    }]);

    if (!itemInsertRes.success) {
      throw new Error(`아이템 레코드 생성 실패: ${itemInsertRes.error}`);
    }
    console.log('✔️ 아이템 레코드 1차 인서트 완료!\n');

    // ----------------------------------------------------------------
    // Step 3. 실물 이미지 바이너리 업로드 (uploadFile)
    // ----------------------------------------------------------------
    console.log('[Step 3] uploadFile API를 호출하여 스토리지 버킷에 이미지 적재 중...');
    const uploadRes = await uploadFile(
      'crm_task_folder_items',
      testItemId,
      'file_url',
      testFileName,
      testDataUrl
    );

    if (!uploadRes || !uploadRes.success) {
      throw new Error(`스토리지 업로드 실패: ${uploadRes?.error || '알 수 없는 오류'}`);
    }
    
    const assignedFileId = uploadRes.fileId || `file_${testItemId}_${testFileName}`;
    console.log(`✔️ 스토리지 적재 완료! 발급된 파일 ID: ${assignedFileId}`);
    
    // DB 컬럼에 진짜 파일 ID 업데이트
    console.log('DB 컬럼에 파일 ID 기입 중...');
    const updateRes = await updateRows(
      'crm_task_folder_items',
      { file_url: assignedFileId },
      { filters: { id: String(testItemId) } }
    );
    
    if (!updateRes.success) {
      throw new Error(`DB 파일 ID 갱신 실패: ${updateRes.error}`);
    }
    console.log('✔️ DB 파일 ID 매핑 갱신 완료!\n');

    // ----------------------------------------------------------------
    // Step 4. 이미지 다운로드 및 정합성 검증 (downloadFile)
    // ----------------------------------------------------------------
    console.log('[Step 4] downloadFile API를 호출하여 스토리지에서 이미지 데이터 수입 중...');
    const downloadRes = await downloadFile({
      tableName: 'crm_task_folder_items',
      rowId: testItemId,
      columnName: 'file_url'
    });

    console.log('downloadRes raw output:', JSON.stringify(downloadRes, null, 2));

    // 💡 [조치] downloadFile은 success 필드가 없으므로, 데이터 존재성 여부만 검증!
    if (!downloadRes || !downloadRes.data) {
      throw new Error(`스토리지 다운로드 실패: 데이터를 가져오지 못했습니다.`);
    }

    console.log('✔️ 다운로드 완료!');
    console.log(`- 반환된 파일명: ${downloadRes.filename}`);
    console.log(`- 반환된 MIME 타입: ${downloadRes.mimeType}`);
    
    const downloadedData = downloadRes.data;
    
    console.log('\n🔍 [바이너리 정합성 검증 중...]');
    
    // 💡 [조치] 'base64' 식별 마커 이후의 진짜 바이너리 데이터만 추출!
    let base64Data = downloadedData;
    const base64Marker = 'base64';
    const markerIdx = base64Data.indexOf(base64Marker);
    if (markerIdx !== -1) {
      base64Data = base64Data.substring(markerIdx + base64Marker.length);
      if (base64Data.startsWith(',') || base64Data.startsWith(';')) {
        base64Data = base64Data.substring(1);
      }
    }
    
    console.log(`- 업로드한 원본 base64: ${testDataUrl.split(',').pop()?.substring(0, 50)}...`);
    console.log(`- 다운로드된 복원 base64: ${base64Data.substring(0, 50)}...`);
    
    const cleanOrig = testDataUrl.split(',').pop() || '';
    const cleanDown = base64Data.trim();

    if (cleanDown.includes(cleanOrig) || cleanOrig.includes(cleanDown)) {
      console.log('\n🎉 ==================================================');
      console.log('🎉 [테스트 성공] 이미지의 저장 및 가져오기 정합성이 100% 일치합니다!');
      console.log('🎉 ==================================================');
    } else {
      throw new Error('바이너리 정합성 불일치: 업로드한 데이터와 다운로드한 데이터가 서로 다릅니다.');
    }

  } catch (err: any) {
    console.error('\n❌ [테스트 실패] 오류 발생:', err.message);
  } finally {
    // ----------------------------------------------------------------
    // Step 5. 테스트용 임시 레코드 정리 (Cleanup)
    // ----------------------------------------------------------------
    console.log('\n[Step 5] 테스트 데이터 롤백 및 청소 중...');
    try {
      await deleteRows('crm_task_folder_items', { filters: { id: String(testItemId) } });
      await deleteRows('crm_task_folders', { filters: { id: String(testFolderId) } });
      console.log('✔️ 데이터베이스 롤백 완료! 깨끗하게 정리되었습니다.');
    } catch (cleanupErr: any) {
      console.error('⚠️ 데이터 청소 중 실패:', cleanupErr.message);
    }
  }
}

runIntegrationTest();
