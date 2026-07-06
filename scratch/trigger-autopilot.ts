import { updateRows, queryTable } from '../egdesk-helpers';

async function main() {
  console.log('--- Simulating Autopilot Run ---');
  try {
    // 1. 오토파일럿 활성화 (임시)
    console.log('Step 1: Enabling autopilot temporarily in settings...');
    await updateRows('instagram_marketing_settings', { is_autopilot: 1 }, { filters: { id: '1' } });

    // 2. 오토파일럿 스케줄러 API 호출
    console.log('Step 2: Triggering autopilot scheduler API...');
    const res = await fetch('http://localhost:3000/api/instagram/scheduler');
    console.log(`Response Status: ${res.status}`);
    const data: any = await res.json();
    console.log('Response JSON:', data);

    // 3. 다시 오토파일럿 비활성화 (기본 상태인 수동 검토로 원복)
    console.log('Step 3: Restoring autopilot settings to manual mode...');
    await updateRows('instagram_marketing_settings', { is_autopilot: 0 }, { filters: { id: '1' } });

    // 4. 생성된 포스팅 데이터 확인
    console.log('\n--- Scheduled Post Verification ---');
    const postsRes = await queryTable('crm_instagram_posts', {});
    console.log(`Current crm_instagram_posts row count: ${postsRes.rows ? postsRes.rows.length : 0}`);
    if (postsRes.rows && postsRes.rows.length > 0) {
      console.log('Latest Scheduled Post Details:', postsRes.rows[0]);
    }
  } catch (error: any) {
    console.error('Autopilot test failed:', error.message);
  }
}

main();
