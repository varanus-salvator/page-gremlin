const BADGE_CSS = `
#tweaker-badge {
  position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
  width: 32px; height: 32px; border-radius: 50%;
  background: #1a1a2e; border: 2px solid #e94560; color: #e94560;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  opacity: 0.7; transition: opacity 0.2s;
}
#tweaker-badge:hover { opacity: 1; }
#tweaker-info {
  position: absolute; bottom: 40px; right: 0;
  background: #1a1a2e; border: 1px solid #0f3460; color: #e0e0e0;
  border-radius: 6px; padding: 8px 12px; font: 12px system-ui, sans-serif;
  white-space: nowrap; box-shadow: 0 2px 12px rgba(0,0,0,0.4);
}
`;

const READER_CSS = `
.tweaker-reader {
  max-width: 680px; margin: 0 auto; padding: 40px 20px;
  font: 18px/1.7 Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #fff;
}
.tweaker-reader * { max-width: 100%; }
.tweaker-hero { width: 100%; height: auto; border-radius: 4px; margin-bottom: 24px; }
.tweaker-reader h1 { font-size: 32px; line-height: 1.2; margin-bottom: 12px; font-family: system-ui, sans-serif; }
.tweaker-reader h2 { font-size: 22px; margin: 32px 0 12px; font-family: system-ui, sans-serif; }
.tweaker-meta { color: #666; font-size: 14px; margin-bottom: 20px; font-family: system-ui, sans-serif; display: flex; gap: 16px; }
.tweaker-intro { font-style: italic; color: #444; margin-bottom: 24px; font-size: 19px; }
.tweaker-reader p { margin-bottom: 16px; }
.tweaker-reader ul, .tweaker-reader ol { padding-left: 24px; margin-bottom: 16px; }
.tweaker-reader li { margin-bottom: 8px; }
.tweaker-recipe ul { list-style: none; padding: 0; }
.tweaker-recipe ul li { padding: 8px 0; border-bottom: 1px solid #eee; }
.tweaker-recipe ol li { padding: 8px 0; }
`;

const HELPERS = `
window.tweaker = {
  // Parse all JSON-LD blocks on the page
  jsonld(type) {
    const blocks = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
      try {
        const data = JSON.parse(el.textContent);
        // Flatten @graph arrays
        const items = data['@graph'] ? data['@graph'] : [data];
        blocks.push(...items);
      } catch {}
    });
    return type ? blocks.filter(b => b['@type'] === type) : blocks;
  },

  // Get first JSON-LD block of a type
  jsonldFirst(type) {
    return this.jsonld(type)[0] || null;
  },

  // Extract article body from JSON-LD
  articleBody() {
    const article = this.jsonldFirst('NewsArticle') || this.jsonldFirst('Article') || this.jsonldFirst('BlogPosting');
    return article?.articleBody || null;
  },

  // Extract recipe data from JSON-LD
  recipe() {
    return this.jsonldFirst('Recipe');
  },

  // Extract all meta tags as object
  meta() {
    const m = {};
    document.querySelectorAll('meta[name], meta[property]').forEach(el => {
      const key = el.getAttribute('name') || el.getAttribute('property');
      m[key] = el.getAttribute('content');
    });
    return m;
  },

  // Remove elements matching selector(s)
  remove(...selectors) {
    selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
  },

  // Show elements hidden by CSS
  reveal(...selectors) {
    selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      el.style.cssText = 'display:block!important;visibility:visible!important;opacity:1!important;height:auto!important;overflow:visible!important;';
    }));
  },

  // Insert HTML at top of page or a target element
  insertHTML(html, target) {
    const container = target ? document.querySelector(target) : document.body;
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = html;
    container.insertBefore(div, container.firstChild);
  },

  // Log to console with prefix
  log(...args) {
    console.log('[Page Tweaker]', ...args);
  },

  // Render a clean reader view from JSON-LD data
  // type: 'article' or 'recipe' — auto-detects if omitted
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
      if (!a) return tweaker.log('No article JSON-LD found');
      const image = meta['og:image'] || (Array.isArray(a.image) ? a.image[0] : a.image);
      const author = Array.isArray(a.author) ? a.author.map(x => x.name || x).join(', ') : (a.author?.name || a.author || '');
      const date = a.datePublished ? new Date(a.datePublished).toLocaleDateString('nl-NL', { year:'numeric', month:'long', day:'numeric' }) : '';
      const body = a.articleBody || '';
      const paragraphs = body.split(/\\n\\n|\\n/).filter(Boolean);

      html = '<div class="tweaker-reader tweaker-article">'
        + (image ? '<img src="' + esc(image) + '" class="tweaker-hero">' : '')
        + '<h1>' + esc(a.headline) + '</h1>'
        + '<div class="tweaker-meta">' + esc(author) + (date ? ' &middot; ' + esc(date) : '') + '</div>'
        + (a.description ? '<p class="tweaker-intro">' + esc(a.description) + '</p>' : '')
        + paragraphs.map(p => '<p>' + esc(p) + '</p>').join('')
        + '</div>';
    }

    if (type === 'recipe') {
      const r = this.recipe();
      if (!r) return tweaker.log('No recipe JSON-LD found');
      const image = Array.isArray(r.image) ? r.image[0] : r.image;
      const ingredients = r.recipeIngredient || [];
      const steps = r.recipeInstructions || [];

      html = '<div class="tweaker-reader tweaker-recipe">'
        + (image ? '<img src="' + esc(image) + '" class="tweaker-hero">' : '')
        + '<h1>' + esc(r.name) + '</h1>'
        + '<div class="tweaker-meta">'
          + (r.recipeYield ? '<span>Porties: ' + esc(String(r.recipeYield)) + '</span>' : '')
          + (r.totalTime ? '<span>Tijd: ' + esc(r.totalTime.replace('PT','').toLowerCase()) + '</span>' : '')
        + '</div>'
        + (r.description ? '<p class="tweaker-intro">' + esc(r.description) + '</p>' : '')
        + '<h2>Ingrediënten</h2>'
        + '<ul>' + ingredients.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>'
        + '<h2>Bereiding</h2>'
        + '<ol>' + steps.map(s => '<li>' + esc(typeof s === 'string' ? s : s.text || '') + '</li>').join('') + '</ol>'
        + '</div>';
    }

    if (!html) return;

    // Replace page content with reader view
    document.head.innerHTML = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    document.body.innerHTML = html;
    const style = document.createElement('style');
    style.textContent = document.tweakerCSS || '';
    document.head.appendChild(style);
    document.title = '[Reader] ' + document.title;
  }
};
`;

// Inject CSS as early as possible (during loading), JS after DOM is ready
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;

  if (changeInfo.status === 'loading') {
    // CSS first — blocks rendering of unwanted elements immediately
    chrome.storage.local.get({ tweaks: [] }, ({ tweaks }) => {
      const matching = tweaks.filter(t => t.enabled && matchDomain(tab.url, t.domain));
      for (const tweak of matching) {
        if (tweak.css) {
          chrome.scripting.insertCSS({
            target: { tabId },
            css: tweak.css
          }).catch(() => {});
        }
      }
      // Inject badge CSS early so it's ready
      if (matching.length) {
        chrome.scripting.insertCSS({
          target: { tabId },
          css: BADGE_CSS
        }).catch(() => {});
      }
    });
  }

  if (changeInfo.status === 'complete') {
    chrome.storage.local.get({ tweaks: [] }, ({ tweaks }) => {
      const matching = tweaks.filter(t => t.enabled && matchDomain(tab.url, t.domain));
      if (!matching.length) return;

      const names = matching.map(t => t.name || t.domain).join(', ');

      // Inject helpers
      chrome.scripting.executeScript({
        target: { tabId },
        func: (helpers, css) => {
          if (!window.tweaker) {
            document.tweakerCSS = css;
            const s = document.createElement('script');
            s.textContent = helpers;
            document.documentElement.appendChild(s);
            s.remove();
          }
        },
        args: [HELPERS, READER_CSS],
        world: 'MAIN'
      }).then(() => {
        // Run user JS
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
          func: (names) => {
            if (document.getElementById('tweaker-badge')) return;
            const badge = document.createElement('div');
            badge.id = 'tweaker-badge';
            badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
            badge.title = 'Page Tweaker actief:\\n' + names;
            badge.addEventListener('click', () => {
              const info = document.getElementById('tweaker-info');
              if (info) { info.remove(); return; }
              const panel = document.createElement('div');
              panel.id = 'tweaker-info';
              panel.textContent = names;
              badge.appendChild(panel);
            });
            document.body.appendChild(badge);
          },
          args: [names],
          world: 'MAIN'
        }).catch(() => {});
      }).catch(() => {});
    });
  }
});

function matchDomain(url, domain) {
  try {
    const hostname = new URL(url).hostname;
    return hostname === domain || hostname.endsWith('.' + domain);
  } catch {
    return false;
  }
}
