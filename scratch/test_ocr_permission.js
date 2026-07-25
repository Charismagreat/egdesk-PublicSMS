const { SignJWT } = require('jose');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'egdesk-super-secret-key');

async function test() {
  // guest 계정용 JWT 토큰 생성 (TENANT_ADMIN)
  const token = await new SignJWT({
    id: 2,
    username: 'guest',
    name: '테스트게스트',
    role: 'TENANT_ADMIN',
    tenant_id: 'tenant-guest-id-2222'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  console.log('Generated JWT Token:', token);

  // 로컬 개발 서버(/api/partners/ocr)로 호출 테스트
  try {
    const res = await fetch('http://localhost:4000/api/partners/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${token}`
      },
      body: JSON.stringify({
        file: '', // 비워둠으로써 에러 반응을 유도
        mimeType: 'application/pdf',
        action: 'license'
      })
    });

    const body = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Body:', body);

    if (body.error && body.error.includes('분석 권한이 없습니다')) {
      console.log('❌ 테스트 실패: 여전히 권한 없음 에러가 발생합니다.');
    } else if (body.error && body.error.includes('누락되었습니다')) {
      console.log('✅ 테스트 성공: 권한 검증을 통과하여 비즈니스 데이터 유효성 검사 단계까지 진입했습니다!');
    } else {
      console.log('❓ 기타 응답:', body);
    }
  } catch (err) {
    console.error('API 호출 중 에러 발생:', err.message);
    console.log('💡 로컬 개발 서버가 기동되어 있지 않은 상태일 수 있습니다. (port 4000)');
  }
}

test();
