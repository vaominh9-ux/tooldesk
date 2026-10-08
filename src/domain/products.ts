import type { AppData } from './data-schema';

export interface ProductPlanUpdate {
  id?: string;
  name: string;
  duration: number;
  unit: 'months' | 'days';
  price: number;
  cost: number;
}

export function updatedProductPlans(data: AppData, product: AppData['products'][number],
  drafts: ProductPlanUpdate[], expectedIds: string[], newId: (prefix: string) => string) {
  const expected = new Set(expectedIds);
  if (expected.size !== expectedIds.length || expected.size !== product.plans.length || product.plans.some(plan => !expected.has(plan.id))) {
    throw new Error('Danh sách gói vừa thay đổi. Hãy mở lại sản phẩm để cập nhật trước khi lưu.');
  }
  const submitted = new Set<string>();
  const linked = (id: string) => data.orders.some(order => order.planId === id) || data.subscriptions.some(sub => sub.planId === id);
  for (const draft of drafts) {
    if (!draft.id) continue;
    const current = product.plans.find(plan => plan.id === draft.id);
    if (!current || submitted.has(draft.id)) throw new Error('Gói không thuộc sản phẩm này hoặc bị lặp trong danh sách.');
    submitted.add(draft.id);
    if (linked(current.id) && (draft.duration !== current.duration || draft.unit !== current.unit)) {
      throw new Error(`Gói ${current.name} đã có lịch sử sử dụng. Hãy tạo gói mới để đổi thời hạn.`);
    }
  }
  for (const current of product.plans) {
    if (!submitted.has(current.id) && linked(current.id)) throw new Error(`Không thể xóa gói ${current.name} vì đã có đơn hàng hoặc dịch vụ liên kết.`);
  }
  return drafts.map(draft => ({ ...draft, id: draft.id || newId('pl') }));
}
