/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SHOPIFY_STORE_DOMAIN: string;
  readonly PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN: string;
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
