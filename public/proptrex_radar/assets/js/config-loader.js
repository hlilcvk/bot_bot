const JSON_CACHE = new Map();

export async function fetchJson(url, fallback) {
  try {
    if (JSON_CACHE.has(url)) return JSON_CACHE.get(url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    JSON_CACHE.set(url, data);
    return data;
  } catch {
    return fallback;
  }
}

export async function loadEditableConfig() {
  const [filters, aiLayers, adminDefaults] = await Promise.all([
    fetchJson('assets/config/filters.json', { groups: [] }),
    fetchJson('assets/config/ai-layers.json', { title: 'AI Layers', layers: [] }),
    fetchJson('assets/config/admin-defaults.json', {})
  ]);

  return { filters, aiLayers, adminDefaults };
}

export function readStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
  return true;
}

export function cloneObject(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
