import {createHash, createHmac, randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {storage} from './storage';

export const SESSION_COOKIE = 'cd_admin';
const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const adminEmail = () => (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const secret = () => process.env.SESSION_SECRET || '';

export const authConfigured = () => Boolean(adminEmail() && secret().length >= 32 && (process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD));

/** Format: scrypt:<saltBase64>:<hashBase64>. Not `$`, which .env files expand as variables. */
export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('base64')}:${hash.toString('base64')}`;
}

function same(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

function passwordMatches(password: string) {
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (stored) {
    const [scheme, salt, hash] = stored.trim().split(/[:$]/);
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'base64');
    return same(scryptSync(password, Buffer.from(salt, 'base64'), expected.length), expected);
  }
  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) return false;
  const digest = (v: string) => createHash('sha256').update(v).digest();
  return same(digest(password), digest(plain));
}

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function createSession() {
  const payload = Buffer.from(JSON.stringify({e: adminEmail(), x: Date.now() + SESSION_DAYS * 864e5})).toString('base64url');
  return {value: `${payload}.${sign(payload)}`, maxAge: SESSION_DAYS * 86400};
}

export function readSession(token?: string | null) {
  if (!token || !authConfigured()) return null;
  const [payload, mac] = token.split('.');
  if (!payload || !mac || !same(Buffer.from(mac), Buffer.from(sign(payload)))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {e: string; x: number};
    if (data.e !== adminEmail() || data.x < Date.now()) return null;
    return {email: data.e};
  } catch { return null; }
}

export async function currentAdmin() {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

function cookieFrom(req: Request) {
  const raw = req.headers.get('cookie') || '';
  const hit = raw.split(';').map(s => s.trim()).find(s => s.startsWith(SESSION_COOKIE + '='));
  return hit ? decodeURIComponent(hit.slice(SESSION_COOKIE.length + 1)) : null;
}

/** For API routes: require a valid admin session and a same-origin request. */
export function authorize(req: Request) {
  if (!sameOrigin(req)) throw new Error('FORBIDDEN');
  if (!readSession(cookieFrom(req))) throw new Error('FORBIDDEN');
}

/** Browsers omit Origin on same-origin GETs; when present it must match the host the request was sent to. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  let host: string;
  try { host = new URL(origin).host; } catch { return false; }
  const hosts = [new URL(req.url).host, req.headers.get('x-forwarded-host'), req.headers.get('host')];
  return hosts.some(h => h && h.split(',')[0].trim() === host);
}

const clientKey = (req: Request) => {
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  return 'auth/' + createHash('sha256').update(ip).digest('hex').slice(0, 32);
};

export async function checkLogin(req: Request, email: string, password: string): Promise<'ok' | 'invalid' | 'locked' | 'unconfigured'> {
  if (!authConfigured()) return 'unconfigured';
  const key = clientKey(req);
  const store = storage();
  const now = Date.now();
  const record = (await store.getJSON<{fails: number; since: number}>(key)) || {fails: 0, since: now};
  const fresh = now - record.since > WINDOW_MS ? {fails: 0, since: now} : record;
  if (fresh.fails >= MAX_FAILS) return 'locked';
  const ok = email.trim().toLowerCase() === adminEmail() && passwordMatches(password);
  if (ok) { await store.remove(key); return 'ok'; }
  await store.setJSON(key, {fails: fresh.fails + 1, since: fresh.since});
  return fresh.fails + 1 >= MAX_FAILS ? 'locked' : 'invalid';
}
