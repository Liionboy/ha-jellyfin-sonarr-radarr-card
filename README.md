# HA Media Hub Card

A Home Assistant Lovelace card for Jellyfin, Sonarr, and Radarr.

## Features

- Shows grouped status for media services
- Reads entity state and selected attributes from Home Assistant
- Supports a raw attributes view for debugging
- Works as a HACS custom card

## Install

1. Add this repository to HACS as a custom repository.
2. Install the card.
3. Add the resource to Lovelace:

```yaml
url: /hacsfiles/ha-media-hub-card/ha-media-hub-card.js
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
