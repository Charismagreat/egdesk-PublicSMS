const fs = require('fs');
const path = require('path');

async function run() {
  const setupDbPath = path.join(__dirname, '../src/lib/setup-db.ts');
  const schemaPath = path.join(__dirname, '../egdesk.schema.ts');

  if (!fs.existsSync(setupDbPath)) {
    console.error('setup-db.ts not found at:', setupDbPath);
    process.exit(1);
  }

  let content = fs.readFileSync(setupDbPath, 'utf8');

  // 1. safeCreateTable 호출 부분들을 문자열 단위로 정밀 추출
  const calls = [];
  let searchIdx = 0;
  while (true) {
    const startIdx = content.indexOf('await safeCreateTable', searchIdx);
    if (startIdx === -1) break;

    const openParenIdx = content.indexOf('(', startIdx);
    if (openParenIdx === -1) {
      searchIdx = startIdx + 1;
      continue;
    }

    let braceCount = 1;
    let currentIdx = openParenIdx + 1;
    while (braceCount > 0 && currentIdx < content.length) {
      const char = content[currentIdx];
      if (char === '(') braceCount++;
      else if (char === ')') braceCount--;
      currentIdx++;
    }

    const callStr = content.slice(startIdx, currentIdx);
    calls.push(callStr);
    searchIdx = currentIdx;
  }

  console.log(`Found ${calls.length} safeCreateTable calls.`);

  // 2. Mock safeCreateTable를 컨텍스트에 설정하고 eval 실행하여 메타데이터 수집
  const collected = [];
  const safeCreateTable = (displayName, columns, options) => {
    if (!options || !options.tableName) {
      console.warn(`[Warning] No tableName specified for: ${displayName}`);
      return;
    }
    collected.push({ displayName, columns, options });
  };

  // eval 환경 구성을 위한 헬퍼 환경변수 및 가상 변수들 모킹
  const process = {
    env: {
      SEED_DEMO_DATA: 'false'
    }
  };

  for (const call of calls) {
    try {
      // await safeCreateTable -> safeCreateTable 로 변환하여 동기 실행
      const syncCall = call.replace('await safeCreateTable', 'safeCreateTable');
      eval(syncCall);
    } catch (err) {
      console.error('Failed to eval call:', call.slice(0, 100) + '...', err.message);
    }
  }

  console.log(`Successfully parsed ${collected.length} tables.`);

  // 3. egdesk.schema.ts 용 COLUMN_DEFINITIONS 및 TABLES 코드 문자열 작성
  let columnDefsStr = 'export const COLUMN_DEFINITIONS = {\n';
  let tablesStr = 'export const TABLES = {\n';

  for (const table of collected) {
    const { displayName, columns, options } = table;
    const tableName = options.tableName;

    // COLUMN_DEFINITIONS 문자열 빌드
    columnDefsStr += `  ${tableName}: [\n`;
    for (const col of columns) {
      columnDefsStr += `    { name: '${col.name}', type: '${col.type}'`;
      if (col.notNull !== undefined) columnDefsStr += `, notNull: ${col.notNull}`;
      if (col.defaultValue !== undefined) {
        if (typeof col.defaultValue === 'string') {
          columnDefsStr += `, defaultValue: '${col.defaultValue}'`;
        } else {
          columnDefsStr += `, defaultValue: ${col.defaultValue}`;
        }
      }
      columnDefsStr += ` },\n`;
    }
    columnDefsStr += `  ],\n`;

    // TABLES 문자열 빌드
    tablesStr += `  ${tableName}: {\n`;
    tablesStr += `    name: '${tableName}',\n`;
    tablesStr += `    displayName: '${displayName}',\n`;
    // 동적 매핑 코드 주입
    tablesStr += `    columns: COLUMN_DEFINITIONS.${tableName}.map(c => c.name),\n`;
    tablesStr += `    columnCount: COLUMN_DEFINITIONS.${tableName}.length,\n`;
    tablesStr += `    rowCount: 0,\n`;
    if (options.uniqueKeyColumns) {
      tablesStr += `    uniqueKeyColumns: ${JSON.stringify(options.uniqueKeyColumns)},\n`;
    }
    if (options.duplicateAction) {
      tablesStr += `    duplicateAction: '${options.duplicateAction}',\n`;
    }
    tablesStr += `  },\n`;
  }

  columnDefsStr += '} as const;\n\n';
  tablesStr += '} as const;\n\n';

  // 4. 새로운 egdesk.schema.ts 내용 어셈블리
  const header = `/**
 * egdesk.schema.ts — committed seed schema
 *
 * COMMIT THIS FILE TO GIT.
 *
 * When someone opens this project in their EGDesk, these tables are created
 * automatically in their dev database on first server start.
 *
 * Unlike egdesk.config.ts (auto-generated, gitignored), this file is the
 * portable source of truth for your app's database structure.
 *
 * Edit this file when you add/remove tables or columns. Do NOT edit
 * egdesk.config.ts — EGDesk regenerates it from the live database.
 */

`;

  const footer = `export type TableName = keyof typeof TABLES;
export const TABLE_NAMES = Object.keys(TABLES) as TableName[];
`;

  const finalOutput = header + columnDefsStr + tablesStr + footer;
  fs.writeFileSync(schemaPath, finalOutput, 'utf8');
  console.log('Successfully updated egdesk.schema.ts with dynamic structures!');
}

run().catch(console.error);
