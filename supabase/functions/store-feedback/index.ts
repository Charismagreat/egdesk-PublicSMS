// Supabase Edge Function: store-feedback
// 목적: 사이트(클라이언트)에서 API 키 없이 POST 요청을 보내면 피드백을 DB에 저장

import { createClient } from "npm:@supabase/supabase-js@2.49.1";

type FeedbackPayload = {
  name?: string;
  email?: string;
  message: string;
  page_url?: string;
  user_agent?: string;
  client_id?: string;
};

const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 320;
const MAX_URL_LENGTH = 500;
const MAX_UA_LENGTH = 500;

function asString(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  return undefined;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: FeedbackPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = asString(payload?.message);
  if (!message || message.trim().length < 5) {
    return new Response(JSON.stringify({ error: "message is required (min 5 chars)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return new Response(JSON.stringify({ error: `message too long (max ${MAX_MESSAGE_LENGTH})` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const name = asString(payload?.name)?.slice(0, MAX_NAME_LENGTH);
  const email = asString(payload?.email)?.slice(0, MAX_EMAIL_LENGTH);
  const page_url = asString(payload?.page_url)?.slice(0, MAX_URL_LENGTH);
  const user_agent = asString(payload?.user_agent)?.slice(0, MAX_UA_LENGTH);
  const client_id = asString(payload?.client_id)?.slice(0, 255);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: { persistSession: false },
    }
  );

  // Edge Function은 service_role로 INSERT하여 RLS 정책과 무관하게 저장됩니다.
  // 따라서 테이블에 대한 직접 public insert는 차단(revoke)해두는 걸 권장합니다.
  const remoteIp = req.headers.get("x-forwarded-for") || "";

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      name: name || null,
      email: email || null,
      message: message.trim(),
      page_url: page_url || null,
      user_agent: user_agent || req.headers.get("user-agent") || null,
      remote_ip: remoteIp || null,
      client_id: client_id || null,
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("insert error", error);
    return new Response(JSON.stringify({ error: "Failed to store feedback" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, feedback: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
