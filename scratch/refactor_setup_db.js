const fs = require('fs');
const path = require('path');

async function run() {
  const setupDbPath = path.join(__dirname, '../src/lib/setup-db.ts');
  
  if (!fs.existsSync(setupDbPath)) {
    console.error('setup-db.ts not found at:', setupDbPath);
    process.exit(1);
  }

  let content = fs.readFileSync(setupDbPath, 'utf8');

  // 1. 최상단에 임포트 주입
  const importStatement = "import { TABLES, COLUMN_DEFINITIONS, TableName } from '../../egdesk.schema';\n";
  if (!content.includes('COLUMN_DEFINITIONS')) {
    content = importStatement + content;
  }

  // 2. 시작점과 끝점 찾기
  const startKeyword = "console.log('Starting database setup for egdesk-FreeSMS...');";
  const endKeyword = "// 54. 수입 통관 실제 레퍼런스 데이터 시딩 (ERP 검증용 1건)";

  const startIdx = content.indexOf(startKeyword);
  const endIdx = content.indexOf(endKeyword);

  if (startIdx === -1) {
    console.error(`Could not find start keyword: "${startKeyword}"`);
    process.exit(1);
  }
  if (endIdx === -1) {
    console.error(`Could not find end keyword: "${endKeyword}"`);
    process.exit(1);
  }

  const beforeText = content.slice(0, startIdx + startKeyword.length);
  const afterText = content.slice(endIdx);

  // 3. 교체할 동적 생성 루프 코드 정의
  const dynamicLoopCode = `\n\n  // TABLES와 COLUMN_DEFINITIONS를 순회하며 동적으로 테이블 물리적 자동 생성 및 마이그레이션\n` +
    `  for (const tableKey of Object.keys(TABLES) as TableName[]) {\n` +
    `    const tableMeta = TABLES[tableKey];\n` +
    `    const columns = COLUMN_DEFINITIONS[tableKey];\n` +
    `    const options: any = {\n` +
    `      tableName: tableMeta.name,\n` +
    `    };\n` +
    `    if ((tableMeta as any).uniqueKeyColumns) {\n` +
    `      options.uniqueKeyColumns = (tableMeta as any).uniqueKeyColumns;\n` +
    `    }\n` +
    `    if ((tableMeta as any).duplicateAction) {\n` +
    `      options.duplicateAction = (tableMeta as any).duplicateAction;\n` +
    `    }\n` +
    `    await safeCreateTable(tableMeta.displayName, columns as any[], options);\n` +
    `  }\n\n  `;

  const finalContent = beforeText + dynamicLoopCode + afterText;

  fs.writeFileSync(setupDbPath, finalContent, 'utf8');
  console.log('Successfully refactored setup-db.ts with dynamic creation loop!');
}

run().catch(console.error);
