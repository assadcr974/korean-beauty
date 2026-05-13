import { useState } from 'react';

interface Props {
  variantId: string;
  available: boolean;
  label?: string;
}

const STORE_DOMAIN = import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const API_VERSION = '2026-04';
const CART_KEY = 'kb_cart_id';

async function shopifyRequest(query: string, variables: Record<string, unknown>) {
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

async function ensureCart(): Promise<string> {
  const existing = localStorage.getItem(CART_KEY);
  if (existing) return existing;
  const { data } = await shopifyRequest(
    `mutation { cartCreate { cart { id } } }`,
    {},
  );
  const id = data?.cartCreate?.cart?.id as string;
  localStorage.setItem(CART_KEY, id);
  return id;
}

async function addLine(cartId: string, variantId: string, quantity: number) {
  const { data, errors } = await shopifyRequest(
    `mutation AddLine($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { id totalQuantity checkoutUrl }
        userErrors { message }
      }
    }`,
    { cartId, lines: [{ merchandiseId: variantId, quantity }] },
  );
  if (errors) console.error(errors);
  return data?.cartLinesAdd?.cart;
}

export default function AddToCartButton({ variantId, available, label = 'Ajouter au panier' }: Props) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    if (!available || loading) return;
    setLoading(true);
    try {
      const cartId = await ensureCart();
      const cart = await addLine(cartId, variantId, qty);
      if (cart) {
        // Notify other components (Header badge, drawer)
        window.dispatchEvent(new CustomEvent('kb:cart:updated', { detail: cart }));
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }
    } catch (e) {
      console.error('addToCart', e);
    } finally {
      setLoading(false);
    }
  }

  if (!available) {
    return (
      <button disabled className="btn w-full bg-border text-muted cursor-not-allowed">
        Rupture de stock
      </button>
    );
  }

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex items-center border border-border rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="px-3 hover:bg-ecume transition"
          aria-label="Diminuer"
        >−</button>
        <span className="px-4 min-w-[3ch] text-center">{qty}</span>
        <button
          type="button"
          onClick={() => setQty((q) => q + 1)}
          className="px-3 hover:bg-ecume transition"
          aria-label="Augmenter"
        >+</button>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={loading}
        className="btn btn-primary flex-1"
      >
        {loading ? 'Ajout…' : added ? 'Ajouté ✓' : label}
      </button>
    </div>
  );
}
