require('dotenv').config({ path: '.env.development.local' });
const { queryTable } = require('../egdesk-helpers');
const bcrypt = require('bcryptjs');
const { SignJWT } = require('jose');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'egdesk-super-secret-key');

async function testLogin(username, password) {
  try {
    console.log(`\n--- Testing Login for [${username}] ---`);
    const result = await queryTable('crm_operators', { filters: { username } });
    if (!result.rows || result.rows.length === 0) {
      console.log('User not found in DB');
      return;
    }
    const user = result.rows[0];
    console.log(`User found: ID=${user.id}, Username=${user.username}, Role=${user.role}`);
    console.log(`Password Hash in DB: ${user.password_hash}`);

    console.log('Comparing password...');
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('Password comparison result:', isValid);

    if (isValid) {
      console.log('Generating JWT Token...');
      const token = await new SignJWT({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id || 'tenant-default-id'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);
      console.log('JWT generated successfully:', token.substring(0, 30) + '...');
    }
  } catch (error) {
    console.error('Error during login check:', error);
  }
}

async function main() {
  await testLogin('admin', 'admin123');
  await testLogin('guest', 'guest123'); // guest 비밀번호를 임의로 guest123 또는 guest로 가정해봄
  await testLogin('guest', 'guest');
}

main();
