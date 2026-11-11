/* SK Machineries International — site behaviors (vanilla JS, guarded). */
(function () {
  'use strict';

  var d = document;

  // ------------------------------------------------------------------
  // Sticky header shadow
  // ------------------------------------------------------------------
  var header = d.getElementById('siteHeader');
  function onScroll() {
    if (header) header.classList.toggle('site-header--scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ------------------------------------------------------------------
  // Mobile drawer
  // ------------------------------------------------------------------
  var drawer = d.getElementById('mobileDrawer');
  var navToggle = d.getElementById('navToggle');
  var drawerClose = d.getElementById('drawerClose');
  var lastOpener = null;

  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    d.body.classList.toggle('drawer-open', open);
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.classList.toggle('is-open', open);
    }
    if (open) {
      lastOpener = d.activeElement;
      if (drawerClose) drawerClose.focus();
    } else if (lastOpener && lastOpener.focus) {
      lastOpener.focus();
    }
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setDrawer(!drawer.classList.contains('is-open'));
    });
  }
  if (drawerClose) drawerClose.addEventListener('click', function () { setDrawer(false); });
  d.querySelectorAll('[data-drawer-close]').forEach(function (el) {
    el.addEventListener('click', function () { setDrawer(false); });
  });
  d.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && drawer && drawer.classList.contains('is-open')) setDrawer(false);
  });

  // Drawer submenu accordions
  d.querySelectorAll('.mobile-nav__subtoggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var li = btn.closest('li');
      var open = li.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // ------------------------------------------------------------------
  // Desktop dropdown: first click/toggle opens, second navigates; Esc closes
  // ------------------------------------------------------------------
  d.querySelectorAll('.has-dropdown > a').forEach(function (link) {
    link.addEventListener('click', function (ev) {
      var li = link.parentElement;
      if (!li.querySelector('.dropdown')) return;
      if (!li.classList.contains('is-open')) {
        ev.preventDefault();
        li.classList.add('is-open');
        link.setAttribute('aria-expanded', 'true');
      }
    });
  });
  d.addEventListener('click', function (ev) {
    d.querySelectorAll('.has-dropdown.is-open').forEach(function (li) {
      if (!li.contains(ev.target)) {
        li.classList.remove('is-open');
        var a = li.querySelector('a');
        if (a) a.setAttribute('aria-expanded', 'false');
      }
    });
  });
  d.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      d.querySelectorAll('.has-dropdown.is-open').forEach(function (li) {
        li.classList.remove('is-open');
        var a = li.querySelector('a');
        if (a) a.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // ------------------------------------------------------------------
  // Scroll-in animations
  // ------------------------------------------------------------------
  var animated = d.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window && animated.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in-view');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    animated.forEach(function (el) { io.observe(el); });
  } else {
    animated.forEach(function (el) { el.classList.add('in-view'); });
  }

  // ------------------------------------------------------------------
  // Catalog: search + filter chips (products hub & CTP page)
  // ------------------------------------------------------------------
  d.querySelectorAll('[data-catalog]').forEach(function (root) {
    // Cards and section blocks live in the wrapping section, not inside the toolbar.
    var scope = root.closest('section') || d;
    var input = root.querySelector('.search-input');
    var chips = [].slice.call(root.querySelectorAll('.chip--filter'));
    var cards = [].slice.call(scope.querySelectorAll('.entry-card'));
    var blocks = [].slice.call(scope.querySelectorAll('.brand-section[data-sec-slug]'));
    var count = root.querySelector('.result-count');
    var empty = d.getElementById('catalogNoResults');
    var q = '';
    var tag = 'all';

    function apply() {
      var visible = 0;
      cards.forEach(function (c) {
        var okTag = tag === 'all' || c.getAttribute('data-brand') === tag;
        var hay = (
          (c.getAttribute('data-name') || '') + ' ' +
          (c.getAttribute('data-brand') || '') + ' ' +
          (c.getAttribute('data-section') || '') + ' ' +
          c.textContent
        ).toLowerCase();
        var ok = okTag && (!q || hay.indexOf(q) !== -1);
        c.classList.toggle('is-hidden', !ok);
        if (ok) visible++;
      });
      blocks.forEach(function (b) {
        var okBlock = tag === 'all' || b.getAttribute('data-sec-slug') === tag;
        b.classList.toggle('is-hidden', !okBlock);
      });
      if (count) {
        count.textContent = blocks.length
          ? ''
          : visible + ' of ' + cards.length + ' part lines shown';
      }
      if (empty) empty.classList.toggle('is-hidden', visible > 0);
    }

    if (input) {
      input.addEventListener('input', function () {
        q = input.value.trim().toLowerCase();
        apply();
      });
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        tag = chip.getAttribute('data-tag') || 'all';
        chips.forEach(function (c2) {
          c2.setAttribute('aria-pressed', String(c2 === chip));
        });
        apply();
      });
    });
  });

  // ------------------------------------------------------------------
  // CTP in-page section nav: highlight current section while scrolling
  // ------------------------------------------------------------------
  var secLinks = [].slice.call(d.querySelectorAll('.section-nav a[href^="#sec-"]'));
  var secBlocks = secLinks
    .map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);
  if ('IntersectionObserver' in window && secBlocks.length) {
    var secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = '#' + en.target.id;
        secLinks.forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-25% 0px -60% 0px' });
    secBlocks.forEach(function (b) { secIO.observe(b); });
  }

  // ------------------------------------------------------------------
  // Contact form: honest mailto composer (no backend claims).
  // Reads fields by name so any page's single enquiry form works.
  // ------------------------------------------------------------------
  var form = d.getElementById('enquiryForm');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var val = function (name) {
        var el = form.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : '';
      };
      var isChecked = function (name) {
        var el = form.querySelector('[name="' + name + '"]');
        return !!(el && el.checked);
      };
      var firstName = val('firstName');
      var lastName = val('lastName');
      var email = val('email');
      var company = val('company');
      var phone = val('phone');
      var line = val('productLine');
      var message = val('message');
      var updates = isChecked('updates');

      var subject = 'Parts enquiry' + (line ? ' — ' + line : '');
      var body =
        'Hello SK Machineries International,\n\n' +
        'Name: ' + firstName + ' ' + lastName + '\n' +
        (company ? 'Company: ' + company + '\n' : '') +
        'Email: ' + email + '\n' +
        (phone ? 'Phone: ' + phone + '\n' : '') +
        'Product line: ' + (line || 'Not specified') + '\n' +
        'Monthly updates opt-in: ' + (updates ? 'Yes' : 'No') + '\n\n' +
        'Message:\n' + message + '\n\n' +
        '(Sent via the website enquiry form — it opens a pre-filled email, nothing is stored on the site.)';

      var mailto =
        'mailto:' + form.getAttribute('data-email') +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      window.location.href = mailto;

      var status = form.querySelector('.form-status');
      if (status) {
        status.textContent =
          'Opening your email application with the enquiry pre-filled. If nothing happens, email ' +
          form.getAttribute('data-email') + ' or call us directly.';
        status.classList.add('is-ok');
      }
    });
  }

  // ------------------------------------------------------------------
  // Sliders and lightboxes (loaded only on pages that use them)
  // ------------------------------------------------------------------
  if (window.jQuery && window.jQuery.fn && window.jQuery.fn.slick) {
    window.jQuery('.hero--slider').slick({
      autoplay: true,
      autoplaySpeed: 6000,
      fade: true,
      speed: 700,
      dots: true,
      arrows: true,
      infinite: true,
      pauseOnHover: false,
      adaptiveHeight: false,
    });

    // "CATALOG FOR …" carousel (source Elementor slides widget: arrows + 5s autoplay)
    window.jQuery('[data-catalog-slider]').slick({
      autoplay: true,
      autoplaySpeed: 5000,
      arrows: true,
      dots: false,
      infinite: true,
      speed: 500,
      slidesToShow: 1,
      slidesToScroll: 1,
      adaptiveHeight: false,
    });

    // "who we are" statement carousel
    window.jQuery('[data-text-slider]').slick({
      autoplay: true,
      autoplaySpeed: 5000,
      fade: true,
      speed: 600,
      arrows: true,
      dots: false,
      infinite: true,
      adaptiveHeight: true,
    });

    // "technologies" image carousel
    window.jQuery('[data-tech-slider]').slick({
      autoplay: true,
      autoplaySpeed: 3500,
      arrows: true,
      dots: false,
      infinite: true,
      speed: 450,
      slidesToShow: 4,
      slidesToScroll: 2,
      responsive: [
        { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 2 } },
        { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 2 } },
        { breakpoint: 480, settings: { slidesToShow: 1, slidesToScroll: 1 } },
      ],
    });
  }

  // JIC catalogue gallery filter chips (All / Catalogue 2020 / Range of Products /
  // Hydraulic Motor / Hydraulic Valve — labels from the source page)
  d.querySelectorAll('[data-gallery-filters]').forEach(function (wrap) {
    var chips = wrap.querySelectorAll('.chip--filter');
    var items = document.querySelectorAll('#jicGallery .gallery-item');
    var empty = document.getElementById('jicFilterEmpty');
    function apply(val) {
      var shown = 0;
      items.forEach(function (it) {
        var cat = it.getAttribute('data-cat') || '';
        var show = val === 'all' || (cat && cat === val);
        it.classList.toggle('is-hidden', !show);
        if (show) shown++;
      });
      if (empty) empty.classList.toggle('is-hidden', shown > 0);
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) {
          c.classList.toggle('is-active', c === chip);
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
        });
        apply(chip.getAttribute('data-cat-filter') || 'all');
      });
    });
  });

  if (window.GLightbox && d.querySelector('[data-gallery-item]')) {
    window.GLightbox({
      selector: '[data-gallery-item]',
    });
  }
})();
