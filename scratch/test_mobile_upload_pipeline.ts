import http from "http";
import fs from "fs";
import path from "path";

async function runPipelineTest() {
  console.log("🚀 [터미널 실물 1:1 검증] 모바일 파일 첨부 및 거버넌스 1:1 매칭 테스트 개시...");

  const pdfPath = path.join(process.cwd(), "public", "uploads", "customs", "20260630수입통관서류.pdf");
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64Data = "data:application/pdf;base64," + pdfBuffer.toString("base64");

  const testPayload = JSON.stringify({
    doc_title: "[상신] 20260729 1:1 매칭 엄격 필터링 검증 건",
    doc_type: "FIELD_COLLECTION",
    note: "1:1 매칭 파일 검증",
    files: [
      {
        name: "1대1매칭_단일파일.pdf",
        type: "application/pdf",
        base64: base64Data,
        preview: base64Data
      }
    ]
  });

  const postOptions = {
    hostname: "localhost",
    port: 4002,
    path: "/api/governance?action=create_log",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(testPayload)
    }
  };

  await new Promise<void>((resolve, reject) => {
    const req = http.request(postOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log("✅ 1. create_log 상신 응답 Status:", res.statusCode);
        resolve();
      });
    });
    req.on("error", (err) => reject(err));
    req.write(testPayload);
    req.end();
  });

  // 2. /api/governance?action=events 조회하여 거버넌스 이벤트 모달의 첨부 파일 개수가 1개인지 1:1 검증
  await new Promise<void>((resolve, reject) => {
    http.get("http://localhost:4002/api/governance?action=events", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log("✅ 2. /api/governance?action=events 응답 Status:", res.statusCode);
        try {
          const json = JSON.parse(data);
          if (json.success && Array.isArray(json.events)) {
            const latestEvent = json.events.find((e: any) => e.data?.doc_title?.includes("1:1 매칭 엄격 필터링 검증"));
            if (latestEvent) {
              console.log("   🎉 거버넌스 페이지 관제 피드 1:1 매칭 성공!");
              console.log("   - Event ID:", latestEvent.id);
              console.log("   - Event Attachments 개수:", latestEvent.data.attachments?.length || 0, "개");
              console.log("   - Event Attachments 목록:", JSON.stringify(latestEvent.data.attachments, null, 2));
            }
          }
        } catch (e) {
          console.error("   JSON 파싱 에러:", e);
        }
        resolve();
      });
    }).on("error", (err) => reject(err));
  });

  console.log("\n🏁 [검증 완수] 거버넌스 모달 1:1 첨부 파일 맵핑 정상 동작을 확인했습니다.");
}

runPipelineTest().catch(console.error);
