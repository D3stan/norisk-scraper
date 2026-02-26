import bcrypt from 'bcrypt';

const password = process.argv[2];

if (!password) {
    console.error('Usage: node scripts/hash-password.js <password>');
    process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log('\nAdd this to your .env file:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
