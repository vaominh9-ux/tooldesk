'use client';

import React, { useState } from 'react';
import { AppIcon } from '@/components/shared/app-icon';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { DEFAULT_API_KEY } from '@/lib/agent-auth';

export function ApiIntegrationPanel() {
  const { addToast } = useTooldesk();
  const [showKey, setShowKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'curl' | 'chatgpt' | 'smax' | 'python'>('curl');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string; latency?: number }>({ status: 'idle' });

  const apiKey = DEFAULT_API_KEY;
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : 'https://tooldesk-plum.vercel.app/api/v1';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast('Đã sao chép', `Đã chép ${label} vào bộ nhớ tạm.`, 'success');
  };

  const handleTestPing = async () => {
    setTestResult({ status: 'loading' });
    const start = performance.now();
    try {
      const res = await fetch('/api/v1/health');
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        const json = await res.json();
        setTestResult({
          status: 'success',
          latency,
          message: `Kết nối thành công! Phiên bản: ${json.version} · Thời gian phản hồi: ${latency}ms`
        });
        addToast('Kiểm tra API thành công', `Hệ thống phản hồi trong ${latency}ms.`, 'success');
      } else {
        setTestResult({ status: 'error', message: `Lỗi máy chủ: ${res.status}` });
        addToast('Lỗi kiểm tra API', `Mã lỗi HTTP ${res.status}`, 'error');
      }
    } catch (err) {
      setTestResult({ status: 'error', message: err instanceof Error ? err.message : 'Không thể kết nối.' });
      addToast('Lỗi kết nối', 'Không thể gửi yêu cầu kiểm tra.', 'error');
    }
  };

  return (
    <article className="panel" style={{ marginTop: '24px' }}>
      <div className="section-heading">
        <div>
          <h2>API & Kết nối AI Agent hai chiều</h2>
          <p>Cho phép các hệ thống AI Agent bên ngoài (ChatGPT, Claude, Smax AI, n8n, Zalo/Messenger Bot) đọc và ghi dữ liệu tự động.</p>
        </div>
        <div className="section-meta">
          <span className="badge green">
            <i></i>API v1 Đang hoạt động
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* API Key Box */}
        <div style={{ background: '#f8f9fc', border: '1px solid #e2e6f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#4d5568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Secret API Key
            </span>
            <span className="badge green" style={{ fontSize: '11px', padding: '2px 8px' }}>Chính thức</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type={showKey ? 'text' : 'password'}
              readOnly
              value={apiKey}
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                background: '#ffffff',
                border: '1px solid #d2d7e5',
                borderRadius: '8px',
                padding: '8px 12px',
                flex: 1,
                color: '#1a2238'
              }}
            />
            <button
              type="button"
              className="button small"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Ẩn khóa' : 'Hiện khóa'}
              style={{ padding: '8px 12px' }}
            >
              <AppIcon name="eye" size={14} />
            </button>
            <button
              type="button"
              className="button small primary"
              onClick={() => copyToClipboard(apiKey, 'API Key')}
              title="Sao chép API Key"
              style={{ padding: '8px 14px' }}
            >
              <AppIcon name="check" size={14} />
              <span>Chép</span>
            </button>
          </div>
          <small style={{ display: 'block', marginTop: '8px', color: '#778197', fontSize: '11.5px' }}>
            Dùng trong Header: <code>Authorization: Bearer {apiKey.slice(0, 10)}...</code> hoặc <code>x-api-key</code>
          </small>
        </div>

        {/* Base URL Box */}
        <div style={{ background: '#f8f9fc', border: '1px solid #e2e6f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#4d5568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Base API Endpoint
            </span>
            <a
              href="/api/v1/openapi.json"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '11.5px', color: '#4353e8', textDecoration: 'none', fontWeight: 500 }}
            >
              Xem OpenAPI 3.0 (JSON) ↗
            </a>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={baseUrl}
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                background: '#ffffff',
                border: '1px solid #d2d7e5',
                borderRadius: '8px',
                padding: '8px 12px',
                flex: 1,
                color: '#1a2238'
              }}
            />
            <button
              type="button"
              className="button small"
              onClick={() => copyToClipboard(baseUrl, 'Base URL')}
              style={{ padding: '8px 14px' }}
            >
              <span>Chép</span>
            </button>
            <button
              type="button"
              className="button small"
              onClick={handleTestPing}
              disabled={testResult.status === 'loading'}
              style={{ padding: '8px 12px' }}
            >
              <AppIcon name="refresh" size={14} />
              <span>{testResult.status === 'loading' ? 'Đang test...' : 'Kiểm tra'}</span>
            </button>
          </div>

          {testResult.status !== 'idle' && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: testResult.status === 'success' ? '#15775c' : '#c0392b' }}>
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Guide Tabs */}
      <div style={{ borderTop: '1px solid #edf0f7', paddingTop: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[
            { id: 'curl', label: 'cURL / HTTP Request' },
            { id: 'chatgpt', label: 'OpenAI GPTs / Claude Action' },
            { id: 'smax', label: 'Chatbot Smax / Webhook' },
            { id: 'python', label: 'Python & Node.js' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`button small ${activeTab === tab.id ? 'primary' : ''}`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: cURL */}
        {activeTab === 'curl' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#4d5568' }}>
              <strong>1. Tra cứu bảng giá & sản phẩm (Đọc dữ liệu):</strong>
            </p>
            <pre style={{ margin: 0, padding: '12px', background: '#1c2237', color: '#e1e5f2', borderRadius: '8px', fontSize: '12px', overflowX: 'auto' }}>
{`curl -X GET "${baseUrl}/products" \\
  -H "Authorization: Bearer ${apiKey}"`}
            </pre>

            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#4d5568' }}>
              <strong>2. Tạo đơn hàng và tự động cấp gói cho khách (Ghi dữ liệu):</strong>
            </p>
            <pre style={{ margin: 0, padding: '12px', background: '#1c2237', color: '#e1e5f2', borderRadius: '8px', fontSize: '12px', overflowX: 'auto' }}>
{`curl -X POST "${baseUrl}/orders" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer": {
      "name": "Nguyễn Văn A",
      "phone": "0912345678",
      "email": "nguyenvana@gmail.com"
    },
    "productId": "p-claude",
    "planId": "pl-claude-1",
    "payment": "paid",
    "note": "Tạo tự động bởi AI Agent"
  }'`}
            </pre>

            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#4d5568' }}>
              <strong>3. Tra cứu thời hạn gói của khách theo SĐT:</strong>
            </p>
            <pre style={{ margin: 0, padding: '12px', background: '#1c2237', color: '#e1e5f2', borderRadius: '8px', fontSize: '12px', overflowX: 'auto' }}>
{`curl -X GET "${baseUrl}/customers?query=0912345678" \\
  -H "Authorization: Bearer ${apiKey}"`}
            </pre>
          </div>
        )}

        {/* Tab 2: ChatGPT / Claude */}
        {activeTab === 'chatgpt' && (
          <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#334155' }}>
            <p><strong>Cách kết nối Tooldesk vào Custom GPT hoặc Claude Projects:</strong></p>
            <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>
                Truy cập <strong>ChatGPT &gt; My GPTs &gt; Create &gt; Configure &gt; Actions &gt; Create new action</strong>.
              </li>
              <li>
                Trong mục <strong>Schema</strong>, chọn <strong>Import from URL</strong> và dán đường dẫn:
                <br />
                <code style={{ background: '#f1f4fa', padding: '3px 8px', borderRadius: '4px', display: 'inline-block', margin: '4px 0' }}>
                  {baseUrl}/openapi.json
                </code>
              </li>
              <li>
                Trong mục <strong>Authentication</strong>, chọn <strong>API Key</strong> &gt; Auth Type: <strong>Bearer</strong> &gt; Dán API Key:
                <br />
                <code style={{ background: '#f1f4fa', padding: '3px 8px', borderRadius: '4px', display: 'inline-block', margin: '4px 0' }}>
                  {apiKey}
                </code>
              </li>
              <li>
                Lưu GPT. Bây giờ Custom GPT hoặc Claude của bạn có thể tự động tra cứu gói tool, kiểm tra hạn dùng và tạo đơn hàng trực tiếp cho khách!
              </li>
            </ol>
          </div>
        )}

        {/* Tab 3: Smax AI */}
        {activeTab === 'smax' && (
          <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#334155' }}>
            <p><strong>Cấu hình Webhook trong kịch bản Chatbot Smax.ai (Messenger / Zalo):</strong></p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>
                <strong>Thẻ HTTP Request</strong> trong Smax Bot Flow:
                <ul>
                  <li>Method: <code>POST</code></li>
                  <li>URL: <code>{baseUrl}/orders</code></li>
                  <li>Headers: <code>Authorization: Bearer {apiKey}</code>, <code>Content-Type: application/json</code></li>
                  <li>Body (JSON):
                    <pre style={{ margin: '6px 0', padding: '10px', background: '#1c2237', color: '#e1e5f2', borderRadius: '6px', fontSize: '12px' }}>
{`{
  "customer": {
    "name": "{{customer_name}}",
    "phone": "{{customer_phone}}"
  },
  "productId": "{{selected_product_id}}",
  "planId": "{{selected_plan_id}}",
  "payment": "unpaid",
  "note": "Khách đặt từ Messenger Fanpage qua Smax"
}`}
                    </pre>
                  </li>
                </ul>
              </li>
              <li>Khi khách chuyển khoản, kịch bản tự động gọi <code>POST {baseUrl}/orders/DH-.../pay</code> để hoàn tất đơn và kích hoạt gói ngay lập tức!</li>
            </ul>
          </div>
        )}

        {/* Tab 4: Python */}
        {activeTab === 'python' && (
          <div>
            <pre style={{ margin: 0, padding: '12px', background: '#1c2237', color: '#e1e5f2', borderRadius: '8px', fontSize: '12px', overflowX: 'auto' }}>
{`import requests

API_KEY = "${apiKey}"
BASE_URL = "${baseUrl}"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# 1. Tra cứu các gói ChatGPT & Claude
res = requests.get(f"{BASE_URL}/products", headers=headers)
print("Sản phẩm:", res.json())

# 2. Tạo đơn hàng tự động cho khách
new_order = {
    "customer": {"name": "Lê Hoàng Yến", "phone": "0988776655"},
    "productId": "p-claude",
    "planId": "pl-claude-1",
    "payment": "paid",
    "note": "Agent Python tự động cấp tài khoản"
}
order_res = requests.post(f"{BASE_URL}/orders", json=new_order, headers=headers)
print("Kết quả tạo đơn:", order_res.json())`}
            </pre>
          </div>
        )}
      </div>
    </article>
  );
}
