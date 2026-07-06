async function run() {
  const payload = {
    imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    filename: 'test_invoice.jpg',
    document_type: 'estimate',
    mimeType: 'image/jpeg'
  };

  try {
    console.log('Sending request to local dev server estimates ocr...');
    const res = await fetch('http://localhost:4000/api/estimates/ocr', {
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
