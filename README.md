# Page Tweaker Snippets

Community-maintained snippet library for the [Page Tweaker](https://github.com/varanus-salvator/page-tweaker) browser extension. Add custom JavaScript and CSS tweaks for any website.

## How it works

The Page Tweaker extension fetches `index.json` from this repo. Users can browse, search, and install snippets directly from the extension popup.

## `tweaker` API

Every snippet has access to the `tweaker` helper object. It's injected automatically before your code runs.

### JSON-LD

Most news sites, recipe sites, and blogs embed structured data in `<script type="application/ld+json">` tags. These helpers parse it for you.

| Method | Returns | Description |
|--------|---------|-------------|
| `tweaker.jsonld()` | `Array` | All JSON-LD objects on the page |
| `tweaker.jsonld("Recipe")` | `Array` | Only JSON-LD objects matching a `@type` |
| `tweaker.jsonldFirst("NewsArticle")` | `Object\|null` | First match for a type |
| `tweaker.articleBody()` | `String\|null` | Article text from NewsArticle/Article/BlogPosting |
| `tweaker.recipe()` | `Object\|null` | Recipe JSON-LD (ingredients, instructions, etc.) |

```js
// Log all structured data on the page
tweaker.log(tweaker.jsonld());

// Get recipe ingredients
const recipe = tweaker.recipe();
if (recipe) tweaker.log(recipe.recipeIngredient);

// Get article text even when hidden behind a paywall
const text = tweaker.articleBody();
if (text) tweaker.log(text);
```

### Page metadata

| Method | Returns | Description |
|--------|---------|-------------|
| `tweaker.meta()` | `Object` | All `<meta>` tags as `{ name: content }` |

```js
const meta = tweaker.meta();
tweaker.log(meta['og:title'], meta['og:description']);
```

### DOM manipulation

| Method | Description |
|--------|-------------|
| `tweaker.remove(...selectors)` | Remove all elements matching the selectors |
| `tweaker.reveal(...selectors)` | Force-show hidden elements (sets display, visibility, opacity, overflow) |
| `tweaker.insertHTML(html, target?)` | Insert HTML at the top of `target` (selector) or `<body>` |
| `tweaker.log(...args)` | `console.log` with `[Page Tweaker]` prefix |

```js
// Remove cookie banners and overlays
tweaker.remove('.cookie-banner', '#overlay');

// Make paywall-hidden content visible
tweaker.reveal('.article-body');

// Add a banner at the top of the page
tweaker.insertHTML('<div style="background:gold;padding:8px;text-align:center">Tweaked!</div>');
```

## Snippet format

Each snippet in `index.json`:

```json
{
  "id": "unique-id",
  "name": "Human-readable name",
  "domain": "example.com",
  "description": "What this snippet does",
  "js": "tweaker.remove('.annoyance');",
  "css": ".popup { display: none !important; }"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique identifier, e.g. `site-purpose` |
| `name` | yes | Short descriptive name |
| `domain` | yes | Domain to match (without `www.`) |
| `description` | no | What the snippet does |
| `js` | no | JavaScript to inject (has access to `tweaker` API) |
| `css` | no | CSS to inject |

## Contributing

1. Fork this repo
2. Add your snippet to `index.json`
3. Open a pull request

### Guidelines

- **One snippet per purpose** — don't bundle unrelated tweaks
- **Use a clear `id`** — format: `domain-purpose`, e.g. `reddit-old-design`
- **Use the `tweaker` API** — prefer `tweaker.remove()` over raw DOM calls
- **Test your snippet** — make sure it works in the Page Tweaker extension
- **Keep it minimal** — smallest possible JS/CSS to achieve the goal
- **No malicious code** — no tracking, data exfiltration, or credential harvesting
