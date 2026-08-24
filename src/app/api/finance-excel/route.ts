export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import {
  queryTable,
  insertRows,
  updateRows,
  executeSQL
} from "../../../../egdesk-helpers";

// 🔑 세션 토큰 디코딩 및 격리 컨텍스트 획득 헬퍼
async function verifyUserRole() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return { isAuthorized: true, role: 'TENANT_ADMIN', name: 'Admin', username: 'admin', tenantId: 'tenant-default-id' };
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Admin';
    const username = payload.username as string || '';
    const tenantId = payload.tenant_id as string || 'tenant-default-id';
    
    return {
      isAuthorized: true,
      role: role || 'TENANT_ADMIN',
      name,
      username,
      tenantId
    };
  } catch (e) {
    return { isAuthorized: true, role: 'TENANT_ADMIN', name: 'Admin', username: 'admin', tenantId: 'tenant-default-id' };
  }
}

// 이중 안전 장치: 배열이 아닐 경우 빈 배열로 방어 처리
function safeArray<T>(data: any): T[] {
  return Array.isArray(data) ? data : [];
}

const bankNames: Record<string, string> = {
  shinhan: "신한은행",
  hana: "하나은행",
  kookmin: "KB국민은행",
  ibk: "IBK기업은행",
  woori: "우리은행",
  nh: "NH농협은행",
  "shinhan-card": "신한카드",
  "kb-card": "KB국민카드",
  "nh-card": "NH농협카드",
  "bc-card": "BC카드",
  "hana-card": "하나카드",
  "lotte-card": "롯데카드",
  "samsung-card": "삼성카드",
  "hyundai-card": "현대카드",
  "shinhan_card": "신한카드",
  "kb_card": "KB국민카드",
  "nh_card": "NH농협카드",
  "bc_card": "BC카드",
  "hana_card": "하나카드"
};

function mapAccountToFrontend(acc: any): any {
  if (!acc) return null;
  const bankId = acc.bank_id || "";
  return {
    id: String(acc.id || ""),
    bankId: bankId,
    bankName: acc.bank_name || bankNames[bankId] || "기타은행",
    accountNumber: acc.account_number || "",
    accountName: acc.account_name || "입출식 예금",
    balance: Math.floor(Number(acc.balance || 0)),
    currency: acc.currency || "KRW",
    updatedAt: acc.updated_at || ""
  };
}

function mapTransactionToFrontend(tx: any): any {
  if (!tx) return null;
  const deposit = Number(tx.deposit || 0);
  const withdrawal = Number(tx.withdrawal || 0);
  const isDeposit = deposit > 0;
  const bankId = tx.bank_id || "";
  
  return {
    id: String(tx.id || ""),
    date: tx.transaction_date || "",
    time: tx.transaction_time || "00:00:00",
    description: tx.description || "",
    category: tx.category || "",
    memo: tx.memo || "",
    type: isDeposit ? "deposit" : "withdrawal",
    amount: Math.floor(isDeposit ? deposit : withdrawal),
    balance: Math.floor(Number(tx.balance || 0)),
    bankId: bankId,
    bankName: bankNames[bankId] || "기타은행",
    accountId: tx.account_id || "",
    accountNumber: tx.account_number || ""
  };
}

function mapCardTransactionToFrontend(tx: any): any {
  if (!tx) return null;
  const companyId = tx.card_company_id || "";
  
  return {
    id: String(tx.id || ""),
    accountId: tx.account_id || "",
    cardCompanyId: companyId,
    cardCompanyName: bankNames[companyId] || "기타카드",
    cardNumber: tx.card_number || "",
    cardholderName: tx.cardholder_name || "",
    usageType: tx.usage_type || "일시불",
    salesType: tx.sales_type || "일반매출",
    date: tx.approval_date || "",
    time: tx.time || "00:00:00",
    approvalNumber: tx.approval_number || "",
    merchantName: tx.merchant_name || "",
    amount: Math.floor(Number(tx.amount || 0)),
    status: tx.status || "승인",
    memo: tx.memo || "",
    category: tx.category || "",
    receiptUrl: tx.receipt_url || ""
  };
}

function mapTaxInvoiceToFrontend(inv: any): any {
  if (!inv) return null;
  const isSales = inv.invoice_type === "sales" || inv.type === "SALES" || inv.invoice_type === "매출";
  
  let supplyAmt = Number(inv.공급가액 ?? inv.supply_amount ?? 0);
  let taxAmt = Number(inv.세액 ?? inv.tax_amount ?? 0);
  let totalAmt = Number(inv.합계금액 ?? inv.total_amount ?? 0);

  // 공급가액이 0인데 합계금액과 세액이 있는 경우 역산 보정
  if (!supplyAmt && totalAmt) {
    supplyAmt = totalAmt - taxAmt;
  }
  // 합계금액이 0인데 공급가액과 세액이 있는 경우 보정
  if (!totalAmt && supplyAmt) {
    totalAmt = supplyAmt + taxAmt;
  }
  // 세액이 0인데 합계금액과 공급가액 차이가 있는 경우 보정
  if (!taxAmt && totalAmt > supplyAmt && supplyAmt > 0) {
    taxAmt = totalAmt - supplyAmt;
  }

  const supplierName = inv.공급자상호 || inv.supplier_corp_name || inv.supplier_name || inv.공급자 || "";
  const buyerName = inv.공급받는자상호 || inv.buyer_corp_name || inv.buyer_name || inv.공급받는자 || "";
  const supplierNum = inv.공급자사업자등록번호 || inv.supplier_corp_num || inv.supplier_business_number || "";
  const buyerNum = inv.공급받는자사업자등록번호 || inv.buyer_corp_num || inv.buyer_business_number || "";

  // 품목명이 숫자(세액 등)로 잘못 들어간 경우 보정
  let itemName = inv.품목명 || inv.item_name || "";
  if (/^[0-9,.\s]+$/.test(itemName)) {
    itemName = "";
  }

  return {
    id: String(inv.id || ""),
    issueDate: inv.작성일자 || inv.issue_date || "",
    supplierName,
    buyerName,
    supplyAmount: Math.floor(supplyAmt),
    taxAmount: Math.floor(taxAmt),
    totalAmount: Math.floor(totalAmt),
    itemName,
    invoiceType: isSales ? "sales" : "purchase",
    partnerBusinessNumber: isSales ? (buyerNum || supplierNum) : (supplierNum || buyerNum),
    memo: inv.memo || ""
  };
}

function mapCashReceiptToFrontend(rcpt: any): any {
  if (!rcpt) return null;
  return {
    id: String(rcpt.id || ""),
    transactionDate: (rcpt.매출일시 || rcpt.transaction_date || "").split(" ")[0],
    franchiseName: rcpt.가맹점명 || rcpt.franchise_name || "국세청 현금영수증",
    approvalNumber: rcpt.승인번호 || rcpt.approval_number || "",
    supplyAmount: Math.floor(Number(rcpt.공급가액 ?? rcpt.supply_amount ?? 0)),
    taxAmount: Math.floor(Number(rcpt.부가세 ?? rcpt.tax_amount ?? 0)),
    totalAmount: Math.floor(Number(rcpt.총금액 ?? rcpt.total_amount ?? 0)),
    purpose: rcpt.용도구분 || rcpt.purpose || "",
    memo: rcpt.비고 || rcpt.memo || ""
  };
}

export async function GET(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const tab = searchParams.get("tab") || "accounts";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const searchText = searchParams.get("searchText") || undefined;
    const invoiceType = (searchParams.get("invoiceType") as "sales" | "purchase" | "all") || undefined;
    const limit = Number(searchParams.get("limit")) || 10;
    const offset = Number(searchParams.get("offset")) || 0;

    // 1. 계좌 목록 및 종합 통계 조회
    if (tab === "accounts") {
      const accountsRes = await queryTable('excel_accounts', {
        filters: { tenant_id: tenantId }
      });
      
      const accountsRaw = safeArray<any>(accountsRes?.rows || []);
      const activeAccounts = accountsRaw.filter((acc: any) => !acc.deleted_at);
      
      let accounts = await Promise.all(activeAccounts.map(async (acc: any) => {
        let lastTxDate = "";
        let lastTxTime = "";
        try {
          const isCard = acc.id.includes("CARD") || acc.bank_id.includes("card") || acc.account_name.includes("카드");
          if (isCard) {
            const latestCardTxRes = await executeSQL(`
              SELECT approval_date, time 
              FROM card_transactions 
              WHERE account_id = '${acc.id}' AND (tenant_id = '${tenantId}' OR tenant_id = 'tenant-default-id' OR tenant_id = 'default' OR tenant_id IS NULL)
              ORDER BY approval_date DESC, time DESC, id DESC 
              LIMIT 1
            `);
            const latestCardTx = latestCardTxRes.rows?.[0];
            if (latestCardTx) {
              lastTxDate = latestCardTx.approval_date || "";
              lastTxTime = latestCardTx.time || "";
            }
          } else {
            const latestTxRes = await executeSQL(`
              SELECT transaction_date, transaction_time 
              FROM bank_transactions 
              WHERE account_id = '${acc.id}' AND (tenant_id = '${tenantId}' OR tenant_id = 'tenant-default-id' OR tenant_id = 'default' OR tenant_id IS NULL)
              ORDER BY transaction_date DESC, transaction_time DESC, id DESC 
              LIMIT 1
            `);
            const latestTx = latestTxRes.rows?.[0];
            if (latestTx) {
              lastTxDate = latestTx.transaction_date || "";
              lastTxTime = latestTx.transaction_time || "";
            }
          }
        } catch (txErr: any) {
          console.warn(`[Excel Bank last tx query failed] for account ${acc.id}:`, txErr.message);
        }

        return {
          ...mapAccountToFrontend(acc),
          lastTxDate,
          lastTxTime
        };
      }));

      const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

      return NextResponse.json({
        success: true,
        data: {
          accounts: accounts,
          stats: {
            totalBalance: totalBalance,
            activeAccounts: accounts.length
          }
        }
      });
    }

    // 2. 은행 거래 내역 조회
    if (tab === "transactions") {
      const bankId = searchParams.get("bankId") || undefined;
      const accountId = searchParams.get("accountId") || undefined;
      
      let list: any[] = [];
      let total = 0;

      try {
        let query = `SELECT * FROM excel_bank_transactions WHERE tenant_id = '${tenantId}'`;
        const whereClauses: string[] = [];
        
        if (startDate) {
          whereClauses.push(`transaction_date >= '${startDate}'`);
        }
        if (endDate) {
          whereClauses.push(`transaction_date <= '${endDate}'`);
        }
        if (searchText) {
          const cleanText = searchText.replace(/'/g, "''");
          whereClauses.push(`description LIKE '%${cleanText}%'`);
        }
        if (bankId && bankId !== "all") {
          whereClauses.push(`bank_id = '${bankId}'`);
        }
        if (accountId && accountId !== "all") {
          whereClauses.push(`account_id = '${accountId}'`);
        }
        
        if (whereClauses.length > 0) {
          query += " AND " + whereClauses.join(" AND ");
        }
        
        const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
        const countRes = await executeSQL(countQuery).catch(() => ({ rows: [] }));
        const totalCount = countRes.rows?.[0]?.cnt || 0;
        
        total = totalCount;

        query += ` ORDER BY transaction_date DESC, transaction_time DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
        
        const localTxsRes = await executeSQL(query);
        const localTxs = localTxsRes.rows || [];
        
        list = localTxs.map(mapTransactionToFrontend).filter(Boolean);
      } catch (dbErr: any) {
        console.warn("⚠️ Excel bank transactions query failed:", dbErr.message);
      }

      return NextResponse.json({
        success: true,
        data: {
          list: list,
          total: total
        }
      });
    }

    // 3. 신용 카드 거래 내역 조회
    if (tab === "cards") {
      let cardTxList: any[] = [];
      let total = 0;
      const cardCompanyId = searchParams.get("cardCompanyId") || undefined;
      const cardNumber = searchParams.get("cardNumber") || undefined;

      try {
        let query = `SELECT * FROM excel_card_transactions WHERE tenant_id = '${tenantId}'`;
        const whereClauses: string[] = [];
        
        if (startDate) {
          whereClauses.push(`approval_date >= '${startDate}'`);
        }
        if (endDate) {
          whereClauses.push(`approval_date <= '${endDate}'`);
        }
        if (searchText) {
          const cleanText = searchText.replace(/'/g, "''");
          whereClauses.push(`merchant_name LIKE '%${cleanText}%'`);
        }
        if (cardCompanyId && cardCompanyId !== "all") {
          whereClauses.push(`card_company_id = '${cardCompanyId}'`);
        }
        if (cardNumber && cardNumber !== "all") {
          whereClauses.push(`card_number = '${cardNumber}'`);
        }
        
        if (whereClauses.length > 0) {
          query += " AND " + whereClauses.join(" AND ");
        }

        const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
        const countRes = await executeSQL(countQuery).catch(() => ({ rows: [] }));
        const totalCount = countRes.rows?.[0]?.cnt || 0;
        
        total = totalCount;

        query += ` ORDER BY approval_date DESC, time DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
        
        const localCardTxsRes = await executeSQL(query);
        const localCardTxs = localCardTxsRes.rows || [];
        
        cardTxList = localCardTxs.map(mapCardTransactionToFrontend).filter(Boolean);
      } catch (dbErr: any) {
        console.warn("⚠️ Excel card transactions query failed:", dbErr.message);
      }

      return NextResponse.json({
        success: true,
        data: {
          list: cardTxList,
          total: total
        }
      });
    }

    // 4. 국세청 홈택스 전자세금계산서 조회
    if (tab === "hometax-invoice") {
      let list: any[] = [];
      let total = 0;

      try {
        let query = `SELECT * FROM tax_invoices WHERE (tenant_id = '${tenantId}' OR tenant_id = 'tenant-default-id' OR tenant_id = 'default' OR tenant_id IS NULL)`;
        const whereClauses: string[] = [];
        
        if (startDate) {
          const normalizedStart = startDate.replace(/-/g, ".");
          whereClauses.push(`(작성일자 >= '${startDate}' OR 작성일자 >= '${normalizedStart}' OR issue_date >= '${startDate}' OR issue_date >= '${normalizedStart}')`);
        }
        if (endDate) {
          const normalizedEnd = endDate.replace(/-/g, ".");
          whereClauses.push(`(작성일자 <= '${endDate}' OR 작성일자 <= '${normalizedEnd}' OR issue_date <= '${endDate}' OR issue_date <= '${normalizedEnd}')`);
        }
        if (searchText) {
          const cleanText = searchText.replace(/'/g, "''");
          whereClauses.push(`(공급자상호 LIKE '%${cleanText}%' OR supplier_corp_name LIKE '%${cleanText}%' OR 공급받는자상호 LIKE '%${cleanText}%' OR buyer_corp_name LIKE '%${cleanText}%' OR 품목명 LIKE '%${cleanText}%' OR item_name LIKE '%${cleanText}%')`);
        }
        if (invoiceType && invoiceType !== "all") {
          const isSales = invoiceType === 'sales' || invoiceType === '매출';
          whereClauses.push(`(invoice_type = '${invoiceType}' OR type = '${isSales ? 'SALES' : 'PURCHASE'}' OR invoice_type = '${isSales ? '매출' : '매입'}')`);
        }
        
        if (whereClauses.length > 0) {
          query += " AND " + whereClauses.join(" AND ");
        }

        const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
        const countRes = await executeSQL(countQuery).catch(() => ({ rows: [] }));
        const totalCount = countRes.rows?.[0]?.cnt || 0;
        
        if (totalCount > 0) {
          total = totalCount;
          query += ` ORDER BY COALESCE(작성일자, issue_date) DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
          const dbRes = await executeSQL(query);
          const dbRows = (dbRes.rows || []).filter((r: any) => !r.deleted_at);
          list = dbRows.map(mapTaxInvoiceToFrontend).filter(Boolean);
        } else {
          // Fallback to legacy excel_hometax_invoices
          const legacyQuery = `SELECT * FROM excel_hometax_invoices WHERE (tenant_id = '${tenantId}' OR tenant_id = 'tenant-default-id' OR tenant_id = 'default' OR tenant_id IS NULL) AND is_exempt = 0`;
          const legacyRes = await executeSQL(legacyQuery).catch(() => ({ rows: [] }));
          if (legacyRes.rows?.length) {
            const rows = (legacyRes.rows || []).filter((r: any) => !r.deleted_at);
            total = rows.length;
            list = rows.slice(offset, offset + limit).map(mapTaxInvoiceToFrontend).filter(Boolean);
          }
        }
      } catch (dbErr: any) {
        console.warn("⚠️ Excel hometax invoices query failed:", dbErr.message);
      }

      return NextResponse.json({
        success: true,
        data: {
          list: list,
          total: total
        }
      });
    }

    // 4-1. 국세청 홈택스 전자계산서(면세) 조회
    if (tab === "hometax-exempt") {
      let list: any[] = [];
      let total = 0;

      try {
        let query = `SELECT * FROM tax_exempt_invoices WHERE (tenant_id = '${tenantId}' OR tenant_id = 'tenant-default-id' OR tenant_id = 'default' OR tenant_id IS NULL)`;
        const whereClauses: string[] = [];
        
        if (startDate) {
          const normalizedStart = startDate.replace(/-/g, ".");
          whereClauses.push(`(작성일자 >= '${startDate}' OR 작성일자 >= '${normalizedStart}' OR issue_date >= '${startDate}' OR issue_date >= '${normalizedStart}')`);
        }
        if (endDate) {
          const normalizedEnd = endDate.replace(/-/g, ".");
          whereClauses.push(`(작성일자 <= '${endDate}' OR 작성일자 <= '${normalizedEnd}' OR issue_date <= '${endDate}' OR issue_date <= '${normalizedEnd}')`);
        }
        if (searchText) {
          const cleanText = searchText.replace(/'/g, "''");
          whereClauses.push(`(공급자상호 LIKE '%${cleanText}%' OR supplier_corp_name LIKE '%${cleanText}%' OR 공급받는자상호 LIKE '%${cleanText}%' OR buyer_corp_name LIKE '%${cleanText}%' OR 품목명 LIKE '%${cleanText}%' OR item_name LIKE '%${cleanText}%')`);
        }
        if (invoiceType && invoiceType !== "all") {
          const isSales = invoiceType === 'sales' || invoiceType === '매출';
          whereClauses.push(`(invoice_type = '${invoiceType}' OR type = '${isSales ? 'SALES' : 'PURCHASE'}' OR invoice_type = '${isSales ? '매출' : '매입'}')`);
        }
        
        if (whereClauses.length > 0) {
          query += " AND " + whereClauses.join(" AND ");
        }

        const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
        const countRes = await executeSQL(countQuery).catch(() => ({ rows: [] }));
        const totalCount = countRes.rows?.[0]?.cnt || 0;
        
        if (totalCount > 0) {
          total = totalCount;
          query += ` ORDER BY COALESCE(작성일자, issue_date) DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
          const dbRes = await executeSQL(query);
          const dbRows = (dbRes.rows || []).filter((r: any) => !r.deleted_at);
          list = dbRows.map(mapTaxInvoiceToFrontend).filter(Boolean);
        } else {
          // Fallback to legacy excel_hometax_invoices
          const legacyQuery = `SELECT * FROM excel_hometax_invoices WHERE (tenant_id = '${tenantId}' OR tenant_id = 'tenant-default-id' OR tenant_id = 'default' OR tenant_id IS NULL) AND is_exempt = 1`;
          const legacyRes = await executeSQL(legacyQuery).catch(() => ({ rows: [] }));
          if (legacyRes.rows?.length) {
            const rows = (legacyRes.rows || []).filter((r: any) => !r.deleted_at);
            total = rows.length;
            list = rows.slice(offset, offset + limit).map(mapTaxInvoiceToFrontend).filter(Boolean);
          }
        }
      } catch (dbErr: any) {
        console.warn("⚠️ Excel hometax exempt invoices query failed:", dbErr.message);
      }

      return NextResponse.json({
        success: true,
        data: {
          list: list,
          total: total
        }
      });
    }

    // 5. 국세청 홈택스 현금영수증 조회
    if (tab === "hometax-cash") {
      let list: any[] = [];
      let total = 0;
      const cashPurpose = searchParams.get("cashPurpose") || undefined;

      try {
        let query = `SELECT * FROM cash_receipts WHERE (tenant_id = '${tenantId}' OR tenant_id = 'tenant-default-id' OR tenant_id = 'default' OR tenant_id IS NULL)`;
        const whereClauses: string[] = [];
        
        if (startDate) {
          const normalizedStart = startDate.replace(/-/g, ".");
          whereClauses.push(`(매출일시 >= '${startDate}' OR 매출일시 >= '${normalizedStart}' OR transaction_date >= '${startDate}' OR transaction_date >= '${normalizedStart}')`);
        }
        if (endDate) {
          const normalizedEnd = endDate.replace(/-/g, ".");
          whereClauses.push(`(매출일시 <= '${endDate}' OR 매출일시 <= '${normalizedEnd}' OR transaction_date <= '${endDate}' OR transaction_date <= '${normalizedEnd}')`);
        }
        if (searchText) {
          const cleanText = searchText.replace(/'/g, "''");
          whereClauses.push(`(가맹점명 LIKE '%${cleanText}%' OR 승인번호 LIKE '%${cleanText}%' OR franchise_name LIKE '%${cleanText}%' OR memo LIKE '%${cleanText}%')`);
        }
        if (cashPurpose && cashPurpose !== "all") {
          whereClauses.push(`(용도구분 = '${cashPurpose}' OR purpose = '${cashPurpose}')`);
        }
        
        if (whereClauses.length > 0) {
          query += " AND " + whereClauses.join(" AND ");
        }

        const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
        const countRes = await executeSQL(countQuery).catch(() => ({ rows: [] }));
        const totalCount = countRes.rows?.[0]?.cnt || 0;
        
        if (totalCount > 0) {
          total = totalCount;
          query += ` ORDER BY COALESCE(매출일시, transaction_date) DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
          const dbRes = await executeSQL(query);
          const dbRows = dbRes.rows || [];
          list = dbRows.map(mapCashReceiptToFrontend).filter(Boolean);
        } else {
          // Fallback to legacy excel_hometax_cash_receipts
          const legacyQuery = `SELECT * FROM excel_hometax_cash_receipts WHERE tenant_id = '${tenantId}'`;
          const legacyRes = await executeSQL(legacyQuery).catch(() => ({ rows: [] }));
          if (legacyRes.rows?.length) {
            total = legacyRes.rows.length;
            list = legacyRes.rows.slice(offset, offset + limit).map(mapCashReceiptToFrontend).filter(Boolean);
          }
        }
      } catch (dbErr: any) {
        console.warn("⚠️ Excel hometax cash query failed:", dbErr.message);
      }

      return NextResponse.json({
        success: true,
        data: {
          list: list,
          total: total
        }
      });
    }

    // 6. 업로드 동기화 이력 로그 (수동 엑셀의 경우, 단순 업로드 일시와 파일 수량을 요약 반환)
    if (tab === "sync") {
      try {
        const latestTx = await executeSQL(`
          SELECT created_at, COUNT(*) as cnt, bank_id
          FROM excel_bank_transactions
          WHERE tenant_id = '${tenantId}'
          GROUP BY created_at, bank_id
          ORDER BY created_at DESC
          LIMIT 10
        `).catch(() => ({ rows: [] }));

        const syncHistory = (latestTx.rows || []).map((row: any, index: number) => ({
          id: `sync-${index}`,
          sync_date: row.created_at || "",
          sync_time: "",
          bank_id: row.bank_id,
          bank_name: bankNames[row.bank_id] || "수동업로드",
          status: "성공",
          records_count: row.cnt,
          remarks: "엑셀 수동 반입 완료"
        }));

        return NextResponse.json({
          success: true,
          data: {
            syncHistory: syncHistory,
            hometaxSync: [],
            hometaxConnections: []
          }
        });
      } catch (e) {
        return NextResponse.json({
          success: true,
          data: { syncHistory: [], hometaxSync: [], hometaxConnections: [] }
        });
      }
    }

    // 7. 자금 요약 요점 통계 (금월, 전월, 전전월 등)
    if (tab === "summary") {
      const now = new Date();
      let currentYear = now.getFullYear();
      let currentMonth = now.getMonth(); 

      try {
        const [latestCardTxRes, latestTaxInvRes] = await Promise.all([
          executeSQL(`SELECT approval_date as dt FROM card_transactions WHERE approval_date IS NOT NULL AND approval_date != '' ORDER BY approval_date DESC LIMIT 1`).catch(() => ({ rows: [] })),
          executeSQL(`SELECT COALESCE(작성일자, issue_date) as dt FROM tax_invoices WHERE COALESCE(작성일자, issue_date) IS NOT NULL ORDER BY dt DESC LIMIT 1`).catch(() => ({ rows: [] }))
        ]);
        const cardDate = latestCardTxRes.rows?.[0]?.dt;
        const invDate = latestTaxInvRes.rows?.[0]?.dt;
        const latestDate = [cardDate, invDate].filter(Boolean).sort().pop();

        if (latestDate) {
          const dateParts = String(latestDate).replace(/\./g, "-").split("-");
          if (dateParts.length >= 2) {
            const latestYear = parseInt(dateParts[0], 10);
            const latestMonth = parseInt(dateParts[1], 10) - 1;
            if (!isNaN(latestYear) && !isNaN(latestMonth) && latestYear > 2000) {
              currentYear = latestYear;
              currentMonth = latestMonth;
            }
          }
        }
      } catch (e: any) {
        console.warn("⚠️ Smart summary date detection failed:", e.message);
      }

      const getYearMonthStr = (y: number, m: number) => {
        return `${y}-${String(m + 1).padStart(2, '0')}`;
      };

      const m0Str = getYearMonthStr(currentYear, currentMonth);
      const m1Date = new Date(currentYear, currentMonth - 1, 1);
      const m1Str = getYearMonthStr(m1Date.getFullYear(), m1Date.getMonth());
      const m2Date = new Date(currentYear, currentMonth - 2, 1);
      const m2Str = getYearMonthStr(m2Date.getFullYear(), m2Date.getMonth());

      const yearStart = `${currentYear}-01-01`;
      const m2Start = `${m2Date.getFullYear()}-${String(m2Date.getMonth() + 1).padStart(2, '0')}-01`;
      const filterStartDate = m2Start < yearStart ? m2Start : yearStart;

      const tenantCond = `(tenant_id = '${tenantId}' OR tenant_id = 'tenant-default-id' OR tenant_id = 'default' OR tenant_id IS NULL)`;

      const [cardTxRes, taxInvoiceRes, cashReceiptRes, legacyCardRes, legacyTaxRes] = await Promise.all([
        executeSQL(`SELECT * FROM card_transactions WHERE ${tenantCond}`).catch(() => ({ rows: [] })),
        executeSQL(`SELECT * FROM tax_invoices WHERE ${tenantCond}`).catch(() => ({ rows: [] })),
        executeSQL(`SELECT * FROM cash_receipts WHERE ${tenantCond}`).catch(() => ({ rows: [] })),
        executeSQL(`SELECT * FROM excel_card_transactions WHERE ${tenantCond}`).catch(() => ({ rows: [] })),
        executeSQL(`SELECT * FROM excel_hometax_invoices WHERE ${tenantCond}`).catch(() => ({ rows: [] }))
      ]);

      const allCardRows = [...(cardTxRes.rows || []), ...(legacyCardRes.rows || [])].filter((r: any) => !r.deleted_at);
      const allTaxRows = [...(taxInvoiceRes.rows || []), ...(legacyTaxRes.rows || [])].filter((r: any) => !r.deleted_at);
      const allCashRows = (cashReceiptRes.rows || []).filter((r: any) => !r.deleted_at);

      const cardTxList = allCardRows.map(mapCardTransactionToFrontend).filter(Boolean);
      const taxInvoiceList = allTaxRows.map(mapTaxInvoiceToFrontend).filter(Boolean);
      const cashReceiptList = allCashRows.map(mapCashReceiptToFrontend).filter(Boolean);

      // 카드 통계
      const cardMap: Record<string, any> = {};
      cardTxList.forEach((tx) => {
        if (tx.status === "취소") return;
        const company = tx.cardCompanyName || "기타카드";
        const num = tx.cardNumber || "0000";
        const key = `${company}_${num}`;

        if (!cardMap[key]) {
          cardMap[key] = {
            cardCompanyName: company,
            cardNumber: num,
            m0: 0, m1: 0, m2: 0, yTotal: 0,
            lastTxDate: "", lastTxTime: ""
          };
        }

        const amount = Number(tx.amount) || 0;
        const txYM = (tx.date || "").substring(0, 7);

        if (txYM === m0Str) cardMap[key].m0 += amount;
        else if (txYM === m1Str) cardMap[key].m1 += amount;
        else if (txYM === m2Str) cardMap[key].m2 += amount;

        if ((tx.date || "").startsWith(String(currentYear))) {
          cardMap[key].yTotal += amount;
        }

        const currentLastTx = cardMap[key].lastTxDate ? `${cardMap[key].lastTxDate} ${cardMap[key].lastTxTime}` : "";
        const txDateTime = `${tx.date} ${tx.time}`;
        if (!currentLastTx || txDateTime > currentLastTx) {
          cardMap[key].lastTxDate = tx.date;
          cardMap[key].lastTxTime = tx.time;
        }
      });

      // 홈택스 통계
      const hometaxSummary = {
        sales: { m0: 0, m1: 0, m2: 0, yTotal: 0 },
        purchase: { m0: 0, m1: 0, m2: 0, yTotal: 0 }
      };

      taxInvoiceList.forEach((inv) => {
        const isSales = inv.invoiceType === "sales";
        const target = isSales ? hometaxSummary.sales : hometaxSummary.purchase;
        const amount = Number(inv.supplyAmount) || 0;
        const ym = (inv.issueDate || "").substring(0, 7);

        if (ym === m0Str) target.m0 += amount;
        else if (ym === m1Str) target.m1 += amount;
        else if (ym === m2Str) target.m2 += amount;

        if ((inv.issueDate || "").startsWith(String(currentYear))) {
          target.yTotal += amount;
        }
      });

      cashReceiptList.forEach((rcpt) => {
        const target = hometaxSummary.sales; 
        const amount = Number(rcpt.supplyAmount) || 0;
        const ym = (rcpt.transactionDate || "").substring(0, 7);

        if (ym === m0Str) target.m0 += amount;
        else if (ym === m1Str) target.m1 += amount;
        else if (ym === m2Str) target.m2 += amount;

        if ((rcpt.transactionDate || "").startsWith(String(currentYear))) {
          target.yTotal += amount;
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          months: [m0Str, m1Str, m2Str],
          cardSummary: Object.values(cardMap),
          hometaxSummary
        }
      });
    }

    // 8. 수금/지급 대조 AI
    if (tab === "matching") {
      const matchStatus = searchParams.get("status") || "all"; 
      const invoiceType = searchParams.get("invoiceType") || "all"; 
      
      let list: any[] = [];
      let total = 0;
      
      try {
        let baseQuery = `
          WITH combined_invoices AS (
            SELECT 
              'tax' AS source_table, 
              id, 
              COALESCE(invoice_type, 'sales') AS invoice_type, 
              COALESCE(작성일자, issue_date) AS 작성일자, 
              COALESCE(공급자상호, supplier_corp_name) AS 공급자상호, 
              COALESCE(공급받는자상호, buyer_corp_name) AS 공급받는자상호, 
              COALESCE(합계금액, total_amount) AS 합계금액, 
              COALESCE(공급가액, supply_amount) AS 공급가액, 
              COALESCE(세액, tax_amount) AS 세액, 
              COALESCE(품목명, item_name) AS 품목명, 
              memo,
              tenant_id,
              deleted_at
            FROM tax_invoices
            UNION ALL
            SELECT 
              'exempt' AS source_table, 
              id, 
              COALESCE(invoice_type, 'sales') AS invoice_type, 
              COALESCE(작성일자, issue_date) AS 작성일자, 
              COALESCE(공급자상호, supplier_corp_name) AS 공급자상호, 
              COALESCE(공급받는자상호, buyer_corp_name) AS 공급받는자상호, 
              COALESCE(합계금액, total_amount) AS 합계금액, 
              COALESCE(공급가액, supply_amount) AS 공급가액, 
              COALESCE(세액, tax_amount) AS 세액, 
              COALESCE(품목명, item_name) AS 품목명, 
              memo,
              tenant_id,
              deleted_at
            FROM tax_exempt_invoices
          ),
          matched_pairs AS (
            SELECT 
              i.*,
              bt.id AS bank_tx_id,
              bt.transaction_date AS bank_tx_date,
              bt.transaction_time AS bank_tx_time,
              bt.bank_id AS bank_tx_bank_id,
              bt.account_number AS bank_tx_account_number,
              bt.deposit AS bank_tx_deposit,
              bt.withdrawal AS bank_tx_withdrawal,
              bt.description AS bank_tx_description,
              ROW_NUMBER() OVER (
                PARTITION BY i.source_table, i.id 
                ORDER BY ABS(julianday(bt.transaction_date) - julianday(i.작성일자)) ASC, bt.id ASC
              ) as rn
            FROM combined_invoices i
            LEFT JOIN excel_bank_transactions bt ON (
              bt.tenant_id = '${tenantId}' AND bt.deleted_at IS NULL AND (
                (i.invoice_type = 'sales' AND bt.deposit = i.합계금액) OR
                (i.invoice_type = 'purchase' AND bt.withdrawal = i.합계금액)
              )
            ) AND (
              (i.invoice_type = 'sales' AND (
                 bt.description LIKE '%' || REPLACE(REPLACE(REPLACE(REPLACE(i.공급받는자상호, '(주)', ''), '주식회사', ''), '(합자)', ''), '(유한)', '') || '%'
              )) OR
              (i.invoice_type = 'purchase' AND (
                 bt.description LIKE '%' || REPLACE(REPLACE(REPLACE(REPLACE(i.공급자상호, '(주)', ''), '주식회사', ''), '(합자)', ''), '(유한)', '') || '%'
              ))
            )
            WHERE i.tenant_id = '${tenantId}' AND i.deleted_at IS NULL AND (bt.id IS NULL OR ABS(julianday(bt.transaction_date) - julianday(i.작성일자)) <= 90)
          )
          SELECT * FROM matched_pairs WHERE rn = 1
        `;
        
        let whereClauses: string[] = [];
        if (startDate) {
          whereClauses.push(`작성일자 >= '${startDate}'`);
        }
        if (endDate) {
          whereClauses.push(`작성일자 <= '${endDate}'`);
        }
        if (invoiceType && invoiceType !== "all") {
          whereClauses.push(`invoice_type = '${invoiceType}'`);
        }
        if (matchStatus === "matched") {
          whereClauses.push("bank_tx_id IS NOT NULL");
        } else if (matchStatus === "unmatched") {
          whereClauses.push("bank_tx_id IS NULL");
        }
        if (searchText) {
          const cleanText = searchText.replace(/'/g, "''");
          whereClauses.push(`(공급자상호 LIKE '%${cleanText}%' OR 공급받는자상호 LIKE '%${cleanText}%' OR 품목명 LIKE '%${cleanText}%')`);
        }
        
        let filterQuery = `SELECT * FROM (${baseQuery}) AS m`;
        if (whereClauses.length > 0) {
          filterQuery += " WHERE " + whereClauses.join(" AND ");
        }
        
        const countQuery = `SELECT COUNT(*) as cnt FROM (${filterQuery})`;
        const countRes = await executeSQL(countQuery);
        total = countRes.rows?.[0]?.cnt || 0;
        
        filterQuery += ` ORDER BY 작성일자 DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
        const dbRowsRes = await executeSQL(filterQuery);
        
        list = (dbRowsRes.rows || []).map((row: any) => {
          const isSales = row.invoice_type === "sales";
          return {
            id: `${row.source_table}_${row.id}`,
            sourceTable: row.source_table,
            dbId: row.id,
            invoiceType: row.invoice_type,
            issueDate: row.작성일자,
            supplierName: row.공급자상호,
            buyerName: row.공급받는자상호,
            totalAmount: row.합계금액,
            supplyAmount: row.공급가액,
            taxAmount: row.세액,
            itemName: row.품목명,
            memo: row.memo,
            bankTx: row.bank_tx_id ? {
              id: row.bank_tx_id,
              date: row.bank_tx_date,
              time: row.bank_tx_time,
              bankId: row.bank_tx_bank_id,
              bankName: bankNames[row.bank_tx_bank_id] || "기타은행",
              accountNumber: row.bank_tx_account_number,
              amount: isSales ? row.bank_tx_deposit : row.bank_tx_withdrawal,
              counterparty: "",
              description: row.bank_tx_description
            } : null
          };
        });
      } catch (dbErr: any) {
        console.error("⚠️ SQLite Matching query failed:", dbErr);
        return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        data: { list, total }
      });
    }

    return NextResponse.json({ success: false, error: "알려지지 않은 금융 탭 정보입니다." }, { status: 400 });
  } catch (error: any) {
    console.error("Excel Finance API Error:", error);
    return NextResponse.json({ success: false, error: error.message || "금융 데이터 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// 📁 [POST] 엑셀 수동 계좌 정보 UPSERT 처리
export async function POST(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { bankId, accountNumber, accountName, balance } = body;

    if (!bankId || !accountNumber) {
      return NextResponse.json({ success: false, error: "은행 코드와 계좌번호는 필수입니다." }, { status: 400 });
    }

    const cleanedAccNum = accountNumber.replace(/\D/g, "");
    const accId = `${bankId.toUpperCase()}-${cleanedAccNum}`;

    const checkRes = await queryTable('excel_accounts', {
      filters: { id: accId, tenant_id: tenantId }
    });

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    if (checkRes.rows && checkRes.rows.length > 0) {
      // UPDATE
      await updateRows('excel_accounts', {
        account_name: accountName || "수동 등록 계좌",
        balance: Number(balance) || 0,
        updated_at: nowStr,
        updated_by: username,
        deleted_at: null, 
        restored_at: nowStr,
        restored_by: username
      }, {
        filters: { id: accId, tenant_id: tenantId }
      });
    } else {
      // INSERT
      const uuid = `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await insertRows('excel_accounts', [{
        id: accId,
        bank_id: bankId,
        bank_name: bankNames[bankId] || "기타은행",
        account_number: accountNumber,
        account_name: accountName || "수동 등록 계좌",
        balance: Number(balance) || 0,
        currency: "KRW",
        tenant_id: tenantId,
        uuid: uuid,
        updated_at: nowStr,
        updated_by: username
      }]);
    }

    return NextResponse.json({
      success: true,
      message: "성공적으로 계좌를 등록/갱신하였습니다."
    });
  } catch (error: any) {
    console.error("Excel Account Creation Error:", error);
    return NextResponse.json({ success: false, error: error.message || "계좌 등록 중 시스템 오류가 발생했습니다." }, { status: 500 });
  }
}

// 📁 [PUT] 단 건 금융 데이터 카테고리/메모 업데이트
export async function PUT(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, category, memo } = body; 

    if (!id || !type) {
      return NextResponse.json({ success: false, error: "대상 거래유형(type)과 ID(id)는 필수입니다." }, { status: 400 });
    }

    const tableNameMap: Record<string, string> = {
      bank: 'excel_bank_transactions',
      card: 'excel_card_transactions',
      invoice: 'excel_hometax_invoices',
      cash: 'excel_hometax_cash_receipts'
    };

    const targetTable = tableNameMap[type];
    if (!targetTable) {
      return NextResponse.json({ success: false, error: "올바르지 않은 거래 유형입니다." }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    const updateFields: any = {
      updated_at: nowStr,
      updated_by: username
    };
    if (category !== undefined) updateFields.category = category;
    if (memo !== undefined) updateFields.memo = memo;

    const updateRes = await updateRows(targetTable, updateFields, {
      filters: { id: String(id), tenant_id: tenantId }
    });

    if (!updateRes || !updateRes.success) {
      return NextResponse.json({ success: false, error: "데이터 업데이트에 실패했습니다. 데이터를 찾을 수 없거나 테넌트 소유가 아닙니다." }, { status: 404 });
    }

    // 지출 대장 동기화 (RPA)
    if (type === 'bank') {
      try {
        await updateRows('crm_expenses', {
          category: category || "",
          memo: memo || "",
          updated_at: nowStr,
          updated_by: username
        }, {
          filters: { id: `exp-excel-bank-${id}`, tenant_id: tenantId }
        });
      } catch (err: any) {
        console.warn("[Excel In-App Sync Warning] crm_expenses sync failed:", err.message);
      }
    }

    return NextResponse.json({ success: true, message: "성공적으로 데이터를 수정하였습니다." });
  } catch (error: any) {
    console.error("Excel transaction update error:", error);
    return NextResponse.json({ success: false, error: error.message || "데이터 수정 중 시스템 예외가 발생했습니다." }, { status: 500 });
  }
}

// 📁 [DELETE] 단 건 소프트 삭제 처리
export async function DELETE(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type"); 
    const id = searchParams.get("id");

    if (!id || !type) {
      return NextResponse.json({ success: false, error: "삭제할 대상 유형(type)과 ID(id)는 필수입니다." }, { status: 400 });
    }

    const tableNameMap: Record<string, string> = {
      account: 'excel_accounts',
      bank: 'excel_bank_transactions',
      card: 'excel_card_transactions',
      invoice: 'excel_hometax_invoices',
      cash: 'excel_hometax_cash_receipts'
    };

    const targetTable = tableNameMap[type];
    if (!targetTable) {
      return NextResponse.json({ success: false, error: "올바르지 않은 삭제 대상 유형입니다." }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    const deleteRes = await updateRows(targetTable, {
      deleted_at: nowStr,
      deleted_by: username
    }, {
      filters: { id: String(id), tenant_id: tenantId }
    });

    if (!deleteRes || !deleteRes.success) {
      return NextResponse.json({ success: false, error: "소프트 삭제 처리에 실패했습니다." }, { status: 404 });
    }

    if (type === 'account') {
      await updateRows('excel_bank_transactions', {
        deleted_at: nowStr,
        deleted_by: username
      }, {
        filters: { account_id: String(id), tenant_id: tenantId }
      }).catch(() => null);

      await updateRows('excel_card_transactions', {
        deleted_at: nowStr,
        deleted_by: username
      }, {
        filters: { account_id: String(id), tenant_id: tenantId }
      }).catch(() => null);
    }

    return NextResponse.json({ success: true, message: "성공적으로 데이터를 삭제(소프트 삭제)하였습니다." });
  } catch (error: any) {
    console.error("Excel data delete error:", error);
    return NextResponse.json({ success: false, error: error.message || "데이터 삭제 중 예외가 발생했습니다." }, { status: 500 });
  }
}
