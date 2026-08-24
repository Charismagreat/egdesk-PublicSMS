import { NextResponse } from 'next/server';
import { insertRows } from '@/../egdesk-helpers';
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

    const taxInvoiceRows: any[] = [];
    const taxExemptRows: any[] = [];
    const cashReceiptRows: any[] = [];
    const partnerSyncList: InvoicePartnerInfo[] = [];

    invoices.forEach((inv: any) => {
      const isSales = inv.type === 'SALES' || inv.type === '매출';
      const invoiceType = isSales ? 'sales' : 'purchase';
      
      const dateRes = sanitizeDate(inv.issue_date);
      const issueDate = dateRes.isValid ? dateRes.value : (inv.issue_date || now.substring(0, 10));

      const approvalNo = inv.approval_no || '';
      const supplierBn = sanitizeBusinessNumber(inv.supplier_corp_num);
      const buyerBn = sanitizeBusinessNumber(inv.buyer_corp_num);
      const supplierNum = supplierBn.formatted || inv.supplier_corp_num || '';
      const supplierName = inv.supplier_corp_name || '';
      const supplierCeo = inv.supplier_ceo_name || '';
      const buyerNum = buyerBn.formatted || inv.buyer_corp_num || '';
      const buyerName = inv.buyer_corp_name || '';
      const buyerCeo = inv.buyer_ceo_name || '';

      const supplySan = sanitizeAmount(inv.supply_amount);
      const taxSan = sanitizeAmount(inv.tax_amount);
      const totalSan = sanitizeAmount(inv.total_amount);
      const reconciled = reconcileAmounts(supplySan.value, taxSan.value, totalSan.value);
      const supplyAmt = reconciled.supply;
      const taxAmt = reconciled.tax;
      const totalAmt = reconciled.total;

      const itemName = inv.item_name || '';
      const remark = inv.remark || '';
      const kind = inv.invoice_kind || inv.target_table || 'tax_invoices';

      if (kind === 'cash_receipts' || kind === 'CASH_RECEIPT') {
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
            businessNumber: supplierNum || buyerNum
          });
        }
      } else if (kind === 'tax_exempt_invoices' || kind === 'TAX_EXEMPT_INVOICE' || (taxAmt === 0 && (remark.includes('면세') || inv.is_exempt))) {
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
          buyer_corp_num: buyerNum,
          공급받는자사업자등록번호: buyerNum,
          buyer_corp_name: buyerName,
          공급받는자상호: buyerName,
          buyer_ceo_name: buyerCeo,
          공급받는자대표자명: buyerCeo,
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
              representative: buyerCeo
            });
          }
        } else {
          if (supplierName || supplierNum) {
            partnerSyncList.push({
              type: 'VENDOR',
              companyName: supplierName,
              businessNumber: supplierNum,
              representative: supplierCeo
            });
          }
        }
      } else {
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
          buyer_corp_num: buyerNum,
          공급받는자사업자등록번호: buyerNum,
          buyer_corp_name: buyerName,
          공급받는자상호: buyerName,
          buyer_ceo_name: buyerCeo,
          공급받는자대표자명: buyerCeo,
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
              representative: buyerCeo
            });
          }
        } else {
          if (supplierName || supplierNum) {
            partnerSyncList.push({
              type: 'VENDOR',
              companyName: supplierName,
              businessNumber: supplierNum,
              representative: supplierCeo
            });
          }
        }
      }
    });

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
      details: {
        taxInvoices: taxInvoiceRows.length,
        taxExempt: taxExemptRows.length,
        cashReceipts: cashReceiptRows.length,
        partnerSync: partnerSyncStats
      }
    });
  } catch (error: any) {
    console.error('Hometax sheets bulk insert error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '홈택스 세금계산서 일괄 등록 중 오류 발생' },
      { status: 500 }
    );
  }
}
