async function run() {
  try {
    console.log("Triggering Next.js DB Setup API...");
    const res = await fetch("http://localhost:4003/api/setup");
    const json = await res.json();
    console.log("Response:", json);
  } catch (err) {
    console.error("Setup API failed:", err);
  }
}

run();
