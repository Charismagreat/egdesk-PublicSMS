export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../../egdesk-helpers';

/**
 * B2B 대표 담당자 정보를 거래처(crm_partners) 마스터 테이블과 실시간 동기화하는 공통 헬퍼
 */
async function syncPrimaryContactToPartner(partnerId: string) {
  try {
    // 1. 해당 거래처의 모든 담당자 리스트를 조회 (SQLite 타입 Affinity 이슈 대응을 위해 문자/숫자 분리 조회 병합)
    const resStr = await queryTable('crm_partner_contacts', { filters: { partner_id: String(partnerId) } });
    const listStr = (resStr.rows || []).filter((c: any) => !c.deleted_at);

    let listNum: any[] = [];
    if (!isNaN(Number(partnerId))) {
      const resNum = await queryTable('crm_partner_contacts', { filters: { partner_id: Number(partnerId) as any } });
      listNum = (resNum.rows || []).filter((c: any) => !c.deleted_at);
    }

    const ids = new Set(listStr.map((c: any) => c.id));
    const contacts = [...listStr];
    for (const c of listNum) {
      if (!ids.has(c.id)) {
        contacts.push(c);
      }
    }

    // 2. 대표 담당자(is_primary === 1) 찾기
    const primaryContact = contacts.find((c: any) => Number(c.is_primary) === 1);

    // 3. 거래처 마스터 조회 (상호명 획득)
    const partnerRes = await queryTable('crm_partners', { filters: { id: String(partnerId) } });
    const partner = partnerRes.rows?.[0];

    // 4. PK 타입 매칭 우회를 위해 상호명(company_name)을 필터로 삼아 업데이트 실행
    if (partner && partner.company_name) {
      if (primaryContact) {
        // 대표자가 있는 경우 거래처 정보 동기화 업데이트 (manager_name, manager_phone, manager_position, manager_email)
        await updateRows('crm_partners', {
          manager_name: primaryContact.name,
          manager_phone: primaryContact.phone || '',
          manager_position: primaryContact.position || '',
          manager_email: primaryContact.email || ''
        }, { filters: { company_name: partner.company_name } });
      } else {
        // 대표 담당자가 아예 해제되었거나 없는 경우 공란 처리
        await updateRows('crm_partners', {
          manager_name: '',
          manager_phone: '',
          manager_position: '',
          manager_email: ''
        }, { filters: { company_name: partner.company_name } });
      }
    }
  } catch (err: any) {
    console.error(`B2B 거래처 담당자 정보 동기화 실패 (partner_id: ${partnerId}):`, err);
  }
}

/**
 * POST: B2B 담당자 등록
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partner_id, name, position = '', phone = '', email = '', card_image_url = '', is_primary = 0 } = body;

    if (!partner_id || !name) {
      return NextResponse.json({ success: false, error: '소속 거래처 코드와 담당자 이름은 필수 항목입니다.' }, { status: 400 });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 대표 담당자로 지정하는 경우 기존 대표자들 해제 (타입 Affinity 극복을 위해 문자/숫자 둘 다 명시적 업데이트 진행)
    if (Number(is_primary) === 1) {
      await updateRows('crm_partner_contacts', { is_primary: 0 }, { filters: { partner_id: String(partner_id) } });
      if (!isNaN(Number(partner_id))) {
        await updateRows('crm_partner_contacts', { is_primary: 0 }, { filters: { partner_id: Number(partner_id) as any } });
      }
    }

    await insertRows('crm_partner_contacts', [{
      partner_id: String(partner_id),
      name,
      position,
      phone,
      email,
      card_image_url,
      is_primary: Number(is_primary) === 1 ? 1 : 0,
      created_at: nowStr
    }]);

    // 거래처 마스터 테이블 실시간 동기화
    await syncPrimaryContactToPartner(String(partner_id));

    return NextResponse.json({ success: true, message: '담당자 정보가 성공적으로 등록되었습니다.' });
  } catch (error: any) {
    console.error('B2B 담당자 등록 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT: B2B 담당자 정보 수정
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, partner_id, name, position, phone, email, card_image_url, is_primary } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '수정할 담당자 식별 코드(id)가 누락되었습니다.' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (position !== undefined) updates.position = position;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (card_image_url !== undefined) updates.card_image_url = card_image_url;
    if (is_primary !== undefined) updates.is_primary = Number(is_primary) === 1 ? 1 : 0;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    updates.updated_at = nowStr;

    // 만약 대표 지정으로 수정하는 경우, 동일 거래처 내 다른 대표자들 해제 (문자/숫자 둘 다)
    if (Number(is_primary) === 1 && partner_id) {
      await updateRows('crm_partner_contacts', { is_primary: 0 }, { filters: { partner_id: String(partner_id) } });
      if (!isNaN(Number(partner_id))) {
        await updateRows('crm_partner_contacts', { is_primary: 0 }, { filters: { partner_id: Number(partner_id) as any } });
      }
    }

    await updateRows('crm_partner_contacts', updates, { filters: { id } });

    // 수정 완료 후 거래처 마스터 테이블 실시간 동기화
    let pId = partner_id;
    if (!pId) {
      const contactRes = await queryTable('crm_partner_contacts', { filters: { id } });
      pId = contactRes.rows?.[0]?.partner_id;
    }
    if (pId) {
      await syncPrimaryContactToPartner(String(pId));
    }

    return NextResponse.json({ success: true, message: '담당자 정보가 수정되었습니다.' });
  } catch (error: any) {
    console.error('B2B 담당자 수정 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: B2B 담당자 삭제 (Soft Delete)
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 담당자 식별 코드(id)가 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 삭제할 담당자의 partner_id 우선 획득
    const contactRes = await queryTable('crm_partner_contacts', { filters: { id } });
    const pId = contactRes.rows?.[0]?.partner_id;

    // 소프트 삭제 (deleted_at 및 deleted_by 마크)
    await updateRows('crm_partner_contacts', {
      deleted_at: nowStr,
      is_primary: 0 // 삭제 시 대표 담당자 해제
    }, { filters: { id } });

    // 삭제 완료 후 거래처 마스터 테이블 실시간 동기화
    if (pId) {
      await syncPrimaryContactToPartner(String(pId));
    }

    return NextResponse.json({ success: true, message: '담당자 정보가 삭제되었습니다.' });
  } catch (error: any) {
    console.error('B2B 담당자 삭제 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
