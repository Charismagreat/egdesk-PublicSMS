const { SignJWT } = require('jose');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'egdesk-super-secret-key');

async function run() {
  try {
    console.log('1. Generating mock SUPER_ADMIN JWT Token...');
    const token = await new SignJWT({
      id: 1,
      username: 'admin',
      name: '최고관리자',
      role: 'SUPER_ADMIN',
      tenant_id: 'tenant-admin-id-1111'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    console.log('Token generated:', token.substring(0, 20) + '...');

    const pdfPath = path.join(__dirname, '../public/uploads/estimates/EST-260630-192156.pdf');
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file does not exist:', pdfPath);
      return;
    }

    console.log(`Loading PDF: ${pdfPath}`);
    const sampleBase64 = fs.readFileSync(pdfPath).toString('base64');
    const pdfDataUrl = `data:application/pdf;base64,${sampleBase64}`;
    
    console.log('2. Sending POST request to /api/partners/ocr on port 4000...');
    console.log('💡 Testing PDF inside the IMAGES array...');
    
    const API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0'; // env.local 에서 로드한 값
    const body = JSON.stringify({
      tool: 'ai_caller_call',
      arguments: {
        prompt: '제공된 문서에서 상호명(companyName)과 대표자명(representative)을 JSON 형식으로 추출해 주세요.',
        images: [pdfDataUrl], // 👈 PDF를 images 배열에 담음!
        model: 'gemini-3.5-flash', // 👈 모델명을 gemini-3.5-flash 로 정정!
        keyName: 'wonconduct'
      }
    });

    const mcpRes = await fetch('http://localhost:8080/ai-caller/tools/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY
      },
      body
    });

    console.log('Response HTTP Status:', mcpRes.status);
    const resJson = await mcpRes.json();
    console.log('Response JSON:', JSON.stringify(resJson, null, 2));
  } catch (err) {
    console.error('Test script failed:', err);
  }
}

run();
