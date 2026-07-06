import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { updateRows } from '../../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

/**
 * PUT: 최고 관리자가 은행 거래 내역(계정과목 및 태그)을 직접 수정합니다.
 * 동시에 지출 대장(crm_expenses)의 연동된 정보도 실시간 동기화 업데이트를 시도합니다.
 */
export async function PUT(request: NextRequest) {
  try {
    // 🔑 1. 최고 관리자(SUPER_ADMIN 또는 PRESIDENT) 권한 검증
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: "인증 토큰이 없습니다. 로그인 후 사용해 주세요." },
        { status: 401 }
      );
    }

    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    
    if (role !== 'SUPER_ADMIN' && role !== 'PRESIDENT') {
      return NextResponse.json(
        { success: false, error: "최고 관리자(SUPER_ADMIN / PRESIDENT)만 수정할 권한이 있습니다." },
        { status: 403 }
      );
    }

    // 🔑 2. 파라미터 추출 및 유효성 검사
    const body = await request.json();
    const { id, category, memo } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "수정 대상 은행 거래 내역 ID(id)는 필수 값입니다." },
        { status: 400 }
      );
    }

    // 🔑 3. 로컬 SQLite DB에서 은행 거래 내역 업데이트 (updateRows 사용)
    const updateRes = await updateRows('bank_transactions', {
      category: category || "",
      memo: memo || ""
    }, {
      filters: { id: String(id) }
    }).catch((err) => {
      console.error("bank_transactions updateRows failed:", err);
      return null;
    });

    if (!updateRes) {
      return NextResponse.json(
        { success: false, error: "지정된 ID의 은행 거래 내역이 존재하지 않거나 업데이트에 실패했습니다." },
        { status: 404 }
      );
    }

    console.log(`[Bank Update API] bank_transactions 업데이트 성공. ID: ${id}`);

    // 🔑 4. 지출 대장 (crm_expenses) 테이블 실시간 양방향 동기화
    // 은행 거래 출금 건에 연동된 crm_expenses 내역이 있을 시 이를 실시간으로 반영합니다.
    try {
      await updateRows('crm_expenses', {
        category: category || "",
        memo: memo || ""
      }, {
        filters: { id: `exp-bank-${id}` }
      });
      console.log(`[RPA Auto-Sync] 지출 대장(crm_expenses) 동기화 업데이트 완료! ID: exp-bank-${id}`);
    } catch (syncErr: any) {
      console.warn(`[RPA Auto-Sync Warning] 지출 대장 동기화 중 경고 발생:`, syncErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "은행 거래 내역 및 지출 대장 동기화 수정이 성공적으로 완료되었습니다."
    });

  } catch (error: any) {
    console.error("Bank transaction PUT error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "은행 거래 내역 수정 중 예외가 발생했습니다." },
      { status: 500 }
    );
  }
}
