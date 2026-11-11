// Shared HTML components for the SK Machineries International static build.
// Every function returns an HTML string. All dynamic content must pass through esc().

export const esc = (s = '') =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ---------------------------------------------------------------------------
// Inline icons (currentColor SVGs)
// ---------------------------------------------------------------------------
const ICONS = {
  pin: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7V11H8.3v3h2.4v7h2.8Z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.8a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4-.6.2-1.2.2-1.9.1a4.1 4.1 0 0 0 3.8 2.9A8.2 8.2 0 0 1 2 18.6a11.6 11.6 0 0 0 6.3 1.8c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.3Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.5" fill="currentColor" stroke="none"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26.4 26.4 0 0 0 2 12c0 1.6.1 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8s-.1-3.2-.4-4.8ZM10 15.2V8.8L15.5 12 10 15.2Z"/></svg>',
};

export const ico = (name) => ICONS[name] || '';

// ---------------------------------------------------------------------------
// Site chrome
// ---------------------------------------------------------------------------
export function topbar(site) {
  return `
<div class="topbar">
  <div class="container topbar__inner">
    <div class="topbar__group topbar__social" aria-label="Social media">
      <!-- Source site ships these icons without target URLs; kept as placeholders for fidelity -->
      <a href="#" class="topbar__soc" aria-label="Facebook (no URL on source site)" onclick="return false">${ico('facebook')}</a>
      <a href="#" class="topbar__soc" aria-label="Twitter (no URL on source site)" onclick="return false">${ico('twitter')}</a>
      <a href="#" class="topbar__soc" aria-label="Instagram (no URL on source site)" onclick="return false">${ico('instagram')}</a>
    </div>
    <div class="topbar__group">
      <span>${ico('pin')} ${esc(site.addressShort)}</span>
    </div>
    <div class="topbar__group">
      <a href="${esc(site.phone1Href)}">${ico('phone')} ${esc(site.phone1)}</a>
      <a href="${esc(site.emailHref)}">${ico('mail')} ${esc(site.email)}</a>
    </div>
  </div>
</div>`;
}

const BRAND_NAV = [
  { id: 'ctp', nav: 'CTP Product', hint: 'Replacement parts for Caterpillar — USA' },
  { id: 'handok', nav: 'HANDOK Product', hint: 'Hydraulic pumps, motors, valves & regulators' },
  { id: 'itr', nav: 'ITR Product', hint: 'Undercarriage parts — Italy' },
  { id: 'jic', nav: 'JIC Product', hint: 'Hydraulic pumps & rotary kits' },
];

export function header(site, active) {
  const link = (href, label, key) =>
    `<a class="main-nav__link${active === key ? ' is-active' : ''}" href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `
<header class="site-header" id="siteHeader">
  <div class="container header__inner">
    <a class="brand" href="/" aria-label="SK Machineries International — Home">
      ${site.logo ? `<img class="brand__logo" src="${esc(site.logo)}" alt="SK Machineries International logo">` : ''}
      <span class="brand__text">
        <span class="brand__name">SK Machineries</span>
        <span class="brand__tag">International &middot; Equipment Spare Parts</span>
      </span>
    </a>
    <nav class="main-nav" aria-label="Main navigation">
      <ul class="main-nav__list">
        <li class="main-nav__item">${link('/', 'Home', 'home')}</li>
        <li class="main-nav__item">${link('/about/', 'About Us', 'about')}</li>
        <li class="main-nav__item has-dropdown">
          <a class="main-nav__link${active === 'products' ? ' is-active' : ''}" href="/products/" aria-haspopup="true" aria-expanded="false">Products ${ico('chevron')}</a>
          <ul class="dropdown">
            <li><a class="dropdown__link" href="/products/">Overview &amp; Parts Index<span class="dropdown__hint">Search every part line at once</span></a></li>
            ${BRAND_NAV.map((b) => `<li><a class="dropdown__link" href="/products/${b.id}/">${esc(b.nav)}<span class="dropdown__hint">${esc(b.hint)}</span></a></li>`).join('')}
          </ul>
        </li>
        <li class="main-nav__item">${link('/certification/', 'Certification', 'cert')}</li>
        <li class="main-nav__item">${link('/contact/', 'Contact', 'contact')}</li>
        <li class="main-nav__item"><a class="main-nav__link" href="https://skmachineriesinternational.com:2096/" target="_blank" rel="noopener">Webmail</a></li>
      </ul>
    </nav>
    <div class="header__actions">
      <a class="btn btn--primary" href="/contact/">Request a Quote</a>
    </div>
    <button class="nav-toggle" id="navToggle" type="button" aria-expanded="false" aria-controls="mobileDrawer" aria-label="Open menu">
      <span class="nav-toggle__bar"></span>
      <span class="nav-toggle__bar"></span>
      <span class="nav-toggle__bar"></span>
    </button>
  </div>
</header>`;
}

export function drawer(site) {
  return `
<div class="mobile-drawer" id="mobileDrawer" aria-hidden="true">
  <div class="mobile-drawer__scrim" data-drawer-close></div>
  <div class="mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="mobile-drawer__head">
      <span class="mobile-drawer__title">Menu</span>
      <button class="mobile-drawer__close" id="drawerClose" type="button" aria-label="Close menu">&times;</button>
    </div>
    <ul class="mobile-nav">
      <li><a href="/">Home</a></li>
      <li><a href="/about/">About Us</a></li>
      <li class="has-sub">
        <div class="mobile-nav__row">
          <a href="/products/">Products</a>
          <button class="mobile-nav__subtoggle" type="button" aria-expanded="false" aria-label="Toggle products submenu">${ico('chevron')}</button>
        </div>
        <ul class="mobile-subnav">
          <li><a href="/products/">Overview &amp; Parts Index</a></li>
          ${BRAND_NAV.map((b) => `<li><a href="/products/${b.id}/">${esc(b.nav)}</a></li>`).join('')}
        </ul>
      </li>
      <li><a href="/certification/">Certification</a></li>
      <li><a href="/contact/">Contact</a></li>
      <li><a href="https://skmachineriesinternational.com:2096/" target="_blank" rel="noopener">Webmail</a></li>
    </ul>
    <a class="btn btn--primary btn--block" href="/contact/" style="margin-top:24px">Request a Quote</a>
    <div class="mobile-drawer__contact">
      <a href="${esc(site.phone1Href)}">${ico('phone')} ${esc(site.phone1)}</a>
      <a href="${esc(site.emailHref)}">${ico('mail')} ${esc(site.email)}</a>
    </div>
  </div>
</div>`;
}

export function actionbar(site) {
  return `
<div class="mobile-actionbar">
  <a class="btn btn--block" href="${esc(site.phone1Href)}">${ico('phone')} Call Now</a>
  <a class="btn btn--block mobile-actionbar__alt" href="${esc(site.emailHref)}">${ico('mail')} Email Us</a>
</div>`;
}

export function footer(site) {
  const logo = site.footerLogo || site.logo;
  return `
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        ${logo ? `<img class="logo" src="${esc(logo)}" alt="${esc(site.name)} logo">` : ''}
        <span class="brand__name" style="color:#fff">SK Machineries</span>
        <p>${esc(site.name)} is a one-stop sales center for power, heavy earth moving construction equipment, mining and gas generator spare parts &mdash; authorized distributor for CTP, HANDOK, ITR &amp; JIC.</p>
        <div class="footer-social" aria-label="Social media">
          <!-- Source site ships these icons without target URLs; kept as placeholders for fidelity -->
          <a href="#" aria-label="Facebook (no URL on source site)" onclick="return false">${ico('facebook')}</a>
          <a href="#" aria-label="Twitter (no URL on source site)" onclick="return false">${ico('twitter')}</a>
          <a href="#" aria-label="Youtube (no URL on source site)" onclick="return false">${ico('youtube')}</a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <ul class="footer-links">
          <li><a href="/">Home</a></li>
          <li><a href="/about/">About Us</a></li>
          <li><a href="/certification/">Certification</a></li>
          <li><a href="/contact/">Contact</a></li>
          <li><a href="https://skmachineriesinternational.com:2096/" target="_blank" rel="noopener">Webmail</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Product Lines</h4>
        <ul class="footer-links">
          ${BRAND_NAV.map((b) => `<li><a href="/products/${b.id}/">${esc(b.nav)}</a></li>`).join('')}
          <li><a href="/products/">Parts Index</a></li>
        </ul>
      </div>
      <div class="footer-col footer-contact">
        <h4>Engage &amp; Experience</h4>
        <ul>
          <li>${ico('phone')}<span><a href="${esc(site.phone2Href)}">${esc(site.phone2)}</a>, <a href="${esc(site.phone1Href)}">${esc(site.phone1)}</a></span></li>
          <li>${ico('pin')}<span>${esc(site.address)}</span></li>
          <li>${ico('mail')}<a href="${esc(site.emailHref)}">${esc(site.email)}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy;2022 ${esc(site.name)} | Designed &amp; Developed by <a class="footer-credit" href="https://www.zaman-it.com/" target="_blank" rel="noopener">ZAMAN IT</a></span>
      <span>Static redesign demo &middot; all content sourced from skmachineriesinternational.com</span>
    </div>
  </div>
</footer>`;
}

// ---------------------------------------------------------------------------
// Page fragments
// ---------------------------------------------------------------------------
export function breadcrumbs(items) {
  const last = items.length - 1;
  return `
<nav class="breadcrumbs" aria-label="Breadcrumb">
  <div class="container">
    <ol>
      ${items.map((it, i) => i === last
        ? `<li><span aria-current="page">${esc(it.label)}</span></li>`
        : `<li><a href="${esc(it.href)}">${esc(it.label)}</a></li>`).join('')}
    </ol>
  </div>
</nav>`;
}

export function pageHero({ eyebrow, title, sub }) {
  return `
<section class="page-hero">
  <div class="container">
    ${eyebrow ? `<span class="eyebrow eyebrow--light">${esc(eyebrow)}</span>` : ''}
    <h1>${esc(title)}</h1>
    ${sub ? `<p class="page-hero__sub">${esc(sub)}</p>` : ''}
  </div>
</section>`;
}

export function initials(name) {
  const words = String(name).split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((w) => w[0].toUpperCase()).join('') || 'SK';
}

export function entryCard(e) {
  const media = e.img
    ? `<a class="entry-card__media" href="${esc(e.url)}" tabindex="-1" aria-hidden="true"><img src="${esc(e.img)}" alt="${esc(e.name)}" loading="lazy"></a>`
    : `<a class="entry-card__media entry-card__media--text" href="${esc(e.url)}" tabindex="-1" aria-hidden="true">
        <span class="entry-card__initial">${esc(initials(e.name))}</span>
        <span class="entry-card__brandmark">${esc(e.brandShort)} &middot; ${esc(e.section || e.brandName)}</span>
      </a>`;
  return `
<article class="entry-card" data-name="${esc(e.name.toLowerCase())}" data-brand="${esc(e.brand)}" data-section="${esc((e.section || e.brandName || '').toLowerCase())}">
  ${media}
  <div class="entry-card__body">
    <span class="entry-card__brand">${esc(e.brandShort)}${e.section ? ' &middot; ' + esc(e.section) : ''}</span>
    <h3 class="entry-card__title"><a class="entry-card__link" href="${esc(e.url)}">${esc(e.cardTitle || e.name)}</a></h3>
    ${e.excerpt ? `<p class="entry-card__excerpt">${esc(e.excerpt)}</p>` : ''}
    ${e.dupNote ? `<span class="note-badge">${esc(e.dupNote)}</span>` : ''}
  </div>
</article>`;
}

export function brandCards(brands) {
  return `
<div class="brand-cards">
  ${brands.map((b) => `
  <a class="brand-card" href="${esc(b.url)}">
    <div class="brand-card__media${b.img ? '' : ' brand-card__media--text'}">
      ${b.img ? `<img src="${esc(b.img)}" alt="${esc(b.nav)}" loading="lazy">` : `<span class="brand-card__monogram">${esc(b.short)}</span>`}
    </div>
    <div class="brand-card__body">
      <span class="brand-card__count">${esc(b.badge)}</span>
      <h3 class="brand-card__title">${esc(b.nav)}</h3>
      <p class="brand-card__text">${esc(b.blurb)}</p>
      <span class="card-link">View product line ${ico('arrow')}</span>
    </div>
  </a>`).join('')}
</div>`;
}

export function chipRow(items, extraClass = '') {
  return `<div class="chip-row ${extraClass}">${items.map((c) => `<span class="chip chip--brand">${esc(c)}</span>`).join('')}</div>`;
}

export function catalogToolbar({ withSearch = false, chipAttr = 'brandTag', chips = [], withCount = false }) {
  return `
<div class="catalog-toolbar" data-catalog>
  ${withSearch ? `
  <div class="search-wrap">
    ${ico('search')}
    <input type="search" class="search-input" id="partsSearch" placeholder="Search part lines &mdash; e.g. piston, track shoe, NV45&hellip;" aria-label="Search part lines">
  </div>` : ''}
  ${chips.length ? `
  <div class="chip-row chip-row--filters" role="group" aria-label="Filter part lines">
    <button class="chip chip--filter" type="button" data-chip-attr="${esc(chipAttr)}" data-tag="all" aria-pressed="true">All</button>
    ${chips.map((c) => `<button class="chip chip--filter" type="button" data-chip-attr="${esc(chipAttr)}" data-tag="${esc(c.tag)}" aria-pressed="false">${esc(c.label)}</button>`).join('')}
  </div>` : ''}
  ${withCount ? `<span class="result-count" id="resultCount" aria-live="polite"></span>` : ''}
</div>`;
}

export function sectionNav(sections) {
  return `
<aside class="section-nav" aria-label="On this page">
  <div class="section-nav__title">On this page</div>
  <ul>
    ${sections.map((s) => `<li><a href="#sec-${esc(s.slug)}">${esc(s.name)}</a></li>`).join('')}
  </ul>
</aside>`;
}

export function modelList(models) {
  return `<ul class="model-list">${models.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`;
}

export function certCards(certs) {
  return `
<div class="cert-cards">
  ${certs.map((c) => `
  <figure class="cert-card">
    <div class="cert-card__media">
      <a href="${esc(c.img)}" data-gallery="${esc(c.gallery || 'certs')}" data-gallery-item aria-label="View ${esc(c.title)} larger">
        <img src="${esc(c.img)}" alt="${esc(c.title)}" loading="lazy">
      </a>
    </div>
    <figcaption class="cert-card__body">
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.note)}</p>
    </figcaption>
  </figure>`).join('')}
</div>`;
}

export function processSteps() {
  const steps = [
    { n: '01', t: 'Send your parts list', d: 'Call, email or use the enquiry form with the part names, models or catalogue references you need.' },
    { n: '02', t: 'Availability & quotation', d: 'We confirm stock availability across the CTP, HANDOK, ITR and JIC lines and quote your requirement.' },
    { n: '03', t: 'Supply', d: 'Parts are supplied urgent, long-term or project-based &mdash; new genuine, OEM and new replacement parts.' },
  ];
  return `
<div class="process">
  ${steps.map((s) => `
  <div class="process__step" data-animate>
    <div class="process__num">${s.n}</div>
    <h3>${s.t}</h3>
    <p>${s.d}</p>
  </div>`).join('')}
</div>`;
}

export function ctaBand(site) {
  return `
<section class="cta-band cta-band--form" id="enquiry">
  <div class="container cta-band__inner">
    <div class="cta-band__intro">
      <span class="eyebrow eyebrow--light">Contact us</span>
      <h2>Call us or send your parts list</h2>
      <p class="cta-band__phones">
        <a href="${esc(site.phone1Href)}">${esc(site.phone1)}</a> &middot;
        <a href="${esc(site.phone2Href)}">${esc(site.phone2)}</a> &middot;
        <a href="${esc(site.emailHref)}">${esc(site.email)}</a>
      </p>
      <div class="cta-band__actions">
        <a class="btn btn--primary" href="${esc(site.phone1Href)}">${ico('phone')} Call Now</a>
        <a class="btn btn--ghost" href="${esc(site.emailHref)}">${ico('mail')} Email the Sales Desk</a>
      </div>
    </div>
    <div class="cta-band__form">
      ${enquiryForm(site, { note: true })}
    </div>
  </div>
</section>`;
}

/**
 * Image carousel with heading — modern stand-in for the source site's
 * Elementor "CATALOG FOR …" slides widget (same heading text, arrows, autoplay).
 * @param {object} o
 * @param {string} o.title    heading, e.g. "CATALOG FOR ITR, JIC, CTP & HANDOK"
 * @param {Array}  o.slides   [{src, alt}]
 * @param {string} [o.note]   small honest note under the carousel
 */
export function catalogCarousel({ title, slides, note = '' }) {
  return `
<div class="catalog-block" data-animate>
  <h2 class="catalog-block__title">${esc(title)}</h2>
  <div class="catalog-slider" data-catalog-slider aria-label="${esc(title)} carousel">
    ${slides.map((s) => `
    <div class="catalog-slider__slide">
      <img src="${esc(s.src)}" alt="${esc(s.alt)}" loading="lazy">
    </div>`).join('')}
  </div>
  ${note ? `<p class="catalog-block__note">${esc(note)}</p>` : ''}
</div>`;
}

/**
 * Statement carousel — modern stand-in for the source "who we are" slides
 * whose slide headings survive but whose background images were empty on the
 * source site itself.
 * @param {Array} slides array of statement strings
 */
export function textSlider({ eyebrow = '', title = '', intro = '', slides = [] }) {
  return `
<section class="section section--navy text-slider-section">
  <div class="container">
    <div class="section__head section__head--center" data-animate>
      ${eyebrow ? `<span class="eyebrow eyebrow--light">${esc(eyebrow)}</span>` : ''}
      ${title ? `<h2 class="section__title">${esc(title)}</h2>` : ''}
      ${intro ? `<p class="section__intro">${esc(intro)}</p>` : ''}
    </div>
    <div class="text-slider" data-text-slider aria-label="Company statements carousel">
      ${slides.map((s) => `
      <div class="text-slider__slide"><p class="text-slider__text">${esc(s)}</p></div>`).join('')}
    </div>
  </div>
</section>`;
}

/**
 * Honest enquiry form — mirrors the source site's Contact Form 7 fields
 * (First/Last Name, Email, Company, Phone, Project Type Product select,
 * monthly-updates opt-in checkbox, Message, Submit). Frontend-only: submit
 * composes a pre-filled mailto via main.js; nothing is stored or sent.
 * @param {object} site site constants
 * @param {object} [o]  { id?: string, note?: boolean }
 */
export function enquiryForm(site, { id = 'enquiryForm', note = true } = {}) {
  return `
<form class="enquiry-form" id="${esc(id)}" data-email="${esc(site.email)}">
  ${note ? `<p class="form-note">This site has no mail server. Submitting opens a pre-filled email in your own email application &mdash; nothing is stored or sent from this site.</p>` : ''}
  <div class="form-row">
    <div class="form-group">
      <label for="f-first">First Name <span class="req">*</span></label>
      <input id="f-first" name="firstName" type="text" required autocomplete="given-name">
    </div>
    <div class="form-group">
      <label for="f-last">Last Name <span class="req">*</span></label>
      <input id="f-last" name="lastName" type="text" required autocomplete="family-name">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label for="f-email">Email <span class="req">*</span></label>
      <input id="f-email" name="email" type="email" required autocomplete="email">
    </div>
    <div class="form-group">
      <label for="f-phone">Phone <span class="req">*</span></label>
      <input id="f-phone" name="phone" type="tel" required autocomplete="tel">
    </div>
  </div>
  <div class="form-group">
    <label for="f-company">Company Name</label>
    <input id="f-company" name="company" type="text" autocomplete="organization">
  </div>
  <div class="form-group">
    <label for="f-line">Project Type Product <span class="req">*</span></label>
    <select id="f-line" name="productLine" required>
      <option value="" selected disabled>Please Select</option>
      <option>CTP PRODUCT</option>
      <option>HANDOK PRODUCT</option>
      <option>ITR PRODUCT</option>
      <option>JIC PRODUCT</option>
    </select>
  </div>
  <label class="form-check" for="f-updates">
    <input id="f-updates" name="updates" type="checkbox">
    <span>Receive monthly updates covering marketing, strategy, design, and all things digital.</span>
  </label>
  <div class="form-group">
    <label for="f-message">Message <span class="req">*</span></label>
    <textarea id="f-message" name="message" required maxlength="2000" placeholder="List the parts, model numbers or equipment you need&hellip;"></textarea>
  </div>
  <button class="btn btn--primary btn--lg" type="submit">Submit</button>
  <p class="form-status" id="formStatus" role="status"></p>
</form>`;
}

export function noResults() {
  return `
<div class="no-results is-hidden">
  <h3>No part lines match your search</h3>
  <p>Try a shorter search term, or clear the filters. If you still cannot find a part, call us &mdash; stock changes daily and not every line is listed here yet.</p>
</div>`;
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------
export function orgJsonLd(site) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: site.domain + '/',
    telephone: site.phone1Href.replace('tel:', ''),
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Office Suite #7B, 7th Floor, Tropical Noor Tower, 40 Kazi Nazrul Islam Avenue, Karwan Bazar',
      addressLocality: 'Dhaka',
      postalCode: '1215',
      addressCountry: 'BD',
    },
  };
  return JSON.stringify(data);
}

export function bcJsonLd(site, crumbs) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: site.domain + c.href,
    })),
  };
  return JSON.stringify(data);
}
