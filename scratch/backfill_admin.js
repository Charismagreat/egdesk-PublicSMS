const helpers = require('../egdesk-helpers');
const bcrypt = require('bcryptjs');

async function backfill() {
  try {
    const password_hash = await bcrypt.hash('admin123', 10);
    const dateStr = new Date().toISOString();

    // 1. 기존 id=1인 admin 계정 업데이트
    const updateRes = await helpers.updateRows('crm_operators', {
      password_hash: password_hash,
      tenant_id: 'tenant-admin-id-1111',
      role: 'SUPER_ADMIN',
      name: '최고관리자',
      updated_at: dateStr
    }, {
      filters: { username: 'admin' }
    });

    console.log("=== Backfill admin update result ===");
    console.log(JSON.stringify(updateRes, null, 2));

    // 2. 혹시 guest 계정(id=2)도 테넌트 격리 문제 방지를 위해 함께 생성/업데이트
    // crm_operators에 guest(id=2)가 존재하는지 먼저 체크
    const checkGuest = await helpers.queryTable('crm_operators', { filters: { username: 'guest' } });
    if (!checkGuest.rows || checkGuest.rows.length === 0) {
      const guest_password_hash = await bcrypt.hash('1234', 10);
      const insertRes = await helpers.insertRows('crm_operators', [
        {
          id: 2,
          username: 'guest',
          password_hash: guest_password_hash,
          name: '테스트게스트',
          role: 'SUPER_ADMIN',
          tenant_id: 'tenant-guest-id-2222',
          created_at: dateStr
        }
      ]);
      console.log("=== Seeding guest result ===");
      console.log(JSON.stringify(insertRes, null, 2));
    } else {
      const guest_password_hash = await bcrypt.hash('1234', 10);
      const updateGuestRes = await helpers.updateRows('crm_operators', {
        password_hash: guest_password_hash,
        tenant_id: 'tenant-guest-id-2222',
        role: 'SUPER_ADMIN',
        updated_at: dateStr
      }, {
        filters: { username: 'guest' }
      });
      console.log("=== Backfill guest update result ===");
      console.log(JSON.stringify(updateGuestRes, null, 2));
    }

  } catch (err) {
    console.error("Backfill failed:", err);
  }
}

backfill();
