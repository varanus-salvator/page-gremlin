const list = document.getElementById('list');
const addBtn = document.getElementById('add');
const browseBtn = document.getElementById('browse');
const backBtn = document.getElementById('back');
const mainPanel = document.getElementById('main-panel');
const snippetPanel = document.getElementById('snippet-panel');
const snippetList = document.getElementById('snippet-list');
const snippetSearch = document.getElementById('snippet-search');
const repoInput = document.getElementById('repo-url');
const fetchRepoBtn = document.getElementById('fetch-repo');

let tweaks = [];
let snippets = [];

const DEFAULT_REPO = 'varanus-salvator/page-tweaker';

// --- Tweaks (main panel) ---

function load() {
  chrome.storage.local.get({ tweaks: [], repoUrl: DEFAULT_REPO }, data => {
    tweaks = data.tweaks;
    repoInput.value = data.repoUrl;
    render();
  });
}

function save() {
  chrome.storage.local.set({ tweaks });
}

function render() {
  if (!tweaks.length) {
    list.innerHTML = '<div class="empty">Geen tweaks — voeg een domein toe of blader door de bibliotheek</div>';
    return;
  }

  list.innerHTML = tweaks.map((t, i) => `
    <div class="tweak ${t.enabled ? '' : 'disabled'}" data-i="${i}">
      <div class="tweak-header">
        <input type="text" class="domain" value="${esc(t.domain)}" placeholder="parool.nl">
        <label><input type="checkbox" class="toggle" ${t.enabled ? 'checked' : ''}> aan</label>
      </div>
      ${t.name ? `<div class="label" style="color:#e94560;margin-top:0;margin-bottom:4px">${esc(t.name)}</div>` : ''}
      <div class="label">JavaScript</div>
      <textarea class="js" placeholder="document.querySelector('.paywall')?.remove();">${esc(t.js)}</textarea>
      <div class="label">CSS</div>
      <textarea class="css" placeholder=".overlay { display: none !important; }">${esc(t.css)}</textarea>
      <div class="actions">
        <button class="danger del">Verwijder</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.tweak').forEach(el => {
    const i = +el.dataset.i;
    el.querySelector('.domain').addEventListener('change', e => {
      tweaks[i].domain = e.target.value.trim();
      save();
    });
    el.querySelector('.toggle').addEventListener('change', e => {
      tweaks[i].enabled = e.target.checked;
      save();
      render();
    });
    el.querySelector('.js').addEventListener('change', e => {
      tweaks[i].js = e.target.value;
      save();
    });
    el.querySelector('.css').addEventListener('change', e => {
      tweaks[i].css = e.target.value;
      save();
    });
    el.querySelector('.del').addEventListener('click', () => {
      tweaks.splice(i, 1);
      save();
      render();
    });
  });
}

addBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    let domain = '';
    try { domain = new URL(tabs[0].url).hostname.replace(/^www\./, ''); } catch {}
    tweaks.push({ domain, js: '', css: '', enabled: true });
    save();
    render();
    const inputs = list.querySelectorAll('.domain');
    inputs[inputs.length - 1]?.focus();
  });
});

// --- Snippet browser ---

browseBtn.addEventListener('click', () => {
  mainPanel.style.display = 'none';
  snippetPanel.classList.add('open');
  if (!snippets.length) fetchSnippets();
});

backBtn.addEventListener('click', () => {
  snippetPanel.classList.remove('open');
  mainPanel.style.display = '';
});

fetchRepoBtn.addEventListener('click', () => {
  const repo = repoInput.value.trim();
  if (repo) {
    chrome.storage.local.set({ repoUrl: repo });
    fetchSnippets();
  }
});

async function fetchSnippets() {
  const repo = repoInput.value.trim() || DEFAULT_REPO;
  snippetList.innerHTML = '<div class="empty">Laden...</div>';

  try {
    const url = `https://raw.githubusercontent.com/${repo}/main/index.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    snippets = await res.json();
    renderSnippets();
  } catch (e) {
    snippetList.innerHTML = `<div class="empty">Kon snippets niet laden: ${esc(e.message)}<br>Controleer de repo naam (user/repo)</div>`;
  }
}

function renderSnippets(filter = '') {
  const q = filter.toLowerCase();
  const filtered = snippets.filter(s =>
    !q || s.domain?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
  );

  if (!filtered.length) {
    snippetList.innerHTML = '<div class="empty">Geen snippets gevonden</div>';
    return;
  }

  snippetList.innerHTML = filtered.map((s, i) => {
    const installed = tweaks.some(t => t.id === s.id);
    return `
      <div class="snippet" data-i="${i}">
        <div class="snippet-name">${esc(s.name)}</div>
        <div class="snippet-domain">${esc(s.domain)}</div>
        <div class="snippet-desc">${esc(s.description || '')}</div>
        <button class="install-snippet ${installed ? 'secondary' : ''}" data-id="${esc(s.id)}">
          ${installed ? '&#10003; Geïnstalleerd' : '+ Installeer'}
        </button>
      </div>
    `;
  }).join('');

  snippetList.querySelectorAll('.install-snippet').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const snippet = snippets.find(s => s.id === id);
      if (!snippet) return;

      // Remove existing with same id
      tweaks = tweaks.filter(t => t.id !== id);
      tweaks.push({
        id: snippet.id,
        name: snippet.name,
        domain: snippet.domain,
        js: snippet.js || '',
        css: snippet.css || '',
        enabled: true
      });
      save();
      renderSnippets(snippetSearch.value);
    });
  });
}

snippetSearch.addEventListener('input', e => {
  renderSnippets(e.target.value);
});

// --- Util ---

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

load();
