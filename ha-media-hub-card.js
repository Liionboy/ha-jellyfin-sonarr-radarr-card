const DEFAULT_GROUPS = [
  { key: 'jellyfin', label: 'Jellyfin' },
  { key: 'sonarr', label: 'Sonarr' },
  { key: 'radarr', label: 'Radarr' },
];

const DEFAULT_ATTR_KEYS = [
  'friendly_name', 'title', 'status', 'state', 'queue', 'queue_size', 'upcoming',
  'next_episode', 'next_movie', 'last_synced', 'last_scan', 'library', 'progress',
  'message', 'error',
];

class HaMediaHubCard extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._hass = null;
    this._root = this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    if (!config) throw new Error('Invalid configuration');
    this._config = {
      title: config.title ?? 'Media Hub',
      show_raw_attributes: Boolean(config.show_raw_attributes),
      entities: config.entities ?? {},
      attr_keys: Array.isArray(config.attr_keys) ? config.attr_keys : DEFAULT_ATTR_KEYS,
    };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 4;
  }

  render() {
    if (!this._root) return;
    if (!this._config) {
      this._root.innerHTML = `<ha-card><div style="padding:16px">Card not configured</div></ha-card>`;
      return;
    }

    const entities = this._config.entities || {};
    const groupEntries = Array.isArray(entities) ? [['default', entities]] : Object.entries(entities);

    const cards = groupEntries.map(([groupKey, entityIds]) => {
      const items = (entityIds || []).map((entityId) => this.renderEntityRow(entityId)).join('');
      const matchedLabel = DEFAULT_GROUPS.find((group) => group.key === groupKey)?.label ?? groupKey;
      return `
        <section class="group">
          <h3>${this.escapeHtml(matchedLabel)}</h3>
          <div class="group-body">${items || '<div class="empty">No entities configured</div>'}</div>
        </section>
      `;
    }).join('');

    const rawAttributes = this._config.show_raw_attributes ? this.renderRawAttributes(groupEntries) : '';

    this._root.innerHTML = `
      <style>
        :host { display:block; color: var(--primary-text-color, #1f1f1f); }
        ha-card {
          background: var(--ha-card-background, var(--card-background-color, #fff));
          border-radius: 16px;
          padding: 16px;
          box-shadow: var(--ha-card-box-shadow, none);
        }
        .header { display:flex; justify-content:space-between; gap:12px; align-items:baseline; margin-bottom:12px; }
        .header h2 { margin:0; font-size:1.1rem; }
        .hint { color: var(--secondary-text-color, #6d6d6d); font-size: .85rem; }
        .group { border-top:1px solid var(--divider-color, rgba(0,0,0,.12)); padding-top:12px; margin-top:12px; }
        .group:first-of-type { border-top:none; padding-top:0; margin-top:0; }
        .group h3 { margin:0 0 8px; font-size:.95rem; }
        .group-body { display:grid; gap:8px; }
        .row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:center; padding:10px 12px; border-radius:12px; background: rgba(127,127,127,.06); }
        .name { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .meta { color: var(--secondary-text-color, #6d6d6d); font-size:.85rem; margin-top:2px; }
        .state { font-size:.8rem; color:white; background: var(--primary-color, #03a9f4); padding:4px 8px; border-radius:999px; white-space:nowrap; }
        .empty { color: var(--secondary-text-color, #6d6d6d); font-size:.9rem; }
        pre { margin:12px 0 0; padding:12px; border-radius:12px; background: rgba(127,127,127,.08); overflow:auto; font-size:.8rem; }
      </style>
      <ha-card>
        <div class="header">
          <h2>${this.escapeHtml(this._config.title)}</h2>
          <div class="hint">Jellyfin / Sonarr / Radarr</div>
        </div>
        ${cards || '<div class="empty">No media entities configured</div>'}
        ${rawAttributes}
      </ha-card>
    `;
  }

  renderEntityRow(entityId) {
    const entity = this._hass?.states?.[entityId];
    if (!entity) {
      return `
        <div class="row">
          <div>
            <div class="name">${this.escapeHtml(entityId)}</div>
            <div class="meta">unavailable</div>
          </div>
          <div class="state">missing</div>
        </div>
      `;
    }

    const state = entity.state ?? 'unknown';
    const friendly = entity.attributes?.friendly_name ?? entityId;
    const attrLine = this._config.attr_keys
      .map((key) => entity.attributes?.[key])
      .filter((value) => value !== undefined && value !== null && value !== '')
      .slice(0, 4)
      .map((value) => typeof value === 'object' ? JSON.stringify(value) : String(value))
      .join(' • ');

    return `
      <div class="row">
        <div>
          <div class="name">${this.escapeHtml(friendly)}</div>
          <div class="meta">${this.escapeHtml(entityId)}${attrLine ? ` · ${this.escapeHtml(attrLine)}` : ''}</div>
        </div>
        <div class="state">${this.escapeHtml(state)}</div>
      </div>
    `;
  }

  renderRawAttributes(groupEntries) {
    const payload = {};
    for (const [groupKey, entityIds] of groupEntries) {
      payload[groupKey] = {};
      for (const entityId of entityIds || []) {
        const entity = this._hass?.states?.[entityId];
        payload[groupKey][entityId] = entity ? {
          state: entity.state,
          attributes: entity.attributes,
          last_changed: entity.last_changed,
          last_updated: entity.last_updated,
        } : { state: 'unavailable' };
      }
    }
    return `<pre>${this.escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}

if (!customElements.get('ha-media-hub-card')) {
  customElements.define('ha-media-hub-card', HaMediaHubCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'custom:ha-media-hub-card')) {
  window.customCards.push({
    type: 'custom:ha-media-hub-card',
    name: 'HA Media Hub Card',
    description: 'Media dashboard for Jellyfin, Sonarr, and Radarr',
  });
}
