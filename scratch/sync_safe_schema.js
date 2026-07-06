// 동적으로 로컬 API 환경 변수 강제 매핑 (dotenv Fallback)
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';
process.env.NEXT_PUBLIC_EGDESK_API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

const { createTable } = require('../egdesk-helpers.js');

const EXPENSE_PROJECTS_COLS = [
  { name: 'id', type: 'TEXT', notNull: true },
  { name: 'name', type: 'TEXT', notNull: true },
  { name: 'created_at', type: 'TEXT', notNull: true },
  { name: 'uuid', type: 'TEXT' },
  { name: 'updated_at', type: 'TEXT' },
  { name: 'updated_by', type: 'TEXT' },
  { name: 'deleted_at', type: 'TEXT' },
  { name: 'deleted_by', type: 'TEXT' },
  { name: 'restored_at', type: 'TEXT' },
  { name: 'restored_by', type: 'TEXT' }
];

async function runSync() {
  console.log('=== [Sync Safe Schema] Registering expense_projects columns to egdesk MCP... ===');
  try {
    // createTable은 이지데스크 본체 백엔드 서버의 스키마 레지스트리를 정식으로 갱신 등록합니다.
    await createTable('지출 프로젝트 관리', EXPENSE_PROJECTS_COLS, {
      tableName: 'expense_projects',
      uniqueKeyColumns: ['id']
    });
    console.log('--- METADATA SYNC SUCCESS ---');
  } catch (e) {
    console.error('--- METADATA SYNC FAILED ---', e.message);
  }
}

runSync();
