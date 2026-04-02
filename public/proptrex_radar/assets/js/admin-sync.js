import { cloneObject, readStoredJson, writeStoredJson } from './config-loader.js';

const ADMIN_STORAGE_KEY = 'proptrex_admin_cfg_v1';

export function syncAdminDefaults(app, defaults) {
  const stored = readStoredJson(ADMIN_STORAGE_KEY, null);
  if (stored == null && defaults && Object.keys(defaults).length) {
    writeStoredJson(ADMIN_STORAGE_KEY, cloneObject(defaults));
    if (typeof app.saveAdminConfig === 'function') {
      app.saveAdminConfig(defaults);
    }
    return;
  }

  if (stored && typeof app.saveAdminConfig === 'function') {
    app.saveAdminConfig(stored);
  }
}

export function renderAdminSourceNote() {
  const panel = document.getElementById('pxAdminPanel');
  if (!panel || panel.querySelector('[data-editable-source]')) return;
  const note = document.createElement('div');
  note.className = 'px-admin-note';
  note.setAttribute('data-editable-source', '1');
  note.textContent = 'Editable sources are split under assets/config and assets/js.';
  panel.prepend(note);
}
