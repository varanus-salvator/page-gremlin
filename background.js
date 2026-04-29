const BADGE_CSS = `
#gremlin-badge {
  position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
  width: 44px; height: 44px; border-radius: 50%;
  background: #fff; border: 2px solid #2d8a4e; color: #4ade80;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  opacity: 0.7; transition: opacity 0.2s;
}
#gremlin-badge:hover { opacity: 1; transform: scale(1.1); }
#gremlin-info {
  position: absolute; bottom: 52px; right: 0;
  background: #fff; border: 1px solid #2d8a4e; color: #1a3a1a;
  border-radius: 6px; padding: 8px 12px; font: 12px system-ui, sans-serif;
  white-space: nowrap; box-shadow: 0 2px 12px rgba(0,0,0,0.4);
}
`;

const READER_CSS = `
.gremlin-reader {
  max-width: 680px; margin: 0 auto; padding: 40px 20px;
  font: 18px/1.7 Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #fff;
}
.gremlin-reader * { max-width: 100%; }
.gremlin-hero { width: 100%; height: auto; border-radius: 4px; margin-bottom: 24px; }
.gremlin-reader h1 { font-size: 32px; line-height: 1.2; margin-bottom: 12px; font-family: system-ui, sans-serif; }
.gremlin-reader h2 { font-size: 22px; margin: 32px 0 12px; font-family: system-ui, sans-serif; }
.gremlin-meta { color: #666; font-size: 14px; margin-bottom: 20px; font-family: system-ui, sans-serif; display: flex; gap: 16px; }
.gremlin-intro { font-style: italic; color: #444; margin-bottom: 24px; font-size: 19px; }
.gremlin-reader p { margin-bottom: 16px; }
.gremlin-reader ul, .gremlin-reader ol { padding-left: 24px; margin-bottom: 16px; }
.gremlin-reader li { margin-bottom: 8px; }
.gremlin-recipe ul { list-style: none; padding: 0; }
.gremlin-recipe ul li { padding: 8px 0; border-bottom: 1px solid #eee; }
.gremlin-recipe ol li { padding: 8px 0; }
`;

const HELPERS = `
window.gremlin = {
  jsonld(type) {
    const blocks = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
      try {
        const data = JSON.parse(el.textContent);
        const items = data['@graph'] ? data['@graph'] : [data];
        blocks.push(...items);
      } catch {}
    });
    return type ? blocks.filter(b => b['@type'] === type) : blocks;
  },
  jsonldFirst(type) { return this.jsonld(type)[0] || null; },
  articleBody() {
    const a = this.jsonldFirst('NewsArticle') || this.jsonldFirst('Article') || this.jsonldFirst('BlogPosting');
    return a?.articleBody || null;
  },
  recipe() { return this.jsonldFirst('Recipe'); },
  meta() {
    const m = {};
    document.querySelectorAll('meta[name], meta[property]').forEach(el => {
      m[el.getAttribute('name') || el.getAttribute('property')] = el.getAttribute('content');
    });
    return m;
  },
  remove(...selectors) {
    selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
  },
  reveal(...selectors) {
    selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      el.style.cssText = 'display:block!important;visibility:visible!important;opacity:1!important;height:auto!important;overflow:visible!important;';
    }));
  },
  insertHTML(html, target) {
    const container = target ? document.querySelector(target) : document.body;
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = html;
    container.insertBefore(div, container.firstChild);
  },
  log(...args) { console.log('[Page Gremlin]', ...args); },
  microdataBody() {
    const el = document.querySelector('[itemprop="articleBody"]');
    if (el && el.textContent.trim().length > 500) return el.innerHTML;
    return null;
  },
  readable() {
    if (typeof Readability === 'undefined') return null;
    try {
      const article = new Readability(document.cloneNode(true)).parse();
      if (article && article.textContent && article.textContent.length > 500) return article;
    } catch (e) { gremlin.log('Readability error', e); }
    return null;
  },
  reader(type) {
    const ld = this.jsonld();
    if (!type) {
      if (ld.some(b => b['@type'] === 'Recipe')) type = 'recipe';
      else type = 'article';
    }
    let html = '';
    const meta = this.meta();
    const esc = s => s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
    if (type === 'article') {
      const a = this.jsonldFirst('NewsArticle') || this.jsonldFirst('Article') || this.jsonldFirst('BlogPosting');
      const image = meta['og:image'] || (a && (Array.isArray(a.image) ? a.image[0] : a.image));
      const author = a ? (Array.isArray(a.author) ? a.author.map(x => x.name || x).join(', ') : (a.author?.name || a.author || '')) : '';
      const date = a?.datePublished ? new Date(a.datePublished).toLocaleDateString('nl-NL', { year:'numeric', month:'long', day:'numeric' }) : '';

      // Layer 1: JSON-LD articleBody
      if (a && a.articleBody && a.articleBody.length > 500) {
        const paragraphs = a.articleBody.split(/\\n\\n|\\n/).filter(Boolean);
        html = '<div class="gremlin-reader gremlin-article">'
          + (image ? '<img src="' + esc(image) + '" class="gremlin-hero">' : '')
          + '<h1>' + esc(a.headline) + '</h1>'
          + '<div class="gremlin-meta">' + esc(author) + (date ? ' &middot; ' + esc(date) : '') + '</div>'
          + (a.description ? '<p class="gremlin-intro">' + esc(a.description) + '</p>' : '')
          + paragraphs.map(p => '<p>' + esc(p) + '</p>').join('')
          + '</div>';
        gremlin.log('Reader: using JSON-LD articleBody');
      }

      // Layer 2: microdata [itemprop="articleBody"]
      if (!html) {
        const md = this.microdataBody();
        if (md) {
          html = '<div class="gremlin-reader gremlin-article">'
            + (image ? '<img src="' + esc(image) + '" class="gremlin-hero">' : '')
            + (a?.headline ? '<h1>' + esc(a.headline) + '</h1>' : (meta['og:title'] ? '<h1>' + esc(meta['og:title']) + '</h1>' : ''))
            + (author || date ? '<div class="gremlin-meta">' + esc(author) + (date ? ' &middot; ' + esc(date) : '') + '</div>' : '')
            + md
            + '</div>';
          gremlin.log('Reader: using microdata articleBody');
        }
      }

      // Layer 3: Readability.js heuristic
      if (!html) {
        const article = this.readable();
        if (article) {
          html = '<div class="gremlin-reader gremlin-article">'
            + (image ? '<img src="' + esc(image) + '" class="gremlin-hero">' : '')
            + '<h1>' + esc(article.title || meta['og:title'] || document.title) + '</h1>'
            + (article.byline ? '<div class="gremlin-meta">' + esc(article.byline) + (date ? ' &middot; ' + esc(date) : '') + '</div>' : '')
            + (article.excerpt ? '<p class="gremlin-intro">' + esc(article.excerpt) + '</p>' : '')
            + article.content
            + '</div>';
          gremlin.log('Reader: using Readability heuristic');
        }
      }

      if (!html) return gremlin.log('Reader: no article content found (tried JSON-LD, microdata, Readability)');
    }
    if (type === 'recipe') {
      const r = this.recipe();
      if (!r) return gremlin.log('No recipe JSON-LD found');
      const image = Array.isArray(r.image) ? r.image[0] : r.image;
      html = '<div class="gremlin-reader gremlin-recipe">'
        + (image ? '<img src="' + esc(image) + '" class="gremlin-hero">' : '')
        + '<h1>' + esc(r.name) + '</h1>'
        + '<div class="gremlin-meta">'
          + (r.recipeYield ? '<span>Porties: ' + esc(String(r.recipeYield)) + '</span>' : '')
          + (r.totalTime ? '<span>Tijd: ' + esc(r.totalTime.replace('PT','').toLowerCase()) + '</span>' : '')
        + '</div>'
        + (r.description ? '<p class="gremlin-intro">' + esc(r.description) + '</p>' : '')
        + '<h2>Ingrediënten</h2>'
        + '<ul>' + (r.recipeIngredient || []).map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>'
        + '<h2>Bereiding</h2>'
        + '<ol>' + (r.recipeInstructions || []).map(s => '<li>' + esc(typeof s === 'string' ? s : s.text || '') + '</li>').join('') + '</ol>'
        + '</div>';
    }
    if (!html) return;
    document.head.innerHTML = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    document.body.innerHTML = html;
    const style = document.createElement('style');
    style.textContent = document.gremlinCSS || '';
    document.head.appendChild(style);
    document.title = '[Reader] ' + document.title;
  }
};
`;

const GREMLIN_SVG = '<svg viewBox="0 0 48 48" width="30" height="30"><path d="M8 18 L14 8 L18 16" fill="#2d8a4e"/><path d="M40 18 L34 8 L30 16" fill="#2d8a4e"/><ellipse cx="24" cy="26" rx="13" ry="12" fill="#2d8a4e"/><ellipse cx="18" cy="23" rx="3.5" ry="4" fill="#ffffcc"/><ellipse cx="30" cy="23" rx="3.5" ry="4" fill="#ffffcc"/><circle cx="19" cy="23" r="2" fill="#111"/><circle cx="31" cy="23" r="2" fill="#111"/><circle cx="19.7" cy="22" r="0.8" fill="#fff"/><circle cx="31.7" cy="22" r="0.8" fill="#fff"/><path d="M16 31 Q20 37 24 35 Q28 37 32 31" fill="none" stroke="#111" stroke-width="1.8" stroke-linecap="round"/><rect x="19" y="31" width="2.5" height="3" rx="0.5" fill="#fff"/><rect x="26.5" y="31" width="2.5" height="3" rx="0.5" fill="#fff"/></svg>';

// Inject CSS as early as possible (during loading), JS after DOM is ready
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;

  if (changeInfo.status === 'loading') {
    chrome.storage.local.get({ tweaks: [] }, ({ tweaks }) => {
      const matching = tweaks.filter(t => t.enabled && matchDomain(tab.url, t));
      for (const tweak of matching) {
        if (tweak.css) {
          chrome.scripting.insertCSS({ target: { tabId }, css: tweak.css }).catch(() => {});
        }
      }
      if (matching.length) {
        chrome.scripting.insertCSS({ target: { tabId }, css: BADGE_CSS }).catch(() => {});
      }
    });
  }

  if (changeInfo.status === 'complete') {
    chrome.storage.local.get({ tweaks: [] }, ({ tweaks }) => {
      const matching = tweaks.filter(t => t.enabled && matchDomain(tab.url, t));
      if (!matching.length) return;

      const names = matching.map(t => t.name || t.domain).join(', ');
      const archiveLink = 'https://archive.ph/' + cleanUrl(tab.url);

      // Inject Readability.js + helpers + run JS
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['Readability.js'],
        world: 'MAIN'
      }).catch(() => {}).then(() => chrome.scripting.executeScript({
        target: { tabId },
        func: (helpers, css) => {
          if (!window.gremlin) {
            document.gremlinCSS = css;
            const s = document.createElement('script');
            s.textContent = helpers;
            document.documentElement.appendChild(s);
            s.remove();
          }
        },
        args: [HELPERS, READER_CSS],
        world: 'MAIN'
      })).then(() => {
        for (const tweak of matching) {
          if (tweak.js) {
            chrome.scripting.executeScript({
              target: { tabId },
              func: code => {
                const s = document.createElement('script');
                s.textContent = code;
                document.documentElement.appendChild(s);
                s.remove();
              },
              args: [tweak.js],
              world: 'MAIN'
            }).catch(() => {});
          }
        }

        // Show badge
        chrome.scripting.executeScript({
          target: { tabId },
          func: (names, archiveLink, gremlinSvg) => {
            if (document.getElementById('gremlin-badge')) return;
            const badge = document.createElement('div');
            badge.id = 'gremlin-badge';
            badge.innerHTML = gremlinSvg;
            badge.title = 'Page Gremlin active';
            badge.addEventListener('click', () => {
              const info = document.getElementById('gremlin-info');
              if (info) { info.remove(); return; }
              const panel = document.createElement('div');
              panel.id = 'gremlin-info';
              panel.innerHTML = '<div style="margin-bottom:6px;font-weight:bold;color:#2d8a4e">Page Gremlin</div>'
                + '<div style="margin-bottom:6px">' + names + '</div>'
                + '<a href="' + archiveLink + '" target="_blank" style="color:#2d8a4e;text-decoration:underline;font-size:11px">archive.ph</a>';
              badge.appendChild(panel);
            });
            document.body.appendChild(badge);
          },
          args: [names, archiveLink, GREMLIN_SVG],
          world: 'MAIN'
        }).catch(() => {});
      }).catch(() => {});
    });
  }
});

function cleanUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/+$/, '');
  } catch {
    return url;
  }
}

// Auto-update: refetch snippet library and bump installed snippets when version is higher
const DEFAULT_REPO = 'varanus-salvator/page-gremlin';
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

async function autoUpdateSnippets() {
  const { tweaks = [], repoUrl = DEFAULT_REPO, autoUpdate = true, lastUpdateCheck = 0 } =
    await chrome.storage.local.get(['tweaks', 'repoUrl', 'autoUpdate', 'lastUpdateCheck']);
  if (!autoUpdate) return;
  if (Date.now() - lastUpdateCheck < UPDATE_INTERVAL_MS) return;
  try {
    const url = `https://raw.githubusercontent.com/${repoUrl}/main/index.json`;
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('fetch failed: ' + res.status);
    const library = await res.json();
    let updated = 0;
    for (const t of tweaks) {
      if (!t.id) continue;
      const lib = library.find(s => s.id === t.id);
      if (!lib) continue;
      const libV = lib.version || 0;
      const myV = t.version || 0;
      if (libV > myV) {
        t.name = lib.name;
        t.js = lib.js || '';
        t.css = lib.css || '';
        t.version = libV;
        if (Array.isArray(lib.domains)) { t.domains = lib.domains; delete t.domain; }
        else if (lib.domain) { t.domain = lib.domain; delete t.domains; }
        updated++;
      }
    }
    await chrome.storage.local.set({ tweaks, lastUpdateCheck: Date.now() });
    if (updated) console.log('[Page Gremlin] Auto-updated', updated, 'snippet(s)');
  } catch (e) {
    console.log('[Page Gremlin] Auto-update failed:', e.message);
  }
}

chrome.runtime.onStartup?.addListener(autoUpdateSnippets);
chrome.runtime.onInstalled?.addListener(autoUpdateSnippets);
// Also check on every browser action (popup open) — cheap because rate-limited
autoUpdateSnippets();

function matchDomain(url, domainOrTweak) {
  try {
    const hostname = new URL(url).hostname;
    const tweak = typeof domainOrTweak === 'object' ? domainOrTweak : null;
    const domains = tweak
      ? (tweak.domains || (tweak.domain ? [tweak.domain] : []))
      : [domainOrTweak];
    return domains.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}
