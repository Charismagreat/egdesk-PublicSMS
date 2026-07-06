export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';

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
    throw new Error('문서 분석 권한이 없습니다. 최고관리자 계정으로 로그인해주세요.');
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
  return num;
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
  // 9번째 자리(인덱스 8)는 하단에서 별도 처리되므로, 8번째 자리(인덱스 7)까지만 가중치 곱을 합산합니다.
  for (let i = 0; i < 8; i++) {
    sum += parseInt(clean[i]) * keys[i];
  }
  
  const lastVar = parseInt(clean[8]) * 5;
  sum += Math.floor(lastVar / 10) + (lastVar % 10);
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[9]);
}

export async function POST(req: Request) {
  try {
    // 1. 최고관리자 세션 검증
    await verifySuperAdmin();

    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({
        success: false,
        error: '분석할 문서 이미지 또는 PDF 데이터(Base64)가 누락되었습니다.'
      }, { status: 400 });
    }

    // Base64 데이터에서 mimeType과 순수 데이터 분리
    let mimeType = 'image/png';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const parts = image.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      base64Data = parts[1];
    }

    // 2. DB에서 AI 설정 정보 로드
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: '구글 AI API 키가 시스템에 등록되지 않았습니다. [시스템 설정 > AI 설정]에서 API 키를 먼저 입력해 주세요.'
      }, { status: 400 });
    }

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-3.5-flash';

    // 3. 지능형 하이브리드 OCR 분류/스캔 통합 프롬프트 설계 (멀티 엔티티 탐지 지원)
    const geminiPrompt = `제공된 문서 이미지나 PDF 속에는 여러 장의 명함, 사업자등록증, 영수증(지출 증빙)이 혼재되어 있을 수 있습니다.
각 문서들을 지능적으로 개별 검출하여 detectedItems 배열 안에 순서대로 담아 응답해 주세요.

각 아이템은 다음 3가지 타입 중 하나여야 합니다:
1. 명함 ("BUSINESS_CARD"):
   - data 객체에 name (성명), position (직급/직책), phone (전화번호), email (이메일), companyName (회사명/소속) 추출.
2. 사업자등록증 ("BUSINESS_LICENSE"):
   - data 객체에 businessNumber ("000-00-00000" 형태), companyName (상호명), representative (대표자명), address (주소), phone (전화번호), managerName (담당자명), openingDate (개업일 "YYYY-MM-DD"), businessType (업태), businessItem (종목) 추출.
3. 영수증 ("RECEIPT"):
   - data 객체에 title (상호명과 구매품 요약, 예: "CU - 음료 구매"), category (아래 7대 비목 중 가장 잘 어울리는 중분류 하나만 선택: "복리후생비", "여비교통비", "소모품비", "접대비", "임차료", "세금공과금", "기타"), amount (최종 결제 금액, 숫자로만), expense_date (결제일 "YYYY-MM-DD"), payment_method (결제 수단, 예: "법인카드", "개인카드", "현금", "계좌이체" 등), memo (세부 사항 메모), payee (가맹점명 또는 상호명) 추출.

추출한 값들은 반드시 아래 JSON 스키마 규격을 빈틈없이 준수하여 순수 JSON 문자열로만 응답해 주세요. 다른 마크다운 백틱(\`\`\`) 기호나 텍스트는 절대 포함하지 마세요.

응답 JSON 스펙 예시:
{
  "detectedItems": [
    {
      "itemType": "RECEIPT",
      "data": {
        "title": "CU 시흥배골프라자점 - 음료 구매",
        "category": "복리후생비",
        "amount": 2200,
        "expense_date": "2024-05-22",
        "payment_method": "법인카드",
        "memo": "레쓰비그란데라떼 구매",
        "payee": "CU 시흥배골프라자점"
      }
    },
    {
      "itemType": "BUSINESS_CARD",
      "data": {
        "name": "이호정",
        "position": "대리",
        "phone": "010-3333-0113",
        "email": "ibk42536@ibk.co.kr",
        "companyName": "IBK기업은행"
      }
    }
  ]
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
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
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini 하이브리드 OCR API 통신 실패: HTTP ${response.status}`);
    }

    const aiData = await response.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini AI로부터 분석 응답을 수신하지 못했습니다.');
    }

    // 🛡️ AI API 토큰 실시간 모니터링 및 호출 토큰 감사록 기록 적재
    try {
      const u = aiData.usageMetadata || {};
      const promptTokens = u.promptTokenCount || 0;
      const completionTokens = u.candidatesTokenCount || 0;
      const totalTokens = u.totalTokenCount || 0;

      if (totalTokens > 0) {
        await insertRows('ai_token_usage_logs', [{
          model_name: selectedModel,
          task_purpose: 'EASYBOT_OCR_SCAN',
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (logErr) {
      console.error('이지봇 OCR AI 토큰 사용량 감사 로그 적재 실패:', logErr);
    }

    // AI 추출 데이터 JSON 파싱
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText.trim());
    } catch (err) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0].trim());
      } else {
        throw new Error('AI 하이브리드 분석 응답 포맷이 올바르지 않습니다.');
      }
    }

    // 4. 멀티 엔티티 데이터 파싱 및 보정 루프 처리
    let detectedItems = parsedResult.detectedItems || [];
    
    // 레거시 단일 응답에 대한 하위 호환성 보장
    if (detectedItems.length === 0 && parsedResult.fileType) {
      if (parsedResult.fileType === 'BUSINESS_CARD') {
        detectedItems.push({
          itemType: 'BUSINESS_CARD',
          data: parsedResult.cardData || {}
        });
      } else if (parsedResult.fileType === 'BUSINESS_LICENSE') {
        detectedItems.push({
          itemType: 'BUSINESS_LICENSE',
          data: parsedResult.licenseData || {}
        });
      }
    }

    // 국세청 검증용 API 키 로드
    const ntsKeyRes = await queryTable('system_settings', { filters: { key: 'nts_api_key' } });
    let ntsApiKey = ntsKeyRes.rows && ntsKeyRes.rows.length > 0 ? ntsKeyRes.rows[0].value : null;
    if (!ntsApiKey) {
      ntsApiKey = process.env.NTS_BUSINESS_API_KEY || null;
    }

    const processedItems = [];

    for (const item of detectedItems) {
      // 명함 처리 분기
      if (item.itemType === 'BUSINESS_CARD') {
        const cardData = item.data || {};
        const cleanedPhone = normalizePhone(cardData.phone || '');

        const parsedCard = {
          name: cardData.name ? cardData.name.trim() : '',
          position: cardData.position ? cardData.position.trim() : '',
          phone: cleanedPhone,
          email: cardData.email ? cardData.email.trim() : '',
          companyName: cardData.companyName ? cardData.companyName.trim() : ''
        };

        const partnerRes = await queryTable('crm_partners', { filters: { company_name: parsedCard.companyName } });
        let partnerId = partnerRes.rows && partnerRes.rows.length > 0 ? partnerRes.rows[0].id : null;

        if (!partnerId && parsedCard.companyName) {
          const fuzzyRes = await queryTable('crm_partners', {});
          const match = fuzzyRes.rows.find((p: any) => p.company_name.includes(parsedCard.companyName) || parsedCard.companyName.includes(p.company_name));
          if (match) partnerId = match.id;
        }

        let actionType = 'new_contact';
        let existingContactId = null;
        let existingContact = null;

        const contactsRes = await queryTable('crm_partner_contacts', { filters: { name: parsedCard.name, is_active: 1 } });
        const activeContacts = contactsRes.rows || [];

        if (activeContacts.length > 0) {
          const contact = activeContacts[0];
          existingContact = contact;
          const contactPartnerRes = await queryTable('crm_partners', { filters: { id: contact.partner_id } });
          const currentCompanyName = contactPartnerRes.rows && contactPartnerRes.rows.length > 0 ? contactPartnerRes.rows[0].company_name : '';

          if (currentCompanyName === parsedCard.companyName) {
            actionType = 'update_info';
            existingContactId = contact.id;
          } else {
            actionType = 'career_transition';
            existingContactId = contact.id;
          }
        }

        processedItems.push({
          itemType: 'BUSINESS_CARD',
          data: parsedCard,
          partnerId,
          actionType,
          existingContactId,
          existingContact
        });

      // 사업자등록증 처리 분기
      } else if (item.itemType === 'BUSINESS_LICENSE') {
        const licenseData = item.data || {};
        const cleanedBizNumber = normalizeBusinessNumber(licenseData.businessNumber || '');
        const cleanedLicensePhone = normalizePhone(licenseData.phone || '');

        const ocrInfo = {
          businessNumber: cleanedBizNumber,
          companyName: licenseData.companyName ? licenseData.companyName.trim() : '',
          representative: licenseData.representative ? licenseData.representative.trim() : '',
          address: licenseData.address ? licenseData.address.trim() : '',
          phone: cleanedLicensePhone,
          managerName: licenseData.managerName ? licenseData.managerName.trim() : '',
          openingDate: licenseData.openingDate || '',
          businessType: licenseData.businessType || '',
          businessItem: licenseData.businessItem || ''
        };

        const isChecksumValid = validateBusinessNumberChecksum(ocrInfo.businessNumber);

        let ntsVerification = {
          isValidated: false,
          status: 'UNKNOWN',
          statusText: '국세청 실시간 조회 보류 (API 키 미등록)',
          taxType: '',
          closedDate: ''
        };

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
            console.error('NTS API Error in loop:', ntsErr);
            ntsVerification.statusText = '국세청 API 호출 실패 (서버 연결 불안정)';
          }
        }

        const existingPartnersRes = await queryTable('crm_partners', {
          filters: { business_number: ocrInfo.businessNumber }
        });
        const rows = existingPartnersRes.rows || [];

        const checksumResult = {
          isValid: isChecksumValid,
          message: isChecksumValid ? '체크섬 공식 통과' : '잘못된 사업자번호 형식'
        };

        if (rows.length === 0) {
          processedItems.push({
            itemType: 'BUSINESS_LICENSE',
            status: 'NEW_PARTNER',
            data: ocrInfo,
            checksum: checksumResult,
            nts: ntsVerification
          });
        } else {
          const existingPartner = rows[0];
          const dbCompanyName = (existingPartner.company_name || '').trim();
          const dbRepresentative = (existingPartner.representative || '').trim();
          const dbAddress = (existingPartner.address || '').trim();

          const isCompanyNameChanged = ocrInfo.companyName !== '' && dbCompanyName !== ocrInfo.companyName;
          const isRepresentativeChanged = ocrInfo.representative !== '' && dbRepresentative !== ocrInfo.representative;
          const isAddressChanged = ocrInfo.address !== '' && dbAddress !== ocrInfo.address;

          const isChanged = isCompanyNameChanged || isRepresentativeChanged || isAddressChanged;

          if (isChanged) {
            const diff = {
              companyName: { old: dbCompanyName, new: ocrInfo.companyName, changed: isCompanyNameChanged },
              representative: { old: dbRepresentative, new: ocrInfo.representative, changed: isRepresentativeChanged },
              address: { old: dbAddress, new: ocrInfo.address, changed: isAddressChanged }
            };

            processedItems.push({
              itemType: 'BUSINESS_LICENSE',
              status: 'UPDATE_PARTNER',
              data: ocrInfo,
              existingId: existingPartner.id,
              existingType: existingPartner.type,
              diff,
              checksum: checksumResult,
              nts: ntsVerification
            });
          } else {
            processedItems.push({
              itemType: 'BUSINESS_LICENSE',
              status: 'ALREADY_REGISTERED',
              data: ocrInfo,
              existingId: existingPartner.id,
              existingType: existingPartner.type,
              checksum: checksumResult,
              nts: ntsVerification
            });
          }
        }

      // 영수증 처리 분기
      } else if (item.itemType === 'RECEIPT') {
        const receiptData = item.data || {};
        processedItems.push({
          itemType: 'RECEIPT',
          data: {
            title: receiptData.title || '',
            category: receiptData.category || '복리후생비',
            amount: Number(receiptData.amount) || 0,
            expense_date: receiptData.expense_date || new Date().toISOString().slice(0, 10),
            payment_method: receiptData.payment_method || '법인카드',
            memo: receiptData.memo || '',
            payee: receiptData.payee || receiptData.merchant || ''
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      detectedItems: processedItems
    });

  } catch (error: any) {
    console.error("EasyBot OCR Route Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
