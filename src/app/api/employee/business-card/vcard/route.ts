export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name') || '';
    const phone = searchParams.get('phone') || '';
    const email = searchParams.get('email') || '';
    const company = searchParams.get('company') || '';
    const position = searchParams.get('position') || '';

    if (!name) {
      return new Response('이름(name) 파라미터는 필수입니다.', { status: 400 });
    }

    // 1. RFC 6350 (vCard v3.0 표준 규격) 조립
    // 모바일(iOS, Android)과의 한글 호환성을 위해 CHARSET=UTF-8 지정
    const vcardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN;CHARSET=UTF-8:${name}`,
      `N;CHARSET=UTF-8:${name};;;;`,
      company ? `ORG;CHARSET=UTF-8:${company}` : '',
      position ? `TITLE;CHARSET=UTF-8:${position}` : '',
      phone ? `TEL;TYPE=CELL:${phone.replace(/\s/g, '')}` : '',
      email ? `EMAIL;TYPE=PREF,INTERNET:${email.trim()}` : '',
      'END:VCARD'
    ].filter(line => line !== ''); // 빈 항목 정제

    const vcardString = vcardLines.join('\r\n');
    
    // 2. 강제 다운로드 응답 빌드 (한글 파일명 인코딩)
    const encodedFilename = encodeURIComponent(`${name}_연락처.vcf`);

    return new Response(vcardString, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (err: any) {
    console.error('vCard 생성 API 에러:', err);
    return new Response(`vCard 생성 중 서버 오류 발생: ${err.message}`, { status: 500 });
  }
}
