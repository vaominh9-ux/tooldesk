'use client';

import React, { useState } from 'react';
import { AppIcon, BrandLogoMark } from '@/components/shared/app-icon';

export function LoginPanel({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setPending(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'Email hoặc mật khẩu không chính xác.'
        );
      }

      setPassword('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi đăng nhập hệ thống.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="login-page-wrap">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-box" aria-hidden="true">
            <BrandLogoMark />
          </div>
          <h2 className="login-brand-title">
            tooldesk<span>.</span>
          </h2>
          <span className="login-brand-caption">QUẢN LÝ KINH DOANH TOOL AI</span>
        </div>

        {/* Intro */}
        <div className="login-intro">
          <h1>Đăng nhập quản trị</h1>
          <p>Truy cập dữ liệu kinh doanh, quản lý gói dịch vụ và gia hạn.</p>
        </div>

        {/* Error notification */}
        {error && (
          <div
            className="dialog-error"
            role="alert"
            style={{
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              padding: '10px 14px',
              borderRadius: 8
            }}
          >
            <AppIcon name="warning" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field" style={{ margin: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Email quản trị
            </span>
            <div className="login-input-group">
              <span className="login-input-icon">
                <AppIcon name="mail" size={16} />
              </span>
              <input
                className="login-input"
                type="email"
                name="email"
                autoComplete="username"
                required
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={pending}
              />
            </div>
          </label>

          <label className="field" style={{ margin: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Mật khẩu
            </span>
            <div className="login-input-group">
              <span className="login-input-icon">
                <AppIcon name="lock" size={16} />
              </span>
              <input
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={pending}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                tabIndex={-1}
              >
                <AppIcon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
          </label>

          <button type="submit" className="login-submit" disabled={pending}>
            {pending ? (
              <>
                <AppIcon name="refresh" size={16} />
                <span>Đang xác thực…</span>
              </>
            ) : (
              <>
                <span>Đăng nhập vào hệ thống</span>
                <AppIcon name="arrow" size={14} />
              </>
            )}
          </button>
        </form>

        {/* Security & System Footer */}
        <div className="login-footer-meta">
          <span>
            <AppIcon name="shield" size={13} />
            Bảo mật Supabase Auth & SSL
          </span>
          <span>Tooldesk v0.2</span>
        </div>
      </div>
    </div>
  );
}
