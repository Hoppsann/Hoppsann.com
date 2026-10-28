// =========================================
// PROJECTS — inline section opened by the "Code" card
//
// Loads all public repos for GITHUB_USER live from the GitHub API, so new
// projects show up automatically. If the API can't be reached (offline,
// rate limit), /data/repos.json is used instead.
// =========================================

(() => {
  const GITHUB_USER = 'Hoppsann';
  const API_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&type=owner&sort=pushed`;
  const FALLBACK_URL = '/data/repos.json';
  const CACHE_KEY = 'hoppsann-repos-v1';
  const CACHE_MS = 10 * 60 * 1000;

  const SHOW_FORKS = false;
  const SHOW_ARCHIVED = true;

  // GitHub's own language colours for the little dot
  const LANGUAGE_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    HTML: '#e34c26',
    CSS: '#663399',
    Python: '#3572A5',
    Lua: '#000080',
    'C#': '#178600',
    'C++': '#f34b7d',
    C: '#555555',
    Java: '#b07219',
    Shell: '#89e051',
    Rust: '#dea584',
    Go: '#00ADD8',
    GDScript: '#355570',
  };

  let loadPromise = null;
  let built = false;

  const $ = (id) => document.getElementById(id);

  // ---- data ----

  function readCache() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (cached && Date.now() - cached.time < CACHE_MS) return cached.repos;
    } catch (e) { /* storage blocked: ignore */ }
    return null;
  }

  function writeCache(repos) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), repos }));
    } catch (e) { /* storage blocked: ignore */ }
  }

  async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`${url} (${res.status})`);
    return res.json();
  }

  function loadRepos() {
    if (!loadPromise) {
      loadPromise = (async () => {
        const cached = readCache();
        if (cached) return cached;

        try {
          const repos = await fetchJson(API_URL);
          writeCache(repos);
          return repos;
        } catch (e) {
          console.warn('[projects] GitHub API failed, using fallback list', e);
          const data = await fetchJson(FALLBACK_URL);
          return data.repos;
        }
      })().catch(err => {
        loadPromise = null; // allow a retry next time
        throw err;
      });
    }
    return loadPromise;
  }

  // ---- helpers ----

  function timeAgo(iso) {
    const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
    const units = [
      ['year', 31536000], ['month', 2592000], ['week', 604800],
      ['day', 86400], ['hour', 3600], ['minute', 60],
    ];
    for (const [unit, size] of units) {
      const n = Math.floor(seconds / size);
      if (n >= 1) return `${n} ${unit}${n > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  }

  function normalizeUrl(url) {
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function link(href, className, text, label) {
    const a = el('a', className, text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (label) a.setAttribute('aria-label', label);
    return a;
  }

  // ---- grid ----

  function buildCard(repo) {
    const card = el('article', 'project-card');

    const head = el('div', 'project-head');
    head.appendChild(link(repo.html_url, 'project-name', repo.name, `${repo.name} on GitHub`));
    if (repo.archived) head.appendChild(el('span', 'project-badge', 'archived'));
    card.appendChild(head);

    card.appendChild(el('p', 'project-desc', repo.description || 'No description yet.'));
    if (!repo.description) card.lastChild.classList.add('is-empty');

    const meta = el('div', 'project-meta');
    if (repo.language) {
      const lang = el('span', 'project-lang');
      const dot = el('span', 'project-lang-dot');
      dot.style.background = LANGUAGE_COLORS[repo.language] || 'currentColor';
      lang.append(dot, document.createTextNode(repo.language));
      meta.appendChild(lang);
    }
    if (repo.pushed_at) {
      const time = el('time', 'project-updated', `updated ${timeAgo(repo.pushed_at)}`);
      time.dateTime = repo.pushed_at;
      meta.appendChild(time);
    }
    card.appendChild(meta);

    const links = el('div', 'project-links');
    links.appendChild(link(repo.html_url, 'project-link', 'GitHub ↗', `Open ${repo.name} on GitHub`));
    const live = normalizeUrl(repo.homepage);
    if (live) links.appendChild(link(live, 'project-link is-live', 'Live site ↗', `Open ${repo.name} live site`));
    card.appendChild(links);

    return card;
  }

  function buildGrid(repos) {
    const visible = repos
      .filter(r => (SHOW_FORKS || !r.fork) && (SHOW_ARCHIVED || !r.archived))
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

    const grid = $('projects-grid');
    const fragment = document.createDocumentFragment();
    visible.forEach(repo => fragment.appendChild(buildCard(repo)));
    grid.replaceChildren(fragment);

    $('projects-count').textContent = `${visible.length} public repos`;
    built = true;
  }

  // ---- open / close ----

  async function openProjects() {
    $('projects-section').classList.add('is-open');
    if (built) return;

    const grid = $('projects-grid');
    grid.replaceChildren(el('p', 'projects-loading', 'Loading…'));

    try {
      buildGrid(await loadRepos());
    } catch (e) {
      grid.replaceChildren(el('p', 'projects-loading', `Couldn't load projects: ${e.message}`));
      console.error('[projects]', e);
    }
  }

  function closeProjects() {
    $('projects-section').classList.remove('is-open');
  }

  // ---- init ----

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.card3')?.addEventListener('click', openProjects);
    document.querySelector('.card1')?.addEventListener('click', closeProjects);
    document.querySelector('.card2')?.addEventListener('click', closeProjects);
  });
})();
