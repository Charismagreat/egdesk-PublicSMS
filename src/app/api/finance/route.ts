export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import {
  listAccounts,
  queryBankTransactions,
  queryCardTransactions,
  queryTaxInvoices,
  queryTaxExemptInvoices,
  queryCashReceipts,
  getOverallStats,
  getSyncHistory,
  getHometaxSyncHistory,
  listHometaxConnections,
  upsertFinanceHubAccount,
  executeSQL,
  queryTable
} from "../../../../egdesk-helpers";

// 이중 안전 장치: 배열이 아닐 경우 빈 배열로 방어 처리
function safeArray<T>(data: any): T[] {
  return Array.isArray(data) ? data : [];
}

// 은행 식별별 한글명 매핑 딕셔너리
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

// 계좌 데이터를 프론트엔드 규격 포맷으로 변환하는 매퍼 함수
function mapAccountToFrontend(acc: any): any {
  if (!acc) return null;
  const bankId = acc.bank_id || acc.bankId || "";
  return {
    id: String(acc.id || ""),
    bankId: bankId,
    bankName: acc.bank_name || acc.bankName || bankNames[bankId] || "기타은행",
    accountNumber: acc.account_number || acc.accountNumber || "",
    accountName: acc.account_name || acc.accountName || "입출식 예금",
    balance: Math.floor(Number(acc.balance || 0)),
    currency: acc.currency || "KRW",
    updatedAt: acc.updated_at || acc.updatedAt || ""
  };
}

// 거래 데이터를 프론트엔드 규격 포맷으로 변환하는 매퍼 함수
function mapTransactionToFrontend(tx: any): any {
  if (!tx) return null;
  const deposit = Number(tx.deposit || 0);
  const withdrawal = Number(tx.withdrawal || 0);
  const isDeposit = deposit > 0;
  const bankId = tx.bank_id || tx.bankId || "";
  
  return {
    id: String(tx.id || ""),
    date: tx.transaction_date || tx.transactionDate || tx.date || "",
    time: tx.transaction_time || tx.transactionTime || tx.time || "",
    description: tx.description || "",
    category: tx.category || "",
    memo: tx.memo || "",
    type: isDeposit ? "deposit" : "withdrawal",
    amount: Math.floor(isDeposit ? deposit : withdrawal),
    balance: Math.floor(Number(tx.balance || 0)),
    bankId: bankId,
    bankName: tx.bank_name || tx.bankName || bankNames[bankId] || "기타은행",
    accountId: tx.account_id || tx.accountId || "",
    accountNumber: tx.account_number || tx.accountNumber || ""
  };
}

// 카드 거래 데이터를 프론트엔드 규격 포맷으로 변환하는 매퍼 함수
function mapCardTransactionToFrontend(tx: any): any {
  if (!tx) return null;
  const companyId = tx.card_company_id || tx.cardCompanyId || "";
  
  return {
    id: String(tx.id || ""),
    accountId: tx.account_id || tx.accountId || "",
    cardCompanyId: companyId,
    cardCompanyName: tx.card_company_name || tx.cardCompanyName || 
                     (companyId === "shinhan-card" ? "신한카드" :
                      companyId === "kb-card" ? "KB국민카드" :
                      companyId === "nh-card" ? "NH농협카드" :
                      companyId === "bc-card" ? "BC카드" :
                      companyId === "hana-card" ? "하나카드" : "기타카드"),
    cardNumber: tx.card_number || tx.cardNumber || "",
    cardholderName: tx.cardholder_name || tx.cardholderName || "",
    usageType: tx.usage_type || tx.usageType || "일시불",
    salesType: tx.sales_type || tx.salesType || "일반매출",
    date: tx.approval_date || tx.approvalDate || tx.date || "",
    time: tx.time || tx.approvalTime || (tx.approval_datetime ? tx.approval_datetime.split(" ")[1] || "" : "") || (tx.approvalDatetime ? tx.approvalDatetime.split(" ")[1] || "" : "") || "00:00:00",
    approvalNumber: tx.approval_number || tx.approvalNumber || "",
    merchantName: tx.merchant_name || tx.merchantName || "",
    amount: Math.floor(Number(tx.amount || 0)),
    status: tx.status || (tx.is_cancelled ? "취소" : "승인"),
    memo: tx.memo || "",
    category: tx.category || "",
    receiptUrl: tx.receipt_url || tx.receiptUrl || ""
  };
}

// 국세청 세금계산서 데이터를 프론트엔드 영문 규격 포맷으로 변환하는 매퍼 함수
function mapTaxInvoiceToFrontend(inv: any): any {
  if (!inv) return null;
  const isSales = inv.invoice_type === "sales" || inv.invoiceType === "sales" || inv.invoiceType === "매출" || inv.invoice_type === "매출";
  
  // 매입의 경우 공급자가 거래처, 매출의 경우 공급받는자가 거래처
  const partnerBusinessNo = isSales 
    ? (inv.공급받는자사업자등록번호 || inv.buyerBusinessNumber || "") 
    : (inv.공급자사업자등록번호 || inv.supplierBusinessNumber || "");

  return {
    id: String(inv.id || ""),
    issueDate: inv.작성일자 || inv.issueDate || "",
    supplierName: inv.공급자상호 || inv.supplierName || "",
    buyerName: inv.공급받는자상호 || inv.buyerName || "",
    supplyAmount: Math.floor(Number(inv.공급가액 || inv.supplyAmount || 0)),
    taxAmount: Math.floor(Number(inv.세액 || inv.taxAmount || 0)),
    totalAmount: Math.floor(Number(inv.합계금액 || inv.totalAmount || 0)),
    itemName: inv.품목명 || inv.itemName || "",
    invoiceType: inv.invoice_type || inv.invoiceType || (isSales ? "sales" : "purchase"),
    partnerBusinessNumber: partnerBusinessNo,
    memo: inv.memo || ""
  };
}

// 국세청 현금영수증 데이터를 프론트엔드 영문 규격 포맷으로 변환하는 매퍼 함수
function mapCashReceiptToFrontend(rcpt: any): any {
  if (!rcpt) return null;
  return {
    id: String(rcpt.id || ""),
    transactionDate: rcpt.매출일시 || rcpt.transactionDate || "",
    franchiseName: rcpt.비고 || rcpt.franchiseName || "국세청 현금영수증",
    approvalNumber: rcpt.승인번호 || rcpt.approvalNumber || "",
    supplyAmount: Math.floor(Number(rcpt.공급가액 || rcpt.supplyAmount || 0)),
    taxAmount: Math.floor(Number(rcpt.부가세 || rcpt.taxAmount || 0)),
    totalAmount: Math.floor(Number(rcpt.총금액 || rcpt.totalAmount || 0)),
    purpose: rcpt.용도구분 || rcpt.purpose || "",
    memo: rcpt.memo || ""
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tab = searchParams.get("tab") || "accounts";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const searchText = searchParams.get("searchText") || undefined;
    const invoiceType = (searchParams.get("invoiceType") as "sales" | "purchase" | "all") || undefined;
    const limit = Number(searchParams.get("limit")) || 30;
    const offset = Number(searchParams.get("offset")) || 0;

    // 1. 계좌 목록 및 종합 통계 조회
    if (tab === "accounts") {
      const [accountsRes, stats] = await Promise.all([
        listAccounts().catch(() => ({ accounts: [] })),
        getOverallStats().catch(() => null)
      ]);
      const accountsRaw = safeArray<any>(accountsRes?.accounts || accountsRes);
      let accounts = accountsRaw.map(mapAccountToFrontend).filter(Boolean);
      
      // [로컬 DB 실시간 실잔액 머지] 로컬 SQLite DB에 수동으로 직접 적재된 계좌가 있다면 그 최신 잔액으로 덮어씌워 줍니다.
      try {
        const localAccountsRes = await executeSQL("SELECT id, balance FROM accounts").catch(() => ({ rows: [] }));
        const localAccounts = localAccountsRes.rows || [];
        
        const localBalanceMap: Record<string, number> = {};
        localAccounts.forEach((la: any) => {
          localBalanceMap[la.id] = la.balance;
        });
        
        accounts = await Promise.all(accounts.map(async (acc: any) => {
          let lastTxDate = "";
          let lastTxTime = "";
          try {
            const isCard = acc.id.includes("CARD") || (acc.bankId && acc.bankId.includes("card")) || acc.accountName.includes("카드");
            if (isCard) {
              // 신용카드의 가장 최신 정상 거래 일시 조회
              const latestCardTxRes = await executeSQL(`
                SELECT approval_date, time 
                FROM card_transactions 
                WHERE account_id = '${acc.id}' AND approval_date LIKE '2%'
                ORDER BY approval_date DESC, time DESC, id DESC 
                LIMIT 1
              `);
              const latestCardTx = latestCardTxRes.rows?.[0];
              if (latestCardTx) {
                lastTxDate = latestCardTx.approval_date || "";
                lastTxTime = latestCardTx.time || "";
              }
            } else {
              // 은행 계좌의 가장 최신 정상 거래 일시 조회
              const latestTxRes = await executeSQL(`
                SELECT transaction_date, transaction_time 
                FROM bank_transactions 
                WHERE account_id = '${acc.id}' AND transaction_date LIKE '2%'
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
            console.warn(`[Local DB last tx date query failed] for account ${acc.id}:`, txErr.message);
          }

          const balanceVal = localBalanceMap[acc.id] !== undefined ? localBalanceMap[acc.id] : acc.balance;
          if (localBalanceMap[acc.id] !== undefined) {
            console.log(`[Local DB accounts merge] 계좌 잔액 동기화 반영: ${acc.id} -> ₩${localBalanceMap[acc.id]}`);
          }

          return {
            ...acc,
            balance: balanceVal,
            lastTxDate,
            lastTxTime
          };
        }));
      } catch (dbErr: any) {
        console.warn("⚠️ Local DB accounts merge warning:", dbErr.message);
      }
      
      // stats의 totalBalance 계산에 오류가 있을 수 있으므로 직접 합산하여 폴백 처리
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
      let localQuerySuccess = false;

      // [로컬 DB 실시간 실데이터 최우선 조회] 수동 업로드 등으로 로컬 DB에 실데이터가 적재된 환경이므로 로컬 DB를 최우선 조회합니다.
      try {
        let query = `SELECT * FROM bank_transactions WHERE 1=1`;
        const whereClauses: string[] = [];
        
        if (startDate) {
          const normalizedStart = startDate.replace(/-/g, ".");
          whereClauses.push(`(transaction_date >= '${startDate}' OR transaction_date >= '${normalizedStart}')`);
        }
        if (endDate) {
          const normalizedEnd = endDate.replace(/-/g, ".");
          whereClauses.push(`(transaction_date <= '${endDate}' OR transaction_date <= '${normalizedEnd}')`);
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
        
        // 전체 카운트 구하기
        const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
        const countRes = await executeSQL(countQuery).catch(() => ({ rows: [] }));
        const totalCount = countRes.rows?.[0]?.cnt || 0;
        
        if (totalCount > 0) {
          total = totalCount;

          // 페이징 및 최신순 정렬 적용
          query += ` ORDER BY transaction_date DESC, transaction_time DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
          
          const localTxsRes = await executeSQL(query);
          const localTxs = localTxsRes.rows || [];
          
          // 프론트엔드가 요구하는 포맷으로 표준 매핑 가공
          list = localTxs.map(mapTransactionToFrontend).filter(Boolean);
          localQuerySuccess = true;
          console.log(`[Local DB bank transactions] 로컬 실데이터 최우선 조회 성공: ${list.length}건 반환`);
        }
      } catch (dbErr: any) {
        console.warn("⚠️ Local DB bank transactions primary query failed:", dbErr.message);
      }

      // 만약 로컬 SQLite DB에 데이터가 없거나 조회에 실패한 경우에만 폴백으로 원격 API 헬퍼를 찌릅니다.
      if (!localQuerySuccess) {
        console.log("[Remote DB bank transactions] 로컬 DB 데이터가 없어 원격 API 조회를 진행합니다.");
        const transactions = await queryBankTransactions({
          bankId: bankId === "all" ? undefined : bankId,
          accountId: accountId === "all" ? undefined : accountId,
          startDate,
          endDate,
          searchText,
          limit,
          offset,
          orderBy: "date",
          orderDir: "desc"
        }).catch(() => ({ transactions: [], total: 0 }));

        const rawList = safeArray(transactions?.transactions || transactions);
        list = rawList.map(mapTransactionToFrontend).filter(Boolean);
        total = transactions?.total || list.length;
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
      let localQuerySuccess = false;

      // [로컬 DB 실시간 실데이터 최우선 조회] 수동 업로드 등으로 로컬 DB에 실데이터가 적재된 환경이므로 로컬 DB를 최우선 조회합니다.
      try {
        let query = `SELECT * FROM card_transactions WHERE 1=1`;
        const whereClauses: string[] = [];
        
        if (startDate) {
          const normalizedStart = startDate.replace(/-/g, ".");
          whereClauses.push(`(approval_date >= '${startDate}' OR approval_date >= '${normalizedStart}')`);
        }
        if (endDate) {
          const normalizedEnd = endDate.replace(/-/g, ".");
          whereClauses.push(`(approval_date <= '${endDate}' OR approval_date <= '${normalizedEnd}')`);
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

        // 전체 카운트 구하기
        const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
        const countRes = await executeSQL(countQuery).catch(() => ({ rows: [] }));
        const totalCount = countRes.rows?.[0]?.cnt || 0;
        
        if (totalCount > 0) {
          total = totalCount;

          // 페이징 및 최신순 정렬 적용
          query += ` ORDER BY approval_date DESC, approval_datetime DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
          
          const localCardTxsRes = await executeSQL(query);
          const localCardTxs = localCardTxsRes.rows || [];
          
          // 프론트엔드가 요구하는 포맷으로 표준 매핑 가공
          cardTxList = localCardTxs.map(mapCardTransactionToFrontend).filter(Boolean);
          localQuerySuccess = true;
          console.log(`[Local DB card transactions] 로컬 실데이터 최우선 조회 성공: ${cardTxList.length}건 반환 (총 ${total}건)`);
        }
      } catch (dbErr: any) {
        console.warn("⚠️ Local DB card transactions primary query failed:", dbErr.message);
      }

      // 만약 로컬 SQLite DB에 데이터가 없거나 조회에 실패한 경우에만 폴백으로 원격 API 조회를 진행합니다.
      if (!localQuerySuccess) {
        console.log("[Remote DB card transactions] 로컬 DB 데이터가 없어 원격 API 조회를 진행합니다.");
        try {
          const cardTx = await queryCardTransactions({
            cardCompanyId: cardCompanyId === "all" ? undefined : cardCompanyId,
            cardNumber: cardNumber === "all" ? undefined : cardNumber,
            startDate,
            endDate,
            merchantName: searchText,
            limit,
            offset,
            orderBy: "date",
            orderDir: "desc"
          }).catch(() => null);

          if (cardTx) {
            const rawList = safeArray(cardTx.transactions || cardTx);
            cardTxList = rawList.map(mapCardTransactionToFrontend).filter(Boolean);
            total = cardTx?.total || cardTxList.length;
          }
        } catch (e) {
          console.error("Remote card transactions query failed:", e);
        }
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
    // 4. 국세청 홈택스 전자세금계산서 조회
    if (tab === "hometax-invoice") {
      let filteredList: any[] = [];
      let total = 0;

      try {
        const taxInvoices = await queryTaxInvoices({
          invoiceType: invoiceType === "all" ? undefined : invoiceType,
          startDate,
          endDate,
          limit,
          offset
        }).catch(() => ({ invoices: [], total: 0 }));

        const rawList = safeArray(taxInvoices?.invoices || taxInvoices);
        const list = rawList.map(mapTaxInvoiceToFrontend).filter(Boolean);
        
        filteredList = searchText
          ? list.filter((inv: any) =>
              (inv.supplierName || "").includes(searchText) ||
              (inv.buyerName || "").includes(searchText) ||
              (inv.itemName || "").includes(searchText)
            )
          : list;
          
        total = taxInvoices?.total || filteredList.length;
      } catch (e) {}

      // [로컬 DB 실시간 실데이터 폴백] 원격 API 조회 결과가 없거나 부족한 경우 로컬 SQLite DB의 실데이터를 조회하여 대체 및 병합합니다.
      if (filteredList.length === 0) {
        try {
          let query = `SELECT * FROM tax_invoices WHERE 1=1`;
          const whereClauses: string[] = [];
          
          if (startDate) {
            whereClauses.push(`작성일자 >= '${startDate}'`);
          }
          if (endDate) {
            whereClauses.push(`작성일자 <= '${endDate}'`);
          }
          if (invoiceType && invoiceType !== "all") {
            whereClauses.push(`invoice_type = '${invoiceType}'`);
          }
          
          if (whereClauses.length > 0) {
            query += " AND " + whereClauses.join(" AND ");
          }
          
          // 전체 카운트 구하기
          const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
          const countRes = await executeSQL(countQuery).catch(() => ({ rows: [] }));
          const totalCount = countRes.rows?.[0]?.cnt || 0;
          
          // 정렬 및 페이징 적용
          query += ` ORDER BY 작성일자 DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
          
          const localInvoicesRes = await executeSQL(query);
          const localInvoices = localInvoicesRes.rows || [];
          const mappedList = localInvoices.map(mapTaxInvoiceToFrontend).filter(Boolean);
          
          filteredList = searchText
            ? mappedList.filter((inv: any) =>
                (inv.supplierName || "").includes(searchText) ||
                (inv.buyerName || "").includes(searchText) ||
                (inv.itemName || "").includes(searchText)
              )
            : mappedList;
            
          total = searchText ? filteredList.length : totalCount;
        } catch (dbErr: any) {
          console.warn("⚠️ Local DB hometax-invoice fallback failed:", dbErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          list: filteredList,
          total: total
        }
      });
    }

    // 5. 국세청 홈택스 전자계산서(면세) 조회
    if (tab === "hometax-exempt") {
      let filteredList: any[] = [];
      let total = 0;

      try {
        const exemptInvoices = await queryTaxExemptInvoices({
          invoiceType: invoiceType === "all" ? undefined : invoiceType,
          startDate,
          endDate,
          limit,
          offset
        }).catch(() => ({ invoices: [], total: 0 }));

        const rawList = safeArray(exemptInvoices?.invoices || exemptInvoices);
        const list = rawList.map(mapTaxInvoiceToFrontend).filter(Boolean);
        
        filteredList = searchText
          ? list.filter((inv: any) =>
              (inv.supplierName || "").includes(searchText) ||
              (inv.buyerName || "").includes(searchText) ||
              (inv.itemName || "").includes(searchText)
            )
          : list;
          
        total = exemptInvoices?.total || filteredList.length;
      } catch (e) {}

      // [로컬 DB 실시간 실데이터 폴백] 원격 API 조회 결과가 없거나 부족한 경우 로컬 SQLite DB의 실데이터를 조회하여 대체 및 병합합니다.
      if (filteredList.length === 0) {
        try {
          let query = `SELECT * FROM tax_exempt_invoices WHERE 1=1`;
          const whereClauses: string[] = [];
          
          if (startDate) {
            whereClauses.push(`작성일자 >= '${startDate}'`);
          }
          if (endDate) {
            whereClauses.push(`작성일자 <= '${endDate}'`);
          }
          if (invoiceType && invoiceType !== "all") {
            whereClauses.push(`invoice_type = '${invoiceType}'`);
          }
          
          if (whereClauses.length > 0) {
            query += " AND " + whereClauses.join(" AND ");
          }
          
          // 전체 카운트 구하기
          const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
          const countRes = await executeSQL(countQuery).catch(() => ({ rows: [] }));
          const totalCount = countRes.rows?.[0]?.cnt || 0;
          
          // 정렬 및 페이징 적용
          query += ` ORDER BY 작성일자 DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
          
          const localExemptsRes = await executeSQL(query);
          const localExempts = localExemptsRes.rows || [];
          const mappedList = localExempts.map(mapTaxInvoiceToFrontend).filter(Boolean);
          
          filteredList = searchText
            ? mappedList.filter((inv: any) =>
                (inv.supplierName || "").includes(searchText) ||
                (inv.buyerName || "").includes(searchText) ||
                (inv.itemName || "").includes(searchText)
              )
            : mappedList;
            
          total = searchText ? filteredList.length : totalCount;
        } catch (dbErr: any) {
          console.warn("⚠️ Local DB hometax-exempt fallback failed:", dbErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          list: filteredList,
          total: total
        }
      });
    }

    // 6. 국세청 홈택스 현금영수증 조회
    if (tab === "hometax-cash") {
      const cashPurpose = searchParams.get("cashPurpose") || undefined;
      let filteredList: any[] = [];
      let total = 0;

      try {
        const cashReceipts = await queryCashReceipts({
          startDate,
          endDate,
          limit,
          offset
        }).catch(() => ({ receipts: [], total: 0 }));

        const rawList = safeArray(cashReceipts?.receipts || cashReceipts);
        const list = rawList.map(mapCashReceiptToFrontend).filter(Boolean);
        
        filteredList = list;
        if (cashPurpose && cashPurpose !== "all") {
          filteredList = filteredList.filter((rcpt: any) => rcpt.purpose === cashPurpose);
        }

        if (searchText) {
          filteredList = filteredList.filter((rcpt: any) =>
            (rcpt.franchiseName || "").includes(searchText) ||
            (rcpt.approvalNumber || "").includes(searchText)
          );
        }
        
        total = cashReceipts?.total || filteredList.length;
      } catch (e) {}

      // [로컬 DB 실시간 실데이터 폴백] 원격 API 조회 결과가 없거나 부족한 경우 로컬 SQLite DB의 실데이터를 조회하여 대체 및 병합합니다.
      if (filteredList.length === 0) {
        try {
          let query = `SELECT * FROM cash_receipts WHERE 1=1`;
          const whereClauses: string[] = [];
          
          if (startDate) {
            whereClauses.push(`(매출일시 >= '${startDate}' OR transaction_date >= '${startDate}')`);
          }
          if (endDate) {
            whereClauses.push(`(매출일시 <= '${endDate}' OR transaction_date <= '${endDate}')`);
          }
          if (cashPurpose && cashPurpose !== "all") {
            whereClauses.push(`(용도구분 = '${cashPurpose}' OR purpose = '${cashPurpose}')`);
          }
          
          if (whereClauses.length > 0) {
            query += " AND " + whereClauses.join(" AND ");
          }
          
          // 전체 카운트 구하기
          const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
          const countRes = await executeSQL(countQuery).catch(() => ({ rows: [] }));
          const totalCount = countRes.rows?.[0]?.cnt || 0;
          
          // 정렬 및 페이징 적용
          query += ` ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
          
          const localCashReceiptsRes = await executeSQL(query);
          const localCashReceipts = localCashReceiptsRes.rows || [];
          const mappedList = localCashReceipts.map(mapCashReceiptToFrontend).filter(Boolean);
          
          filteredList = searchText
            ? mappedList.filter((rcpt: any) =>
                (rcpt.franchiseName || "").includes(searchText) ||
                (rcpt.approvalNumber || "").includes(searchText)
              )
            : mappedList;
            
          total = searchText ? filteredList.length : totalCount;
        } catch (dbErr: any) {
          console.warn("⚠️ Local DB hometax-cash fallback failed:", dbErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          list: filteredList,
          total: total
        }
      });
    }

    // 7. 동기화 역사 & 홈택스 연결 정보 조회
    if (tab === "sync") {
      const [syncHistory, hometaxSync, hometaxConnections] = await Promise.all([
        getSyncHistory(50).catch(() => []),
        getHometaxSyncHistory(50).catch(() => []),
        listHometaxConnections().catch(() => [])
      ]);

      return NextResponse.json({
        success: true,
        data: {
          syncHistory: safeArray(syncHistory),
          hometaxSync: safeArray(hometaxSync),
          hometaxConnections: safeArray(hometaxConnections)
        }
      });
    }

    // 8. 금융 종합 수치 통계
    if (tab === "stats") {
      const stats = await getOverallStats().catch(() => null);
      return NextResponse.json({
        success: true,
        data: stats || { totalBalance: 0, activeAccounts: 0, bankCount: 0, transactionCount: 0 }
      });
    }

    // 9. 금월/전월/전전월/금년도 카드 및 홈택스 입출 통합 통계
    if (tab === "summary") {
      const now = new Date();
      let currentYear = now.getFullYear();
      let currentMonth = now.getMonth(); // 0-indexed (5 = 6월)

      // [스마트 집계 기준일 자동 감지] 로컬 DB 내 신용카드 최신 거래일자를 감지하여 통계 집계의 연도/월로 유동적 동기화합니다.
      try {
        const latestCardTxRes = await executeSQL("SELECT approval_date FROM card_transactions ORDER BY approval_date DESC LIMIT 1");
        const latestCardTx = latestCardTxRes.rows?.[0];
        if (latestCardTx && latestCardTx.approval_date) {
          const dateParts = latestCardTx.approval_date.replace(/\./g, "-").split("-");
          if (dateParts.length >= 2) {
            const latestYear = parseInt(dateParts[0], 10);
            const latestMonth = parseInt(dateParts[1], 10) - 1; // 0-indexed
            console.log(`[Smart Summary Date Detect] 최신 카드 승인일(${latestCardTx.approval_date}) 기준으로 통계 기준일을 유동적 갱신합니다: ${latestYear}년 ${latestMonth + 1}월`);
            currentYear = latestYear;
            currentMonth = latestMonth;
          }
        }
      } catch (e: any) {
        console.warn("⚠️ Smart summary date detection failed:", e.message);
      }

      const getYearMonthStr = (y: number, m: number) => {
        return `${y}-${String(m + 1).padStart(2, '0')}`;
      };

      const m0Str = getYearMonthStr(currentYear, currentMonth); // 이번 달

      const m1Date = new Date(currentYear, currentMonth - 1, 1);
      const m1Str = getYearMonthStr(m1Date.getFullYear(), m1Date.getMonth()); // 지난달

      const m2Date = new Date(currentYear, currentMonth - 2, 1);
      const m2Str = getYearMonthStr(m2Date.getFullYear(), m2Date.getMonth()); // 지지난달

      // 통계 집계를 위한 시작일 계산 (올해 1월 1일과 지지난달 1일 중 더 이른 날짜)
      const yearStart = `${currentYear}-01-01`;
      const m2Start = `${m2Date.getFullYear()}-${String(m2Date.getMonth() + 1).padStart(2, '0')}-01`;
      const startDate = m2Start < yearStart ? m2Start : yearStart;

      // egdesk-helpers 함수들을 사용하여 금융 자료 병렬 조회
      const [cardTxRes, taxInvoiceRes, taxExemptRes, cashReceiptRes] = await Promise.all([
        queryCardTransactions({ startDate, limit: 10000 }).catch(() => ({ transactions: [], total: 0 })),
        queryTaxInvoices({ startDate, limit: 10000 }).catch(() => ({ invoices: [], total: 0 })),
        queryTaxExemptInvoices({ startDate, limit: 10000 }).catch(() => ({ invoices: [], total: 0 })),
        queryCashReceipts({ startDate, limit: 10000 }).catch(() => ({ receipts: [], total: 0 }))
      ]);

      let cardTxList: any[] = [];

      // [로컬 DB 실시간 카드 통계 우선 결합] 로컬 SQLite DB에 카드 거래 내역이 존재하면 원격 데이터 대신 무조건 로컬 실거래 데이터를 기반으로 요약 통계를 집계합니다.
      try {
        const localCardTxsRes = await executeSQL("SELECT * FROM card_transactions");
        const localCardTxs = localCardTxsRes.rows || [];
        
        if (localCardTxs.length > 0) {
          console.log(`[Summary API Fallback] 로컬 DB 카드 거래 ${localCardTxs.length}건을 기반으로 요약 집계를 수행합니다.`);
          cardTxList = localCardTxs.map((tx: any) => ({
            id: String(tx.id || ""),
            cardCompanyName: tx.card_company_id === "shinhan-card" ? "신한카드" :
                             tx.card_company_id === "kb-card" ? "KB국민카드" :
                             tx.card_company_id === "nh-card" ? "NH농협카드" :
                             tx.card_company_id === "bc-card" ? "BC카드" :
                             tx.card_company_id === "hana-card" ? "하나카드" : "기타카드",
            cardNumber: tx.card_number || "",
            amount: Number(tx.amount || 0),
            date: (tx.approval_date || "").replace(/\./g, "-"),
            time: tx.time || "",
            status: tx.is_cancelled ? "취소" : "승인"
          }));
        }
      } catch (dbErr: any) {
        console.warn("⚠️ Local DB summary fallback error:", dbErr.message);
      }

      // 만약 로컬 DB에 카드가 없는 클린 상태인 경우에만 원격 데이터를 백업 폴백으로 사용
      if (cardTxList.length === 0) {
        cardTxList = safeArray<any>(cardTxRes?.transactions || cardTxRes).map(tx => ({
          id: String(tx.id || ""),
          cardCompanyName: tx.cardCompanyName || "기타카드",
          cardNumber: tx.cardNumber || "",
          amount: Number(tx.amount || 0),
          date: tx.date || "",
          time: tx.time || "",
          status: tx.status || "승인"
        }));
      }
      const taxInvoiceListRaw = safeArray<any>(taxInvoiceRes?.invoices || taxInvoiceRes);
      const taxExemptListRaw = safeArray<any>(taxExemptRes?.invoices || taxExemptRes);
      const cashReceiptListRaw = safeArray<any>(cashReceiptRes?.receipts || cashReceiptRes);

      const taxInvoiceList = taxInvoiceListRaw.map(mapTaxInvoiceToFrontend).filter(Boolean);
      const taxExemptList = taxExemptListRaw.map(mapTaxInvoiceToFrontend).filter(Boolean);
      const cashReceiptList = cashReceiptListRaw.map(mapCashReceiptToFrontend).filter(Boolean);

      // (1) 카드사별/월별 집계
      const cardMap: Record<string, { cardCompanyName: string; cardNumber: string; m0: number; m1: number; m2: number; yTotal: number; lastTxDate: string; lastTxTime: string }> = {};

      cardTxList.forEach((tx) => {
        if (tx.status === "취소") return;
        const company = tx.cardCompanyName || "기타카드";
        const num = tx.cardNumber || "0000";
        const key = `${company}_${num}`;

        if (!cardMap[key]) {
          cardMap[key] = {
            cardCompanyName: company,
            cardNumber: num,
            m0: 0,
            m1: 0,
            m2: 0,
            yTotal: 0,
            lastTxDate: "",
            lastTxTime: ""
          };
        }

        const amount = Math.floor(Number(tx.amount) || 0);
        const txDateStr = tx.date || ""; // YYYY-MM-DD
        const txTimeStr = tx.time || ""; // HH:MM:SS
        const txYM = txDateStr.substring(0, 7);

        // 월별 배분
        if (txYM === m0Str) cardMap[key].m0 += amount;
        else if (txYM === m1Str) cardMap[key].m1 += amount;
        else if (txYM === m2Str) cardMap[key].m2 += amount;

        // 금년도 누계 가산 (KST 기준 날짜가 올해에 속할 때)
        if (txDateStr.startsWith(String(currentYear))) {
          cardMap[key].yTotal += amount;
        }

        // 최종 승인 거래일시 판단 갱신
        const currentLastTx = cardMap[key].lastTxDate ? `${cardMap[key].lastTxDate} ${cardMap[key].lastTxTime}` : "";
        const txDateTime = `${txDateStr} ${txTimeStr}`;
        if (!currentLastTx || txDateTime > currentLastTx) {
          cardMap[key].lastTxDate = txDateStr;
          cardMap[key].lastTxTime = txTimeStr;
        }
      });

      // (2) 홈택스 매출액/매입액 집계
      const hometaxSummary = {
        sales: { m0: 0, m1: 0, m2: 0, yTotal: 0 },
        purchase: { m0: 0, m1: 0, m2: 0, yTotal: 0 }
      };

      // 세금계산서 집계
      taxInvoiceList.forEach((inv) => {
        const isSales = inv.invoiceType === "sales" || inv.invoiceType === "매출";
        const target = isSales ? hometaxSummary.sales : hometaxSummary.purchase;
        const amount = Number(inv.supplyAmount) || 0;
        const dateStr = inv.issueDate || "";
        const ym = dateStr.substring(0, 7);

        if (ym === m0Str) target.m0 += amount;
        else if (ym === m1Str) target.m1 += amount;
        else if (ym === m2Str) target.m2 += amount;

        if (dateStr.startsWith(String(currentYear))) {
          target.yTotal += amount;
        }
      });

      // 면세계산서 집계
      taxExemptList.forEach((inv) => {
        const isSales = inv.invoiceType === "sales" || inv.invoiceType === "매출";
        const target = isSales ? hometaxSummary.sales : hometaxSummary.purchase;
        const amount = Number(inv.supplyAmount) || 0;
        const dateStr = inv.issueDate || "";
        const ym = dateStr.substring(0, 7);

        if (ym === m0Str) target.m0 += amount;
        else if (ym === m1Str) target.m1 += amount;
        else if (ym === m2Str) target.m2 += amount;

        if (dateStr.startsWith(String(currentYear))) {
          target.yTotal += amount;
        }
      });

      // 현금영수증 집계 (현금영수증은 전액 발행(매출)로 취급)
      cashReceiptList.forEach((rcpt) => {
        const target = hometaxSummary.sales;
        const amount = Number(rcpt.supplyAmount) || 0;
        const dateStr = rcpt.transactionDate || "";
        const ym = dateStr.substring(0, 7);

        if (ym === m0Str) target.m0 += amount;
        else if (ym === m1Str) target.m1 += amount;
        else if (ym === m2Str) target.m2 += amount;

        if (dateStr.startsWith(String(currentYear))) {
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

    // 9. 이카운트 계산서 ↔ 입출금 DB 수금 대조 조회
    if (tab === "matching") {
      const matchStatus = searchParams.get("status") || "all"; // 'all' | 'matched' | 'unmatched'
      const invoiceType = searchParams.get("invoiceType") || "all"; // 'all' | 'sales' | 'purchase'
      
      let list: any[] = [];
      let total = 0;
      
      try {
        // 기본 매칭 쿼리를 서브쿼리로 정의하고, 외부에서 필터링(WHERE)과 페이징 적용
        let baseQuery = `
          WITH combined_invoices AS (
            SELECT 
              'tax' AS source_table, 
              id, 
              invoice_type, 
              작성일자, 
              공급자사업자등록번호,
              공급자상호, 
              공급받는자사업자등록번호,
              공급받는자상호, 
              합계금액, 
              공급가액, 
              세액, 
              품목명, 
              비고,
              memo
            FROM tax_invoices
            UNION ALL
            SELECT 
              'exempt' AS source_table, 
              id, 
              invoice_type, 
              작성일자, 
              공급자사업자등록번호,
              공급자상호, 
              공급받는자사업자등록번호,
              공급받는자상호, 
              합계금액, 
              공급가액, 
              세액, 
              품목명, 
              비고,
              memo
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
              bt.counterparty_name AS bank_tx_counterparty,
              bt.description AS bank_tx_description,
              ROW_NUMBER() OVER (
                PARTITION BY i.source_table, i.id 
                ORDER BY ABS(julianday(REPLACE(bt.transaction_date, '.', '-')) - julianday(REPLACE(i.작성일자, '.', '-'))) ASC, bt.id ASC
              ) as rn
            FROM combined_invoices i
            LEFT JOIN bank_transactions bt ON (
              -- 금액 조건
              (i.invoice_type = 'sales' AND bt.deposit = i.합계금액) OR
              (i.invoice_type = 'purchase' AND bt.withdrawal = i.합계금액)
            ) AND (
              -- Fuzzy 상호명 조건
              (i.invoice_type = 'sales' AND (
                 bt.counterparty_name LIKE '%' || REPLACE(REPLACE(REPLACE(REPLACE(i.공급받는자상호, '(주)', ''), '주식회사', ''), '(합자)', ''), '(유한)', '') || '%' OR
                 bt.description LIKE '%' || REPLACE(REPLACE(REPLACE(REPLACE(i.공급받는자상호, '(주)', ''), '주식회사', ''), '(합자)', ''), '(유한)', '') || '%'
              )) OR
              (i.invoice_type = 'purchase' AND (
                 bt.counterparty_name LIKE '%' || REPLACE(REPLACE(REPLACE(REPLACE(i.공급자상호, '(주)', ''), '주식회사', ''), '(합자)', ''), '(유한)', '') || '%' OR
                 bt.description LIKE '%' || REPLACE(REPLACE(REPLACE(REPLACE(i.공급자상호, '(주)', ''), '주식회사', ''), '(합자)', ''), '(유한)', '') || '%'
              ))
            )
            -- 작성일자와 거래일자 차이가 90일 이내인 거래만 매칭
            WHERE bt.id IS NULL OR ABS(julianday(REPLACE(bt.transaction_date, '.', '-')) - julianday(REPLACE(i.작성일자, '.', '-'))) <= 90
          )
          SELECT * FROM matched_pairs WHERE rn = 1
        `;
        
        // 동적 WHERE 조건 빌드
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
        
        // 매칭 상태 필터
        if (matchStatus === "matched") {
          whereClauses.push("bank_tx_id IS NOT NULL");
        } else if (matchStatus === "unmatched") {
          whereClauses.push("bank_tx_id IS NULL");
        }
        
        // 검색어 필터
        if (searchText) {
          const cleanText = searchText.replace(/'/g, "''");
          whereClauses.push(`(공급자상호 LIKE '%${cleanText}%' OR 공급받는자상호 LIKE '%${cleanText}%' OR 품목명 LIKE '%${cleanText}%')`);
        }
        
        let filterQuery = `SELECT * FROM (${baseQuery}) AS m`;
        if (whereClauses.length > 0) {
          filterQuery += " WHERE " + whereClauses.join(" AND ");
        }
        
        // 전체 카운트 조회
        const countQuery = `SELECT COUNT(*) as cnt FROM (${filterQuery})`;
        const countRes = await executeSQL(countQuery);
        const totalCount = countRes.rows?.[0]?.cnt || 0;
        total = totalCount;
        
        // 정렬 및 페이징
        filterQuery += ` ORDER BY 작성일자 DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
        
        const dbRowsRes = await executeSQL(filterQuery);
        const dbRows = dbRowsRes.rows || [];
        
        // 가공하여 프론트엔드로 전달
        list = dbRows.map((row: any) => {
          const isSales = row.invoice_type === "sales";
          return {
            id: `${row.source_table}_${row.id}`,
            sourceTable: row.source_table,
            dbId: row.id,
            invoiceType: row.invoice_type,
            issueDate: row.작성일자,
            supplierName: row.공급자상호,
            supplierBusinessNumber: row.공급자사업자등록번호,
            buyerName: row.공급받는자상호,
            buyerBusinessNumber: row.공급받는자사업자등록번호,
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
              counterparty: row.bank_tx_counterparty,
              description: row.bank_tx_description
            } : null
          };
        });
      } catch (dbErr: any) {
        console.error("⚠️ SQLite Matching query failed:", dbErr);
        return NextResponse.json(
          { success: false, error: dbErr.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: {
          list: list,
          total: total
        }
      });
    }

    return NextResponse.json(
      { success: false, error: "알려지지 않은 금융 탭 정보입니다." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Finance API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "금융 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankId, accountNumber, accountName, balance } = body;

    if (!bankId || !accountNumber) {
      return NextResponse.json(
        { success: false, error: "은행 코드와 계좌번호는 필수입니다." },
        { status: 400 }
      );
    }

    const result = await upsertFinanceHubAccount({
      bankId,
      accountNumber,
      accountName: accountName || "수동 등록 계좌",
      balance: Number(balance) || 0
    });

    return NextResponse.json({
      success: true,
      message: "성공적으로 계좌를 등록하였습니다.",
      data: result
    });
  } catch (error: any) {
    console.error("Account Creation Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "계좌 등록 중 시스템 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

