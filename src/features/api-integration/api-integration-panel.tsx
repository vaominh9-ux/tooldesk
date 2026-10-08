'use client';

import React, { useEffect, useState } from 'react';
import { AppIcon } from '@/components/shared/app-icon';
import { useTooldesk } from '@/features/context/tooldesk-context';

export function ApiIntegrationPanel() {
  const { addToast } = useTooldesk();
  const [showKey, setShowKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'curl' | 'chatgpt' | 'smax' | 'python'>('curl');
  const [configuredKey, setConfiguredKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('/api/v1');
  const [keyMessage, setKeyMessage] = useState('');
  useEffect(() => {
    setBaseUrl(`${window.location.origin}/api/v1`);
    let mounted = true;
    fetch('/api/settings/agent', { cache: 'no-store' }).then(async response => {
      const value: unknown = await response.json();
      if (!response.ok) throw new Error('Chỉ quản trị viên đã đăng nhập có thể xem khóa API.');
      if (!value || typeof value !== 'object' || !('apiKey' in value) || typeof value.apiKey !== 'string') throw new Error('Không đọc được cấu hình API.');
      if (mounted) { setConfiguredKey(value.apiKey); setKeyMessage(value.apiKey ? '' : 'Chưa cấu hình khóa API trên máy chủ.'); }
    }).catch(error => { if (mounted) setKeyMessage(error instanceof Error ? error.message : 'Không tải được cấu hình API.'); });
    return () => { mounted = false; };
  }, []);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const apiKey = configuredKey || 'YOUR_API_KEY';

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('Đã sao chép', `Đã chép ${label} vào bộ nhớ tạm.`, 'success');
    } catch {
      addToast('Không thể sao chép', 'Trình duyệt chưa cho phép truy cập bộ nhớ tạm.', 'error');
    }
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
          message: `Kết nối thành công! Phiên bản: ${json.version} · Thời gian phản hồi: ${latency}ms.`
        });
        addToast('Kiểm tra API thành công', `Hệ thống phản hồi trong ${latency}ms.`, 'success');
      } else {
        setTestResult({ status: 'error', message: `Lỗi kết nối máy chủ: HTTP ${res.status}.` });
        addToast('Lỗi kiểm tra API', `Mã lỗi HTTP ${res.status}`, 'error');
      }
    } catch (err) {
      setTestResult({ status: 'error', message: err instanceof Error ? err.message : 'Không thể kết nối API.' });
      addToast('Lỗi kết nối', 'Không thể gửi yêu cầu kiểm tra.', 'error');
    }
  };

  return (
    <article id="api-integration" className="panel" style={{ marginTop: '22px' }}>
      <div className="section-heading">
        <div>
          <h2>API & Kết nối AI Agent</h2>
          <p>Cung cấp giao diện đọc và ghi dữ liệu tự động cho ChatGPT, Claude, Smax AI, n8n, Zalo và Messenger Bot.</p>
        </div>
        <span className={`badge ${configuredKey ? 'green' : 'neutral'}`}>{configuredKey ? 'API v1 đã cấu hình' : 'API v1 chưa cấu hình'}</span>
      </div>

      <div className="settings-form">
        {keyMessage && <p className="dialog-note">{keyMessage}</p>}
        <div className="form-grid">
          <label className="field">
            <span>Secret API Key</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type={showKey ? 'text' : 'password'}
                readOnly
                value={configuredKey}
                placeholder="Chưa có khóa API"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
              />
              <button
                type="button"
                className="button"
                onClick={() => setShowKey(!showKey)}
                disabled={!configuredKey}
                title={showKey ? 'Ẩn khóa' : 'Hiện khóa'}
                style={{ flexShrink: 0 }}
              >
                <AppIcon name="eye" size={15} />
                <span>{showKey ? 'Ẩn' : 'Hiện'}</span>
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => copyToClipboard(apiKey, 'API Key')}
                disabled={!configuredKey}
                style={{ flexShrink: 0 }}
              >
                <AppIcon name="check" size={15} />
                <span>Chép</span>
              </button>
            </div>
            <small>Xác thực qua Header: <code>Authorization: Bearer &lt;API_KEY&gt;</code> hoặc <code>x-api-key: &lt;API_KEY&gt;</code></small>
          </label>

          <label className="field">
            <span>Base Endpoint URL</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={baseUrl}
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
              />
              <button
                type="button"
                className="button"
                onClick={() => copyToClipboard(baseUrl, 'Base URL')}
                style={{ flexShrink: 0 }}
              >
                <span>Chép</span>
              </button>
            </div>
            <small>Đường dẫn gốc cho tất cả yêu cầu đọc danh mục, kiểm tra hạn dùng và tạo đơn hàng.</small>
          </label>
        </div>

        {testResult.status !== 'idle' && (
          <div
            className={`hint-banner ${testResult.status === 'success' ? 'blue' : 'amber'}`}
            style={{ marginTop: '16px', marginBottom: '0' }}
          >
            <AppIcon name={testResult.status === 'success' ? 'circleCheck' : 'warning'} size={18} />
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="form-section-title" style={{ marginTop: '24px' }}>
          Tài liệu & Kịch bản tích hợp
        </div>

        <div className="tabs" style={{ padding: 0, marginBottom: '16px' }}>
          <button
            type="button"
            className={`tab ${activeTab === 'curl' ? 'selected' : ''}`}
            onClick={() => setActiveTab('curl')}
          >
            cURL / HTTP Request
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'chatgpt' ? 'selected' : ''}`}
            onClick={() => setActiveTab('chatgpt')}
          >
            ChatGPT / Claude Action
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'smax' ? 'selected' : ''}`}
            onClick={() => setActiveTab('smax')}
          >
            Chatbot Smax (Zalo/Messenger)
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'python' ? 'selected' : ''}`}
            onClick={() => setActiveTab('python')}
          >
            Python & Node.js
          </button>
        </div>

        {/* Tab 1: cURL */}
        {activeTab === 'curl' && (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <span className="strong" style={{ fontSize: '13px' }}>1. Tra cứu bảng giá & danh mục tool AI (Đọc dữ liệu):</span>
              <pre className="draft-preview" style={{ padding: '12px 14px', margin: '8px 0 0', fontSize: '12px', lineHeight: 1.6 }}>
{`curl -X GET "${baseUrl}/products" \\
  -H "Authorization: Bearer ${apiKey}"`}
              </pre>
            </div>

            <div>
              <span className="strong" style={{ fontSize: '13px' }}>2. Tạo đơn hàng và tự động kích hoạt gói dịch vụ (Ghi dữ liệu):</span>
              <pre className="draft-preview" style={{ padding: '12px 14px', margin: '8px 0 0', fontSize: '12px', lineHeight: 1.6 }}>
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
            </div>

            <div>
              <span className="strong" style={{ fontSize: '13px' }}>3. Tra cứu thời hạn gói của khách theo Số điện thoại:</span>
              <pre className="draft-preview" style={{ padding: '12px 14px', margin: '8px 0 0', fontSize: '12px', lineHeight: 1.6 }}>
{`curl -X GET "${baseUrl}/customers?query=0912345678" \\
  -H "Authorization: Bearer ${apiKey}"`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: ChatGPT / Claude */}
        {activeTab === 'chatgpt' && (
          <div className="hint-banner neutral" style={{ display: 'block', margin: 0 }}>
            <p className="strong" style={{ marginBottom: '8px', color: 'var(--ink)' }}>
              Kết nối Tooldesk vào Custom GPT hoặc Claude Projects:
            </p>
            <ol style={{ paddingLeft: '18px', margin: 0, lineHeight: 1.8 }}>
              <li>
                Trong phần thiết lập Custom GPT, chọn <strong>Configure &gt; Actions &gt; Create new action</strong>.
              </li>
              <li>
                Ở mục <strong>Schema</strong>, chọn <strong>Import from URL</strong> và dán:
                <br />
                <code style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--line)', display: 'inline-block', margin: '4px 0' }}>
                  {baseUrl}/openapi.json
                </code>
              </li>
              <li>
                Ở mục <strong>Authentication</strong>, chọn <strong>API Key</strong> &gt; Auth Type: <strong>Bearer</strong> &gt; Dán Secret Key của bạn.
              </li>
              <li>
                Bây giờ Custom GPT hoặc Claude có thể tự động tra cứu gói tool, kiểm tra hạn dùng và tạo đơn trực tiếp cho khách hàng.
              </li>
            </ol>
          </div>
        )}

        {/* Tab 3: Smax AI */}
        {activeTab === 'smax' && (
          <div className="hint-banner neutral" style={{ display: 'block', margin: 0 }}>
            <p className="strong" style={{ marginBottom: '8px', color: 'var(--ink)' }}>
              Cấu hình Webhook trong kịch bản Chatbot Smax.ai (Zalo / Messenger Fanpage):
            </p>
            <ul style={{ paddingLeft: '18px', margin: 0, lineHeight: 1.8 }}>
              <li>Thêm thẻ <strong>HTTP Request</strong> trong Bot Flow với thông số:</li>
              <li>Method: <code>POST</code></li>
              <li>URL: <code>{baseUrl}/orders</code></li>
              <li>Headers: <code>Authorization: Bearer {apiKey}</code>, <code>Content-Type: application/json</code></li>
              <li>Body (JSON):
                <pre className="draft-preview" style={{ padding: '10px 12px', margin: '6px 0', fontSize: '12px', lineHeight: 1.5 }}>
{`{
  "customer": {
    "name": "{{customer_name}}",
    "phone": "{{customer_phone}}"
  },
  "productId": "{{selected_product_id}}",
  "planId": "{{selected_plan_id}}",
  "payment": "unpaid",
  "note": "Khách đặt qua Fanpage Smax"
}`}
                </pre>
              </li>
              <li>Khi khách thanh toán chuyển khoản, bot gọi tiếp <code>POST {baseUrl}/orders/DH-.../pay</code> để kích hoạt gói dịch vụ.</li>
            </ul>
          </div>
        )}

        {/* Tab 4: Python */}
        {activeTab === 'python' && (
          <div>
            <pre className="draft-preview" style={{ padding: '12px 14px', margin: 0, fontSize: '12px', lineHeight: 1.6 }}>
{`import requests

API_KEY = "${apiKey}"
BASE_URL = "${baseUrl}"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# 1. Tra cứu các gói sản phẩm
products = requests.get(f"{BASE_URL}/products", headers=headers).json()
print("Sản phẩm:", products)

# 2. Tạo đơn hàng tự động cho khách
new_order = {
    "customer": {"name": "Lê Hoàng Yến", "phone": "0988776655"},
    "productId": "p-claude",
    "planId": "pl-claude-1",
    "payment": "paid",
    "note": "Agent Python tự động cấp tài khoản"
}
res = requests.post(f"{BASE_URL}/orders", json=new_order, headers=headers)
print("Kết quả:", res.json())`}
            </pre>
          </div>
        )}

        <div className="settings-actions" style={{ gap: '10px' }}>
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="button"
          >
            <AppIcon name="download" size={15} />
            <span>Tải OpenAPI 3.0 (.json)</span>
          </a>
          <button
            type="button"
            className="button primary"
            onClick={handleTestPing}
            disabled={testResult.status === 'loading'}
          >
            <AppIcon name="refresh" size={15} />
            <span>{testResult.status === 'loading' ? 'Đang kiểm tra…' : 'Kiểm tra kết nối API'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
