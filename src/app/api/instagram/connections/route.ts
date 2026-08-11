export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { 
  listInstagramConnections, 
  saveInstagramConnection, 
  deleteInstagramConnection 
} from '../../../../../egdesk-helpers';

// 1. 이지데스크 MCP 인스타그램 연동 계정 목록 조회
export async function GET() {
  try {
    const connRes = await listInstagramConnections();
    if (connRes && connRes.success) {
      return NextResponse.json({ 
        success: true, 
        connections: connRes.connections || [] 
      });
    }
    return NextResponse.json({ success: true, connections: [] });
  } catch (error: any) {
    console.error('EGDesk MCP 계정 목록 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 이지데스크 MCP 인스타그램 계정 신규 등록 / 저장
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, username, password, handle, id } = body;

    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        error: '사용자명(Username)과 비밀번호(Password)는 필수입니다.' 
      }, { status: 400 });
    }

    const result = await saveInstagramConnection({
      name: name || username,
      username,
      password,
      handle: handle ? (handle.startsWith('@') ? handle.substring(1) : handle) : undefined,
      id: id || undefined,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('EGDesk MCP 계정 등록 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. 이지데스크 MCP 인스타그램 연동 계정 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('id');

    if (!connectionId) {
      return NextResponse.json({ 
        success: false, 
        error: '삭제할 계정 connectionId가 필요합니다.' 
      }, { status: 400 });
    }

    const result = await deleteInstagramConnection(connectionId);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('EGDesk MCP 계정 삭제 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
