import { executeSQL, insertRows, updateRows } from "../../egdesk-helpers";
import { sanitizeBusinessNumber, sanitizePhoneNumber, sanitizeEmail } from "./data-validator";

export interface InvoicePartnerInfo {
  type: 'BUYER' | 'VENDOR';
  companyName: string;
  businessNumber?: string;
  representative?: string;
  address?: string;
  email?: string;
  phone?: string;
  memo?: string;
}

/**
 * 국세청 전자세금계산서/계산서 업로드 시 상대방 거래처를 crm_partners 대장에 스마트 머지(Smart Merge Upsert)하는 공통 헬퍼
 * 
 * 원칙:
 * 1. 매출(Sales) -> BUYER
 * 2. 매입(Purchase) -> VENDOR
 * 3. 사업자등록번호(또는 상호명)로 기존 거래처 매칭
 * 4. 기존 레코드가 있는 경우:
 *    - 사람이 직접 입력한 담당자 정보, 연락처, 메모는 100% 온전히 보존
 *    - 빈 대표자명, 빈 주소 등 기본 사업자 정보만 보충 업데이트
 *    - 기존 type이 BUYER인데 VENDOR 거래가 발생하면 'BOTH'로 스마트 확장
 * 5. 기존 레코드가 없는 경우:
 *    - 신규 crm_partners 레코드 안전 생성 (감사 7종 컬럼 자동 적용)
 */
export async function smartSyncPartnersFromInvoices(
  partners: InvoicePartnerInfo[],
  tenantId: string
): Promise<{ added: number; updated: number }> {
  if (!partners || partners.length === 0) return { added: 0, updated: 0 };

  let added = 0;
  let updated = 0;

  try {
    // 1. 기존 거래처 목록 조회 (테넌트 유연 매칭)
    let existingPartners: any[] = [];
    try {
      const qRes = await queryTable('crm_partners', { limit: 10000 });
      existingPartners = (qRes.rows || []).filter((r: any) => !r.deleted_at);
    } catch {
      const dbRes = await executeSQL(`SELECT * FROM crm_partners WHERE deleted_at IS NULL`).catch(() => ({ rows: [] }));
      existingPartners = dbRes.rows || [];
    }

    // 사업자등록번호(정규화) Map 및 상호명(정규화) Map 구축
    const bizMap = new Map<string, any>();
    const nameMap = new Map<string, any>();

    const cleanBiz = (b?: string) => (b || '').replace(/\D/g, '');
    const cleanName = (n?: string) => (n || '').replace(/[\s\(\)주식회사\(주\)]/g, '').trim().toLowerCase();

    existingPartners.forEach((p: any) => {
      const bKey = cleanBiz(p.business_number);
      if (bKey && bKey.length >= 10) {
        bizMap.set(bKey, p);
      }
      const nKey = cleanName(p.company_name);
      if (nKey) {
        nameMap.set(nKey, p);
      }
    });

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 중복 처리를 방지하기 위한 업로드 내 배치 De-duplication Set
    const processedInBatch = new Set<string>();

    for (const item of partners) {
      const companyName = (item.companyName || '').trim();
      if (!companyName) continue;

      const rawBiz = cleanBiz(item.businessNumber);
      const bKey = rawBiz.length >= 10 ? rawBiz : '';
      const nKey = cleanName(companyName);

      const batchKey = bKey || nKey;
      if (processedInBatch.has(batchKey)) continue;
      processedInBatch.add(batchKey);

      const existing = (bKey ? bizMap.get(bKey) : null) || nameMap.get(nKey);

      if (existing) {
        // [Smart Update]: 기존 레코드 보존하며 보충 업데이트
        const updateData: Record<string, any> = {
          updated_at: now
        };
        let needUpdate = false;

        // 대표자명이 비어있는데 세금계산서에 있으면 보충
        if (!existing.representative && item.representative) {
          updateData.representative = item.representative.trim();
          needUpdate = true;
        }

        // 주소가 비어있거나 짧은데 세금계산서에 있으면 보충
        if ((!existing.address || existing.address.length < 5) && item.address) {
          updateData.address = item.address.trim();
          needUpdate = true;
        }

        // 사업자번호가 비어있거나 이상값인 경우 보충
        if ((!existing.business_number || existing.business_number === '[object Object]') && item.businessNumber) {
          const resBiz = sanitizeBusinessNumber(item.businessNumber);
          updateData.business_number = resBiz.isValid ? resBiz.formatted : String(item.businessNumber).trim();
          needUpdate = true;
        }

        // 이메일이 비어있는데 세금계산서에 있으면 보충
        if (!existing.email && item.email) {
          const resEmail = sanitizeEmail(item.email);
          if (resEmail.isValid) {
            updateData.email = resEmail.value;
            needUpdate = true;
          } else if (String(item.email).includes('@')) {
            updateData.email = String(item.email).trim();
            needUpdate = true;
          }
        }

        // type 확장 (기존이 BUYER인데 VENDOR가 들어오면 BOTH로 승격)
        const currentType = String(existing.type || '').toUpperCase();
        if (currentType !== 'BOTH' && currentType !== 'BUYER,VENDOR' && currentType !== 'VENDOR,BUYER') {
          if ((currentType === 'BUYER' && item.type === 'VENDOR') || (currentType === 'VENDOR' && item.type === 'BUYER')) {
            updateData.type = 'BOTH';
            needUpdate = true;
          }
        }

        if (needUpdate) {
          await updateRows('crm_partners', updateData, { filters: { id: String(existing.id) } }).catch((e: any) => {
            console.warn(`[Partner Smart Update Warn] ${companyName}:`, e.message);
          });
          updated++;
        }
      } else {
        // [New Insert]: 신규 거래처 등록
        let formattedBiz: string | null = null;
        if (item.businessNumber) {
          const resBiz = sanitizeBusinessNumber(item.businessNumber);
          formattedBiz = resBiz.isValid ? resBiz.formatted : String(item.businessNumber).trim();
        }

        let formattedEmail: string | null = null;
        if (item.email) {
          const resEmail = sanitizeEmail(item.email);
          formattedEmail = resEmail.isValid ? resEmail.value : String(item.email).trim();
        }

        let formattedPhone: string | null = null;
        if (item.phone) {
          const resPhone = sanitizePhoneNumber(item.phone);
          formattedPhone = resPhone.isValid ? resPhone.formatted : String(item.phone).trim();
        }

        const newPartner = {
          type: item.type, // 'BUYER' or 'VENDOR'
          company_name: companyName,
          business_number: formattedBiz,
          representative: item.representative ? item.representative.trim() : null,
          address: item.address ? item.address.trim() : null,
          email: formattedEmail,
          phone: formattedPhone,
          vip_level: 'NORMAL',
          credit_limit: 0,
          created_at: now,
          updated_at: now,
          tenant_id: tenantId
        };

        await insertRows('crm_partners', [newPartner]).catch((e: any) => {
          console.warn(`[Partner Smart Insert Warn] ${companyName}:`, e.message);
        });
        added++;

        // 맵에 즉시 등록하여 이번 배치 내 중복 추가 방지
        if (bKey) bizMap.set(bKey, newPartner);
        if (nKey) nameMap.set(nKey, newPartner);
      }
    }
  } catch (err: any) {
    console.error('⚠️ smartSyncPartnersFromInvoices error:', err.message);
  }

  return { added, updated };
}
