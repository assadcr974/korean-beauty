import { useEffect, useState } from 'react';

const STORE_DOMAIN = import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const API_VERSION = '2026-04';
const CART_KEY = 'kb_cart_id';

interface Cart {
  id: string;
  totalQuantity: number;
  cost: { totalAmount: { amount: string; currencyCode: string } };
  checkoutUrl: string;
  lines: {
    edges: Array<{
      node: {
        id: string;
        quantity: number;
        merchandise: {
          id: string;
          title: string;
          price: { amount: string; currencyCode: string };
          product: { title: string; handle: string; featuredImage?: { url: string } };
        };
      };
    }>;
  };
}

async function shopifyRequest(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(`https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const CART_FRAGMENT = `
  id
  totalQuantity
  cost { totalAmount { amount currencyCode } }
  checkoutUrl
  lines(first: 50) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            price { amount currencyCode }
            product {
              title
              handle
              featuredImage { url }
            }
          }
        }
      }
    }
  }
`;

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

export default function CartView() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const cartId = localStorage.getItem(CART_KEY);
    if (!cartId) {
      setCart(null);
      setLoading(false);
      return;
    }
    const { data } = await shopifyRequest(`query Cart($id: ID!) { cart(id: $id) { ${CART_FRAGMENT} } }`, { id: cartId });
    if (data?.cart) setCart(data.cart);
    else {
      localStorage.removeItem(CART_KEY);
      setCart(null);
    }
    setLoading(false);
  }

  async function updateQty(lineId: string, quantity: number) {
    if (!cart) return;
    if (quantity < 1) return removeLine(lineId);
    const { data } = await shopifyRequest(
      `mutation Upd($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FRAGMENT} } }
      }`,
      { cartId: cart.id, lines: [{ id: lineId, quantity }] },
    );
    if (data?.cartLinesUpdate?.cart) setCart(data.cartLinesUpdate.cart);
    window.dispatchEvent(new CustomEvent('kb:cart:updated'));
  }

  async function removeLine(lineId: string) {
    if (!cart) return;
    const { data } = await shopifyRequest(
      `mutation Rm($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FRAGMENT} } }
      }`,
      { cartId: cart.id, lineIds: [lineId] },
    );
    if (data?.cartLinesRemove?.cart) setCart(data.cartLinesRemove.cart);
    window.dispatchEvent(new CustomEvent('kb:cart:updated'));
  }

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('kb:cart:updated', onUpdate);
    return () => window.removeEventListener('kb:cart:updated', onUpdate);
  }, []);

  if (loading) {
    return <p className="text-center text-muted py-20">Chargement du panier…</p>;
  }

  if (!cart || cart.lines.edges.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-2xl mb-4">Votre panier est vide.</p>
        <p className="text-muted mb-8">Explorez la boutique pour commencer votre rituel.</p>
        <a href="/boutique" className="btn btn-primary">Voir la boutique</a>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-12">
      <div className="space-y-6">
        {cart.lines.edges.map(({ node: line }) => (
          <div key={line.id} className="card flex gap-4 p-4 items-center">
            {line.merchandise.product.featuredImage ? (
              <a href={`/boutique/${line.merchandise.product.handle}`} className="shrink-0">
                <img
                  src={`${line.merchandise.product.featuredImage.url}&width=200`}
                  alt={line.merchandise.product.title}
                  className="w-24 h-24 object-cover rounded-md bg-ecume"
                />
              </a>
            ) : (
              <div className="w-24 h-24 rounded-md bg-ecume shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <a
                href={`/boutique/${line.merchandise.product.handle}`}
                className="font-display text-lg hover:text-jade transition block leading-tight"
              >
                {line.merchandise.product.title}
              </a>
              {line.merchandise.title !== 'Default Title' && (
                <p className="text-xs text-muted mt-1">{line.merchandise.title}</p>
              )}
              <p className="text-jade font-medium mt-2">
                {formatPrice(line.merchandise.price.amount, line.merchandise.price.currencyCode)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center border border-border rounded-md">
                <button onClick={() => updateQty(line.id, line.quantity - 1)} className="px-2 py-1 hover:bg-ecume" aria-label="Diminuer">−</button>
                <span className="px-3 text-sm">{line.quantity}</span>
                <button onClick={() => updateQty(line.id, line.quantity + 1)} className="px-2 py-1 hover:bg-ecume" aria-label="Augmenter">+</button>
              </div>
              <button onClick={() => removeLine(line.id)} className="text-xs text-muted hover:text-jade transition">
                Retirer
              </button>
            </div>
          </div>
        ))}
      </div>

      <aside className="card p-6 h-fit sticky top-28">
        <h3 className="font-display text-xl mb-6">Récapitulatif</h3>
        <dl className="space-y-3 mb-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Articles</dt>
            <dd>{cart.totalQuantity}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Sous-total</dt>
            <dd>{formatPrice(cart.cost.totalAmount.amount, cart.cost.totalAmount.currencyCode)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Livraison</dt>
            <dd className="text-muted">Calculée au paiement</dd>
          </div>
        </dl>
        <div className="border-t border-border pt-4 mb-6">
          <div className="flex justify-between font-display text-lg">
            <span>Total</span>
            <span className="text-jade">
              {formatPrice(cart.cost.totalAmount.amount, cart.cost.totalAmount.currencyCode)}
            </span>
          </div>
        </div>
        <a href={cart.checkoutUrl} className="btn btn-primary w-full">
          Passer au paiement
        </a>
        <a href="/boutique" className="block text-center text-sm text-muted hover:text-jade transition mt-4">
          ← Continuer mes achats
        </a>
      </aside>
    </div>
  );
}
