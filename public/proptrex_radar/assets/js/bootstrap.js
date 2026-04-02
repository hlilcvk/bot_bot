import { fetchJson, loadEditableConfig } from './config-loader.js';
import { renderFilterToolbar } from './filter-toolbar.js';
import { renderAiLayersPanel } from './ai-layers-panel.js';
import { syncAdminDefaults, renderAdminSourceNote } from './admin-sync.js';
import { renderTelegramConnector } from './telegram-link.js';

async function waitForApp(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (window.PROPTREX_APP && window.PROPTREX_APP.state && window.PROPTREX_APP.rerenderTable) {
      return window.PROPTREX_APP;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return null;
}

function ensureEditableCard() {
  const side = document.getElementById('mSide');
  if (!side) return;
  if (document.getElementById('pxEditableMetaCard')) return;

  const card = document.createElement('div');
  card.id = 'pxEditableMetaCard';
  card.className = 'px-editable-card px-editable-shell';
  card.innerHTML = `
    <h4>Project Structure</h4>
    <div class="px-editable-meta">This page is split into editable folders without changing core runtime behavior.</div>
    <div class="px-editable-list">
      <div class="px-editable-row"><div><b>assets/config/filters.json</b><span>Filter groups and buttons.</span></div><div class="px-editable-file">config</div></div>
      <div class="px-editable-row"><div><b>assets/config/ai-layers.json</b><span>AI layer registry and summaries.</span></div><div class="px-editable-file">config</div></div>
      <div class="px-editable-row"><div><b>assets/config/admin-defaults.json</b><span>Runtime thresholds and defaults.</span></div><div class="px-editable-file">config</div></div>
      <div class="px-editable-row"><div><b>contracts/page-registry.json</b><span>Page contract registry.</span></div><div class="px-editable-file">contracts</div></div>
      <div class="px-editable-row"><div><b>locale/en.json</b><span>Locale namespace entry.</span></div><div class="px-editable-file">locale</div></div>
    </div>
  `;
  side.prepend(card);
}

async function main() {
  const config = await loadEditableConfig();
  const [pageRegistry, navigationRegistry, localeRegistry, telegramConfig] = await Promise.all([
    fetchJson('contracts/page-registry.json', {}),
    fetchJson('contracts/navigation-registry.json', {}),
    fetchJson('contracts/locale-registry.json', {}),
    fetchJson('assets/config/telegram.json', {})
  ]);
  window.PROPTREX_EDITABLE = Object.assign({}, config, {
    registry: {
      page: pageRegistry,
      navigation: navigationRegistry,
      locale: localeRegistry,
      telegram: telegramConfig
    }
  });

  const app = await waitForApp();
  if (!app) return;

  syncAdminDefaults(app, config.adminDefaults);
  ensureEditableCard();
  if (pageRegistry || navigationRegistry || localeRegistry) {
    const side = document.getElementById('mSide');
    if (side && !document.getElementById('pxRegistryCard')) {
      const card = document.createElement('div');
      card.id = 'pxRegistryCard';
      card.className = 'px-editable-card px-editable-shell';
      card.innerHTML = `
        <h4>Registry Surface</h4>
        <div class="px-editable-meta">Page contract, navigation and locale registries loaded from the subproduct tree.</div>
        <div class="px-editable-list">
          <div class="px-editable-row"><div><b>Page Contract</b><span>${pageRegistry.canonicalRoute || 'n/a'}</span></div><div class="px-editable-file">contracts/page-registry.json</div></div>
          <div class="px-editable-row"><div><b>Navigation</b><span>${(navigationRegistry.entries || []).length} entry</span></div><div class="px-editable-file">contracts/navigation-registry.json</div></div>
          <div class="px-editable-row"><div><b>Locale</b><span>${(localeRegistry.namespaces || []).join(', ') || 'n/a'}</span></div><div class="px-editable-file">contracts/locale-registry.json</div></div>
        </div>
      `;
      side.prepend(card);
    }
  }
  renderAiLayersPanel(config.aiLayers);
  renderFilterToolbar(app, config.filters);
  renderTelegramConnector(app, telegramConfig);
  renderAdminSourceNote();

  const openBtn = document.getElementById('pxAdminOpen');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      setTimeout(renderAdminSourceNote, 0);
    });
  }
}

main().catch(() => {});
