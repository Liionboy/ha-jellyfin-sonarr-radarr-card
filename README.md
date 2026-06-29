# HA Media Hub Card

A Home Assistant Lovelace card for Jellyfin, Sonarr, and Radarr.

It is designed to show media-library status at a glance, plus a raw attributes view for debugging or advanced dashboards.

## What it does

- Groups entities by service: `jellyfin`, `sonarr`, `radarr`
- Reads entity state and selected attributes directly from Home Assistant
- Can show a raw JSON dump of the configured entities
- Works as a HACS custom card

## Installation

### HACS

1. Add this repository to HACS as a custom repository.
2. Install the card.
3. Add the Lovelace resource:

```yaml
url: /hacsfiles/ha-media-hub-card/ha-media-hub-card.js
type: module
```

HACS may offer to add the resource automatically, depending on your setup and Home Assistant version. If it does, accept it. If not, add the resource manually as shown above.

### Manual

If you are not using HACS, add the file to your Home Assistant frontend resources:

```yaml
url: /local/ha-media-hub-card.js
type: module
```

## Example

```yaml
type: custom:ha-media-hub-card
title: Media Hub
show_raw_attributes: true
entities:
  jellyfin:
    - media_player.jellyfin
  sonarr:
    - sensor.sonarr_queue
    - sensor.sonarr_upcoming
  radarr:
    - sensor.radarr_queue
    - sensor.radarr_upcoming
```

## Configuration

| Key | Type | Description |
|---|---|---|
| `title` | string | Card title |
| `show_raw_attributes` | boolean | Show the raw entity payload |
| `entities` | object | Groups of entity IDs by service |
| `attr_keys` | array | Which attributes to surface in the compact view |

## Development

The card is shipped as a plain JavaScript module, so there is no build step for the first version.

Files of interest:

- `ha-media-hub-card.js` - HACS entrypoint
- `src/ha-media-hub-card.js` - card implementation

## License

MIT
