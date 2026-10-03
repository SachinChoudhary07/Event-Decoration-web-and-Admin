'use client';
import {useState} from 'react';
import {Lock} from 'lucide-react';

export function Login({configured}: {configured: boolean}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password})});
      const j = await r.json() as {error?: string};
      if (!r.ok) throw Error(j.error || 'Could not sign in');
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return <div className='center-state'>
    <div className='emoji' aria-hidden><Lock size={32} /></div>
    <h1>Admin login</h1>
    {!configured
      ? <p>Admin login is not set up yet. Add <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD_HASH</code> and <code>SESSION_SECRET</code> in the hosting environment settings, then redeploy.</p>
      : <form className='login-form' onSubmit={submit} noValidate>
          <label className='field'>Email<input type='email' autoComplete='username' value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label className='field'>Password<input type='password' autoComplete='current-password' value={password} onChange={e => setPassword(e.target.value)} required /></label>
          {error && <p className='err' role='alert'>{error}</p>}
          <button className='btn btn-primary btn-block' disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>}
    <a className='btn btn-ghost' href='/'>Back to website</a>
  </div>;
}
