const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak
} = require('docx');
const fs = require('fs');
const path = require('path');

// 폰트 및 색상 상수 정의
const FONT_PRIMARY = 'Noto Sans KR';
const COLOR_PRIMARY = '0F172A'; // Deep Slate Navy
const COLOR_SECONDARY = '3B82F6'; // Neon Blue
const COLOR_MUTED = '64748B'; // Slate Gray
const COLOR_BORDER = 'E2E8F0'; // Light Gray
const COLOR_HIGHLIGHT = '10B981'; // Emerald Green
const COLOR_LIGHT_BG = 'F8FAFC'; // Card Background

// 단락 헬퍼 함수
function createParagraph({ text, children, heading, spacingBefore, spacingAfter, alignment, bullet }) {
  const paragraphOptions = {
    spacing: {
      before: spacingBefore !== undefined ? spacingBefore : 120,
      after: spacingAfter !== undefined ? spacingAfter : 120,
      line: 320 // 줄간격
    }
  };

  if (heading) {
    paragraphOptions.heading = heading;
  }
  if (alignment) {
    paragraphOptions.alignment = alignment;
  }
  if (bullet) {
    paragraphOptions.bullet = { level: 0 };
  }

  if (text) {
    paragraphOptions.children = [
      new TextRun({
        text: text,
        font: FONT_PRIMARY,
        size: heading ? 28 : 22, // heading의 경우 크게, 본문은 11pt(22)
        color: heading ? COLOR_PRIMARY : '334155',
        bold: heading ? true : false
      })
    ];
  } else if (children) {
    paragraphOptions.children = children;
  }

  return new Paragraph(paragraphOptions);
}

// 제목 헬퍼 함수
function createTitle(text, subtitleText) {
  const elements = [
    new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: text,
          font: FONT_PRIMARY,
          size: 36, // 18pt
          bold: true,
          color: COLOR_PRIMARY
        })
      ]
    })
  ];

  if (subtitleText) {
    elements.push(
      new Paragraph({
        spacing: { before: 0, after: 360 },
        children: [
          new TextRun({
            text: subtitleText,
            font: FONT_PRIMARY,
            size: 20, // 10pt
            color: COLOR_MUTED,
            italics: true
          })
        ]
      })
    );
  }

  return elements;
}

// 구분선
function createDivider() {
  return new Paragraph({
    spacing: { before: 240, after: 240 },
    border: {
      bottom: {
        color: COLOR_BORDER,
        space: 1,
        value: BorderStyle.SINGLE,
        size: 6
      }
    }
  });
}

// 테이블 생성 헬퍼
function createTableHelper(headers, rows) {
  const tableRows = [];

  // Header Row
  tableRows.push(
    new TableRow({
      children: headers.map(h => new TableCell({
        children: [
          new Paragraph({
            spacing: { before: 100, after: 100 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: h,
                font: FONT_PRIMARY,
                bold: true,
                size: 18,
                color: 'FFFFFF'
              })
            ]
          })
        ],
        shading: { fill: COLOR_PRIMARY },
        width: { size: 100 / headers.length, type: WidthType.PERCENTAGE }
      }))
    })
  );

  // Data Rows
  rows.forEach((row, index) => {
    tableRows.push(
      new TableRow({
        children: row.map(cellText => new TableCell({
          children: [
            new Paragraph({
              spacing: { before: 100, after: 100 },
              children: [
                new TextRun({
                  text: cellText,
                  font: FONT_PRIMARY,
                  size: 16,
                  color: '334155'
                })
              ]
            })
          ],
          shading: index % 2 === 1 ? { fill: COLOR_LIGHT_BG } : undefined,
          width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 100, right: 100 }
        }))
      })
    );
  });

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
}

function run() {
  console.log('DOCX 생성을 시작합니다...');

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // ==================== [페이지 1: 표지] ====================
          new Paragraph({ spacing: { before: 1200, after: 240 }, alignment: AlignmentType.CENTER }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'EGDESK AI 자동화 솔루션 제안서',
                font: FONT_PRIMARY,
                size: 48, // 24pt
                bold: true,
                color: COLOR_SECONDARY
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 480 },
            children: [
              new TextRun({
                text: '송·배전 기자재 제조업의 비즈니스 혁신을 위한',
                font: FONT_PRIMARY,
                size: 28, // 14pt
                bold: true,
                color: COLOR_PRIMARY
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 1200 },
            children: [
              new TextRun({
                text: '통합 데이터 파이프라인 및 특화 AI 솔루션 도입 방안',
                font: FONT_PRIMARY,
                size: 32, // 16pt
                bold: true,
                color: COLOR_PRIMARY
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 120 },
            children: [
              new TextRun({
                text: '제안 대상: 송·배전용 컨덕터 및 커넥터 다품종 소량 생산 중소기업 귀중\n',
                font: FONT_PRIMARY,
                size: 22,
                bold: true,
                color: '475569'
              }),
              new TextRun({
                text: '(일진전기, 효성전기 대기업 협력업체 타겟)\n\n',
                font: FONT_PRIMARY,
                size: 18,
                color: COLOR_MUTED
              }),
              new TextRun({
                text: '제출일자: 2026년 6월 5일\n',
                font: FONT_PRIMARY,
                size: 20,
                color: COLOR_MUTED
              }),
              new TextRun({
                text: '제안기관: EGDesk 기술연구소 / 사업기획본부',
                font: FONT_PRIMARY,
                size: 20,
                color: COLOR_MUTED
              })
            ]
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ==================== [페이지 2: 제안 배경 및 필요성] ====================
          ...createTitle('01. 제안 배경 및 필요성', '송·배전 기자재 업계가 직면한 6대 핵심 병목과 해결 방향'),
          createParagraph({
            text: '송·배전용 컨덕터 및 커넥터를 다품종 소량생산하여 일진전기, 효성전기 등 국내 대표 전력 대기업에 납품하는 중소기업 현장은 급변하는 시장 환경 속에서 가혹한 효율화 압박을 받고 있습니다. 본 제안서는 대상 기업이 안고 있는 다음의 핵심 페인 포인트를 진단하고 이를 해결하기 위한 정밀 AI 전략을 제시합니다.'
          }),
          createParagraph({
            children: [
              new TextRun({ text: '• 제품 불량의 반복 발생: ', bold: true, color: COLOR_PRIMARY }),
              new TextRun({ text: '송·배전용 부품의 특성상 절삭 가공 및 금형 압착 시 미세 균열이나 도금 불량이 발생하기 쉬우나, 기존 숙련자의 감에만 의존하여 지속적인 불량 차단에 한계가 존재합니다.' })
            ]
          }),
          createParagraph({
            children: [
              new TextRun({ text: '• 대기업 납기 준수율 하락: ', bold: true, color: COLOR_PRIMARY }),
              new TextRun({ text: '다품종 소량생산 대응 과정에서 자재 조달이나 공정 변경 지연이 대기업 SCM 납기일 위반으로 이어져 패널티 및 신뢰도 하락 리스크가 잔존합니다.' })
            ]
          }),
          createParagraph({
            children: [
              new TextRun({ text: '• 낮은 전산 시스템 활용도: ', bold: true, color: COLOR_PRIMARY }),
              new TextRun({ text: '수만 원부터 수억 원을 들여 ERP, MES, FLOW 등을 구축했으나 현장 직원들이 타이핑 및 이중 전산 입력에 지쳐 시스템 참여도가 낮고 사장되고 있습니다.' })
            ]
          }),
          createParagraph({
            children: [
              new TextRun({ text: '• 성과 평가 체계의 부재: ', bold: true, color: COLOR_PRIMARY }),
              new TextRun({ text: '누가 불량을 줄였고 누가 긴급 발주에 헌신적으로 대응했는지에 대한 정량적이고 객관적인 데이터 평가 기준이 없어 우수 직원의 성취도가 결여되고 불만이 쌓이고 있습니다.' })
            ]
          }),
          createParagraph({
            children: [
              new TextRun({ text: '• 무의미한 중복 행정 작업: ', bold: true, color: COLOR_PRIMARY }),
              new TextRun({ text: '한 번 완료한 생산 실적을 엑셀, ERP, MES, 협업툴에 각기 다른 직원이 이중, 삼중으로 수기 등록하는 비효율이 극에 달해 있습니다.' })
            ]
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ==================== [페이지 3: 금융정보 AI] ====================
          ...createTitle('02. 금융정보 AI 솔루션', '실시간 통합 파이프라인 연계 경영 분석 및 예측 최적화'),
          createParagraph({
            text: '금융정보 AI는 외부 금융망(은행 계좌, 세무 홈택스)과 내부 시스템(ERP, MES, FLOW)을 융합하여 단순 회계 정리를 넘어 고부가가치 의사결정을 실시간 제공합니다.'
          }),
          createParagraph({
            text: '■ 실시간 자금현황 및 장단기 운용비용 예측 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '기존에는 매주 금요일 자금이 모자라면 급하게 자금을 조달하느라 높은 금리를 감당해야 했습니다. 금융정보 AI 도입 후에는 LME(런던금속거래소) 구리 및 알루미늄 시세 데이터베이스와 연동하여 원자재 가격 변동 추이와 다음 3개월간의 기성 수금 일정을 분석합니다. 이를 통해 "7월 3주차에 구리 단가가 일시 하락하고 일진전기 수금액 2억 원이 입금되는 즉시 원자재를 50톤 대량 매입하는 것이 1,200만 원 상당의 비용을 절감할 수 있다"는 최적의 자금 집행 타이밍을 시뮬레이션해 줍니다.'
          }),
          createParagraph({
            text: '■ 프로젝트별 손익분석을 통한 팀별/부문별 성과 측정 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '생산 1팀이 가동한 [배전용 구리 커넥터 C-20] 프로젝트와 생산 2팀이 가동한 [송전용 알루미늄 컨덕터 A-10] 프로젝트의 자재 투입비, 작업 공수(공임), 피막 가공을 위해 보낸 외주 비용을 정밀 매핑합니다. 결과 분석을 통해 "생산 1팀은 불량율 1.2%로 단가 마진 22%를 달성한 반면, 생산 2팀은 비규격 도면 오기로 인해 마진율이 8.5%로 폭락했다"는 팀별 손익 기여도를 소수점 단위로 자동 산출하여 부서장에게 제공합니다.'
          }),
          createParagraph({
            text: '■ 매출 매입 분석을 통한 주력 제품 및 원가 관리 외주처 구별 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '최근 1년간 효성전기와 일진전기에 납품한 120여 종의 품목 매출액과 매입 단가를 분석합니다. AI는 "알루미늄 절삭 커넥터 부문은 최근 외주 피막 가공 업체의 가격 인상(15% 상승)으로 마진이 극도로 저하되었으니, 도금 외주 공정을 A업체에서 단가가 8% 저렴한 B업체로 조정해야 하고, 영업 역량의 70%를 고마진 송전용 초고압 컨덕터 납품에 집중해야 한다"는 의사결정 시나리오를 추천합니다.'
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ==================== [페이지 4: 지출관리 AI] ====================
          ...createTitle('03. 지출관리 AI 솔루션', '불필요 지출 제로화와 고정비 분배를 통한 실질 원가 분석'),
          createParagraph({
            text: '지출관리 AI는 사내에서 흘러나가는 모든 현금 흐름을 전수 검증하여 낭비를 방지하고, 다품종 소량 생산 체계에 특화된 정밀 원가 관리를 구현합니다.'
          }),
          createParagraph({
            text: '■ 불필요한 지출 자율 통제 및 모니터링 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '영업 사원이나 공장 관리 부서에서 법인 신용카드를 사용할 때, AI가 카드사 전표 및 모바일 OCR 영수증 이미지를 매칭하여 사용 이력을 실시간 대조합니다. 예를 들어 "공장 가동이 중단된 공휴일에 특정 차량 주유비가 청구"되었거나 "평일 23시 이후 10km 이상 떨어진 지역에서 식비가 중출"된 경우, 경고 메시지를 발송하고 해당 지출 항목을 검토 대상(Flag)으로 지정하여 불필요한 소모적 지출을 전월 대비 18% 감소시킵니다.'
          }),
          createParagraph({
            text: '■ 장단기 소요자금 예측 시나리오 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '6개월 단위로 수주 잔고와 매월 상환해야 할 설비 리스료, 외주 가공비 지급 스케줄을 통합 계산합니다. AI는 "9월 중순에 일진전기 납품 3건의 검수 지연으로 인해 일시적인 현금 흐름 부족(약 4,500만 원)이 예상되니, 8월 말에 저금리 정부 정책 자금 5,000만 원 대출 신청을 미리 진행해야 자금 경색을 예방할 수 있다"고 장단기 필요 자금을 선제적으로 안내합니다.'
          }),
          createParagraph({
            text: '■ 프로젝트별/고객별/제품별 원가 배부 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '일반적인 ERP에서는 공장 전체 전기세나 감가상각비를 모든 제품에 동일 비율로 쪼개어 배부합니다. 그러나 지출관리 AI는 설비 로그를 통해 고전압 송전 컨덕터 시험기 가동에 쓰인 전력량을 개별 측정합니다. 따라서 "일진전기 공급용 컨덕터 프로젝트에 소요된 실질 설비 감가상각비와 전력비 320만 원을 타겟 제품 원가에 정밀 가산"함으로써 진짜 순마진을 1원 단위까지 파악할 수 있도록 도우며 적자 수주를 방지합니다.'
          }),
          createParagraph({
            text: '■ 부문별 지출이 만들어내는 성과 및 이익 측정 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '영업 1팀이 전력 대기업 바이어 접대 및 샘플 제작에 지출한 550만 원과 영업 2팀이 지출한 120만 원의 성과를 최종 수주 이익과 비교합니다. AI는 "영업 1팀의 지출은 최종 1.5억 원 상당의 고부가가치 커넥터 독점 계약(이익률 28%)으로 회수되었으므로 지출 대비 성과 지수 7.6점을 획득했고, 영업 2팀은 단순 미팅용으로 소모되어 성과 지수가 0.5점에 그쳤다"는 경비 지출의 기여도 리포트를 제공합니다.'
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ==================== [페이지 5: 생산 및 품질관리 AI] ====================
          ...createTitle('04. 생산 및 품질관리 AI (개발 중)', '도면 설계 자동화부터 공정 실시간 조율까지 스마트 팩토리 실현'),
          createParagraph({
            text: '생산 및 품질관리 AI는 사람의 실수로 발생하는 불량을 예방하고, 병목이 심한 다품종 공정 간 소통을 자율적으로 중개하여 리드타임을 획기적으로 줄입니다.'
          }),
          createParagraph({
            text: '■ CAD 도면 작업 자동화 및 가공 전 시뮬레이션 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '대기업 바이어가 발송한 도면 PDF 파일과 기술 사양서를 AI 엔진에 드롭하면, AI가 주요 수치와 형상 정보를 판독하여 CAD 파일의 규격 레이아웃(DWG)과 부품 명세서(BOM) 초안을 10분 만에 자동 렌더링합니다. 이후 가상 성형 시뮬레이션을 통해 "알루미늄 배전용 커넥터 C-20 금형 가공 시, 3번 벤딩 곡률 반경이 부족하여 압착 도중 0.2mm 미세 균열이 발생할 위험성이 92%"라고 시뮬레이션하여, 실제 철판을 깎기 전에 금형 치수를 0.5mm 수정 지시해 설계 오류 및 폐기 자재 낭비를 예방합니다.'
          }),
          createParagraph({
            text: '■ 비전 검수 자동화를 통한 불량 예방 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '공정 라인 말단에 설치된 스마트 비전 센서가 컨덕터 가닥의 꼬임 상태와 도금 두께를 마이크로미터 단위로 실시간 고속 스캔합니다. 나사산 피치 정합성이 불량 기준에 다다르면 AI가 프레싱 장비의 작동을 자동 일시 중지시키고, FLOW 협업 시스템에 "금형 마모 상태 점검 필요, 2번 공정 정지"를 타겟 작업자에게 즉시 푸시 알림으로 보고하여 반복 불량품 양산을 예방합니다.'
          }),
          createParagraph({
            text: '■ 공정 연동 실시간 자재 조달, 인력 배치, 외주 조율 소통 자동화 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '원자재 창고에 구리 와이어 재고가 임계치(300kg) 이하로 떨어지거나 MES에서 가동 지연이 발생할 경우, AI가 원자재 업체에 "구리 와이어 1톤 긴급 납품 요망" 메시지를 이메일과 알림톡으로 발송합니다. 동시에 공장 내 가동률이 낮은 3호기 조작 인력을 병목이 걸린 1호기 연선 공정으로 자동 재배치(FLOW 작업 지시 변경)하고, 도금 외주 업체에는 "A-10 규격 입고 일정이 설비 지연으로 4일에서 6일로 자동 연기되었습니다"라고 일정을 스스로 조율하여 유선 소통 및 대기 낭비를 제거합니다.'
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ==================== [페이지 6: 안전관리 AI] ====================
          ...createTitle('05. 안전관리 AI (개발 중)', '중대재해처벌법 완벽 대응을 위한 작업장 자율 통제 및 자동 증빙'),
          createParagraph({
            text: '안전관리 AI는 고전압 시험 구역, 특수 화학약품 표면 처리실, 고속 회전 절삭기 등 상시 사고 위험이 노출된 공장 내 안전을 24시간 실시간 감시하고 모든 증빙을 자동화합니다.'
          }),
          createParagraph({
            text: '■ 고전압·화학약품·절삭기 특화 안전 수칙 작성 및 교육 자동화 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: 'AI가 각 설비의 위험 등급과 MSDS(물질안전보건자료) 문서를 학습하여, 공장 신규 배치 및 정기 안전 수칙 카드를 주 단위로 자동 작성해 줍니다. "초고압 송전 시험실 진입 전 고압 방전 스틱을 활용한 잔류 전하 제거 절차" 등 작업장 맞춤형 시청각 퀴즈 교육 자료를 모바일 FLOW로 출근 직후 자동 배포하여, 미이수자는 당일 설비 기동 권한을 일시 차단합니다.'
          }),
          createParagraph({
            text: '■ 자체 개발 안전 키오스크 연동 안전모/절연장갑 미착용 경보 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '공장 현장 출입구 및 고위험 절삭기 조작반 앞에 설치된 비전 안전 키오스크가 작업자가 다가오면 안면 및 착용 장구를 0.5초 만에 인식합니다. 안전 헬멧 미착용 또는 일반 작업용 면장갑을 끼고 있을 경우, 경고음과 함께 키오스크 모니터에 "고압 조작반 전용 2만 볼트 절연장갑을 착용하십시오"라고 시각적 경보를 띄우며, 해당 설비의 전원 활성화를 강제 잠금(Lock-out) 처리합니다.'
          }),
          createParagraph({
            text: '■ AI 자율 안전 지시 및 수행 결과 점검(중대재해처벌법 원클릭 대응) 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: 'AI는 작업 전 오전 8:30분, 안전관리감독자에게 "화학 약품 세척 탱크 배기 밸브 개폐 검사" 지시를, 현장 작업자에게는 "절삭기 방호 커버 정합성 사진 촬영 제출"을 자율 지시합니다. 감독자가 현장에서 점검 후 스마트폰으로 탱크 게이지와 안전장치를 사진 촬영하여 FLOW에 업로드하면, AI가 이미지 인식을 통해 점검 완료를 체크하고 보고서를 생성하여 PDF로 중앙 서버에 암호화 보관합니다. 이로써 중대재해처벌법이 의무화한 "안전보건 확보 의무 이행 증빙" 관리 대장을 완벽히 자동 수립합니다.'
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ==================== [페이지 7: 가격추적 AI] ====================
          ...createTitle('06. 가격추적 AI 솔루션', '경쟁사 전략 감시와 대기업 신기술 수요 선제 포착'),
          createParagraph({
            text: '가격추적 AI는 대외 시장의 비대칭 정보를 상시 탐지하여 영업 경쟁력을 보강하고, 국제 원자재 변동 리스크에 최적으로 대응하도록 설계되었습니다.'
          }),
          createParagraph({
            text: '■ 고객사 특허 및 입찰 공고 트래킹 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '일진전기, 효성전기, 한국전력공사 등이 신규 출원한 특허 명세서와 조달청 나라장터 입찰 정보를 AI가 상시 크롤링합니다. 예를 들어 "효성전기에서 초고압 변전소용 알루미늄 가변 커넥터 특허를 신규 등록했다"는 정보가 감지되는 즉시, AI가 이를 파싱하여 영업 부서에 "해당 사양의 고강도 알루미늄 자재 납품 제안서를 먼저 작성하십시오"라고 알림을 발송하고 타겟 제안서 초안을 자동으로 구성해 줍니다.'
          }),
          createParagraph({
            text: '■ LME 원자재 시세 및 스크랩 가격 변동 감시 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '구리와 알루미늄 등 비철금속의 국제 LME 시세와 국내 재활용 고철/구리 스크랩의 시세 변동을 매시간 추적합니다. AI는 "최근 구리 LME 시세가 5일 연속 상승 추세이며, 고 scrap 단가가 kg당 150원 인상되었습니다. 단가 상승 전 30톤의 구리 원자재를 10일 선매입하고, 기존 거래처의 납품 기본가격을 LME 변동률 연동 공식에 맞춰 3.5% 인상 반영하는 공문을 일진전기 구매팀에 자율 발송하십시오"라고 가이드라인과 공문 파일을 자동 빌드해 줍니다.'
          }),
          createParagraph({
            text: '■ 경쟁사 입찰 단가 역추적 및 투찰 단가 추천 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '과거 한국전력 입찰 결과 데이터 및 경쟁사의 수주 이력, 원가 변동률 추이 테이블을 기반으로 머신러닝 분석을 수행합니다. 다가오는 배전용 컨덕터 한전 입찰 프로젝트에서 "경쟁사인 A테크의 예상 입찰 단가는 원자재 상승분을 반영해 kg당 9,250원~9,400원 사이로 유력하며, 당사가 9,210원에 투찰할 경우 수주 확률이 87%로 극대화되고 적자를 피할 수 있다"는 최적 투찰 분석 레포트를 제시합니다.'
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ==================== [페이지 8: 24시간 자율 마케팅 AI] ====================
          ...createTitle('07. 24시간 자율 마케팅 AI', '외주 대행 없는 고효율 자율 마케팅 루프 가동'),
          createParagraph({
            text: '마케팅 대행 외주비에 예산을 낭비하지 않고, AI가 24시간 자율적으로 시장 트렌드를 분석하여 고품질의 홍보 콘텐츠를 다발적으로 생산 및 배포합니다.'
          }),
          createParagraph({
            text: '■ 비참가 전시회 동향 및 기술 트렌드 수집 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '당사 영업팀이 직접 참여하지 못한 "독일 하노버 메세 전력 기기 박람회"나 "미국 IEEE 송배전 전시회"의 온라인 프레스 릴리즈, 참가사 기술 동향 보고서를 자율 수집합니다. AI는 "금년 전시회의 트렌드는 탄소 배출을 줄이는 친환경 가스 절연 커넥터이며, 경쟁사들은 초경량 알루미늄 합금 라인업을 주력으로 내세웠다"는 트렌드 요약 보고서를 작성하여 사내 기술 연구소와 마케팅팀에 보고합니다.'
          }),
          createParagraph({
            text: '■ 블로그 포스팅 및 유튜브 쇼츠 자동화 제작 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '이전 단계에서 요약한 트렌드 자료와 자사 신제품인 "송전 손실을 20% 줄인 초고압 알루미늄 컨덕터"의 상세 도면 및 시험 성적서 데이터를 조율합니다. AI는 "친환경 전력 전송의 주역, 탄소저감 컨덕터 도입 가이드"라는 제목의 심층 기술 네이버 블로그 글을 사진과 함께 매일 자동 발행합니다. 추가로 동영상 편집 라이브러리를 연동하여, 제품 회전 3D 모델링 영상 위에 한국어/영어 음성 자막과 트렌디한 자막을 얹은 45초 분량의 유튜브 쇼츠(Shorts) 영상을 자동 제작하고 릴스 및 유튜브 채널에 자율 업로드합니다.'
          }),
          createParagraph({
            text: '■ 마케팅 피드백 데이터를 통한 키워드 자체 최적화 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '업로드된 블로그와 쇼츠의 일주일간 누적 통계(조회수, 댓글, 당사 웹사이트로의 영업 문의 클릭률)를 모니터링합니다. AI는 " 단순 \'송전 컨덕터\' 키워드보다 \'일진전기 규격 호환 커넥터\', \'LME 연동 납기 단가 절감\' 키워드로 검색해 들어온 기업 구매 담당자들의 이메일 문의 전환율이 8.2배 높다"는 결과를 학습하여, 다음 주차 홍보 포스팅의 헤드라인과 타겟 검색 태그를 해당 구매 전환율 최적화 키워드로 자동 변경하여 노출 빈도를 강화합니다.'
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ==================== [페이지 9: AI 스냅태스크 및 성과 측정] ====================
          ...createTitle('08. AI 스냅태스크 솔루션', '단순 수작업 사무 행정의 완전 대행 및 투명한 기여도 분석'),
          createParagraph({
            text: 'AI 스냅태스크는 수많은 중복 서류 작업과 시스템 기입 비효율을 해소하고, 직원이 정직하게 일한 결과를 시스템 로그 기반으로 측정하여 신뢰감 있는 보상 기틀을 수립합니다.'
          }),
          createParagraph({
            text: '■ 전산 입력, 조회, 출력, 보고서 자동화 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '기존에는 현장에서 납품용 컨덕터 수량 검수를 완료하면, 검수 담당자가 MES에 수량 입력, ERP에 입고 전표 입력, FLOW에 도면 확인 완료 보고, 송장 인쇄 등 동일한 수치를 4개의 시스템에 수작업 이중 입력해야 했습니다. AI 스냅태스크 도입 후에는 담당자가 모바일로 검수 성적서 사진 한 장을 찍어 전송하는 것만으로 끝납니다. AI가 이미지에서 사양과 수량을 읽어내어 MES, ERP, FLOW에 동시에 대입(Upsert) 적재하고 거래처용 전자세금계산서 발행과 송장 인쇄 작업까지 자동으로 완료 처리합니다.'
          }),
          createParagraph({
            text: '■ 부문별, 프로젝트별 업무 속도 분석 및 병목 구간 피드백 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: '전사 사무 처리 소요 시간을 모니터링하여 가독성 높은 피드백 리포트를 띄웁니다. AI는 "커넥터 C-20 프로젝트 행정 처리 흐름 분석 결과, 생산팀의 가공 완료 보고 이후 영업팀의 대기업 SCM 수발주 시스템 등록 완료까지 평균 5.2시간이 정체되어 전체 리드타임 지연의 주요 원인으로 식별되었습니다. 영업 부서의 수발주 연동 모듈 가동률을 올릴 것을 권장합니다"라고 정체 부문에 경고를 주어 업무 프로세스를 매끄럽게 개선합니다.'
          }),
          createParagraph({
            text: '■ 직원별 직무 수행 평가의 자동화 및 우수 직원 불만 해소 예시',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({
            text: 'FLOW를 통한 긴급 오더 처리 속도(마감 리드타임 준수율), MES상의 불량 감축 기여율(본인이 가동한 라인의 불량 하락 지표), AI 스냅태스크 활용을 통한 행정 효율화 건수를 정량 수집합니다. 이를 통해 "최우영 대리는 FLOW 협업 요청 해결률 98.2%를 달성하였고, 압착 공정 개선으로 불량률을 전년 대비 4.2%포인트 감소시켜 이달의 우수 기여 직원(S등급)으로 자동 추천되었습니다"라는 객관적 평가 데이터를 제안함으로써, 주관적인 평가를 배제하고 투명하고 차별화된 인센티브 지급 근거를 마련해 직원들의 성취도와 시스템 참여도를 대폭 견인합니다.'
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ==================== [페이지 10: 도입 효과 및 6개월 구축 로드맵] ====================
          ...createTitle('09. 도입 기대효과 및 향후 일정', '정량적 성과 지표 도출 및 6개월 구축 로드맵'),
          createParagraph({
            text: 'EGDesk 통합 AI 자동화 솔루션 도입에 따른 정량적 성과 목표는 다음과 같으며, 6개월간의 정밀 구축 로드맵을 거쳐 현장에 완벽하게 안착됩니다.'
          }),
          createParagraph({
            text: '■ 정량적/정성적 도입 기대효과',
            heading: HeadingLevel.HEADING_2
          }),
          createParagraph({ text: '• 생산 현장 품질 불량률: 도입 3개월 내 기존 대비 65% 감소, 최종 안정화 단계에서 90% 이상 예방', bullet: true }),
          createParagraph({ text: '• 대기업 SCM 납기 준수율: 실시간 자재 조달 예측 및 FLOW 일정 잠금 가드로 납기 지연 사고 0% 지향', bullet: true }),
          createParagraph({ text: '• 사무 행정 리소스 소요량: 단순 반복 문서 입력 및 이중 타이핑 수작업 80% 이상 전면 제거', bullet: true }),
          createParagraph({ text: '• 전사 시스템 참여도 및 신뢰도: 정량 기여도 성과 평가 체계 운영으로 FLOW/MES 시스템 활성화 100% 달성', bullet: true }),
          createParagraph({ text: '• 마케팅 영업 효율성: 외주비 제로화, 24시간 자율 마케팅 AI 가동으로 해외 영업 및 신규 수주 기회 창출', bullet: true }),

          createParagraph({
            text: '■ 6개월 구축 로드맵 (Roadmap)',
            heading: HeadingLevel.HEADING_2
          }),
          createTableHelper(
            ['단계', '기간', '주요 개발 및 구축 내용', '산출물'],
            [
              ['1단계', '1 ~ 2개월', '사내 인프라(ERP, MES, FLOW) DB 연동, 이기종 데이터 파이프라인 수립 및 동기화 스키마 구축', '통합 Single DB 및 실시간 데이터 수집망'],
              ['2단계', '3개월', '생산/품질 RAG 지식베이스 데이터셋 구축, 비전 카메라 연동 및 설계 자동화 시뮬레이션 개발', 'CAD 설계 자동화 도구 및 RAG 엔진'],
              ['3단계', '4개월', '금융 AI 시뮬레이터 및 지출 관리 통제 셋업, 가격추적 및 입찰 단가 시뮬레이션 머신러닝 모델 탑재', '금융/지출 AI 보고서 & 가격 예측 엔진'],
              ['4단계', '5개월', '안전관리 키오스크 현장 배치, 안전 수칙 지시 시스템 가동, 24시간 자율 마케팅 AI 채널 연동', '안전 감지 시스템 & 자율 마케팅 채널'],
              ['5단계', '6개월', 'AI 스냅태스크 전산 자동화 배포, FLOW 성과 지수 산출 연계, 전 직원 파일럿 교육 및 최종 인수 테스트', '성과 평가 대시보드 및 최종 DOCX 제안서 완료']
            ]
          ),
          createParagraph({ spacing: { before: 240, after: 120 } }),
          createParagraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '귀사의 성공적인 디지털 혁신(DX)과 비즈니스 성장을 돕는 가장 신뢰성 높은 동반자가 되겠습니다.',
                font: FONT_PRIMARY,
                bold: true,
                size: 20,
                color: COLOR_PRIMARY
              })
            ]
          })
        ]
      }
    ]
  });

  const pdfPath = path.resolve(__dirname, '../public/proposal.docx');

  Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(pdfPath, buffer);
    console.log(`DOCX 파일 생성이 완료되었습니다: ${pdfPath}`);
  }).catch((err) => {
    console.error('DOCX 생성 중 오류 발생:', err);
  });
}

run();
