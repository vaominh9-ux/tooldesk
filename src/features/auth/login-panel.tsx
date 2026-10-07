'use client';
import { useState } from 'react';
export function LoginPanel({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [pending, setPending] = useState(false);
  return <form className="panel settings-form" style={{ maxWidth: 440, margin: '48px auto', padding: 24 }} onSubmit={async event => {
    event.preventDefault(); setPending(true); setError('');
    try { const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); if (!response.ok) throw new Error('Không thể đăng nhập. Kiểm tra tài khoản và cấu hình.'); setPassword(''); onSuccess(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Lỗi đăng nhập.'); } finally { setPending(false); }
  }}><h1>Đăng nhập Tooldesk</h1><p className="dialog-note">Dùng tài khoản Supabase Auth được quản trị viên cấp quyền.</p>{error && <p className="dialog-error" role="alert">{error}</p>}<label className="field"><span>Email</span><input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label><label className="field"><span>Mật khẩu</span><input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label><button className="button primary" disabled={pending}>{pending ? 'Đang đăng nhập…' : 'Đăng nhập'}</button></form>;
}
