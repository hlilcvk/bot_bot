import { readStoredJson, writeStoredJson } from './config-loader.js';

const STORAGE_KEY = 'proptrex_radar_telegram_session_v1';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sessionId() {
  const existing = readStoredJson(STORAGE_KEY, null);
  if (existing && existing.session_id) return existing.session_id;
  const created = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `px-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  writeStoredJson(STORAGE_KEY, { session_id: created, created_at: new Date().toISOString() });
  return created;
}

async function fetchSession(sessionIdValue) {
  const res = await fetch(`/api/telegram/session?session_id=${encodeURIComponent(sessionIdValue)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function sessionSummary(row) {
  if (!row) return 'Not connected';
  if (row.status === 'bound') return `Connected to @${row.telegram_username || 'unknown'}`;
  if (row.status === 'pending') return 'Pending Telegram approval';
  return row.status || 'Unknown';
}

function renderCard(card, cfg, row, busy, errorText) {
  const sid = row?.session_id || sessionId();
  const link = row?.deep_link || '';
  const ready = row?.status === 'bound';
  const username = cfg?.botUsername || row?.bot_username || '';
  card.innerHTML = `
    <div class="botc-h">${escapeHtml(cfg?.title || 'Telegram Connection')}</div>
    <div class="bot-note" style="margin-bottom:12px;color:rgba(17,24,39,0.5)">${escapeHtml(cfg?.description || 'Bind your Telegram account through deep link approval.')}</div>
    <div style="margin-bottom:12px;border:1px solid rgba(17,24,39,0.06);border-radius:6px;padding:6px 8px">
      <div class="bot-kv tight"><span>Status</span><b>${escapeHtml(sessionSummary(row))}</b></div>
      <div class="bot-kv tight"><span>Session</span><b style="color:#2563eb;max-width:100px;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(sid)}">${escapeHtml(sid)}</b></div>
      <div class="bot-kv tight"><span>Bot Username</span><b>${escapeHtml(username || 'UNSET')}</b></div>
    </div>
    <div class="bot-actions" style="margin-top:auto;flex-wrap:wrap">
      <button class="bot-btn pri" id="pxTgLinkBtn" ${busy ? 'disabled' : ''}>${busy ? 'Create' : 'Create'}</button>
      <a class="bot-btn" id="pxTgOpenBtn" href="${escapeHtml(link || '#')}" target="_blank" rel="noopener" ${link ? '' : 'style="pointer-events:none;opacity:.45"'}>Open</a>
      <button class="bot-btn" id="pxTgTestBtn" ${ready ? '' : 'disabled'}>Test</button>
      <button class="bot-btn" id="pxTgUnlinkBtn" ${ready || row?.status === 'pending' ? '' : 'disabled'}>Unlink</button>
    </div>
    ${errorText ? `<div class="px-config-hint" style="color:#b91c1c;margin-top:6px">${escapeHtml(errorText)}</div>` : ''}
    <div class="px-config-hint" style="margin-top:8px;font-size:10px">Approval via Deep Link -> <code>/start</code></div>
  `;
}

export async function renderTelegramConnector(app, cfg) {
  const botGrid = document.querySelector('#botPanel .botp-grid');
  if (!botGrid) return;

  let card = document.getElementById('pxTelegramConnectCard');
  if (!card) {
    card = document.createElement('div');
    card.id = 'pxTelegramConnectCard';
    card.className = 'botc';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    const advancedRules = Array.from(botGrid.children).find(el => el.innerHTML && el.innerHTML.includes('Advanced Pump / Hot-Money Rules'));
    if (advancedRules) {
        botGrid.insertBefore(card, advancedRules);
    } else {
        botGrid.appendChild(card);
    }
  }

  let busy = false;
  let row = null;
  let errorText = '';
  const sid = sessionId();

  async function refresh() {
    try {
      row = await fetchSession(sid);
      const stored = readStoredJson(STORAGE_KEY, {});
      writeStoredJson(STORAGE_KEY, { ...stored, session_id: sid, status: row?.status || 'pending', updated_at: new Date().toISOString() });
      renderCard(card, cfg, row, busy, errorText);
      bindButtons();
    } catch (err) {
      errorText = `Status fetch failed: ${String(err.message || err)}`;
      renderCard(card, cfg, row, busy, errorText);
      bindButtons();
    }
  }

  async function createLink() {
    busy = true;
    errorText = '';
    renderCard(card, cfg, row, busy, errorText);
    bindButtons();
    try {
      const res = await fetch('/api/telegram/link-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sid,
          label: 'Radar Operator'
        })
      });
      if (!res.ok) throw new Error(String(res.status));
      row = await res.json();
      writeStoredJson(STORAGE_KEY, { session_id: sid, status: row.status, token: row.token, updated_at: new Date().toISOString() });
      renderCard(card, cfg, row, busy, errorText);
      bindButtons();
      if (row.deep_link) window.open(row.deep_link, '_blank', 'noopener');
    } catch (err) {
      errorText = `Link creation failed: ${String(err.message || err)}`;
      renderCard(card, cfg, row, busy, errorText);
      bindButtons();
    } finally {
      busy = false;
      renderCard(card, cfg, row, busy, errorText);
      bindButtons();
    }
  }

  async function sendTest() {
    try {
      const res = await fetch('/api/telegram/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sid,
          text: 'PROPTREX Radar test notification'
        })
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      errorText = data.sent ? '' : `Test failed: ${data.reason || 'unknown'}`;
      renderCard(card, cfg, row, busy, errorText);
      bindButtons();
    } catch (err) {
      errorText = `Test failed: ${String(err.message || err)}`;
      renderCard(card, cfg, row, busy, errorText);
      bindButtons();
    }
  }

  async function unlink() {
    try {
      const res = await fetch('/api/telegram/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid })
      });
      if (!res.ok) throw new Error(String(res.status));
      row = await fetchSession(sid);
      renderCard(card, cfg, row, busy, errorText);
      bindButtons();
    } catch (err) {
      errorText = `Unlink failed: ${String(err.message || err)}`;
      renderCard(card, cfg, row, busy, errorText);
      bindButtons();
    }
  }

  function bindButtons() {
    const linkBtn = document.getElementById('pxTgLinkBtn');
    const testBtn = document.getElementById('pxTgTestBtn');
    const unlinkBtn = document.getElementById('pxTgUnlinkBtn');
    const openBtn = document.getElementById('pxTgOpenBtn');
    if (linkBtn && !linkBtn.__bound) {
      linkBtn.__bound = true;
      linkBtn.addEventListener('click', createLink);
    }
    if (testBtn && !testBtn.__bound) {
      testBtn.__bound = true;
      testBtn.addEventListener('click', sendTest);
    }
    if (unlinkBtn && !unlinkBtn.__bound) {
      unlinkBtn.__bound = true;
      unlinkBtn.addEventListener('click', unlink);
    }
    if (openBtn && row?.deep_link) {
      openBtn.href = row.deep_link;
    }
  }

  renderCard(card, cfg, row, busy, errorText);
  bindButtons();
  refresh();
  setInterval(refresh, 4000);
}
