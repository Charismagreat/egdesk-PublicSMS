import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { 
  listBusinessIdentitySnapshots, 
  listKnowledgeDocuments, 
  getKnowledgeDocument 
} from '../../../../../egdesk-helpers';

// 15대 기본 자산 종류 정의
const DEFAULT_ASSET_TYPES = [
  { id: "dwg", type_name: "도면" },
  { id: "contract", type_name: "계약서" },
  { id: "proposal", type_name: "품의서" },
  { id: "draft", type_name: "기안서" },
  { id: "enforcement", type_name: "시행문" },
  { id: "report", type_name: "보고서" },
  { id: "official_out", type_name: "대외 발송 공문" },
  { id: "official_in", type_name: "대외 접수 공문" },
  { id: "litigation", type_name: "소송관련" },
  { id: "agreement", type_name: "각서 및 합의서" },
  { id: "mou", type_name: "양해각서" },
  { id: "notarization", type_name: "공증서류" },
  { id: "minutes", type_name: "회의록" },
  { id: "media", type_name: "녹음 및 영상" },
  { id: "etc", type_name: "그외 기타" }
];

// 메모리 상에 저장되는 커스텀 자산 분류 목록
let customAssetTypes: Array<{ id: string; type_name: string; created_at: string; created_by: string }> = [];

/**
 * 지식 문서 본문에서 메타데이터 정보를 추출하는 헬퍼 함수
 */
function parseDocContent(content: string) {
  const result = {
    creator_id: 'sales_staff',
    dept_code: 'SALES',
    security_level: 'C',
    status: 'APPROVED_AUTO',
    autopilot_score: 90.0,
    metadata: {} as Record<string, any>,
    doc_type: 'REPORT'
  };

  if (!content) return result;

  // 메타데이터 영역 파싱
  const creatorMatch = content.match(/\*\s+\*\*작성자\*\*:\s*([^\n]+)/);
  if (creatorMatch) result.creator_id = creatorMatch[1].trim();

  const deptMatch = content.match(/\*\s+\*\*부서\*\*:\s*([^\n]+)/);
  if (deptMatch) result.dept_code = deptMatch[1].trim();

  const securityMatch = content.match(/\*\s+\*\*보안등급\*\*:\s*([^\n]+)/);
  if (securityMatch) result.security_level = securityMatch[1].trim();

  const statusMatch = content.match(/\*\s+\*\*결재상태\*\*:\s*([^\n]+)/);
  if (statusMatch) result.status = statusMatch[1].trim();

  const scoreMatch = content.match(/\*\s+\*\*파서스코어\*\*:\s*([^\n]+)/);
  if (scoreMatch) result.autopilot_score = parseFloat(scoreMatch[1].trim()) || 90.0;

  const metadataMatch = content.match(/\*\s+\*\*메타데이터\*\*:\s*([^\n]+)/);
  if (metadataMatch) {
    try {
      result.metadata = JSON.parse(metadataMatch[1].trim());
      if (result.metadata && result.metadata.doc_type) {
        result.doc_type = result.metadata.doc_type;
      }
    } catch (e) {
      console.warn('Metadata parse error:', e);
    }
  }

  return result;
}

/**
 * GET: 자산 종류 목록 조회
 */
export async function GET() {
  try {
    // 1. 스냅샷 ID 구하기
    let snapshotId = 'default_snapshot';
    try {
      const snapshotListRes = await listBusinessIdentitySnapshots();
      const snapshots = snapshotListRes?.snapshots || snapshotListRes || [];
      if (snapshots && snapshots.length > 0) {
        snapshotId = snapshots[0].id || snapshots[0].uuid || snapshotId;
      }
    } catch (err) {
      console.warn('스냅샷 리스트 획득 실패:', err);
    }

    // 2. MCP에서 문서를 읽어 현재 사용 중인 doc_type 목록을 동적으로 추가 수집
    let activeDocTypes: string[] = [];
    try {
      const docsRes = await listKnowledgeDocuments(snapshotId);
      const rawDocs = docsRes?.documents || docsRes || [];

      // 상세 내용을 가져와 doc_type을 파싱
      const detailDocs = await Promise.all(
        rawDocs.map(async (d: any) => {
          const docId = d.id || d.document_id || d.uuid;
          if (!d.content && docId) {
            try {
              const detail = await getKnowledgeDocument(docId);
              return { ...d, ...detail };
            } catch (err) {
              return d;
            }
          }
          return d;
        })
      );

      activeDocTypes = detailDocs
        .map((doc: any) => {
          const parsed = parseDocContent(doc.content);
          return parsed.doc_type || doc.category;
        })
        .filter(Boolean);
    } catch (err) {
      console.warn('지식 문서 목록 조회 실패:', err);
    }

    // 3. 기본 제공 자산 종류, 메모리상의 커스텀 자산 종류, 현재 문서에서 추출된 자산 종류를 통합
    const allTypesMap = new Map<string, { id: string; type_name: string; created_at?: string; created_by?: string }>();

    // 기본 자산들 추가
    DEFAULT_ASSET_TYPES.forEach(item => {
      allTypesMap.set(item.type_name, item);
    });

    // 메모리 커스텀 추가
    customAssetTypes.forEach(item => {
      allTypesMap.set(item.type_name, item);
    });

    // 실시간 문서에 포함된 자산들도 목록에 반영
    activeDocTypes.forEach(typeName => {
      if (!allTypesMap.has(typeName)) {
        allTypesMap.set(typeName, {
          id: `dynamic-${typeName}`,
          type_name: typeName,
          created_at: new Date().toISOString(),
          created_by: 'SYSTEM_AI'
        });
      }
    });

    const assetTypes = Array.from(allTypesMap.values());
    return NextResponse.json({ success: true, assetTypes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 최고관리자 권한 가드 하에 자산 분류 신설 및 삭제 (사용량 기반 무결성 락)
 */
export async function POST(request: Request) {
  try {
    // 1. 최고관리자 권한 검증
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    let isAuthorized = false;
    let userId = 'SYSTEM_AI';

    if (token) {
      const payload = decodeJwt(token);
      userId = (payload.sub as string) || 'unknown_admin';
      if (payload.role === 'SUPER_ADMIN' || payload.role === 'PRESIDENT') {
        isAuthorized = true;
      }
    } else {
      // 로컬 데모 모드를 배려하여 바디 인자 권한도 예외 허용 지원
      const bodyCheck = await request.clone().json().catch(() => ({}));
      if (bodyCheck.user_role === 'SUPER_ADMIN' || bodyCheck.user_role === 'PRESIDENT') {
        isAuthorized = true;
        userId = bodyCheck.user_id || 'admin_demo';
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ 
        success: false, 
        error: '권한 부족: 자산 분류 설정은 최고관리자 및 대표자 계정만 변경할 수 있습니다.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // 스냅샷 ID 획득
    let snapshotId = 'default_snapshot';
    try {
      const snapshotListRes = await listBusinessIdentitySnapshots();
      const snapshots = snapshotListRes?.snapshots || snapshotListRes || [];
      if (snapshots && snapshots.length > 0) {
        snapshotId = snapshots[0].id || snapshots[0].uuid || snapshotId;
      }
    } catch (err) {
      console.warn('스냅샷 리스트 획득 실패:', err);
    }

    // 액션 A: 자산 종류 신규 추가 (CREATE)
    if (action === 'CREATE') {
      const { type_name } = body;
      if (!type_name || !type_name.trim()) {
        return NextResponse.json({ success: false, error: '자산 종류명을 정확히 입력해 주십시오.' }, { status: 400 });
      }

      const trimmedName = type_name.trim();

      // 중복 검사
      const isDefaultDuplicate = DEFAULT_ASSET_TYPES.some(t => t.type_name === trimmedName);
      const isCustomDuplicate = customAssetTypes.some(t => t.type_name === trimmedName);

      if (isDefaultDuplicate || isCustomDuplicate) {
        return NextResponse.json({ success: false, error: '이미 등록된 자산 분류입니다.' }, { status: 400 });
      }

      const id = `type-${Date.now()}`;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const newType = {
        id,
        type_name: trimmedName,
        created_at: now,
        created_by: userId
      };

      customAssetTypes.push(newType);

      // 최신화 목록 반환을 위한 GET의 비즈니스 로직 호출
      return NextResponse.json({ 
        success: true, 
        message: `신규 자산 분류 [${trimmedName}]가 성공적으로 등록되었습니다.`,
        assetTypes: [
          ...DEFAULT_ASSET_TYPES,
          ...customAssetTypes
        ]
      });
    }

    // 액션 B: 자산 종류 삭제 (DELETE - 사용량 무결성 감사 락)
    if (action === 'DELETE') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: '삭제할 자산 ID가 지정되지 않았습니다.' }, { status: 400 });
      }

      // 대상 자산 종류명 조회
      const target = customAssetTypes.find(t => t.id === id) || DEFAULT_ASSET_TYPES.find(t => t.id === id);
      if (!target) {
        return NextResponse.json({ success: false, error: '삭제할 대상 자산 종류를 찾지 못했습니다.' }, { status: 404 });
      }

      const typeName = target.type_name;

      // [무결성 감사 락 🔒] 해당 자산을 현재 사용 중인 문서가 지식 문서 대장에 있는지 진단
      let usedCount = 0;
      try {
        const docsRes = await listKnowledgeDocuments(snapshotId);
        const rawDocs = docsRes?.documents || docsRes || [];

        const detailDocs = await Promise.all(
          rawDocs.map(async (d: any) => {
            const docId = d.id || d.document_id || d.uuid;
            if (!d.content && docId) {
              try {
                const detail = await getKnowledgeDocument(docId);
                return { ...d, ...detail };
              } catch (err) {
                return d;
              }
            }
            return d;
          })
        );

        usedCount = detailDocs.filter((doc: any) => {
          const parsed = parseDocContent(doc.content);
          return parsed.doc_type === typeName || doc.category === typeName;
        }).length;
      } catch (err) {
        console.warn('지식 문서 사용량 감사 실패:', err);
      }

      if (usedCount > 0) {
        return NextResponse.json({ 
          success: false, 
          error: `무결성 제약 오류: 현재 사내 지식 대장에 [${typeName}] 자산 종류로 등록된 문서가 ${usedCount}건 존재합니다. 해당 문서들의 자산 분류를 먼저 변경하거나 삭제한 뒤 시도해 주십시오.` 
        }, { status: 400 });
      }

      // 안전 삭제 진행
      customAssetTypes = customAssetTypes.filter(t => t.id !== id);

      return NextResponse.json({ 
        success: true, 
        message: `자산 분류 [${typeName}]가 성공적으로 삭제되었습니다.`,
        assetTypes: [
          ...DEFAULT_ASSET_TYPES,
          ...customAssetTypes
        ]
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
