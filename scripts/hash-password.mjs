// Usage: pnpm hash-password "your-password"
// Prints values to paste into Netlify → Site configuration → Environment variables.
import {randomBytes, scryptSync} from 'node:crypto';

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Usage: pnpm hash-password "your-password"   (at least 8 characters)');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString('base64')}:${hash.toString('base64')}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('base64url')}`);
