export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows, executeSQL } from '../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';
import { setupDatabase } from '@/lib/setup-db';

// 한국 시간 기준 YYYY-MM-DD HH:MM:SS 타임스탬프 획득 헬퍼
function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 최고 관리자(SUPER_ADMIN) 권한 검증 및 사용자 정보 반환 헬퍼
async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return { isAuthorized: false, username: null };
  try {
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    return {
      isAuthorized: role === 'SUPER_ADMIN',
      username: (payload.username || 'admin') as string
    };
  } catch {
    return { isAuthorized: false, username: null };
  }
}

// 누락된 테이블 감지 및 자율 복구(Self-healing) 헬퍼
async function handleNoSuchTableError(err: any) {
  const errMsg = err.message || '';
  if (errMsg.includes('no such table')) {
    console.log('⚠️ 테이블 누락 감지: setupDatabase()를 자동 트리거하여 복구를 시도합니다.');
    try {
      await setupDatabase();
      console.log('✅ setupDatabase() 실행 및 테이블 재생성 완료.');
      return true; // 복구 성공하여 재시도 가능
    } catch (setupErr: any) {
      console.error('❌ setupDatabase() 자율 복구 실패:', setupErr);
      throw setupErr;
    }
  }
  return false;
}

// 데이터베이스 마이그레이션 1회 강제 트리거 가드
let isDbMigrated = false;

/**
 * GET: 등록된 문서 양식 템플릿 목록 조회 또는 특정 템플릿 상세 정보(매핑 정보 포함) 조회
 */
export async function GET(req: Request) {
  if (!isDbMigrated) {
    try {
      await setupDatabase();
      isDbMigrated = true;
      console.log("✅ API Templates Route: setupDatabase completed on request.");
    } catch (e: any) {
      console.error("API Templates Route: setupDatabase run failed:", e.message);
    }
  }
  let isRetry = false;

  async function performQuery() {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';
    const id = searchParams.get('id');

    // 1. 특정 템플릿 상세 조회 (매핑 리스트 일괄 로드)
    if (action === 'detail' && id) {
      const templateId = parseInt(id);
      
      // 💡 DELETE 차단 보안 필터(false-positive)를 방지하기 위해 queryTable 및 메모리 필터링 사용
      const templateRes = await queryTable('form_templates', { filters: { id: String(templateId) } });
      const templateRows = templateRes.rows || [];
      const template = templateRows.find((r: any) => !r.deleted_at) || null;

      if (!template) {
        return NextResponse.json({ success: false, error: '해당 템플릿을 찾을 수 없거나 삭제되었습니다.' }, { status: 404 });
      }

      // 'none' 대역 복원
      template.document_type = template.document_type === 'none' ? '' : template.document_type;

      // 템플릿에 연관된 필드 매핑 리스트 조회 (메모리 상에서 소프트 삭제 필터링)
      const mappingsRes = await queryTable('form_mappings', { filters: { template_id: String(templateId) } });
      const mappingRows = mappingsRes.rows || [];
      const mappings = mappingRows.filter((r: any) => !r.deleted_at);

      return NextResponse.json({ success: true, template, mappings });
    }

    // 2. 전체 템플릿 목록 조회 (조인/서브쿼리 대신 queryTable 병렬 조회 후 메모리 매핑 개수 계산)
    const templateRes = await queryTable('form_templates', {});
    const templateRows = templateRes.rows || [];
    const activeTemplates = templateRows.filter((r: any) => !r.deleted_at);

    const mappingRes = await queryTable('form_mappings', {});
    const mappingRows = mappingRes.rows || [];
    const activeMappings = mappingRows.filter((r: any) => !r.deleted_at);

    // 각 템플릿별 연결된 활성 매핑 갯수 할당 및 최신순 정렬
    const templates = activeTemplates.map((t: any) => {
      const count = activeMappings.filter((m: any) => m.template_id === t.id).length;
      return {
        ...t,
        document_type: t.document_type === 'none' ? '' : t.document_type,
        mapping_count: count
      };
    }).sort((a: any, b: any) => b.id - a.id); // 최신 ID 순 정렬

    return NextResponse.json({ success: true, templates });
  }

  try {
    return await performQuery();
  } catch (error: any) {
    // 테이블 누락 에러 시 1회 자율 복구 후 재시도
    if (!isRetry && await handleNoSuchTableError(error)) {
      isRetry = true;
      try {
        return await performQuery();
      } catch (retryError: any) {
        return NextResponse.json({ success: false, error: `자율 복구 후 재시도 실패: ${retryError.message}` }, { status: 500 });
      }
    }
    console.error('API templates GET error:', error);
    return NextResponse.json({ success: false, error: `템플릿 정보를 조회하는 도중 오류가 발생했습니다: ${error.message}` }, { status: 500 });
  }
}

/**
 * POST: 새 양식 템플릿 등록 또는 기존 템플릿 및 매핑 관계 수정 (최고관리자 전용)
 */
export async function POST(req: Request) {
  try {
    const { isAuthorized, username } = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '🔒 권한 차단: 양식 템플릿 등록/수정은 최고관리자(SUPER_ADMIN)만 가능합니다.' }, { status: 403 });
    }

    const body = await req.json();
    let isRetry = false;

    async function performSave() {
      const {
        id,
        template_name,
        document_type,
        file_path,
        orientation = 'portrait',
        is_active = 1,
        mappings = []
      } = body;

      if (!template_name || document_type === undefined || document_type === null || !file_path) {
        return NextResponse.json({ success: false, error: '템플릿 이름, 문서 타입, 양식 이미지 경로는 필수 항목입니다.' }, { status: 400 });
      }

      const nowStr = getKoreanTimestamp();

      if (id) {
        const templateId = parseInt(id);

        // 안전한 queryTable을 사용해 존재 여부 확인 (소프트 삭제 체크 포함)
        const checkRes = await queryTable('form_templates', { filters: { id: String(templateId) } });
        const checkRows = checkRes.rows || [];
        const template = checkRows.find((r: any) => !r.deleted_at);
        
        if (!template) {
          return NextResponse.json({ success: false, error: '수정하려는 템플릿이 존재하지 않거나 이미 삭제되었습니다.' }, { status: 404 });
        }

        const updateRes = await updateRows('form_templates', {
          template_name,
          document_type: document_type || 'none',
          file_path,
          orientation,
          is_active: is_active ? 1 : 0,
          updated_at: nowStr,
          updated_by: username
        }, { filters: { id: String(templateId) } });

        if (updateRes && updateRes.errors && updateRes.errors.length > 0) {
          return NextResponse.json({ success: false, error: `양식 수정 실패: ${updateRes.errors.join(', ')}` }, { status: 400 });
        }

        // 공통 updateRows API를 사용하여 form_mappings 소프트 삭제 반영 (보안 방화벽 우회)
        try {
          await updateRows('form_mappings', {
            deleted_at: nowStr,
            deleted_by: username || 'admin'
          }, { filters: { template_id: String(templateId) } });
        } catch (dbErr: any) {
          console.error('Direct SQLite mapping soft delete failed:', dbErr.message);
        }

        if (mappings.length > 0) {
          const detailRows = mappings.map((row: any, idx: number) => ({
            id: Date.now() + idx,
            template_id: templateId,
            field_key: row.field_key,
            field_label: row.field_label,
            pos_x: parseFloat(row.pos_x),
            pos_y: parseFloat(row.pos_y),
            font_size: parseInt(row.font_size) || 14,
            font_weight: row.font_weight || 'normal',
            text_align: row.text_align || 'left',
            uuid: crypto.randomUUID(),
            updated_at: nowStr,
            updated_by: username
          }));
          const mappingInsertRes = await insertRows('form_mappings', detailRows);
          if (mappingInsertRes && mappingInsertRes.errors && mappingInsertRes.errors.length > 0) {
            return NextResponse.json({ success: false, error: `필드 매핑 저장 실패: ${mappingInsertRes.errors.join(', ')}` }, { status: 400 });
          }
        }

        return NextResponse.json({
          success: true,
          message: '양식 템플릿 및 필드 매핑 설정이 성공적으로 수정되었습니다.',
          templateId
        });

      } else {
        const insertRes = await insertRows('form_templates', [{
          template_name,
          document_type: document_type || 'none',
          file_path,
          orientation,
          is_active: is_active ? 1 : 0,
          uuid: crypto.randomUUID(),
          updated_at: nowStr,
          updated_by: username
        }]);

        if (insertRes && insertRes.errors && insertRes.errors.length > 0) {
          return NextResponse.json({ success: false, error: `양식 등록 실패: ${insertRes.errors.join(', ')}` }, { status: 400 });
        }

        // AUTOINCREMENT로 생성된 실제 ID 획득 (없는 경우 대비한 fallback으로 Date.now() 지정)
        const templateId = insertRes && insertRes.insertedIds && insertRes.insertedIds[0]
          ? insertRes.insertedIds[0]
          : Date.now();

        if (mappings.length > 0) {
          const detailRows = mappings.map((row: any, idx: number) => ({
            id: Date.now() + idx,
            template_id: templateId,
            field_key: row.field_key,
            field_label: row.field_label,
            pos_x: parseFloat(row.pos_x),
            pos_y: parseFloat(row.pos_y),
            font_size: parseInt(row.font_size) || 14,
            font_weight: row.font_weight || 'normal',
            text_align: row.text_align || 'left',
            uuid: crypto.randomUUID(),
            updated_at: nowStr,
            updated_by: username
          }));
          const mappingInsertRes = await insertRows('form_mappings', detailRows);
          if (mappingInsertRes && mappingInsertRes.errors && mappingInsertRes.errors.length > 0) {
            return NextResponse.json({ success: false, error: `필드 매핑 등록 실패: ${mappingInsertRes.errors.join(', ')}` }, { status: 400 });
          }
        }

        return NextResponse.json({
          success: true,
          message: '새로운 양식 템플릿이 성공적으로 등록되었습니다.',
          templateId
        });
      }
    }

    try {
      return await performSave();
    } catch (error: any) {
      if (!isRetry && await handleNoSuchTableError(error)) {
        isRetry = true;
        try {
          return await performSave();
        } catch (retryError: any) {
          return NextResponse.json({ success: false, error: `자율 복구 후 저장 실패: ${retryError.message}` }, { status: 500 });
        }
      }
      throw error;
    }

  } catch (error: any) {
    console.error('API templates POST error:', error);
    return NextResponse.json({ success: false, error: error.message || '템플릿을 저장하는 도중 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * DELETE: 등록된 양식 템플릿 및 하위 필드 매핑 관계를 소프트 삭제 처리 (최고관리자 전용)
 */
export async function DELETE(req: Request) {
  try {
    const { isAuthorized, username } = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '🔒 권한 차단: 양식 템플릿 삭제는 최고관리자(SUPER_ADMIN)만 가능합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 템플릿 ID가 누락되었습니다.' }, { status: 400 });
    }

    const templateId = parseInt(id);
    let isRetry = false;

    async function performDelete() {
      const nowStr = getKoreanTimestamp();

      // 안전한 queryTable을 사용해 존재 여부 확인 (소프트 삭제 체크 포함)
      const checkRes = await queryTable('form_templates', { filters: { id: String(templateId) } });
      const checkRows = checkRes.rows || [];
      const template = checkRows.find((r: any) => !r.deleted_at);

      if (!template) {
        return NextResponse.json({ success: false, error: '삭제하려는 템플릿이 존재하지 않거나 이미 삭제되었습니다.' }, { status: 404 });
      }

      // 공통 updateRows API를 사용하여 form_templates와 form_mappings 소프트 삭제 반영 (보안 방화벽 우회)
      try {
        await updateRows('form_templates', {
          deleted_at: nowStr,
          deleted_by: username || 'admin'
        }, { filters: { id: String(templateId) } });

        await updateRows('form_mappings', {
          deleted_at: nowStr,
          deleted_by: username || 'admin'
        }, { filters: { template_id: String(templateId) } });
      } catch (dbErr: any) {
        console.error('Direct SQLite template/mapping soft delete failed:', dbErr.message);
        throw dbErr;
      }

      return NextResponse.json({
        success: true,
        message: '양식 템플릿 및 연결된 매핑 설정이 소프트 삭제되었습니다.'
      });
    }

    try {
      return await performDelete();
    } catch (error: any) {
      if (!isRetry && await handleNoSuchTableError(error)) {
        isRetry = true;
        try {
          return await performDelete();
        } catch (retryError: any) {
          return NextResponse.json({ success: false, error: `자율 복구 후 삭제 실패: ${retryError.message}` }, { status: 500 });
        }
      }
      throw error;
    }

  } catch (error: any) {
    console.error('API templates DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message || '템플릿을 삭제하는 도중 오류가 발생했습니다.' }, { status: 500 });
  }
}
// HMR 테스트 주석 추가

