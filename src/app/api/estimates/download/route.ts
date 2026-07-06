import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { queryTable, uploadFile, downloadFile } from "@/../egdesk-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estimateId = searchParams.get("id");

    if (!estimateId) {
      return NextResponse.json({ success: false, error: "id가 누락되었습니다." }, { status: 400 });
    }

    // 0. 실제 데이터베이스에 존재하는 견적서인지 선제 검증
    const checkRes = await queryTable("crm_estimates", { filters: { id: estimateId }, limit: 1 });
    let activeEst = checkRes.rows?.[0];
    if (!activeEst) {
      const fallbackCheck = await queryTable("crm_estimates", { filters: { uuid: estimateId }, limit: 1 });
      activeEst = fallbackCheck.rows?.[0];
      if (!activeEst) {
        return NextResponse.json({ success: false, error: "존재하지 않는 견적서 데이터입니다." }, { status: 404 });
      }
    }

    const realId = String(activeEst.id);
    const rowId = parseInt(realId, 10);

    // 1. 격리 캐시 스토리지에서 기존 PDF가 캐싱되어 있는지 조회
    let fileBuffer: Buffer | null = null;
    try {
      const downloadRes = await downloadFile({
        tableName: 'crm_estimates',
        rowId: rowId,
        columnName: 'pdf_cache'
      });
      if (downloadRes && downloadRes.success && downloadRes.data) {
        let base64Data = downloadRes.data;
        if (base64Data.includes(';base64,')) {
          base64Data = base64Data.split(';base64,').pop() || '';
        }
        fileBuffer = Buffer.from(base64Data, 'base64');
      }
    } catch (err) {
      console.log('[PDF Cache Miss] Cache not found or failed to read');
    }

    // 2. 캐시가 없거나 로드에 실패한 경우 Playwright로 실시간 인쇄 빌드
    if (!fileBuffer) {
      console.log(`[PDF Generator] Generating PDF cache for Estimate ID: ${realId}`);
      let browser = null;
      try {
        browser = await chromium.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // 개발용 서버 포트 4000 기준 연동
        const targetUrl = `http://localhost:4000/estimates/print-pdf?id=${realId}`;
        await page.goto(targetUrl, { waitUntil: "networkidle" });
        
        // 버퍼로 직접 출력 (디스크 쓰기 옵션 제거)
        fileBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" }
        });

        // uploadFile로 격리 스토리지에 캐시 업로드 저장
        await uploadFile(
          'crm_estimates',
          rowId,
          'pdf_cache',
          `Estimate_${realId}.pdf`,
          fileBuffer.toString('base64')
        ).catch((e) => console.error('[PDF Cache Save Error]', e.message));

        console.log(`[PDF Generator] PDF successfully cached on storage for ID: ${realId}`);
      } catch (err: any) {
        console.error("[PDF Generator] Playwright PDF 렌더링 실패:", err);
        return NextResponse.json({ 
          success: false, 
          error: `PDF 생성 중 서버 에러가 발생했습니다: ${err.message}` 
        }, { status: 500 });
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    }

    // 3. 파일 바이너리 스트림 다운로드 전송
    const response = new NextResponse(new Uint8Array(fileBuffer));
    
    response.headers.set("Content-Type", "application/pdf");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="Estimate_${realId}.pdf"`
    );

    return response;
  } catch (error: any) {
    console.error("PDF 다운로드 라우트 에러:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
