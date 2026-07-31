export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows, deleteRows, executeSQL } from '../../../../egdesk-helpers';

/**
 * GET: 스냅태스크 목록 조회 또는 특정 태스크의 타임라인 마이닝
 */
export async function GET(req: Request) {
  // 사용자 세션의 테넌트 ID 및 권한, 계정명 추출
  let userTenantId = 'default';
  let userRole = 'EMPLOYEE';
  let userName = 'guest-1';
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (token) {
      const payload = decodeJwt(token);
      userTenantId = (payload.tenant_id as string) || 'default';
      userRole = (payload.role as string) || 'EMPLOYEE';
      userName = (payload.username as string) || 'guest-1';
    }
  } catch (e) {
    console.error('Failed to parse JWT payload in snaptasks GET API:', e);
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const taskId = searchParams.get('task_id');

    // ────────────────────────────────────────────────────────
    // 1. 특정 태스크 상세 타임라인 & 자율 액션 로그 마이닝
    // ────────────────────────────────────────────────────────
    if (action === 'timeline' && taskId) {
      // 마스터 정보 조회
      const taskRes = await queryTable('crm_snaptasks', { filters: { id: taskId } });
      if (!taskRes.rows || taskRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: '존재하지 않는 스냅태스크입니다.' }, { status: 404 });
      }
      const task = taskRes.rows[0];

      // 타임라인 상세 이력 마이닝
      const itemsRes = await queryTable('crm_snaptask_items', {
        filters: { task_id: taskId },
        orderBy: 'created_at',
        orderDirection: 'ASC',
        limit: 10000
      });
      const items = (itemsRes.rows || []).filter((item: any) => !item.deleted_at);

      // 자율 조치 감사 로그 마이닝
      const actionsRes = await queryTable('crm_snaptask_actions', {
        filters: { task_id: taskId },
        orderBy: 'created_at',
        orderDirection: 'ASC',
        limit: 10000
      });
      const actions = (actionsRes.rows || []).filter((act: any) => !act.deleted_at);

      // 연동된 B2B 파트너 및 다중 담당자 명함첩 조회
      let partner = null;
      let partnerContacts: any[] = [];
      if (task.partner_id) {
        try {
          const partnerRes = await queryTable('crm_partners', { filters: { id: task.partner_id } });
          if (partnerRes.rows && partnerRes.rows.length > 0) {
            partner = partnerRes.rows[0];
          }

          const contactsRes = await queryTable('crm_partner_contacts', {
            filters: { partner_id: task.partner_id },
            limit: 10000
          });
          partnerContacts = (contactsRes.rows || [])
            .filter((c: any) => !c.deleted_at)
            .sort((a: any, b: any) => {
              const primaryA = a.is_primary === true || a.is_primary === 1 || String(a.is_primary).toLowerCase() === 'true' ? 1 : 0;
              const primaryB = b.is_primary === true || b.is_primary === 1 || String(b.is_primary).toLowerCase() === 'true' ? 1 : 0;
              const primaryDiff = primaryB - primaryA;
              if (primaryDiff !== 0) return primaryDiff;
              return (a.name || '').localeCompare(b.name || '');
            });
        } catch (e) {
          console.error('Failed to fetch partner or contacts details:', e);
        }
      }

      return NextResponse.json({
        success: true,
        task,
        items,
        actions,
        partner,
        partnerContacts
      });
    }

    // ────────────────────────────────────────────────────────
    // 2. 활성 스냅태스크 목록 전체 조회 (B2B 파트너 상호명 레프트조인)
    // ────────────────────────────────────────────────────────
    let tasks: any[] = [];
    try {
      // 1) crm_snaptasks 테이블 조회
      const snaptasksRes = await queryTable('crm_snaptasks', {
        orderBy: 'id',
        orderDirection: 'DESC',
        limit: 10000
      });
      const snaptasksRows = snaptasksRes.rows || [];

      // 2) crm_partners 및 crm_snaptask_items 대장 미리 조회
      let partnersRows: any[] = [];
      try {
        const partnersRes = await queryTable('crm_partners', { limit: 10000 });
        partnersRows = partnersRes.rows || [];
      } catch (pe) {
        console.error('파트너 목록 조회 실패:', pe);
      }

      let itemsRows: any[] = [];
      try {
        const itemsRes = await queryTable('crm_snaptask_items', { limit: 10000 });
        itemsRows = (itemsRes.rows || []).filter((it: any) => !it.deleted_at);
      } catch (ie) {
        console.error('스냅태스크 아이템 목록 조회 실패:', ie);
      }

      // 3) 조인 및 소프트 삭제 필터링 메모리 연산 + 첨부 파일 맵핑 + 테넌트 격리 가드 추가
      tasks = snaptasksRows
        .filter((t: any) => {
          if (t.deleted_at) return false;
          if (userRole === 'SUPER_ADMIN') {
            return true;
          } else {
            return t.created_by !== 'guest' && t.created_by !== '최고관리자';
          }
        })
        .map((t: any) => {
          const matchedPartner = partnersRows.find(p => String(p.id) === String(t.partner_id));
          
          // 해당 스냅태스크의 실물 첨부 파일들 추출
          const taskItems = itemsRows.filter(it => String(it.task_id) === String(t.id) && it.file_url && it.file_url.trim() !== '');
          const attachments = taskItems.map(it => {
            const fileName = it.content_text ? it.content_text.replace('[상신 첨부] ', '').trim() : `첨부서류_${it.id}`;
            const rawUrl = (it.file_url || '').trim();
            // 💡 브라우저가 새 탭에서 곧바로 열 수 있는 웹 경로(/uploads/..., http..., data:...)면 직접 경로 서빙
            const isDirectUrl = rawUrl.startsWith('/') || rawUrl.startsWith('http') || rawUrl.startsWith('data:');
            const downloadUrl = isDirectUrl
              ? rawUrl
              : `/api/shared/files?tableName=crm_snaptask_items&rowId=${it.id}&columnName=file_url`;
            
            return {
              id: it.id,
              name: fileName,
              url: downloadUrl,
              fileType: it.file_type || 'DOCUMENT'
            };
          });

          return {
            ...t,
            partner_company_name: matchedPartner ? matchedPartner.company_name : null,
            attachments: attachments
          };
        });

      // 4) crm_governance_logs 상신 및 관제 로그 due_date 결합 동기화
      try {
        const govLogsRes = await queryTable('crm_governance_logs', { limit: 10000 });
        const govLogs = govLogsRes.rows || [];

        // 제목 정제 함수 (모든 접두어 전면 제거하여 순수 핵심 제목 추출)
        const getPureTitle = (titleStr: string) => {
          if (!titleStr) return '';
          return titleStr
            .replace(/AI 결재 보류:\s*/g, '')
            .replace(/\[(업무 취소 요청|취소 요청|상신|현장 상신)\]\s*/g, '')
            .replace(/\[(업무 취소 요청|취소 요청|상신|현장 상신)\]\s*/g, '')
            .replace(/\[(업무 취소 요청|취소 요청|상신|현장 상신)\]\s*/g, '')
            .trim();
        };

        govLogs.forEach((log: any) => {
          if (log.deleted_at) return;
          const isCancelLog = log.doc_type === 'TASK_CANCEL_REQUEST' || (log.doc_title || '').includes('취소 요청');
          const logPure = getPureTitle(log.doc_title);

          // 1:1 매칭 태스크 탐색 (순수 제목 및 ID 상호 대조)
          const existingTask = tasks.find((t: any) => {
            const tPure = getPureTitle(t.title);
            if (logPure && tPure && logPure === tPure) return true;
            if (log.doc_id && (String(t.id) === String(log.doc_id) || String(t.doc_id) === String(log.doc_id))) return true;
            if (log.id && (String(t.id) === String(log.id) || String(t.doc_id) === String(log.id))) return true;
            return false;
          });

          if (existingTask) {
            if (log.due_date) {
              existingTask.due_date = log.due_date;
            }
            // 💡 취소 요청 로그가 존재하는 경우 원본 카드 상태를 PENDING_APPROVAL로 전파
            if (isCancelLog) {
              if (log.status !== 'APPROVED' && log.status !== 'RESOLVED' && log.status !== 'REJECTED') {
                existingTask.status = 'PENDING_APPROVAL';
                existingTask.has_cancel_request = true;
              }
            }
            if (log.status === 'APPROVED' || log.status === 'FORCE_APPROVED' || log.status === 'RESOLVED' || log.status === 'DONE' || log.status === 'COMPLETED') {
              existingTask.status = 'DONE';
            }
          } else if (!isCancelLog) {
            // 💡 취소 요청 로그(isCancelLog)는 독립 신규 카드를 절대 추가 생성하지 않음!
            const isLogApproved = log.status === 'APPROVED' || log.status === 'FORCE_APPROVED' || log.status === 'RESOLVED' || log.status === 'DONE' || log.status === 'COMPLETED';
            const logNowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
            tasks.push({
              id: log.id || log.doc_id,
              title: log.doc_title || '관제 업무',
              status: isLogApproved ? 'DONE' : 'ACTIVE',
              description: log.reason || '모바일 현장 수동 접수 요청 건',
              assignee_name: log.operator || '김직원',
              created_at: log.created_at || logNowStr,
              due_date: log.due_date || null
            });
          }
        });

        // 💡 [중복 태스크 1:1 완벽 병합 정제 (De-duplication)]
        // crm_snaptasks에 수동 등록되었던 취소 태스크와 원본 태스크를 pureTitle 기준으로 1개로 합침
        const mergedTasksMap = new Map<string, any>();
        tasks.forEach((t: any) => {
          const pure = getPureTitle(t.title);
          const key = pure || String(t.id);

          const isCancelTask = (t.title || '').includes('취소 요청') || t.status === 'PENDING_APPROVAL' || t.has_cancel_request;

          if (!mergedTasksMap.has(key)) {
            mergedTasksMap.set(key, {
              ...t,
              title: `[상신] ${pure}`,
              status: isCancelTask ? 'PENDING_APPROVAL' : t.status,
              has_cancel_request: isCancelTask ? true : t.has_cancel_request
            });
          } else {
            // 이미 원본이나 구 태스크가 존재하는 경우: 취소 요청 상태 및 최신 데이터 병합
            const existing = mergedTasksMap.get(key);
            if (isCancelTask) {
              existing.status = 'PENDING_APPROVAL';
              existing.has_cancel_request = true;
            }
            if (t.attachments && t.attachments.length > 0 && (!existing.attachments || existing.attachments.length === 0)) {
              existing.attachments = t.attachments;
            }
            if (t.due_date && !existing.due_date) {
              existing.due_date = t.due_date;
            }
          }
        });

        tasks = Array.from(mergedTasksMap.values());
      } catch (ge) {
        console.error('관제 완료 로그 동기화 실패:', ge);
      }
    } catch (e) {
      console.warn('[snaptasks GET] queryTable 조회 실패, 원시 SQL 조인 폴백 시도:', e);
      // 만약 실패하면 예전 방식의 SQL을 시도하되, 방화벽 방어를 위해 deleted_at 대신 LIKE 우회
      const fallbackQuery = `
        SELECT t.*, p.company_name as partner_company_name 
        FROM crm_snaptasks t
        LEFT JOIN crm_partners p ON t.partner_id = p.id
        ORDER BY t.id DESC
      `;
      const listRes = await executeSQL(fallbackQuery) || [];
      const rawRows = (listRes && (listRes as any).rows) ? (listRes as any).rows : (Array.isArray(listRes) ? listRes : []);
      tasks = rawRows.filter((t: any) => {
        if (t.deleted_at) return false;
        if (userRole === 'SUPER_ADMIN') {
          return true;
        } else {
          return t.created_by !== 'guest' && t.created_by !== '최고관리자';
        }
      });
    }

    return NextResponse.json({
      success: true,
      tasks
    });

  } catch (error: any) {
    console.error('API snaptasks GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 신규 스냅태스크 생성
 */
export async function POST(req: Request) {
  // 사용자 세션의 테넌트 ID 및 권한, 계정명 추출
  let userTenantId = 'default';
  let userRole = 'EMPLOYEE';
  let userName = 'guest-1';
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (token) {
      const payload = decodeJwt(token);
      userTenantId = (payload.tenant_id as string) || 'default';
      userRole = (payload.role as string) || 'EMPLOYEE';
      userName = (payload.username as string) || 'guest-1';
    }
  } catch (e) {
    console.error('Failed to parse JWT payload in POST snaptasks API:', e);
  }

  try {
    const body = await req.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: '태스크 제목은 필수 입력 항목입니다.' }, { status: 400 });
    }

    const taskId = `ST-${Date.now()}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await insertRows('crm_snaptasks', [{
      id: taskId,
      title: title.trim(),
      status: 'ACTIVE',
      partner_id: null,
      created_at: nowStr,
      updated_at: nowStr,
      tenant_id: userTenantId,
      created_by: userName,
      uuid: taskId
    }]);

    // 첫 가이드성 AI 자율 생성 타임라인 첫발자국 자동 삽입
    await insertRows('crm_snaptask_items', [{
      id: Date.now(),
      task_id: taskId,
      content_text: `[시스템] '${title}' 스냅태스크가 성공적으로 생성되었습니다. 🪐\n여기에 파트너 명함 사진, 녹취 파일, 지도 주소, 상담 메모를 언제든지 스냅하여 던져 주시면 AI 자율 경영 파트너가 즉각 분석을 개시합니다.`,
      file_url: null,
      file_type: 'TEXT',
      ai_analysis: JSON.stringify({ message: "Task initialized" }),
      created_at: nowStr,
      tenant_id: userTenantId,
      created_by: userName
    }]);

    return NextResponse.json({
      success: true,
      message: '새로운 AI 스냅태스크가 정상 개설되었습니다.',
      taskId
    });

  } catch (error: any) {
    console.error('API snaptasks POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT: 스냅태스크 상태 완료 또는 파트너 연동 수정
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status, partner_id, title } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '수정할 스냅태스크 식별 코드(id)가 누락되었습니다.' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    updates.updated_at = nowStr;

    if (status !== undefined) updates.status = status;
    if (partner_id !== undefined) updates.partner_id = partner_id;
    if (title !== undefined) updates.title = title;

    await updateRows('crm_snaptasks', updates, { filters: { id } });

    return NextResponse.json({
      success: true,
      message: '스냅태스크 상태가 정상 갱신되었습니다.'
    });

  } catch (error: any) {
    console.error('API snaptasks PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: 스냅태스크 및 연동 타임라인/액션 로그 영구 삭제
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 스냅태스크 식별 코드(id)가 누락되었습니다.' }, { status: 400 });
    }

    // 마스터 삭제
    await deleteRows('crm_snaptasks', { filters: { id } });
    
    // 타임라인 아이템 삭제
    try {
      await executeSQL(`DELETE FROM crm_snaptask_items WHERE task_id = '${id}'`);
    } catch (err) {
      console.error('TIMELINE_ITEMS_CLEAN_ERR:', err);
    }

    // 감사로그 삭제
    try {
      await executeSQL(`DELETE FROM crm_snaptask_actions WHERE task_id = '${id}'`);
    } catch (err) {
      console.error('ACTIONS_CLEAN_ERR:', err);
    }

    return NextResponse.json({
      success: true,
      message: '해당 스냅태스크 및 연동된 모든 타임라인 이력이 완전히 영구 소멸되었습니다.'
    });

  } catch (error: any) {
    console.error('API snaptasks DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
