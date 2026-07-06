async function main() {
  const saveVal = async (key, value) => {
    const res = await fetch('http://localhost:4000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    return res.json();
  };

  try {
    console.log('Restoring original SMTP settings to Next.js API...');
    const res1 = await saveVal('email_smtp_host', 'smtp.gmail.com');
    const res2 = await saveVal('email_smtp_port', '465');
    const res3 = await saveVal('email_smtp_user', 'chachogreat@gmail.com');
    const res4 = await saveVal('email_smtp_pass', 'wlaw rfsv blrc xmey');
    
    console.log('Results:', { res1, res2, res3, res4 });
  } catch (err) {
    console.error('에러:', err);
  }
}

main();
