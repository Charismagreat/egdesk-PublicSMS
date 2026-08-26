import { NextResponse } from 'next/server';
import { 
  listBusinessIdentitySnapshots, 
  listKnowledgeDocuments, 
  getKnowledgeDocument, 
  createKnowledgeDocument, 
  updateKnowledgeDocument, 
  deleteKnowledgeDocument,
  callInternalKnowledgeTool
} from '../../../../egdesk-helpers';

/**
 * 지식 문서 본문에서 메타데이터 정보를 추출하는 헬퍼 함수
 */
function parseDocContent(content: string, defaultTitle: string = '') {
  const result = {
    creator_id: 'sales_staff',
    dept_code: 'SALES',
    security_level: 'C',
    status: 'APPROVED_AUTO',
    autopilot_score: 90.0,
    metadata: {} as Record<string, any>,
    parsedBody: content || '',
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

  // 본문 내용만 추출 (메타데이터 구분선 전까지)
  const dividerIndex = content.lastIndexOf('\n\n--- \n*   **작성자**:');
  if (dividerIndex !== -1) {
    result.parsedBody = content.substring(0, dividerIndex).trim();
  }

  return result;
}

/**
 * GET 핸들러: 보안 및 소속 권한을 결합한 지식 문서 리스트 조회 (Zero-Trust Row-Level Security)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'sales_staff';
    const userRole = searchParams.get('role') || 'SUB_OPERATOR'; // SUPER_ADMIN, PRESIDENT, SUB_OPERATOR
    const userDept = searchParams.get('dept') || 'SALES';

    // 1. 대표 스냅샷 ID 획득
    let snapshotId = 'default_snapshot';
    try {
      const snapshotListRes = await listBusinessIdentitySnapshots();
      const snapshots = snapshotListRes?.snapshots || snapshotListRes || [];
      if (snapshots && snapshots.length > 0) {
        snapshotId = snapshots[0].id || snapshots[0].uuid || snapshotId;
      } else {
        // 스냅샷 리스트가 비어있을 경우 기본 비즈니스 식별 정보 스냅샷 자동 생성
        console.log('스냅샷 리스트가 비어 있어 기본 스냅샷을 자동 생성합니다...');
        const newSnapshot = await callInternalKnowledgeTool('businessidentity_create_snapshot', {
          brandKey: 'default_brand',
          identityJson: JSON.stringify({
            company_name: '기본 브랜드',
            description: '자동 생성된 기본 비즈니스 식별 정보 스냅샷'
          })
        });
        const createdSnapshot = newSnapshot?.snapshot || newSnapshot;
        if (createdSnapshot && (createdSnapshot.id || createdSnapshot.uuid)) {
          snapshotId = createdSnapshot.id || createdSnapshot.uuid;
          console.log(`기본 스냅샷이 자동 생성되었습니다. ID: ${snapshotId}`);
        }
      }
    } catch (err) {
      console.warn('스냅샷 리스트 획득 또는 자동 생성 실패:', err);
    }

    // 2. 해당 스냅샷의 지식 문서 목록 조회 (MCP 툴 사용!)
    let docs: any[] = [];
    try {
      const docsRes = await listKnowledgeDocuments(snapshotId);
      const rawDocs = docsRes?.documents || docsRes || [];
      
      // 각 문서 상세(본문 포함)를 병렬 로드
      docs = await Promise.all(
        rawDocs.map(async (d: any) => {
          const docId = d.id || d.document_id || d.uuid;
          if (!d.content && docId) {
            try {
              const detail = await getKnowledgeDocument(docId);
              return { ...d, ...detail };
            } catch (err) {
              console.warn(`문서 ${docId} 상세 로드 실패:`, err);
              return d;
            }
          }
          return d;
        })
      );
    } catch (err) {
      console.warn('지식 문서 목록 조회 실패:', err);
    }

    // 3. 사용자 등록 문서만 순수 반환 (샘플 자동 시딩 제거됨)

    // 4. Zero-Trust 보안 및 소속 부서 필터링 규칙 (SQLite RLS 시뮬레이션 그대로 유지)
    const processedDocs = docs.map((doc: any) => {
      const parsed = parseDocContent(doc.content, doc.title);
      return {
        ...doc,
        ...parsed
      };
    });

    const filteredDocs = processedDocs.filter((doc: any) => {
      const creator_id = doc.creator_id;
      const dept_code = doc.dept_code;
      const security_level = doc.security_level;

      if (userRole === 'SUPER_ADMIN' || userRole === 'PRESIDENT') {
        return true;
      }
      if (security_level === 'C') {
        return true;
      }
      if (security_level === 'B') {
        return dept_code === userDept;
      }
      if (security_level === 'A') {
        return creator_id === userId;
      }
      return false;
    });

    // 결재 정보 및 메타데이터 포맷팅
    const docsWithApprovals = filteredDocs.map((doc: any) => {
      const status = doc.status || 'APPROVED_AUTO';
      const autopilot_score = doc.autopilot_score || 90.0;
      
      const approvals = [
        {
          document_id: doc.id || doc.document_id,
          approver_id: status === 'APPROVED_AUTO' ? 'SYSTEM_AI' : `${(doc.dept_code || 'SALES').toLowerCase()}_director`,
          step_number: 1,
          step_type: status === 'APPROVED_AUTO' ? 'AUTOPILOT' : 'APPROVER',
          status: status === 'APPROVED_AUTO' ? 'APPROVED' : 'WAITING',
          comments: status === 'APPROVED_AUTO' ? 'AI 파일럿 자동 전결 완료' : '수동 결재선 결의 대기',
          processed_at: doc.created_at || new Date().toISOString()
        }
      ];

      return {
        document_id: doc.id || doc.document_id,
        title: doc.title,
        doc_type: doc.doc_type,
        file_path: doc.metadata?.file_name ? `/files/${doc.category}/${doc.metadata.file_name}` : null,
        thumbnail_path: doc.metadata?.file_name && doc.metadata.file_name.endsWith('.jpg')
          ? 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=500'
          : 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500',
        creator_id: doc.creator_id,
        dept_code: doc.dept_code,
        security_level: doc.security_level,
        content: doc.parsedBody,
        status,
        autopilot_score,
        created_at: doc.created_at || new Date().toISOString(),
        updated_at: doc.updated_at || new Date().toISOString(),
        approvals,
        metadata: doc.metadata
      };
    });

    return NextResponse.json({ success: true, documents: docsWithApprovals });
  } catch (error: any) {
    console.error('GET /api/knowledge-ai error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST 핸들러: 신규 문서 업로드 & Autopilot 채점 & 최고관리자 보안 등급 하향 심사
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 대표 스냅샷 ID 획득
    let snapshotId = 'default_snapshot';
    try {
      const snapshotListRes = await listBusinessIdentitySnapshots();
      const snapshots = snapshotListRes?.snapshots || snapshotListRes || [];
      if (snapshots && snapshots.length > 0) {
        snapshotId = snapshots[0].id || snapshots[0].uuid || snapshotId;
      } else {
        // 스냅샷 리스트가 비어있을 경우 기본 비즈니스 식별 정보 스냅샷 자동 생성
        console.log('스냅샷 리스트가 비어 있어 기본 스냅샷을 자동 생성합니다...');
        const newSnapshot = await callInternalKnowledgeTool('businessidentity_create_snapshot', {
          brandKey: 'default_brand',
          identityJson: JSON.stringify({
            company_name: '기본 브랜드',
            description: '자동 생성된 기본 비즈니스 식별 정보 스냅샷'
          })
        });
        const createdSnapshot = newSnapshot?.snapshot || newSnapshot;
        if (createdSnapshot && (createdSnapshot.id || createdSnapshot.uuid)) {
          snapshotId = createdSnapshot.id || createdSnapshot.uuid;
          console.log(`기본 스냅샷이 자동 생성되었습니다. ID: ${snapshotId}`);
        }
      }
    } catch (err) {
      console.warn('스냅샷 리스트 획득 또는 자동 생성 실패:', err);
    }

    if (action === 'UPLOAD') {
      const { title, doc_type, creator_id, dept_code, file_name, file_size, direct_content } = body;

      if (!title || !doc_type || !creator_id || !dept_code) {
        return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
      }

      // 1. 비정형 유형별 파싱 시뮬레이터 구동
      let parsedContent = '';
      let metadata: Record<string, any> = {};
      let thumbnailPath = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500';
      let autoScore = 0.0;
      let status = 'PENDING';

      if (direct_content) {
        parsedContent = direct_content;
        metadata = {
          file_name: file_name || 'direct_entry.md',
          file_size: file_size || `${Buffer.byteLength(direct_content, 'utf8')} bytes`,
          keywords: ['직접입력', '마크다운', '지식등록'],
          doc_type: 'MANUAL'
        };
        thumbnailPath = 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=500';
        autoScore = 96.5;
      } else if (doc_type === 'CAD_BLUEPRINT') {
        parsedContent = `### AI 해독 CAD 설계 도면: ${file_name}\n\n*   **도면 유형**: CAD 2D/3D 벡터 설계도\n*   **스캔 결과**: 실물 타이틀 블록 감지 완료. 차세대 소형 모빌리티 본체 프레임 구조 설계 장묘 수록.\n*   **BOM 파싱**: 탄소섬유 지지대 x2, 강화 볼트 v3 x16, 고장력 서스펜션 브래킷 x4 감지. 특이 형상 비정상 굴곡 부위 없음.`;
        metadata = {
          file_name,
          file_size,
          engineer: '기안연구원',
          bom_list: [
            { item: '탄소섬유 지지대 C-Frame', qty: 2 },
            { item: '강화 체결 볼트 V3', qty: 16 },
            { item: '고장력 서스펜션 브래킷', qty: 4 }
          ],
          keywords: ['CAD도면', '모빌리티', 'BOM파싱', '신형도면', '설계자산']
        };
        thumbnailPath = 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500';
        autoScore = 86.4;
      } 
      else if (doc_type === 'B_CARD') {
        parsedContent = `### AI 명함 OCR 추출 리포트: ${file_name}\n\n*   **상호**: (주)미래이노베이션 (Mirae Innovation)\n*   **이름/직급**: 박태준 본부장 (Tae-Jun Park, Head of Business)\n*   **전화번호**: 010-9876-5432\n*   **이메일**: tjpark@mirae-inno.co.kr\n*   **주소**: 서울시 마포구 독막로 320, 8층`;
        metadata = {
          company: '미래이노베이션',
          name: '박태준',
          position: '본부장',
          phone: '010-9876-5432',
          email: 'tjpark@mirae-inno.co.kr',
          keywords: ['명함OCR', '신규연락처', '미래이노베이션', '본부장', 'B2B파트너']
        };
        thumbnailPath = 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=500';
        autoScore = 98.7;
      } 
      else if (doc_type === 'AUDIO_RECORDING') {
        parsedContent = `### AI 회의 음성 녹취 STT 해독 리포트: ${file_name}\n\n*   **대화 해독 요약**: B2B 부품 단가 조정 협상 내용 수록. 주요 고객사인 한울테크 상무와의 3차 화상 통화 오디오 기록.\n*   **주요 의사결정**: 물량 20% 확대 조건으로 개당 시급/단가 3.2% 인하 제안 수락 동의.`;
        metadata = {
          file_name,
          duration: '00:08:45',
          action_items: [
            { owner: '영업본부장', task: '한울테크 단가 인하 3.2% 반영된 정식 견적서 갱신 발송', deadline: '2026-06-10' }
          ],
          keywords: ['회의녹취', '단가협상', '오디오해독', '한울테크', '액션아이템']
        };
        thumbnailPath = 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500';
        autoScore = 82.1;
      } 
      else {
        parsedContent = `### 전사 일반 품의서 문서 파싱 본문: ${title}\n\n*   **청구 목적**: 부서 내 전산 비품 및 소모품 노후 교체 청구 건.\n*   **품의 금액**: 45,000원 (키보드, 마우스 세트 구매)`;
        metadata = {
          amount: 45000,
          reason: '노후 소모품 교체',
          keywords: ['일반품의', '소모품교체', '사무용품', '소액청구']
        };
        autoScore = 96.5;
      }

      const isAutopilotEligible = autoScore >= 95.0 && (!metadata.amount || metadata.amount <= 100000);
      if (isAutopilotEligible) {
        status = 'APPROVED_AUTO';
      }

      // 2. MCP 지식저장소에 생성 호출 (기밀 상태인 A 등급으로 적재)
      const completeContent = `${parsedContent}\n\n--- \n*   **작성자**: ${creator_id}\n*   **부서**: ${dept_code}\n*   **보안등급**: A\n*   **결재상태**: ${status}\n*   **파서스코어**: ${autoScore}\n*   **메타데이터**: ${JSON.stringify({ ...metadata, doc_type })}`;

      const newDocRes = await createKnowledgeDocument(
        snapshotId,
        title,
        'note',
        completeContent
      );

      const docId = newDocRes?.document?.id || newDocRes?.id || newDocRes?.document_id || newDocRes?.uuid || `doc-${Date.now()}`;

      return NextResponse.json({
        success: true,
        message: 'Zero-Trust A등급 최고 기밀 강제 격리 상태로 MCP에 안전 적재되었습니다.',
        document: {
          document_id: docId,
          title,
          doc_type,
          file_path: file_name ? `/files/${doc_type.toLowerCase()}/${file_name}` : null,
          thumbnail_path: thumbnailPath,
          creator_id,
          dept_code,
          security_level: 'A',
          content: parsedContent,
          status,
          autopilot_score: autoScore,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          approvals: [
            {
              document_id: docId,
              approver_id: status === 'APPROVED_AUTO' ? 'SYSTEM_AI' : `${dept_code.toLowerCase()}_director`,
              step_type: status === 'APPROVED_AUTO' ? 'AUTOPILOT' : 'APPROVER',
              status: status === 'APPROVED_AUTO' ? 'APPROVED' : 'WAITING',
              comments: status === 'APPROVED_AUTO' ? 'AI 파일럿 자동 전결 완료' : '수동 결재 대기'
            }
          ],
          metadata
        }
      });
    }

    if (action === 'DOWNGRADE') {
      const { document_id, new_level, user_role } = body;

      if (!document_id || !new_level || !user_role) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }

      if (user_role !== 'SUPER_ADMIN' && user_role !== 'PRESIDENT') {
        return NextResponse.json({ 
          success: false, 
          error: '보안 권한 부족: 등급 하향 조정 심사는 최고관리자 및 대표이사 계정만 권한이 부여됩니다.' 
        }, { status: 403 });
      }

      let originalDoc: any = null;
      try {
        originalDoc = await getKnowledgeDocument(document_id);
      } catch (err) {
        console.warn('기존 문서 조회 실패:', err);
        return NextResponse.json({ success: false, error: '문서 조회 실패' }, { status: 404 });
      }

      let updatedContent = originalDoc?.content || '';
      if (updatedContent) {
        // 보안등급을 새로운 등급으로 대체
        updatedContent = updatedContent.replace(/\*\s+\*\*보안등급\*\*:\s*A/g, `*   **보안등급**: ${new_level}`);
      }

      await updateKnowledgeDocument(document_id, {
        content: updatedContent
      });

      return NextResponse.json({ 
        success: true, 
        message: `문서 보안 등급이 ${new_level}등급으로 성공적으로 하향 조정되어 RAG 지식이 방출되었습니다.`,
        document_id,
        new_level
      });
    }

    if (action === 'UPDATE') {
      const { document_id, content, metadata, security_level } = body;

      if (!document_id || content === undefined) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }

      let originalDoc: any = null;
      try {
        originalDoc = await getKnowledgeDocument(document_id);
      } catch (err) {
        console.warn('기존 문서 조회 실패:', err);
        return NextResponse.json({ success: false, error: '문서 조회 실패' }, { status: 404 });
      }

      const parsed = parseDocContent(originalDoc.content || originalDoc.parsedBody, originalDoc.title);
      
      // 전달받은 metadata가 있으면 기존 데이터 대신 적용
      const finalMetadata = metadata || parsed.metadata || {};
      const docType = finalMetadata.doc_type || parsed.doc_type || 'MANUAL';
      // 전달받은 보안 등급이 있으면 적용
      const finalSecurityLevel = security_level || parsed.security_level || 'A';

      const completeContent = `${content}\n\n--- \n*   **작성자**: ${parsed.creator_id}\n*   **부서**: ${parsed.dept_code}\n*   **보안등급**: ${finalSecurityLevel}\n*   **결재상태**: ${parsed.status}\n*   **파서스코어**: ${parsed.autopilot_score}\n*   **메타데이터**: ${JSON.stringify({ ...finalMetadata, doc_type: docType })}`;

      await updateKnowledgeDocument(document_id, {
        content: completeContent
      });

      return NextResponse.json({ 
        success: true, 
        message: '지식 문서 내용, 메타데이터 및 보안 등급이 실시간으로 수정 및 업데이트되었습니다.',
        document_id
      });
    }

    if (action === 'DELETE') {
      const { document_id } = body;

      if (!document_id) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }

      await deleteKnowledgeDocument(document_id);

      return NextResponse.json({ 
        success: true, 
        message: '지식 문서가 성공적으로 삭제되었습니다.',
        document_id
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/knowledge-ai error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

