// 🏢 테넌트 다중 사업장 마스터 CRUD API (Turbopack HMR Refreshed)
import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, executeSQL } from '../../../../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

// GET: 사업장/현장 목록 조회
export async function GET(req: NextRequest) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';

    if (action === 'list') {
      const sql = `
        SELECT id, uuid, name, address, latitude, longitude, radius_meters, is_main, created_at, updated_at
        FROM crm_workplaces
        WHERE deleted_at IS NULL AND tenant_id = '${tenantId}'
        ORDER BY is_main DESC, id ASC
      `;
      const res = await executeSQL(sql).catch(() => ({ rows: [] }));
      let workplaces = res.rows || [];

      // 해당 테넌트에 사업장이 하나도 없으면 기본 '본사' 자동 주입
      if (workplaces.length === 0) {
        const defaultWorkplace = {
          name: '본사',
          address: '서울특별시 중구 세종대로 110 (본사)',
          latitude: 37.5665,
          longitude: 126.9780,
          radius_meters: 500,
          is_main: 'Y',
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        };
        await insertRows('crm_workplaces', [defaultWorkplace]).catch(() => null);
        const reFetch = await executeSQL(sql).catch(() => ({ rows: [] }));
        workplaces = reFetch.rows || [];
      }

      return NextResponse.json({ success: true, workplaces });
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 요청입니다.' }, { status: 400 });
  } catch (err: any) {
    console.error('Workplaces GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: 사업장 추가, 수정, 삭제
export async function POST(req: NextRequest) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const body = await req.json();

    if (action === 'create') {
      const { name, address, latitude, longitude, radius_meters, is_main } = body;
      if (!name) {
        return NextResponse.json({ success: false, error: '사업장명은 필수입니다.' }, { status: 400 });
      }

      // 만약 본사(is_main === 'Y')로 지정한 경우 해당 테넌트의 기존 본사 해제
      if (is_main === 'Y') {
        await executeSQL(`UPDATE crm_workplaces SET is_main = 'N' WHERE deleted_at IS NULL AND tenant_id = '${tenantId}'`);
      }

      const newRow = {
        name,
        address: address || '',
        latitude: latitude ? Number(latitude) : 37.5665,
        longitude: longitude ? Number(longitude) : 126.9780,
        radius_meters: radius_meters ? Number(radius_meters) : 500,
        is_main: is_main === 'Y' ? 'Y' : 'N',
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await insertRows('crm_workplaces', [newRow]);
      return NextResponse.json({ success: true, message: '사업장이 추가되었습니다.', result });
    }

    if (action === 'update') {
      const { id, name, address, latitude, longitude, radius_meters, is_main } = body;
      if (!id || !name) {
        return NextResponse.json({ success: false, error: 'ID 및 사업장명은 필수입니다.' }, { status: 400 });
      }

      if (is_main === 'Y') {
        await executeSQL(`UPDATE crm_workplaces SET is_main = 'N' WHERE deleted_at IS NULL AND tenant_id = '${tenantId}' AND id != ${Number(id)}`);
      }

      const updateData = {
        name,
        address: address || '',
        latitude: latitude ? Number(latitude) : 37.5665,
        longitude: longitude ? Number(longitude) : 126.9780,
        radius_meters: radius_meters ? Number(radius_meters) : 500,
        is_main: is_main === 'Y' ? 'Y' : 'N',
        updated_at: new Date().toISOString()
      };

      await updateRows('crm_workplaces', updateData, { filters: { id: String(id), tenant_id: tenantId } });
      return NextResponse.json({ success: true, message: '사업장 정보가 수정되었습니다.' });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: '삭제할 ID가 필요합니다.' }, { status: 400 });
      }

      // 소프트 삭제(Soft Delete) 준수
      const deleteData = {
        deleted_at: new Date().toISOString()
      };
      await updateRows('crm_workplaces', deleteData, { filters: { id: String(id), tenant_id: tenantId } });
      return NextResponse.json({ success: true, message: '사업장이 소프트 삭제되었습니다.' });
    }

    return NextResponse.json({ success: false, error: '지원하지 않는 액션입니다.' }, { status: 400 });
  } catch (err: any) {
    console.error('Workplaces POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
