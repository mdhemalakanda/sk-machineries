# SK Machineries International — Static Website

A complete, frontend-only redesign of skmachineriesinternational.com, built per the approved Phase 1 plan (`../sk-machineries-research/PHASE-1-REPORT.md`).

- **Design direction:** ThemeForest "Manufacturer" (StyleMixThemes) as primary authority, with layout/detail patterns from "Industrial" (Anps) and "Real Factory" (GoodLayers). Navy `#0B2347` + industrial yellow `#F8C12C`, Roboto Slab / Montserrat / Roboto.
- **Content source:** exclusively skmachineriesinternational.com (researched snapshot in `data/content-inventory.json`). Nothing invented; gaps render as honest empty states.
- **Images:** only assets originating from SK Machineries International's own site/media library. Every shipped image is traceable via `assets/raw-manifest.json` (source URL per file) and `dist/assets/img/MANIFEST.json`.
- **Local only:** no hosting, deployment, or cloud services were used or configured, per client instruction.

## Run it

The finished site is plain static HTML in `dist/`. Use any static file server:

```bash
cd sk-machineries
python3 -m http.server 4173 --directory dist
# open http://localhost:4173
```

(Opening `dist/index.html` directly via file:// also works except for nothing — all assets and pages are relative; a server is simply nicer for clean URLs.)

## Rebuild it

The site is generated from templates + data with a zero-dependency Node script:

```bash
cd sk-machineries
node build.mjs        # regenerates dist/ completely
```

Inputs:
- `data/content-inventory.json` — researched master inventory (118 product listings, contact data, certificates, catalogue pages).
- `assets/raw/` + `assets/raw-manifest.json` — harvested SK-owned images (downloaded once from the live site; the build only reads them).
- `templates/` — shared components (header/footer/cards/detail) and the page shell.
- `src/css/main.css` — the design system (tokens, components, responsive, motion).
- `src/js/main.js` — vanilla JS behaviors (nav, drawer, search, filters, lightbox/slider init, honest mailto form).

What changed in the content versus the source (all improvements, no fact changes):
- Grammar/typo fixes only: "out of specks"→"out of spec", "Prorotional"→"Promotional", "cuf off"→"cut off", "New Holand"→"New Holland", "Asbesto-Free"→"Asbestos-Free", "theerosion"→"the erosion".
- Nav label "HTP PRODUCT" (source typo) → ITR Product.
- Identical-titled ITR cards (15 instances) consolidated into 8 pages, each carrying a "Listed n× on the source ITR page" note; 7 duplicate listings are thus accounted for on-page.
- The dead Webmail link, WP cruft pages (`/hello-world/`, archives) and empty carousels are intentionally not reproduced.

## What's inside (121 pages + 404)

| Section | Pages |
|---|---|
| Home, About, Certification, Contact | 4 |
| Products hub (searchable index of all 111 part lines) | 1 |
| CTP Product (83 entries, 14 sections, filter chips, sticky section nav) | 1 |
| HANDOK Product (20 model-list cards in 4 groups) | 1 |
| ITR Product (8 product groups + part-type range) | 1 |
| JIC Product (11-page catalogue gallery, lightbox) | 1 |
| Generated detail pages (CTP 83, HANDOK 20, ITR 8) | 111 |
| 404 | 1 |

Libraries (vendored locally, offline-friendly): jQuery 3.7.1, Slick Carousel 1.8.1, GLightbox 3.3.0. Self-hosted Google Fonts (Roboto Slab, Montserrat, Roboto). No CDN calls at runtime.

## Enquiry behavior (honest, frontend-only)

- All CTAs use the real published contacts: `tel:+8801715068755`, `tel:+88028331895`, `mailto:Prothom04@gmail.com`.
- Per-product "Email enquiry" links pre-fill subject and body with the part name and source URL.
- The contact form composes a pre-filled email in the visitor's own mail client and says so; nothing is submitted or stored anywhere. No WhatsApp/social links exist because none are published by the company.

## QA summary (Playwright + Chromium, 2026-11-07)

- 121 pages generated; 6,503 internal references checked — zero broken links/assets.
- Functional: hero slider, dropdown, mobile drawer + submenu, parts search (live count), brand/section filter chips, sticky section nav, JIC + certificate lightboxes, per-product enquiry links, honest contact form, breadcrumbs, 404 status — all pass.
- Mobile (390×844): zero horizontal overflow on home/products/detail; drawer, action bar and layouts verified via screenshots (`../sk-machineries-research/qa/shots/`).
- No console errors on any page except the intentional 404 probe.

## Known limitations

1. 35 of 118 source listings have no description on the source site (20 HANDOK model cards, 15 ITR title cards); their pages show the model/series data plus an explicit "specifications available on request" state.
2. The source site displays zero product images; the rebuild reuses 31 genuine SK-owned assets where they genuinely match (ITR products, brand tiles, heroes, certificates, catalogue pages). Tiles without a matching SK asset use clean monogram tiles.
3. The JIC catalogue cover and the CTP product-line cover are scans from the source library; they contain the company's older Gulvesha Plaza address baked into the artwork. They are published as-is (authentic catalogue pages), not as current contact info.
4. Canonical/OG URLs use the company's real domain (`https://skmachineriesinternational.com`) — update if the client prefers a different domain.
5. The contact form requires a mail client; a hosted form service would need explicit client approval and is out of scope per the local-only constraint.

Deployment: nothing is deployed and no hosting account was created. When the client explicitly authorizes hosting, `dist/` can be uploaded to any static host as-is.
