"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDatabase = setupDatabase;
const egdesk_helpers_1 = require("../../egdesk-helpers");
async function setupDatabase() {
    const safeCreateTable = async (displayName, columns, options) => {
        const tableName = options.tableName;
        try {
            // 1. 물리 SQLite DB에 테이블이 이미 존재하는지 검증하여 무분별한 드롭 방지
            let exists = false;
            try {
                const checkRes = await (0, egdesk_helpers_1.executeSQL)(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
                exists = checkRes && checkRes.rows && checkRes.rows.length > 0;
            }
            catch (err) {
                exists = false;
            }
            if (exists) {
                console.log(`Table "${tableName}" already exists physically. Skipping creation.`);
                return;
            }
            // 2. 물리적으로는 없는데 메타데이터만 꼬여있는 경우, 선제 정리 후 깨끗하게 생성
            console.log(`Table "${tableName}" does not exist physically. Re-creating...`);
            try {
                await (0, egdesk_helpers_1.deleteTable)(tableName);
            }
            catch (e) {
                // 이미 테이블이 없는 경우 무시
            }
            await (0, egdesk_helpers_1.createTable)(displayName, columns, options);
            console.log(`Table "${tableName}" created successfully.`);
        }
        catch (e) {
            console.error(`Error creating table "${tableName}":`, e.message);
        }
    };
    console.log('Starting database setup for egdesk-FreeSMS...');
    // 1. Customers Table
    await safeCreateTable('고객 명단', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'phone', type: 'TEXT', notNull: true },
        { name: 'tags', type: 'TEXT' }, // Comma-separated tags or JSON
        { name: 'memo', type: 'TEXT' },
        { name: 'address', type: 'TEXT' },
        { name: 'shipping_address', type: 'TEXT' },
        { name: 'recipient_name', type: 'TEXT' },
        { name: 'recipient_phone', type: 'TEXT' },
        { name: 'point_balance', type: 'INTEGER' }, // 적립금 잔액 컬럼 추가
        { name: 'created_at', type: 'TEXT' },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_customers', uniqueKeyColumns: ['id'] });
    // 2. Message Templates Table
    await safeCreateTable('문자 템플릿', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'title', type: 'TEXT', notNull: true },
        { name: 'content', type: 'TEXT', notNull: true },
    ], { tableName: 'message_templates', uniqueKeyColumns: ['id'] });
    // 3. Message Logs Table
    await safeCreateTable('발송 내역', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'customer_id', type: 'INTEGER' }, // Nullable for ad-hoc messages
        { name: 'phone', type: 'TEXT', notNull: true },
        { name: 'message', type: 'TEXT', notNull: true },
        { name: 'status', type: 'TEXT', notNull: true }, // SUCCESS, FAILED
        { name: 'created_at', type: 'TEXT', notNull: true },
    ], { tableName: 'message_logs', uniqueKeyColumns: ['id'] });
    // 4. Ad Templates Table
    await safeCreateTable('광고 템플릿', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'header', type: 'TEXT', notNull: true },
        { name: 'footer', type: 'TEXT', notNull: true },
        { name: 'opt_out', type: 'TEXT', notNull: true },
    ], { tableName: 'ad_templates', uniqueKeyColumns: ['id'] });
    // 5. Products Table
    await safeCreateTable('광고 상품', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'price', type: 'TEXT' },
        { name: 'url', type: 'TEXT' },
        { name: 'description', type: 'TEXT' },
        { name: 'main_image_url', type: 'TEXT' },
        { name: 'detail_image_url', type: 'TEXT' },
        { name: 'available_methods', type: 'TEXT' },
        { name: 'category', type: 'TEXT' },
        { name: 'menu_category', type: 'TEXT' },
        { name: 'is_coupon_excludable', type: 'INTEGER' },
        { name: 'is_estimate_price', type: 'INTEGER', defaultValue: 0 },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'products', uniqueKeyColumns: ['id'], duplicateAction: 'update' });
    // 6. Transactions Table
    await safeCreateTable('거래 내역', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'customer_name', type: 'TEXT', notNull: true },
        { name: 'customer_phone', type: 'TEXT', notNull: true },
        { name: 'product_name', type: 'TEXT', notNull: true },
        { name: 'amount', type: 'TEXT' },
        { name: 'order_date', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'order_id', type: 'TEXT' },
    ], { tableName: 'crm_transactions', uniqueKeyColumns: ['id'] });
    // 7. Orders Table
    await safeCreateTable('주문 내역', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'customer_name', type: 'TEXT', notNull: true },
        { name: 'customer_phone', type: 'TEXT', notNull: true },
        { name: 'product_name', type: 'TEXT', notNull: true },
        { name: 'quantity', type: 'TEXT' },
        { name: 'total_price', type: 'TEXT' },
        { name: 'delivery_method', type: 'TEXT' },
        { name: 'shipping_address', type: 'TEXT' },
        { name: 'tracking_number', type: 'TEXT' },
        { name: 'attachment_url', type: 'TEXT' },
        { name: 'customer_memo', type: 'TEXT' },
        { name: 'order_date', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_orders', uniqueKeyColumns: ['id'], duplicateAction: 'update' });
    // 8. Payments Table
    await safeCreateTable('결제 내역', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'customer_name', type: 'TEXT', notNull: true },
        { name: 'payment_method', type: 'TEXT', notNull: true },
        { name: 'amount', type: 'TEXT', notNull: true },
        { name: 'payment_date', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'order_id', type: 'TEXT' },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_payments', uniqueKeyColumns: ['id'] });
    // 9. Reservations Table
    await safeCreateTable('예약 내역', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'customer_name', type: 'TEXT', notNull: true },
        { name: 'customer_phone', type: 'TEXT', notNull: true },
        { name: 'service_name', type: 'TEXT', notNull: true },
        { name: 'reservation_date', type: 'TEXT' },
        { name: 'reservation_time', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_reservations', uniqueKeyColumns: ['id'] });
    // 10. Deliveries Table
    await safeCreateTable('배송 내역', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'customer_name', type: 'TEXT', notNull: true },
        { name: 'customer_phone', type: 'TEXT', notNull: true },
        { name: 'address', type: 'TEXT', notNull: true },
        { name: 'courier', type: 'TEXT' },
        { name: 'tracking_number', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'order_id', type: 'TEXT' },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_deliveries', uniqueKeyColumns: ['id'] });
    // 11. System Settings Table
    await safeCreateTable('시스템 설정', [
        { name: 'key', type: 'TEXT', notNull: true },
        { name: 'value', type: 'TEXT', notNull: true }
    ], { tableName: 'system_settings', uniqueKeyColumns: ['key'] });
    // 12. CRM Operators Table
    await safeCreateTable('운영자 권한 관리', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'username', type: 'TEXT', notNull: true },
        { name: 'password_hash', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'role', type: 'TEXT', notNull: true }, // 'SUPER_ADMIN' or 'SUB_OPERATOR'
        { name: 'created_at', type: 'TEXT' },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_operators', uniqueKeyColumns: ['username'] });
    // 13. Instagram Posts Table
    await safeCreateTable('인스타그램 포스팅 이력 및 예약', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'product_id', type: 'TEXT' },
        { name: 'status', type: 'TEXT', notNull: true }, // DRAFT, SCHEDULED, POSTED, FAILED
        { name: 'content', type: 'TEXT' },
        { name: 'image_url', type: 'TEXT' },
        { name: 'scheduled_at', type: 'TEXT' },
        { name: 'posted_at', type: 'TEXT' },
        { name: 'error_message', type: 'TEXT' },
        { name: 'likes_count', type: 'INTEGER' },
        { name: 'comments_count', type: 'INTEGER' }
    ], { tableName: 'crm_instagram_posts', uniqueKeyColumns: ['id'] });
    // 14. Instagram Settings Table
    await safeCreateTable('인스타그램 마케팅 설정', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'is_autopilot', type: 'INTEGER', notNull: true }, // 0: 수동, 1: 자동
        { name: 'autopilot_interval', type: 'TEXT' }, // DAILY, WEEKLY 등
        { name: 'autopilot_time', type: 'TEXT' }, // "10:00"
        { name: 'tone_style', type: 'TEXT' }, // 인플루언서형, 세련된형 등
        { name: 'instagram_username', type: 'TEXT' },
        { name: 'access_token', type: 'TEXT' }
    ], { tableName: 'instagram_marketing_settings', uniqueKeyColumns: ['id'] });
    // 15. Naver Blog Posts Table
    await safeCreateTable('네이버 블로그 포스팅 이력 및 예약', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'product_id', type: 'TEXT' },
        { name: 'status', type: 'TEXT', notNull: true }, // DRAFT, SCHEDULED, POSTED, FAILED
        { name: 'title', type: 'TEXT' },
        { name: 'content', type: 'TEXT' },
        { name: 'target_keywords', type: 'TEXT' },
        { name: 'image_url', type: 'TEXT' },
        { name: 'sub_image_url', type: 'TEXT' },
        { name: 'scheduled_at', type: 'TEXT' },
        { name: 'posted_at', type: 'TEXT' },
        { name: 'error_message', type: 'TEXT' },
        { name: 'views_count', type: 'INTEGER' },
        { name: 'likes_count', type: 'INTEGER' }
    ], { tableName: 'crm_naver_blog_posts', uniqueKeyColumns: ['id'] });
    // 16. Naver Blog Settings Table
    await safeCreateTable('네이버 블로그 마케팅 설정', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'is_autopilot', type: 'INTEGER', notNull: true }, // 0: 수동, 1: 자동
        { name: 'autopilot_interval', type: 'TEXT' }, // DAILY, WEEKLY 등
        { name: 'autopilot_time', type: 'TEXT' }, // "10:00"
        { name: 'tone_style', type: 'TEXT' }, // 정보제공형, 솔직리뷰형 등
        { name: 'naver_blog_id', type: 'TEXT' },
        { name: 'api_client_id', type: 'TEXT' },
        { name: 'api_client_secret', type: 'TEXT' }
    ], { tableName: 'naver_blog_marketing_settings', uniqueKeyColumns: ['id'] });
    // 17. Coupons Table (쿠폰 관리)
    await safeCreateTable('쿠폰 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'code', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'discount_type', type: 'TEXT', notNull: true }, // 'amount' or 'percent'
        { name: 'discount_value', type: 'INTEGER', notNull: true },
        { name: 'min_order_amount', type: 'INTEGER', notNull: true },
        { name: 'status', type: 'TEXT', notNull: true }, // 'active', 'used', 'expired' 등
        { name: 'expires_at', type: 'TEXT' }, // 'YYYY-MM-DD' 형식 (nullable, 지정 안 하면 무제한)
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'coupons', uniqueKeyColumns: ['id'] });
    // 18. Coupons Restrictions Table (쿠폰 상품/카테고리 제한 관리)
    await safeCreateTable('쿠폰 제한 관리', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'coupon_id', type: 'TEXT', notNull: true },
        { name: 'restriction_type', type: 'TEXT', notNull: true }, // 'INCLUDE' (허용), 'EXCLUDE' (제외)
        { name: 'target_type', type: 'TEXT', notNull: true }, // 'PRODUCT' (상품), 'CATEGORY' (카테고리)
        { name: 'target_value', type: 'TEXT', notNull: true }, // 제한 대상 값 (예: 상품 ID 또는 카테고리명)
        { name: 'created_at', type: 'TEXT', notNull: true },
    ], { tableName: 'crm_coupons_restrictions', uniqueKeyColumns: ['id'] });
    // 19. CRM Point History Table (적립금 내역 관리)
    await safeCreateTable('적립금 내역', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'customer_id', type: 'INTEGER', notNull: true },
        { name: 'transaction_type', type: 'TEXT', notNull: true }, // 'EARN'(적립), 'USE'(사용), 'CANCEL'(취소), 'ADMIN'(수동조정)
        { name: 'amount', type: 'INTEGER', notNull: true },
        { name: 'balance_after', type: 'INTEGER', notNull: true },
        { name: 'description', type: 'TEXT' },
        { name: 'related_entity_type', type: 'TEXT' }, // 'ORDER', 'PAYMENT', 'COUPON' 등
        { name: 'related_entity_id', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_point_history', uniqueKeyColumns: ['id'] });
    // 20. CRM Estimates Table (견적 관리)
    await safeCreateTable('견적서 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'type', type: 'TEXT', notNull: true }, // 'INBOUND' or 'OUTBOUND'
        { name: 'direction_status', type: 'TEXT' }, // 'REQUESTED', 'DRAFT', 'SENT', 'RECEIVED'
        { name: 'partner_name', type: 'TEXT', notNull: true },
        { name: 'partner_phone', type: 'TEXT' },
        { name: 'total_amount', type: 'INTEGER' },
        { name: 'file_url', type: 'TEXT' },
        { name: 'business_license_url', type: 'TEXT' }, // 첫 견적 요청 시 사업자등록증 첨부 파일 경로
        { name: 'ai_parsed', type: 'INTEGER', defaultValue: 0 },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_estimates', uniqueKeyColumns: ['id'] });
    // 21. CRM Estimate Items Table (견적 품목 관리)
    await safeCreateTable('견적서 품목 상세', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'estimate_id', type: 'TEXT', notNull: true },
        { name: 'product_id', type: 'TEXT' },
        { name: 'product_name', type: 'TEXT', notNull: true },
        { name: 'quantity', type: 'INTEGER', notNull: true },
        { name: 'unit_price', type: 'INTEGER', notNull: true },
        { name: 'amount', type: 'INTEGER', notNull: true }
    ], { tableName: 'crm_estimate_items', uniqueKeyColumns: ['id'] });
    // 22. CRM Purchase Orders Table (발주 관리)
    await safeCreateTable('발주서 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'estimate_id', type: 'TEXT' },
        { name: 'vendor_name', type: 'TEXT', notNull: true },
        { name: 'vendor_phone', type: 'TEXT' },
        { name: 'status', type: 'TEXT', notNull: true }, // 'PENDING_INBOUND', 'INBOUND_COMPLETED'
        { name: 'total_amount', type: 'INTEGER' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'completed_at', type: 'TEXT' }
    ], { tableName: 'crm_purchase_orders', uniqueKeyColumns: ['id'] });
    // 23. CRM Sales Orders Table (수주 관리)
    await safeCreateTable('수주서 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'estimate_id', type: 'TEXT' },
        { name: 'customer_name', type: 'TEXT', notNull: true },
        { name: 'customer_phone', type: 'TEXT' },
        { name: 'status', type: 'TEXT', notNull: true }, // 'REGISTERED', 'CONFIRMED'
        { name: 'total_amount', type: 'INTEGER' },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_sales_orders', uniqueKeyColumns: ['id'] });
    // 24. CRM Partners Table (B2B 거래처 관리)
    await safeCreateTable('거래처 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'type', type: 'TEXT', notNull: true }, // 'VENDOR' or 'BUYER'
        { name: 'company_name', type: 'TEXT', notNull: true },
        { name: 'business_number', type: 'TEXT' },
        { name: 'representative', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'manager_name', type: 'TEXT' },
        { name: 'manager_phone', type: 'TEXT' },
        { name: 'email', type: 'TEXT' },
        { name: 'address', type: 'TEXT' },
        { name: 'vip_level', type: 'TEXT', defaultValue: 'NORMAL' }, // 'NORMAL', 'VIP'
        { name: 'credit_limit', type: 'INTEGER', defaultValue: 0 },
        { name: 'business_license_url', type: 'TEXT' }, // 파트너의 공식 사업자등록증 첨부 파일 경로
        { name: 'memo', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_partners', uniqueKeyColumns: ['id'] });
    // 25. CRM SnapTasks Table (스냅태스크 관리)
    await safeCreateTable('스냅태스크 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'title', type: 'TEXT', notNull: true },
        { name: 'status', type: 'TEXT', defaultValue: 'ACTIVE' }, // 'ACTIVE', 'COMPLETED', 'ARCHIVED'
        { name: 'partner_id', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'updated_at', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_snaptasks', uniqueKeyColumns: ['id'] });
    // 26. CRM SnapTask Items Table (스냅태스크 타임라인 상세)
    await safeCreateTable('스냅태스크 상세 내역', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'task_id', type: 'TEXT', notNull: true },
        { name: 'content_text', type: 'TEXT' },
        { name: 'file_url', type: 'TEXT' },
        { name: 'file_type', type: 'TEXT', notNull: true }, // 'IMAGE', 'PDF', 'AUDIO', 'LINK', 'TEXT'
        { name: 'ai_analysis', type: 'TEXT' }, // AI 분석 정형 JSON 스트링
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_snaptask_items', uniqueKeyColumns: ['id'] });
    // 27. CRM SnapTask Actions Table (자율 액션 히스토리 감사록)
    await safeCreateTable('스냅태스크 AI 액션 감사록', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'task_id', type: 'TEXT', notNull: true },
        { name: 'action_type', type: 'TEXT', notNull: true }, // 'PARTNER_REGISTER', 'ESTIMATE_DRAFT', 'ORDER_CONFIRM', 'SMS_SENT'
        { name: 'description', type: 'TEXT', notNull: true },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_snaptask_actions', uniqueKeyColumns: ['id'] });
    // 28. CRM Partner Contacts Table (B2B 담당자 명함첩 대장)
    await safeCreateTable('거래처 담당자 명함첩', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'partner_id', type: 'TEXT', notNull: true }, // crm_partners 외래키
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'position', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'email', type: 'TEXT' },
        { name: 'card_image_url', type: 'TEXT' },
        { name: 'is_primary', type: 'INTEGER', defaultValue: 0 }, // 1: 주대표 실무자, 0: 일반 실무자
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_partner_contacts', uniqueKeyColumns: ['id'] }); // 29. Inventory Items Table (재고 품목 대장)
    await safeCreateTable('재고 품목', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'type', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'category', type: 'TEXT', notNull: true },
        { name: 'price', type: 'REAL', notNull: true },
        { name: 'partner', type: 'TEXT' },
        { name: 'stock', type: 'INTEGER', notNull: true },
        { name: 'safeStock', type: 'INTEGER', notNull: true },
        { name: 'location', type: 'TEXT' },
        { name: 'spec', type: 'TEXT' },
        { name: 'unitType', type: 'TEXT' },
        { name: 'unitValue', type: 'TEXT' },
        { name: 'boxContains', type: 'INTEGER' },
        { name: 'description', type: 'TEXT' },
        { name: 'tags', type: 'TEXT' }, // 커스텀 멀티 태그 콤마 구분값
        { name: 'barcode', type: 'TEXT' }, // 바코드 번호 (USB 리더기/EAN-13 등 지원)
        { name: 'createdAt', type: 'TEXT', notNull: true },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'inventory_items', uniqueKeyColumns: ['id'] });
    // 29-1. Inventory Inbounds Table (자율 입고 대장)
    await safeCreateTable('자율 입고 대장', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'partner_name', type: 'TEXT' },
        { name: 'inbound_date', type: 'TEXT', notNull: true },
        { name: 'total_amount', type: 'INTEGER', defaultValue: 0 },
        { name: 'pdf_file_path', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'updated_at', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_inventory_inbounds', uniqueKeyColumns: ['id'] });
    // 29-2. Inventory Inbound Items Table (자율 입고 상세 품목)
    await safeCreateTable('자율 입고 상세 품목', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'inbound_id', type: 'TEXT', notNull: true },
        { name: 'item_name', type: 'TEXT', notNull: true },
        { name: 'spec', type: 'TEXT' },
        { name: 'quantity', type: 'INTEGER', notNull: true },
        { name: 'price', type: 'INTEGER', defaultValue: 0 },
        { name: 'barcode', type: 'TEXT' },
        { name: 'matched_item_id', type: 'INTEGER' }, // null 이면 신규 품목 등록 대상
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_inventory_inbound_items', uniqueKeyColumns: ['id'] });
    // 30. AI Token Usage Logs Table (AI 토큰 소모량 정밀 모니터링 로그 대장)
    await safeCreateTable('AI 토큰 사용량 로그', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'model', type: 'TEXT', notNull: true },
        { name: 'purpose', type: 'TEXT', notNull: true },
        { name: 'prompt_tokens', type: 'INTEGER', notNull: true },
        { name: 'completion_tokens', type: 'INTEGER', notNull: true },
        { name: 'total_tokens', type: 'INTEGER', notNull: true },
        { name: 'user_name', type: 'TEXT' },
        { name: 'menu_path', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'ai_token_usage_logs', uniqueKeyColumns: ['id'] });
    // 31. 추적 품목 마스터 테이블 (원자재 / 경쟁 제품 분류 및 마진 관리)
    await safeCreateTable('가격 추적 품목', [
        { name: 'item_id', type: 'INTEGER', notNull: true },
        { name: 'item_code', type: 'TEXT', notNull: true },
        { name: 'item_name', type: 'TEXT', notNull: true },
        { name: 'category', type: 'TEXT', notNull: true }, // RAW_MATERIAL, COMPETITOR_PRODUCT
        { name: 'spec', type: 'TEXT' }, // 상세 규격 정보 (용량, 수량 등)
        { name: 'base_price', type: 'REAL', notNull: true },
        { name: 'target_margin_rate', type: 'REAL', notNull: true },
        { name: 'created_at', type: 'TEXT' }
    ], { tableName: 'tracked_items', uniqueKeyColumns: ['item_id'] });
    // 32. 감시 대상 URL 및 수집 룰 관리 테이블
    await safeCreateTable('가격 감시 URL', [
        { name: 'url_id', type: 'INTEGER', notNull: true },
        { name: 'item_id', type: 'INTEGER', notNull: true },
        { name: 'site_name', type: 'TEXT', notNull: true },
        { name: 'target_url', type: 'TEXT', notNull: true },
        { name: 'css_selector', type: 'TEXT', notNull: true },
        { name: 'xpath', type: 'TEXT' },
        { name: 'cron_interval', type: 'TEXT', notNull: true }, // '0 9 * * *' 등
        { name: 'is_active', type: 'INTEGER', notNull: true }, // 1: Active, 0: Inactive
        { name: 'created_at', type: 'TEXT' }
    ], { tableName: 'target_urls', uniqueKeyColumns: ['url_id'] });
    // 33. 수집 가격 이력 기록 테이블 (차트용 시세 추이 소스)
    await safeCreateTable('수집 가격 이력', [
        { name: 'history_id', type: 'INTEGER', notNull: true },
        { name: 'url_id', type: 'INTEGER', notNull: true },
        { name: 'captured_price', type: 'REAL', notNull: true },
        { name: 'captured_at', type: 'TEXT', notNull: true },
        { name: 'status', type: 'TEXT', notNull: true }, // SUCCESS, FAILED
        { name: 'error_message', type: 'TEXT' }
    ], { tableName: 'price_histories', uniqueKeyColumns: ['history_id'] });
    // 34. FreeSMS 알림 조건 및 템플릿 설정 테이블
    await safeCreateTable('가격 알림 규칙', [
        { name: 'rule_id', type: 'INTEGER', notNull: true },
        { name: 'item_id', type: 'INTEGER', notNull: true },
        { name: 'rule_name', type: 'TEXT', notNull: true },
        { name: 'condition_type', type: 'TEXT', notNull: true }, // ABOVE_LIMIT, BELOW_LIMIT, MARGIN_BREAKDOWN
        { name: 'threshold_value', type: 'REAL', notNull: true },
        { name: 'phone_number', type: 'TEXT', notNull: true },
        { name: 'sms_template', type: 'TEXT', notNull: true },
        { name: 'is_enabled', type: 'INTEGER', notNull: true } // 1: 활성, 0: 비활성
    ], { tableName: 'alert_rules', uniqueKeyColumns: ['rule_id'] });
    // 35. 알림 발송 이력 로그 테이블
    await safeCreateTable('가격 알림 발송 로그', [
        { name: 'log_id', type: 'INTEGER', notNull: true },
        { name: 'rule_id', type: 'INTEGER', notNull: true },
        { name: 'sent_price', type: 'REAL', notNull: true },
        { name: 'sent_message', type: 'TEXT', notNull: true },
        { name: 'sent_at', type: 'TEXT', notNull: true },
        { name: 'api_response', type: 'TEXT' }
    ], { tableName: 'alert_logs', uniqueKeyColumns: ['log_id'] });
    // 36. Inventory Logs Table (재고 변동 이력 감사록)
    await safeCreateTable('재고 변동 이력', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'itemId', type: 'INTEGER', notNull: true },
        { name: 'itemName', type: 'TEXT', notNull: true },
        { name: 'itemType', type: 'TEXT', notNull: true },
        { name: 'changeType', type: 'TEXT', notNull: true },
        { name: 'quantity', type: 'INTEGER', notNull: true },
        { name: 'price', type: 'REAL', notNull: true },
        { name: 'operator', type: 'TEXT', notNull: true },
        { name: 'note', type: 'TEXT' },
        { name: 'createdAt', type: 'TEXT', notNull: true }
    ], { tableName: 'inventory_logs', uniqueKeyColumns: ['id'] });
    // 37. CRM Expenses Table (지출 내역 대장)
    await safeCreateTable('지출 내역', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'title', type: 'TEXT', notNull: true },
        { name: 'category', type: 'TEXT', notNull: true },
        { name: 'amount', type: 'INTEGER', notNull: true },
        { name: 'expense_date', type: 'TEXT', notNull: true },
        { name: 'payment_method', type: 'TEXT', notNull: true },
        { name: 'attachment_url', type: 'TEXT' },
        { name: 'ai_analysis', type: 'TEXT' },
        { name: 'memo', type: 'TEXT' },
        { name: 'approval_status', type: 'TEXT', defaultValue: 'PENDING' },
        { name: 'approval_memo', type: 'TEXT' },
        { name: 'approved_at', type: 'TEXT' },
        { name: 'actual_expense_date', type: 'TEXT' },
        { name: 'deduction_amount', type: 'INTEGER', defaultValue: 0 },
        { name: 'transfer_fee', type: 'INTEGER', defaultValue: 0 },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_expenses', uniqueKeyColumns: ['id'] });
    // 38. Expense Settings Table (지출 예산 경보 설정)
    await safeCreateTable('지출 예산 설정', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'monthly_budget', type: 'INTEGER', notNull: true },
        { name: 'is_alert_enabled', type: 'INTEGER', notNull: true },
        { name: 'alert_threshold_percent', type: 'INTEGER', notNull: true },
        { name: 'alert_sms_template', type: 'TEXT', notNull: true },
        { name: 'alert_phone', type: 'TEXT', notNull: true },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'expense_settings', uniqueKeyColumns: ['id'] });
    // ID 1의 기본 네이버 블로그 설정 존재 여부 확인 후 자동 주입
    try {
        const naverSettingsCheck = await (0, egdesk_helpers_1.queryTable)('naver_blog_marketing_settings', { filters: { id: '1' } });
        if (!naverSettingsCheck.rows || naverSettingsCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('naver_blog_marketing_settings', [{
                    id: 1,
                    is_autopilot: 0,
                    autopilot_interval: 'DAILY',
                    autopilot_time: '10:00',
                    tone_style: '정보제공형',
                    naver_blog_id: '',
                    api_client_id: '',
                    api_client_secret: ''
                }]);
            console.log('Dummy Naver Blog settings seeded.');
        }
    }
    catch (e) {
        console.error('Error seeding naver blog settings:', e.message);
    }
    // ID 1의 기본 설정 존재 여부 확인 후 자동 주입
    try {
        const settingsCheck = await (0, egdesk_helpers_1.queryTable)('instagram_marketing_settings', { filters: { id: '1' } });
        if (!settingsCheck.rows || settingsCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('instagram_marketing_settings', [{
                    id: 1,
                    is_autopilot: 0,
                    autopilot_interval: 'DAILY',
                    autopilot_time: '10:00',
                    tone_style: '인플루언서형',
                    instagram_username: '',
                    access_token: ''
                }]);
            console.log('Dummy Instagram settings seeded.');
        }
        else {
            // 기존 데이터가 존재하지만 계정이 이전 임시 데모 ID 'charismagreat'인 경우 안전하게 빈 값으로 초기화(마이그레이션)
            const current = settingsCheck.rows[0];
            if (current.instagram_username === 'charismagreat') {
                await (0, egdesk_helpers_1.updateRows)('instagram_marketing_settings', {
                    instagram_username: '',
                    access_token: ''
                }, { filters: { id: '1' } });
                console.log('Migrated legacy dummy instagram account settings to empty strings.');
            }
        }
    }
    catch (e) {
        console.error('Error seeding/migrating instagram settings:', e.message);
    }
    // 기존 더미 데이터 및 가짜 포스팅 이력 완전히 비우기 (실제 데이터만 남도록 초기화)
    try {
        const postsCheck = await (0, egdesk_helpers_1.queryTable)('crm_instagram_posts', {});
        const posts = postsCheck.rows || [];
        if (posts.length > 0) {
            const ids = posts.map((post) => Number(post.id));
            await (0, egdesk_helpers_1.deleteRows)('crm_instagram_posts', { ids });
            console.log('Cleared all instagram dummy posts successfully.');
        }
        else {
            console.log('No posts to clear.');
        }
    }
    catch (e) {
        console.error('Error clearing instagram dummy posts:', e.message);
    }
    // 포인트 적립 비율 기본 설정 (point_earning_rate: '1') 자동 주입
    try {
        const rateCheck = await (0, egdesk_helpers_1.queryTable)('system_settings', { filters: { key: 'point_earning_rate' } });
        if (!rateCheck.rows || rateCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('system_settings', [{
                    key: 'point_earning_rate',
                    value: '1'
                }]);
            console.log('Point earning rate seeded with default value: 1%');
        }
    }
    catch (e) {
        console.error('Error seeding point earning rate setting:', e.message);
    }
    // 가격 추적 AI 기초 더미 데이터 및 시세 이력 시딩(Seeding)
    try {
        const itemsCheck = await (0, egdesk_helpers_1.queryTable)('tracked_items', {});
        if (!itemsCheck.rows || itemsCheck.rows.length === 0) {
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            // 1. 구리 품목 시딩
            await (0, egdesk_helpers_1.insertRows)('tracked_items', [{
                    item_id: 1,
                    item_code: 'RAW-COPPER-01',
                    item_name: '런던금속거래소(LME) 구리 전기동',
                    category: 'RAW_MATERIAL',
                    base_price: 8200.00,
                    target_margin_rate: 12.50,
                    created_at: nowStr
                }]);
            // 2. 구리 URL 시딩
            await (0, egdesk_helpers_1.insertRows)('target_urls', [{
                    url_id: 1,
                    item_id: 1,
                    site_name: 'LME 구리 시세 페이지',
                    target_url: 'https://www.lme.com/en/Metals/Non-ferrous/Copper',
                    css_selector: 'div.price-table__current-price > span',
                    cron_interval: '0 9 * * *',
                    is_active: 1,
                    created_at: nowStr
                }]);
            // 3. 최근 10일 가격 데이터 시딩 (SVG 차트 실시간 렌더링용)
            const mockPrices = [8150, 8220, 8180, 8310, 8450, 8580, 8620, 8500, 8420, 8850];
            for (let index = 0; index < mockPrices.length; index++) {
                const dateOffset = new Date(Date.now() + 9 * 60 * 60 * 1000 - (10 - index) * 24 * 60 * 60 * 1000);
                const dateStr = dateOffset.toISOString().replace('T', ' ').slice(0, 19);
                await (0, egdesk_helpers_1.insertRows)('price_histories', [{
                        history_id: index + 1,
                        url_id: 1,
                        captured_price: mockPrices[index],
                        captured_at: dateStr,
                        status: 'SUCCESS'
                    }]);
            }
            // 4. 알림 조건 규칙 시딩
            await (0, egdesk_helpers_1.insertRows)('alert_rules', [{
                    rule_id: 1,
                    item_id: 1,
                    rule_name: '구리 가격 10% 폭등 및 마진 붕괴 경보',
                    condition_type: 'MARGIN_BREAKDOWN',
                    threshold_value: 5.00,
                    phone_number: '010-1234-5678',
                    sms_template: '[🚨가격경보] {item_name} 마진 붕괴! 현재가:{captured_price} USD',
                    is_enabled: 1
                }]);
            console.log('Price Tracker AI dummy seed data successfully generated.');
        }
    }
    catch (e) {
        console.error('Error seeding Price Tracker AI data:', e.message);
    }
    // 39. 지출 관리 AI 기본 설정 및 더미 내역 시딩
    try {
        const settingsCheck = await (0, egdesk_helpers_1.queryTable)('expense_settings', { filters: { id: '1' } });
        if (!settingsCheck.rows || settingsCheck.rows.length === 0) {
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            await (0, egdesk_helpers_1.insertRows)('expense_settings', [{
                    id: 1,
                    monthly_budget: 3000000,
                    is_alert_enabled: 1,
                    alert_threshold_percent: 90,
                    alert_sms_template: '[🚨지출AI] 예산 {경보임계율}% 도달! 누적 {누적지출}원 (한도 {월예산}원)',
                    alert_phone: '010-1234-5678',
                    created_at: nowStr
                }]);
            console.log('Expense settings seeded with default budget: 3,000,000 KRW');
        }
    }
    catch (e) {
        console.error('Error seeding expense settings:', e.message);
    }
    try {
        const expensesCheck = await (0, egdesk_helpers_1.queryTable)('crm_expenses', {});
        if (!expensesCheck.rows || expensesCheck.rows.length === 0) {
            const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
            const nowStr = now.toISOString().replace('T', ' ').slice(0, 19);
            const getPastDateStr = (daysAgo) => {
                const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
                return d.toISOString().slice(0, 10);
            };
            const seedExpenses = [
                {
                    id: 'exp-01',
                    title: '직원 주말 특근 식대 (야식)',
                    category: '복리후생비',
                    amount: 85000,
                    expense_date: getPastDateStr(2),
                    payment_method: '법인카드',
                    attachment_url: '',
                    ai_analysis: JSON.stringify({ parsed: true, confidence: 0.98 }),
                    memo: '복지지원, 소액결제',
                    approval_status: 'PENDING',
                    approved_at: null,
                    actual_expense_date: null,
                    deduction_amount: 0,
                    transfer_fee: 0,
                    created_at: nowStr
                },
                {
                    id: 'exp-02',
                    title: 'AWS 서버 호스팅 사용료 (5월분)',
                    category: '소모품비',
                    amount: 320000,
                    expense_date: getPastDateStr(5),
                    payment_method: '계좌이체',
                    attachment_url: '',
                    ai_analysis: JSON.stringify({ parsed: true, confidence: 0.99 }),
                    memo: '인프라유지, 정기지출',
                    approval_status: 'PENDING',
                    approved_at: null,
                    actual_expense_date: null,
                    deduction_amount: 0,
                    transfer_fee: 0,
                    created_at: nowStr
                },
                {
                    id: 'exp-03',
                    title: '바이어 미팅 다과 및 커피 구매',
                    category: '접대비',
                    amount: 42000,
                    expense_date: getPastDateStr(10),
                    payment_method: '법인카드',
                    attachment_url: '',
                    ai_analysis: JSON.stringify({ parsed: true, confidence: 0.95 }),
                    memo: '거래처접대, 소액결제',
                    approval_status: 'PENDING',
                    approved_at: null,
                    actual_expense_date: null,
                    deduction_amount: 0,
                    transfer_fee: 0,
                    created_at: nowStr
                },
                {
                    id: 'exp-04',
                    title: '지방 출장 KTX 왕복 운임',
                    category: '여비교통비',
                    amount: 114000,
                    expense_date: getPastDateStr(15),
                    payment_method: '법인카드',
                    attachment_url: '',
                    ai_analysis: JSON.stringify({ parsed: true, confidence: 0.97 }),
                    memo: '정기지출, 긴급비용',
                    approval_status: 'PENDING',
                    approved_at: null,
                    actual_expense_date: null,
                    deduction_amount: 0,
                    transfer_fee: 0,
                    created_at: nowStr
                },
                {
                    id: 'exp-05',
                    title: '사무실 복사지 및 필기구 소모품 구입',
                    category: '소모품비',
                    amount: 58000,
                    expense_date: getPastDateStr(20),
                    payment_method: '현금영수증',
                    attachment_url: '',
                    ai_analysis: JSON.stringify({ parsed: true, confidence: 0.96 }),
                    memo: '비품구매, 소액결제',
                    approval_status: 'PENDING',
                    approved_at: null,
                    actual_expense_date: null,
                    deduction_amount: 0,
                    transfer_fee: 0,
                    created_at: nowStr
                }
            ];
            await (0, egdesk_helpers_1.insertRows)('crm_expenses', seedExpenses);
            console.log('Expense tracker mock seed data successfully generated.');
        }
    }
    catch (e) {
        console.error('Error seeding expenses data:', e.message);
    }
    // 39-1. 지출 계정과목 3단계 관리 테이블 신설
    await safeCreateTable('지출 계정과목 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'main_category', type: 'TEXT', notNull: true },
        { name: 'mid_category', type: 'TEXT', notNull: true },
        { name: 'sub_category', type: 'TEXT', notNull: true },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'expense_categories', uniqueKeyColumns: ['id'] });
    // 39-2. 지출 퀵 태그 프리셋/커스텀 관리 테이블 신설
    await safeCreateTable('통합 공통 태그 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'scope', type: 'TEXT', defaultValue: 'global' },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'expense_tags', uniqueKeyColumns: ['id'] });
    // 39-3. 계정과목 및 태그 기초 시딩
    try {
        const catsCheck = await (0, egdesk_helpers_1.queryTable)('expense_categories', {});
        // 강제 이식을 보장하기 위해 구식 카테고리 감지 시 자동으로 국세청 표준 65선으로 무손실 Overwrite 마이그레이션 가동
        if (!catsCheck.rows || catsCheck.rows.length < 40) {
            console.log('Detected outdated or partial expense categories. Upgrading to official National Tax Service standards...');
            // 기존 구식 데이터 영구 삭제 (ids를 명시하여 안전한 삭제 실행)
            const legacyIds = (catsCheck.rows || []).map((r) => r.id).filter(Boolean);
            if (legacyIds.length > 0) {
                await (0, egdesk_helpers_1.deleteRows)('expense_categories', { ids: legacyIds });
            }
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            const initialCategories = [
                // 판매비와관리비 - 급여
                { id: 'cat-01', main_category: '판매비와관리비', mid_category: '급여', sub_category: '직원급여', created_at: nowStr },
                { id: 'cat-02', main_category: '판매비와관리비', mid_category: '급여', sub_category: '상여금', created_at: nowStr },
                { id: 'cat-03', main_category: '판매비와관리비', mid_category: '급여', sub_category: '퇴직급여', created_at: nowStr },
                // 판매비와관리비 - 복리후생비
                { id: 'cat-04', main_category: '판매비와관리비', mid_category: '복리후생비', sub_category: '직원식대', created_at: nowStr },
                { id: 'cat-05', main_category: '판매비와관리비', mid_category: '복리후생비', sub_category: '직원야근식대', created_at: nowStr },
                { id: 'cat-06', main_category: '판매비와관리비', mid_category: '복리후생비', sub_category: '경조사비', created_at: nowStr },
                { id: 'cat-07', main_category: '판매비와관리비', mid_category: '복리후생비', sub_category: '음료및간식비', created_at: nowStr },
                { id: 'cat-08', main_category: '판매비와관리비', mid_category: '복리후생비', sub_category: '피복비', created_at: nowStr },
                { id: 'cat-09', main_category: '판매비와관리비', mid_category: '복리후생비', sub_category: '직원교육비', created_at: nowStr },
                { id: 'cat-10', main_category: '판매비와관리비', mid_category: '복리후생비', sub_category: '건강검진비', created_at: nowStr },
                // 판매비와관리비 - 여비교통비
                { id: 'cat-11', main_category: '판매비와관리비', mid_category: '여비교통비', sub_category: '시내교통비', created_at: nowStr },
                { id: 'cat-12', main_category: '판매비와관리비', mid_category: '여비교통비', sub_category: '택시비', created_at: nowStr },
                { id: 'cat-13', main_category: '판매비와관리비', mid_category: '여비교통비', sub_category: '유류비', created_at: nowStr },
                { id: 'cat-14', main_category: '판매비와관리비', mid_category: '여비교통비', sub_category: '톨게이트비', created_at: nowStr },
                { id: 'cat-15', main_category: '판매비와관리비', mid_category: '여비교통비', sub_category: '주차요금', created_at: nowStr },
                { id: 'cat-16', main_category: '판매비와관리비', mid_category: '여비교통비', sub_category: '출장숙박비', created_at: nowStr },
                { id: 'cat-17', main_category: '판매비와관리비', mid_category: '여비교통비', sub_category: 'KTX/항공료', created_at: nowStr },
                // 판매비와관리비 - 임차료
                { id: 'cat-18', main_category: '판매비와관리비', mid_category: '지급임차료', sub_category: '사무실임차료', created_at: nowStr },
                { id: 'cat-19', main_category: '판매비와관리비', mid_category: '지급임차료', sub_category: '기계장비임차료', created_at: nowStr },
                { id: 'cat-20', main_category: '판매비와관리비', mid_category: '지급임차료', sub_category: '대화실대관료', created_at: nowStr },
                // 판매비와관리비 - 통신비
                { id: 'cat-21', main_category: '판매비와관리비', mid_category: '통신비', sub_category: '전화요금', created_at: nowStr },
                { id: 'cat-22', main_category: '판매비와관리비', mid_category: '통신비', sub_category: '인터넷요금', created_at: nowStr },
                { id: 'cat-23', main_category: '판매비와관리비', mid_category: '통신비', sub_category: '우편송달료', created_at: nowStr },
                // 판매비와관리비 - 세금과공과
                { id: 'cat-24', main_category: '판매비와관리비', mid_category: '세금과공과', sub_category: '지방세/재산세', created_at: nowStr },
                { id: 'cat-25', main_category: '판매비와관리비', mid_category: '세금과공과', sub_category: '자동차세', created_at: nowStr },
                { id: 'cat-26', main_category: '판매비와관리비', mid_category: '세금과공과', sub_category: '협회비', created_at: nowStr },
                { id: 'cat-27', main_category: '판매비와관리비', mid_category: '세금과공과', sub_category: '공과금', created_at: nowStr },
                // 판매비와관리비 - 소모품비
                { id: 'cat-28', main_category: '판매비와관리비', mid_category: '소모품비', sub_category: '사무용품비', created_at: nowStr },
                { id: 'cat-29', main_category: '판매비와관리비', mid_category: '소모품비', sub_category: '사무비품비', created_at: nowStr },
                { id: 'cat-30', main_category: '판매비와관리비', mid_category: '소모품비', sub_category: '전산소모품비', created_at: nowStr },
                // 판매비와관리비 - 접대비
                { id: 'cat-31', main_category: '판매비와관리비', mid_category: '접대비(기업업무추진비)', sub_category: '거래처식사비', created_at: nowStr },
                { id: 'cat-32', main_category: '판매비와관리비', mid_category: '접대비(기업업무추진비)', sub_category: '거래처선물비', created_at: nowStr },
                { id: 'cat-33', main_category: '판매비와관리비', mid_category: '접대비(기업업무추진비)', sub_category: '거래처경조사비', created_at: nowStr },
                // 판매비와관리비 - 도서인쇄비
                { id: 'cat-34', main_category: '판매비와관리비', mid_category: '도서인쇄비', sub_category: '도서구입비', created_at: nowStr },
                { id: 'cat-35', main_category: '판매비와관리비', mid_category: '도서인쇄비', sub_category: '인쇄물제작비', created_at: nowStr },
                { id: 'cat-36', main_category: '판매비와관리비', mid_category: '도서인쇄비', sub_category: '명함제작비', created_at: nowStr },
                // 판매비와관리비 - 차량유지비
                { id: 'cat-37', main_category: '판매비와관리비', mid_category: '차량유지비', sub_category: '차량수리비', created_at: nowStr },
                { id: 'cat-38', main_category: '판매비와관리비', mid_category: '차량유지비', sub_category: '유류비', created_at: nowStr },
                { id: 'cat-39', main_category: '판매비와관리비', mid_category: '차량유지비', sub_category: '차량보험료', created_at: nowStr },
                // 판매비와관리비 - 광고선전비
                { id: 'cat-40', main_category: '판매비와관리비', mid_category: '광고선전비', sub_category: '온라인광고비', created_at: nowStr },
                { id: 'cat-41', main_category: '판매비와관리비', mid_category: '광고선전비', sub_category: '홍보물제작비', created_at: nowStr },
                { id: 'cat-42', main_category: '판매비와관리비', mid_category: '광고선전비', sub_category: 'SNS마케팅비', created_at: nowStr },
                // 판매비와관리비 - 지급수수료
                { id: 'cat-43', main_category: '판매비와관리비', mid_category: '지급수수료', sub_category: '세무기장수수료', created_at: nowStr },
                { id: 'cat-44', main_category: '판매비와관리비', mid_category: '지급수수료', sub_category: '은행이체수수료', created_at: nowStr },
                { id: 'cat-45', main_category: '판매비와관리비', mid_category: '지급수수료', sub_category: '카드가맹점수수료', created_at: nowStr },
                { id: 'cat-46', main_category: '판매비와관리비', mid_category: '지급수수료', sub_category: '특허대행수수료', created_at: nowStr },
                // 제조/물류원가 - 외주가공비
                { id: 'cat-47', main_category: '제조/물류원가', mid_category: '외주가공비', sub_category: '임가공외주비', created_at: nowStr },
                { id: 'cat-48', main_category: '제조/물류원가', mid_category: '외주가공비', sub_category: '소프트웨어외주비', created_at: nowStr },
                { id: 'cat-49', main_category: '제조/물류원가', mid_category: '외주가공비', sub_category: '용역비', created_at: nowStr },
                // 제조/물류원가 - 운반비
                { id: 'cat-50', main_category: '제조/물류원가', mid_category: '운반비', sub_category: '택배배송비', created_at: nowStr },
                { id: 'cat-51', main_category: '제조/물류원가', mid_category: '운반비', sub_category: '퀵서비스비', created_at: nowStr },
                { id: 'cat-52', main_category: '제조/물류원가', mid_category: '운반비', sub_category: '화물운송료', created_at: nowStr },
                // 제조/물류원가 - 포장비
                { id: 'cat-53', main_category: '제조/물류원가', mid_category: '포장비', sub_category: '박스구매비', created_at: nowStr },
                { id: 'cat-54', main_category: '제조/물류원가', mid_category: '포장비', sub_category: '박스테이프비', created_at: nowStr },
                { id: 'cat-55', main_category: '제조/물류원가', mid_category: '포장비', sub_category: '완충재구매비', created_at: nowStr },
                // 제조/물류원가 - 원재료비
                { id: 'cat-56', main_category: '제조/물류원가', mid_category: '원재료비', sub_category: '원자재구매비', created_at: nowStr },
                { id: 'cat-57', main_category: '제조/물류원가', mid_category: '원재료비', sub_category: '수입원료대금', created_at: nowStr },
                // 제조/물류원가 - 부재료비
                { id: 'cat-58', main_category: '제조/물류원가', mid_category: '부재료비', sub_category: '부품구매비', created_at: nowStr },
                { id: 'cat-59', main_category: '제조/물류원가', mid_category: '부재료비', sub_category: '부자재구매비', created_at: nowStr },
                // 영업외비용 - 이자비용
                { id: 'cat-60', main_category: '영업외비용', mid_category: '이자비용', sub_category: '은행대출이자', created_at: nowStr },
                { id: 'cat-61', main_category: '영업외비용', mid_category: '이자비용', sub_category: '보증금이자', created_at: nowStr },
                // 영업외비용 - 기부금
                { id: 'cat-62', main_category: '영업외비용', mid_category: '기부금', sub_category: '법정기부금', created_at: nowStr },
                { id: 'cat-63', main_category: '영업외비용', mid_category: '기부금', sub_category: '지정기부금', created_at: nowStr },
                // 영업외비용 - 잡손실
                { id: 'cat-64', main_category: '영업외비용', mid_category: '잡손실', sub_category: '잡손실', created_at: nowStr },
                { id: 'cat-65', main_category: '영업외비용', mid_category: '잡손실', sub_category: '소액차손', created_at: nowStr }
            ];
            await (0, egdesk_helpers_1.insertRows)('expense_categories', initialCategories);
            console.log('Expense categories successfully upgraded to National Tax Service standards.');
        }
    }
    catch (e) {
        console.error('Error seeding expense categories:', e.message);
    }
    try {
        const tagsCheck = await (0, egdesk_helpers_1.queryTable)('expense_tags', {});
        if (!tagsCheck.rows || tagsCheck.rows.length === 0) {
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            const initialTags = [
                { id: 'tag-01', name: 'SCM팀', created_at: nowStr },
                { id: 'tag-02', name: '정기지출', created_at: nowStr },
                { id: 'tag-03', name: '긴급비용', created_at: nowStr },
                { id: 'tag-04', name: '벌크구매', created_at: nowStr },
                { id: 'tag-05', name: '거래처접대', created_at: nowStr },
                { id: 'tag-06', name: '복지지원', created_at: nowStr },
                { id: 'tag-07', name: '소액결제', created_at: nowStr },
                { id: 'tag-08', name: '인프라유지', created_at: nowStr },
                { id: 'tag-09', name: '비품구매', created_at: nowStr },
                { id: 'tag-10', name: '마케팅홍보', created_at: nowStr }
            ];
            await (0, egdesk_helpers_1.insertRows)('expense_tags', initialTags);
            console.log('Expense tags successfully seeded.');
        }
    }
    catch (e) {
        console.error('Error seeding expense tags:', e.message);
    }
    // 39-4. 사내 부서 관리 테이블 신설
    await safeCreateTable('지출 부서 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'expense_departments', uniqueKeyColumns: ['id'] });
    // 39-5. 사내 임직원 관리 테이블 신설
    await safeCreateTable('지출 임직원 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'expense_employees', uniqueKeyColumns: ['id'] });
    // 39-6. 수행 프로젝트 관리 테이블 신설
    await safeCreateTable('지출 프로젝트 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'expense_projects', uniqueKeyColumns: ['id'] });
    // 39-7. 부서, 직원, 프로젝트 기초 시딩
    try {
        const deptsCheck = await (0, egdesk_helpers_1.queryTable)('expense_departments', {});
        if (!deptsCheck.rows || deptsCheck.rows.length === 0) {
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            const initialDepts = [
                { id: 'dept-01', name: '경영지원팀', created_at: nowStr },
                { id: 'dept-02', name: 'SCM팀', created_at: nowStr },
                { id: 'dept-03', name: '물류운송부', created_at: nowStr },
                { id: 'dept-04', name: '기술개발부', created_at: nowStr },
                { id: 'dept-05', name: '영업본부', created_at: nowStr },
                { id: 'dept-06', name: '인사총무부', created_at: nowStr },
                { id: 'dept-07', name: '기획디자인팀', created_at: nowStr },
                { id: 'dept-08', name: '마케팅홍보팀', created_at: nowStr }
            ];
            await (0, egdesk_helpers_1.insertRows)('expense_departments', initialDepts);
            console.log('Expense departments seeded.');
        }
    }
    catch (e) {
        console.error('Error seeding departments:', e.message);
    }
    try {
        const empsCheck = await (0, egdesk_helpers_1.queryTable)('expense_employees', {});
        if (!empsCheck.rows || empsCheck.rows.length === 0) {
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            const initialEmps = [
                { id: 'emp-01', name: '김경리', created_at: nowStr },
                { id: 'emp-02', name: '홍길동', created_at: nowStr },
                { id: 'emp-03', name: '이철수', created_at: nowStr },
                { id: 'emp-04', name: '박영희', created_at: nowStr },
                { id: 'emp-05', name: '최민수', created_at: nowStr },
                { id: 'emp-06', name: '이영민', created_at: nowStr }
            ];
            await (0, egdesk_helpers_1.insertRows)('expense_employees', initialEmps);
            console.log('Expense employees seeded.');
        }
    }
    catch (e) {
        console.error('Error seeding employees:', e.message);
    }
    try {
        const projsCheck = await (0, egdesk_helpers_1.queryTable)('expense_projects', {});
        if (!projsCheck.rows || projsCheck.rows.length === 0) {
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            const initialProjs = [
                { id: 'proj-01', name: 'FreeSMS 서비스 고도화', created_at: nowStr },
                { id: 'proj-02', name: 'B2B 유통 플랫폼 개발', created_at: nowStr },
                { id: 'proj-03', name: 'SCM 자율 관제 시스템', created_at: nowStr },
                { id: 'proj-04', name: '오프라인 매장 POS 연동', created_at: nowStr },
                { id: 'proj-05', name: '고객 마일리지 부스터 프로젝트', created_at: nowStr }
            ];
            await (0, egdesk_helpers_1.insertRows)('expense_projects', initialProjs);
            console.log('Expense projects seeded.');
        }
    }
    catch (e) {
        console.error('Error seeding projects:', e.message);
    }
    // 40. Shared Dashboards Table (퍼블릭 대시보드 웹 공유 및 배치 자동 갱신)
    await safeCreateTable('공유 대시보드 관리', [
        { name: 'share_id', type: 'TEXT', notNull: true },
        { name: 'title', type: 'TEXT', notNull: true },
        { name: 'sql_query', type: 'TEXT', notNull: true },
        { name: 'table_name', type: 'TEXT' },
        { name: 'display_name', type: 'TEXT' },
        { name: 'chart_spec_json', type: 'TEXT' },
        { name: 'briefing_markdown', type: 'TEXT' },
        { name: 'refresh_interval', type: 'TEXT', defaultValue: 'NONE' },
        { name: 'last_refreshed_at', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'is_active', type: 'INTEGER', defaultValue: 1 },
        { name: 'sort_order', type: 'INTEGER', defaultValue: 0 },
        { name: 'is_pinned', type: 'INTEGER', defaultValue: 1 },
        { name: 'custom_title', type: 'TEXT' }
    ], { tableName: 'shared_dashboards', uniqueKeyColumns: ['share_id'] });
    // 41. System Menu Settings Table (사이드바 동적 메뉴 활성 및 순서 설정)
    await safeCreateTable('시스템 메뉴 설정', [
        { name: 'menu_href', type: 'TEXT', notNull: true },
        { name: 'is_enabled', type: 'INTEGER', notNull: true, defaultValue: 1 },
        { name: 'sort_order', type: 'INTEGER', notNull: true }
    ], { tableName: 'system_menu_settings', uniqueKeyColumns: ['menu_href'], duplicateAction: 'update' });
    // 41-2. AI Mail Control Logs Table (메일 AI 실시간 관제 및 분석 이력)
    await safeCreateTable('메일 AI 관제 로그', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'sender', type: 'TEXT', notNull: true },
        { name: 'subject', type: 'TEXT', notNull: true },
        { name: 'received_at', type: 'TEXT', notNull: true },
        { name: 'ai_summary', type: 'TEXT', notNull: true },
        { name: 'intent', type: 'TEXT', notNull: true },
        { name: 'risk_level', type: 'TEXT', notNull: true },
        { name: 'action_type', type: 'TEXT' },
        { name: 'action_result', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'system_mail_logs', uniqueKeyColumns: ['id'] });
    // 41-3. AI Contextual Help Table (도움말 캐싱용 컨텍스트)
    await safeCreateTable('AI 도움말 캐시', [
        { name: 'hint_key', type: 'TEXT', notNull: true },
        { name: 'hint_text', type: 'TEXT', notNull: true },
        { name: 'ai_explanation', type: 'TEXT', notNull: true },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'ai_contextual_help', uniqueKeyColumns: ['hint_key'] });
    // 41-4. 양식 템플릿 마스터 (form_templates)
    await safeCreateTable('양식 템플릿 마스터', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'template_name', type: 'TEXT', notNull: true },
        { name: 'document_type', type: 'TEXT', notNull: true },
        { name: 'file_path', type: 'TEXT', notNull: true },
        { name: 'orientation', type: 'TEXT', notNull: true },
        { name: 'is_active', type: 'INTEGER', notNull: true },
        { name: 'query_sql', type: 'TEXT' },
        { name: 'query_params', type: 'TEXT' },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'form_templates', uniqueKeyColumns: ['id'] });
    // 41-5. 양식 데이터 필드 매핑 (form_mappings)
    await safeCreateTable('양식 데이터 필드 매핑', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'template_id', type: 'INTEGER', notNull: true },
        { name: 'field_key', type: 'TEXT', notNull: true },
        { name: 'field_label', type: 'TEXT', notNull: true },
        { name: 'pos_x', type: 'REAL', notNull: true },
        { name: 'pos_y', type: 'REAL', notNull: true },
        { name: 'font_size', type: 'INTEGER' },
        { name: 'font_weight', type: 'TEXT' },
        { name: 'text_align', type: 'TEXT' },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'form_mappings', uniqueKeyColumns: ['id'] });
    // 42. Safety Policies Table (안전보건방침 및 목표 설정 대장)
    await safeCreateTable('안전보건방침 및 목표', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'year', type: 'TEXT', notNull: true },
        { name: 'policy_title', type: 'TEXT', notNull: true },
        { name: 'targets_json', type: 'TEXT', notNull: true },
        { name: 'established_at', type: 'TEXT', notNull: true },
        { name: 'established_by', type: 'TEXT', notNull: true }
    ], { tableName: 'safety_policies', uniqueKeyColumns: ['year'], duplicateAction: 'update' });
    // 43. Safety Risk Assessments Table (AI 위험성평가 수립 대장)
    await safeCreateTable('AI 위험성평가서', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'work_name', type: 'TEXT', notNull: true },
        { name: 'work_date', type: 'TEXT', notNull: true },
        { name: 'hazards_json', type: 'TEXT', notNull: true },
        { name: 'risk_level', type: 'TEXT', notNull: true },
        { name: 'evaluated_by', type: 'TEXT', notNull: true },
        { name: 'approved_at', type: 'TEXT' },
        { name: 'status', type: 'TEXT', defaultValue: 'DRAFT' }
    ], { tableName: 'safety_risk_assessments', uniqueKeyColumns: ['id'] });
    // 44. Safety TBM Logs Table (TBM 실시 일지 대장)
    await safeCreateTable('TBM 안전 교육 대장', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'tbm_date', type: 'TEXT', notNull: true },
        { name: 'work_leader', type: 'TEXT', notNull: true },
        { name: 'weather_info', type: 'TEXT' },
        { name: 'tbm_script', type: 'TEXT', notNull: true },
        { name: 'attendees_count', type: 'INTEGER', defaultValue: 0 },
        { name: 'attendee_signatures', type: 'TEXT', notNull: true },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'safety_tbm_logs', uniqueKeyColumns: ['id'] });
    // 45. Safety Near Misses Table (근로자 아차사고 및 유해요소 제보 대장)
    await safeCreateTable('아차사고 및 유해요소 제보 대장', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'reporter_name', type: 'TEXT', notNull: true },
        { name: 'hazard_location', type: 'TEXT', notNull: true },
        { name: 'description', type: 'TEXT', notNull: true },
        { name: 'photo_url', type: 'TEXT' },
        { name: 'risk_grade', type: 'TEXT', notNull: true },
        { name: 'action_status', type: 'TEXT', defaultValue: 'PENDING' },
        { name: 'action_description', type: 'TEXT' },
        { name: 'action_photo_url', type: 'TEXT' },
        { name: 'action_completed_at', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'safety_near_misses', uniqueKeyColumns: ['id'] });
    // 46. Safety Inspect Logs Table (안전점검 감사 대장)
    await safeCreateTable('안전점검 감사 대장', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'inspect_title', type: 'TEXT', notNull: true },
        { name: 'inspect_date', type: 'TEXT', notNull: true },
        { name: 'inspector_name', type: 'TEXT', notNull: true },
        { name: 'checklist_json', type: 'TEXT', notNull: true },
        { name: 'fail_actions_json', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'safety_inspect_logs', uniqueKeyColumns: ['id'] });
    // 안전 관리 AI 기초 시딩 데이터 자동 주입
    try {
        const policyCheck = await (0, egdesk_helpers_1.queryTable)('safety_policies', { filters: { year: '2026' } });
        if (!policyCheck.rows || policyCheck.rows.length === 0) {
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            // 1. 2026년 안전보건방침 시딩
            await (0, egdesk_helpers_1.insertRows)('safety_policies', [{
                    id: 1,
                    year: '2026',
                    policy_title: '인간존중을 실천하는 전사적 안전문화 정착',
                    targets_json: JSON.stringify([
                        '안전보건예산 적기 집행율 100% 달성',
                        '작업 전 TBM 100% 이행 및 QR 서명 정착',
                        '중대재해 Zero 실현 및 잠재위험요인 선제적 통제'
                    ]),
                    established_at: nowStr,
                    established_by: '김대표'
                }]);
            // 2. 위험성평가 사례 시딩
            await (0, egdesk_helpers_1.insertRows)('safety_risk_assessments', [{
                    id: 'risk-demo-01',
                    work_name: '3공장 배터리 조립라인 정기 정비 작업',
                    work_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                    hazards_json: JSON.stringify([
                        {
                            hazard: '설비 정비 중 예기치 않은 전원 재인입으로 인한 감전',
                            type: '감전',
                            measure: '정비 전 LOTO(Lock-Out, Tag-Out) 절차 수립 및 전원 차단 잠금장치 부착'
                        },
                        {
                            hazard: '조립설비 상부 윤활유 교체 시 미끄러짐으로 인한 낙하',
                            type: '추락',
                            measure: '안전모 및 안전대 착용 필수, 미끄럼 방지 안전화 교체 확인'
                        }
                    ]),
                    risk_level: '중',
                    evaluated_by: '김안전',
                    approved_at: nowStr,
                    status: 'APPROVED'
                }]);
            // 3. 오늘의 TBM 일지 시딩
            await (0, egdesk_helpers_1.insertRows)('safety_tbm_logs', [{
                    id: 'tbm-demo-01',
                    tbm_date: new Date(Date.now()).toISOString().slice(0, 10),
                    work_leader: '김안전',
                    weather_info: '맑음',
                    tbm_script: '동료 여러분 반갑습니다. 오늘 3공장 배터리 조립라인 정비 작업 전 안전회의를 시작합니다. 우선 정비 전에 LOTO 잠금 조치를 완벽히 이행했는지 전원 상태를 교차 검증해 주세요. 고소 작업 시에는 반드시 안전대 체결을 생활화하고 미끄럼 방지에 각별히 주의하시기 바랍니다. 오늘도 무재해 하루를 만들어 갑시다! 안전!',
                    attendees_count: 2,
                    attendee_signatures: JSON.stringify([
                        {
                            worker_name: '이철수',
                            signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACWAQMAAABC...',
                            signed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
                        },
                        {
                            worker_name: '박영희',
                            signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACWAQMAAABC...',
                            signed_at: new Date(Date.now() - 1.9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
                        }
                    ]),
                    created_at: nowStr
                }]);
            // 4. 아차사고 대기중인 건 시딩
            await (0, egdesk_helpers_1.insertRows)('safety_near_misses', [{
                    id: 'miss-demo-01',
                    reporter_name: '이철수',
                    hazard_location: '2공장 원자재 적재장 통로',
                    description: '지게차 이동 통로 바닥에 오일 누유 흔적이 넓게 퍼져 있어 보행 시 넘어질 뻔한 아차사고 발생. 방치 시 지게차 바퀴 미끄러짐 및 전도 우려됨.',
                    photo_url: '',
                    risk_grade: 'HIGH',
                    action_status: 'PENDING',
                    action_description: null,
                    action_photo_url: null,
                    action_completed_at: null,
                    created_at: nowStr
                }]);
            console.log('Safety management AI seed data generated successfully.');
        }
    }
    catch (e) {
        console.error('Error seeding Safety Management AI data:', e.message);
    }
    // 47. Financial Statements Table (재무제표 관리)
    await safeCreateTable('재무제표 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'company_id', type: 'TEXT', notNull: true },
        { name: 'company_type', type: 'TEXT', notNull: true },
        { name: 'fiscal_year', type: 'INTEGER', notNull: true },
        { name: 'fiscal_quarter', type: 'TEXT', notNull: true, defaultValue: 'YR' },
        { name: 'total_assets', type: 'INTEGER', defaultValue: 0 },
        { name: 'total_liabilities', type: 'INTEGER', defaultValue: 0 },
        { name: 'total_equity', type: 'INTEGER', defaultValue: 0 },
        { name: 'revenue', type: 'INTEGER', defaultValue: 0 },
        { name: 'operating_income', type: 'INTEGER', defaultValue: 0 },
        { name: 'net_income', type: 'INTEGER', defaultValue: 0 },
        { name: 'pdf_file_path', type: 'TEXT' },
        { name: 'parsed_raw_json', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'updated_at', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_financial_statements', uniqueKeyColumns: ['id'] });
    // 48. Recruitment Applicants Table (채용 지원자 관리)
    await safeCreateTable('채용 지원자 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'age', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'experience', type: 'TEXT' },
        { name: 'motivation', type: 'TEXT' },
        { name: 'matching_score', type: 'INTEGER', defaultValue: 0 },
        { name: 'status', type: 'TEXT', defaultValue: 'applied' },
        { name: 'signature_url', type: 'TEXT' },
        { name: 'signed_at', type: 'TEXT' },
        { name: 'resume_file_path', type: 'TEXT' },
        { name: 'tech_stacks', type: 'TEXT' },
        { name: 'interview_logs', type: 'TEXT' },
        { name: 'ai_evaluation', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_recruitment_applicants', uniqueKeyColumns: ['id'] });
    // 49. crm_grant_announcements Table (정부 지원금 추천 공고)
    await safeCreateTable('정부 지원금 추천 공고', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'title', type: 'TEXT', notNull: true },
        { name: 'agency', type: 'TEXT', notNull: true },
        { name: 'match_score', type: 'INTEGER' },
        { name: 'budget', type: 'INTEGER' },
        { name: 'end_date', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_grant_announcements', uniqueKeyColumns: ['id'] });
    // 50. crm_grant_bookmarks Table (지원금 북마크)
    await safeCreateTable('지원금 북마크', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'announcement_id', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_grant_bookmarks', uniqueKeyColumns: ['id'] });
    // 51. crm_grant_rnd_plans Table (지원금 R&D 계획서)
    await safeCreateTable('지원금 R&D 계획서', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'announcement_id', type: 'TEXT', notNull: true },
        { name: 'plan_data', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_grant_rnd_plans', uniqueKeyColumns: ['id'] });
    // 52. crm_grant_company_profile Table (지원금 매칭용 기업 프로필)
    await safeCreateTable('지원금 매칭용 기업 프로필', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'establishmentYear', type: 'INTEGER' },
        { name: 'employeeCount', type: 'INTEGER' },
        { name: 'patentsCount', type: 'INTEGER' },
        { name: 'femaleEmployeeRatio', type: 'INTEGER' },
        { name: 'youthEmployeeRatio', type: 'INTEGER' },
        { name: 'sector', type: 'TEXT' }
    ], { tableName: 'crm_grant_company_profile', uniqueKeyColumns: ['id'] });
    // 54. crm_quality_checklist_submissions Table (체크리스트 제출)
    await safeCreateTable('체크리스트 제출 내역', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'lotNo', type: 'TEXT', notNull: true },
        { name: 'inspector', type: 'TEXT', notNull: true },
        { name: 'checkItems', type: 'TEXT', notNull: true },
        { name: 'signatureData', type: 'TEXT' },
        { name: 'photoUrl', type: 'TEXT' },
        { name: 'status', type: 'TEXT', notNull: true },
        { name: 'submittedAt', type: 'TEXT', notNull: true }
    ], { tableName: 'crm_quality_checklist_submissions', uniqueKeyColumns: ['id'] });
    // 55. crm_quality_ncr_items Table (NCR 부적합)
    await safeCreateTable('NCR 부적합 내역', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'date', type: 'TEXT', notNull: true },
        { name: 'itemName', type: 'TEXT', notNull: true },
        { name: 'defectCode', type: 'TEXT' },
        { name: 'defectType', type: 'TEXT' },
        { name: 'quantity', type: 'INTEGER' },
        { name: 'reporter', type: 'TEXT' },
        { name: 'status', type: 'TEXT', notNull: true },
        { name: 'description', type: 'TEXT' },
        { name: 'actionPlan', type: 'TEXT' }
    ], { tableName: 'crm_quality_ncr_items', uniqueKeyColumns: ['id'] });
    // 56. crm_quality_ncr_similar_cases Table (유사 NCR 사례)
    await safeCreateTable('유사 NCR 사례', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'title', type: 'TEXT', notNull: true },
        { name: 'similarity', type: 'REAL' },
        { name: 'rootCause', type: 'TEXT' },
        { name: 'actionTaken', type: 'TEXT' }
    ], { tableName: 'crm_quality_ncr_similar_cases', uniqueKeyColumns: ['id'] });
    // 57. crm_quality_sensors_status Table (설비 센서 상태)
    await safeCreateTable('설비 센서 상태', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'equipmentName', type: 'TEXT', notNull: true },
        { name: 'operationalStatus', type: 'TEXT' },
        { name: 'vibrationRms', type: 'REAL' },
        { name: 'motorCurrent', type: 'REAL' },
        { name: 'bearingTemp', type: 'REAL' },
        { name: 'anomalyScore', type: 'INTEGER' },
        { name: 'threshold', type: 'INTEGER' }
    ], { tableName: 'crm_quality_sensors_status', uniqueKeyColumns: ['id'] });
    // 58. crm_quality_sensors_contribution Table (센서 기여도)
    await safeCreateTable('센서 기여도', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'rate', type: 'INTEGER' }
    ], { tableName: 'crm_quality_sensors_contribution', uniqueKeyColumns: ['id'] });
    // 59. crm_quality_sensors_timeline Table (센서 시계열)
    await safeCreateTable('센서 시계열', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'time', type: 'TEXT' },
        { name: 'vibration', type: 'REAL' },
        { name: 'current', type: 'REAL' },
        { name: 'temperature', type: 'REAL' },
        { name: 'anomalyScore', type: 'INTEGER' }
    ], { tableName: 'crm_quality_sensors_timeline', uniqueKeyColumns: ['id'] });
    // 60. crm_quality_spc_config Table (SPC 설정)
    await safeCreateTable('SPC 공정 제어 설정', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'targetValue', type: 'REAL' },
        { name: 'ucl', type: 'REAL' },
        { name: 'lcl', type: 'REAL' },
        { name: 'usl', type: 'REAL' },
        { name: 'lsl', type: 'REAL' },
        { name: 'currentCpk', type: 'REAL' },
        { name: 'cpkStatus', type: 'TEXT' },
        { name: 'futureRiskProbability', type: 'INTEGER' }
    ], { tableName: 'crm_quality_spc_config', uniqueKeyColumns: ['id'] });
    // 61. crm_quality_spc_samples Table (SPC 샘플)
    await safeCreateTable('SPC 계측 샘플', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'batch', type: 'TEXT', notNull: true },
        { name: 'value', type: 'REAL' },
        { name: 'cpk', type: 'REAL' },
        { name: 'timestamp', type: 'TEXT' }
    ], { tableName: 'crm_quality_spc_samples', uniqueKeyColumns: ['id'] });
    // 62. crm_quality_spc_predictions Table (SPC 예측)
    await safeCreateTable('SPC 계측 예측', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'batch', type: 'TEXT', notNull: true },
        { name: 'value', type: 'REAL' },
        { name: 'cpk', type: 'REAL' },
        { name: 'timestamp', type: 'TEXT' },
        { name: 'risk', type: 'INTEGER' }
    ], { tableName: 'crm_quality_spc_predictions', uniqueKeyColumns: ['id'] });
    // 63. crm_quality_spc_features Table (SPC 요인 중요도)
    await safeCreateTable('SPC 요인 중요도', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'value', type: 'INTEGER' },
        { name: 'color', type: 'TEXT' }
    ], { tableName: 'crm_quality_spc_features', uniqueKeyColumns: ['id'] });
    // 64. crm_quality_vision_model Table (품질 비전 AI 모델)
    await safeCreateTable('품질 비전 AI 모델 상태', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'activeModel', type: 'TEXT' },
        { name: 'goldenSamplesCount', type: 'INTEGER' },
        { name: 'lastTrainedAt', type: 'TEXT' },
        { name: 'anomalyThreshold', type: 'REAL' }
    ], { tableName: 'crm_quality_vision_model', uniqueKeyColumns: ['id'] });
    // 65. crm_quality_vision_logs Table (품질 비전 판정 이력)
    await safeCreateTable('품질 비전 판정 이력', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'timestamp', type: 'TEXT' },
        { name: 'itemName', type: 'TEXT' },
        { name: 'anomalyScore', type: 'REAL' },
        { name: 'status', type: 'TEXT' },
        { name: 'defectType', type: 'TEXT' },
        { name: 'imageUrl', type: 'TEXT' },
        { name: 'isReviewed', type: 'INTEGER' }
    ], { tableName: 'crm_quality_vision_logs', uniqueKeyColumns: ['id'] });
    // 66. crm_facilities Table (설비 대장 마스터)
    await safeCreateTable('설비 대장 관리', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'manufacturer', type: 'TEXT' },
        { name: 'model_name', type: 'TEXT' },
        { name: 'serial_number', type: 'TEXT' },
        { name: 'manufacture_year', type: 'INTEGER' },
        { name: 'specifications', type: 'TEXT' },
        { name: 'location', type: 'TEXT' },
        { name: 'status', type: 'TEXT' }, // RUNNING, WARNING, STOPPED
        { name: 'health_score', type: 'REAL' },
        { name: 'vibration_rms', type: 'REAL' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' }
    ], { tableName: 'crm_facilities', uniqueKeyColumns: ['id'] });
    // 67. crm_facility_checklists Table (모바일/수기 예방 점검표 이력)
    await safeCreateTable('설비 예방 점검 이력', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'equipmentId', type: 'TEXT', notNull: true },
        { name: 'inspector', type: 'TEXT', notNull: true },
        { name: 'checks', type: 'TEXT' }, // JSON String
        { name: 'signatureData', type: 'TEXT' },
        { name: 'audioUrl', type: 'TEXT' },
        { name: 'status', type: 'TEXT' }, // PASS, FAIL
        { name: 'checkedAt', type: 'TEXT' }
    ], { tableName: 'crm_facility_checklists', uniqueKeyColumns: ['id'] });
    // 68. crm_facility_repair_logs Table (설비 수리 이력 대장)
    await safeCreateTable('설비 수리 이력 대장', [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'date', type: 'TEXT', notNull: true },
        { name: 'equipmentId', type: 'TEXT', notNull: true },
        { name: 'equipmentName', type: 'TEXT' },
        { name: 'errorCode', type: 'TEXT' },
        { name: 'symptom', type: 'TEXT' },
        { name: 'repairDesc', type: 'TEXT' },
        { name: 'mechanic', type: 'TEXT' },
        { name: 'cost', type: 'INTEGER' }
    ], { tableName: 'crm_facility_repair_logs', uniqueKeyColumns: ['id'] });
    // 69. crm_facility_repair_solutions Table (RAG 고장 해결 가이드)
    await safeCreateTable('설비 고장 해결 가이드', [
        { name: 'errorCode', type: 'TEXT', notNull: true },
        { name: 'rootCause', type: 'TEXT' },
        { name: 'actions', type: 'TEXT' }, // JSON String
        { name: 'similarHistory', type: 'TEXT' },
        { name: 'warehouse', type: 'TEXT' }
    ], { tableName: 'crm_facility_repair_solutions', uniqueKeyColumns: ['errorCode'] });
    // 70. crm_facility_predictive_summary Table (실시간 예지보전 요약)
    await safeCreateTable('설비 건전도 요약', [
        { name: 'equipmentId', type: 'TEXT', notNull: true },
        { name: 'equipmentName', type: 'TEXT' },
        { name: 'healthScore', type: 'REAL' },
        { name: 'vibrationRms', type: 'REAL' }
    ], { tableName: 'crm_facility_predictive_summary', uniqueKeyColumns: ['equipmentId'] });
    // 71. crm_facility_predictive_vibration Table (시계열 진동 데이터)
    await safeCreateTable('설비 진동 센서 이력', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'equipmentId', type: 'TEXT', notNull: true },
        { name: 'time', type: 'TEXT', notNull: true },
        { name: 'value', type: 'REAL', notNull: true }
    ], { tableName: 'crm_facility_predictive_vibration', uniqueKeyColumns: ['id'] });
    // 72. crm_facility_predictive_fft Table (FFT 주파수 스펙트럼 분석 데이터)
    await safeCreateTable('설비 주파수 분석', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'equipmentId', type: 'TEXT', notNull: true },
        { name: 'frequency', type: 'REAL', notNull: true },
        { name: 'amplitude', type: 'REAL', notNull: true },
        { name: 'label', type: 'TEXT' }
    ], { tableName: 'crm_facility_predictive_fft', uniqueKeyColumns: ['id'] });
    // 73. crm_facility_predictive_part_rul Table (부품 잔여 수명 RUL)
    await safeCreateTable('설비 부품 수명 RUL', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'equipmentId', type: 'TEXT', notNull: true },
        { name: 'partName', type: 'TEXT', notNull: true },
        { name: 'rulDays', type: 'INTEGER', notNull: true },
        { name: 'status', type: 'TEXT' }, // NORMAL, WARNING, CRITICAL
        { name: 'percent', type: 'INTEGER' }
    ], { tableName: 'crm_facility_predictive_part_rul', uniqueKeyColumns: ['id'] });
    // 40-1. 기존 shared_dashboards 테이블 물리 ALTER TABLE 보정 마이그레이션 (자율 핫픽스)
    try {
        const Database = require('better-sqlite3');
        const os = require('os');
        const path = require('path');
        const fs = require('fs');
        const homeDir = os.homedir();
        const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
        const paths = [
            path.join(appData, 'EGDesk/database/user_data.db'),
            path.join(appData, 'egdesk/database/user_data.db')
        ];
        let targetPath = '';
        for (const p of paths) {
            if (fs.existsSync(p)) {
                targetPath = p;
                break;
            }
        }
        if (!targetPath) {
            targetPath = paths[0];
        }
        // 윈도우 환경 및 빌드 번들러 경로 구분자 오작동 방지를 위한 수동 포워드 슬래시 정규화 및 상위 디렉토리 생성
        const normalizedPath = targetPath.replace(/\\/g, '/');
        const dir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
        if (dir && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const db = new Database(normalizedPath);
        const colInfo = db.prepare("PRAGMA table_info(shared_dashboards);").all();
        const colNames = colInfo.map((c) => c.name);
        if (!colNames.includes('sort_order')) {
            db.exec("ALTER TABLE shared_dashboards ADD COLUMN sort_order INTEGER DEFAULT 0;");
            console.log('✓ In-app migration: added sort_order to shared_dashboards');
        }
        if (!colNames.includes('is_pinned')) {
            db.exec("ALTER TABLE shared_dashboards ADD COLUMN is_pinned INTEGER DEFAULT 1;");
            console.log('✓ In-app migration: added is_pinned to shared_dashboards');
        }
        if (!colNames.includes('custom_title')) {
            db.exec("ALTER TABLE shared_dashboards ADD COLUMN custom_title TEXT;");
            console.log('✓ In-app migration: added custom_title to shared_dashboards');
        }
        // crm_recruitment_applicants 테이블 컬럼 보정 마이그레이션
        const applicantCols = db.prepare("PRAGMA table_info(crm_recruitment_applicants);").all().map((c) => c.name);
        if (!applicantCols.includes('interview_logs')) {
            db.exec("ALTER TABLE crm_recruitment_applicants ADD COLUMN interview_logs TEXT;");
            console.log('✓ In-app migration: added interview_logs to crm_recruitment_applicants');
        }
        if (!applicantCols.includes('ai_evaluation')) {
            db.exec("ALTER TABLE crm_recruitment_applicants ADD COLUMN ai_evaluation TEXT;");
            console.log('✓ In-app migration: added ai_evaluation to crm_recruitment_applicants');
        }
        // ai_token_usage_logs 테이블 컬럼 보정 마이그레이션
        const tokenLogCols = db.prepare("PRAGMA table_info(ai_token_usage_logs);").all().map((c) => c.name);
        if (!tokenLogCols.includes('user_name')) {
            db.exec("ALTER TABLE ai_token_usage_logs ADD COLUMN user_name TEXT;");
            console.log('✓ In-app migration: added user_name to ai_token_usage_logs');
        }
        if (!tokenLogCols.includes('menu_path')) {
            db.exec("ALTER TABLE ai_token_usage_logs ADD COLUMN menu_path TEXT;");
            console.log('✓ In-app migration: added menu_path to ai_token_usage_logs');
        }
        if (!tokenLogCols.includes('uuid')) {
            db.exec("ALTER TABLE ai_token_usage_logs ADD COLUMN uuid TEXT;");
            console.log('✓ In-app migration: added uuid to ai_token_usage_logs');
        }
        if (!tokenLogCols.includes('updated_at')) {
            db.exec("ALTER TABLE ai_token_usage_logs ADD COLUMN updated_at TEXT;");
            console.log('✓ In-app migration: added updated_at to ai_token_usage_logs');
        }
        if (!tokenLogCols.includes('updated_by')) {
            db.exec("ALTER TABLE ai_token_usage_logs ADD COLUMN updated_by TEXT;");
            console.log('✓ In-app migration: added updated_by to ai_token_usage_logs');
        }
        if (!tokenLogCols.includes('deleted_at')) {
            db.exec("ALTER TABLE ai_token_usage_logs ADD COLUMN deleted_at TEXT;");
            console.log('✓ In-app migration: added deleted_at to ai_token_usage_logs');
        }
        if (!tokenLogCols.includes('deleted_by')) {
            db.exec("ALTER TABLE ai_token_usage_logs ADD COLUMN deleted_by TEXT;");
            console.log('✓ In-app migration: added deleted_by to ai_token_usage_logs');
        }
        if (!tokenLogCols.includes('restored_at')) {
            db.exec("ALTER TABLE ai_token_usage_logs ADD COLUMN restored_at TEXT;");
            console.log('✓ In-app migration: added restored_at to ai_token_usage_logs');
        }
        if (!tokenLogCols.includes('restored_by')) {
            db.exec("ALTER TABLE ai_token_usage_logs ADD COLUMN restored_by TEXT;");
            console.log('✓ In-app migration: added restored_by to ai_token_usage_logs');
        }
        // form_templates 테이블 컬럼 보정 마이그레이션
        const templateCols = db.prepare("PRAGMA table_info(form_templates);").all().map((c) => c.name);
        if (!templateCols.includes('query_sql')) {
            db.exec("ALTER TABLE form_templates ADD COLUMN query_sql TEXT;");
            console.log('✓ In-app migration: added query_sql to form_templates');
        }
        if (!templateCols.includes('query_params')) {
            db.exec("ALTER TABLE form_templates ADD COLUMN query_params TEXT;");
            console.log('✓ In-app migration: added query_params to form_templates');
        }
        const auditCols = ['uuid', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by'];
        for (const auditCol of auditCols) {
            if (!templateCols.includes(auditCol)) {
                db.exec(`ALTER TABLE form_templates ADD COLUMN ${auditCol} TEXT;`);
                console.log(`✓ In-app migration: added ${auditCol} to form_templates`);
            }
        }
        // form_mappings 테이블 컬럼 보정 마이그레이션
        const mappingCols = db.prepare("PRAGMA table_info(form_mappings);").all().map((c) => c.name);
        for (const auditCol of auditCols) {
            if (!mappingCols.includes(auditCol)) {
                db.exec(`ALTER TABLE form_mappings ADD COLUMN ${auditCol} TEXT;`);
                console.log(`✓ In-app migration: added ${auditCol} to form_mappings`);
            }
        }
        db.close();
    }
    catch (err) {
        console.error('⚠️ In-app migration error:', err.message);
    }
    // 53. 정부 지원금 공고 및 프로필 초기 데이터 백필 (Seeding)
    try {
        const grantAnnouncementsCheck = await (0, egdesk_helpers_1.queryTable)('crm_grant_announcements', {});
        if (!grantAnnouncementsCheck.rows || grantAnnouncementsCheck.rows.length === 0) {
            const seedAnnouncements = [
                {
                    id: 'GR-501',
                    title: '중소기업 스마트공장 고도화 지원사업',
                    agency: '중소벤처기업부',
                    match_score: 92,
                    budget: 150000000,
                    end_date: '2026-07-15'
                },
                {
                    id: 'GR-502',
                    title: '소상공인 디지털 전환 기술보급 보조금',
                    agency: '소상공인시장진흥공단',
                    match_score: 85,
                    budget: 30000000,
                    end_date: '2026-06-30'
                },
                {
                    id: 'GR-503',
                    title: '대·중소 동반성장 공동 R&D 지원과제',
                    agency: '산업통상자원부',
                    match_score: 68,
                    budget: 300000000,
                    end_date: '2026-08-31'
                }
            ];
            await (0, egdesk_helpers_1.insertRows)('crm_grant_announcements', seedAnnouncements);
            console.log('✓ 정부 지원금 공고 초기 데이터 시딩 완료');
        }
        const companyProfileCheck = await (0, egdesk_helpers_1.queryTable)('crm_grant_company_profile', { filters: { id: 'MY-COMPANY' } });
        if (!companyProfileCheck.rows || companyProfileCheck.rows.length === 0) {
            const seedProfile = {
                id: 'MY-COMPANY',
                establishmentYear: 2022,
                employeeCount: 12,
                patentsCount: 2,
                femaleEmployeeRatio: 35,
                youthEmployeeRatio: 65,
                sector: '도소매 및 물류 소프트웨어'
            };
            await (0, egdesk_helpers_1.insertRows)('crm_grant_company_profile', [seedProfile]);
            console.log('✓ 지원금 매칭용 기업 프로필 초기 데이터 시딩 완료');
        }
    }
    catch (seedErr) {
        console.error('⚠️ Grant seeding error:', seedErr.message);
    }
    // 54. 품질 관리 AI 초기 데이터 백필 (Seeding)
    try {
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const spcConfigCheck = await (0, egdesk_helpers_1.queryTable)('crm_quality_spc_config', {});
        if (!spcConfigCheck.rows || spcConfigCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_quality_spc_config', [{
                    id: 'SPC-CFG',
                    targetValue: 210.0,
                    ucl: 215.0,
                    lcl: 205.0,
                    usl: 218.0,
                    lsl: 202.0,
                    currentCpk: 1.15,
                    cpkStatus: 'WARNING',
                    futureRiskProbability: 89
                }]);
        }
        const spcSamplesCheck = await (0, egdesk_helpers_1.queryTable)('crm_quality_spc_samples', {});
        if (!spcSamplesCheck.rows || spcSamplesCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_quality_spc_samples', [
                { id: 1, batch: 'B-201', value: 208.5, cpk: 1.42, timestamp: '18:00' },
                { id: 2, batch: 'B-202', value: 211.5, cpk: 1.48, timestamp: '19:00' },
                { id: 3, batch: 'B-203', value: 209.8, cpk: 1.59, timestamp: '20:00' },
                { id: 4, batch: 'B-204', value: 213.1, cpk: 1.35, timestamp: '21:00' },
                { id: 5, batch: 'B-205', value: 214.8, cpk: 1.22, timestamp: '22:00' },
                { id: 6, batch: 'B-206', value: 215.2, cpk: 1.15, timestamp: '23:00' }
            ]);
        }
        const spcFeaturesCheck = await (0, egdesk_helpers_1.queryTable)('crm_quality_spc_features', {});
        if (!spcFeaturesCheck.rows || spcFeaturesCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_quality_spc_features', [
                { id: 'SPC-F1', name: '가열 실린더 압력', value: 42, color: 'bg-rose-500' },
                { id: 'SPC-F2', name: '냉각수 밸브 유량', value: 28, color: 'bg-amber-500' },
                { id: 'SPC-F3', name: '환경 외부 온도', value: 18, color: 'bg-blue-500' },
                { id: 'SPC-F4', name: '원자재 용융 지수', value: 12, color: 'bg-indigo-500' }
            ]);
        }
        const visionModelCheck = await (0, egdesk_helpers_1.queryTable)('crm_quality_vision_model', {});
        if (!visionModelCheck.rows || visionModelCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_quality_vision_model', [{
                    id: 'VIS-MODEL',
                    activeModel: 'Unsupervised PatchCore v2.1',
                    goldenSamplesCount: 85,
                    lastTrainedAt: '2026-06-05 14:30:22',
                    anomalyThreshold: 75.0
                }]);
        }
        const sensorsStatusCheck = await (0, egdesk_helpers_1.queryTable)('crm_quality_sensors_status', {});
        if (!sensorsStatusCheck.rows || sensorsStatusCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_quality_sensors_status', [{
                    id: 'SEN-SUMMARY',
                    equipmentName: '주력 사출 프레스 M-500',
                    operationalStatus: 'WARNING',
                    vibrationRms: 4.8,
                    motorCurrent: 18.2,
                    bearingTemp: 56.4,
                    anomalyScore: 88,
                    threshold: 70
                }]);
        }
        const sensorsContributionCheck = await (0, egdesk_helpers_1.queryTable)('crm_quality_sensors_contribution', {});
        if (!sensorsContributionCheck.rows || sensorsContributionCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_quality_sensors_contribution', [
                { id: 'CON-1', name: '모터 하우징 진동 (Vibration)', rate: 62 },
                { id: 'CON-2', name: '가동 구동 축 내부 온도 (Temperature)', rate: 23 },
                { id: 'CON-3', name: '3상 공급 전력 전류 (Current)', rate: 15 }
            ]);
        }
        const sensorsTimelineCheck = await (0, egdesk_helpers_1.queryTable)('crm_quality_sensors_timeline', {});
        if (!sensorsTimelineCheck.rows || sensorsTimelineCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_quality_sensors_timeline', [
                { id: 'TIM-1', time: '23:00', vibration: 1.2, current: 12.4, temperature: 45.2, anomalyScore: 15 },
                { id: 'TIM-2', time: '23:10', vibration: 1.3, current: 12.5, temperature: 45.8, anomalyScore: 18 },
                { id: 'TIM-3', time: '23:20', vibration: 1.5, current: 13.0, temperature: 46.5, anomalyScore: 28 }
            ]);
        }
        const visionLogsCheck = await (0, egdesk_helpers_1.queryTable)('crm_quality_vision_logs', {});
        if (!visionLogsCheck.rows || visionLogsCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_quality_vision_logs', [
                { id: 'VIS-001', timestamp: '2026-06-06 23:15:30', itemName: '사출 성형 커버 A형', anomalyScore: 92.5, status: 'FAIL', defectType: '표면 크랙 (Surface Crack)', imageUrl: 'https://api.placeholder.com/400/300', isReviewed: 0 },
                { id: 'VIS-002', timestamp: '2026-06-06 23:02:12', itemName: '사출 성형 커버 A형', anomalyScore: 12.4, status: 'PASS', defectType: '없음 (정상)', imageUrl: 'https://api.placeholder.com/400/300', isReviewed: 1 },
                { id: 'VIS-003', timestamp: '2026-06-06 22:45:18', itemName: '커넥터 하우징 B형', anomalyScore: 88.1, status: 'FAIL', defectType: '미성형 (Under-fill)', imageUrl: 'https://api.placeholder.com/400/300', isReviewed: 1 }
            ]);
        }
        const ncrItemsCheck = await (0, egdesk_helpers_1.queryTable)('crm_quality_ncr_items', {});
        if (!ncrItemsCheck.rows || ncrItemsCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_quality_ncr_items', [
                { id: 'NCR-2026-004', date: '2026-06-06 23:45', itemName: '사출 성형 커버 A형', defectCode: 'DEF-022', defectType: '표면 수축 및 함몰', quantity: 120, reporter: '김철수 (공정검사원)', status: 'UNDER_REVIEW', description: '사출 성형 후 냉각 불량으로 인해 전면부 표면에 수축 함몰(Sink Mark)이 발생하여 규격 한계 초과함.', actionPlan: null },
                { id: 'NCR-2026-003', date: '2026-06-05 10:15', itemName: '커넥터 하우징 B형', defectCode: 'DEF-008', defectType: '미성형 결함', quantity: 45, reporter: '이영희 (출하검사원)', status: 'CAPA_ISSUED', description: '원자재 공급 불균형으로 인해 하단 결속 핀 성형부에 미성형 결함이 관찰되어 출하 대기 격리함.', actionPlan: '노즐 온도 5도 상향 조정 및 원자재 공급 압력 조절 피드 메커니즘 튜닝 완료.' },
                { id: 'NCR-2026-002', date: '2026-06-02 16:30', itemName: '사출 성형 커버 A형', defectCode: 'DEF-015', defectType: '이물 혼입', quantity: 15, reporter: '박민수 (수입검사원)', status: 'COMPLETED', description: '원재료 피딩 호퍼 세척 관리 소홀로 인한 흑점 이물 혼입 발견.', actionPlan: '호퍼 청소 스케줄 강화(주 1회 -> 매일 작업 전) 및 집진 쉴드 커버 장착 완료.' }
            ]);
        }
        const ncrSimilarCasesCheck = await (0, egdesk_helpers_1.queryTable)('crm_quality_ncr_similar_cases', {});
        if (!ncrSimilarCasesCheck.rows || ncrSimilarCasesCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_quality_ncr_similar_cases', [
                { id: 'NCR-2024-118', title: '2024년 11월 사출 커버 표면 수축 불량 발생 건', similarity: 95.8, rootCause: '냉각 순환 밸브 스케일(침전물) 누적으로 인한 냉각 열교환 효율 저하.', actionTaken: '냉각 배관 세척액 플러싱 실시 및 냉각 타이머 2.5초 연장 설정. 조치 후 Cpk 1.45로 복귀.' },
                { id: 'NCR-2025-042', title: '2025년 4월 금형 온도 편차로 인한 Sink Mark 발생 건', similarity: 88.2, rootCause: '금형 가열 히터 카트리지 3번 단선으로 인한 국부적 온도 저하.', actionTaken: '단선된 가열 카트리지 교체 및 금형 온도 상한 경보 센서 이중화 튜닝.' }
            ]);
        }
        console.log('✓ 스마트 공장 품질 관리 초기 데이터 시딩 완료');
        const facilityCheck = await (0, egdesk_helpers_1.queryTable)('crm_facilities', {});
        if (!facilityCheck.rows || facilityCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_facilities', [
                { id: 'EQ-PRESS-01', name: '주력 사출 프레스 M-500', manufacturer: 'Daejin Heavy Industries', model_name: 'M-500', serial_number: 'SN-M500-9988', manufacture_year: 2022, specifications: 'Press Force: 500Ton, Stroke: 400mm', location: '사출 1공장 A라인', status: 'RUNNING', health_score: 84.5, vibration_rms: 2.8, created_at: nowStr, updated_at: nowStr },
                { id: 'EQ-PRESS-02', name: '사출 프레스 M-300', manufacturer: 'Daejin Heavy Industries', model_name: 'M-300', serial_number: 'SN-M300-4422', manufacture_year: 2023, specifications: 'Press Force: 300Ton, Stroke: 300mm', location: '사출 1공장 B라인', status: 'RUNNING', health_score: 92.0, vibration_rms: 1.5, created_at: nowStr, updated_at: nowStr }
            ]);
        }
        const facilitySolutionCheck = await (0, egdesk_helpers_1.queryTable)('crm_facility_repair_solutions', {});
        if (!facilitySolutionCheck.rows || facilitySolutionCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_facility_repair_solutions', [
                {
                    errorCode: 'E-102',
                    rootCause: '가열 실린더 압력 리밸브 오작동 및 오링 마모에 의한 압력 유실.',
                    actions: JSON.stringify([
                        '1. 메인 가열 압력 리밸브의 오링 패킹 손상 여부를 스캔합니다.',
                        '2. 실린더 게이트 압력 센서 전선 체결을 재조임합니다.',
                        '3. 유압 모터의 오일 가동 누출을 확인하고 리필 보정합니다.'
                    ]),
                    similarHistory: '2024년 8월 유사 수압 실린더 압력 유실 건으로 가이드 고무 씰 교체 조치함.',
                    warehouse: '공구실 A-3 랙 유압 O링 패킹 자재 여분 5개 보유 중'
                },
                {
                    errorCode: 'E-304',
                    rootCause: '구동 모터 회전자 권선 단락 또는 과도 베어링 마모에 의한 과전류 인입.',
                    actions: JSON.stringify([
                        '1. 모터 하우징 온도를 비접촉 온도계로 실시간 계측하여 과열(80도 이상) 여부 체크.',
                        '2. 3상 절연 저항 테스트 실시하여 코일 쇼트 여부 확인.',
                        '3. 베어링 마모 소음 발생 시 베어링 윤활 오일 주입 및 필요시 모터 교체.'
                    ]),
                    similarHistory: '2025년 3월 사출 2호기 모터 축 베어링 과부하로 베어링 교체 조치함.',
                    warehouse: '보전 자재 창고 C-2 구역 표준 3상 모터(7.5kW) 1대 보유 중'
                }
            ]);
        }
        const facilityPredictiveSummaryCheck = await (0, egdesk_helpers_1.queryTable)('crm_facility_predictive_summary', {});
        if (!facilityPredictiveSummaryCheck.rows || facilityPredictiveSummaryCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_facility_predictive_summary', [
                { equipmentId: 'EQ-PRESS-01', equipmentName: '주력 사출 프레스 M-500', healthScore: 84.5, vibrationRms: 2.8 }
            ]);
        }
        const facilityVibrationCheck = await (0, egdesk_helpers_1.queryTable)('crm_facility_predictive_vibration', {});
        if (!facilityVibrationCheck.rows || facilityVibrationCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_facility_predictive_vibration', [
                { id: 1, equipmentId: 'EQ-PRESS-01', time: '13:00', value: 2.1 },
                { id: 2, equipmentId: 'EQ-PRESS-01', time: '13:05', value: 2.3 },
                { id: 3, equipmentId: 'EQ-PRESS-01', time: '13:10', value: 2.8 },
                { id: 4, equipmentId: 'EQ-PRESS-01', time: '13:15', value: 3.5 },
                { id: 5, equipmentId: 'EQ-PRESS-01', time: '13:20', value: 2.9 },
                { id: 6, equipmentId: 'EQ-PRESS-01', time: '13:25', value: 2.8 }
            ]);
        }
        const facilityFftCheck = await (0, egdesk_helpers_1.queryTable)('crm_facility_predictive_fft', {});
        if (!facilityFftCheck.rows || facilityFftCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_facility_predictive_fft', [
                { id: 1, equipmentId: 'EQ-PRESS-01', frequency: 10, amplitude: 0.15, label: '1x RPM' },
                { id: 2, equipmentId: 'EQ-PRESS-01', frequency: 20, amplitude: 0.82, label: '2x RPM (Unbalance)' },
                { id: 3, equipmentId: 'EQ-PRESS-01', frequency: 30, amplitude: 0.22, label: '3x RPM' },
                { id: 4, equipmentId: 'EQ-PRESS-01', frequency: 40, amplitude: 0.45, label: '4x RPM (Misalignment)' }
            ]);
        }
        const facilityRulCheck = await (0, egdesk_helpers_1.queryTable)('crm_facility_predictive_part_rul', {});
        if (!facilityRulCheck.rows || facilityRulCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_facility_predictive_part_rul', [
                { id: 1, equipmentId: 'EQ-PRESS-01', partName: '유압 실린더 패킹 (Piston Seal)', rulDays: 45, status: 'NORMAL', percent: 78 },
                { id: 2, equipmentId: 'EQ-PRESS-01', partName: '메인 드라이브 모터 브러시', rulDays: 12, status: 'WARNING', percent: 22 },
                { id: 3, equipmentId: 'EQ-PRESS-01', partName: '고압 냉각 라인 펌프 밸브', rulDays: 85, status: 'NORMAL', percent: 92 }
            ]);
        }
        const facilityRepairCheck = await (0, egdesk_helpers_1.queryTable)('crm_facility_repair_logs', {});
        if (!facilityRepairCheck.rows || facilityRepairCheck.rows.length === 0) {
            await (0, egdesk_helpers_1.insertRows)('crm_facility_repair_logs', [
                { id: 'REP-2026-001', date: '2026-06-02 14:00', equipmentId: 'EQ-PRESS-01', equipmentName: '주력 사출 프레스 M-500', errorCode: 'E-102', symptom: '가열 실린더 압력 저하 경보 발생', repairDesc: '유압 가이드 실 O링 마모 확인되어 규격품으로 즉각 교체 진행 및 유압 보충 완료.', mechanic: '홍길동', cost: 125000 }
            ]);
        }
        console.log('✓ 스마트 공장 설비 관리 초기 데이터 시딩 완료');
    }
    catch (seedErr) {
        console.error('⚠️ Quality & Facility seeding error:', seedErr.message);
    }
    // ==========================================
    // R&D 기업부설연구소 사후관리 AI 테이블 신설
    // ==========================================
    // 74. rnd_centers Table (기업부설연구소 기본 정보)
    await safeCreateTable('기업부설연구소 기본 정보', [
        { name: 'center_id', type: 'INTEGER', notNull: true },
        { name: 'company_id', type: 'INTEGER', notNull: true },
        { name: 'center_name', type: 'TEXT', notNull: true },
        { name: 'center_type', type: 'TEXT', notNull: true }, // 'RESEARCH_CENTER' or 'DEVELOPMENT_DEPT'
        { name: 'established_date', type: 'TEXT', notNull: true },
        { name: 'koita_reg_number', type: 'TEXT' },
        { name: 'postal_code', type: 'TEXT', notNull: true },
        { name: 'address_road', type: 'TEXT', notNull: true },
        { name: 'address_detail', type: 'TEXT' },
        { name: 'total_area_sqm', type: 'REAL', notNull: true },
        { name: 'is_active', type: 'INTEGER', defaultValue: 1 }
    ], { tableName: 'rnd_centers', uniqueKeyColumns: ['center_id'] });
    // 75. rnd_staffs Table (연구원 정보 및 자격 정보)
    await safeCreateTable('연구원 정보 및 자격 정보', [
        { name: 'staff_id', type: 'INTEGER', notNull: true },
        { name: 'center_id', type: 'INTEGER', notNull: true },
        { name: 'user_id', type: 'INTEGER', notNull: true },
        { name: 'staff_role', type: 'TEXT', notNull: true }, // 'DIRECTOR', 'RESEARCHER', 'ASSISTANT'
        { name: 'employment_status', type: 'TEXT', defaultValue: 'ACTIVE' }, // 'ACTIVE', 'SUSPENDED', 'RESIGNED'
        { name: 'degree_level', type: 'TEXT', notNull: true }, // 'BACHELOR', 'MASTER', 'DOCTOR', 'ASSOCIATE'
        { name: 'major_name', type: 'TEXT', notNull: true },
        { name: 'major_category', type: 'TEXT', notNull: true }, // 'NATURAL_SCIENCE', 'ENGINEERING', 'SOCIAL_SCIENCE', 'HUMANITIES', 'OTHER'
        { name: 'graduation_cert_ocr_json', type: 'TEXT' }, // OCR 원본 JSON 스트링
        { name: 'qualification_status', type: 'TEXT', defaultValue: 'PENDING' }, // 'PENDING', 'QUALIFIED', 'UNQUALIFIED'
        { name: 'joined_date', type: 'TEXT', notNull: true },
        { name: 'resigned_date', type: 'TEXT' }
    ], { tableName: 'rnd_staffs', uniqueKeyColumns: ['staff_id'] });
    // 76. rnd_spaces Table (연구 공간 자가 실사 및 Vision AI 분석 이력)
    await safeCreateTable('연구 공간 자가 실사 및 Vision AI 분석 이력', [
        { name: 'space_check_id', type: 'INTEGER', notNull: true },
        { name: 'center_id', type: 'INTEGER', notNull: true },
        { name: 'check_date', type: 'TEXT', notNull: true },
        { name: 'image_url_entrance', type: 'TEXT', notNull: true },
        { name: 'image_url_layout', type: 'TEXT', notNull: true },
        { name: 'ai_analysis_result', type: 'TEXT' }, // Vision AI 분석 결과 JSON
        { name: 'signage_status', type: 'TEXT', defaultValue: 'FAIL' }, // 'PASS', 'FAIL'
        { name: 'partition_status', type: 'TEXT', defaultValue: 'PASS' }, // 'PASS', 'FAIL', 'NOT_APPLICABLE'
        { name: 'overall_status', type: 'TEXT', defaultValue: '보완필요' }, // '합격', '보완필요', '부적격'
        { name: 'inspector_notes', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' }
    ], { tableName: 'rnd_spaces', uniqueKeyColumns: ['space_check_id'] });
    // 77. rnd_logs Table (R&D 연구개발 일지 및 AI 생성 데이터)
    await safeCreateTable('R&D 연구개발 일지 및 AI 생성 데이터', [
        { name: 'log_id', type: 'INTEGER', notNull: true },
        { name: 'center_id', type: 'INTEGER', notNull: true },
        { name: 'author_id', type: 'INTEGER', notNull: true },
        { name: 'work_date', type: 'TEXT', notNull: true },
        { name: 'raw_source', type: 'TEXT', notNull: true }, // 'TEXT', 'VOICE', 'GITHUB', 'JIRA'
        { name: 'raw_content', type: 'TEXT' },
        { name: 'audio_file_url', type: 'TEXT' },
        { name: 'ai_generated_title', type: 'TEXT' },
        { name: 'ai_generated_content', type: 'TEXT' },
        { name: 'approval_status', type: 'TEXT', defaultValue: 'DRAFT' }, // 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED'
        { name: 'approver_id', type: 'INTEGER' },
        { name: 'approved_at', type: 'TEXT' },
        { name: 'blockchain_hash', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' }
    ], { tableName: 'rnd_logs', uniqueKeyColumns: ['log_id'] });
    // 78. rnd_compliance_alarms Table (규제 준수 모니터링 및 알림)
    await safeCreateTable('규제 준수 모니터링 및 알림', [
        { name: 'alarm_id', type: 'INTEGER', notNull: true },
        { name: 'center_id', type: 'INTEGER', notNull: true },
        { name: 'category', type: 'TEXT', notNull: true }, // 'STAFF_CHANGE', 'SPACE_CHECK', 'LOG_MISSING', 'ANNUAL_REPORT'
        { name: 'severity', type: 'TEXT', defaultValue: 'INFO' }, // 'INFO', 'WARNING', 'CRITICAL'
        { name: 'message', type: 'TEXT', notNull: true },
        { name: 'due_date', type: 'TEXT' },
        { name: 'is_resolved', type: 'INTEGER', defaultValue: 0 },
        { name: 'resolved_at', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' }
    ], { tableName: 'rnd_compliance_alarms', uniqueKeyColumns: ['alarm_id'] });
    // 78. 최고관리자 초기 계정 자동 주입
    try {
        const operatorCheck = await (0, egdesk_helpers_1.queryTable)('crm_operators', { filters: { username: 'admin' } });
        if (!operatorCheck.rows || operatorCheck.rows.length === 0) {
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            await (0, egdesk_helpers_1.insertRows)('crm_operators', [{
                    id: 1,
                    username: 'admin',
                    password_hash: '$2b$10$wJx1.955Ypx9znqV8x6KVuFTrZaxAaf6TaEFc77Rz29ctUUD7jgz.', // admin1234
                    name: '최고관리자',
                    role: 'SUPER_ADMIN',
                    created_at: nowStr,
                    uuid: 'super-admin-uuid-1'
                }]);
            console.log('Super admin account (admin) seeded.');
        }
    }
    catch (e) {
        console.error('Error seeding super admin account:', e.message);
    }
    // 79. 기업부설연구소 초기 시드 데이터 자동 주입
    try {
        const rndCentersCheck = await (0, egdesk_helpers_1.queryTable)('rnd_centers', {});
        if (!rndCentersCheck.rows || rndCentersCheck.rows.length === 0) {
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            // 1) 연구소 기본 정보 시딩 (ID: 1)
            await (0, egdesk_helpers_1.insertRows)('rnd_centers', [{
                    center_id: 1,
                    company_id: 1,
                    center_name: '이지데스크 지능형 소프트웨어 연구소',
                    center_type: 'RESEARCH_CENTER',
                    established_date: '2024-03-15',
                    koita_reg_number: 'KOITA-2024-8899',
                    postal_code: '06159',
                    address_road: '서울특별시 강남구 테헤란로 427',
                    address_detail: '삼정빌딩 12층 1205호',
                    total_area_sqm: 45.50,
                    is_active: 1
                }]);
            // 2) 연구원 정보 시딩 (총 4명)
            await (0, egdesk_helpers_1.insertRows)('rnd_staffs', [
                {
                    staff_id: 1,
                    center_id: 1,
                    user_id: 2, // 홍길동 (소장)
                    staff_role: 'DIRECTOR',
                    employment_status: 'ACTIVE',
                    degree_level: 'DOCTOR',
                    major_name: '컴퓨터공학과',
                    major_category: 'ENGINEERING',
                    qualification_status: 'QUALIFIED',
                    joined_date: '2024-03-15'
                },
                {
                    staff_id: 2,
                    center_id: 1,
                    user_id: 3, // 이철수 (연구원)
                    staff_role: 'RESEARCHER',
                    employment_status: 'ACTIVE',
                    degree_level: 'MASTER',
                    major_name: '수학과',
                    major_category: 'NATURAL_SCIENCE',
                    qualification_status: 'QUALIFIED',
                    joined_date: '2024-03-15'
                },
                {
                    staff_id: 3,
                    center_id: 1,
                    user_id: 4, // 박영희 (연구원)
                    staff_role: 'RESEARCHER',
                    employment_status: 'ACTIVE',
                    degree_level: 'BACHELOR',
                    major_name: '정보통신공학과',
                    major_category: 'ENGINEERING',
                    qualification_status: 'QUALIFIED',
                    joined_date: '2024-05-01'
                },
                {
                    staff_id: 4,
                    center_id: 1,
                    user_id: 6, // 최민수 (연구보조원)
                    staff_role: 'ASSISTANT',
                    employment_status: 'ACTIVE',
                    degree_level: 'ASSOCIATE',
                    major_name: '컴퓨터소프트웨어과',
                    major_category: 'ENGINEERING',
                    qualification_status: 'QUALIFIED',
                    joined_date: '2025-01-10'
                }
            ]);
            // 3) 공간 자가 점검 이력 시딩
            await (0, egdesk_helpers_1.insertRows)('rnd_spaces', [
                {
                    space_check_id: 1,
                    center_id: 1,
                    check_date: '2026-03-08',
                    image_url_entrance: '/images/rnd/entrance_good.jpg',
                    image_url_layout: '/images/rnd/layout_need_improvement.jpg',
                    ai_analysis_result: JSON.stringify({
                        signage_detected: true,
                        signage_text: "기업부설연구소",
                        partition_detected: true,
                        estimated_partition_height_m: 1.05,
                        mixed_staff_detected: false,
                        notes: "출입구 현판은 명확히 부착되어 있으나, 내부 파티션의 높이가 약 1.05m로 추정되어 기준치 1.2m에 소폭 미달합니다."
                    }),
                    signage_status: 'PASS',
                    partition_status: 'FAIL',
                    overall_status: '보완필요',
                    inspector_notes: '파티션 높이 보완(1.2m 이상 파티션 추가 덧대기) 조치 후 재점검 필요.',
                    created_at: nowStr
                }
            ]);
            // 4) 연구일지 시딩 (총 2건)
            await (0, egdesk_helpers_1.insertRows)('rnd_logs', [
                {
                    log_id: 1,
                    center_id: 1,
                    author_id: 2, // 이철수
                    work_date: '2026-06-05',
                    raw_source: 'GITHUB',
                    raw_content: 'Commit: feat(auth): OAuth2.0 소셜 로그인 연동 모듈 최적화 및 카카오 로그인 예외처리 보정',
                    audio_file_url: null,
                    ai_generated_title: 'OAuth2.0 소셜 로그인 모듈 연동 및 예외 처리 성능 개선',
                    ai_generated_content: '1. 연구 배경: 다중 소셜 로그인 인프라 구축 시 발생하는 토큰 갱신 병목 및 특정 벤더(카카오)의 null API 응답 대응 방안 연구.\n2. 실험 방법: 네트워크 요청 타임아웃을 2.5초로 튜닝하고, 커스텀 미들웨어를 구축하여 비정상 세션의 토큰 클렌징 알고리즘 수립.\n3. 결과 분석: 예외 처리 로직 적용 후 비정상 로그아웃 비율이 기존 대비 94% 감소하였으며, 세션 동기화 안정성 확보.\n4. 향후 계획: 모바일 웹뷰 환경에서의 하이브리드 토큰 전달 성능 테스트 실시.',
                    approval_status: 'APPROVED',
                    approver_id: 1, // 홍길동 소장
                    approved_at: nowStr,
                    blockchain_hash: '1a2b3c4d5e6f7g8h9i0j9k8l7m6n5o4p3q2r1s0t9u8v7w6x5y4z3a2b1c0d9e8f',
                    created_at: nowStr,
                    updated_at: nowStr
                },
                {
                    log_id: 2,
                    center_id: 1,
                    author_id: 3, // 박영희
                    work_date: '2026-06-08',
                    raw_source: 'VOICE',
                    raw_content: '음성 입력: 오늘 공간 적격성 자동 판단을 위한 비전 AI 모델을 튜닝했는데 요로 버전8 바운딩박스 아이오유 임계치를 0.5에서 0.6으로 바꾸면서 정밀도가 개선되는지 테스트를 진행했어.',
                    audio_file_url: '/audio/rnd/log_voice_01.mp3',
                    ai_generated_title: 'YOLOv8 모델 바운딩 박스 임계치 튜닝을 통한 공간 적격성 판별 정밀도 향상 실험',
                    ai_generated_content: '1. 연구 배경: Vision AI 기반 사무 공간 물적 독립성 판별 시 인접 파티션과의 중첩에 따른 오탐지율 최소화 연구.\n2. 실험 방법: Object Detection(YOLOv8) 모델의 Bounding Box IoU(Intersection over Union) 임계값 설정을 0.5에서 0.65까지 0.05 단위로 변화시키며 정밀도(Precision)와 재현율(Recall) 분석.\n3. 결과 분석: 임계치를 0.60으로 상향 시 파티션 경계부의 오검출율이 18.2% 감소하였으며, 전체 Map@50 성능이 3.4% 향상됨을 확인.\n4. 향후 계획: 파티션 높이의 정량적 센티미터 추정을 위한 앵커 개체(책상 높이 등) 매핑 3D depth 알고리즘 보완.',
                    approval_status: 'PENDING',
                    approver_id: null,
                    approved_at: null,
                    blockchain_hash: null,
                    created_at: nowStr,
                    updated_at: nowStr
                }
            ]);
            // 5) 규제 준수 경고 시딩
            await (0, egdesk_helpers_1.insertRows)('rnd_compliance_alarms', [
                {
                    alarm_id: 1,
                    center_id: 1,
                    category: 'SPACE_CHECK',
                    severity: 'WARNING',
                    message: '기업부설연구소 물적 독립 공간 자가진단 주기(분기 1회)가 90일을 초과하였습니다. 신속히 자가진단 카메라를 가동하여 촬영 이미지를 분석해 주세요.',
                    due_date: '2026-06-30',
                    is_resolved: 0,
                    resolved_at: null,
                    created_at: nowStr
                }
            ]);
            console.log('✓ 기업부설연구소 AI 관리 초기 시드 데이터 시딩 완료');
        }
    }
    catch (seedErr) {
        console.error('⚠️ R&D seeding error:', seedErr.message);
    }
    // 40. 우리 회사 (본사) 기본 설정 시딩 (주식회사 쿠스)
    try {
        const companyProfileCheck = await (0, egdesk_helpers_1.queryTable)('system_settings', { filters: { key: 'my_company_profile' } });
        if (!companyProfileCheck.rows || companyProfileCheck.rows.length === 0) {
            const defaultProfile = {
                companyName: '(주)쿠스',
                representative: '차민수',
                businessNumber: '731-81-02023',
                phone: '010-7216-5884',
                email: 'chachogreat@gmail.com',
                address: '경기도 시흥시 서울대학로 59-69 배곧테크노밸리 609호',
                sidebarMainTitle: 'EGDESK SMS',
                sidebarSubTitle: '우리 회사 스마트 AI 시스템'
            };
            await (0, egdesk_helpers_1.insertRows)('system_settings', [
                {
                    key: 'my_company_profile',
                    value: JSON.stringify(defaultProfile)
                },
                {
                    key: 'company_name',
                    value: '(주)쿠스'
                },
                {
                    key: 'company_business_number',
                    value: '731-81-02023'
                }
            ]);
            console.log('Company settings seeded with default values: (주)쿠스');
        }
    }
    catch (e) {
        console.error('Error seeding company settings:', e.message);
    }
    // 41. CRM Credential Vault Table (보안 인증 정보 금고)
    await safeCreateTable('보안 인증 정보 금고', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'category', type: 'TEXT', notNull: true },
        { name: 'asset_name', type: 'TEXT', notNull: true },
        { name: 'login_id', type: 'TEXT' },
        { name: 'encrypted_password', type: 'TEXT', notNull: true },
        { name: 'iv', type: 'TEXT', notNull: true },
        { name: 'auth_tag', type: 'TEXT', notNull: true },
        { name: 'remarks', type: 'TEXT' },
        { name: 'owner_operator_id', type: 'INTEGER' },
        { name: 'status', type: 'TEXT', notNull: true, defaultValue: 'ACTIVE' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'updated_at', type: 'TEXT', notNull: true },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_credential_vault', uniqueKeyColumns: ['id'] });
    // 42. CRM Credential Emergency Requests Table (보안 인증 비상 요청 대장)
    await safeCreateTable('보안 인증 비상 요청 대장', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'credential_id', type: 'INTEGER', notNull: true },
        { name: 'requester_id', type: 'INTEGER', notNull: true },
        { name: 'request_reason', type: 'TEXT', notNull: true },
        { name: 'status', type: 'TEXT', notNull: true, defaultValue: 'PENDING' },
        { name: 'approved_by', type: 'TEXT' },
        { name: 'approved_at', type: 'TEXT' },
        { name: 'expires_at', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_credential_emergency_requests', uniqueKeyColumns: ['id'] });
    // 43. CRM Credential Audit Logs Table (보안 인증 감사록)
    await safeCreateTable('보안 인증 감사록', [
        { name: 'id', type: 'INTEGER', notNull: true },
        { name: 'credential_id', type: 'INTEGER' },
        { name: 'operator_id', type: 'INTEGER' },
        { name: 'operator_name', type: 'TEXT' },
        { name: 'action_type', type: 'TEXT', notNull: true },
        { name: 'access_reason', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT', notNull: true },
        { name: 'uuid', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
        { name: 'updated_by', type: 'TEXT' },
        { name: 'deleted_at', type: 'TEXT' },
        { name: 'deleted_by', type: 'TEXT' },
        { name: 'restored_at', type: 'TEXT' },
        { name: 'restored_by', type: 'TEXT' }
    ], { tableName: 'crm_credential_audit_logs', uniqueKeyColumns: ['id'] });
    console.log('Database setup complete.');
}
