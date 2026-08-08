import fs from 'fs';
import path from 'path';

async function testLiveNaverEndpoints() {
  const sessionPath = path.join(process.cwd(), 'scripts', 'naver_session.json');
  if (!fs.existsSync(sessionPath)) {
    console.log('Session file does not exist.');
    return;
  }

  const raw = fs.readFileSync(sessionPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const cookies = parsed.cookies || [];

  const nidAut = cookies.find((c: any) => c.name === 'NID_AUT')?.value;
  const nidSes = cookies.find((c: any) => c.name === 'NID_SES')?.value;

  if (!nidAut || !nidSes) {
    console.log('❌ NID_AUT or NID_SES missing');
    return;
  }

  const cookieHeader = `NID_AUT=${nidAut}; NID_SES=${nidSes}`;

  // 1. AdminMain.naver 테스트
  console.log('📡 1. Testing AdminMain.naver...');
  const res1 = await fetch('https://admin.blog.naver.com/AdminMain.naver', {
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    redirect: 'manual'
  }).catch(() => null);

  if (res1) {
    console.log('AdminMain Status:', res1.status);
    console.log('AdminMain Location:', res1.headers.get('location'));
  }

  // 2. PostWriteForm.naver 테스트 (글쓰기 페이지)
  console.log('📡 2. Testing PostWriteForm.naver...');
  const res2 = await fetch('https://blog.naver.com/PostWriteForm.naver', {
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    redirect: 'manual'
  }).catch(() => null);

  if (res2) {
    console.log('PostWriteForm Status:', res2.status);
    console.log('PostWriteForm Location:', res2.headers.get('location'));
  }

  // 3. nid.naver.com/user2/help/myInfo 테스트
  console.log('📡 3. Testing nid.naver.com/user2/help/myInfo...');
  const res3 = await fetch('https://nid.naver.com/user2/help/myInfo', {
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    redirect: 'manual'
  }).catch(() => null);

  if (res3) {
    console.log('nid MyInfo Status:', res3.status);
    console.log('nid MyInfo Location:', res3.headers.get('location'));
  }
}

testLiveNaverEndpoints().catch(console.error);
