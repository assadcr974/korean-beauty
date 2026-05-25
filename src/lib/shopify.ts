import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient(
  `https://${import.meta.env.PUBLIC_SHOPIFY_STORE_ID}.myshopify.com/api/2024-01/graphql.json`,
  {
    headers: {
      'X-Shopify-Storefront-Access-Token': import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN,
    },
  }
);

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
  image: Image | null;
};

export const COLLECTIONS = [
  { handle: 'serums', label: 'Sérums' },
  { handle: 'cremes', label: 'Crèmes' },
  { handle: 'nettoyants', label: 'Nettoyants' },
  { handle: 'masques', label: 'Masques' },
  { handle: 'toniques', label: 'Toniques' },
];

const productFragment = `
  fragment ProductData on Product {
    id
    title
    handle
    description
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 10) {
      edges {
        node {
          url
          altText
        }
      }
    }
    variants(first: 50) {
      edges {
        node {
          id
          title
          availableForSale
          price {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

export const getAllProducts = async (limit: number = 10): Promise<Product[]> => {
  const query = `
    ${productFragment}
    query GetAllProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            ...ProductData
          }
        }
      }
    }
  `;

  const response = await client.request<any>(query, { first: limit });
  return response.products.edges.map((edge: any) => ({
    ...edge.node,
    images: edge.node.images.edges.map((img: any) => img.node),
    variants: edge.node.variants.edges.map((v: any) => v.node),
  }));
};

export const getProductByHandle = async (handle: string): Promise<Product | null> => {
  const query = `
    ${productFragment}
    query GetProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        ...ProductData
      }
    }
  `;

  try {
    const response = await client.request<any>(query, { handle });
    if (!response.productByHandle) return null;
    return {
      ...response.productByHandle,
      images: response.productByHandle.images.edges.map((img: any) => img.node),
      variants: response.productByHandle.variants.edges.map((v: any) => v.node),
    };
  } catch {
    return null;
  }
};

export const getProduct = getProductByHandle;

export const getCollectionsMeta = async (handles: string[]): Promise<CollectionMeta[]> => {
  if (handles.length === 0) return [];

  const query = `
    query GetCollections {
      ${handles.map((h) => `col_${h}: collectionByHandle(handle: "${h}") { handle image { url altText } }`).join('\n')}
    }
  `;

  try {
    const response = await client.request<any>(query);
    return handles
      .map((h) => response[`col_${h}`])
      .filter(Boolean)
      .map((col: any) => ({
        handle: col.handle,
        image: col.image ? { url: col.image.url, altText: col.image.altText } : null,
      }));
  } catch {
    return [];
  }
};

export const getCollection = async (handle: string): Promise<{ title: string; description: string; image: Image | null; products: Product[] } | null> => {
  const query = `
    ${productFragment}
    query GetCollection($handle: String!) {
      collectionByHandle(handle: $handle) {
        title
        description
        image {
          url
          altText
        }
        products(first: 50) {
          edges {
            node {
              ...ProductData
            }
          }
        }
      }
    }
  `;

  try {
    const response = await client.request<any>(query, { handle });
    if (!response.collectionByHandle) return null;
    const col = response.collectionByHandle;
    return {
      title: col.title,
      description: col.description,
      image: col.image ? { url: col.image.url, altText: col.image.altText } : null,
      products: col.products.edges.map((edge: any) => ({
        ...edge.node,
        images: edge.node.images.edges.map((img: any) => img.node),
        variants: edge.node.variants.edges.map((v: any) => v.node),
      })),
    };
  } catch {
    return null;
  }
};

export const shopifyImage = (url: string, size: number = 400): string => {
  if (!url) return '';
  return url.replace(/\.jpg|\.png|\.webp/, (ext) => `_${size}x${size}${ext}`);
};

export const formatPrice = (price: ProductPrice): string => {
  const amount = parseFloat(price.amount);
  return `${amount.toFixed(2)} ${price.currencyCode === 'EUR' ? '€' : price.currencyCode}`;
};
