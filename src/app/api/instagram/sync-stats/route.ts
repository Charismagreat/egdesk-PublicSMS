export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { 
  listInstagramConnections, 
  syncInstagramPostStats, 
  listInstagramHistory 
} from '../../../../../egdesk-helpers';

export async function POST(req: Request) {
  try {
    const { connectionId } = await req.json().catch(() => ({}));

    let targetConnId = connectionId;

    // connectionId가 넘어오지 않은 경우 기본 계정 조회
    if (!targetConnId) {
      const connRes = await listInstagramConnections();
      if (connRes && connRes.success && connRes.connections.length > 0) {
        targetConnId = connRes.connections[0].id;
      }
    }

    let syncResult = null;
    if (targetConnId) {
      try {
        // 인스타그램 좋아요/댓글 반응 지표 동기화 스크래핑 시도
        syncResult = await syncInstagramPostStats({ connectionId: targetConnId, limit: 12 });
      } catch (syncErr: any) {
        console.warn('EGDesk syncInstagramPostStats warning:', syncErr.message);
      }
    }

    // 최신 발행 이력 조회
    let history: any[] = [];
    try {
      const historyRes = await listInstagramHistory({ limit: 50 });
      if (historyRes && historyRes.success) {
        history = historyRes.history || [];
      }
    } catch (historyErr: any) {
      console.warn('EGDesk listInstagramHistory warning:', historyErr.message);
    }

    return NextResponse.json({
      success: true,
      syncResult,
      history,
      connectionId: targetConnId || null,
    });
  } catch (error: any) {
    console.error('인스타그램 성과 지표 동기화 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
