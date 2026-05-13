# CLAUDE.md — Korean Beauty

> Fichier de référence pour Claude Code. Toute contribution au projet doit respecter les conventions définies ici.

---

## 1. Vue d'ensemble du projet

**Nom du site :** Korean Beauty
**Tagline :** SKINCARE · GLOW · RITUAL
**Objectif :** Boutique e-commerce K-beauty — frontend Astro sur mesure, backend Shopify.
**Architecture :** Shopify Headless (Storefront API) + Astro SSR
**Déploiement frontend :** Netlify
**Backend boutique :** Shopify (produits, paiement, stock, commandes)
**Langue principale :** Français
**Domaine cible :** korean-beauty.fr

---

## 2. Stack technique

| Couche | Technologie |
|---|---|
| Framework | Astro 4.x (mode SSR — `output: 'server'`) |
| Styles | Tailwind CSS 3.x |
| Typage | TypeScript strict |
| Backend boutique | Shopify Storefront API v2025-01 |
| Client Shopify | `@shopify/storefront-api-client` |
| Composants interactifs | Astro Islands + React |
| Panier | Shopify Cart API (côté client) |
| Paiement | Shopify Checkout (redirection native) |
| Déploiement | Netlify (`@astrojs/netlify` adapter) |
| Versioning | Git — branche `main` = production |

---

## 3. Variables d'environnement — `.env`

```env
PUBLIC_SHOPIFY_STORE_DOMAIN=korean-beauty-8330.myshopify.com
PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=XXXXXXXXXXXXXXXXXXXX
PUBLIC_SITE_URL=https://korean-beauty.fr
```

> ⚠️ Ne jamais committer le `.env` — dans `.gitignore`.
> Renseigner aussi dans Netlify → Site settings → Environment variables.

---

## 4. Structure des fichiers

```
korean-beauty/
├── public/
│   ├── logo/
│   │   ├── logo-horizontal-clair.svg
│   │   ├── logo-horizontal-sombre.svg
│   │   └── favicon.ico
│   └── fonts/
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── ProductCard.astro
│   │   ├── ProductGrid.astro
│   │   ├── FilterBar.astro
│   │   ├── HeroBanner.astro
│   │   ├── CartDrawer.tsx          ← Island React
│   │   ├── AddToCartButton.tsx     ← Island React
│   │   └── CollectionNav.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   └── shopify.ts              ← client Storefront API
│   ├── pages/
│   │   ├── index.astro             ← homepage
│   │   ├── boutique/
│   │   │   ├── index.astro         ← catalogue tous produits
│   │   │   └── [handle].astro      ← fiche produit
│   │   ├── collections/
│   │   │   └── [handle].astro      ← page par collection
│   │   └── panier.astro
│   ├── styles/
│   │   └── global.css
│   └── env.d.ts
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── netlify.toml
└── CLAUDE.md
```

---

## 5. Connexion Shopify — `src/lib/shopify.ts`

```typescript
import { createStorefrontApiClient } from '@shopify/storefront-api-client';

export const shopifyClient = createStorefrontApiClient({
  storeDomain: import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN,
  apiVersion: '2025-01',
  publicAccessToken: import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
});

// Requête produits d'une collection
export async function getCollectionProducts(handle: string) {
  const query = `
    query CollectionProducts($handle: String!) {
      collectionByHandle(handle: $handle) {
        title
        products(first: 50) {
          edges {
            node {
              id
              handle
              title
              description
              priceRange {
                minVariantPrice { amount currencyCode }
              }
              images(first: 3) {
                edges { node { url altText } }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    price { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const { data } = await shopifyClient.request(query, { variables: { handle } });
  return data?.collectionByHandle?.products?.edges?.map((e: any) => e.node) ?? [];
}

// Requête produit unique
export async function getProduct(handle: string) {
  const query = `
    query Product($handle: String!) {
      productByHandle(handle: $handle) {
        id handle title description
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
      }
    }
  `;
  const { data } = await shopifyClient.request(query, { variables: { handle } });
  return data?.productByHandle;
}

// Créer un panier
export async function createCart() {
  const mutation = `
    mutation CartCreate {
      cartCreate {
        cart { id checkoutUrl }
      }
    }
  `;
  const { data } = await shopifyClient.request(mutation);
  return data?.cartCreate?.cart;
}

// Ajouter au panier
export async function addToCart(cartId: string, variantId: string, quantity = 1) {
  const mutation = `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          totalQuantity
          cost { totalAmount { amount currencyCode } }
          lines(first: 50) {
            edges {
              node {
                id quantity
                merchandise { ... on ProductVariant { id title product { title } price { amount } } }
              }
            }
          }
          checkoutUrl
        }
      }
    }
  `;
  const { data } = await shopifyClient.request(mutation, {
    variables: { cartId, lines: [{ merchandiseId: variantId, quantity }] }
  });
  return data?.cartLinesAdd?.cart;
}
```

---

## 6. Collections Shopify existantes

Les collections suivantes existent dans l'admin Shopify (korean-beauty-8330.myshopify.com) :

| Handle (à utiliser dans les URLs) | Label FR |
|---|---|
| `serums` | Sérums |
| `cremes-visage` | Crèmes visage |
| `protection-solaire` | Protection solaire |
| `soin-levres` | Soin lèvres |
| `soin-corps` | Soin corps |
| `contour-yeux` | Contour des yeux |

---

## 7. Produits en catalogue (référence)

| Produit | Marque | Catégorie |
|---|---|---|
| Anua Heartleaf Face Wash | Anua | Nettoyant |
| Anua Niacinamide 10+ TXA 3 Serum | Anua | Sérum visage |
| Anua Peach 70 Niacin Serum | Anua | Sérum visage |
| SKIN1004 Madagascar Centella Ampoule | SKIN1004 | Sérum visage |
| Artichoke Intensive Skin Barrier Ampoule | Axis-Y | Sérum visage |
| Medicube PDRN Booster Gel | Medicube | Sérum visage |
| Medicube Collagen Jelly Cream | Medicube | Crème visage |
| Snail 92 All In One Cream | COSRX | Crème visage |
| Seoul 1988 Eye Cream | K-Secret | Contour des yeux |
| Rice SPF50+ PA++++ Sun Cream | Beauty of Joseon | Protection solaire |
| Laneige Lip Sleeping Mask EX Berry | Laneige | Soin lèvres |
| Rhode Peptide Lip Tint - Rose | Rhode | Soin lèvres |
| Rhode Peptide Lip Tint - Bordeaux | Rhode | Soin lèvres |
| Vaseline Golden Hour Glow Body Oil | Vaseline | Soin corps |
| Vaseline Coconut Restore Body Oil | Vaseline | Soin corps |

---

## 8. Design system — Tokens CSS (`src/styles/global.css`)

```css
:root {
  /* Couleurs — à compléter avec la charte graphique finale */
  --color-jade:    #3D7A58;
  --color-foret:   #2A5A3E;
  --color-ecume:   #F4F8F2;
  --color-text:    #1A2E22;
  --color-muted:   #6B8F76;
  --color-border:  #D8E8DC;
  --color-bg:      #FFFFFF;

  /* Typographie */
  --font-display:  'Playfair Display', Georgia, serif;
  --font-body:     'Inter', system-ui, sans-serif;

  /* Ombres */
  --shadow-card:   0 2px 8px rgba(23, 48, 31, 0.08);
  --shadow-hover:  0 8px 24px rgba(23, 48, 31, 0.14);

  /* Transitions */
  --transition:    all 0.4s ease;

  /* Border radius */
  --radius-sm:     6px;
  --radius-md:     12px;
  --radius-lg:     20px;
}
```

---

## 9. Pages à créer

### `index.astro` — Homepage
- Hero avec phrase d'accroche + CTA → boutique.
- Grille des 4 collections principales avec image.
- Section "Bestsellers" (6 produits issus de Shopify).
- Bandeau de réassurance (livraison, authenticité, retours).
- Footer avec liens collections + réseaux.

### `boutique/index.astro` — Catalogue
- Filtres par collection (JS côté client).
- Grille produits (3 colonnes desktop, 2 mobile).
- Chargement depuis Shopify Storefront API.

### `boutique/[handle].astro` — Fiche produit
- Galerie photos Shopify.
- Sélecteur de variante + bouton "Ajouter au panier".
- Description, ingrédients clés, type de peau recommandé.
- Produits similaires (même collection).

### `collections/[handle].astro` — Page collection
- Header collection avec titre et description.
- Grille produits filtrée par collection.

---

## 10. Esthétique & UX

- Sobre, élégant, naturel — espaces blancs généreux.
- Palette verts jade sur fond blanc/écume.
- Ombres légères : `box-shadow: var(--shadow-card)`.
- Transitions douces : `transition: var(--transition)`.
- Boutons principaux : fond Jade `#3D7A58`, texte blanc, hover Forêt.
- Boutons secondaires : bordure Jade, fond transparent.
- Images Shopify CDN en WebP : `?format=webp&width=800`.

---

## 11. SEO & Performance

- `<title>` et `<meta name="description">` via props dans `BaseLayout.astro`.
- Images Shopify CDN en WebP via paramètre `?format=webp&width=800`.
- Sitemap via `@astrojs/sitemap`.
- Score Lighthouse cible : ≥ 90 toutes métriques.

---

## 12. Conventions de code

- TypeScript strict — pas de `any`.
- Composants Astro : PascalCase. Pages : kebab-case.
- Imports : alias `@/` → `src/`.
- Couleurs uniquement via tokens CSS.
- Textes UI en **français**.

---

## 13. Déploiement — `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/entry"
  status = 200
```

---

## 14. Commandes utiles

```bash
npm install                  # Installer les dépendances
npm run dev                  # Dev (http://localhost:4321)
npm run build                # Build production
npm run preview              # Prévisualiser le build
```

---

## 15. Installation depuis zéro

```bash
npm create astro@latest korean-beauty -- --template minimal
cd korean-beauty
npx astro add tailwind
npx astro add react
npx astro add netlify
npm install @shopify/storefront-api-client
npm install @astrojs/sitemap
```

---

*Dernière mise à jour : Mai 2026 · Architecture Shopify Headless + Astro SSR · Palette Vert Jade*
