const { chromium } = require('playwright');
const path = require('path');

async function run() {
  console.log('PDF 생성을 시작합니다...');
  
  // HTML 파일의 절대 경로
  const htmlPath = path.resolve(__dirname, '../public/proposal.html');
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
  console.log(`대상 URL: ${fileUrl}`);

  const browser = await chromium.launch({
    headless: true
  });
  
  try {
    const page = await browser.newPage();
    
    // 페이지 로드
    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    console.log('페이지 로드가 완료되었습니다. 렌더링 안정화를 위해 잠시 대기합니다.');
    
    // Lucide 아이콘 등이 로드 및 렌더링될 수 있도록 2초간 대기
    await page.waitForTimeout(2000);
    
    // PDF 저장 경로
    const pdfPath = path.resolve(__dirname, '../public/proposal.pdf');
    
    // PDF 생성
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        bottom: '0px',
        left: '0px',
        right: '0px'
      },
      displayHeaderFooter: false
    });
    
    console.log(`PDF 생성이 완료되었습니다: ${pdfPath}`);
  } catch (error) {
    console.error('PDF 생성 중 오류 발생:', error);
  } finally {
    await browser.close();
  }
}

run();
