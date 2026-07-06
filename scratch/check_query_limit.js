const http = require('http');

const requestData = JSON.stringify({
  tool: 'user_data_query',
  arguments: {
    tableName: 'crm_grant_announcements',
    options: {}
  }
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 8080,
  path: '/user-data/tools/call',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0',
    'Content-Length': Buffer.byteLength(requestData)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log("Response Success:", data.success);
      if (data.success && data.result && data.result.content) {
        const text = data.result.content[0].text;
        const resultObj = JSON.parse(text);
        console.log("Returned rows count:", resultObj.rows ? resultObj.rows.length : 0);
        if (resultObj.rows && resultObj.rows.length > 0) {
          console.log("First returned row ID:", resultObj.rows[0].id);
          console.log("Last returned row index ID:", resultObj.rows[resultObj.rows.length - 1].id);
        }
      } else {
        console.log("Error:", data.error);
      }
    } catch (e) {
      console.error("Parse error:", e);
      console.log("Raw body:", body);
    }
  });
});

req.on('error', e => console.error("Request error:", e));
req.write(requestData);
req.end();
