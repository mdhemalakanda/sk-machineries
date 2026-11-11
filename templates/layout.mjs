// Page shell: head (SEO/OG/JSON-LD), top bar, header, footer, mobile drawer, scripts.
import { esc, topbar, header, drawer, actionbar, footer } from './components.mjs';

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%230B2347'/%3E%3Ctext x='32' y='42' font-family='Arial,sans-serif' font-size='26' font-weight='bold' fill='%23F8C12C' text-anchor='middle'%3ESK%3C/text%3E%3C/svg%3E";

/**
 * @param {object} o
 * @param {object} o.site   site constants (name, domain, phone/email hrefs...)
 * @param {string} o.title
 * @param {string} o.desc   meta description
 * @param {string} o.path   route, e.g. "/products/ctp/" (used for canonical/OG)
 * @param {string} o.active one of: home | about | products | cert | contact
 * @param {Array}  o.crumbs breadcrumb items [{label, href}] (last = current)
 * @param {string} o.content main HTML
 * @param {object} [o.scripts] { slick?:boolean, glightbox?:boolean }
 * @param {string} [o.ogImage] absolute or site-relative image for og:image
 * @param {Array}  [o.jsonLd]  array of JSON strings to embed
 */
export function page(o) {
  const { site } = o;
  const url = site.domain + o.path;
  const ogImage = o.ogImage
    ? (o.ogImage.startsWith('http') ? o.ogImage : site.domain + o.ogImage)
    : null;

  const styles = [
    '<link rel="stylesheet" href="/assets/fonts/fonts.css">',
    o.scripts?.slick ? '<link rel="stylesheet" href="/assets/vendor/slick.css">' : '',
    o.scripts?.glightbox ? '<link rel="stylesheet" href="/assets/vendor/glightbox.min.css">' : '',
    '<link rel="stylesheet" href="/assets/css/main.css">',
  ].filter(Boolean).join('\n  ');

  const scripts = [
    '<script src="/assets/vendor/jquery.min.js" defer></script>',
    o.scripts?.slick ? '<script src="/assets/vendor/slick.min.js" defer></script>' : '',
    o.scripts?.glightbox ? '<script src="/assets/vendor/glightbox.min.js" defer></script>' : '',
    '<script src="/assets/js/main.js" defer></script>',
  ].filter(Boolean).join('\n  ');

  const jsonLd = (o.jsonLd || [])
    .map((j) => `<script type="application/ld+json">${j}</script>`)
    .join('\n  ');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(o.title)}</title>
  <meta name="description" content="${esc(o.desc)}">
  <link rel="canonical" href="${esc(url)}">
  <link rel="icon" href="${FAVICON}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:title" content="${esc(o.title)}">
  <meta property="og:description" content="${esc(o.desc)}">
  <meta property="og:url" content="${esc(url)}">
  ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  ${styles}
  ${jsonLd}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${topbar(site)}
  ${header(site, o.active)}
  <main id="main">
    ${o.content}
  </main>
  ${footer(site)}
  ${drawer(site)}
  ${actionbar(site)}
  ${scripts}
</body>
</html>`;
}
