export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, executeSQL } from '../../../../../egdesk-helpers';

/**
 * 최고관리자(SUPER_ADMIN) 권한 검증 공통 헬퍼
 */
async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    throw new Error('인증 세션이 만료되었습니다. 다시 로그인해주세요.');
  }

  const payload = decodeJwt(token);
  if (payload.role !== 'SUPER_ADMIN') {
    throw new Error('사업자등록증 분석 권한이 없습니다. 최고관리자 계정으로 로그인해주세요.');
  }
}

/**
 * 사업자등록번호 포맷 정제 헬퍼 ("000-00-00000")
 */
function normalizeBusinessNumber(num: string): string {
  if (!num) return '';
  const digits = num.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return num; // 포맷이 다르면 원본 반환
}

/**
 * 전화번호 포맷 정규화 헬퍼 (대시 포함)
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    if (digits.startsWith('02')) {
      return `02-${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  } else if (digits.length === 9 && digits.startsWith('02')) {
    return `02-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return phone;
}

/**
 * 🛡️ 대한민국 표준 사업자등록번호 10자리 로컬 체크섬 검증 헬퍼 (Modulo 10)
 */
function validateBusinessNumberChecksum(num: string): boolean {
  if (!num) return false;
  const clean = num.replace(/\D/g, '');
  if (clean.length !== 10) return false;
  
  const keys = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i]) * keys[i];
  }
  
  // 9번째 자리에 5를 곱한 값의 십의자리와 일의자리를 각각 연산 합산
  const lastVar = parseInt(clean[8]) * 5;
  sum += Math.floor(lastVar / 10) + (lastVar % 10);
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[9]);
}

export async function POST(req: Request) {
  try {
    // 1. 최고관리자 세션 권한 검증
    await verifySuperAdmin();

    const { file, mimeType, action } = await req.json();

    if (!file || !mimeType) {
      return NextResponse.json({
        success: false,
        error: '분석할 파일 데이터(Base64) 및 mimeType이 누락되었습니다.'
      }, { status: 400 });
    }

    // Base64 순수 데이터 정제
    let base64Data = file;
    if (file.startsWith('data:')) {
      const parts = file.split(';base64,');
      base64Data = parts[1];
    }

    // 이지데스크 본사에서 제공하는 기본 AI API 키(AI Caller 기능)를 전적으로 상속 사용합니다. (개별 설정 키 로직 제거)
    const apiKey = 'DUMMY_AI_CALLER_API_KEY';

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-3.5-flash';

    // ─── [명함 이미지 분석 분기] ───
    if (action === 'card') {
      const geminiPrompt = `제공된 명함(이미지 사진 또는 PDF 문서)에서 다음 실무 담당자 정보를 정밀하게 판독하여 추출해 주세요:
- 성명 (name)
- 직책/직급 (position): 예: "과장", "팀장", "대표" 등, 없으면 빈칸
- 휴대전화번호/연락처 (phone): "010-0000-0000" 또는 "02-000-0000" 형식으로 정제해서 반환, 없으면 빈칸
- 팩스번호 (fax): 명함에 명시된 팩스번호가 있을 시 "02-000-0000" 형식으로 정제해서 반환, 없으면 빈칸
- 이메일 주소 (email): 이메일 형식으로 반환, 없으면 빈칸
- 회사명 (companyName): 명함의 소속 회사/상호명

반드시 아래 JSON 스키마 규격을 충실히 준수하여 순수 JSON 문자열로만 응답해 주세요. 다른 마크다운 백틱(\`\`\`) 기호나 텍스트, 설명은 절대 포함하지 마세요.

응답 JSON 규격 예시:
{
  "name": "홍길동",
  "position": "팀장",
  "phone": "010-1234-5678",
  "fax": "02-1234-5679",
  "email": "gildong@partner.com",
  "companyName": "주식회사 이지텍"
}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
      const response = await fetchGeminiWithFallback(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: geminiPrompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini OCR API 통신 실패: HTTP ${response.status}`);
      }

      const aiData = await response.json();
      const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

      // AI 토큰 사용량 로깅
      try {
        const prompt_tokens = aiData.usageMetadata?.promptTokenCount || 0;
        const completion_tokens = aiData.usageMetadata?.candidatesTokenCount || 0;
        const total_tokens = aiData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
        const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        await insertRows('ai_token_usage_logs', [{
          id: logId,
          model: selectedModel || 'gemini-3.5-flash',
          purpose: 'PARTNER_CONTACT_OCR',
          prompt_tokens,
          completion_tokens,
          total_tokens,
          created_at: logTime
        }]);
      } catch (e: any) {
        console.error('AI 토큰 로깅 실패:', e.message);
      }

      if (!rawText) {
        throw new Error('Gemini AI로부터 분석 응답을 수신하지 못했습니다.');
      }

      let parsedCard;
      try {
        parsedCard = JSON.parse(rawText.trim());
      } catch (err) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedCard = JSON.parse(jsonMatch[0].trim());
        } else {
          throw new Error('AI 분석 결과의 JSON 포맷이 올바르지 않습니다.');
        }
      }

      const cleanedPhone = normalizePhone(parsedCard.phone || '');
      const cleanedFax = normalizePhone(parsedCard.fax || '');

      return NextResponse.json({
        success: true,
        data: {
          name: parsedCard.name ? parsedCard.name.trim() : '',
          position: parsedCard.position ? parsedCard.position.trim() : '',
          phone: cleanedPhone,
          fax: cleanedFax,
          email: parsedCard.email ? parsedCard.email.trim() : '',
          companyName: parsedCard.companyName ? parsedCard.companyName.trim() : ''
        }
      });
    }

    // 3. Gemini API 사업자등록증 구조화 분석 프롬프트 설계
    const geminiPrompt = `제공된 사업자등록증(이미지 사진 또는 PDF 문서)에서 다음 정보를 정밀하게 판독하여 추출해 주세요:
- 등록번호 (businessNumber): "000-00-00000" 형식으로 정제해서 반환
- 상호/회사명 (companyName)
- 대표자 성명 (representative)
- 사업장 주소/소재지 (address)
- 대표 연락처/전화번호 (phone): 등록증에 명시된 연락처 중 전화번호를 정제해서 "010-0000-0000" 또는 "02-000-0000" 형식으로 반환, 없으면 빈칸
- 팩스번호 (fax): 등록증에 명시된 팩스번호가 있을 시 "02-000-0000" 형식으로 정제해서 반환, 없으면 빈칸
- 실무 이메일 주소 (email): 등록증에 명시된 국세청 신고 및 세금계산서 통보용 전자우편 주소를 추출해 이메일 형식으로 반환, 없으면 빈칸
- 실무 담당자명 (managerName): 공동대표나 인쇄된 유의미한 이름이 있을 시 기재, 없으면 빈칸
- 개업연월일 (openingDate): "YYYY-MM-DD" 형식으로 정제해서 반환, 없으면 빈칸
- 업태 (businessType)
- 종목 (businessItem)

반드시 아래 JSON 스키마 규격을 충실히 준수하여 순수 JSON 문자열로만 응답해 주세요. 다른 마크다운 백틱(\`\`\`) 기호나 텍스트, 설명은 절대 포함하지 마세요.

응답 JSON 규격 예시:
{
  "businessNumber": "123-45-67890",
  "companyName": "주식회사 이지텍",
  "representative": "홍길동",
  "address": "서울특별시 영등포구 양평로 123",
  "phone": "02-1234-5678",
  "fax": "02-1234-5679",
  "email": "contact@easytech.com",
  "managerName": "",
  "openingDate": "2020-05-15",
  "businessType": "제조업",
  "businessItem": "소프트웨어 개발 및 서비스"
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: geminiPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini OCR API 통신 실패: HTTP ${response.status}`);
    }

    const aiData = await response.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    // AI 토큰 사용량 로깅
    try {
      const prompt_tokens = aiData.usageMetadata?.promptTokenCount || 0;
      const completion_tokens = aiData.usageMetadata?.candidatesTokenCount || 0;
      const total_tokens = aiData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('ai_token_usage_logs', [{
        id: logId,
        model: selectedModel || 'gemini-3.5-flash',
        purpose: 'PARTNER_OCR',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }

    if (!rawText) {
      throw new Error('Gemini AI로부터 분석 응답을 수신하지 못했습니다.');
    }

    // AI 결과 JSON 파싱
    let parsedData;
    try {
      parsedData = JSON.parse(rawText.trim());
    } catch (err) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0].trim());
      } else {
        throw new Error('AI 분석 결과의 JSON 포맷이 올바르지 않습니다.');
      }
    }

    // 4. 데이터 정형화/정밀화 처리
    const cleanedNumber = normalizeBusinessNumber(parsedData.businessNumber || '');
    const cleanedPhone = normalizePhone(parsedData.phone || '');
    const cleanedFax = normalizePhone(parsedData.fax || '');

    const ocrInfo = {
      businessNumber: cleanedNumber,
      companyName: parsedData.companyName ? parsedData.companyName.trim() : '',
      representative: parsedData.representative ? parsedData.representative.trim() : '',
      address: parsedData.address ? parsedData.address.trim() : '',
      phone: cleanedPhone,
      fax: cleanedFax,
      email: parsedData.email ? parsedData.email.trim() : '',
      managerName: parsedData.managerName ? parsedData.managerName.trim() : '',
      openingDate: parsedData.openingDate || '',
      businessType: parsedData.businessType || '',
      businessItem: parsedData.businessItem || ''
    };

    // 🛡️ 1차 로컬 체크섬(Checksum) 유효성 공식 검사 구동
    const isChecksumValid = validateBusinessNumberChecksum(ocrInfo.businessNumber);

    // 🛡️ 2차 국세청 실시간 홈택스 가동 상태 API (오픈 API 프록시) 검증 연동
    // DB의 system_settings 테이블 또는 로컬 환경변수에서 국세청 서비스 키 로드
    const ntsKeyRes = await queryTable('system_settings', { filters: { key: 'nts_api_key' } });
    let ntsApiKey = ntsKeyRes.rows && ntsKeyRes.rows.length > 0 ? ntsKeyRes.rows[0].value : null;
    
    if (!ntsApiKey) {
      ntsApiKey = process.env.NTS_BUSINESS_API_KEY || null;
    }

    let ntsVerification = {
      isValidated: false,
      status: 'UNKNOWN', // 'ACTIVE'(계속) | 'SUSPENDED'(휴업) | 'CLOSED'(폐업) | 'NOT_FOUND'(미등록) | 'UNKNOWN'(조회불가)
      statusText: '국세청 실시간 조회 보류 (API 키 미등록)',
      taxType: '',
      closedDate: ''
    };

    // 체크섬이 맞고 국세청 키가 등록되어 있다면 실시간 조회 실행
    if (ntsApiKey && isChecksumValid) {
      try {
        const rawNum = ocrInfo.businessNumber.replace(/\D/g, '');
        const ntsUrl = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${ntsApiKey}`;
        const ntsRes = await fetch(ntsUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ b_no: [rawNum] })
        });

        if (ntsRes.ok) {
          const ntsResData = await ntsRes.json();
          const bizStatus = ntsResData.data?.[0];

          if (bizStatus) {
            let status = 'NOT_FOUND';
            let statusText = '국세청 미등록 사업자';
            if (bizStatus.b_stt_cd === '01') {
              status = 'ACTIVE';
              statusText = '정상 계속사업자 (가동중)';
            } else if (bizStatus.b_stt_cd === '02') {
              status = 'SUSPENDED';
              statusText = `휴업 사업자 (휴업일: ${bizStatus.end_dt || '미상'})`;
            } else if (bizStatus.b_stt_cd === '03') {
              status = 'CLOSED';
              statusText = `폐업 사업자 (폐업일자: ${bizStatus.end_dt || '미상'})`;
            }

            ntsVerification = {
              isValidated: true,
              status,
              statusText,
              taxType: bizStatus.tax_type || '',
              closedDate: bizStatus.end_dt || ''
            };
          }
        }
      } catch (ntsErr) {
        console.error('NTS API verification failure:', ntsErr);
        ntsVerification.statusText = '국세청 API 호출 장애 (네트워크 불안정)';
      }
    }

    // 5. DB 중복 대조 및 변경 변동 감지 스마트 매칭 로직 (대시 유무 상관 없이 replace 처리 대조, DELETE 키워드 SQL 차단 회피를 위한 메모리 필터링)
    const cleanBizNoForMatch = ocrInfo.businessNumber.replace(/\D/g, '');
    let rows: any[] = [];
    try {
      const allPartnersRes = await queryTable('crm_partners', {});
      const allPartners = allPartnersRes.rows || [];
      rows = allPartners.filter((p: any) => 
        !p.deleted_at && 
        (p.business_number || '').replace(/\D/g, '') === cleanBizNoForMatch
      );
    } catch (dbErr) {
      console.error('DB 중복 조회 실패:', dbErr);
    }

    const checksumResult = {
      isValid: isChecksumValid,
      message: isChecksumValid ? '수학적 체크섬 검증 통과' : '존재할 수 없는 무효한 사업자번호 형식입니다.'
    };

    if (rows.length === 0) {
      // 케이스 A: 신규 등록 대상
      return NextResponse.json({
        success: true,
        status: 'NEW_PARTNER',
        data: ocrInfo,
        checksum: checksumResult,
        nts: ntsVerification,
        message: '등록되지 않은 신규 사업자입니다. 안전하게 신규 거래처로 등록할 수 있습니다.'
      });
    }

    // 케이스 B & C: 사업자등록번호가 이미 존재함
    const existingPartner = rows[0];

    // 주요 3대 핵심 정보 변동 여부 판단
    const dbCompanyName = (existingPartner.company_name || '').trim();
    const dbRepresentative = (existingPartner.representative || '').trim();
    const dbAddress = (existingPartner.address || '').trim();

    const isCompanyNameChanged = ocrInfo.companyName !== '' && dbCompanyName !== ocrInfo.companyName;
    const isRepresentativeChanged = ocrInfo.representative !== '' && dbRepresentative !== ocrInfo.representative;
    const isAddressChanged = ocrInfo.address !== '' && dbAddress !== ocrInfo.address;

    const isChanged = isCompanyNameChanged || isRepresentativeChanged || isAddressChanged;

    if (isChanged) {
      // 케이스 B: 대표자/주소/상호명 변동 감지 및 기존 레코드 업데이트 권장
      const diff = {
        companyName: { old: dbCompanyName, new: ocrInfo.companyName, changed: isCompanyNameChanged },
        representative: { old: dbRepresentative, new: ocrInfo.representative, changed: isRepresentativeChanged },
        address: { old: dbAddress, new: ocrInfo.address, changed: isAddressChanged }
      };

      return NextResponse.json({
        success: true,
        status: 'UPDATE_PARTNER',
        data: ocrInfo,
        existingId: existingPartner.id,
        existingType: existingPartner.type,
        diff,
        checksum: checksumResult,
        nts: ntsVerification,
        message: '기존에 이미 가입된 사업자등록번호이나 상호/대표명/주소지 정보의 변동이 감지되었습니다. 기존 이력 유실 없이 갱신 등록하는 것을 권장합니다.'
      });
    }

    // 케이스 C: 기등록 및 100% 동일함
    return NextResponse.json({
      success: true,
      status: 'ALREADY_REGISTERED',
      data: ocrInfo,
      existingId: existingPartner.id,
      existingType: existingPartner.type,
      checksum: checksumResult,
      nts: ntsVerification,
      message: '이미 완전히 동일한 정보로 등록이 완료되어 가동 중인 거래처입니다.'
    });

  } catch (error: any) {
    console.error('Partners License OCR Route Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '서버 내부 에러로 사업자등록증을 스캔하지 못했습니다.'
    }, { status: 500 });
  }
}
