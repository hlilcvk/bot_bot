import { cloneObject, readStoredJson, writeStoredJson } from './config-loader.js';

const FILTER_STORAGE_KEY = 'proptrex_filter_cfg_v1';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getInitialFilterState(app) {
  const current = app?.state?.proptrex?.filters || {};
  return Object.assign({}, current, readStoredJson(FILTER_STORAGE_KEY, {}));
}

function renderButton(item, state) {
  const active = !!state[item.id];
  const attrs = [
    `data-filter-id="${escapeHtml(item.id)}"`,
    item.style ? `style="${escapeHtml(item.style)}"` : ''
  ].filter(Boolean).join(' ');
  const label = escapeHtml(item.label || item.id);
  const pill = item.pill ? ` <span>${escapeHtml(item.pill)}</span>` : '';
  return `<button class="px-filter-pill${active ? ' on' : ''}" ${attrs}>${label}${pill}</button>`;
}

export function renderFilterToolbar(app, config) {
  if (!config || !Array.isArray(config.groups)) return;

  const state = getInitialFilterState(app);
  app.state.proptrex.filters = Object.assign({}, app.state.proptrex.filters || {}, state);

  // Settings paneli henüz oluşturulmamışsa; observer ile bekle
  function doRender() {
    const targetEl = document.getElementById('pxSettingsFilterZone');
    if (!targetEl) return false;

    targetEl.innerHTML = config.groups.map(group => {
      const title = `<span style="font-size:10px;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:1px;align-self:center;margin-right:4px">${escapeHtml(group.title || '')}</span>`;
      const buttons = (group.items || []).map(item => renderButton(item, state)).join('');
      return `${title}${buttons}`;
    }).join('');

    targetEl.querySelectorAll('[data-filter-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-filter-id');
        const next = !!app.state.proptrex.filters[key];
        app.state.proptrex.filters[key] = !next;
        btn.classList.toggle('on', !next);
        writeStoredJson(FILTER_STORAGE_KEY, cloneObject(app.state.proptrex.filters));
        app.rerenderTable();
      });
    });
    return true;
  }

  if (!doRender()) {
    // Settings paneli sonradan oluştuğunda tekrar dene
    const obs = new MutationObserver(() => { if (doRender()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }
}
