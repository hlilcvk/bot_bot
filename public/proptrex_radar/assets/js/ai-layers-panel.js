export function renderAiLayersPanel(config) {
  const side = document.getElementById('mSide');
  if (!side) return;

  const id = 'pxAiLayersCard';
  let card = document.getElementById(id);
  if (!card) {
    card = document.createElement('div');
    card.id = id;
    card.className = 'px-editable-card px-editable-shell';
    side.prepend(card);
  }

  const title = config && config.title ? String(config.title) : 'AI Layers';
  const subtitle = config && config.subtitle ? String(config.subtitle) : 'Registry-backed AI capability layers.';
  const layers = Array.isArray(config && config.layers) ? config.layers : [];
  const rows = layers.map(layer => {
    const label = String(layer && layer.label ? layer.label : layer && layer.id ? layer.id : '');
    const summary = String(layer && layer.summary ? layer.summary : '');
    return `<div class="px-editable-row"><div><b>${label}</b><span>${summary}</span></div><div class="px-editable-file">${String(layer && layer.id ? layer.id : 'layer')}</div></div>`;
  }).join('');

  card.innerHTML = `
    <h4>${title}</h4>
    <div class="px-editable-meta">${subtitle}</div>
    <div class="px-config-hint">Source: <span class="px-editable-file">assets/config/ai-layers.json</span></div>
    <div class="px-editable-list">${rows || '<div class="px-editable-row"><div><b>No layers</b><span>AI registry is present but empty.</span></div><div class="px-editable-file">ai</div></div>'}</div>
  `;
}
