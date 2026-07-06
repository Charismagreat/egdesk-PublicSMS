async function main() {
  try {
    const url = 'http://localhost:4000/api/finance?tab=cards&startDate=2026-05-27&endDate=2026-06-03&limit=10&offset=0';
    console.log("Fetching from:", url);
    const res = await fetch(url);
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Success:", data.success);
    if (data.success) {
      console.log("Total in response:", data.data.total);
      console.log("List length:", data.data.list.length);
      if (data.data.list.length > 0) {
        console.log("Sample item cardCompanyId:", data.data.list[0].cardCompanyId);
      }
    } else {
      console.log("Error response:", data);
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

main();
