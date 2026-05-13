import { createStorefrontApiClient } from '@shopify/storefront-api-client';

/* ──────────────────────────────────────────────────────────────
   Shopify Storefront API — client + helpers typés
   ────────────────────────────────────────────────────────────── */

export const shopifyClient = createStorefrontApiClient({
  storeDomain: import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN,
  apiVersion: '2026-04',
  publicAccessToken: import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
});

/* ───────── Types ───────── */

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface ProductImage {
  url: string;
  altText: string | null;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  priceRange: { minVariantPrice: Money };
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface CollectionMeta {
  handle: string;
  title: string;
  description?: string;
  image: ProductImage | null;
}

export interface Collection extends CollectionMeta {
  products: Product[];
}

export interface Cart {
  id: string;
  totalQuantity: number;
  cost: { totalAmount: Money };
  lines: CartLine[];
  checkoutUrl: string;
}

export interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: Money;
    product: { title: string };
  };
}

/* ───────── Helpers internes ───────── */

function flattenEdges<T>(connection: { edges: Array<{ node: T }> } | null | undefined): T[] {
  return connection?.edges?.map((e) => e.node) ?? [];
}

function mapProduct(node: any): Product {
  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    description: node.description,
    priceRange: node.priceRange,
    images: flattenEdges(node.images),
    variants: flattenEdges(node.variants),
  };
}

/* ───────── Requêtes catalogue ───────── */

const PRODUCT_FRAGMENT = `
  id
  handle
  title
  description
  priceRange { minVariantPrice { amount currencyCode } }
  images(first: 5) { edges { node { url altText } } }
  variants(first: 20) {
    edges {
      node {
        id title availableForSale
        price { amount currencyCode }
      }
    }
  }
`;

/** Récupère les produits d'une collection par son handle. */
export async function getCollectionProducts(handle: string): Promise<Product[]> {
  const query = `
    query CollectionProducts($handle: String!) {
      collection(handle: $handle) {
        products(first: 50) {
          edges { node { ${PRODUCT_FRAGMENT} } }
        }
      }
    }
  `;
  const { data, errors } = await shopifyClient.request(query, { variables: { handle } });
  if (errors) console.error('[shopify] getCollectionProducts', errors);
  return flattenEdges(data?.collection?.products).map(mapProduct);
}

/** Récupère une collection complète (titre, description, image, produits). */
export async function getCollection(handle: string): Promise<Collection | null> {
  const query = `
    query CollectionByHandle($handle: String!) {
      collection(handle: $handle) {
        handle
        title
        description
        image { url altText }
        products(first: 50) {
          edges { node { ${PRODUCT_FRAGMENT} } }
        }
      }
    }
  `;
  const { data, errors } = await shopifyClient.request(query, { variables: { handle } });
  if (errors) console.error('[shopify] getCollection', errors);
  if (!data?.collection) return null;
  return {
    handle: data.collection.handle,
    title: data.collection.title,
    description: data.collection.description,
    image: data.collection.image ?? null,
    products: flattenEdges(data.collection.products).map(mapProduct),
  };
}

/** Récupère les méta-données (titre, image) de plusieurs collections en une requête. */
export async function getCollectionsMeta(handles: readonly string[]): Promise<CollectionMeta[]> {
  // Shopify ne supporte pas un filtre IN sur les handles, donc on fait N requêtes en parallèle.
  const results = await Promise.all(
    handles.map(async (handle) => {
      const query = `
        query CollMeta($handle: String!) {
          collection(handle: $handle) {
            handle title description
            image { url altText }
          }
        }
      `;
      try {
        const { data, errors } = await shopifyClient.request(query, { variables: { handle } });
        if (errors) console.warn('[shopify] getCollectionsMeta', handle, errors);
        const c = data?.collection;
        if (!c) return null;
        return {
          handle: c.handle,
          title: c.title,
          description: c.description,
          image: c.image ?? null,
        } as CollectionMeta;
      } catch (e) {
        console.warn('[shopify] getCollectionsMeta exception', handle, e);
        return null;
      }
    }),
  );
  return results.filter((c): c is CollectionMeta => c !== null);
}

/** Récupère un produit unique par son handle. */
export async function getProduct(handle: string): Promise<Product | null> {
  const query = `
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        ${PRODUCT_FRAGMENT}
      }
    }
  `;
  const { data, errors } = await shopifyClient.request(query, { variables: { handle } });
  if (errors) console.error('[shopify] getProduct', errors);
  return data?.product ? mapProduct(data.product) : null;
}

/** Récupère tous les produits (limite first). */
export async function getAllProducts(first = 50): Promise<Product[]> {
  const query = `
    query AllProducts($first: Int!) {
      products(first: $first) {
        edges { node { ${PRODUCT_FRAGMENT} } }
      }
    }
  `;
  const { data, errors } = await shopifyClient.request(query, { variables: { first } });
  if (errors) console.error('[shopify] getAllProducts', errors);
  return flattenEdges(data?.products).map(mapProduct);
}

/* ───────── Panier ───────── */

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
            product { title }
          }
        }
      }
    }
  }
`;

function mapCart(node: any): Cart {
  return {
    id: node.id,
    totalQuantity: node.totalQuantity,
    cost: node.cost,
    checkoutUrl: node.checkoutUrl,
    lines: flattenEdges(node.lines),
  };
}

export async function createCart(): Promise<Cart | null> {
  const mutation = `
    mutation CartCreate {
      cartCreate { cart { ${CART_FRAGMENT} } }
    }
  `;
  const { data, errors } = await shopifyClient.request(mutation);
  if (errors) console.error('[shopify] createCart', errors);
  return data?.cartCreate?.cart ? mapCart(data.cartCreate.cart) : null;
}

export async function getCart(cartId: string): Promise<Cart | null> {
  const query = `
    query Cart($cartId: ID!) {
      cart(id: $cartId) { ${CART_FRAGMENT} }
    }
  `;
  const { data, errors } = await shopifyClient.request(query, { variables: { cartId } });
  if (errors) console.error('[shopify] getCart', errors);
  return data?.cart ? mapCart(data.cart) : null;
}

export async function addToCart(cartId: string, variantId: string, quantity = 1): Promise<Cart | null> {
  const mutation = `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ${CART_FRAGMENT} }
      }
    }
  `;
  const { data, errors } = await shopifyClient.request(mutation, {
    variables: { cartId, lines: [{ merchandiseId: variantId, quantity }] },
  });
  if (errors) console.error('[shopify] addToCart', errors);
  return data?.cartLinesAdd?.cart ? mapCart(data.cartLinesAdd.cart) : null;
}

export async function updateCartLine(cartId: string, lineId: string, quantity: number): Promise<Cart | null> {
  const mutation = `
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ${CART_FRAGMENT} }
      }
    }
  `;
  const { data, errors } = await shopifyClient.request(mutation, {
    variables: { cartId, lines: [{ id: lineId, quantity }] },
  });
  if (errors) console.error('[shopify] updateCartLine', errors);
  return data?.cartLinesUpdate?.cart ? mapCart(data.cartLinesUpdate.cart) : null;
}

export async function removeFromCart(cartId: string, lineIds: string[]): Promise<Cart | null> {
  const mutation = `
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ${CART_FRAGMENT} }
      }
    }
  `;
  const { data, errors } = await shopifyClient.request(mutation, {
    variables: { cartId, lineIds },
  });
  if (errors) console.error('[shopify] removeFromCart', errors);
  return data?.cartLinesRemove?.cart ? mapCart(data.cartLinesRemove.cart) : null;
}

/* ───────── Utilitaires ───────── */

/** Formate un prix Shopify en € (ou autre devise). */
export function formatPrice(money: Money): string {
  const amount = parseFloat(money.amount);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Optimise une URL d'image Shopify CDN en WebP. */
export function shopifyImage(url: string, width = 800): string {
  if (!url) return '';
  const u = new URL(url);
  u.searchParams.set('width', String(width));
  // Le CDN Shopify détecte automatiquement le format WebP via Accept header,
  // mais on peut forcer via le format de fichier d'origine ou laisser.
  return u.toString();
}

/* ───────── Collections du site (référence CLAUDE.md) ───────── */

export const COLLECTIONS = [
  { handle: 'serums', label: 'Sérums' },
  { handle: 'cremes-visage', label: 'Crèmes visage' },
  { handle: 'protection-solaire', label: 'Protection solaire' },
  { handle: 'soin-levres', label: 'Soin lèvres' },
  { handle: 'soin-corps', label: 'Soin corps' },
  { handle: 'contour-des-yeux', label: 'Contour des yeux' },
] as const;

export type CollectionHandle = (typeof COLLECTIONS)[number]['handle'];
