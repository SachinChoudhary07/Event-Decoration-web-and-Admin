import {checkLogin, createSession, sameOrigin, SESSION_COOKIE} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({error: 'Invalid request'}, {status: 403});
  let email = '', password = '';
  try {
    const body = await req.json() as {email?: unknown; password?: unknown};
    email = typeof body.email === 'string' ? body.email.slice(0, 200) : '';
    password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
  } catch { return Response.json({error: 'Invalid request'}, {status: 400}); }
  if (!email || !password) return Response.json({error: 'Enter your email and password'}, {status: 400});

  const result = await checkLogin(req, email, password);
  if (result === 'unconfigured') return Response.json({error: 'Admin login is not set up yet. Add ADMIN_EMAIL, ADMIN_PASSWORD_HASH and SESSION_SECRET in the hosting settings.'}, {status: 503});
  if (result === 'locked') return Response.json({error: 'Too many attempts. Please wait 15 minutes and try again.'}, {status: 429});
  if (result === 'invalid') return Response.json({error: 'Email or password is incorrect'}, {status: 401});

  const session = createSession();
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim() || new URL(req.url).protocol.replace(':', '');
  const secure = proto === 'https';
  return Response.json({ok: true}, {headers: {
    'Set-Cookie': `${SESSION_COOKIE}=${session.value}; Path=/; Max-Age=${session.maxAge}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
    'Cache-Control': 'no-store',
  }});
}
