/* ─────────────────────────────────────────────────────────
   jitter.js — Global word-by-word animation system
   Inspired by Jitter's slideAndFade / slowDown easing
   ───────────────────────────────────────────────────────── */
(function () {
  const WORD_STAGGER = 0.13;   // seconds between words
  const LINE_STAGGER = 0.22;   // seconds between line elements

  /* Split element text into animated word spans */
  function animateWords(el, startDelay, addGradient) {
    // Skip if already processed
    if (el.dataset.jitterDone) return 0;
    el.dataset.jitterDone = '1';

    const raw = el.innerHTML;
    // If element has child tags (e.g. <span>, <a>), animate as a line instead
    if (el.children.length > 0) {
      el.classList.add('j-line');
      el.style.animationDelay = startDelay + 's';
      return LINE_STAGGER;
    }

    const text = el.textContent.trim();
    if (!text) return 0;
    const words = text.split(/\s+/);
    el.textContent = '';

    words.forEach(function (word, i) {
      const span = document.createElement('span');
      span.className = 'j-word' + (addGradient ? ' j-gradient' : '');
      span.textContent = word;
      span.style.animationDelay = (startDelay + i * WORD_STAGGER) + 's';
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });

    return words.length * WORD_STAGGER;
  }

  /* Fade-up a whole line element */
  function animateLine(el, delay) {
    if (el.dataset.jitterDone) return;
    el.dataset.jitterDone = '1';
    el.classList.add('j-line');
    el.style.animationDelay = delay + 's';
  }

  /* Public API — call manually to animate a container */
  window.jitterAnimate = function (root, baseDelay) {
    root = root || document;
    baseDelay = baseDelay || 0.05;
    let d = baseDelay;

    // h1 — large gradient word animation
    root.querySelectorAll('h1').forEach(function (el) {
      d += animateWords(el, d, true) + 0.08;
    });

    // h2 — gradient word animation
    root.querySelectorAll('h2').forEach(function (el) {
      d += animateWords(el, d, true) + 0.06;
    });

    // h3 — plain word animation (no gradient — too small for clip)
    root.querySelectorAll('h3').forEach(function (el) {
      animateWords(el, 0.05, false); // each card resets
    });

    // Subtitles / descriptions / auth sub
    root.querySelectorAll(
      'p.auth-sub, p.welcome-sub, .dash-hero p, ' +
      '.section-label, .year-display-sub, .budget-summary-label'
    ).forEach(function (el) {
      animateLine(el, d);
      d += LINE_STAGGER;
    });

    // Daily quote — word-by-word (no gradient, it's small italic text)
    root.querySelectorAll('.quote-text').forEach(function (el) {
      if (el.textContent.trim()) animateWords(el, d, false);
      else {
        // text set dynamically — observe it
        var obs = new MutationObserver(function () {
          if (el.textContent.trim() && !el.dataset.jitterDone) {
            obs.disconnect();
            animateWords(el, 0.05, false);
          }
        });
        obs.observe(el, { childList: true, characterData: true, subtree: true });
      }
      d += 0.2;
    });

    // Date header
    root.querySelectorAll('.day-date-display, .goals-date-header').forEach(function (el) {
      animateLine(el, 0.05);
    });
  };

  /* Auto-run on every page */
  document.addEventListener('DOMContentLoaded', function () {
    // Small delay so layout is painted first
    setTimeout(function () {
      window.jitterAnimate(document, 0.05);
    }, 80);
  });
})();
