import http from "http";

http.get("http://localhost:4002/api/governance?action=events", (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      if (json.events) {
        console.log("=== Total Events Count:", json.events.length);
        const mobileEvents = json.events.filter((e: any) => e.data?.doc_type === 'mobile_request' || e.data?.doc_type === 'mobile_req');
        console.log("=== Mobile Events Count:", mobileEvents.length);
        mobileEvents.slice(0, 5).forEach((e: any) => {
          console.log(`\nEvent ID: ${e.id}`);
          console.log(`Doc ID: ${e.data?.doc_id}`);
          console.log(`Doc Title: ${e.data?.doc_title}`);
          console.log(`Attachments (${e.data?.attachments?.length || 0}개):`, JSON.stringify(e.data?.attachments, null, 2));
        });
      }
    } catch (err) {
      console.error(err);
    }
  });
});
