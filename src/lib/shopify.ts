import { createStorefrontApiClient } from '@shopify/storefront-api-client';

const client = createStorefrontApiClient({
  storeDomain: import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN,
  apiVersion: '2026-04',
  publicAccessToken: import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Image = {
  url: string;
  altText: string | null;
};

export type ProductPrice = {
  amount: string;
  currencyCode: string;
};

export type Variant = {
  id: string;
  title: string;
  price: ProductPrice;
  availableForSale: boolean;
};

export type Product = {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRange: {
    minVariantPrice: ProductPrice;
  };
  images: Image[];
  variants: Variant[];
};

export type CollectionMeta = {
  handle: string;
  title: string;
  image: Image | null;
};

// ─── Collections (handles Shopify réels) ──────────────────────────────────────

export const COLLECTIONS = [
  { handle: 'serums',            label: 'Sérums' },
  { handle: 'cremes-visage',     label: 'Crèmes visage' },
  { handle: 'protection-solaire',label: 'Protection solaire' },
  { handle: 'soin-levres',       label: 'Soin lèvres' },
  { handle: 'soin-corps',        label: 'Soin corps' },
  { handle: 'contour-des-yeux',  label: 'Contour des yeux' },
];

// ─── Fragment produit ──────────────────────────────────────────────────────────

const PRODUCT_FIELDS = `
  id
  title
  handle
  description
  priceRange {
    minVariantPrice { amount currencyCode }
  }
  images(first: 5) {
    edges { node { url altText } }
  }
  variants(first: 20) {
    edges {
      node { id title availableForSale price { amount currencyCode } }
    }
  }
`;

// ─── Helpers internes ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(node: any): Product {
  return {
    ...node,
    images: node.images.edges.map((e: { node: Image }) => e.node),
    variants: node.variants.edges.map((e: { node: Variant }) => e.node),
  };
}

// ─── Requêtes publiques ───────────────────────────────────────────────────────

/** Retourne les N premiers produits du catalogue. */
export async function getAllProducts(first = 24): Promise<Product[]> {
  const { data, errors } = await client.request(
    `query Products($first: Int!) {
      products(first: $first) {
        edges { node { ${PRODUCT_FIELDS} } }
      }
    }`,
    { variables: { first } },
  );
  if (errors) throw new Error(JSON.stringify(errors));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any).products.edges.map((e: any) => mapProduct(e.node));
}

/** Retourne un produit par son handle. */
export async function getProduct(handle: string): Promise<Product | null> {
  const { data, errors } = await client.request(
    `query Product($handle: String!) {
      productByHandle(handle: $handle) { ${PRODUCT_FIELDS} }
    }`,
    { variables: { handle } },
  );
  if (errors) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product = (data as any).productByHandle;
  return product ? mapProduct(product) : null;
}

/** Retourne une collection complète (titre, image, produits). */
export async function getCollection(handle: string): Promise<{
  title: string;
  description: string;
  image: Image | null;
  products: Product[];
} | null> {
  const { data, errors } = await client.request(
    `query Collection($handle: String!) {
      collectionByHandle(handle: $handle) {
        title
        description
        image { url altText }
        products(first: 50) {
          edges { node { ${PRODUCT_FIELDS} } }
        }
      }
    }`,
    { variables: { handle } },
  );
  if (errors) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const col = (data as any).collectionByHandle;
  if (!col) return null;
  return {
    title: col.title,
    description: col.description ?? '',
    image: col.image ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    products: col.products.edges.map((e: any) => mapProduct(e.node)),
  };
}

/** Retourne les métadonnées (handle + image) pour une liste de collections. */
export async function getCollectionsMeta(handles: string[]): Promise<CollectionMeta[]> {
  if (!handles.length) return [];

  // Astuce : on construit une requête multi-alias pour éviter N requêtes
  const query = `query {
    ${handles
      .map(
        (h, i) => `col${i}: collectionByHandle(handle: "${h}") {
          handle title image { url altText }
        }`,
      )
      .join('\n')}
  }`;

  const { data, errors } = await client.request(query);
  if (errors) return [];

  return handles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((_, i) => (data as any)[`col${i}`])
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((col: any) => ({
      handle: col.handle,
      title: col.title,
      image: col.image ?? null,
    }));
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Transforme une URL d'image Shopify CDN pour obtenir la taille et le format
 * optimaux (WebP + largeur cible).
 */
export function shopifyImage(url: string, width = 800): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    u.searchParams.set('width', String(width));
    u.searchParams.set('format', 'webp');
    return u.toString();
  } catch {
    return url;
  }
}

/** Formate un prix Shopify en monnaie locale. */
export function formatPrice(price: ProductPrice): string {
  const amount = parseFloat(price.amount);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: price.currencyCode || 'EUR',
  }).format(amount);
}
