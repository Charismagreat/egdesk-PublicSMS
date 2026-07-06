const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'dev', 'egdesk-FreeSMS', 'src', 'app', 'api', 'estimates', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. target: OUTBOUND 메일 발송 sendMail 구문 찾기
const targetKey = 'subject: `[견적서] ${partner_name} 귀하 - 견적서가 도착했습니다. (번호: ${estimateId})`,';
const idx = content.indexOf(targetKey);

if (idx !== -1) {
  // sendMail 닫는 소괄호와 중괄호 위치 찾기
  const endMailIdx = content.indexOf('});', idx);
  if (endMailIdx !== -1) {
    const sendMailBlock = content.substring(idx, endMailIdx);
    
    // attachments 가 없는 경우 추가
    if (!sendMailBlock.includes('attachments:')) {
      const targetReplace = `subject: \`[견적서] \${partner_name} 귀하 - 견적서가 도착했습니다. (번호: \${estimateId})\`,
        html: emailBodyHtml,
        fromName: '이지데스크 견적시스템'`;
        
      const replacement = `subject: \`[견적서] \${partner_name} 귀하 - 견적서가 도착했습니다. (번호: \${estimateId})\`,
        html: emailBodyHtml,
        fromName: '이지데스크 견적시스템',
        attachments: fs.existsSync(filePath) ? [{
          filename: \`\${supplierName}-\${partner_name}견적서_\${estimateId}.pdf\`,
          path: filePath
        }] : []`;

      content = content.replace(targetReplace, replacement);
      
      // CRLF fallback
      if (!content.includes('attachments:')) {
        const crlfTargetReplace = targetReplace.replace(/\n/g, '\r\n');
        const crlfReplacement = replacement.replace(/\n/g, '\r\n');
        content = content.replace(crlfTargetReplace, crlfReplacement);
      }

      fs.writeFileSync(filePath, content, 'utf8');
      console.log('route.ts attachments successfully integrated.');
    } else {
      console.log('attachments already exist in OUTBOUND sendMail.');
    }
  }
} else {
  console.log('Target sendMail subject not found in route.ts');
}
