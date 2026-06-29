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

const TECHNICAL_ATTR_KEYS = new Set([
  'device_class',
  'entity_picture',
  'friendly_name',
  'icon',
  'restored',
  'state_class',
  'supported_features',
]);

const LABEL_MAP = {
  friendly_name: 'Name',
  title: 'Title',
  status: 'Status',
  state: 'State',
  queue: 'Queue',
  queue_size: 'Queue size',
  upcoming: 'Upcoming',
  next_episode: 'Next episode',
  next_movie: 'Next movie',
  last_synced: 'Last synced',
  last_scan: 'Last scan',
  library: 'Library',
  progress: 'Progress',
  message: 'Message',
  error: 'Error',
  unit_of_measurement: 'Unit',
  device_class: 'Class',
  data: 'Items',
};

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
      entities: config.entities ?? [],
      groups: config.groups ?? null,
      jellyfin: config.jellyfin ?? null,
      sonarr: config.sonarr ?? null,
      radarr: config.radarr ?? null,
      attr_keys: Array.isArray(config.attr_keys) ? config.attr_keys : null,
      max_attributes: Number.isInteger(config.max_attributes) ? config.max_attributes : 12,
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

    const groupEntries = this.normalizeGroups();

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
        .attrs { display:grid; gap:2px; margin-top:6px; color: var(--primary-text-color, #1f1f1f); font-size:.84rem; }
        .attrs strong { font-weight:600; }
        .attrs ul { margin:4px 0 0; padding-left:18px; display:grid; gap:3px; }
        .attrs li { line-height:1.35; }
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

  normalizeGroups() {
    const directGroups = {};
    for (const key of ['jellyfin', 'sonarr', 'radarr']) {
      if (Array.isArray(this._config[key])) directGroups[key] = this._config[key];
    }
    if (Object.keys(directGroups).length > 0) return Object.entries(directGroups);

    if (this._config.groups && typeof this._config.groups === 'object') {
      return Object.entries(this._config.groups)
        .map(([key, value]) => [key, this.normalizeEntityList(value)]);
    }

    const entities = this._config.entities;
    if (Array.isArray(entities)) {
      const buckets = { jellyfin: [], sonarr: [], radarr: [], other: [] };
      for (const entityId of entities) {
        if (typeof entityId !== 'string') continue;
        if (entityId.startsWith('sensor.jelly') || entityId.startsWith('media_player.jelly')) buckets.jellyfin.push(entityId);
        else if (entityId.startsWith('sensor.sonarr') || entityId.startsWith('binary_sensor.sonarr')) buckets.sonarr.push(entityId);
        else if (entityId.startsWith('sensor.radarr') || entityId.startsWith('binary_sensor.radarr')) buckets.radarr.push(entityId);
        else buckets.other.push(entityId);
      }
      return Object.entries(buckets).filter(([, value]) => value.length > 0);
    }

    if (entities && typeof entities === 'object') {
      return Object.entries(entities).map(([key, value]) => [key, this.normalizeEntityList(value)]);
    }

    return [];
  }

  normalizeEntityList(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.entities)) return value.entities;
    return [];
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
    const attrPairs = this.renderDisplayAttributes(entity);
    const extraHints = this.buildExtraHints(entity);

    return `
      <div class="row">
        <div>
          <div class="name">${this.escapeHtml(friendly)}</div>
          <div class="meta">${this.escapeHtml(entityId)}</div>
          ${attrPairs ? `<div class="attrs">${attrPairs}</div>` : ''}
          ${extraHints ? `<div class="meta">${this.escapeHtml(extraHints)}</div>` : ''}
        </div>
        <div class="state">${this.escapeHtml(state)}</div>
      </div>
    `;
  }

  getDisplayAttributes(entity) {
    const attrs = entity.attributes || {};
    const keys = this._config.attr_keys || Object.keys(attrs)
      .filter((key) => !TECHNICAL_ATTR_KEYS.has(key))
      .filter((key) => attrs[key] !== undefined && attrs[key] !== null && attrs[key] !== '');

    return keys
      .filter((key) => attrs[key] !== undefined && attrs[key] !== null && attrs[key] !== '')
      .slice(0, this._config.max_attributes)
      .map((key) => [key, attrs[key]]);
  }

  renderDisplayAttributes(entity) {
    return this.getDisplayAttributes(entity)
      .map(([key, value]) => this.renderAttributeValue(key, value))
      .join('');
  }

  renderAttributeValue(key, value) {
    const label = this.escapeHtml(LABEL_MAP[key] ?? key);

    if (Array.isArray(value)) {
      const items = value
        .map((item) => this.formatListItem(item))
        .filter(Boolean)
        .slice(0, this._config.max_attributes);

      if (items.length === 0) return '';
      return `
        <div class="attr-block">
          <strong>${label}</strong>
          <ul>${items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      `;
    }

    if (value && typeof value === 'object') {
      const display = this.formatListItem(value);
      return `<div><strong>${label}</strong>: ${this.escapeHtml(display)}</div>`;
    }

    return `<div><strong>${label}</strong>: ${this.escapeHtml(String(value))}</div>`;
  }

  formatListItem(item) {
    if (item === null || item === undefined || item === '') return '';
    if (typeof item !== 'object') return String(item);

    const title = item.title || item.name || item.seriesTitle || item.movieTitle || item.label || item.summary;
    const episode = item.episode || item.episodeTitle || item.seasonEpisode;
    const status = item.status || item.quality || item.release || item.airdate || item.aired;
    const details = [episode, status].filter(Boolean).join(' - ');

    if (title && details) return `${title} (${details})`;
    if (title) return String(title);

    return Object.entries(item)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .slice(0, 4)
      .map(([field, value]) => `${field}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
      .join(', ');
  }

  buildExtraHints(entity) {
    const hints = [];
    const attrs = entity.attributes || {};
    if (attrs.unit_of_measurement) hints.push(String(attrs.unit_of_measurement));
    if (entity.state && entity.state !== 'unknown' && entity.state !== 'unavailable') {
      hints.push(`state ${entity.state}`);
    }
    return hints.join(' • ');
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
