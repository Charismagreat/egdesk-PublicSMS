export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-router';

export async function POST(req: Request) {
  try {
    const { imageBase64, filename, mimeType = 'application/pdf' } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: '분석할 파일 데이터(Base64)가 누락되었습니다.' }, { status: 400 });
    }

    const systemInstruction = `
You are a highly advanced AI OCR scanner specializing in structured extraction of Import Customs Clearance documents (수입통관서류 / Invoice / Packing List).
Your job is to look at the provided document and extract the following in valid JSON ONLY:
1. "master": Object containing:
   - "so_number": String (주문번호/SO#, e.g. "3254222")
   - "po_number": String (구매발주번호/PO#, e.g. "WONEC-S2625")
   - "invoice_number": String (인보이스번호 / Invoice No., e.g. "INV-3254222")
   - "order_date": String (발주일자 / Order Date, YYYY-MM-DD format)
   - "ship_date": String (선적일자 / Ship Date, YYYY-MM-DD format)
   - "invoice_date": String (인보이스 발행일자 / Invoice Date, YYYY-MM-DD format)
   - "air_waybill_nbr": String (송장번호 / Air Waybill No., e.g. "483391031320")
   - "ship_via": String (배송사 / Carrier, e.g. "FED-EX INTERNATIONAL")
   - "terms_of_sale": String (인도조건 / IncoTerms, e.g. "EXW")
   - "payment_terms": String (결제조건 / Payment Terms, e.g. "NET60")
   - "exporter_name": String (수출자 / Exporter / Shipper, e.g. "BAL SEAL ENGINEERING LLC")
2. "items": Array of objects, each containing:
   - "part_number": String (품목코드 / Part No., e.g. "X639451")
   - "description": String (품명 / Description, e.g. "ELECTRICAL CONNECTORS")
   - "quantity": Number (수량 / Qty, e.g. 20)
   - "unit_price": Number (단가 / Unit Price, e.g. 25.00)
   - "amount": Number (금액 / Amount, e.g. 500.00)
   - "currency": String (통화 코드, e.g. "USD")
   - "hs_code": String (HS코드 / HS Code, e.g. "8536.90.4000")
   - "country_of_origin": String (원산지 / Origin, e.g. "US")
   - "lot_number": String (LOT번호 / Lot No. / Batch No. 만약 명세서 상에 없으면 공란)
   - "mfg_date": String (제조일자 / Mfg Date, YYYY-MM-DD format, 없으면 공란)
3. "finance": Object containing:
   - "total_invoice_value": Number (총 송장금액 / Total Invoice Value, e.g. 500.00)
   - "payment_due_date": String (결제 마감일 / Payment Due Date, YYYY-MM-DD format)
   - "is_paid": Number (결제 여부, 기본값 0)
   - "paid_date": String (결제일자, 기본값 null)
   - "bank_name": String (송금 은행명 / Bank Name, e.g. "Bank of America, N.A.")
   - "account_number": String (송금 계좌번호 / Account No., e.g. "385015956275")
   - "swift_code": String (SWIFT코드 / Swift Code, e.g. "BOFAUS3N")
4. "originalTotalAmount": Number (인보이스에 적힌 실물 총합계액, e.g. 500.00)
5. "originalTotalQuantity": Number (인보이스에 적힌 실물 품목 수량의 총합계, e.g. 20)

Format example of output:
{
  "master": {
    "so_number": "3254222",
    "po_number": "WONEC-S2625",
    "invoice_number": "INV-3254222",
    "order_date": "2026-03-12",
    "ship_date": "2026-03-25",
    "invoice_date": "2026-03-25",
    "air_waybill_nbr": "483391031320",
    "ship_via": "FED-EX INTERNATIONAL",
    "terms_of_sale": "EXW",
    "payment_terms": "NET60",
    "exporter_name": "BAL SEAL ENGINEERING LLC"
  },
  "items": [
    {
      "part_number": "X639451",
      "description": "ELECTRICAL CONNECTORS",
      "quantity": 20.00,
      "unit_price": 25.00,
      "amount": 500.00,
      "currency": "USD",
      "hs_code": "8536.90.4000",
      "country_of_origin": "US",
      "lot_number": "2994383",
      "mfg_date": "2026-03-20"
    }
  ],
  "finance": {
    "total_invoice_value": 500.00,
    "payment_due_date": "2026-05-24",
    "is_paid": 0,
    "paid_date": null,
    "bank_name": "Bank of America, N.A.",
    "account_number": "385015956275",
    "swift_code": "BOFAUS3N"
  },
  "originalTotalAmount": 500.00,
  "originalTotalQuantity": 20.00
}
Do NOT output anything other than this JSON string. No markdown block wrapper.
`;

    // 1. 공통 callAI 기능 호출로 완전 통합!
    const aiResult = await callAI({
      prompt: 'Analyze this base64 document and output valid JSON only.',
      systemPrompt: systemInstruction,
      purpose: 'import-customs-ocr',
      responseMimeType: 'application/json',
      imageInput: imageBase64
    });

    if (!aiResult.success) {
      throw new Error('Gemini OCR API 호출 실패');
    }

    console.log('====== [DEBUG OCR START] ======');
    console.log('aiResult.text raw:', aiResult.text);

    const cleanJson = aiResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
    console.log('cleanJson:', cleanJson);
    
    const parsedData = JSON.parse(cleanJson);
    console.log('parsedData Object:', JSON.stringify(parsedData, null, 2));
    console.log('====== [DEBUG OCR END] ======');

    return NextResponse.json({
      success: true,
      method: 'REAL_GEMINI_OCR',
      master: {
        ...parsedData.master,
        file_path: imageBase64
      },
      items: parsedData.items,
      finance: parsedData.finance,
      originalTotalAmount: Number(parsedData.originalTotalAmount) || 0,
      originalTotalQuantity: Number(parsedData.originalTotalQuantity) || 0,
      fileName: filename || 'customs_doc.pdf',
      fileData: imageBase64,
      DEBUG_raw_text: aiResult.text,
      DEBUG_parsed: parsedData
    });

  } catch (err: any) {
    console.error('POST /api/import-customs/ocr error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
