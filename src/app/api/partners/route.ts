export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows, executeSQL } from '../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

async function getUserTenantId() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return 'default';
    const payload = decodeJwt(token);
    return (payload.tenant_id as string) || 'default';
  } catch {
    return 'default';
  }
}



/**
 * ⚡ 이지데스크 user_data_query 툴의 내부 1000개 수신 한계(Clamping Limit)를 우회하기 위해
 * offset 페이징 처리를 하여 전체 데이터를 안전하게 합산해 로드해주는 헬퍼 함수입니다.
 * (순수 queryTable 헬퍼만 사용하며, offset 오작동에 따른 무한 루프를 방지하기 위해 이중 안전 가드가 내장되어 있습니다.)
 */
async function queryTableAll(
  tableName: string,
  options: { filters?: Record<string, string> } = {}
) {
  let allRows: any[] = [];
  let offset = 0;
  const limit = 1000;
  const seenIds = new Set<string>();
  let iteration = 0;
  const maxIterations = 30; // 최대 3만 건 제한 가드 (무한루프 방지)

  while (iteration < maxIterations) {
    iteration++;
    const res = await queryTable(tableName, {
      ...options,
      limit,
      offset
    });
    const rows = res.rows || [];
    if (rows.length === 0) {
      break;
    }

    let hasNewData = false;
    for (const r of rows) {
      // deleted_at 이 걸려있는 레코드는 필터링 (소프트 삭제 규정 준수)
      if (r.deleted_at) continue;

      const idKey = r.id ? String(r.id) : JSON.stringify(r);
      if (!seenIds.has(idKey)) {
        seenIds.add(idKey);
        allRows.push(r);
        hasNewData = true;
      }
    }

    // 만약 새로 긁어온 1000개 중 이전에 보지 못한 새로운 데이터가 하나도 없거나
    // limit 개수 미만으로 데이터를 긁어왔다면 더 이상 데이터가 없는 것으로 판별하여 루프 종료
    if (!hasNewData || rows.length < limit) {
      break;
    }

    offset += limit;
  }

  return { success: true, rows: allRows };
}

/**
 * 📇 B2B 거래처 담당자(명함첩) 데이터 힐링 헬퍼
 * crm_partner_contacts 테이블에 잘못 들어간 임시 문자열 ID(P_ 또는 PT-) 혹은 상호명(company_name)을
 * 매치되는 crm_partners의 실제 정수형 id로 자동 보정합니다.
 */
async function healPartnerContactsData() {
  try {
    const contactsRes = await queryTableAll('crm_partner_contacts');
    const contacts = contactsRes.rows || [];
    
    const partnersRes = await queryTableAll('crm_partners');
    const partners = partnersRes.rows || [];

    // ID 최대값 계산 (루프 밖에서 1회만 계산)
    let nextContactId = contacts.length > 0 
      ? Math.max(...contacts.map((c: any) => parseInt(c.id) || 0)) + 1 
      : 1;

    for (const contact of contacts) {
      if (contact.deleted_at) continue;
      
      const pid = String(contact.partner_id || '').trim();
      if (!pid) continue;
      
      // partner_id가 순수 정수형(숫자)이 아닌 경우 데이터 힐링 가동
      const isIntegerId = /^\d+$/.test(pid);
      if (!isIntegerId) {
        let targetPartner = null;

        // 1. partner_id에 거래처 상호명(company_name)이 직접 대입되어 있는 경우
        targetPartner = partners.find(p => p.company_name === pid);

        // 2. partner_id에 임시 생성 문자열 ID(P_ 또는 PT-)가 대입되어 있는 경우
        if (!targetPartner && (pid.startsWith('P_') || pid.startsWith('PT-'))) {
          // crm_partners 테이블에 혹시 해당 임시 ID가 그대로 존재하는지 1차 대조
          const matchedById = partners.find(p => String(p.id) === pid);
          if (matchedById) {
            targetPartner = matchedById;
          } else {
            // 임시 ID가 유실되었거나 재생성되었다면, 담당자 이름이나 상호명을 대조하여 매치
            targetPartner = partners.find(p => p.manager_name === contact.name || p.representative === contact.name);
          }
        }

        // 매치되는 실제 정수형 거래처 id를 찾았다면 업데이트로 복구 보정 실행
        if (targetPartner && targetPartner.id) {
          const correctId = String(targetPartner.id);
          await updateRows('crm_partner_contacts', 
            { partner_id: correctId }, 
            { filters: { id: contact.id } }
          );
          console.log(`✓ [B2B 담당자 데이터 힐링] 담당자 '${contact.name}'의 partner_id를 '${pid}' ➡️ 정수 ID '${correctId}'로 업데이트 완료`);
        }
      }
    }

    // ────────────────────────────────────────────────────────
    // [보충 힐링] 3. crm_partners의 manager_name(대표담당자)은 기재되어 있는데 crm_partner_contacts에 해당 이름이 없는 경우 자동 백필 생성
    // ────────────────────────────────────────────────────────
    for (const partner of partners) {
      if (partner.deleted_at) continue;
      
      const mName = (partner.manager_name || '').trim();
      if (!mName || mName === '미지정') continue;

      // 이 거래처 소속으로 저장된 담당자 중 해당 이름(mName)을 가진 담당자가 존재하는지 확인
      const matchedContacts = contacts.filter(c => 
        !c.deleted_at && 
        String(c.partner_id) === String(partner.id) && 
        c.name === mName
      );

      // 없다면 대표담당자 명함 레코드 자동 백필 생성 실행
      if (matchedContacts.length === 0) {
        console.log(`[담당자 미보유 복구 대상] 거래처: ${partner.company_name}, 대표담당자명: ${mName}`);
        
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const newContact = {
          id: nextContactId,
          partner_id: String(partner.id),
          name: mName,
          position: partner.manager_position || '대표담당자',
          phone: partner.manager_phone || partner.phone || '',
          email: partner.manager_email || partner.email || '',
          is_primary: 1, // 대표담당자로 강제 지정
          created_at: nowStr
        };

        // crm_partner_contacts 에 자동 생성 인서트
        await insertRows('crm_partner_contacts', [newContact]);
        
        // 메모리 상의 캐시도 동기화하여 이후 중복 생성을 원천 방지
        contacts.push(newContact);
        nextContactId++;

        console.log(`✓ [데이터 복구 완료] 거래처 '${partner.company_name}' 소속 대표담당자 '${mName}' 님 레코드를 crm_partner_contacts 에 자동 백필 완료.`);
      }
    }
  } catch (err: any) {
    console.error('B2B 담당자 데이터 힐링 실패:', err.message);
  }
}

/**
 * GET: 거래처 목록 조회 및 상세 누적 수/발주 실적 연산
 */
export async function GET(req: Request) {
  try {
    // 백그라운드 데이터 힐링 프로세스 기동 (타입 Affinity 및 이전 임시 ID로 인한 외래키 매칭 깨짐 자동 보정)
    await healPartnerContactsData();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    const business_number = searchParams.get('business_number');

    // ────────────────────────────────────────────────────────
    // 0-0. 기존 명함 대장 조회 (AI 추천용)
    // ────────────────────────────────────────────────────────
    if (action === 'contacts') {
      const contactsRes = await queryTableAll('crm_partner_contacts');
      const contacts = (contactsRes.rows || []).filter((c: any) => !c.deleted_at);
      return NextResponse.json({ success: true, contacts });
    }

    // ────────────────────────────────────────────────────────
    // 0. 사업자등록번호로 기존 파트너가 있는지 실시간 조회 (중복 가입 방지)
    // ────────────────────────────────────────────────────────
    if (action === 'check-biz' && business_number) {
      // 1. system_settings에 저장된 우리 회사 사업자등록번호(company_business_number) 확인
      const cleanBizNo = business_number.replace(/[^0-9]/g, '');
      const ourBizRes = await queryTable('system_settings', { filters: { key: 'company_business_number' } });
      const ourBizVal = ourBizRes.rows?.[0]?.value || '';
      const cleanOurBizVal = ourBizVal.replace(/[^0-9]/g, '');

      if (cleanOurBizVal && cleanBizNo === cleanOurBizVal) {
        // 본사 회사명도 조회
        const ourNameRes = await queryTable('system_settings', { filters: { key: 'company_name' } });
        const ourNameVal = ourNameRes.rows?.[0]?.value || '우리 회사 (본사)';
        return NextResponse.json({ 
          success: true, 
          exists: true, 
          is_our_company: true,
          partner: {
            company_name: ourNameVal,
            business_number: ourBizVal,
            type: 'HEAD_QUARTERS',
            memo: '시스템에 등록된 본사(우리 회사) 정보입니다.'
          } 
        });
      }

      let partners: any[] = [];
      try {
        const allPartnersRes = await queryTableAll('crm_partners');
        const allPartners = allPartnersRes.rows || [];
        partners = allPartners.filter((p: any) => 
          !p.deleted_at && 
          (p.business_number || '').replace(/\D/g, '') === cleanBizNo
        );
      } catch (dbErr) {
        console.error('DB check-biz 조회 실패:', dbErr);
      }
      
      if (partners.length > 0) {
        return NextResponse.json({ success: true, exists: true, partner: partners[0] });
      } else {
        return NextResponse.json({ success: true, exists: false });
      }
    }

    // ────────────────────────────────────────────────────────
    // 1. 거래처 상세 보기 및 수/발주 타임라인 이력 조인 마이닝
    // ────────────────────────────────────────────────────────
    if (action === 'detail' && id) {
      const partnerRes = await queryTable('crm_partners', { filters: { id } });
      if (!partnerRes.rows || partnerRes.rows.length === 0 || partnerRes.rows[0].deleted_at) {
        return NextResponse.json({ success: false, error: '존재하지 않는 거래처이거나 삭제되었습니다.' }, { status: 404 });
      }
      const partner = partnerRes.rows[0];

      // 해당 거래처 상호명으로 연동된 발주 내역 마이닝
      let purchaseOrders = [];
      try {
        const poQuery = `SELECT * FROM crm_purchase_orders WHERE vendor_name = '${partner.company_name}' AND deleted_at IS NULL ORDER BY created_at DESC`;
        purchaseOrders = await executeSQL(poQuery) || [];
        if (purchaseOrders && (purchaseOrders as any).rows) {
          purchaseOrders = (purchaseOrders as any).rows;
        }
      } catch (err) {
        console.error('PO 마이닝 실패:', err);
      }

      // 해당 거래처 상호명으로 연동된 수주 내역 마이닝
      let salesOrders = [];
      try {
        const soQuery = `SELECT * FROM crm_sales_orders WHERE customer_name = '${partner.company_name}' AND deleted_at IS NULL ORDER BY created_at DESC`;
        salesOrders = await executeSQL(soQuery) || [];
        if (salesOrders && (salesOrders as any).rows) {
          salesOrders = (salesOrders as any).rows;
        }
      } catch (err) {
        console.error('SO 마이닝 실패:', err);
      }

      // 해당 거래처에 등록된 담당자(명함첩) 목록 조회 (SQLite 타입 Affinity로 인한 문자/숫자 분리 조회 병합)
      let contacts = [];
      try {
        const resStr = await queryTable('crm_partner_contacts', { filters: { partner_id: String(partner.id) } });
        const listStr = (resStr.rows || []).filter((c: any) => !c.deleted_at);

        let listNum: any[] = [];
        if (!isNaN(Number(partner.id))) {
          const resNum = await queryTable('crm_partner_contacts', { filters: { partner_id: Number(partner.id) as any } });
          listNum = (resNum.rows || []).filter((c: any) => !c.deleted_at);
        }

        const ids = new Set(listStr.map((c: any) => c.id));
        contacts = [...listStr];
        for (const c of listNum) {
          if (!ids.has(c.id)) {
            contacts.push(c);
          }
        }
      } catch (err) {
        console.error('담당자 목록 로드 실패:', err);
      }

      return NextResponse.json({
        success: true,
        partner,
        purchaseOrders,
        salesOrders,
        contacts
      });
    }

    // ────────────────────────────────────────────────────────
    // 2. 전체 거래처 리스트 조회 및 실시간 거래 지표 합계 산출
    // ────────────────────────────────────────────────────────
    const tenantId = await getUserTenantId();

    const partnerFilters: any = {};
    if (tenantId && tenantId !== 'all') {
      partnerFilters.tenant_id = tenantId;
    }

    const partnersRes = await queryTableAll('crm_partners', { filters: partnerFilters });
    const partners = (partnersRes.rows || []).filter((pt: any) => !pt.deleted_at);

    // 각 거래처별 수/발주 총 거래액을 집계하기 위해 전체 발주/수주 테이블 마이닝 (해당 테넌트 격리)
    let allPos: any[] = [];
    let allSos: any[] = [];
    try {
      const filterObj = (tenantId && tenantId !== 'all') ? { tenant_id: tenantId } : {};
      const poRes = await queryTableAll('crm_purchase_orders', { filters: filterObj });
      allPos = (poRes.rows || []).filter((r: any) => !r.deleted_at);
      
      const soRes = await queryTableAll('crm_sales_orders', { filters: filterObj });
      allSos = (soRes.rows || []).filter((r: any) => !r.deleted_at);
    } catch (e) {
      console.error('SCM 집계용 베이스 마이닝 지연:', e);
    }

    // 실시간 직급 및 모든 담당자 리스트 마이닝
    let allContacts: any[] = [];
    let primaryContacts: any[] = [];
    try {
      const contactsRes = await queryTableAll('crm_partner_contacts');
      allContacts = (contactsRes.rows || []).filter((c: any) => !c.deleted_at);
      primaryContacts = allContacts.filter((c: any) => Number(c.is_primary) === 1);
    } catch (e) {
      console.error('담당자 마이닝 지연:', e);
    }

    // 실시간 분석 지표 융합
    const enrichedPartners = partners.map((pt: any) => {
      const companyName = pt.company_name;

      // 소속된 전체 담당자 리스트 필터링
      const partnerContacts = allContacts.filter(c => String(c.partner_id) === String(pt.id));

      // 대표 담당자 정보 실시간 바인딩 (id 매칭)
      const primaryContact = primaryContacts.find(c => String(c.partner_id) === String(pt.id));
      const manager_name = primaryContact ? primaryContact.name : (pt.manager_name || "");
      const manager_phone = primaryContact ? (primaryContact.phone || "") : (pt.manager_phone || "");
      const manager_position = primaryContact ? (primaryContact.position || "") : (pt.manager_position || "");
      const manager_email = primaryContact ? (primaryContact.email || "") : (pt.manager_email || "");

      const isVendor = pt.type && pt.type.split(',').includes('VENDOR');

      if (isVendor) {
        // 공급사: 총 발주(매입) 실적 연산
        const filteredPos = allPos.filter(po => po.vendor_name === companyName);
        const totalPurchased = filteredPos.reduce((sum, po) => sum + (parseInt(po.total_amount) || 0), 0);
        const pendingInboundCount = filteredPos.filter(po => po.status === 'PENDING_INBOUND').length;
        
        return {
          ...pt,
          contacts: partnerContacts,
          manager_name,
          manager_phone,
          manager_position,
          manager_email,
          total_performance: totalPurchased,
          pending_count: pendingInboundCount
        };
      } else {
        // 바이어: 총 수주(매출) 실적 연산
        const filteredSos = allSos.filter(so => so.customer_name === companyName);
        const totalSales = filteredSos.reduce((sum, so) => sum + (parseInt(so.total_amount) || 0), 0);
        const registeredCount = filteredSos.filter(so => so.status === 'REGISTERED').length;
 
        return {
          ...pt,
          contacts: partnerContacts,
          manager_name,
          manager_phone,
          manager_position,
          manager_email,
          total_performance: totalSales,
          pending_count: registeredCount
        };
      }
    });

    return NextResponse.json({
      success: true,
      partners: enrichedPartners
    });

  } catch (error: any) {
    console.error('API partners GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 신규 거래처 등록
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const tenantId = await getUserTenantId();

    // 1. 대량 일괄 등록 (Bulk Import) 처리 분기
    if (body.partners && Array.isArray(body.partners)) {
      const { partners } = body;
      const validPartners = partners.filter((pt: any) => pt.company_name?.trim() && pt.type?.trim());

      if (validPartners.length === 0) {
        return NextResponse.json({ success: false, error: '등록할 유효한 거래처 데이터가 존재하지 않습니다.' }, { status: 400 });
      }

      // 기존 데이터 조회 (상호명 기준 중복 차단 및 역할 병합용)
      const existingRes = await queryTableAll('crm_partners');
      const existingList = existingRes.rows || [];
      
      // 상호명을 Key로 기존 파트너 정보를 매핑하는 Map 생성
      const existingPartnerMap = new Map<string, any>();
      for (const p of existingList) {
        if (p.company_name) {
          existingPartnerMap.set(String(p.company_name).trim(), p);
        }
      }

      const baseTime = Date.now();
      const rowsToInsert = [];
      const rowsToUpdate = []; // 기존 역할에 더해 새로운 거래처 구분이 추가된 거래처 리스트
      
      // ⚡ 이번 엑셀 내에서 신규 삽입 대상으로 분류된 상호명 매핑 Map
      const newInsertedMap = new Map<string, any>();
      let idx = 1;

      for (const pt of validPartners) {
        const companyName = pt.company_name.trim();
        const newType = pt.type || 'BUYER';

        // 1. 기존 데이터베이스에 이미 존재하는 거래처인 경우 (역할 병합)
        if (existingPartnerMap.has(companyName)) {
          const existingPt = existingPartnerMap.get(companyName);
          const existingTypes = (existingPt.type || '').split(',').map((t: string) => t.trim()).filter(Boolean);
          const newTypes = newType.split(',').map((t: string) => t.trim()).filter(Boolean);
          
          const mergedTypesSet = new Set([...existingTypes, ...newTypes]);
          const mergedTypeStr = Array.from(mergedTypesSet).join(',');

          // 역할 구분에 변화가 생긴 경우 (역할 승격/겸업 확장)
          if (mergedTypeStr !== existingPt.type) {
            rowsToUpdate.push({
              id: existingPt.id,
              company_name: companyName,
              newType: mergedTypeStr
            });
            existingPt.type = mergedTypeStr;
          }
          continue;
        }

        // 2. ⚡ 이번 엑셀 파일 자체 내에서 앞서 신규 삽입 예정으로 분류된 거래처인 경우 (메모리상 역할 병합)
        if (newInsertedMap.has(companyName)) {
          const insertTarget = newInsertedMap.get(companyName);
          const existingTypes = (insertTarget.type || '').split(',').map((t: string) => t.trim()).filter(Boolean);
          const newTypes = newType.split(',').map((t: string) => t.trim()).filter(Boolean);
          
          const mergedTypesSet = new Set([...existingTypes, ...newTypes]);
          const mergedTypeStr = Array.from(mergedTypesSet).join(',');
          
          // 메모리상 삽입 예정 대상의 type 필드를 직접 겸업(VENDOR,BUYER)으로 확장
          insertTarget.type = mergedTypeStr;
          continue;
        }

        // 3. 완전히 새로운 거래처인 경우 신규 등록 처리
        const partnerId = `PT-${baseTime}-${idx}`;
        const newRow = {
          id: partnerId,
          type: newType,
          company_name: companyName,
          business_number: pt.business_number || '',
          representative: pt.representative || '',
          phone: pt.phone || '',
          fax: pt.fax || '',
          manager_name: pt.manager_name || '',
          manager_phone: pt.manager_phone || '',
          manager_position: pt.manager_position || '',
          manager_email: pt.manager_email || '',
          email: pt.email || '',
          address: pt.address || '',
          vip_level: pt.vip_level || 'NORMAL',
          credit_limit: parseInt(pt.credit_limit as any) || 0,
          business_license_url: '',
          memo: pt.memo || '',
          created_at: nowStr,
          tenant_id: tenantId
        };
        rowsToInsert.push(newRow);
        newInsertedMap.set(companyName, newRow); // 이번 엑셀 삽입 추적 Map에 등록
        idx++;
      }

      if (rowsToInsert.length === 0 && rowsToUpdate.length === 0) {
        return NextResponse.json({ success: true, addedCount: 0, message: '모든 거래처가 이미 동일한 역할로 등록되어 있어 추가/변경된 내역이 없습니다.' });
      }

      // 1. 역할이 확장된 겸업 거래처들 일괄 업데이트 실행 (순수 egdesk-helpers.ts의 updateRows 사용)
      if (rowsToUpdate.length > 0) {
        for (const up of rowsToUpdate) {
          await updateRows('crm_partners', 
            { type: up.newType }, 
            { filters: { id: up.id } }
          );
          console.log(`✓ [B2B 겸업 거래처 승격] 거래처 '${up.company_name}'의 역할을 '${up.newType}'(으)로 병합 업데이트 완료.`);
        }
      }

      // 2. 신규 거래처 일괄 인서트 실행 (SQLite 변수 초과 방지 55개 단위 청킹)
      const chunkSize = 55;
      if (rowsToInsert.length > 0) {
        for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
          const chunk = rowsToInsert.slice(i, i + chunkSize);
          await insertRows('crm_partners', chunk);
        }
      }

      // 3. 추가로 crm_partner_contacts 에 대표담당자 동시 백필
      const contactsToInsert = [];
      const contactsResForMax = await queryTableAll('crm_partner_contacts');
      const currentAllContacts = contactsResForMax.rows || [];
      let nextContactId = currentAllContacts.length > 0 
        ? Math.max(...currentAllContacts.map((c: any) => parseInt(c.id) || 0)) + 1 
        : 1;

      for (const row of rowsToInsert) {
        if (row.manager_name && row.manager_name.trim() !== '' && row.manager_name.trim() !== '미지정') {
          contactsToInsert.push({
            id: nextContactId,
            partner_id: String(row.id),
            name: row.manager_name,
            position: row.manager_position || '대표담당자',
            phone: row.manager_phone || row.phone || '',
            email: row.manager_email || row.email || '',
            is_primary: 1,
            created_at: nowStr
          });
          nextContactId++;
        }
      }

      if (contactsToInsert.length > 0) {
        for (let i = 0; i < contactsToInsert.length; i += chunkSize) {
          const chunk = contactsToInsert.slice(i, i + chunkSize);
          await insertRows('crm_partner_contacts', chunk);
        }
      }

      // 신규 등록된 개수와 역할이 병합/업데이트된 개수를 통합하여 최종 반환
      const totalProcessedCount = rowsToInsert.length + rowsToUpdate.length;
      return NextResponse.json({ success: true, addedCount: totalProcessedCount });
    }

    // 2. 단일 거래처 등록 (기존 하위 호환성 유지)
    const { 
      type, 
      company_name, 
      business_number = '', 
      representative = '', 
      phone = '', 
      fax = '',
      manager_name = '', 
      manager_phone = '', 
      manager_email = '',
      email = '', 
      address = '', 
      vip_level = 'NORMAL', 
      credit_limit = 0, 
      business_license_url = '', 
      memo = '' 
    } = body;

    const finalType = Array.isArray(type) ? type.join(',') : (type || '');

    if (!finalType || !company_name) {
      return NextResponse.json({ success: false, error: '거래처 구분과 상호명은 필수 입력 항목입니다.' }, { status: 400 });
    }

    const partnerId = `PT-${Date.now()}`;

    await insertRows('crm_partners', [{
      id: partnerId,
      type: finalType,
      company_name,
      business_number,
      representative,
      phone,
      fax,
      manager_name,
      manager_phone,
      manager_email,
      email,
      address,
      vip_level,
      credit_limit: parseInt(credit_limit as any) || 0,
      business_license_url,
      memo,
      created_at: nowStr,
      tenant_id: tenantId
    }]);

    return NextResponse.json({
      success: true,
      message: '새로운 B2B 거래처가 정상 등록되었습니다.',
      partnerId
    });

  } catch (error: any) {
    console.error('API partners POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT: 거래처 정보 수정
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { 
      id,
      type,
      company_name, 
      business_number, 
      representative, 
      phone, 
      fax,
      manager_name, 
      manager_phone, 
      manager_email,
      email, 
      address, 
      vip_level, 
      custom_vip_rate,
      credit_limit, 
      memo 
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '수정할 거래처 식별 코드(id)가 누락되었습니다.' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (type !== undefined) {
      updates.type = Array.isArray(type) ? type.join(',') : type;
    }
    if (company_name !== undefined) updates.company_name = company_name;
    if (business_number !== undefined) updates.business_number = business_number;
    if (representative !== undefined) updates.representative = representative;
    if (phone !== undefined) updates.phone = phone;
    if (fax !== undefined) updates.fax = fax;
    if (manager_name !== undefined) updates.manager_name = manager_name;
    if (manager_phone !== undefined) updates.manager_phone = manager_phone;
    if (manager_email !== undefined) updates.manager_email = manager_email;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (vip_level !== undefined) updates.vip_level = vip_level;
    if (credit_limit !== undefined) updates.credit_limit = parseInt(credit_limit as any) || 0;
    if (memo !== undefined) updates.memo = memo;

    await updateRows('crm_partners', updates, { filters: { id } });

    return NextResponse.json({
      success: true,
      message: '거래처 회원 정보가 실시간으로 성공적으로 갱신되었습니다.'
    });

  } catch (error: any) {
    console.error('API partners PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: 거래처 삭제
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 거래처 식별 코드(id)가 누락되었습니다.' }, { status: 400 });
    }

    await deleteRows('crm_partners', { filters: { id } });

    return NextResponse.json({
      success: true,
      message: '해당 B2B 거래처 정보가 안전하게 영구 삭제되었습니다.'
    });

  } catch (error: any) {
    console.error('API partners DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
