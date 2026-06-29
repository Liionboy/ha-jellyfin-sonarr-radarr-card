const DEFAULT_GROUPS = [
  { key: "jellyfin", label: "Jellyfin" },
  { key: "sonarr", label: "Sonarr" },
  { key: "radarr", label: "Radarr" },
];

const DEFAULT_ATTR_KEYS = [
  "friendly_name",
  "title",
  "status",
  "state",
  "queue",
  "queue_size",
  "upcoming",
  "next_episode",
  "next_movie",
  "last_synced",
  "last_scan",
  "library",
  "progress",
  "message",
  "error",
];

class HaMediaHubCard extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = {
      title: config.title ?? "Media Hub",
      show_raw_attributes: Boolean(config.show_raw_attributes),
      entities: config.entities ?? {},
      attr_keys: Array.isArray(config.attr_keys) ? config.attr_keys : DEFAULT_ATTR_KEYS,
    };
    this._entities = {};
    this.attachShadow({ mode: "open" });
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
    if (!this.shadowRoot || !this._config || !this._hass) return;

    const groups = Object.entries(this._config.entities);
    const cards = groups.map(([groupKey, entityIds]) => {
      const items = (entityIds || []).map((entityId) => {
        const entity = this._hass.states[entityId];
        return this.renderEntityRow(entityId, entity);
      }).join("");

      const matchedLabel = DEFAULT_GROUPS.find((group) => group.key === groupKey)?.label ?? groupKey;
      return `
        <section class="group">
          <h3>${matchedLabel}</h3>
          <div class="group-body">${items || `<div class="empty">No entities configured</div>`}</div>
        </section>
      `;
    }).join("");

    const rawAttributes = this._config.show_raw_attributes
      ? this.renderRawAttributes(groups)
      : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --bg: var(--ha-card-background, var(--card-background-color, #fff));
          --border: var(--divider-color, rgba(0, 0, 0, 0.12));
          --text: var(--primary-text-color, #1f1f1f);
          --muted: var(--secondary-text-color, #6d6d6d);
          --accent: var(--primary-color, #03a9f4);
          font-family: var(--paper-font-body1_-_font-family, inherit);
        }
        ha-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          box-shadow: var(--ha-card-box-shadow, none);
        }
        .header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .header h2 {
          margin: 0;
          font-size: 1.1rem;
          color: var(--text);
        }
        .header .hint {
          color: var(--muted);
          font-size: 0.85rem;
        }
        .group {
          border-top: 1px solid var(--border);
          padding-top: 12px;
          margin-top: 12px;
        }
        .group:first-of-type {
          border-top: none;
          padding-top: 0;
          margin-top: 0;
        }
        .group h3 {
          margin: 0 0 8px;
          font-size: 0.95rem;
          color: var(--text);
        }
        .group-body {
          display: grid;
          gap: 8px;
        }
        .row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(127, 127, 127, 0.06);
        }
        .name {
          color: var(--text);
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .meta {
          color: var(--muted);
          font-size: 0.85rem;
          margin-top: 2px;
        }
        .state {
          font-size: 0.8rem;
          color: white;
          background: var(--accent);
          padding: 4px 8px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .empty, .raw-empty {
          color: var(--muted);
          font-size: 0.9rem;
        }
        pre {
          margin: 12px 0 0;
          padding: 12px;
          border-radius: 12px;
          background: rgba(127, 127, 127, 0.08);
          overflow: auto;
          color: var(--text);
          font-size: 0.8rem;
        }
      </style>
      <ha-card>
        <div class="header">
          <h2>${this._config.title}</h2>
          <div class="hint">Jellyfin / Sonarr / Radarr</div>
        </div>
        ${cards || `<div class="empty">No media entities configured</div>`}
        ${rawAttributes}
      </ha-card>
    `;
  }

  renderEntityRow(entityId, entity) {
    const state = entity?.state ?? "unavailable";
    const friendly = entity?.attributes?.friendly_name ?? entityId;
    const attrLine = this._config.attr_keys
      .map((key) => entity?.attributes?.[key])
      .filter((value) => value !== undefined && value !== null && value !== "")
      .slice(0, 4)
      .map((value) => typeof value === "object" ? JSON.stringify(value) : String(value))
      .join(" • ");
    return `
      <div class="row">
        <div>
          <div class="name">${friendly}</div>
          <div class="meta">${entityId}${attrLine ? ` · ${attrLine}` : ""}</div>
        </div>
        <div class="state">${state}</div>
      </div>
    `;
  }

  renderRawAttributes(groups) {
    const payload = {};
    for (const [groupKey, entityIds] of groups) {
      payload[groupKey] = {};
      for (const entityId of entityIds || []) {
        const entity = this._hass.states[entityId];
        payload[groupKey][entityId] = entity ? {
          state: entity.state,
          attributes: entity.attributes,
          last_changed: entity.last_changed,
          last_updated: entity.last_updated,
        } : { state: "unavailable" };
      }
    }
    return `<pre>${this.escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}

customElements.define("ha-media-hub-card", HaMediaHubCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "custom:ha-media-hub-card",
  name: "HA Media Hub Card",
  description: "Media dashboard for Jellyfin, Sonarr, and Radarr",
});
