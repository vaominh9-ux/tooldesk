'use client';

import { useState, type FormEvent } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from '@/components/shared/app-icon';
import { Feedback } from '@/components/shared/feedback';
import { useBackdropDismiss } from '@/components/dialogs/use-backdrop-dismiss';
import { formatMoney } from '@/domain/money';
import type { ProductPlanUpdate } from '@/domain/products';

interface PlanDraft {
  key: string; id?: string; name: string; duration: string; unit: 'months' | 'days'; price: string; cost: string;
}
const categories = ['Trợ lý AI', 'Thiết kế', 'Nghiên cứu', 'Lập trình', 'Khác'];

export function ProductEditorDialog({ productId, onClose }: { productId?: string; onClose: () => void }) {
  const { data, pending, role, addProduct, updateProduct, deleteProduct } = useTooldesk();
  const product = data.products.find(item => item.id === productId);
  const editing = Boolean(productId);
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || categories[0]);
  const [description, setDescription] = useState(product?.description || '');
  const [symbol, setSymbol] = useState(product?.symbol || '◈');
  const [plans, setPlans] = useState<PlanDraft[]>(() => product ? product.plans.map(plan => ({ ...plan, key: plan.id, duration: String(plan.duration), price: String(plan.price), cost: String(plan.cost) })) : [{ key: 'initial', name: 'Gói 1 tháng', duration: '1', unit: 'months', price: '350000', cost: '250000' }]);
  const [expectedPlanIds] = useState(() => product?.plans.map(plan => plan.id) || []);
  const [expanded, setExpanded] = useState<string | null>(plans[0]?.key || null);
  const [error, setError] = useState('');
  const [planError, setPlanError] = useState<{ key: string; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const backdrop = useBackdropDismiss(onClose);
  const limit = editing ? 100 : 20;
  const linked = (id?: string) => Boolean(id && (data.orders.some(order => order.planId === id) || data.subscriptions.some(sub => sub.planId === id)));
  const productLinked = data.orders.some(order => order.productId === productId) || data.subscriptions.some(sub => sub.productId === productId);
  const disabled = pending || role !== 'admin';

  function addPlan(months = 1) {
    if (plans.length >= limit) return;
    const key = crypto.randomUUID();
    setPlans(current => [...current, { key, name: months === 12 ? 'Gói 1 năm' : `Gói ${months} tháng`, duration: String(months), unit: 'months', price: '', cost: '' }]);
    setExpanded(key);
  }
  function changePlan<K extends Exclude<keyof PlanDraft, 'id' | 'key'>>(key: string, field: K, value: PlanDraft[K]) {
    setPlanError(null); setError('');
    setPlans(current => current.map(plan => plan.key === key ? { ...plan, [field]: value } : plan));
  }
  function removePlan(plan: PlanDraft) {
    if (linked(plan.id) || plans.length <= 1) return;
    setPlans(current => current.filter(item => item.key !== plan.key));
    if (expanded === plan.key) setExpanded(null);
  }
  function failPlan(plan: PlanDraft, message: string): never {
    setExpanded(plan.key);
    setPlanError({ key: plan.key, message });
    requestAnimationFrame(() => {
      const section = document.querySelector<HTMLElement>(`[data-plan-key="${CSS.escape(plan.key)}"]`);
      section?.querySelector<HTMLInputElement>('input:invalid')?.focus();
    });
    throw new Error(`${plan.name || 'Gói chưa có tên'}: ${message}`);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setPlanError(null);
    if (disabled) return;
    try {
      if (!name.trim()) throw new Error('Vui lòng nhập tên sản phẩm.');
      if (!plans.length) throw new Error('Sản phẩm cần ít nhất một gói dịch vụ.');
      const updates: ProductPlanUpdate[] = plans.map(plan => {
        if (!plan.name.trim()) failPlan(plan, 'Vui lòng nhập tên gói.');
        const duration = Number(plan.duration), price = Number(plan.price), cost = Number(plan.cost);
        if (!plan.duration.trim() || !Number.isInteger(duration) || duration < 1 || duration > 1200) failPlan(plan, 'Thời hạn phải là số nguyên từ 1 đến 1.200.');
        if (!plan.price.trim() || !Number.isSafeInteger(price) || price < 0) failPlan(plan, 'Giá bán phải là số nguyên VND từ 0 trở lên.');
        if (!plan.cost.trim() || !Number.isSafeInteger(cost) || cost < 0) failPlan(plan, 'Giá vốn phải là số nguyên VND từ 0 trở lên.');
        return { ...(plan.id ? { id: plan.id } : {}), name: plan.name.trim(), duration, unit: plan.unit, price, cost };
      });
      const fields = { name: name.trim(), category, description: description.trim(), symbol: symbol.trim() || name.trim()[0].toUpperCase() };
      if (editing && product) await updateProduct(product.id, { ...fields, color: product.color, plans: updates, expectedPlanIds });
      else if (!editing) await addProduct({ ...fields, plans: updates });
      else throw new Error('Sản phẩm không còn tồn tại.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được sản phẩm.'); }
  }
  async function removeProduct() {
    if (!product || disabled || productLinked) return;
    setError('');
    try { await deleteProduct(product.id); } catch (error) { setError(error instanceof Error ? error.message : 'Không xóa được sản phẩm.'); }
  }

  return <div className="dialog-overlay" {...backdrop}>
    <dialog id="active-dialog" className="drawer product-editor-dialog" open aria-modal="true" aria-labelledby="dialog-title" onClick={event => event.stopPropagation()}>
      <form className="dialog-shell" noValidate onSubmit={submit}>
        <header className="dialog-header"><div><h2 id="dialog-title">{editing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}</h2><p>Thông tin sản phẩm và các gói dịch vụ trong cùng một nơi.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Đóng"><AppIcon name="close" size={19} /></button></header>
        <div className="dialog-content">
          {error && !planError && <Feedback tone="error">{error}</Feedback>}
          {editing && !product ? <Feedback tone="error">Sản phẩm không còn tồn tại. Hãy đóng và tải lại danh sách.</Feedback> : <>
            {role !== 'admin' && <Feedback>Chỉ quản trị viên được sửa sản phẩm và gói dịch vụ.</Feedback>}
            <fieldset disabled={disabled} className="product-editor-fields">
              <label className="field"><span>Tên sản phẩm</span><input name="name" required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
              <div className="form-grid"><label className="field"><span id="product-category-label">Nhóm sản phẩm</span><select aria-labelledby="product-category-label" value={category} onChange={event => setCategory(event.target.value)}>{!categories.includes(category) && <option value={category}>{category}</option>}{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label><label className="field"><span>Ký hiệu (Logo)</span><input name="symbol" maxLength={4} value={symbol} onChange={event => setSymbol(event.target.value)} /></label></div>
              <label className="field"><span>Mô tả ngắn</span><input name="description" maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label>
              <div className="product-editor-heading"><div><h3>Gói dịch vụ ({plans.length})</h3><p>Mở từng gói để chỉnh thông tin và giá mặc định.</p></div><button type="button" className="button small" disabled={plans.length >= limit} onClick={() => addPlan()}><AppIcon name="plus" size={16} />Thêm gói</button></div>
              <div className="product-plan-presets"><span>Thêm nhanh:</span>{[1, 3, 6, 12].map(months => <button type="button" className="button small" key={months} disabled={plans.length >= limit} onClick={() => addPlan(months)}>{months === 12 ? '+ 1 năm' : `+ ${months} tháng`}</button>)}</div>
              <div className="product-plan-editors">{plans.map((plan, index) => {
                const used = linked(plan.id), profit = Number(plan.price) - Number(plan.cost);
                return <details key={plan.key} data-plan-key={plan.key} className="product-plan-editor" open={expanded === plan.key}>
                  <summary onClick={event => { event.preventDefault(); setExpanded(expanded === plan.key ? null : plan.key); }}><span><strong>{plan.name || `Gói #${index + 1}`}</strong><small>{plan.duration || '—'} {plan.unit === 'months' ? 'tháng' : 'ngày'} · {plan.price.trim() ? formatMoney(Number(plan.price)) : 'Chưa nhập giá'}</small></span><AppIcon name="down" size={17} /></summary>
                  <div className="product-plan-editor-body">
                    {planError?.key === plan.key && <Feedback tone="error">{planError.message}</Feedback>}
                    <label className="field"><span>Tên gói dịch vụ</span><input aria-label={`Tên gói ${index + 1}`} required maxLength={80} value={plan.name} onChange={event => changePlan(plan.key, 'name', event.target.value)} /></label>
                    <div className="form-grid"><label className="field"><span>Thời hạn</span><input aria-label={`Thời hạn gói ${index + 1}`} type="number" required min={1} max={1200} step={1} value={plan.duration} disabled={used} onChange={event => changePlan(plan.key, 'duration', event.target.value)} /></label><label className="field"><span>Đơn vị</span><select aria-label={`Đơn vị gói ${index + 1}`} value={plan.unit} disabled={used} onChange={event => changePlan(plan.key, 'unit', event.target.value as PlanDraft['unit'])}><option value="months">Tháng lịch</option><option value="days">Ngày</option></select></label></div>
                    {used && <p className="dialog-note">Gói đã được sử dụng: giữ nguyên thời hạn. Tên và giá mặc định vẫn có thể sửa; đơn cũ giữ nguyên tiền và ngày dịch vụ.</p>}
                    <div className="form-grid"><label className="field"><span>Giá bán mặc định (₫)</span><input aria-label={`Giá bán gói ${index + 1}`} type="number" inputMode="numeric" required min={0} max={Number.MAX_SAFE_INTEGER} step={1} value={plan.price} onChange={event => changePlan(plan.key, 'price', event.target.value)} /></label><label className="field"><span>Giá vốn mặc định (₫)</span><input aria-label={`Giá vốn gói ${index + 1}`} type="number" inputMode="numeric" required min={0} max={Number.MAX_SAFE_INTEGER} step={1} value={plan.cost} onChange={event => changePlan(plan.key, 'cost', event.target.value)} /></label></div>
                    <div className="product-plan-editor-footer"><span>Lãi gộp dự kiến <strong className={profit < 0 ? 'negative' : 'positive'}>{plan.price.trim() && plan.cost.trim() ? formatMoney(profit) : '—'}</strong></span><button type="button" className="button small" disabled={used || plans.length <= 1} title={used ? 'Gói đã có đơn hàng hoặc dịch vụ liên kết' : 'Bỏ gói khỏi bản chỉnh sửa'} onClick={() => removePlan(plan)}>Bỏ gói</button></div>
                  </div>
                </details>;
              })}</div>
              {editing && <p className="dialog-note product-editor-note">Các thay đổi được lưu cùng lúc. Hủy sẽ giữ nguyên sản phẩm và tất cả gói.</p>}
            </fieldset>
          </>}
        </div>
        <footer className="dialog-footer">
          {confirmDelete ? <><span className="product-delete-question">Xóa sản phẩm và các gói?</span><button type="button" className="button" onClick={() => setConfirmDelete(false)}>Giữ lại</button><button type="button" className="button danger" disabled={disabled} onClick={() => void removeProduct()}>Xác nhận xóa</button></> : <>
            {editing && product && <button type="button" className="button danger product-delete-action" disabled={disabled || productLinked} title={productLinked ? 'Sản phẩm đã có lịch sử sử dụng' : 'Xóa sản phẩm'} onClick={() => setConfirmDelete(true)}><AppIcon name="trash" size={15} />Xóa</button>}
            <button type="button" className="button" onClick={onClose}>Hủy</button><button type="submit" className="button primary" disabled={disabled || (editing && !product)}><AppIcon name="check" size={16} />{pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</button>
          </>}
        </footer>
      </form>
    </dialog>
  </div>;
}
