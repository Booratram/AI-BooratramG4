import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('pilot-admin@bg-studio.ai');
  const [password, setPassword] = useState('change-me');
  const [tenantSlug, setTenantSlug] = useState('bg-studio-ai');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await login({ email, password, tenantSlug });
      navigate(session.user.role === 'SUPER_ADMIN' ? '/admin/tenants' : '/client/dashboard', { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-ink/10 bg-white p-8 shadow-card">
        <div className="inline-flex rounded-full bg-coral px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
          BooratramG4 Login
        </div>
        <h1 className="mt-4 font-display text-4xl font-semibold text-ink">Sign in to the pilot</h1>
        <p className="mt-3 text-sm leading-7 text-ink/65">
          Seeded dev account is prefilled. After infrastructure is live, this screen works against the real backend API.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-ink/70">
            Email
            <input className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm text-ink/70">
            Password
            <input className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="block text-sm text-ink/70">
            Tenant slug
            <input className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3" value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)} />
          </label>

          {error ? <div className="rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div> : null}

          <button className="w-full rounded-2xl bg-ink px-5 py-3 font-medium text-white" disabled={loading} type="submit">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
