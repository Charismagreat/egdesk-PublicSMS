import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { queryTable, insertRows, updateRows } from "../../../../../egdesk-helpers";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    const txId = formData.get("id") as string;

    if (!files || files.length === 0 || !txId) {
      return NextResponse.json(
        { success: false, error: "최소 한 장 이상의 영수증 사진 파일과 거래 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // public/uploads/receipts 폴더가 없으면 자동 생성
    const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const savedUrls: string[] = [];

    // 복수 파일 순차 저장 처리
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.name.split(".").pop() || "jpg";
      const filename = `receipt_${Date.now()}_${txId}_${i}.${fileExtension}`;
      const filePath = path.join(uploadDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      savedUrls.push(`/uploads/receipts/${filename}`);
    }

    const receiptUrl = savedUrls.join(",");

    // 로컬 SQLite DB 업데이트
    await updateRows("card_transactions", {
      receipt_url: receiptUrl,
      updated_at: new Date().toISOString()
    }, {
      filters: { id: txId }
    });

    // 🚀 [RPA 지능형 파이프라인] 지출관리AI 페이지(crm_expenses 테이블)와 실시간 연동
    const checkTxRes = await queryTable("card_transactions", { filters: { id: txId } });
    const tx = checkTxRes.rows?.[0];
    if (tx) {
      const expId = `exp-card-${txId}`;
      const rawDate = tx.approved_date || tx.created_at || new Date().toISOString();
      const expenseDate = rawDate.slice(0, 10);
      
      const aiAnalysisObj = {
        payee: tx.merchant_name || "",
        approval_number: tx.approval_number || "",
        card_transaction_id: txId
      };
      const aiAnalysisStr = JSON.stringify(aiAnalysisObj);
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      
      const expData = {
        id: expId,
        title: tx.merchant_name || "법인카드 거래", 
        category: tx.category || "직원식대", 
        amount: Number(tx.amount || 0), 
        expense_date: expenseDate, 
        payment_method: `법인카드(${tx.card_company_name || '신용카드'})`, 
        attachment_url: receiptUrl, 
        ai_analysis: aiAnalysisStr, 
        memo: tx.memo || "", 
        actual_expense_date: expenseDate, 
        deduction_amount: 0, 
        transfer_fee: 0, 
        approval_status: 'APPROVED',
        created_at: nowStr,
        updated_at: nowStr
      };

      const checkExpRes = await queryTable("crm_expenses", { filters: { id: expId } });
      if (checkExpRes.rows && checkExpRes.rows.length > 0) {
        await updateRows("crm_expenses", expData, { filters: { id: expId } });
      } else {
        await insertRows("crm_expenses", [expData]);
      }
      
      console.log(`[RPA Sync] 지출관리AI 장부(crm_expenses)에 거래 ${expId} 자동 인서트/갱신 완료!`);
      console.log(`[Receipt Upload] 거래 ${txId}에 영수증 등록 완료: ${receiptUrl}`);
    } else {
      throw new Error(`거래 ID ${txId}에 해당하는 카드 승인 내역을 찾을 수 없습니다.`);
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
