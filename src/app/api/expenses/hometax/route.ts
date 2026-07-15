export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import { queryTable, executeSQL } from '@/../egdesk-helpers';

// 국세청 전자세금계산서 데이터를 프론트엔드 포맷으로 변환하는 매퍼 함수
function mapTaxInvoiceToFrontend(inv: any, sourceTable: 'tax' | 'exempt'): any {
  if (!inv) return null;
  const id = String(inv.id || "");
  const evidenceId = `${sourceTable}-${id}`; // 고유 증빙 ID 생성 규격
  
  return {
    id,
    evidenceId,
    sourceTable,
    issueDate: inv.작성일자 || inv.issueDate || "",
    supplierName: inv.공급자상호 || inv.supplierName || "",
    buyerName: inv.공급받는자상호 || inv.buyerName || "",
    supplyAmount: Math.floor(Number(inv.공급가액 || inv.supplyAmount || 0)),
    taxAmount: Math.floor(Number(inv.세액 || inv.taxAmount || 0)),
    totalAmount: Math.floor(Number(inv.합계금액 || inv.totalAmount || 0)),
    itemName: inv.품목명 || inv.itemName || "",
    invoiceType: inv.invoice_type || inv.invoiceType || "purchase",
    supplierBusinessNumber: inv.공급자사업자등록번호 || inv.supplierBusinessNumber || ""
  };
}

export async function GET() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 1. 이미 지출 등록 완료된 증빙 ID(evidence_id) 목록 조회
    const expensesRes = await queryTable('crm_expenses', {
      filters: { tenant_id: tenantId },
      limit: 10000
    });
    const expenses = (expensesRes.rows || []).filter((exp: any) => !exp.deleted_at);
    const registeredEvidenceIds = new Set<string>(
      expenses.map((e: any) => e.evidence_id).filter(Boolean)
    );

    let allInvoices: any[] = [];

    // 2. 과세 전자세금계산서 (매입) 조회 및 가공
    try {
      let taxInvoices: any[] = [];
      // 로컬 DB 쿼리 폴백을 위해 선제 시도
      const dbRes = await executeSQL(
        `SELECT * FROM tax_invoices WHERE (invoice_type = 'purchase' OR invoice_type = '매입')`
      ).catch(() => ({ rows: [] }));
      taxInvoices = dbRes.rows || [];

      const mapped = taxInvoices.map(inv => mapTaxInvoiceToFrontend(inv, 'tax')).filter(Boolean);
      allInvoices = [...allInvoices, ...mapped];
    } catch (e: any) {
      console.warn("⚠️ [Hometax API] Failed to fetch tax_invoices:", e.message);
    }

    // 3. 면세 전자계산서 (매입) 조회 및 가공
    try {
      let exemptInvoices: any[] = [];
      // 로컬 DB 쿼리 폴백을 위해 선제 시도
      const dbRes = await executeSQL(
        `SELECT * FROM tax_exempt_invoices WHERE (invoice_type = 'purchase' OR invoice_type = '매입')`
      ).catch(() => ({ rows: [] }));
      exemptInvoices = dbRes.rows || [];

      const mapped = exemptInvoices.map(inv => mapTaxInvoiceToFrontend(inv, 'exempt')).filter(Boolean);
      allInvoices = [...allInvoices, ...mapped];
    } catch (e: any) {
      console.warn("⚠️ [Hometax API] Failed to fetch tax_exempt_invoices:", e.message);
    }

    // 4. 이미 지출결의서가 생성된 증빙 건들 필터링 제외 (미결의 건만 축출)
    const filteredInvoices = allInvoices.filter(
      (inv: any) => !registeredEvidenceIds.has(inv.evidenceId)
    );

    // 작성일자(issueDate) 최신순으로 정렬
    filteredInvoices.sort((a, b) => b.issueDate.localeCompare(a.issueDate));

    return NextResponse.json({
      success: true,
      invoices: filteredInvoices
    });

  } catch (error: any) {
    console.error('Error fetching hometax purchase invoices for expenses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
