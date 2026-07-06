async function testRss() {
  try {
    const rssUrl = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do";
    const res = await fetch(rssUrl);
    const text = await res.text();
    console.log("=== XML Content Preview (First 2000 chars) ===");
    console.log(text.substring(0, 2000));
  } catch (err) {
    console.error("Error fetching RSS:", err);
  }
}

testRss();
