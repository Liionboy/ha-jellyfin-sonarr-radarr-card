import { LitElement, html, css, CSSResultGroup, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';

const CARD = 'ha-media-hub-card';
console.info(`%c 📺 MEDIA-HUB %c v1.0.0 `,'color:#fff;background:#ec4899;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px;','color:#fff;background:#6b7280;font-weight:700;border-radius:0 4px 4px 0;padding:2px 6px;');

interface MediaConfig {
  type: string;
  title?: string;
  entities?: string[];
  show_now_playing?: boolean;
  show_favorites?: boolean;
  favorites?: Array<{ name: string; icon?: string; entity_id?: string }>;
}

@customElement(CARD)
export class MediaHubCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: MediaConfig;

  public static getStubConfig(): MediaConfig {
    return {
      type: CARD, title: '📺 Media Hub', show_now_playing: true, show_favorites: true,
      entities: ['media_player.living_tv', 'media_player.homepod_bucatarie', 'media_player.hisense_40a3he_6hl51674_smart_tv'],
      favorites: [
        { name: 'Netflix', icon: 'mdi:netflix' },
        { name: 'YouTube', icon: 'mdi:youtube' },
        { name: 'Plex', icon: 'mdi:plex' },
        { name: 'Spotify', icon: 'mdi:spotify' },
      ],
    };
  }

  setConfig(config: MediaConfig): void {
    if (!config) throw new Error('Invalid config');
    this.config = { type: CARD, title: '📺 Media Hub', show_now_playing: true, show_favorites: true, entities: [], favorites: [], ...config };
  }

  private _getPlayers() {
    return (this.config.entities || [])
      .map(id => this.hass?.states[id])
      .filter(Boolean)
      .map(entity => ({
        entity_id: entity!.entity_id,
        name: ((entity!.attributes as Record<string, unknown>)?.friendly_name as string) || entity!.entity_id,
        state: entity!.state,
        media_title: (entity!.attributes as Record<string, unknown>)?.media_title as string,
        media_artist: (entity!.attributes as Record<string, unknown>)?.media_artist as string,
        app_name: (entity!.attributes as Record<string, unknown>)?.app_name as string,
        icon: this._getPlayerIcon(entity!),
      }));
  }

  private _getPlayerIcon(entity: { entity_id: string; state: string }) {
    const id = entity.entity_id.toLowerCase();
    if (id.includes('tv') || id.includes('bravia')) return 'mdi:television';
    if (id.includes('homepod') || id.includes('speaker')) return 'mdi:speaker';
    if (id.includes('spotify')) return 'mdi:spotify';
    if (id.includes('plex')) return 'mdi:plex';
    return 'mdi:cast';
  }

  private _stateLabel(state: string): string {
    const labels: Record<string, string> = { playing: '🎵 Redă', paused: '⏸️ Pauză', idle: '⏸️ Idle', off: '⚫ Oprit', on: '🟢 Pornit', standby: '💤 Standby' };
    return labels[state] || state;
  }

  private _callService(entityId: string, service: string) {
    this.hass.callService('media_player', service, { entity_id: entityId });
  }

  getCardSize() { return 3; }

  protected render(): TemplateResult | typeof nothing {
    if (!this.config || !this.hass) return nothing;
    const players = this._getPlayers();
    const nowPlaying = players.find(p => p.state === 'playing');

    return html`
      <ha-card>
        <div class="header">
          <div class="header-icon">📺</div>
          <div class="header-text">
            <div class="header-title">${this.config.title || 'Media Hub'}</div>
            <div class="header-sub">${players.filter(p => p.state !== 'off' && p.state !== 'unavailable').length} active</div>
          </div>
        </div>

        <!-- Now Playing -->
        ${this.config.show_now_playing && nowPlaying ? html`
          <div class="now-playing">
            <div class="np-icon"><ha-icon .icon=${nowPlaying.icon}></ha-icon></div>
            <div class="np-info">
              <div class="np-title">${nowPlaying.media_title || nowPlaying.app_name || nowPlaying.name}</div>
              <div class="np-artist">${nowPlaying.media_artist || nowPlaying.app_name || ''}</div>
            </div>
            <div class="np-controls">
              <button class="np-btn" @click=${() => this._callService(nowPlaying.entity_id, 'media_previous_track')}><ha-icon icon="mdi:skip-previous"></ha-icon></button>
              <button class="np-btn play" @click=${() => this._callService(nowPlaying.entity_id, nowPlaying.state === 'playing' ? 'media_pause' : 'media_play')}>
                <ha-icon icon=${nowPlaying.state === 'playing' ? 'mdi:pause' : 'mdi:play'}></ha-icon>
              </button>
              <button class="np-btn" @click=${() => this._callService(nowPlaying.entity_id, 'media_next_track')}><ha-icon icon="mdi:skip-next"></ha-icon></button>
            </div>
          </div>
        ` : nothing}

        <!-- Players -->
        <div class="players">
          ${players.map(p => html`
            <div class="player ${p.state === 'playing' ? 'active' : ''}" @click=${() => fireEvent(this, 'hass-more-info', { entityId: p.entity_id })}>
              <ha-icon .icon=${p.icon}></ha-icon>
              <div class="player-info">
                <div class="player-name">${p.name}</div>
                <div class="player-state">${this._stateLabel(p.state)}</div>
              </div>
              ${p.state !== 'off' && p.state !== 'unavailable' ? html`
                <div class="player-actions">
                  ${p.state === 'playing' ? html`
                    <button class="action-btn" @click=${(e: Event) => { e.stopPropagation(); this._callService(p.entity_id, 'media_pause'); }}><ha-icon icon="mdi:pause"></ha-icon></button>
                  ` : p.state === 'paused' || p.state === 'idle' ? html`
                    <button class="action-btn" @click=${(e: Event) => { e.stopPropagation(); this._callService(p.entity_id, 'media_play'); }}><ha-icon icon="mdi:play"></ha-icon></button>
                  ` : nothing}
                  <button class="action-btn" @click=${(e: Event) => { e.stopPropagation(); this._callService(p.entity_id, 'volume_up'); }}><ha-icon icon="mdi:volume-plus"></ha-icon></button>
                </div>
              ` : nothing}
            </div>
          `)}
        </div>

        <!-- Favorites -->
        ${this.config.show_favorites && (this.config.favorites || []).length > 0 ? html`
          <div class="favorites-title">Favorite</div>
          <div class="favorites">
            ${(this.config.favorites || []).map(fav => html`
              <button class="fav-btn">
                <ha-icon .icon=${fav.icon || 'mdi:star'}></ha-icon>
                <span>${fav.name}</span>
              </button>
            `)}
          </div>
        ` : nothing}
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host { display: block; }
      ha-card { border-radius: 16px; overflow: hidden; }
      .header { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); background: linear-gradient(135deg, rgba(236,72,153,0.06), rgba(168,85,247,0.04)); }
      .header-icon { font-size: 28px; }
      .header-text { flex: 1; }
      .header-title { font-size: 16px; font-weight: 600; color: var(--primary-text-color); }
      .header-sub { font-size: 12px; color: var(--secondary-text-color); }
      .now-playing { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.06)); }
      .np-icon ha-icon { --mdc-icon-size: 28px; color: var(--primary-text-color); }
      .np-info { flex: 1; }
      .np-title { font-size: 14px; font-weight: 600; color: var(--primary-text-color); }
      .np-artist { font-size: 12px; color: var(--secondary-text-color); }
      .np-controls { display: flex; gap: 8px; }
      .np-btn { background: none; border: none; color: var(--primary-text-color); cursor: pointer; padding: 4px; border-radius: 50%; }
      .np-btn:hover { background: rgba(255,255,255,0.1); }
      .np-btn ha-icon { --mdc-icon-size: 22px; }
      .np-btn.play ha-icon { --mdc-icon-size: 28px; }
      .players { padding: 8px 12px; }
      .player { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background 0.2s; }
      .player:hover { background: rgba(255,255,255,0.04); }
      .player.active { background: rgba(236,72,153,0.06); }
      .player ha-icon { --mdc-icon-size: 22px; color: var(--secondary-text-color); }
      .player.active ha-icon { color: #ec4899; }
      .player-info { flex: 1; }
      .player-name { font-size: 14px; font-weight: 500; color: var(--primary-text-color); }
      .player-state { font-size: 12px; color: var(--secondary-text-color); }
      .player-actions { display: flex; gap: 4px; }
      .action-btn { background: none; border: none; color: var(--secondary-text-color); cursor: pointer; padding: 4px; border-radius: 6px; }
      .action-btn:hover { background: rgba(255,255,255,0.1); color: var(--primary-text-color); }
      .action-btn ha-icon { --mdc-icon-size: 18px; }
      .favorites-title { font-size: 13px; font-weight: 600; color: var(--secondary-text-color); padding: 8px 16px 4px; }
      .favorites { display: flex; gap: 8px; padding: 4px 16px 12px; flex-wrap: wrap; }
      .fav-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); color: var(--primary-text-color); cursor: pointer; font-size: 12px; transition: all 0.2s; }
      .fav-btn:hover { background: rgba(236,72,153,0.1); border-color: rgba(236,72,153,0.2); }
      .fav-btn ha-icon { --mdc-icon-size: 16px; }
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'ha-media-hub-card': MediaHubCard; } }
