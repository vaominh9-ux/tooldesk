import { z } from 'zod';

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const customerEmailInputSchema = z.string().transform(normalizeCustomerEmail)
  .pipe(z.union([z.literal(''), z.email()]));

interface CustomerIdentity { id: string; email: string }

export function customersWithEmail<T extends CustomerIdentity>(customers: readonly T[], email: string, excludeId?: string): T[] {
  const normalized = normalizeCustomerEmail(email);
  if (!normalized) return [];
  return customers.filter(customer => customer.id !== excludeId && normalizeCustomerEmail(customer.email) === normalized);
}

export function duplicateCustomerGroups<T extends CustomerIdentity>(customers: readonly T[]): { email: string; customers: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const customer of customers) {
    const email = normalizeCustomerEmail(customer.email);
    if (!email) continue;
    const group = groups.get(email) || [];
    group.push(customer);
    groups.set(email, group);
  }
  return [...groups].filter(([, members]) => members.length > 1)
    .map(([email, members]) => ({ email, customers: members }));
}
