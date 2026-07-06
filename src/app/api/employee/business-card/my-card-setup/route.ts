export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { updateRows, uploadFile } from '@/../egdesk-helpers';

export async function POST(req: Request) {
  try {
    const { operatorId, image } = await req.json();

    if (!operatorId) {
      return NextResponse.json({ success: false, error: '직원 ID(operatorId)가 입력되지 않았습니다.' }, { status: 400 });
    }

    if (!image) {
      return NextResponse.json({ success: false, error: '업로드할 본인 명함 이미지(Base64)가 누락되었습니다.' }, { status: 400 });
    }

    // 1. uploadFile로 격리 스토리지 보관 및 게이트웨이 웹주소 맵핑
    let myCardImageUrl = image;
    const uploadRes = await uploadFile('crm_operators', operatorId, 'my_card_image_url', `operator_card_${operatorId}.png`, image);
    if (uploadRes && uploadRes.success) {
      myCardImageUrl = `/api/shared/files?tableName=crm_operators&rowId=${operatorId}&columnName=my_card_image_url`;
    }

    // 2. DB 업데이트
    await updateRows('crm_operators', 
      { my_card_image_url: myCardImageUrl },
      { filters: { id: operatorId.toString() } }
    );

    return NextResponse.json({
      success: true,
      myCardImageUrl
    });

  } catch (err: any) {
    console.error('본인 명함 이미지 등록 API 에러:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
