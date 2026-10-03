import {SESSION_COOKIE} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return Response.json({error: 'Invalid request'}, {status: 403});
  return Response.json({ok: true}, {headers: {'Set-Cookie': `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`}});
}
