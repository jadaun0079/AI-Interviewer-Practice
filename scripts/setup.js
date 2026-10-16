// Creates backend/.env from backend/.env.example and generates a strong JWT secret.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dir = path.join(__dirname, '..', 'backend');
const target = path.join(dir, '.env');

if (fs.existsSync(target)) {
  console.log('backend/.env already exists, leaving it unchanged.');
  process.exit(0);
}
const secret = crypto.randomBytes(48).toString('hex');
const text = fs
  .readFileSync(path.join(dir, '.env.example'), 'utf8')
  .replace(/^JWT_ACCESS_SECRET=.*$/m, `JWT_ACCESS_SECRET=${secret}`);
fs.writeFileSync(target, text);
console.log('Created backend/.env with a fresh JWT secret.');
console.log('Now open backend/.env and fill in two values:');
console.log('  MONGODB_URI       your MongoDB Atlas connection string');
console.log('  ANTHROPIC_API_KEY your Anthropic API key');
