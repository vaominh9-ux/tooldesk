import { productInitial } from '@/lib/product-initial';

export function ProductLogo({ name, color = 'mint', large = false }: { name?: string; color?: string; large?: boolean }) {
  return <span className={`product-logo product-monogram${large ? ' large' : ''} ${color || 'mint'}`} aria-hidden="true">{productInitial(name)}</span>;
}
