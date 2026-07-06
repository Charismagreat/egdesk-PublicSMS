const { getGeminiApiKey } = require('./egdesk-helpers.js');
async function test() {
  try {
    const res = await getGeminiApiKey();
    console.log("Res:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
