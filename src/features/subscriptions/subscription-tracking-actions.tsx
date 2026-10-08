'use client';

import { useEffect, useRef, useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { subStatus } from '@/domain/subscriptions';
import { AppIcon } from '@/components/shared/app-icon';

export function SubscriptionTrackingActions({ subscriptionId }: { subscriptionId: string }) {
  const { data, today, role, pending, stopSubscriptionTracking } = useTooldesk();
  const subscription = data.subscriptions.find(item => item.id === subscriptionId);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('Khách không gia hạn');
  const [error, setError] = useState('');
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (confirming) confirmation.current?.scrollIntoView({ block: 'end' });
  }, [confirming]);
  if (!subscription) return null;
  if (subscription.cancelled) return <div className="hint-banner blue subscription-tracking-info"><AppIcon name="info" size={18} /><p>Đã dừng theo dõi và nhắc hạn. Lịch sử vẫn được giữ nguyên. Khách quay lại? Chọn “Mở lại” để tạo đơn và kỳ dịch vụ mới.</p></div>;
  if (subStatus(subscription, today) !== 'expired') return null;
  return <section className="subscription-tracking-actions" aria-label="Theo dõi gia hạn">
    <h3>Chờ khách gia hạn</h3>
    <p>Gói hết hạn vẫn được theo dõi. Nếu khách không tiếp tục, bạn có thể dừng nhắc hạn và đưa gói khỏi danh sách cần xử lý.</p>
    {role !== 'viewer' && (confirming ? <div className="subscription-stop-confirm" ref={confirmation}>
      <label className="field"><span>Lý do dừng theo dõi</span><textarea aria-label="Lý do dừng theo dõi" value={reason} maxLength={500} rows={2} disabled={pending} onChange={event => setReason(event.target.value)} /></label>
      <p>Chỉ dừng theo dõi gói này. Đơn hàng, thanh toán, phiếu hoàn và các lịch chăm sóc riêng vẫn được giữ nguyên.</p>
      {error && <p className="dialog-error" role="alert">{error}</p>}
      <div className="subscription-stop-buttons">
        <button type="button" className="button" disabled={pending} onClick={() => { setConfirming(false); setError(''); }}>Tiếp tục chờ</button>
        <button type="button" className="button primary" disabled={pending || reason.trim().length < 3} onClick={async () => {
          setError('');
          try { await stopSubscriptionTracking(subscription.id, subscription.expiresAt, reason); setConfirming(false); }
          catch (failure) { setError(failure instanceof Error ? failure.message : 'Không thể dừng theo dõi.'); }
        }}><AppIcon name="check" size={16} />{pending ? 'Đang lưu…' : 'Xác nhận không gia hạn'}</button>
      </div>
    </div> : <button type="button" className="button" disabled={pending} onClick={() => setConfirming(true)}>Không gia hạn / Dừng theo dõi</button>)}
  </section>;
}
