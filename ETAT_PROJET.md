# Korean Beauty — État du projet (13 mai 2026)

> Document de reprise pour une nouvelle session Claude. Lis aussi `CLAUDE.md` à la racine pour l'architecture détaillée.

## Stack confirmée
- Astro 6.3.1 en mode SSR (`output: 'server'`)
- TypeScript strict
- Tailwind CSS 4 (via `@tailwindcss/vite`, config dans `src/styles/global.css` avec `@theme`)
- React 19 (Islands : `AddToCartButton.tsx`, `CartView.tsx`)
- `@astrojs/netlify` (adapter SSR)
- `@astrojs/sitemap`
- `@shopify/storefront-api-client` v1.0.10
- Node 22

## Variables d'environnement (`.env` à la racine — déjà rempli)
- `PUBLIC_SHOPIFY_STORE_DOMAIN=korean-beauty-8330.myshopify.com`
- `PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=2e254078d722c2b5fb8edf3408833365`
- `PUBLIC_SITE_URL=https://korean-beauty.fr`
- API version utilisée : **2026-04**

## Shopify — état
- App Storefront API : créée via le canal **Headless** (gid://shopify/Publication/320392528196)
- 6 collections créées et **publiées sur le canal Headless** :
  - `serums` — Sérums (8 produits, image OK)
  - `cremes-visage` — Crèmes visage (2, image OK)
  - `protection-solaire` — Protection solaire (1, image OK)
  - `soin-levres` — Soin lèvres (3, image OK)
  - `soin-corps` — Soin corps (4, image OK)
  - `contour-des-yeux` — Contour des yeux (1, image OK) — handle complet avec « des »
- 24 produits actifs au total, 18 rangés en collections
- Tokens et scopes Storefront déjà configurés (read_product_listings, read_collection_listings, read_checkouts, write_checkouts)

## Charte graphique (intégrée)
- Jade `#3D7A58`
- Forêt `#17301F`
- Menthe `#7EC49A`
- Écume `#EAF4EE`
- Typo : Playfair Display (display) + Inter (body), chargées via Google Fonts dans `BaseLayout.astro`
- Logo : SVG dans `public/` (logo-horizontal.svg, logo-horizontal-dark.svg, logo-compact.svg, favicon.svg). Style : feuille verticale + « KOREAN BEAUTY » + signature « BY ASSA »

## Pages déjà construites
- `/` — Homepage : hero plein-fond avec `public/hero.png`, 4 collections avec vraies images Shopify, bestsellers (6 produits), réassurance, footer
- `/boutique` — Catalogue tous produits + barre de filtres collections
- `/collections/[handle]` — Page collection dynamique
- `/boutique/[handle]` — Fiche produit (galerie, variantes, ajouter au panier, similaires)
- `/panier` — Panier complet (qty +/-, retirer, total, redirect checkout Shopify)

## Pages institutionnelles créées
- `/notre-histoire` — Notre histoire, valeurs de la marque
- `/livraison` — Livraison standard, express, internationale + FAQ
- `/retours` — Politique de retours, échanges, remboursements (30 jours)
- `/contact` — Formulaire de contact, emails, réseaux sociaux
- `/mentions-legales` — Mentions légales, RGPD, propriété intellectuelle
- `/cgv` — Conditions Générales de Vente complètes

## Composants
- `src/components/Header.astro` — sticky, logo SVG, nav, badge panier dynamique
- `src/components/Footer.astro` — 4 colonnes, logo
- `src/components/ProductCard.astro` — carte produit réutilisable
- `src/components/AddToCartButton.tsx` — React Island (création de panier Shopify, persistance localStorage `kb_cart_id`)
- `src/components/CartView.tsx` — React Island (panier interactif)

## Helpers Shopify (`src/lib/shopify.ts`)
- `getAllProducts(first)`
- `getCollection(handle)` — avec image + produits
- `getCollectionsMeta(handles)` — méta seulement (rapide pour homepage)
- `getProduct(handle)`
- `createCart()`, `getCart()`, `addToCart()`, `updateCartLine()`, `removeFromCart()`
- `formatPrice()`, `shopifyImage()`
- Constante `COLLECTIONS` (handles + labels FR)

## Reste à faire
1. **Déploiement Netlify** + connexion domaine `korean-beauty.fr`
2. **Newsletter** — bandeau homepage relié à Shopify Customers
3. **Améliorer fiches produit** — ingrédients, type de peau, conseils (si fournis)
4. **Animations / micro-interactions** au scroll
5. **Mobile QA** — tester et corriger d'éventuels bugs responsive
6. **Intégration email contact** — connecter le formulaire `/contact` à un service (Nodemailer, SendGrid, etc.)

## Comment relancer le dev local
```bash
cd ~/Sites/korean-beauty
npm run dev
# → http://localhost:4321
```
