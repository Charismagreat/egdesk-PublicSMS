import { queryTable } from '../../egdesk-helpers';

export async function triggerAutomation(eventId: string, payload: { name: string, phone: string, [key: string]: any }) {
  try {
    console.log(`[Automation] Checking rules for event: ${eventId}`);
    
    // 1. Fetch settings
    const settings = await queryTable('system_settings', {});
    const ruleRow = settings.rows?.find((r: any) => r.key === 'automation_rules');
    if (!ruleRow) return;
    
    const rules = JSON.parse(ruleRow.value);
    const rule = rules[eventId];
    
    // 2. Check if enabled
    if (!rule || !rule.enabled || !rule.templateId) {
      console.log(`[Automation] Event ${eventId} is disabled or has no template.`);
      return;
    }

    // 3. Fetch template
    const templatesRes = await queryTable('message_templates', {});
    const template = templatesRes.rows?.find((t: any) => t.id === rule.templateId);
    
    if (!template) {
      console.error(`[Automation] Template ID ${rule.templateId} not found.`);
      return;
    }

    // 4. Replace variables in content
    let messageContent = template.content;
    messageContent = messageContent.replace(/{이름}/g, payload.name || '');
    messageContent = messageContent.replace(/{고객명}/g, payload.name || '');
    messageContent = messageContent.replace(/{연락처}/g, payload.phone || '');
    
    // 명시적인 포인트 관련 럭셔리 변수 치환 보강
    if (payload.적립포인트 !== undefined) {
      const formatted = Number(payload.적립포인트).toLocaleString();
      messageContent = messageContent.replace(/{적립포인트}/g, formatted);
    }
    if (payload.차감포인트 !== undefined) {
      const formatted = Number(payload.차감포인트).toLocaleString();
      messageContent = messageContent.replace(/{차감포인트}/g, formatted);
    }
    if (payload.잔여포인트 !== undefined) {
      const formatted = Number(payload.잔여포인트).toLocaleString();
      messageContent = messageContent.replace(/{잔여포인트}/g, formatted);
    }

    // Optional: Add more variables dynamically based on payload keys
    for (const key of Object.keys(payload)) {
      const regex = new RegExp(`{${key}}`, 'g');
      messageContent = messageContent.replace(regex, payload[key]);
    }

    console.log(`[Automation] Triggering SMS for ${payload.phone} (Event: ${eventId})`);

    // 5. Fire and forget to SMS API to avoid blocking the current request
    // We assume the Next.js server is running on localhost:3000
    // Using absolute URL for server-side fetch
    const appPort = process.env.PORT || '4000';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${appPort}`;
    fetch(`${appUrl}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: payload.phone,
        message: messageContent,
        customerId: payload.id || null
      })
    }).catch(e => console.error('[Automation] Background SMS fetch failed:', e));
    
  } catch (error) {
    console.error(`[Automation] Error processing event ${eventId}:`, error);
  }
}
