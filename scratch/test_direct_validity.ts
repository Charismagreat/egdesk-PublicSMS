import fs from 'fs';
import path from 'path';

const SESSION_FILE_PATH = path.join(process.cwd(), 'scripts', 'naver_session.json');

async function checkSessionValidityDirect(): Promise<number> {
  if (!fs.existsSync(SESSION_FILE_PATH)) {
    console.log('SESSION_FILE_PATH does not exist => return 0');
    return 0;
  }
  try {
    const raw = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const cookies = parsed.cookies || [];
    
    if (!cookies || cookies.length === 0) return 0;

    const nidAut = cookies.find((c: any) => c.name === 'NID_AUT')?.value;
    const nidSes = cookies.find((c: any) => c.name === 'NID_SES')?.value;

    if (!nidAut || !nidSes) {
      console.warn('⚠️ [API] naver_session.json 파일에 필수 로그인 인증 쿠키(NID_AUT/NID_SES)가 누락되었습니다.');
      return 0;
    }

    // 네이버 서버 Live Ping 수행 (302 Redirect 발생 시 세션 만료로 판정)
    const cookieHeader = `NID_AUT=${nidAut}; NID_SES=${nidSes}`;
    const liveRes = await fetch('https://nid.naver.com/user2/help/myInfo', {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    }).catch(() => null);

    if (liveRes) {
      const location = liveRes.headers.get('location') || '';
      console.log('Live Ping Status:', liveRes.status, 'Location:', location);
      if (liveRes.status === 302 && location.includes('nidlogin')) {
        console.warn('🔴 [API Live Ping] 네이버 서버에서 로그인 세션 거부(만료)가 감지되었습니다. 잔여 세션 파일을 정리합니다.');
        try {
          fs.unlinkSync(SESSION_FILE_PATH);
          console.log('Successfully deleted expired naver_session.json file!');
        } catch (e) {}
        return 0;
      }
    }

    console.log('🎉 [API Live Ping] 네이버 인증 세션이 살아있음을 확인했습니다! 🟢');
    return 1;
  } catch (e: any) {
    console.error('⚠️ [API] 세션 검증 예외:', e.message);
    return 0;
  }
}

checkSessionValidityDirect().then(result => {
  console.log('FINAL VALIDITY RESULT:', result);
}).catch(console.error);
