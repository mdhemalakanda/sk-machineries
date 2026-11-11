# Vendored Assets — Sources & Licenses

All files in `../vendor/` and `../fonts/` were downloaded from official CDNs /
the Google Fonts API. No files were modified except the generated `fonts/fonts.css`.

## JavaScript / CSS libraries

| File | Version | Source URL | License |
|---|---|---|---|
| `jquery.min.js` | 3.7.1 | https://code.jquery.com/jquery-3.7.1.min.js | MIT — Copyright OpenJS Foundation and other contributors (license header embedded in file, see jquery.org/license) |
| `slick.min.js` | 1.8.1 | https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick.min.js | MIT — Copyright (c) 2013-2016 Ken Wheeler (per `slick-carousel@1.8.1` npm `LICENSE` and `package.json`; the cdnjs minified build carries no embedded license header) |
| `slick.css` | 1.8.1 | https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick.css | MIT — same as `slick.min.js` |
| `glightbox.min.js` | 3.3.0 | https://cdn.jsdelivr.net/npm/glightbox@3.3.0/dist/js/glightbox.min.js | MIT — Copyright (c) 2018 Biati Digital, https://www.biati.digital (per the package's `LICENSE.md` and `package.json` `"license": "MIT"` — single MIT license, not GPL-dual) |
| `glightbox.min.css` | 3.3.0 | https://cdn.jsdelivr.net/npm/glightbox@3.3.0/dist/css/glightbox.min.css | MIT — same as `glightbox.min.js` |

## Fonts (self-hosted, `../fonts/`)

License for all font files: **SIL Open Font License, Version 1.1** — Copyright
the respective project authors (see the OFL.txt in each Google Fonts repository).

woff2 binaries were downloaded from `fonts.gstatic.com` via the Google Fonts
css2 API, fetched with a desktop-Chrome User-Agent so only woff2 URLs are
returned. Subsets kept: **latin** and **latin-ext** only. `fonts/fonts.css`
was generated from Google's CSS verbatim (@font-face rules with relative
`./` paths, `font-display: swap`, and Google's unicode-range values).

| css2 source URL | Files |
|---|---|
| https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@700&display=swap | roboto-slab-700-normal-latin.woff2, roboto-slab-700-normal-latin-ext.woff2 |
| https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&display=swap | montserrat-600-normal-latin.woff2, montserrat-600-normal-latin-ext.woff2, montserrat-700-normal-latin.woff2, montserrat-700-normal-latin-ext.woff2 |
| https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;1,400&display=swap | roboto-400-normal-latin.woff2, roboto-400-normal-latin-ext.woff2, roboto-500-normal-latin.woff2, roboto-500-normal-latin-ext.woff2, roboto-700-normal-latin.woff2, roboto-700-normal-latin-ext.woff2, roboto-400-italic-latin.woff2, roboto-400-italic-latin-ext.woff2 |

File naming convention: `<family>-<weight>-<style>-<subset>.woff2`.
