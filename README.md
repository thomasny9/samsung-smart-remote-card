# Samsung Smart Remote Card

Samsung-style Lovelace remote card for Home Assistant. Companion frontend for the Samsung Smart Remote integration.

## Features

- Samsung-style responsive remote layout
- Power state indication for normal viewing, Art Mode, off and unknown
- Volume/mute through the TV or an optional external media-player entity
- Direction pad, Back, Home, Play and Pause
- Up to four configurable Samsung app shortcuts
- Graphical card editor and YAML configuration

## Installation with HACS

Add this repository to HACS as a custom **Dashboard** repository and install **Samsung Smart Remote Card**. HACS manages the frontend file/resource; you no longer need to maintain `/config/www/samsung-smart-remote-card/` manually for the HACS-installed copy.

Install the companion **Samsung Smart Remote** integration separately through its HACS integration repository.

## Card configuration

Add the card from the dashboard editor and select the Samsung `remote` entity. Optionally select an external media-player entity for volume/mute and configure app shortcuts in the graphical editor.

Existing YAML configurations remain supported.
