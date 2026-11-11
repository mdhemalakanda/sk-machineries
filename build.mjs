#!/usr/bin/env node
/* =============================================================================
 * SK Machineries International — static site generator (zero dependencies).
 * Reads data/content-inventory.json (research snapshot) + assets/raw-manifest.json
 * (harvested SK-owned images) and renders the full static site into dist/.
 * Run: node build.mjs
 * ========================================================================== */
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, copyFileSync, statSync, rmSync, renameSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as C from './templates/components.mjs';
import { page } from './templates/layout.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const RAW_DIR = join(ROOT, 'assets', 'raw');

/* ---------------------------------------------------------------------------
 * Site constants — every value sourced from the live site (see research JSON).
 * ------------------------------------------------------------------------- */
const site = {
  name: 'SK Machineries International',
  domain: 'https://skmachineriesinternational.com',
  phone1: '+8801715-068755',
  phone1Href: 'tel:+8801715068755',
  phone2: '+88 02 8331895',
  phone2Href: 'tel:+88028331895',
  email: 'Prothom04@gmail.com',
  emailHref: 'mailto:Prothom04@gmail.com',
  address:
    'Office Suite #7B, 7th Floor, Tropical Noor Tower (Lift 7), 40 Kazi Nazrul Islam Avenue, Karwan Bazar, Dhaka-1215 (Opposite of CA Bhaban)',
  addressShort: 'Tropical Noor Tower, Karwan Bazar, Dhaka-1215',
};

/* ---------------------------------------------------------------------------
 * Load research data
 * ------------------------------------------------------------------------- */
const INV = JSON.parse(readFileSync(join(ROOT, 'data', 'content-inventory.json'), 'utf8'));
const RAW = readJsonOptional(join(ROOT, 'assets', 'raw-manifest.json')) || {};
const IMG_USED = {};
const IMG_MISSING = {};

function readJsonOptional(p) {
  try {
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
  } catch {
    return null;
  }
}

// Image resolution runs at module level (IMG consts below), so the output
// directory must exist before the first copyImg call.
//
// 2026-11-07: this workspace sits on the iCloud-synced Desktop with "Optimize
// Mac Storage" active under heavy disk pressure; macOS evicts cold files to
// the cloud and ANY read of an evicted file (copyFileSync → pread, open(),
// ESM import) stalls forever at 0% CPU. Before touching any file, run the
// self-healing pass (stored OUTSIDE the synced tree in ~/Library/Application
// Support): it probes every input with a per-file timeout, re-downloads
// evicted raw images from their recorded source URLs, and restores evicted
// irreplaceable inputs (manifest, inventory, templates, src) from backups.
const HEALER = join(process.env.HOME, 'Library', 'Application Support', 'SKMachineriesBuildBackup', 'heal-assets.py');
try {
  execFileSync('python3', [HEALER, ROOT], { timeout: 600000, stdio: 'inherit' });
} catch (e) {
  console.error('Asset self-heal failed:', String(e.message).slice(0, 200));
}
// Fresh dist on every build: overwriting an evicted stale file can also stall,
// while deletion needs no content reads and every file below is regenerated.
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets', 'img'), { recursive: true });

/* ---------------------------------------------------------------------------
 * Text refinement — grammar/typography fixes only, facts untouched.
 * ------------------------------------------------------------------------- */
const TYPO = [
  ['out of specks', 'out of spec'],
  ['Prorotional', 'Promotional'],
  ['cuf off', 'cut off'],
  ['New Holand', 'New Holland'],
  ['Asbesto-Free', 'Asbestos-Free'],
  ['theerosion', 'the erosion'],
];
const clean = (s) =>
  typeof s === 'string'
    ? TYPO.reduce((acc, [a, b]) => acc.split(a).join(b), s).replace(/\s+/g, ' ').trim()
    : s;

const SECTION_TITLE = {
  'POWER TRAIN': 'Power Train',
  'HYDRAULIC PARTS': 'Hydraulic Parts',
  'FUEL INJECTION': 'Fuel Injection',
};
const secTitle = (s) => SECTION_TITLE[s] || s;

const PLACEHOLDER = /no description|title only|model numbers? only/i;
const realDesc = (d) => {
  const c = clean(d);
  return c && !PLACEHOLDER.test(c) ? c : null;
};

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'part';
}

const excerptFrom = (text, max = 170) => {
  if (!text) return null;
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '…' : text;
};

/* ---------------------------------------------------------------------------
 * Image resolution — only SK-owned assets harvested into assets/raw/.
 * Patterns are matched against harvested basenames; misses render text tiles.
 * ------------------------------------------------------------------------- */
function guardedRead(file, timeoutMs = 30000) {
  // Read a file via a subprocess with a hard timeout. A direct readFileSync can
  // stall forever when macOS FileProvider has dehydrated the file to iCloud —
  // a child process can be killed, this process cannot.
  try {
    return execFileSync('cat', [file], { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

function copyImg(file, key) {
  const src = join(RAW_DIR, file);
  if (!existsSync(src)) {
    IMG_MISSING[key] = [file + ' (listed in manifest but absent on disk)'];
    return null;
  }
  const ext = (extname(file) || '.jpg').toLowerCase();
  const dest = `${key}${ext}`;
  let data = guardedRead(src);
  if (!data) {
    // The file dehydrated to iCloud (or vanished into a stuck materialization).
    // Recovery order: re-download from the recorded source URL, then the
    // off-Desktop backup copy kept by tools/heal-assets.py.
    console.error('copyImg: read stalled for', file, '— recovering');
    const source = RAW[file] && RAW[file].source;
    if (source) {
      const tmp = src + '.healing';
      try {
        execFileSync('curl', ['-s', '--max-time', '60', '-o', tmp, source], { timeout: 70000 });
        data = guardedRead(tmp);
        if (data) {
          renameSync(tmp, src);
          console.error('copyImg: recovered from source URL:', file);
        }
      } catch {
        /* fall through to backup */
      }
    }
    if (!data) {
      const backupCopy = join(process.env.HOME, 'Library', 'Application Support', 'SKMachineriesBuildBackup', 'inputs', 'raw', file);
      if (existsSync(backupCopy)) {
        data = guardedRead(backupCopy);
        if (data) {
          writeFileSync(src, data);
          console.error('copyImg: recovered from backup:', file);
        }
      }
    }
    if (!data) {
      IMG_MISSING[key] = [file + ' (unreadable — iCloud dehydrated, no recovery source)'];
      return null;
    }
  }
  try {
    writeFileSync(join(DIST, 'assets', 'img', dest), data);
  } catch {
    IMG_MISSING[key] = [file + ' (copy failed)'];
    return null;
  }
  IMG_USED[dest] = RAW[file] ? RAW[file].source : file;
  return `/assets/img/${dest}`;
}

function imgFor(key, patterns) {
  for (const re of patterns) {
    const hit = Object.keys(RAW).find((f) => re.test(f));
    if (hit) return copyImg(hit, key);
  }
  IMG_MISSING[key] = patterns.map(String);
  return null;
}

function imgAll(keyPrefix, pattern) {
  const out = [];
  Object.keys(RAW)
    .filter((f) => pattern.test(f))
    .sort()
    .forEach((f, i) => {
      const u = copyImg(f, `${keyPrefix}-${i + 1}`);
      if (u) out.push({ src: u, file: f });
    });
  if (!out.length) IMG_MISSING[keyPrefix] = [String(pattern)];
  return out;
}

/* ---------------------------------------------------------------------------
 * Build brand + entry model from the research inventory
 * ------------------------------------------------------------------------- */
const cat = (name) => INV.categories.find((c) => c.name === name) || { products: [] };

const usedSlugs = { ctp: new Set(), handok: new Set(), itr: new Set() };
function uniqSlug(base, set) {
  let s = base;
  let i = 2;
  while (set.has(s)) s = `${base}-${i++}`;
  set.add(s);
  return s;
}

const objRows = (o) =>
  o && typeof o === 'object' ? Object.entries(o).map(([k, v]) => [clean(k), clean(String(v))]) : [];

/* ---- CTP ---- */
const ctpEntries = [];
const ctpSeen = new Map();
for (const p of cat('CTP PRODUCT').products) {
  const name = clean(p.name);
  const key = name.toLowerCase();
  const desc = realDesc(p.description);
  const rows = objRows(p.specifications);
  if (ctpSeen.has(key)) {
    const prev = ctpSeen.get(key);
    prev.count += 1;
    prev.dupNote = `Listed ${prev.count}× on the source CTP page`;
    if (!prev.description && desc) prev.description = desc;
    if ((!prev.specs || !prev.specs.length) && rows.length) prev.specs = rows;
    continue;
  }
  const e = {
    brand: 'ctp',
    brandShort: 'CTP',
    brandName: 'CTP Product',
    name,
    section: secTitle(clean(p.section)),
    type: p.type,
    description: desc,
    specs: rows,
    features: (p.features || []).map(clean),
    applications: (p.applications || []).map(clean),
    count: 1,
  };
  e.slug = uniqSlug(slugify(name), usedSlugs.ctp);
  e.sectionSlug = slugify(e.section);
  e.url = `/products/ctp/${e.slug}/`;
  ctpSeen.set(key, e);
  ctpEntries.push(e);
}
// group into sections preserving source order
const ctpSections = [];
{
  const bySec = new Map();
  for (const e of ctpEntries) {
    if (!bySec.has(e.section)) {
      const s = { name: e.section, slug: e.sectionSlug, entries: [] };
      bySec.set(e.section, s);
      ctpSections.push(s);
    }
    bySec.get(e.section).entries.push(e);
  }
}

/* ---- HANDOK ---- */
const handokEntries = [];
for (const p of cat('HANDOK PRODUCT').products) {
  let rawName = clean(p.name);
  let app = null;
  const appM = rawName.match(/\s+for\s+([A-Za-z][A-Za-z\s&.-]+)$/i);
  if (appM) {
    app = appM[1].trim();
    rawName = rawName.slice(0, appM.index).trim();
  }
  const models = rawName.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
  const group = clean(p.section);
  const e = {
    brand: 'handok',
    brandShort: 'HANDOK',
    brandName: 'HANDOK Product',
    name: rawName,
    app,
    models,
    group,
    groupSlug: slugify(group),
    description: realDesc(p.description),
    count: 1,
  };
  e.titleShort =
    models.length > 3
      ? `${models.slice(0, 3).join(' / ')} +${models.length - 3} more`
      : models.join(' / ');
  e.slug = uniqSlug(slugify(rawName), usedSlugs.handok);
  e.url = `/products/handok/${e.slug}/`;
  handokEntries.push(e);
}
const handokGroups = [];
{
  const byG = new Map();
  for (const e of handokEntries) {
    if (!byG.has(e.group)) {
      const g = { name: e.group, slug: e.groupSlug, entries: [] };
      byG.set(e.group, g);
      handokGroups.push(g);
    }
    byG.get(e.group).entries.push(e);
  }
}

/* ---- ITR (15 source card instances → unique entries, duplicates noted) ---- */
const itrRaw = cat('ITR PRODUCT').products;
const itrEntries = [];
const itrSeen = new Map();
for (const p of itrRaw) {
  const name = clean(p.name);
  const key = name.toLowerCase();
  if (itrSeen.has(key)) {
    const prev = itrSeen.get(key);
    prev.count += 1;
    prev.dupNote = `Listed ${prev.count}× on the source ITR page`;
    continue;
  }
  const e = {
    brand: 'itr',
    brandShort: 'ITR',
    brandName: 'ITR Product',
    name,
    section: 'Undercarriage & GET',
    description: realDesc(p.description),
    count: 1,
  };
  e.slug = uniqSlug(slugify(name), usedSlugs.itr);
  e.url = `/products/itr/${e.slug}/`;
  itrSeen.set(key, e);
  itrEntries.push(e);
}

const ITR_META = {
  description: clean(cat('ITR PRODUCT').description),
  coverage: clean(cat('ITR PRODUCT').coverage),
  partTypes: (cat('ITR PRODUCT').partTypeList || []).map(clean),
  intro: clean(cat('ITR PRODUCT').intro),
};

const JIC_INTRO =
  'SK MACHINERY INTERNATIONAL is the Authorized distributor for JIC — hydraulic pumps and rotary kits for CAT, Kobelco, Komatsu, Sumitomo, Hitachi and Mitsubishi brand excavators, from South Korea.';

/* ---------------------------------------------------------------------------
 * Assign harvested images (SK-owned assets only; misses stay text tiles).
 * 2026-11-07 content restoration: the source pages carry far more imagery than
 * the first build shipped. Every mapping below traces to a file in assets/raw/
 * harvested from skmachineriesinternational.com (see raw-manifest.json).
 * ------------------------------------------------------------------------- */
const pick = (key, file) =>
  imgFor(key, [new RegExp('^' + file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')]);

const IMG = {
  logo: imgFor('logo', [/^LOGO-removebg-preview\.png$/i]),
  hero1: imgFor('hero1', [/^Banner-01\.jpg$/i]),
  hero2: imgFor('hero2', [/^undercarriage-main-banner-1\.jpg$/i]),
  hero3: imgFor('hero3', [/^undercarriage-main-banner-2\.jpg$/i]),
  brandCTP: imgFor('brand-ctp', [/^CTP\.jpg$/i, /^CTP-1\.jpg$/i]),
  brandHANDOK: imgFor('brand-handok', [/^handok-1\.jpg$/i]),
  brandITR: imgFor('brand-itr', [/^imageedit_3_4336580832\.png$/i]),
  brandJIC: imgFor('brand-jic', [/^CATALOGUE2019_page-0001\.jpg$/i]),
  pistons: imgFor('piston-kits', [/piston/i]),
  certCTP: imgFor('cert-ctp', [/^image_6487327\.jpg$/i]),
  certHandok: imgFor('cert-handok', [/^certi3\.jpg$/i]),
  certJIC: imgFor('cert-jic', [/^SK-MACHINERY-AUTHORISE-JIC-DISTRIBUTOR/i]),

  /* restored home-page imagery */
  chairman: pick('chairman', 'chairman.jpg'),
  skmFlyer: pick('skm-flyer', 'skm.jpg'),
  footerLogo: pick('footer-logo', 'output-onlinepngtools-14.png'),
  ctpLogo: pick('ctp-logo', 'ctp.png'),
  rubberTracks: pick('rubber-tracks', 'rubber-tracks.jpg'),
  /* source hero slider — all 10 slides */
  heroS1: pick('hero-s1', 'Banner-09.jpg'),
  heroS3: pick('hero-s3', 'Banner-02.jpg'),
  heroS4: pick('hero-s4', 'Banner-11.jpg'),
  heroS5: pick('hero-s5', 'Banner-17.jpg'),
  heroS6: pick('hero-s6', 'Banner-12.jpg'),
  heroS7: pick('hero-s7', 'Banner-21.jpg'),
  heroS8: pick('hero-s8', 'Banner-20.jpg'),
  heroS9: pick('hero-s9', 'Banner-14.jpg'),
  heroS10: pick('hero-s10', 'Banner-07.jpg'),
  /* "recent work" gallery tiles */
  rw1: pick('rw-1', '750x405.jpg'),
  rw2: pick('rw-2', '750x405-2.jpg'),
  rw3: pick('rw-3', 'Banner-20.jpg'),
  rw4: pick('rw-4', 'Banner-21-1.jpg'),
  rw5: pick('rw-5', '750x405-3.jpg'),
  rw6: pick('rw-6', '750x405-4.jpg'),
  rw7: pick('rw-7', 'Banner-08.jpg'),
  rw8: pick('rw-8', 'Banner-14.jpg'),
  /* "technologies" carousel (16 GIF slides) */
  tech1: pick('tech-01', '01-8.gif'),
  tech2: pick('tech-02', '02-1.gif'),
  tech3: pick('tech-03', '02-2.gif'),
  tech4: pick('tech-04', '02-4.gif'),
  tech5: pick('tech-05', '03-2.gif'),
  tech6: pick('tech-06', '03-4.gif'),
  tech7: pick('tech-07', '03-5.gif'),
  tech8: pick('tech-08', '03-6.gif'),
  tech9: pick('tech-09', '04-3.gif'),
  tech10: pick('tech-10', '04-4.gif'),
  tech11: pick('tech-11', '04-6.gif'),
  tech12: pick('tech-12', '04-8.gif'),
  tech13: pick('tech-13', 'carriers.gif'),
  tech14: pick('tech-14', 'cylinders.gif'),
  tech15: pick('tech-15', 'products-con_rods.gif'),
  tech16: pick('tech-16', 'startors.gif'),
  /* bottom photo gallery (Banner-09 full-width reuses heroS1; sealkit reuses the ITR image) */
  gal1: pick('gal-1', 'Banner-13.jpg'),
  gal2: pick('gal-2', 'Banner-18.jpg'),
  gal3: pick('gal-3', 'Banner-03.jpg'),
  gal4: pick('gal-4', 'Banner-23.jpg'),
  gal5: pick('gal-5', 'Banner-16.jpg'),
  gal6: pick('gal-6', 'Banner-24.jpg'),
  gal7: pick('gal-7', 'Banner-19.jpg'),
  gal8: pick('gal-8', 'Banner-15.jpg'),
  /* CTP section/card imagery harvested from the source CTP page */
  abcGasket: pick('ctp-abc-gasket', 'abc-gasket-kits-top.png'),
  ringKits: pick('ctp-ring-kits', 'ring-kits-f-720-032_ctp_costex.jpg.png'),
  waterPumps: pick('ctp-water-pumps', 'water-pumps-f-720-256.jpg.png'),
  selfLocking: pick('ctp-self-locking', 'self-locking-nylon-patch-f-720-113_ctp_costex.jpg.png'),
  dozerBlades: pick('ctp-dozer-blades', 'bulldozer20blades-end-bits-for-komatsu-f-720-260_ctp_costex.jpg.png'),
  sharpTeeth: pick('ctp-sharp-teeth', 'self-sharpening-teeth-f-720-092_ctp_costex.jpg.png'),
  equalizerBar: pick('ctp-equalizer-bar', 'equalizer-bar-f-720-042_ctp_costex.jpg.png'),
  trackLinks: pick('ctp-track-links', 'track-links.png'),
  greaseGun: pick('ctp-grease-gun', 'grease-gun-kit-f-720-159_ctp_costex.jpg.png'),
  fuelLines: pick('ctp-fuel-lines', 'fuel-lines-komatsu-f-720-278.jpg.png'),
  sealsKits: pick('ctp-seals-kits', 'seals-kits-header.jpg.png'),
  hydraulicPumps: pick('ctp-hydraulic-pumps', 'hydraulic-pumps.jpg.png'),
  linerKitGif: pick('ctp-liner-kit', 'products-liner_kit.gif'),
  blockGif: pick('ctp-block', 'products-block.gif'),
};
site.logo = IMG.logo;
site.footerLogo = IMG.footerLogo;

const ENTRY_IMG = {
  'Teeth & Adapter': imgFor('itr-teeth-adapter', [/teeth[-_]?adapter/i]),
  'Track Adjuster': imgFor('itr-track-adjuster', [/track[-_]?adjuster/i]),
  'Track Guard': imgFor('itr-track-guard', [/track[-_]?guard/i]),
  'Track Shoe': imgFor('itr-track-shoe', [/track[-_]?shoe/i]),
  Sealkit: imgFor('itr-sealkit', [/sealkit/i]),
  'Recoil Spring': imgFor('itr-recoil-spring', [/recoil/i]),
  'Breaker Tools': imgFor('itr-breaker-tools', [/breaker/i]),
  Excavator: imgFor('itr-excavator', [/undercarriage/i, /idler/i, /excavator/i]),
};

for (const e of itrEntries) if (ENTRY_IMG[e.name]) e.img = ENTRY_IMG[e.name];
{
  const pk = ctpEntries.find((e) => e.name === 'Piston Kits');
  if (pk && IMG.pistons) pk.img = IMG.pistons;
}

/* Source CTP card images recovered from the harvest (filename matches entry). */
const CTP_CARD_IMG = {
  'Liner Kits': IMG.linerKitGif,
  'Remanufactured Blocks': IMG.blockGif,
  Carriers: IMG.tech13,
  'Hydraulic Pumps': IMG.hydraulicPumps,
  'Hydraulic Cylinders': IMG.tech14,
  'Fuel Assembly Lines': IMG.fuelLines,
  'Equalizer Bars': IMG.equalizerBar,
  'Track links': IMG.trackLinks,
  'Track adjuster & recoil': ENTRY_IMG['Track Adjuster'],
  'Self-Sharpening Teeth': IMG.sharpTeeth,
  'Dozer blades': IMG.dozerBlades,
  'Self-Locking Nuts': IMG.selfLocking,
  'Water Pumps': IMG.waterPumps,
  'ABC Gasket Kits': IMG.abcGasket,
  'Multi-Purpose O-Ring Kits': IMG.ringKits,
  'Hydraulic Seal Kits': IMG.sealsKits,
  'Grease Gun': IMG.greaseGun,
  'Connecting Rods': IMG.tech15,
};
for (const e of ctpEntries) {
  const img = CTP_CARD_IMG[e.name];
  if (img && !e.img) e.img = img;
}

/* Shared "CATALOG FOR …" carousel — the source site runs the same Elementor
 * slides widget on Home, About and the brand pages. Its four slide background
 * images are injected by JS on the live site and could not be captured by the
 * research crawl; the four genuine ITR product photographs below (from SK's
 * own media library, seal kits first as visible on the live site) stand in. */
const CATALOG_SLIDES = [
  ENTRY_IMG.Sealkit && { src: ENTRY_IMG.Sealkit, alt: 'ITR seal kits — from the SK Machineries catalogue' },
  ENTRY_IMG['Teeth & Adapter'] && { src: ENTRY_IMG['Teeth & Adapter'], alt: 'ITR teeth & adapters — from the SK Machineries catalogue' },
  ENTRY_IMG['Recoil Spring'] && { src: ENTRY_IMG['Recoil Spring'], alt: 'ITR recoil springs — from the SK Machineries catalogue' },
  ENTRY_IMG['Breaker Tools'] && { src: ENTRY_IMG['Breaker Tools'], alt: 'ITR breaker tools — from the SK Machineries catalogue' },
].filter(Boolean);

const CATALOG_NOTE =
  'The source site rotates catalogue photography here; these four product photos come from SK Machineries’ own media library.';

/* Documented source-typo fixes (see README) applied to verbatim strings. */
const fixTypos = (s) =>
  String(s)
    .replace(/Prorotional/g, 'Promotional')
    .replace(/cuf off/g, 'cut off')
    .replace(/New Holand/g, 'New Holland')
    .replace(/out of specks/g, 'out of spec')
    .replace(/theerosion/g, 'the erosion');

/* Verbatim four-brand authorization paragraph (source HANDOK/JIC pages). */
const AUTH_INTRO = fixTypos(cat('HANDOK PRODUCT').intro || '');

/* Verbatim ITR authorization sentence (source ITR page). */
const ITR_AUTH =
  'SK MACHINERY INTERNATIONAL is the Authorized distributor for ITR (Undercarriage parts for all brands of equipment from Italy).';

/* Rubber Tracks special features (source bullets, not part of the inventory intro). */
const RUBBER_TRACK_FEATURES = [
  '3 Metal Cores Wound Up: Higher durability & Better flexibility',
  'Smaller Contact Surface (Smaller Lug) : Better grip & traction',
  'Bi Directional: Tracks are Interchangeable',
  'Reinforced Edges Between Lugs: decreasing the chance of slicing',
  'Jointless: Track is much stronger than the joint type',
];

/* CTP per-section inventory metadata (intros + "parts available" lists). */
const ctpMeta = {};
for (const s of cat('CTP PRODUCT').sections) {
  ctpMeta[slugify(secTitle(clean(s.name)))] = {
    intro: fixTypos(clean(s.intro || '')),
    partTypes: (s.partTypeList || []).map((t) => fixTypos(clean(t))),
    rawName: s.name,
  };
}

/* Source home-page Handok cards (12) — [group, distinctive name prefix]. */
const HOME_HANDOK_CARDS = [
  ['pumps', 'KVC925'],
  ['pumps', 'NV45'],
  ['pumps', 'H3V63BDT'],
  ['motors', 'MX50'],
  ['motors', 'M2X55'],
  ['motors', 'DNB50B'],
  ['valves', 'Valve For H3V63'],
  ['valves', 'Promotional pressure reducing valve For H3V63 / H3V112 / H3V140 / H3V180 For H5V80'],
  ['valves', 'Promotional pressure reducing valve For H3V63 / H3V112 / H3V140 / H3V180 &'],
  ['regulators', 'Regulator H3V112'],
  ['regulators', '3L09'],
  ['regulators', '3N09'],
].map(([group, token]) => {
  const t = token.toLowerCase();
  const hit = handokEntries.find(
    (e) => e.group === group && fixTypos(e.models.join(' / ') + (e.app ? ' For ' + e.app : '')).toLowerCase().replace(/\s+/g, ' ').startsWith(t)
  ) || handokEntries.find((e) => e.group === group && fixTypos(e.name).toLowerCase().replace(/\s+/g, ' ').startsWith(t));
  return { group, entry: hit || null };
});

/* Source home-page ITR cards — 15 instances as published. */
const HOME_ITR_INSTANCES = [
  'Teeth & Adapter', 'Teeth & Adapter', 'Teeth & Adapter',
  'Track Adjuster', 'Track Adjuster', 'Track Adjuster',
  'Sealkit', 'Track Guard', 'Track Guard',
  'Recoil Spring', 'Track Shoe', 'Track Shoe',
  'Breaker Tools', 'Excavator', 'Excavator',
];

/* Source home-page "Provides / Delivers / Experience" accordion (verbatim). */
const PROVIDES_ITEMS = [
  {
    t: 'Provides',
    d: 'SK MACHINERY INTERNATIONAL Provides Spare parts for the Power, Heavy Earth moving Construction equipment, Mining and Gas generator. Our Company Assists Buyers with their Urgent, Long term and Project based Spare parts.',
  },
  {
    t: 'Delivers',
    d: 'SK MACHINERY INTERNATIONAL Delivers New Genuine, OEM and New Replacements parts from CTP, HANDOK, CATERPILLAR, CUMMINS, KOMATSU, MITSUBISHI, HYUNDAI, DAEWOO. All Engine side new replacement parts of CTP Brand for Caterpillar Equipment are available in our ready stock and also More than 100 Models of HANDOK BRAND HYDRAULIC Pump parts for Japanese Excavators are available in our stock.',
  },
  {
    t: 'Experience',
    d: 'SK MACHINERY INTERNATIONAL is a One-Stop Shop for Power, Heavy Earth Moving Construction Equipment, Mining and Gas Generator Spare Parts.',
  },
];

/* Source home-page "who we are" carousel statements (verbatim). */
const WHO_WE_ARE_SLIDES = [
  'we are sk machineries international',
  'we are authorized distributor for ITR, CTP, JIC & HANDOK',
  'one of the Leading hydraulic Pump Parts Seller',
  'we are One-Stop sales center for Power, Heavy Equipment etc.',
];

/* JIC catalogue gallery — captions/categories restored from the source page
 * (visible items carried the captions "JIC Catalogue 2020 / JIC Hydraulic"
 * and "JIC Catalogue 2020 / JIC Hydraulic Motor"; the remaining pages were
 * reachable only via the source's "Load More" control and had no visible
 * category label in the snapshot). */
const JIC_PAGE_META = {
  '0002': { cat: 'catalogue-2020', sub: 'JIC Hydraulic' },
  '0001': { cat: 'catalogue-2020', sub: 'JIC Hydraulic' },
  '0004': { cat: 'catalogue-2020', sub: 'JIC Hydraulic' },
  '0005': { cat: 'hydraulic-motor', sub: 'JIC Hydraulic Motor' },
  '0006': { cat: 'hydraulic-motor', sub: 'JIC Hydraulic Motor' },
  '0007': { cat: 'hydraulic-motor', sub: 'JIC Hydraulic Motor' },
};
const jicGallery = imgAll('jic-catalogue', /catalogue2019/i).map(({ src, file }) => {
  const pm = file.match(/page[-_](\d+)/i);
  const page = pm ? pm[1] : '';
  const meta = JIC_PAGE_META[page] || { cat: '', sub: '' };
  return {
    img: src,
    page,
    cat: meta.cat,
    title: `JIC Catalogue 2020${meta.sub ? ' — ' + meta.sub : ''}`,
    note: 'Catalogue page as published on the source JIC Product page',
  };
});

const certs = [
  { img: IMG.certCTP, title: 'CTP Certification', note: 'Certificate of authorization for CTP replacement parts (shown by position on the source Certification page).' },
  { img: IMG.certHandok, title: 'HANDOK Certification', note: 'Certificate of authorization for HANDOK hydraulic parts (shown by position on the source Certification page).' },
  { img: IMG.certJIC, title: 'JIC Distributor Certificate', note: 'Authorized distributor certificate for JIC (named by its own filename on the source site).' },
].filter((c) => c.img);

/* ---------------------------------------------------------------------------
 * Flat entry index (products hub + search)
 * ------------------------------------------------------------------------- */
function excerptFor(e) {
  if (e.description) return excerptFrom(e.description);
  if (e.models) return 'Model numbers: ' + e.models.slice(0, 6).join(' · ') + (e.models.length > 6 ? ' …' : '');
  return 'Specifications available on request.';
}

const allEntries = [
  ...ctpEntries.map((e) => ({ ...e, excerpt: excerptFor(e), cardTitle: e.name })),
  ...handokEntries.map((e) => ({
    ...e,
    section: e.group,
    sectionSlug: e.groupSlug,
    excerpt: e.app ? `For ${e.app} — models: ${e.models.slice(0, 6).join(', ')}` : excerptFor(e),
    cardTitle: e.titleShort,
  })),
  ...itrEntries.map((e) => ({ ...e, excerpt: excerptFor(e) })),
];

const counts = {
  ctpSource: cat('CTP PRODUCT').products.length,
  handokSource: cat('HANDOK PRODUCT').products.length,
  // The research counts 15 ITR card instances while storing 8 unique entries
  // (identical-titled cards). Use the research total so coverage reporting
  // reflects every source listing.
  itrSource: (INV.counts && INV.counts.productsITR) || itrRaw.length,
  ctpPages: ctpEntries.length,
  handokPages: handokEntries.length,
  itrPages: itrEntries.length,
};
counts.pagesCovered = counts.ctpPages + counts.handokPages + counts.itrPages;
counts.sourceEntries = counts.ctpSource + counts.handokSource + counts.itrSource;

const brandDefs = [
  { id: 'ctp', short: 'CTP', nav: 'CTP Product', badge: `${counts.ctpSource} listings`, url: '/products/ctp/', img: IMG.brandCTP, blurb: 'Replacement parts for Caterpillar equipment — from the USA. All engine-side CTP parts in ready stock.' },
  { id: 'handok', short: 'HANDOK', nav: 'HANDOK Product', badge: `${counts.handokSource} series`, url: '/products/handok/', img: IMG.brandHANDOK, blurb: 'Hydraulic pumps, motors, valves and regulators for excavators — South Korea. 100+ pump models in stock.' },
  { id: 'itr', short: 'ITR', nav: 'ITR Product', badge: `${counts.itrSource} listings`, url: '/products/itr/', img: IMG.brandITR, blurb: 'Undercarriage parts and components for all brands of equipment — from Italy.' },
  { id: 'jic', short: 'JIC', nav: 'JIC Product', badge: 'Catalogue', url: '/products/jic/', img: IMG.brandJIC, blurb: 'Hydraulic pumps and rotary kits for CAT, Kobelco, Komatsu, Sumitomo, Hitachi, Mitsubishi — South Korea.' },
];

/* ---------------------------------------------------------------------------
 * Shared page fragments
 * ------------------------------------------------------------------------- */
/* Source hero slider: all 10 slides with their original imagery and copy.
 * Slide 1 carried "WELCOME TO / SK MACHINERY INTERNATIONAL"; the rest repeat
 * the company name. The one-stop sentence and CTAs are kept on slide 1 as the
 * usable summary of the source home page. */
const HERO_CTAS = {
  cta1: { label: 'Browse Products', href: '/products/' },
  cta2: { label: 'Request a Quote', href: '/contact/' },
};
const HERO_SLIDES = [
  {
    img: IMG.heroS1 || IMG.hero1,
    eyebrow: 'Welcome to',
    title: 'SK Machinery International',
    sub: 'A one-stop sales center for power, heavy earth moving construction equipment, mining and gas generator spare parts — new genuine, OEM and new replacement parts.',
    ...HERO_CTAS,
  },
  { img: IMG.hero1, title: 'SK Machinery International', ...HERO_CTAS },
  { img: IMG.heroS3, title: 'SK Machinery International', ...HERO_CTAS },
  { img: IMG.heroS4, title: 'SK Machinery International', ...HERO_CTAS },
  { img: IMG.heroS5, title: 'SK Machinery International', ...HERO_CTAS },
  { img: IMG.heroS6, title: 'SK Machinery International', ...HERO_CTAS },
  { img: IMG.heroS7, title: 'SK Machinery International', ...HERO_CTAS },
  { img: IMG.heroS8, title: 'SK Machinery International', ...HERO_CTAS },
  { img: IMG.heroS9, title: 'SK Machinery International', ...HERO_CTAS },
  { img: IMG.heroS10, title: 'SK Machinery International', ...HERO_CTAS },
];

function heroMarkup() {
  const slides = HERO_SLIDES.map((s) => {
    const bg = s.img
      ? `<div class="hero__bg"><img src="${C.esc(s.img)}" alt="" fetchpriority="high"></div>`
      : '';
    return `
    <div class="hero__slide"${s.img ? '' : ' style="background:linear-gradient(115deg,var(--navy-deep),var(--navy))"'}>
      ${bg}
      <div class="hero__overlay"></div>
      <div class="container">
        <div class="hero__content">
          ${s.eyebrow ? `<span class="eyebrow eyebrow--light">${C.esc(s.eyebrow)}</span>` : ''}
          <h1 class="hero__title">${C.esc(s.title)}</h1>
          ${s.sub ? `<p class="hero__sub">${C.esc(s.sub)}</p>` : ''}
          <div class="hero__cta">
            <a class="btn btn--primary btn--lg" href="${C.esc(s.cta1.href)}">${C.esc(s.cta1.label)}</a>
            <a class="btn btn--ghost btn--lg" href="${C.esc(s.cta2.href)}">${C.esc(s.cta2.label)}</a>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  return `<section class="hero hero--slider" aria-label="SK Machineries International introduction">${slides}</section>`;
}

function detailPrevNext(list, idx) {
  const prev = list[idx - 1];
  const next = list[idx + 1];
  if (!prev && !next) return '';
  const prevLink = prev
    ? `<a class="text-link" href="${C.esc(prev.url)}">Previous: ${C.esc(prev.cardTitle || prev.name)}</a>`
    : '';
  const nextLink = next
    ? `<a class="text-link" href="${C.esc(next.url)}">Next: ${C.esc(next.cardTitle || next.name)}</a>`
    : '';
  return `
  <div class="detail-block">
    <p>${[prevLink, nextLink].filter(Boolean).join('<span aria-hidden="true"> &nbsp;·&nbsp; </span>')}</p>
  </div>`;
}

/* ---------------------------------------------------------------------------
 * Renderers
 * ------------------------------------------------------------------------- */
function renderHome() {
  const ctpCards = ['Piston Kits', 'Liner Kits', 'Stators', 'Carriers', 'Hydraulic Hoses & Couplings', 'Hydraulic Cartridges', 'Alternators', 'Hydraulic Seal Kits', 'Injectors', 'Pencil Nozzle']
    .map((t) => ctpEntries.find((e) => e.name.toLowerCase() === t.toLowerCase()))
    .filter(Boolean);

  const handokCards = HOME_HANDOK_CARDS.filter((c) => c.entry);

  const itrCounts = {};
  HOME_ITR_INSTANCES.forEach((n) => { itrCounts[n] = (itrCounts[n] || 0) + 1; });
  const itrIdx = {};
  const itrCards = HOME_ITR_INSTANCES.map((n) => {
    itrIdx[n] = (itrIdx[n] || 0) + 1;
    return { entry: itrEntries.find((e) => e.name === n), idx: itrIdx[n], total: itrCounts[n] };
  }).filter((c) => c.entry);

  const workTiles = [
    [IMG.rw1, 'parts you can trust'],
    [IMG.rw2, 'to keep your equipment working'],
    [IMG.rw3, 'parts you can trust'],
    [IMG.rw4, 'to keep your equipment working'],
    [IMG.rw5, 'parts you can trust'],
    [IMG.rw6, 'to keep your equipment working'],
    [IMG.rw7, 'parts you can trust'],
    [IMG.rw8, 'to keep your equipment working'],
  ].filter(([img]) => img);

  const techSlides = [
    [IMG.tech1, 'CTP engine parts technology (01)'],
    [IMG.tech2, 'CTP engine parts technology (02)'],
    [IMG.tech3, 'CTP engine parts technology (03)'],
    [IMG.tech4, 'CTP engine parts technology (04)'],
    [IMG.tech5, 'CTP engine parts technology (05)'],
    [IMG.tech6, 'CTP engine parts technology (06)'],
    [IMG.tech7, 'CTP engine parts technology (07)'],
    [IMG.tech8, 'CTP engine parts technology (08)'],
    [IMG.tech9, 'CTP electrical parts technology (01)'],
    [IMG.tech10, 'CTP electrical parts technology (02)'],
    [IMG.tech11, 'CTP electrical parts technology (03)'],
    [IMG.tech12, 'CTP electrical parts technology (04)'],
    [IMG.tech13, 'CTP carriers'],
    [IMG.tech14, 'CTP cylinders'],
    [IMG.tech15, 'CTP connecting rods'],
    [IMG.tech16, 'CTP starters'],
  ].filter(([img]) => img);

  const chairmanText = fixTypos('SK MACHINERY INTERNATIONAL Provides Spare parts for the Power, Heavy Earth moving Construction equipment, Mining and Gas generator. Our Company Assists Buyers with their Urgent, Long term and Project based Spare parts.SK MACHINERY INTERNATIONAL Delivers New Genuine , OEM and New Replacements parts from CTP,  HANDOK, CATERPILLAR,  CUMMINS , KOMATSU, MITSUBISHI, HYUNDAI, DAEWOO. All Engine side new replacement parts of CTP Brand for Caterpillar Equipment are available in our ready stock and also  More than 100 Models of HANDOK BRAND HYDRAULIC Pump parts for Japanese Excavators are available in our stock.SK MACHINERY INTERNATIONAL is a One-Stop Shop for Power, Heavy Earth Moving Construction Equipment, Mining and Gas Generator Spare Parts.');

  const oneStopSentence = 'SK MACHINERY INTERNATIONAL is a One-Stop sales center for Power, Heavy Earth Moving Construction Equipment, Mining and Gas Generator Spare Parts.';

  const content = `
${heroMarkup()}
<section class="section section--navy" id="company">
  <div class="container split-section">
    <div class="split-section__text" data-animate>
      <span class="eyebrow eyebrow--light">Welcome to</span>
      <h2 class="split-section__title">SK Machinery International</h2>
      ${IMG.chairman ? `<figure class="split-section__photo"><img src="${C.esc(IMG.chairman)}" alt="SK Machineries International — the company office" loading="lazy"></figure>` : ''}
      <p class="split-section__copy">${C.esc(chairmanText)}</p>
    </div>
    <div class="split-section__media">
      ${C.catalogCarousel({ title: 'CATALOG FOR ITR, JIC, CTP & HANDOK', slides: CATALOG_SLIDES, note: CATALOG_NOTE })}
    </div>
  </div>
</section>
<section class="section">
  <div class="container">
    <div class="section__head" data-animate>
      <span class="eyebrow">Our product lines</span>
      <h2 class="section__title">Authorized distributor for four global parts brands</h2>
    </div>
    <div data-animate>${C.brandCards(brandDefs)}</div>
  </div>
</section>
<section class="section section--alt" id="expertise">
  <div class="container">
    <div class="section__head" data-animate>
      <span class="eyebrow">Expertise</span>
      <h2 class="section__title">The lines we stock</h2>
      <p class="section__intro">${C.esc(oneStopSentence)}</p>
    </div>
    <div class="expertise-brand" data-animate>
      <div class="expertise-brand__head">
        <h3>CTP Product</h3>
        <span class="expertise-brand__meta">Replacement parts for Caterpillar</span>
      </div>
      <div class="info-grid">
        ${ctpCards.map((e) => `
        <article class="info-card">
          <h3 class="info-card__title">${C.esc(e.name)}</h3>
          ${e.description ? `<p class="info-card__text">${C.esc(fixTypos(e.description))}</p>` : ''}
          <a class="text-link" href="${C.esc(e.url)}">Learn more</a>
        </article>`).join('')}
      </div>
    </div>
    <div class="expertise-brand" data-animate>
      <div class="expertise-brand__head">
        <h3>Handok Product</h3>
        <span class="expertise-brand__meta">Hydraulic pumps, motors, valves &amp; regulators</span>
      </div>
      <div class="info-grid">
        ${handokCards.map(({ group, entry }) => `
        <article class="info-card">
          <span class="info-card__label">${C.esc(group)}</span>
          <h3 class="info-card__title">${C.esc(entry.titleShort)}</h3>
          <p class="info-card__text">${C.esc(fixTypos(entry.models.join(' / ') + (entry.app ? ' For ' + entry.app : '')))}</p>
          <a class="text-link" href="${C.esc(entry.url)}">Learn more</a>
        </article>`).join('')}
      </div>
    </div>
    <div class="expertise-brand" data-animate>
      <div class="expertise-brand__head">
        <h3>ITR Product</h3>
        <span class="expertise-brand__meta">Undercarriage parts &amp; components</span>
      </div>
      <div class="info-grid">
        ${itrCards.map(({ entry, idx, total }) => `
        <article class="info-card info-card--media">
          ${entry.img ? `<img class="info-card__img" src="${C.esc(entry.img)}" alt="${C.esc(entry.name)}" loading="lazy">` : ''}
          <h3 class="info-card__title">${C.esc(entry.name)}</h3>
          ${idx > 1 ? `<span class="note-badge">Repeated on the source page (${idx} of ${total})</span>` : ''}
          <a class="text-link" href="${C.esc(entry.url)}">Learn more</a>
        </article>`).join('')}
      </div>
    </div>
  </div>
</section>
<section class="section" id="provides">
  <div class="container provides-grid">
    <div class="provides-media" data-animate>
      ${IMG.skmFlyer ? `
      <figure class="provides-media__fig">
        <img src="${C.esc(IMG.skmFlyer)}" alt="SK Machineries International company flyer — authorized distributor for Bangladesh" loading="lazy">
        <figcaption>Company flyer as published on the source site. It shows the company’s earlier Baro Moghbazar address &mdash; the current office address is in the footer and on the <a href="/contact/">contact page</a>.</figcaption>
      </figure>` : ''}
    </div>
    <div class="provides-accordion" data-animate>
      <h2 class="provides-accordion__title">Provides, Delivers, Experience</h2>
      ${PROVIDES_ITEMS.map((it, i) => `
      <details class="acc"${i === 0 ? ' open' : ''}>
        <summary>${C.esc(it.t)}</summary>
        <p>${C.esc(it.d)}</p>
      </details>`).join('')}
      ${C.chipRow(['CATERPILLAR', 'CUMMINS', 'KOMATSU', 'MITSUBISHI', 'HYUNDAI', 'DAEWOO'])}
    </div>
  </div>
</section>
<section class="section section--alt" id="recent-work">
  <div class="container">
    <div class="section__head" data-animate>
      <span class="eyebrow">Recent work</span>
      <h2 class="section__title">Recent work</h2>
      <p class="section__intro">${C.esc(oneStopSentence)}</p>
    </div>
    <div class="work-grid" data-animate>
      ${workTiles.map(([img, cap], i) => `
      <figure class="work-tile">
        <img src="${C.esc(img)}" alt="SK Machineries International parts — recent work ${i + 1}" loading="lazy">
        <figcaption><span>${C.esc(cap)}</span></figcaption>
      </figure>`).join('')}
    </div>
    <p class="center-cta" data-animate><a class="btn btn--outline" href="/products/">View More Work</a></p>
  </div>
</section>
<section class="section" id="technologies">
  <div class="container">
    <div class="section__head" data-animate>
      <h2 class="section__title">Technologies</h2>
    </div>
    <div class="tech-slider" data-tech-slider data-animate>
      ${techSlides.map(([img, alt]) => `
      <div class="tech-slider__slide"><img src="${C.esc(img)}" alt="${C.esc(alt)}" loading="lazy"></div>`).join('')}
    </div>
  </div>
</section>
<section class="section section--alt" id="certification">
  <div class="container">
    <div class="section__head" data-animate>
      <span class="eyebrow">Certification</span>
      <h2 class="section__title">Authorized distributor certifications</h2>
    </div>
    ${certs.length ? `<div data-animate>${C.certCards(certs.map((c) => ({ ...c, gallery: 'home-certs' })))}</div>` : '<p class="lead">Certification documents are available on request.</p>'}
    <p style="margin-top:24px"><a class="text-link" href="/certification/">View all certifications</a></p>
  </div>
</section>
${C.textSlider({ title: 'Who we are', intro: oneStopSentence, slides: WHO_WE_ARE_SLIDES })}
<section class="section" id="gallery">
  <div class="container">
    <div class="photo-gallery" data-animate>
      ${IMG.heroS1 ? `<figure class="photo-gallery__full"><img src="${C.esc(IMG.heroS1)}" alt="SK Machineries International — heavy equipment parts banner" loading="lazy"></figure>` : ''}
      <div class="photo-gallery__row photo-gallery__row--2">
        ${[IMG.gal1, IMG.gal2].filter(Boolean).map((img, i) => `<figure class="photo-gallery__cell"><img src="${C.esc(img)}" alt="SK Machineries International parts gallery ${i + 1}" loading="lazy"></figure>`).join('')}
      </div>
      <div class="photo-gallery__row photo-gallery__row--2">
        ${[ENTRY_IMG.Sealkit, IMG.gal3].filter(Boolean).map((img, i) => `<figure class="photo-gallery__cell"><img src="${C.esc(img)}" alt="SK Machineries International parts gallery ${i + 3}" loading="lazy"></figure>`).join('')}
      </div>
      <div class="photo-gallery__row photo-gallery__row--5">
        ${[IMG.gal4, IMG.gal5, IMG.gal6, IMG.gal7, IMG.gal8].filter(Boolean).map((img, i) => `<figure class="photo-gallery__cell"><img src="${C.esc(img)}" alt="SK Machineries International parts gallery ${i + 5}" loading="lazy"></figure>`).join('')}
      </div>
    </div>
  </div>
</section>
<section class="section section--alt">
  <div class="container">
    <div class="section__head" data-animate>
      <span class="eyebrow">How sourcing works</span>
      <h2 class="section__title">From your parts list to delivery</h2>
    </div>
    ${C.processSteps()}
  </div>
</section>
${C.ctaBand(site)}`;

  return page({
    site,
    title: 'SK Machineries International — One-Stop Shop for Heavy Equipment Spare Parts',
    desc: 'Authorized distributor for CTP, HANDOK, ITR & JIC. Spare parts for power, heavy earth moving construction equipment, mining and gas generators in Dhaka, Bangladesh.',
    path: '/',
    active: 'home',
    scripts: { slick: true },
    ogImage: IMG.heroS1 || IMG.hero1 || undefined,
    jsonLd: [C.orgJsonLd(site)],
    content,
  });
}

function renderAbout() {
  const content = `
${C.breadcrumbs([{ label: 'Home', href: '/' }, { label: 'About Us' }])}
${C.pageHero({ eyebrow: 'About Us', title: 'SK Machineries International', sub: "It's a One-Stop Shop for Power, Heavy Earth Moving Construction Equipment." })}
<section class="section section--navy">
  <div class="container split-section">
    <div class="split-section__text" data-animate>
      <h2 class="split-section__title">SK Machinery International</h2>
      <p class="split-section__copy">SK MACHINERY INTERNATIONAL is a One-Stop sales center for Power, Heavy Earth Moving Construction Equipment, Mining and Gas Generator Spare Parts. SK MACHINERY INTERNATIONAL is one of the Leading hydraulic Pump Parts Seller in Bangladesh for Japanese, USA, European &amp; Chinese Excavators.</p>
      <p class="split-section__copy">${C.esc(AUTH_INTRO)}</p>
    </div>
    <div class="split-section__media">
      ${C.catalogCarousel({ title: 'CATALOG FOR ITR, JIC, CTP & HANDOK', slides: CATALOG_SLIDES, note: CATALOG_NOTE })}
    </div>
  </div>
</section>
<section class="section">
  <div class="container prose">
    <h2>Authorized distributor</h2>
    <p>SK MACHINERY INTERNATIONAL is the authorized distributor for:</p>
    <ul>
      <li><strong>ITR</strong> &mdash; undercarriage parts for all brands of equipment, from Italy.</li>
      <li><strong>CTP</strong> &mdash; replacement parts for Caterpillar equipment, from the USA.</li>
      <li><strong>JIC</strong> &mdash; hydraulic pump, rotary kit for CAT, Kobelco, Komatsu, Sumitomo, Hitachi, Mitsubishi brand excavator, from South Korea.</li>
      <li><strong>HANDOK</strong> &mdash; hydraulic pump, it&rsquo;s rotary kit for CAT, Kobelco, Komatsu, Sumitomo, Hitachi and Mitsubishi brand excavator, from South Korea.</li>
    </ul>
    <p>Certificates of authorization are published on our <a href="/certification/">Certification page</a>.</p>
    <h2>What we keep in ready stock</h2>
    <ul>
      <li>All engine-side new replacement parts of the CTP brand for Caterpillar equipment.</li>
      <li>More than 100 models of HANDOK brand hydraulic pump parts for Japanese excavators.</li>
    </ul>
    <h2>How we work with buyers</h2>
    <p>We assist buyers with urgent, long-term and project-based spare parts. Send your parts list, model numbers or catalogue references and our sales desk will confirm availability and quote your requirement.</p>
    <p><a class="text-link" href="/contact/">Contact the sales desk</a></p>
  </div>
</section>
${C.ctaBand(site)}`;

  return page({
    site,
    title: 'About Us — SK Machineries International',
    desc: 'SK Machineries International is a one-stop sales center for power, heavy earth moving construction equipment, mining and gas generator spare parts, and an authorized distributor for ITR, CTP, JIC & HANDOK.',
    path: '/about/',
    active: 'about',
    scripts: { slick: true },
    crumbs: [{ label: 'Home', href: '/' }, { label: 'About Us' }],
    jsonLd: [C.bcJsonLd(site, [{ label: 'Home', href: '/' }, { label: 'About Us', href: '/about/' }])],
    content,
  });
}

function renderProductsHub() {
  const hubCards = allEntries.map((e) => ({ ...e }));
  const brandChips = brandDefs.map((b) => ({ label: b.short, tag: b.id }));
  const searchIndex = allEntries.map((e) => ({
    n: e.cardTitle || e.name,
    b: e.brandShort,
    s: e.section,
    u: e.url,
    d: e.excerpt || '',
  }));

  const content = `
${C.breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Products' }])}
${C.pageHero({ eyebrow: 'Products', title: 'Product lines & parts index', sub: 'Four authorized brand lines, one searchable index of every part line published by SK Machineries International.' })}
<section class="section">
  <div class="container">
    <div class="section__head" data-animate>
      <span class="eyebrow">Product lines</span>
      <h2 class="section__title">Browse by brand</h2>
    </div>
    <div data-animate>${C.brandCards(brandDefs)}</div>
  </div>
</section>
<section class="section section--alt" id="index">
  <div class="container">
    <div class="section__head" data-animate>
      <span class="eyebrow">Parts index</span>
      <h2 class="section__title">Every part line, searchable in one place</h2>
      <p class="section__intro">${counts.pagesCovered} part lines from the CTP, HANDOK and ITR catalogues, exactly as published on skmachineriesinternational.com.</p>
    </div>
    ${C.catalogToolbar({ withSearch: true, chipAttr: 'brandTag', chips: brandChips, withCount: true })}
    <div class="entry-grid">
      ${hubCards.map((e) => C.entryCard(e)).join('')}
    </div>
    ${C.noResults()}
  </div>
</section>
${C.ctaBand(site)}`;

  const html = page({
    site,
    title: 'Products — CTP, HANDOK, ITR & JIC Parts Index | SK Machineries International',
    desc: 'Search every part line from SK Machineries International: CTP replacement parts for Caterpillar, HANDOK hydraulic pumps, ITR undercarriage parts and the JIC catalogue.',
    path: '/products/',
    active: 'products',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Products' }],
    jsonLd: [C.bcJsonLd(site, [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }])],
    content,
  });

  // embed the search index for the client-side search
  const payload = JSON.stringify(searchIndex).replace(/<\//g, '<\\/');
  return html.replace(
    '</body>',
    `<script>window.PARTS_INDEX=${payload};</script>\n</body>`
  );
}

function renderCTP() {
  /* Render ALL source sections in order — including ones without product
   * cards (CTP Rubber Tracks is intro + features only). */
  const allSections = (cat('CTP PRODUCT').sections || []).map((s) => {
    const slug = slugify(secTitle(clean(s.name)));
    const grp = ctpSections.find((x) => x.slug === slug);
    return { name: secTitle(clean(s.name)), slug, entries: grp ? grp.entries : [] };
  });
  const sectionChips = allSections.map((s) => ({ label: s.name, tag: s.slug }));
  const ADD_INFO_HEADINGS = {
    'hydraulic-parts': 'Common types of hydraulic pumps in Heavy Equipments:',
    'cooling-systems': 'Types of cooling system:',
  };
  const sectionsHtml = allSections.map((s) => {
    const meta = ctpMeta[s.slug] || {};
    const isRubber = /rubber/i.test(s.name);
    const info = s.entries.filter((e) => e.type && String(e.type).startsWith('additionalInformation'));
    const cards = s.entries.filter((e) => !e.type || !String(e.type).startsWith('additionalInformation'));
    const addInfoHeading = ADD_INFO_HEADINGS[s.slug] || 'Additional Information';
    return `
        <div class="brand-section" id="sec-${C.esc(s.slug)}" data-sec-slug="${C.esc(s.slug)}">
          <div class="brand-section__head">
            <h2>${C.esc(s.name)}</h2>
            <span class="brand-section__count">${s.entries.length ? s.entries.length + ' part lines' : 'product guide'}</span>
          </div>
          ${meta.intro ? `<p class="brand-section__intro">${C.esc(meta.intro)}</p>` : ''}
          ${isRubber && IMG.rubberTracks ? `
          <figure class="brand-section__figure">
            <img src="${C.esc(IMG.rubberTracks)}" alt="CTP rubber tracks" loading="lazy">
          </figure>` : ''}
          ${isRubber ? `
          <div class="brand-section__features">
            <h3>Special Features of the CTP&reg; Rubber Tracks</h3>
            <ul>${RUBBER_TRACK_FEATURES.map((f) => `<li>${C.esc(f)}</li>`).join('')}</ul>
          </div>` : ''}
          ${meta.partTypes && meta.partTypes.length ? `
          <div class="part-types">
            <h3 class="part-types__title">Parts available in this line</h3>
            <ul class="part-types__list">${meta.partTypes.map((t) => `<li>${C.esc(t)}</li>`).join('')}</ul>
          </div>` : ''}
          <div class="entry-grid">
            ${cards.map((e) => C.entryCard({ ...e, excerpt: e.description ? fixTypos(e.description) : excerptFor(e) })).join('')}
          </div>
          ${info.length ? `
          <div class="add-info">
            <h3 class="add-info__title">${C.esc(addInfoHeading)}</h3>
            <div class="add-info__grid">
              ${info.map((e) => `
              <article class="info-card">
                <h3 class="info-card__title">${C.esc(e.name)}</h3>
                ${e.description ? `<p class="info-card__text">${C.esc(fixTypos(e.description))}</p>` : ''}
                <a class="text-link" href="${C.esc(e.url)}">Learn more</a>
              </article>`).join('')}
            </div>
          </div>` : ''}
        </div>`;
  }).join('');
  const content = `
${C.breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'CTP Product' }])}
${C.pageHero({ eyebrow: 'Product line', title: 'CTP Product — replacement parts for Caterpillar', sub: 'Authorized distributor line from the USA. All engine-side CTP replacement parts for Caterpillar equipment are available in ready stock.' })}
<section class="section section--navy">
  <div class="container">
    ${IMG.ctpLogo ? `<figure class="brand-logo-strip" data-animate><img src="${C.esc(IMG.ctpLogo)}" alt="CTP — Quality Products" loading="lazy"></figure>` : ''}
    ${C.catalogCarousel({ title: 'CATALOG FOR CTP & HANDOK', slides: CATALOG_SLIDES, note: CATALOG_NOTE })}
  </div>
</section>
<section class="section">
  <div class="container">
    ${C.catalogToolbar({ withSearch: false, chipAttr: 'sectionTag', chips: sectionChips, withCount: false })}
    <div class="ctp-layout">
      ${C.sectionNav(allSections)}
      <div class="ctp-sections">
        ${sectionsHtml}
      </div>
    </div>
  </div>
</section>
${C.ctaBand(site)}`;

  return page({
    site,
    title: 'CTP Product — Replacement Parts for Caterpillar | SK Machineries International',
    desc: 'CTP replacement parts for Caterpillar equipment from the USA — engine components, power train, hydraulic parts, undercarriage, ground engaging tools, filters and more, in ready stock in Dhaka.',
    path: '/products/ctp/',
    active: 'products',
    scripts: { slick: true },
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'CTP Product' }],
    jsonLd: [C.bcJsonLd(site, [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'CTP Product', href: '/products/ctp/' }])],
    content,
  });
}

function renderHandok() {
  const content = `
${C.breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'HANDOK Product' }])}
${C.pageHero({ eyebrow: 'Product line', title: 'HANDOK Product — hydraulic pumps & rotary kits', sub: 'Authorized distributor line from South Korea for Japanese excavators.' })}
<section class="section section--navy">
  <div class="container split-section">
    <div class="split-section__text" data-animate>
      <h2 class="split-section__title">Authorized distributor</h2>
      <p class="split-section__copy">${C.esc(AUTH_INTRO)}</p>
      <p class="split-section__copy"><strong>Ready stock:</strong> more than 100 models of HANDOK brand hydraulic pump parts for Japanese excavators are available in our stock.</p>
    </div>
    <div class="split-section__media">
      ${IMG.brandHANDOK ? `<figure class="split-section__photo"><img src="${C.esc(IMG.brandHANDOK)}" alt="HANDOK hydraulic products" loading="lazy"></figure>` : ''}
      ${C.catalogCarousel({ title: 'CATALOG FOR CTP & HANDOK', slides: CATALOG_SLIDES, note: CATALOG_NOTE })}
    </div>
  </div>
</section>
<section class="section">
  <div class="container">
    ${handokGroups.map((g) => `
    <div class="brand-section" id="sec-${C.esc(g.slug)}" data-sec-slug="${C.esc(g.slug)}">
      <div class="brand-section__head">
        <h2>${C.esc(g.name)}</h2>
        <span class="brand-section__count">${g.entries.length} series</span>
      </div>
      <div class="entry-grid">
        ${g.entries.map((e) => C.entryCard({ ...e, section: g.name, excerpt: fixTypos(e.models.join(' / ') + (e.app ? ' For ' + e.app : '')) })).join('')}
      </div>
    </div>`).join('')}
  </div>
</section>
${C.ctaBand(site)}`;

  return page({
    site,
    title: 'HANDOK Product — Hydraulic Pumps, Motors, Valves & Regulators | SK Machineries International',
    desc: 'HANDOK hydraulic pumps, motors, valves and regulators for Japanese excavators — authorized distributor line from South Korea, with 100+ pump models in ready stock.',
    path: '/products/handok/',
    active: 'products',
    scripts: { slick: true },
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'HANDOK Product' }],
    jsonLd: [C.bcJsonLd(site, [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'HANDOK Product', href: '/products/handok/' }])],
    content,
  });
}

function renderITR() {
  const content = `
${C.breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'ITR Product' }])}
${C.pageHero({ eyebrow: 'Product line', title: 'ITR Product — undercarriage parts', sub: 'Authorized distributor line from Italy for all brands of equipment.' })}
<section class="section section--navy">
  <div class="container split-section">
    <div class="split-section__text" data-animate>
      <h2 class="split-section__title">Authorized distributor</h2>
      <p class="split-section__copy">${C.esc(ITR_AUTH)}</p>
    </div>
    <div class="split-section__media">
      ${IMG.brandITR ? `<figure class="split-section__photo split-section__photo--logo"><img src="${C.esc(IMG.brandITR)}" alt="ITR — Parts for any track" loading="lazy"></figure>` : ''}
      ${C.catalogCarousel({ title: 'CATALOG FOR ITR & JIC', slides: CATALOG_SLIDES, note: CATALOG_NOTE })}
    </div>
  </div>
</section>
<section class="section">
  <div class="container">
    <div class="prose" data-animate>
      <p class="lead">${C.esc(ITR_META.description)}</p>
      <p>${C.esc(ITR_META.coverage)}</p>
    </div>
    <div class="brand-section" data-animate>
      <div class="brand-section__head">
        <h2>ITR product gallery</h2>
        <span class="brand-section__count">${counts.itrSource} listings &middot; ${itrEntries.length} unique part lines</span>
      </div>
      <p class="brand-section__intro">The source ITR page shows ${counts.itrSource} cards. Cards with identical titles are consolidated below into ${itrEntries.length} unique part lines; each detail page notes how often its line was repeated on the source page.</p>
      <div class="entry-grid">
        ${itrEntries.map((e) => C.entryCard({ ...e, excerpt: '' })).join('')}
      </div>
    </div>
    <div class="brand-section" data-animate>
      <div class="brand-section__head">
        <h2>Undercarriage parts &amp; components</h2>
        <span class="brand-section__count">Range</span>
      </div>
      ${C.modelList(ITR_META.partTypes)}
    </div>
  </div>
</section>
${C.ctaBand(site)}`;

  return page({
    site,
    title: 'ITR Product — Undercarriage Parts for All Equipment Brands | SK Machineries International',
    desc: 'ITR undercarriage parts and components for crawlers, excavators, dozers and pavers — authorized distributor line from Italy. Teeth & adapters, track adjusters, seals, recoil springs and more.',
    path: '/products/itr/',
    active: 'products',
    scripts: { slick: true },
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'ITR Product' }],
    jsonLd: [C.bcJsonLd(site, [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'ITR Product', href: '/products/itr/' }])],
    content,
  });
}

function renderJIC() {
  const content = `
${C.breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'JIC Product' }])}
${C.pageHero({ eyebrow: 'Product line', title: 'JIC Product — hydraulic pumps & rotary kits', sub: 'Authorized distributor line from South Korea for CAT, Kobelco, Komatsu, Sumitomo, Hitachi and Mitsubishi excavators.' })}
<section class="section section--navy">
  <div class="container split-section">
    <div class="split-section__text" data-animate>
      <h2 class="split-section__title">Authorized distributor</h2>
      <p class="split-section__copy">${C.esc(AUTH_INTRO)}</p>
    </div>
    <div class="split-section__media">
      ${C.catalogCarousel({ title: 'CATALOG FOR JIC & ITR', slides: CATALOG_SLIDES, note: CATALOG_NOTE })}
    </div>
  </div>
</section>
<section class="section">
  <div class="container">
    <div class="section__head" data-animate>
      <span class="eyebrow">Product catalogue</span>
      <h2 class="section__title">JIC product catalogue</h2>
      <p class="section__intro">The catalogue pages below are published exactly as on the source website. Open any page to view it full size, or ask us for model-specific availability. The source page revealed the last pages via a &ldquo;Load More&rdquo; button &mdash; all pages are shown here directly.</p>
    </div>
    <div class="catalog-toolbar" data-gallery-filters>
      <div class="chip-row chip-row--filters" role="group" aria-label="Filter catalogue gallery">
        <button class="chip chip--filter is-active" type="button" data-cat-filter="all" aria-pressed="true">All</button>
        <button class="chip chip--filter" type="button" data-cat-filter="catalogue-2020" aria-pressed="false">Catalogue 2020</button>
        <button class="chip chip--filter" type="button" data-cat-filter="range-of-products" aria-pressed="false">Range of Products</button>
        <button class="chip chip--filter" type="button" data-cat-filter="hydraulic-motor" aria-pressed="false">Hydraulic Motor</button>
        <button class="chip chip--filter" type="button" data-cat-filter="hydraulic-valve" aria-pressed="false">Hydraulic Valve</button>
      </div>
    </div>
    ${jicGallery.length ? `
    <div class="gallery-grid" id="jicGallery" data-animate>
      ${jicGallery.map((g) => `
      <figure class="gallery-item" data-cat="${C.esc(g.cat)}">
        <a href="${C.esc(g.img)}" data-gallery="jic" data-gallery-item aria-label="View ${C.esc(g.title)} full size">
          <img src="${C.esc(g.img)}" alt="${C.esc(g.title)}" loading="lazy">
        </a>
        <figcaption>${C.esc(g.title)}</figcaption>
      </figure>`).join('')}
    </div>` : `
    <div class="empty-state" data-animate>The JIC catalogue pages are being prepared. For model-specific enquiries, please <a href="/contact/">contact the sales desk</a>.</div>`}
    <p class="no-results is-hidden" id="jicFilterEmpty">No items in this category were visible on the source page snapshot.</p>
  </div>
</section>
${C.ctaBand(site)}`;

  return page({
    site,
    title: 'JIC Product — Hydraulic Pumps & Rotary Kits | SK Machineries International',
    desc: 'JIC hydraulic pumps and rotary kits for CAT, Kobelco, Komatsu, Sumitomo, Hitachi and Mitsubishi excavators — authorized distributor line from South Korea, with product catalogue.',
    path: '/products/jic/',
    active: 'products',
    scripts: { glightbox: true, slick: true },
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'JIC Product' }],
    jsonLd: [C.bcJsonLd(site, [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label: 'JIC Product', href: '/products/jic/' }])],
    content,
  });
}

function renderCertification() {
  const content = `
${C.breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Certification' }])}
${C.pageHero({ eyebrow: 'Certification', title: 'Authorized distributor certifications', sub: 'SK Machineries International is the authorized distributor for ITR, CTP, JIC and HANDOK product lines.' })}
<section class="section">
  <div class="container">
    ${certs.length ? `
    <div data-animate>${C.certCards(certs)}</div>
    <p class="section__intro" style="margin-top:20px">Certificates are shown as published on the source website. Select any certificate to view it full size.</p>` : `
    <div class="empty-state" data-animate>Certification documents are available on request — please <a href="/contact/">contact us</a>.</div>`}
    <div class="prose" data-animate style="margin-top:40px">
      <p class="lead">Authorized lines</p>
      <ul>
        <li><strong>ITR</strong> — undercarriage parts for all brands of equipment, from Italy.</li>
        <li><strong>CTP</strong> — replacement parts for Caterpillar equipment, from the USA.</li>
        <li><strong>JIC</strong> — hydraulic pumps and rotary kits, from South Korea.</li>
        <li><strong>HANDOK</strong> — hydraulic pumps and rotary kits, from South Korea.</li>
      </ul>
    </div>
  </div>
</section>
${C.ctaBand(site)}`;

  return page({
    site,
    title: 'Certification — Authorized Distributor | SK Machineries International',
    desc: 'Certificates of authorization: SK Machineries International is the authorized distributor for ITR, CTP, JIC and HANDOK parts.',
    path: '/certification/',
    active: 'cert',
    scripts: { glightbox: true },
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Certification' }],
    jsonLd: [C.bcJsonLd(site, [{ label: 'Home', href: '/' }, { label: 'Certification', href: '/certification/' }])],
    content,
  });
}

function renderContact() {
  const content = `
${C.breadcrumbs([{ label: 'Home', href: '/' }, { label: 'Contact' }])}
${C.pageHero({ eyebrow: 'Contact', title: 'Request a quote or send your parts list', sub: 'Tell us the parts, models or equipment you need and we will confirm availability across our four authorized lines.' })}
<section class="section">
  <div class="container contact-grid">
    <div class="contact-info" data-animate>
      <div class="contact-block">
        <span class="eyebrow">Visit us</span>
        <p>${C.esc(site.address)}</p>
      </div>
      <div class="contact-block">
        <span class="eyebrow">Call us</span>
        <p><a href="${C.esc(site.phone1Href)}">${C.esc(site.phone1)}</a><br><a href="${C.esc(site.phone2Href)}">${C.esc(site.phone2)}</a></p>
      </div>
      <div class="contact-block">
        <span class="eyebrow">Email us</span>
        <p><a href="${C.esc(site.emailHref)}">${C.esc(site.email)}</a></p>
      </div>
      <div class="contact-block">
        <span class="eyebrow">Product lines</span>
        <p>CTP &middot; HANDOK &middot; ITR &middot; JIC<br>New genuine, OEM and new replacement parts for Caterpillar, Cummins, Komatsu, Mitsubishi, Hyundai and Daewoo equipment.</p>
      </div>
    </div>
    <div class="contact-form" data-animate>
      ${C.enquiryForm(site, { note: true })}
    </div>
  </div>
</section>`;

  return page({
    site,
    title: 'Contact — Request a Quote | SK Machineries International',
    desc: 'Contact SK Machineries International, Karwan Bazar, Dhaka. Phone +8801715-068755. Send your parts list for CTP, HANDOK, ITR and JIC spare parts.',
    path: '/contact/',
    active: 'contact',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Contact' }],
    jsonLd: [C.bcJsonLd(site, [{ label: 'Home', href: '/' }, { label: 'Contact', href: '/contact/' }])],
    content,
  });
}

function renderDetail(e, list, idx) {
  const brandDef = brandDefs.find((b) => b.id === e.brand);
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products/' },
    { label: brandDef.nav, href: brandDef.url },
    { label: e.cardTitle || e.name },
  ];

  const descBlock = e.description
    ? `<div class="detail-desc"><p>${C.esc(e.description)}</p></div>`
    : `<div class="empty-state"><strong>Full specifications for this part line are available on request.</strong> Please call or send an enquiry and we will confirm availability, application and details.</div>`;

  const specBlock = e.specs && e.specs.length
    ? `<div class="detail-block"><h2>Specifications</h2><table class="spec-table"><tbody>${e.specs.map(([k, v]) => `<tr><th scope="row">${C.esc(k)}</th><td>${C.esc(v)}</td></tr>`).join('')}</tbody></table></div>`
    : '';

  const featBlock = (e.features && e.features.length) || (e.applications && e.applications.length)
    ? `<div class="detail-block"><h2>Details</h2>
        ${e.features && e.features.length ? `<ul>${e.features.map((f) => `<li>${C.esc(f)}</li>`).join('')}</ul>` : ''}
        ${e.applications && e.applications.length ? `<p><strong>Applications:</strong> ${C.esc(e.applications.join(', '))}</p>` : ''}
      </div>`
    : '';

  const modelsBlock = e.models && e.models.length
    ? `<div class="detail-block"><h2>Model numbers</h2>${C.modelList(e.models)}${e.app ? `<p class="detail-block__note"><strong>Application:</strong> ${C.esc(e.app)}</p>` : ''}</div>`
    : '';

  const dupBlock = e.dupNote ? `<p class="note-badge" style="margin-top:16px">${C.esc(e.dupNote)}.</p>` : '';

  // related: same section (CTP) / same group (HANDOK) / same brand (ITR)
  const related = list
    .filter((o) => o !== e && (e.sectionSlug ? o.sectionSlug === e.sectionSlug : o.brand === e.brand))
    .slice(0, 3);

  const mailto = `${site.emailHref}?subject=${encodeURIComponent(`[Enquiry] ${e.name} — ${e.brandShort} Product`)}&body=${encodeURIComponent(`Hello SK Machineries International,\n\nPlease send availability and a quote for:\n\nPart: ${e.name}\nBrand line: ${e.brandShort}${e.section ? ` (${e.section})` : ''}\nSource page: ${site.domain + e.url}\n\nMessage:\n`)}`;

  const content = `
${C.breadcrumbs(crumbs)}
<section class="detail-hero">
  <div class="container">
    <span class="eyebrow eyebrow--light">${C.esc(brandDef.nav)}${e.section ? ' &middot; ' + C.esc(e.section) : ''}</span>
    <h1>${C.esc(e.cardTitle && e.cardTitle.length < 70 ? e.cardTitle : e.name)}</h1>
    ${e.name !== (e.cardTitle || e.name) && (e.cardTitle || e.name).length < 70 ? `<p class="detail-hero__meta">${C.esc(e.name)}</p>` : ''}
  </div>
</section>
<section>
  <div class="container detail-layout">
    <div class="detail-main">
      ${descBlock}
      ${modelsBlock}
      ${specBlock}
      ${featBlock}
      ${dupBlock}
      ${detailPrevNext(list, idx)}
    </div>
    <aside class="detail-aside">
      ${e.img ? `<div class="detail-media"><img src="${C.esc(e.img)}" alt="${C.esc(e.name)}" loading="lazy"></div>` : ''}
      <div class="enquire-card">
        <h3>Enquire about this part</h3>
        <p>Tell us the model and quantity &mdash; we confirm stock and quote your requirement.</p>
        <a class="btn btn--primary" href="${C.esc(site.phone1Href)}">Call ${C.esc(site.phone1)}</a>
        <a class="btn btn--outline" href="${C.esc(mailto)}">Email enquiry</a>
        <a class="text-link" href="${C.esc(brandDef.url)}">Back to ${C.esc(brandDef.nav)}</a>
      </div>
    </aside>
  </div>
</section>
${related.length ? `
<section class="related">
  <div class="container">
    <div class="section__head">
      <span class="eyebrow">Related part lines</span>
      <h2 class="section__title">More from this line</h2>
    </div>
    <div class="entry-grid">${related.map((r) => C.entryCard({ ...r, excerpt: excerptFor(r) })).join('')}</div>
  </div>
</section>` : ''}
${C.ctaBand(site)}`;

  return page({
    site,
    title: `${e.name} — ${brandDef.nav} | SK Machineries International`,
    desc: e.description ? excerptFrom(e.description, 150) : `${e.name} from the ${brandDef.nav} line. Contact SK Machineries International for availability and a quotation.`,
    path: e.url,
    active: 'products',
    crumbs,
    ogImage: e.img || undefined,
    jsonLd: [C.bcJsonLd(site, crumbs)],
    content,
  });
}

function render404() {
  const content = `
<section class="page-hero">
  <div class="container">
    <span class="eyebrow eyebrow--light">404</span>
    <h1>Page not found</h1>
    <p class="page-hero__sub">The page you are looking for does not exist on this demo site.</p>
  </div>
</section>
<section class="section">
  <div class="container">
    <p class="lead">Try the parts index or the product lines instead:</p>
    <p style="display:flex;gap:14px;flex-wrap:wrap;margin-top:18px">
      <a class="btn btn--primary" href="/products/">Parts Index</a>
      <a class="btn btn--outline" href="/">Home</a>
    </p>
  </div>
</section>`;
  return page({
    site,
    title: 'Page not found — SK Machineries International',
    desc: 'The requested page was not found.',
    path: '/404.html',
    active: 'home',
    content,
  });
}

/* ---------------------------------------------------------------------------
 * Static asset copying + write helpers
 * ------------------------------------------------------------------------- */
function copyDir(src, dest) {
  if (!existsSync(src)) return false;
  cpSync(src, dest, { recursive: true });
  return true;
}

function writePage(route, html) {
  const dest = route.endsWith('.html') ? join(DIST, route.slice(1)) : join(DIST, route.slice(1), 'index.html');
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
}

/* ---------------------------------------------------------------------------
 * Main
 * ------------------------------------------------------------------------- */
function main() {
  mkdirSync(join(DIST, 'assets', 'img'), { recursive: true });

  const pages = [
    ['/', renderHome()],
    ['/about/', renderAbout()],
    ['/products/', renderProductsHub()],
    ['/products/ctp/', renderCTP()],
    ['/products/handok/', renderHandok()],
    ['/products/itr/', renderITR()],
    ['/products/jic/', renderJIC()],
    ['/certification/', renderCertification()],
    ['/contact/', renderContact()],
  ];
  for (const [route, html] of pages) writePage(route, html);

  // detail pages
  const detailLists = [
    ...ctpEntries.map((e) => [e, ctpEntries]),
    ...handokEntries.map((e) => [e, handokEntries]),
    ...itrEntries.map((e) => [e, itrEntries]),
  ];
  detailLists.forEach(([e, list]) => {
    const idx = list.indexOf(e);
    writePage(e.url, renderDetail(e, list, idx));
  });

  writePage('/404.html', render404());

  // sitemap + robots
  const routes = [
    ...pages.map(([r]) => r),
    ...detailLists.map(([e]) => e.url),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map((r) => `  <url><loc>${site.domain}${r}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
  writeFileSync(join(DIST, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + site.domain + '/sitemap.xml\n');

  // static assets
  copyDir(join(ROOT, 'src', 'css'), join(DIST, 'assets', 'css'));
  copyDir(join(ROOT, 'src', 'js'), join(DIST, 'assets', 'js'));
  copyDir(join(ROOT, 'assets', 'vendor'), join(DIST, 'assets', 'vendor'));
  copyDir(join(ROOT, 'assets', 'fonts'), join(DIST, 'assets', 'fonts'));
  writeFileSync(join(DIST, 'assets', 'img', 'MANIFEST.json'), JSON.stringify({ generatedBy: 'build.mjs', rule: 'Only images originating from skmachineriesinternational.com are shipped.', images: IMG_USED }, null, 2));

  // report
  const detailCount = detailLists.length;
  console.log('Build complete.');
  console.log(`  Top-level pages : ${pages.length + 1} (+404)`);
  console.log(`  Detail pages    : ${detailCount} pages covering ${counts.sourceEntries} source listings (CTP ${counts.ctpPages}/${counts.ctpSource}, HANDOK ${counts.handokPages}/${counts.handokSource}, ITR ${counts.itrPages}/${counts.itrSource} — duplicate listings consolidated with on-page notes)`);
  console.log(`  Certificates    : ${certs.length}/3 images resolved`);
  console.log(`  JIC catalogue   : ${jicGallery.length} pages resolved`);
  console.log(`  Images resolved : ${Object.keys(IMG_USED).length}`);
  if (Object.keys(IMG_MISSING).length) {
    console.log(`  Image keys unresolved (render as text tiles): ${Object.keys(IMG_MISSING).join(', ')}`);
  }
}

main();
