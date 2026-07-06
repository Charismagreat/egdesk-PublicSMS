async function run() {
  const payload = {
    key: 'google_ai_api_key',
    value: 'wonconduct'
  };

  try {
    console.log('Sending settings save request to local dev server...');
    const res = await fetch('http://localhost:4000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response JSON:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

run();
