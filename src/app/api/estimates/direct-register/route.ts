export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';
import fs from 'fs';

const dbPaths = [
  'C:/Users/CHARISMA/AppData/Roaming/EGDesk/user-data/development/projects/49a59fa4-40b6-40f4-8c3d-0231be79c7f9/user_data.db',
  'C:/Users/CHARISMA/AppData/Roaming/egdesk/user-data/development/projects/49a59fa4-40b6-40f4-8c3d-0231be79c7f9/user_data.db'
];

function getActiveDb() {
  for (const dbPath of dbPaths) {
    if (fs.existsSync(dbPath)) {
      return new Database(dbPath, { fileMustExist: true });
    }
  }
  throw new Error('데이터베이스 파일을 찾을 수 없습니다.');
}

function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

async function verifyUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return { isAuthorized: false, username: 'admin' };
    const payload = decodeJwt(token);
    return {
      isAuthorized: true,
      username: (payload.username || 'admin') as string
    };
  } catch {
    return { isAuthorized: false, username: 'admin' };
  }
}

export async function POST(req: Request) {
  console.log("=== POST /api/estimates/direct-register API START ===");
  const { username } = await verifyUser();

  let db;
  try {
    const body = await req.json();
    const {
      document_type,
      recipient_company,
      recipient_address,
      recipient_contact,
      recipient_phone,
      supplier_company,
      supplier_address,
      supplier_owner,
      supplier_phone,
      transaction_type,
      document_memo,
      items
    } = body;

    if (!document_type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: '필수 매개변수(document_type, items)가 누락되었습니다.' }, { status: 400 });
    }

    db = getActiveDb();

    // 1. DDL 마이그레이션 자율 검증: crm_estimate_items에 spec 컬럼 누락 여부 검사 및 추가
    const tableInfo = db.prepare("PRAGMA table_info(crm_estimate_items)").all();
    const hasSpec = tableInfo.some((col: any) => col.name === 'spec');
    if (!hasSpec) {
      console.log("Migrating database: Adding 'spec' column to 'crm_estimate_items'...");
      db.prepare("ALTER TABLE crm_estimate_items ADD COLUMN spec TEXT").run();
    }

    const timestamp = getKoreanTimestamp();
    const isEstimate = document_type.startsWith('ESTIMATE_');
    const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

    // 트랜잭션 수행
    const runTransaction = db.transaction(() => {
      if (isEstimate) {
        // 보낼 견적서 등록 (OUTBOUND)
        const estimateId = `EST-OUT-${Date.now()}`;
        const estimateUuid = crypto.randomUUID();

        // crm_estimates 적재
        db.prepare(`
          INSERT INTO crm_estimates (
            id, type, direction_status, partner_name, partner_phone, partner_manager,
            total_amount, tags, created_at, uuid, updated_at, updated_by
          ) VALUES (?, 'outbound', '견적완료', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          estimateId,
          recipient_company || '미지정',
          recipient_phone || null,
          recipient_contact || null,
          totalAmount,
          transaction_type || '자재구매',
          timestamp,
          estimateUuid,
          timestamp,
          username
        );

        // 품목 적재
        for (const item of items) {
          const itemUuid = crypto.randomUUID();
          const specJson = JSON.stringify({
            billing_type: item.billing_type || 'general',
            billing_type_name: item.billing_type_name || '일반단가',
            unit: item.unit || 'EA',
            delivery_date: item.delivery_date || '',
            has_cost_breakdown: !!item.has_cost_breakdown,
            cost_breakdown: item.cost_breakdown || {
              material_cost: 0,
              processing_cost: 0,
              overhead_cost: 0,
              other_expenses: 0,
              delivery_expense: 0
            }
          });

          db.prepare(`
            INSERT INTO crm_estimate_items (
              estimate_id, product_id, item_code, product_name, quantity, unit_price, amount,
              uuid, updated_at, updated_by, spec
            ) VALUES (?, 'MANUAL', ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            estimateId,
            item.item_code || '',
            item.product_name || '품목명 없음',
            String(item.quantity || 1),
            String(item.unit_price || 0),
            String(item.amount || 0),
            itemUuid,
            timestamp,
            username,
            specJson
          );
        }

        return { success: true, estimateId };

      } else {
        // 보낼 발주서 등록 (INBOUND PO + Shadow Estimate 1타 2피 트랜잭션)
        const shadowEstimateId = `EST-SHADOW-${Date.now()}`;
        const shadowEstimateUuid = crypto.randomUUID();

        // 1) 섀도우 견적서 생성 (crm_estimates - type: 'inbound')
        db.prepare(`
          INSERT INTO crm_estimates (
            id, type, direction_status, partner_name, partner_phone, partner_manager,
            total_amount, tags, created_at, uuid, updated_at, updated_by
          ) VALUES (?, 'inbound', '섀도우견적', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          shadowEstimateId,
          supplier_company || '미지정',
          supplier_phone || null,
          supplier_owner || null, // 대표자를 관리자명으로 임시 연동
          totalAmount,
          transaction_type || '자재구매',
          timestamp,
          shadowEstimateUuid,
          timestamp,
          username
        );

        // 2) 발주서 생성 (crm_purchase_orders)
        const poUuid = crypto.randomUUID();
        db.prepare(`
          INSERT INTO crm_purchase_orders (
            estimate_id, vendor_name, vendor_phone, status, total_amount,
            created_at, uuid, updated_at, updated_by
          ) VALUES (?, ?, ?, '발주완료', ?, ?, ?, ?, ?)
        `).run(
          shadowEstimateId,
          supplier_company || '미지정',
          supplier_phone || null,
          String(totalAmount),
          timestamp,
          poUuid,
          timestamp,
          username
        );

        // 3) 품목 적재 (섀도우 견적 ID에 바인딩)
        for (const item of items) {
          const itemUuid = crypto.randomUUID();
          const specJson = JSON.stringify({
            billing_type: item.billing_type || 'general',
            billing_type_name: item.billing_type_name || '일반단가',
            unit: item.unit || 'EA',
            delivery_date: item.delivery_date || '',
            has_cost_breakdown: !!item.has_cost_breakdown,
            cost_breakdown: item.cost_breakdown || {
              material_cost: 0,
              processing_cost: 0,
              overhead_cost: 0,
              other_expenses: 0,
              delivery_expense: 0
            }
          });

          db.prepare(`
            INSERT INTO crm_estimate_items (
              estimate_id, product_id, item_code, product_name, quantity, unit_price, amount,
              uuid, updated_at, updated_by, spec
            ) VALUES (?, 'MANUAL', ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            shadowEstimateId,
            item.item_code || '',
            item.product_name || '품목명 없음',
            String(item.quantity || 1),
            String(item.unit_price || 0),
            String(item.amount || 0),
            itemUuid,
            timestamp,
            username,
            specJson
          );
        }

        return { success: true, shadowEstimateId };
      }
    });

    const result = runTransaction();
    console.log("Transaction successfully committed. Result:", result);
    return NextResponse.json({ success: true, message: '거래 정보가 SCM 데이터베이스에 안전하게 등록되었습니다.', ...result });

  } catch (err: any) {
    console.error('POST /api/estimates/direct-register error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (db) db.close();
  }
}
