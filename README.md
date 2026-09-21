# Samsung Smart Remote Card

Samsung-style Lovelace remote card for Home Assistant. Companion frontend for the Samsung Smart Remote integration.

**Current stable version: v0.0.14**

The v0.0.14 card has been validated both on an existing Home Assistant installation and through a clean HACS installation on a second Home Assistant installation.

## Features

- Samsung-style responsive remote layout
- Power state indication for normal viewing, Art Mode, off and unknown
- Volume/mute through the TV or an optional external media-player entity
- Direction pad, Back, Home, Play and Pause
- Up to four configurable Samsung app shortcuts
- Presets for YouTube TV, Apple TV, Netflix and Prime Video
- Custom Samsung app ID shortcuts
- Graphical card editor and YAML configuration
- Responsive layout suitable for desktop and the Home Assistant mobile app

## Installation with HACS

1. In HACS, add this repository as a custom **Dashboard** repository.
2. Install **Samsung Smart Remote Card**.
3. Reload Home Assistant's frontend if prompted.
4. Add the card from the dashboard editor and select the Samsung `remote` entity.

HACS manages the frontend file/resource; you no longer need to maintain `/config/www/samsung-smart-remote-card/` manually for the HACS-installed copy.

Install the companion **Samsung Smart Remote** integration separately through its HACS integration repository.

## Card configuration

Add the card from the dashboard editor and select the Samsung `remote` entity. Optionally select an external media-player entity for volume/mute and configure up to four app shortcuts in the graphical editor.

Existing YAML configurations remain supported.

## Power indication

The power button reflects the TV Mode sensor supplied by the companion integration:

- White — normal viewing
- Blue — Frame Art Mode
- Red — fully off
- Gray — unknown or unavailable

## App shortcuts

The card includes configurable presets for YouTube TV, Apple TV, Netflix and Prime Video. A custom shortcut can also be configured with a friendly button name and Samsung application ID.

Samsung application IDs and app availability can vary by television generation, Tizen version and region.
