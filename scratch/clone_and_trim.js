const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\dev\\egdesk-FreeSMS';
const destDir = 'C:\\dev\\egdesk-PublicSMS';

// 복사 제외 폴더 및 파일 정의
const globalIgnore = [
  'node_modules',
  '.next',
  '.git',
  '.venv',
  'user_data.db',
  'tsconfig.tsbuildinfo',
  '.tsbuildinfo',
  'diff_utf8.txt',
  'page_orig.tsx.bak',
  'original_page_utf8.tsx'
];

// SaaS 서비스용 트리밍 대상 폴더 목록 (목적지에서 삭제할 대상)
const trimFolders = [
  'src/app/operators',
  'src/app/my-db',
  'src/app/help',
  'src/app/ai-control-tower',
  'src/app/facility-management',
  'src/app/quality-control',
  'src/app/production-plan',
  'src/app/energy-management',
  'src/app/safety-management',
  'src/app/safety-detection',
  'src/app/hr/attendance',
  'src/app/labor-management',
  'src/app/m',
  'src/app/password-ai',
  'src/app/rnd-management',
  'src/app/rnd-manage',
  'src/app/ai-briefing',
  'src/app/ecount-erp-ai',
  'src/app/import-customs',
  'src/app/scm-management',
  // API 관련 제거 대상
  'src/app/api/ecount-erp',
  'src/app/api/hr'
];

function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}

function copyFolderRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    const baseName = path.basename(src);
    if (globalIgnore.includes(baseName)) {
      return;
    }

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    fs.readdirSync(src).forEach((childItemName) => {
      copyFolderRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    const baseName = path.basename(src);
    if (globalIgnore.includes(baseName)) {
      return;
    }
    fs.copyFileSync(src, dest);
  }
}

async function run() {
  console.log(`🚀 Starting clone process from "${srcDir}" to "${destDir}"...`);

  if (!fs.existsSync(srcDir)) {
    console.error('Source directory not found!');
    process.exit(1);
  }

  // 1. 디렉터리 생성 및 복사
  copyFolderRecursive(srcDir, destDir);
  console.log('✅ Copy complete.');

  // 2. SaaS 트리밍 대상 폴더들 삭제
  console.log('🚀 Trimming folders to customize for PublicSMS SaaS...');
  for (const folder of trimFolders) {
    const targetPath = path.join(destDir, folder);
    if (fs.existsSync(targetPath)) {
      console.log(`   Removing: ${folder}`);
      deleteFolderRecursive(targetPath);
    }
  }

  // 3. 빈 디렉터리 정리 (예: src/app/hr 폴더가 비게 된다면 제거)
  const hrPath = path.join(destDir, 'src/app/hr');
  if (fs.existsSync(hrPath) && fs.readdirSync(hrPath).length === 0) {
    console.log('   Removing empty directory: src/app/hr');
    fs.rmdirSync(hrPath);
  }

  console.log('🎉 Project clone & trimming successfully completed!');
}

run().catch(console.error);
