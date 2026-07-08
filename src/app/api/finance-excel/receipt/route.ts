import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows, uploadFile, executeSQL } from "../../../../../egdesk-helpers";

export const dynamic = 'force-dynamic';

const bankNames: Record<string, string> = {
  "shinhan-card": "신한카드",
  "kb-card": "KB국민카드",
  "nh-card": "NH농협카드",
  "bc-card": "BC카드",
  "hana-card": "하나카드",
  "samsung-card": "삼성카드",
  "hyundai-card": "현대카드",
  "lotte-card": "롯데카드"
};

// 🔑 세션 토큰 디코딩 및 격리 컨텍스트 획득 헬퍼
async function verifyUserRole() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    const username = payload.username as string || '';
    const tenantId = payload.tenant_id as string || 'default';
    
    const isAuthorized = role === 'SUPER_ADMIN' || role === 'SUB_OPERATOR' || role === 'PRESIDENT';
    
    return {
      isAuthorized,
      role,
      name,
      username,
      tenantId
    };
  } catch (e) {
    return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    const txId = formData.get("id") as string;

    if (!files || files.length === 0 || !txId) {
      return NextResponse.json(
        { success: false, error: "최소 한 장 이상의 영수증 사진 파일과 거래 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // SQLite 내부 가상 컬럼인 rowid를 포함하여 쿼리
    const checkTxRes = await executeSQL(`
      SELECT rowid, * FROM excel_card_transactions 
      WHERE id = '${txId}' AND tenant_id = '${tenantId}' AND deleted_at IS NULL
    `);
    const tx = checkTxRes.rows?.[0];
    if (!tx) {
      return NextResponse.json(
        { success: false, error: `거래 ID ${txId}에 해당하는 카드 승인 내역을 찾을 수 없거나 테넌트 소유가 아닙니다.` },
        { status: 404 }
      );
    }
    const dbRowId = Number(tx.rowid);

    const savedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.name.split(".").pop() || "jpg";
      const filename = `receipt_${Date.now()}_${txId}_${i}.${fileExtension}`;
      
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Data = buffer.toString("base64");

      // egdesk-helpers.ts 스토리지 API 의무 적용 규칙 준수
      const uploadResult = await uploadFile(
        "excel_card_transactions",
        dbRowId,
        "receipt_url",
        filename,
        base64Data,
        { mimeType: file.type }
      );

      if (uploadResult && (uploadResult.fileId || uploadResult.id)) {
        const fileId = uploadResult.fileId || uploadResult.id;
        // 통합 파일 게이트웨이 활용 규칙 준수
        savedUrls.push(`/api/shared/files?fileId=${fileId}`);
      } else {
        savedUrls.push(`/api/shared/files?tableName=excel_card_transactions&rowId=${dbRowId}&columnName=receipt_url`);
      }
    }

    const receiptUrl = savedUrls.join(",");
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await updateRows("excel_card_transactions", {
      receipt_url: receiptUrl,
      updated_at: nowStr,
      updated_by: username
    }, {
      filters: { id: txId, tenant_id: tenantId }
    });

    // 🚀 [RPA 지능형 파이프라인] 지출관리AI 페이지(crm_expenses 테이블)와 실시간 연동
    const expId = `exp-excel-card-${txId}`;
    const rawDate = tx.approval_date || nowStr;
    const expenseDate = rawDate.slice(0, 10);
    
    const aiAnalysisObj = {
      payee: tx.merchant_name || "",
      approval_number: tx.approval_number || "",
      card_transaction_id: txId
    };
    const aiAnalysisStr = JSON.stringify(aiAnalysisObj);
    
    const expData = {
      id: expId,
      title: tx.merchant_name || "법인카드 거래", 
      category: tx.category || "직원식대", 
      amount: Number(tx.amount || 0), 
      expense_date: expenseDate, 
      payment_method: `법인카드(${bankNames[tx.card_company_id] || '신용카드'})`, 
      attachment_url: receiptUrl, 
      ai_analysis: aiAnalysisStr, 
      memo: tx.memo || "", 
      actual_expense_date: expenseDate, 
      deduction_amount: 0, 
      transfer_fee: 0, 
      approval_status: 'APPROVED',
      tenant_id: tenantId,
      created_at: nowStr,
      updated_at: nowStr
    };

    const checkExpRes = await queryTable("crm_expenses", { filters: { id: expId, tenant_id: tenantId } });
    if (checkExpRes.rows && checkExpRes.rows.length > 0) {
      await updateRows("crm_expenses", expData, { filters: { id: expId, tenant_id: tenantId } });
    } else {
      await insertRows("crm_expenses", [expData]);
    }

    return NextResponse.json({
      success: true,
      data: { receiptUrl }
    });

  } catch (error: any) {
    console.error("Receipt Upload Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "영수증 업로드 중 시스템 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
