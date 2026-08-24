import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, executeSQL } from '@/../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';
import { sanitizeDate, sanitizeAmount, reconcileAmounts, sanitizeBusinessNumber } from '@/lib/data-validator';
import { smartSyncPartnersFromInvoices, InvoicePartnerInfo } from '@/lib/partner-sync';

export async function POST(req: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const body = await req.json().catch(() => ({}));
    const { invoices = [] } = body;

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json(
        { success: false, error: '등록할 홈택스 세금계산서 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 1. 기존 DB 내 등록된 승인번호 맵 구축 (중복 방지 및 스마트 업데이트용)
    const existingTaxInvoices = new Map<string, any>();
    const existingExemptInvoices = new Map<string, any>();
    const existingCashReceipts = new Map<string, any>();

    try {
      const [taxRes, exemptRes, cashRes] = await Promise.all([
        queryTable('tax_invoices', { limit: 5000 }).catch(() => ({ rows: [] })),
        queryTable('tax_exempt_invoices', { limit: 5000 }).catch(() => ({ rows: [] })),
        queryTable('cash_receipts', { limit: 5000 }).catch(() => ({ rows: [] }))
      ]);

      (taxRes.rows || []).forEach((r: any) => {
        const appNo = (r.승인번호 || r.approval_no || '').trim();
        if (appNo) existingTaxInvoices.set(appNo, r);
      });

      (exemptRes.rows || []).forEach((r: any) => {
        const appNo = (r.승인번호 || r.approval_no || '').trim();
        if (appNo) existingExemptInvoices.set(appNo, r);
      });

      (cashRes.rows || []).forEach((r: any) => {
        const appNo = (r.승인번호 || r.approval_number || '').trim();
        if (appNo) existingCashReceipts.set(appNo, r);
      });
    } catch (err: any) {
      console.warn('⚠️ Table read warning in hometax-sheets:', err.message);
    }

    const taxInvoiceRows: any[] = [];
    const taxExemptRows: any[] = [];
    const cashReceiptRows: any[] = [];
    const partnerSyncList: InvoicePartnerInfo[] = [];

    let duplicateCount = 0;

    for (const inv of invoices) {
      const isSales = inv.type === 'SALES' || inv.type === '매출';
      const invoiceType = isSales ? 'sales' : 'purchase';
      
      const dateRes = sanitizeDate(inv.issue_date);
      const issueDate = dateRes.isValid ? dateRes.value : (inv.issue_date || now.substring(0, 10));

      const approvalNo = (inv.approval_no || inv.승인번호 || '').trim();
      const supplierBn = sanitizeBusinessNumber(inv.supplier_corp_num);
      const buyerBn = sanitizeBusinessNumber(inv.buyer_corp_num);
      const supplierNum = supplierBn.formatted || inv.supplier_corp_num || '';
      const supplierName = inv.supplier_corp_name || inv.공급자상호 || '';
      const supplierCeo = inv.supplier_ceo_name || inv.공급자대표자명 || '';
      const buyerNum = buyerBn.formatted || inv.buyer_corp_num || '';
      const buyerName = inv.buyer_corp_name || inv.공급받는자상호 || '';
      const buyerCeo = inv.buyer_ceo_name || inv.공급받는자대표자명 || '';

      const buyerEmail = inv.buyer_email || inv.email || inv.공급받는자이메일1 || inv.공급받는자이메일2 || inv.공급받는자이메일 || '';
      const buyerAddress = inv.buyer_address || inv.address || inv.공급받는자주소 || '';
      const supplierEmail = inv.supplier_email || inv.email || inv.공급자이메일 || '';
      const supplierAddress = inv.supplier_address || inv.address || inv.공급자주소 || '';

      const supplySan = sanitizeAmount(inv.supply_amount);
      const taxSan = sanitizeAmount(inv.tax_amount);
      const totalSan = sanitizeAmount(inv.total_amount);
      const reconciled = reconcileAmounts(supplySan.value, taxSan.value, totalSan.value);
      const supplyAmt = reconciled.supply;
      const taxAmt = reconciled.tax;
      const totalAmt = reconciled.total;

      const itemName = inv.item_name || inv.품목명 || '';
      const remark = inv.remark || inv.비고 || '';
      const kind = inv.invoice_kind || inv.target_table || 'tax_invoices';

      // 1. 현금영수증
      if (kind === 'cash_receipts' || kind === 'CASH_RECEIPT') {
        if (approvalNo && existingCashReceipts.has(approvalNo)) {
          duplicateCount++;
          continue;
        }

        cashReceiptRows.push({
          business_number: supplierNum || buyerNum || '',
          발행구분: isSales ? '매출' : '매입',
          매출일시: issueDate,
          transaction_date: issueDate,
          공급가액: supplyAmt,
          supply_amount: supplyAmt,
          부가세: taxAmt,
          tax_amount: taxAmt,
          봉사료: 0,
          총금액: totalAmt || (supplyAmt + taxAmt),
          total_amount: totalAmt || (supplyAmt + taxAmt),
          승인번호: approvalNo,
          approval_number: approvalNo,
          가맹점명: supplierName || buyerName,
          franchise_name: supplierName || buyerName,
          용도구분: remark || '소득공제',
          purpose: remark || '소득공제',
          비고: remark,
          memo: remark,
          status: 'CONFIRMED',
          tenant_id: tenantId,
          created_at: now,
          updated_at: now,
          deleted_at: null
        });

        if (supplierName || buyerName) {
          partnerSyncList.push({
            type: 'BUYER',
            companyName: supplierName || buyerName,
            businessNumber: supplierNum || buyerNum,
            address: buyerAddress || supplierAddress,
            email: buyerEmail || supplierEmail
          });
        }
      } 
      // 2. 면세 전자계산서
      else if (kind === 'tax_exempt_invoices' || kind === 'TAX_EXEMPT_INVOICE' || (taxAmt === 0 && (remark.includes('면세') || inv.is_exempt))) {
        if (approvalNo && existingExemptInvoices.has(approvalNo)) {
          duplicateCount++;
          const existing = existingExemptInvoices.get(approvalNo);
          const patch: Record<string, any> = {};
          if (!existing.공급자주소 && supplierAddress) patch.공급자주소 = supplierAddress;
          if (!existing.공급자이메일 && supplierEmail) patch.공급자이메일 = supplierEmail;
          if (!existing.공급받는자주소 && buyerAddress) patch.공급받는자주소 = buyerAddress;
          if (!existing.공급받는자이메일1 && buyerEmail) patch.공급받는자이메일1 = buyerEmail;

          if (Object.keys(patch).length > 0) {
            await updateRows('tax_exempt_invoices', patch, { filters: { id: String(existing.id) } });
          }

          if (isSales && (buyerName || buyerNum)) {
            partnerSyncList.push({
              type: 'BUYER',
              companyName: buyerName,
              businessNumber: buyerNum,
              representative: buyerCeo,
              address: buyerAddress,
              email: buyerEmail
            });
          } else if (!isSales && (supplierName || supplierNum)) {
            partnerSyncList.push({
              type: 'VENDOR',
              companyName: supplierName,
              businessNumber: supplierNum,
              representative: supplierCeo,
              address: supplierAddress,
              email: supplierEmail
            });
          }
          continue;
        }

        taxExemptRows.push({
          issue_date: issueDate,
          작성일자: issueDate,
          approval_no: approvalNo,
          승인번호: approvalNo,
          type: isSales ? 'SALES' : 'PURCHASE',
          invoice_type: invoiceType,
          invoice_kind: 'TAX_EXEMPT_INVOICE',
          supplier_corp_num: supplierNum,
          공급자사업자등록번호: supplierNum,
          supplier_corp_name: supplierName,
          공급자상호: supplierName,
          supplier_ceo_name: supplierCeo,
          공급자대표자명: supplierCeo,
          공급자주소: supplierAddress,
          공급자이메일: supplierEmail,
          buyer_corp_num: buyerNum,
          공급받는자사업자등록번호: buyerNum,
          buyer_corp_name: buyerName,
          공급받는자상호: buyerName,
          buyer_ceo_name: buyerCeo,
          공급받는자대표자명: buyerCeo,
          공급받는자주소: buyerAddress,
          공급받는자이메일1: buyerEmail,
          supply_amount: supplyAmt || totalAmt,
          공급가액: supplyAmt || totalAmt,
          tax_amount: 0,
          세액: 0,
          total_amount: totalAmt || supplyAmt,
          합계금액: totalAmt || supplyAmt,
          item_name: itemName,
          품목명: itemName,
          remark: remark,
          비고: remark,
          status: 'CONFIRMED',
          tenant_id: tenantId,
          created_at: now,
          updated_at: now,
          deleted_at: null
        });

        if (isSales) {
          if (buyerName || buyerNum) {
            partnerSyncList.push({
              type: 'BUYER',
              companyName: buyerName,
              businessNumber: buyerNum,
              representative: buyerCeo,
              address: buyerAddress,
              email: buyerEmail
            });
          }
        } else {
          if (supplierName || supplierNum) {
            partnerSyncList.push({
              type: 'VENDOR',
              companyName: supplierName,
              businessNumber: supplierNum,
              representative: supplierCeo,
              address: supplierAddress,
              email: supplierEmail
            });
          }
        }
      } 
      // 3. 과세 전자세금계산서
      else {
        if (approvalNo && existingTaxInvoices.has(approvalNo)) {
          duplicateCount++;
          const existing = existingTaxInvoices.get(approvalNo);
          const patch: Record<string, any> = {};
          if (!existing.공급자주소 && supplierAddress) patch.공급자주소 = supplierAddress;
          if (!existing.공급자이메일 && supplierEmail) patch.공급자이메일 = supplierEmail;
          if (!existing.공급받는자주소 && buyerAddress) patch.공급받는자주소 = buyerAddress;
          if (!existing.공급받는자이메일1 && buyerEmail) patch.공급받는자이메일1 = buyerEmail;

          if (Object.keys(patch).length > 0) {
            await updateRows('tax_invoices', patch, { filters: { id: String(existing.id) } });
          }

          if (isSales && (buyerName || buyerNum)) {
            partnerSyncList.push({
              type: 'BUYER',
              companyName: buyerName,
              businessNumber: buyerNum,
              representative: buyerCeo,
              address: buyerAddress,
              email: buyerEmail
            });
          } else if (!isSales && (supplierName || supplierNum)) {
            partnerSyncList.push({
              type: 'VENDOR',
              companyName: supplierName,
              businessNumber: supplierNum,
              representative: supplierCeo,
              address: supplierAddress,
              email: supplierEmail
            });
          }
          continue;
        }

        taxInvoiceRows.push({
          issue_date: issueDate,
          작성일자: issueDate,
          approval_no: approvalNo,
          승인번호: approvalNo,
          type: isSales ? 'SALES' : 'PURCHASE',
          invoice_type: invoiceType,
          invoice_kind: 'TAX_INVOICE',
          supplier_corp_num: supplierNum,
          공급자사업자등록번호: supplierNum,
          supplier_corp_name: supplierName,
          공급자상호: supplierName,
          supplier_ceo_name: supplierCeo,
          공급자대표자명: supplierCeo,
          공급자주소: supplierAddress,
          공급자이메일: supplierEmail,
          buyer_corp_num: buyerNum,
          공급받는자사업자등록번호: buyerNum,
          buyer_corp_name: buyerName,
          공급받는자상호: buyerName,
          buyer_ceo_name: buyerCeo,
          공급받는자대표자명: buyerCeo,
          공급받는자주소: buyerAddress,
          공급받는자이메일1: buyerEmail,
          supply_amount: supplyAmt,
          공급가액: supplyAmt,
          tax_amount: taxAmt,
          세액: taxAmt,
          total_amount: totalAmt,
          합계금액: totalAmt,
          item_name: itemName,
          품목명: itemName,
          remark: remark,
          비고: remark,
          status: 'CONFIRMED',
          tenant_id: tenantId,
          created_at: now,
          updated_at: now,
          deleted_at: null
        });

        if (isSales) {
          if (buyerName || buyerNum) {
            partnerSyncList.push({
              type: 'BUYER',
              companyName: buyerName,
              businessNumber: buyerNum,
              representative: buyerCeo,
              address: buyerAddress,
              email: buyerEmail
            });
          }
        } else {
          if (supplierName || supplierNum) {
            partnerSyncList.push({
              type: 'VENDOR',
              companyName: supplierName,
              businessNumber: supplierNum,
              representative: supplierCeo,
              address: supplierAddress,
              email: supplierEmail
            });
          }
        }
      }
    }

    let totalInserted = 0;
    if (taxInvoiceRows.length > 0) {
      await insertRows('tax_invoices', taxInvoiceRows);
      totalInserted += taxInvoiceRows.length;
    }
    if (taxExemptRows.length > 0) {
      await insertRows('tax_exempt_invoices', taxExemptRows);
      totalInserted += taxExemptRows.length;
    }
    if (cashReceiptRows.length > 0) {
      await insertRows('cash_receipts', cashReceiptRows);
      totalInserted += cashReceiptRows.length;
    }

    // 거래처(crm_partners) 스마트 머지 동기화
    let partnerSyncStats = { added: 0, updated: 0 };
    if (partnerSyncList.length > 0) {
      try {
        partnerSyncStats = await smartSyncPartnersFromInvoices(partnerSyncList, tenantId);
      } catch (syncErr: any) {
        console.warn('⚠️ Partner smart sync error:', syncErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount: totalInserted,
      duplicateCount,
      details: {
        taxInvoices: taxInvoiceRows.length,
        taxExemptInvoices: taxExemptRows.length,
        cashReceipts: cashReceiptRows.length
      },
      partnerSync: partnerSyncStats
    });

  } catch (error: any) {
    console.error('Hometax Sheets Import Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '홈택스 구글 시트 연동 처리 중 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}
