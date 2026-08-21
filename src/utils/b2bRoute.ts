/**
 * B2B ichki navigatsiyasi — ilova React Router ishlatmaydi, shuning uchun
 * B2B'ning o'z sahifalari (#market/product/abc123 kabi) shu yordamchi
 * funksiyalar orqali hash segmentlariga kodlanadi/dekodlanadi.
 */

export type B2BRoute =
  | { view: 'home' }
  | { view: 'products' }
  | { view: 'product'; id: string }
  | { view: 'suppliers' }
  | { view: 'supplier'; id: string }
  | { view: 'cart' }
  | { view: 'checkout' }
  | { view: 'orders' }
  | { view: 'order'; id: string }
  | { view: 'dashboard' }
  | { view: 'business' }
  | { view: 'contracts' }
  | { view: 'finance' };

const VIEWS_WITH_ID: B2BRoute['view'][] = ['product', 'supplier', 'order'];

/** ['product','abc123'] -> {view:'product', id:'abc123'} */
export function parseB2BHash(segments: string[]): B2BRoute {
  const [view, id] = segments;
  if (view && (VIEWS_WITH_ID as string[]).includes(view) && id) {
    return { view, id } as B2BRoute;
  }
  const validViews: B2BRoute['view'][] = [
    'home', 'products', 'suppliers', 'cart', 'checkout', 'orders', 'dashboard', 'business', 'contracts', 'finance',
  ];
  if (view && (validViews as string[]).includes(view)) {
    return { view } as B2BRoute;
  }
  return { view: 'home' };
}

/** {view:'product', id:'abc123'} -> 'product/abc123' */
export function encodeB2BHash(route: B2BRoute): string {
  if ('id' in route) return `${route.view}/${route.id}`;
  return route.view;
}
