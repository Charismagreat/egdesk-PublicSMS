const playwright = require('playwright');
const path = require('path');
const fs = require('fs');

async function generate() {
  console.log('PDF 생성 작업을 시작합니다...');
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  const demoDir = path.join(__dirname, '../demo_materials');
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }

  // 1. 재무제표 HTML 작성 및 PDF 변환
  const financialHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>(주)제이제이인터내셔널 2025년도 재무제표</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; margin: 40px; color: #333; }
        h1 { text-align: center; color: #111; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 10px; text-align: right; }
        th { background-color: #f4f4f4; text-align: center; }
        td.label { text-align: left; font-weight: bold; }
        .meta { text-align: center; margin-bottom: 20px; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <h1>재 무 제 표</h1>
      <div class="meta">
        <strong>회사명: (주)제이제이인터내셔널</strong><br>
        사업자등록번호: 270-81-01761 | 대표자: 임주희<br>
        기준일: 2025년 12월 31일 현재 (단위: 원)
      </div>
      <table>
        <thead>
          <tr>
            <th>구분</th>
            <th>2025년 (제 2기)</th>
            <th>2024년 (제 1기)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label">유동자산 (현금및현금성자산, 매출채권 등)</td>
            <td>950,000,000</td>
            <td>750,000,000</td>
          </tr>
          <tr>
            <td class="label">비유동자산 (유형자산, 무형자산 등)</td>
            <td>550,000,000</td>
            <td>450,000,000</td>
          </tr>
          <tr>
            <td class="label">자산총계</td>
            <td>1,500,000,000</td>
            <td>1,200,000,000</td>
          </tr>
          <tr>
            <td class="label">부채총계 (유동부채 5억)</td>
            <td>500,000,000</td>
            <td>400,000,000</td>
          </tr>
          <tr>
            <td class="label">자본총계 (자본금 10억)</td>
            <td>1,000,000,000</td>
            <td>800,000,000</td>
          </tr>
          <tr>
            <td class="label">매출액 (revenue)</td>
            <td>2,200,000,000</td>
            <td>1,800,000,000</td>
          </tr>
          <tr>
            <td class="label">영업이익 (operating income)</td>
            <td>210,000,000</td>
            <td>150,000,000</td>
          </tr>
          <tr>
            <td class="label">당기순이익 (net income)</td>
            <td>170,000,000</td>
            <td>120,000,000</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  await page.setContent(financialHtml);
  const financialPdfPath = path.join(demoDir, 'financial_statement.pdf');
  await page.pdf({ path: financialPdfPath, format: 'A4', printBackground: true });
  console.log(`재무제표 생성 완료: ${financialPdfPath}`);

  // 2. 이력서 HTML 작성 및 PDF 변환
  const resumeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>입사지원서 - 강태우</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; margin: 40px; color: #333; line-height: 1.6; }
        h1 { text-align: center; color: #111; margin-bottom: 20px; }
        .section { margin-top: 20px; }
        .section-title { font-size: 18px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; width: 20%; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>입 사 지 원 서</h1>
      <div class="section">
        <div class="section-title">인적사항</div>
        <table>
          <tr>
            <th>성명</th>
            <td>강태우 (Kang Tae-woo)</td>
            <th>생년월일</th>
            <td>1992년 05월 14일 (만 34세)</td>
          </tr>
          <tr>
            <th>연락처</th>
            <td>010-3322-9988</td>
            <th>이메일</th>
            <td>twkang@email.com</td>
          </tr>
        </table>
      </div>
      <div class="section">
        <div class="section-title">학력 및 자격사항</div>
        <table>
          <tr>
            <th>최종학력</th>
            <td>한양대학교 기계공학과 학사 졸업</td>
          </tr>
          <tr>
            <th>보유 자격증</th>
            <td>공조냉동기계기사, 일반기계기사</td>
          </tr>
          <tr>
            <th>기술 스택</th>
            <td>AutoCAD, SolidWorks, CATIA, 유체역학 시뮬레이션, 열전달 해석</td>
          </tr>
        </table>
      </div>
      <div class="section">
        <div class="section-title">경력사항 (총 5년)</div>
        <p><strong>한온시스템 공조시스템 설계팀 (2021년 3월 ~ 2026년 2월)</strong><br>
        - 차량용 HVAC 및 컴프레서 부품 설계 및 성능 해석 주도<br>
        - R-1234yf 친환경 차세대 냉매 대응 알루미늄 콘덴서 유로 최적화 설계<br>
        - 신차종 에어컨 시스템 컴포넌트 양산 라인 연계 설계 보완</p>
      </div>
      <div class="section">
        <div class="section-title">지원동기 및 포부</div>
        <p>친환경 냉매 R-1234yf용 컴프레서 부품 정밀 설계 및 양산 라인 최적화 경험을 바탕으로, (주)제이제이인터내셔널의 B2B 공조 부품 독자 모델 개발에 기여하고자 지원했습니다. 그동안 쌓아온 공조 부품 설계 노하우와 유체 해석 능력을 발휘하여, 회사의 차세대 성장 동력인 알루미늄 에어컨 콘덴서 및 컴프레셔 제품군의 기술 완성도를 세계적 수준으로 끌어올리겠습니다.</p>
      </div>
    </body>
    </html>
  `;

  await page.setContent(resumeHtml);
  const resumePdfPath = path.join(demoDir, 'applicant_resume.pdf');
  await page.pdf({ path: resumePdfPath, format: 'A4', printBackground: true });
  console.log(`이력서 생성 완료: ${resumePdfPath}`);

  await browser.close();
  console.log('모든 PDF 생성 프로세스가 완료되었습니다.');
}

generate().catch(err => {
  console.error('PDF 생성 중 오류 발생:', err);
  process.exit(1);
});
