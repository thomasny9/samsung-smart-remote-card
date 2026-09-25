class SamsungSmartRemoteCardEditor extends HTMLElement {

  constructor() {
    super();
    this._appPresets = [
      { value: "none", name: "None" },
      { value: "youtube_tv", name: "YouTube TV", app_id: "3201707014489" },
      { value: "apple_tv", name: "Apple TV", app_id: "3201807016597" },
      { value: "netflix", name: "Netflix", app_id: "3201907018807" },
      { value: "prime_video", name: "Prime Video", app_id: "3201910019365" },
      { value: "custom", name: "Custom App" }
    ];
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _defaultShortcuts() {
    return [
      { name: "YouTube TV", app_id: "3201707014489" },
      { name: "Apple TV", app_id: "3201807016597" },
      { name: "Netflix", app_id: "3201907018807" },
      { name: "Prime", app_id: "3201910019365" }
    ];
  }

  _getShortcuts() {
    if (Array.isArray(this._config.shortcuts)) {
      return this._config.shortcuts.map(item => ({ ...item }));
    }
    return this._defaultShortcuts();
  }

  _presetFor(shortcut) {
    if (!shortcut || !shortcut.app_id) return "none";
    const match = this._appPresets.find(
      preset => preset.app_id && preset.app_id === shortcut.app_id
    );
    return match ? match.value : "custom";
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  _render() {
    if (!this._hass || !this._config) return;

    const shortcuts = this._getShortcuts();
    while (shortcuts.length < 4) shortcuts.push({});

    const shortcutEditors = shortcuts.slice(0, 4).map((shortcut, index) => {
      const preset = this._presetFor(shortcut);
      const options = this._appPresets.map(item =>
        `<option value="${item.value}" ${item.value === preset ? "selected" : ""}>${item.name}</option>`
      ).join("");
      const custom = preset === "custom";
      return `
        <div class="shortcut-editor" data-shortcut-index="${index}">
          <div class="shortcut-title">Shortcut ${index + 1}</div>
          <select class="app-select">${options}</select>
          <div class="custom-fields ${custom ? "" : "hidden"}">
            <label>Button Name</label>
            <input class="custom-name" type="text" value="${this._escape(shortcut.name || "")}" placeholder="Plex">
            <label>Samsung App ID</label>
            <input class="custom-id" type="text" value="${this._escape(shortcut.app_id || "")}" placeholder="Samsung application ID">
          </div>
        </div>`;
    }).join("");

    this.innerHTML = `
      <div class="editor">
        <div class="editor-heading">Samsung Smart Remote</div>
        <div class="editor-description">
          Select the Samsung TV remote and, if used, an external sound media player.
        </div>

        <ha-entity-picker class="tv-picker" label="Samsung TV Remote" allow-custom-entity></ha-entity-picker>
        <ha-entity-picker class="sound-picker" label="External Sound Entity (Optional)" allow-custom-entity></ha-entity-picker>

        <div class="section-heading">App Shortcuts</div>
        <div class="editor-description">
          Choose up to four Samsung native apps. Select None to hide a shortcut or Custom App to enter another Samsung app ID.
        </div>
        ${shortcutEditors}
      </div>

      <style>
        .editor { padding: 16px 0 8px; }
        .editor-heading { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
        .section-heading { font-size: 15px; font-weight: 600; margin: 22px 0 6px; }
        .editor-description { color: var(--secondary-text-color); font-size: 13px; line-height: 1.4; margin-bottom: 18px; }
        ha-entity-picker { display: block; margin-bottom: 16px; }
        .shortcut-editor { padding: 12px; margin-bottom: 12px; border: 1px solid var(--divider-color); border-radius: 10px; }
        .shortcut-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
        select, input { box-sizing: border-box; width: 100%; min-height: 44px; padding: 9px 10px; border: 1px solid var(--divider-color); border-radius: 6px; background: var(--card-background-color); color: var(--primary-text-color); font: inherit; }
        label { display: block; color: var(--secondary-text-color); font-size: 12px; margin: 11px 0 5px; }
        .hidden { display: none; }
      </style>`;

    const tvPicker = this.querySelector(".tv-picker");
    const soundPicker = this.querySelector(".sound-picker");

    if (tvPicker) {
      tvPicker.hass = this._hass;
      tvPicker.value = this._config.entity || "";
      tvPicker.includeDomains = ["remote"];
      tvPicker.addEventListener("value-changed", event => {
        this._updateConfig("entity", event.detail.value);
      });
    }

    if (soundPicker) {
      soundPicker.hass = this._hass;
      soundPicker.value = this._config.sound_entity || "";
      soundPicker.includeDomains = ["media_player"];
      soundPicker.addEventListener("value-changed", event => {
        this._updateConfig("sound_entity", event.detail.value);
      });
    }

    this.querySelectorAll(".shortcut-editor").forEach(editor => {
      const index = Number(editor.dataset.shortcutIndex);
      const select = editor.querySelector(".app-select");
      const nameInput = editor.querySelector(".custom-name");
      const idInput = editor.querySelector(".custom-id");

      select.addEventListener("change", () => {
        const preset = this._appPresets.find(item => item.value === select.value);
        if (!preset) return;
        if (preset.value === "none") {
          this._updateShortcut(index, {});
        } else if (preset.value === "custom") {
          this._updateShortcut(index, { name: nameInput.value || "Custom", app_id: idInput.value || "" });
        } else {
          this._updateShortcut(index, {
            name: preset.value === "prime_video" ? "Prime" : preset.name,
            app_id: preset.app_id
          });
        }
      });

      const saveCustom = () => {
        if (select.value !== "custom") return;
        this._updateShortcut(index, { name: nameInput.value || "Custom", app_id: idInput.value || "" }, false);
      };
      nameInput.addEventListener("change", saveCustom);
      idInput.addEventListener("change", saveCustom);
    });
  }

  _updateShortcut(index, value, rerender = true) {
    const shortcuts = this._getShortcuts();
    while (shortcuts.length < 4) shortcuts.push({});
    shortcuts[index] = value;
    this._config = { ...this._config, shortcuts: shortcuts.slice(0, 4) };
    this._fireConfigChanged();
    if (rerender) this._render();
  }

  _updateConfig(key, value) {
    const newConfig = { ...this._config };
    if (value === undefined || value === null || value === "") delete newConfig[key];
    else newConfig[key] = value;
    this._config = newConfig;
    this._fireConfigChanged();
  }

  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }
}

if (!customElements.get("samsung-smart-remote-card-editor")) {
  customElements.define("samsung-smart-remote-card-editor", SamsungSmartRemoteCardEditor);
}


/*
 * Samsung Smart Remote Card
 */

class SamsungSmartRemoteCard extends HTMLElement {

  static getConfigElement() {

    return document.createElement(
      "samsung-smart-remote-card-editor"
    );
  }


  static getStubConfig() {

    return {
      entity: ""
    };
  }


  _defaultShortcuts() {
    return [
      { name: "YouTube TV", app_id: "3201707014489" },
      { name: "Apple TV", app_id: "3201807016597" },
      { name: "Netflix", app_id: "3201907018807" },
      { name: "Prime", app_id: "3201910019365" }
    ];
  }

  _getConfiguredShortcuts() {
    const shortcuts = Array.isArray(this.config?.shortcuts)
      ? this.config.shortcuts
      : this._defaultShortcuts();

    return shortcuts
      .filter(item => item && item.app_id)
      .slice(0, 4);
  }

  _escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  _renderShortcutButtons() {
    const shortcuts = this._getConfiguredShortcuts();
    if (!shortcuts.length) return "";

    return `
      <div class="shortcut-row" style="grid-template-columns: repeat(${shortcuts.length}, 1fr);">
        ${shortcuts.map(shortcut => `
          <button
            class="shortcut"
            data-app-id="${this._escapeHtml(shortcut.app_id)}"
            aria-label="${this._escapeHtml(shortcut.name || "App")}">
            ${this._escapeHtml(shortcut.name || "App")}
          </button>
        `).join("")}
      </div>`;
  }


  setConfig(config) {

    if (!config.entity) {

      throw new Error(
        "You must define a Samsung TV remote entity"
      );
    }


    this.config = config;


    this.innerHTML = `
      <ha-card>

        <div class="remote-shell">


          <!-- TOP -->

          <div class="top-row">

            <button
              class="button circle power power-unknown"
              data-power-toggle
              aria-label="Power">

              <ha-icon icon="mdi:power"></ha-icon>

            </button>


            <button
              class="button circle"
              data-command="KEY_SOURCE"
              aria-label="Source">

              <ha-icon
                icon="mdi:video-input-hdmi">
              </ha-icon>

            </button>

          </div>



          <!-- VOL / MUTE / CHANNEL -->

          <div class="rocker-row">


            <!-- VOLUME -->

            <div class="rocker">

              <button
                class="button rocker-button rocker-top"
                data-audio-command="volume_up"
                aria-label="Volume Up">

                <ha-icon icon="mdi:plus"></ha-icon>

              </button>


              <div class="rocker-name">
                VOL
              </div>


              <button
                class="button rocker-button rocker-bottom"
                data-audio-command="volume_down"
                aria-label="Volume Down">

                <ha-icon icon="mdi:minus"></ha-icon>

              </button>

            </div>



            <!-- MUTE -->

            <button
              class="button circle mute"
              data-audio-command="mute"
              aria-label="Mute">

              <ha-icon
                icon="mdi:volume-mute">
              </ha-icon>

            </button>



            <!-- CHANNEL -->

            <div class="rocker">

              <button
                class="button rocker-button rocker-top"
                data-command="KEY_CHUP"
                aria-label="Channel Up">

                <ha-icon
                  icon="mdi:chevron-up">
                </ha-icon>

              </button>


              <div class="rocker-name">
                CH
              </div>


              <button
                class="button rocker-button rocker-bottom"
                data-command="KEY_CHDOWN"
                aria-label="Channel Down">

                <ha-icon
                  icon="mdi:chevron-down">
                </ha-icon>

              </button>

            </div>

          </div>



          <!-- D-PAD -->

          <div class="dpad">

            <button
              class="dpad-zone dpad-up"
              data-command="KEY_UP"
              aria-label="Up">

              <ha-icon
                icon="mdi:chevron-up">
              </ha-icon>

            </button>


            <button
              class="dpad-zone dpad-left"
              data-command="KEY_LEFT"
              aria-label="Left">

              <ha-icon
                icon="mdi:chevron-left">
              </ha-icon>

            </button>


            <button
              class="dpad-ok"
              data-command="KEY_ENTER"
              aria-label="OK">

              OK

            </button>


            <button
              class="dpad-zone dpad-right"
              data-command="KEY_RIGHT"
              aria-label="Right">

              <ha-icon
                icon="mdi:chevron-right">
              </ha-icon>

            </button>


            <button
              class="dpad-zone dpad-down"
              data-command="KEY_DOWN"
              aria-label="Down">

              <ha-icon
                icon="mdi:chevron-down">
              </ha-icon>

            </button>

          </div>



          <!-- FUNCTION BUTTONS -->

          <div class="function-row">

            <button
              class="button function"
              data-command="KEY_RETURN"
              aria-label="Back">

              <ha-icon
                icon="mdi:arrow-u-left-top">
              </ha-icon>

            </button>


            <button
              class="button function"
              data-command="KEY_HOME"
              aria-label="Home">

              <ha-icon
                icon="mdi:home-outline">
              </ha-icon>

            </button>


            <button
              class="button function"
              data-command="KEY_PLAY"
              aria-label="Play">

              <ha-icon
                icon="mdi:play">
              </ha-icon>

            </button>


            <button
              class="button function"
              data-command="KEY_PAUSE"
              aria-label="Pause">

              <ha-icon
                icon="mdi:pause">
              </ha-icon>

            </button>

          </div>



          <!-- APP SHORTCUTS -->

          ${this._renderShortcutButtons()}


          <div class="brand">
            SAMSUNG
          </div>

        </div>



        <style>

          ha-card {
            overflow: hidden;
            border-radius: 22px;
          }


          .remote-shell {

            box-sizing: border-box;

            width: 100%;
            max-width: 390px;

            margin: 0 auto;

            padding:
              28px
              clamp(18px, 7vw, 34px)
              22px;

            background:
              linear-gradient(
                145deg,
                #303030,
                #181818
              );

            color: white;

            display: flex;
            flex-direction: column;
            align-items: center;

            gap: 27px;
          }


          button {
            font-family: inherit;
          }


          .button,
          .dpad-zone,
          .dpad-ok,
          .shortcut {

            border: 0;

            color: white;

            cursor: pointer;

            user-select: none;
            -webkit-user-select: none;

            -webkit-tap-highlight-color:
              transparent;

            touch-action: manipulation;

            transition:
              transform 70ms ease,
              background 70ms ease,
              color 180ms ease,
              box-shadow 180ms ease;
          }


          .button {

            background:
              linear-gradient(
                145deg,
                #383838,
                #202020
              );

            box-shadow:
              0 2px 4px rgba(0,0,0,.35),
              inset 0 1px rgba(255,255,255,.06);
          }


          .button:active,
          .dpad-zone:active,
          .dpad-ok:active,
          .shortcut:active {

            transform: scale(.92);

            background: #4a4a4a;
          }


          ha-icon {
            --mdc-icon-size: 27px;
          }



          /*
           * TOP
           */

          .top-row {

            width: 100%;

            display: flex;

            justify-content:
              space-between;

            align-items: center;
          }


          .circle {

            width: 58px;
            height: 58px;

            border-radius: 50%;
          }



          /*
           * POWER INDICATOR
           *
           * WHITE = normal viewing
           * BLUE  = Art Mode
           * RED   = fully off
           * GRAY  = unknown / unavailable
           *
           * Standard Samsung TVs will normally
           * only use WHITE and RED.
           */

          .power {

            transition:
              transform 70ms ease,
              background 180ms ease,
              color 180ms ease,
              box-shadow 180ms ease;
          }


          .power-on {

            color: #ffffff;

            box-shadow:
              0 2px 4px rgba(0,0,0,.35),
              inset 0 1px rgba(255,255,255,.06);
          }


          .power-art {

            color: #42a5f5;

            box-shadow:
              0 2px 4px rgba(0,0,0,.35),
              0 0 10px rgba(66,165,245,.18),
              inset 0 1px rgba(255,255,255,.06);
          }


          .power-off {

            color: #ff5252;

            box-shadow:
              0 2px 4px rgba(0,0,0,.35),
              0 0 10px rgba(255,82,82,.14),
              inset 0 1px rgba(255,255,255,.06);
          }


          .power-unknown {

            color: #777777;

            box-shadow:
              0 2px 4px rgba(0,0,0,.35),
              inset 0 1px rgba(255,255,255,.04);
          }


          .power ha-icon {
            --mdc-icon-size: 29px;
          }



          /*
           * ROCKERS
           */

          .rocker-row {

            width: 100%;

            display: grid;

            grid-template-columns:
              58px
              58px
              58px;

            justify-content:
              space-between;

            align-items: center;
          }


          .rocker {

            width: 58px;
            height: 144px;

            display: grid;

            grid-template-rows:
              55px
              34px
              55px;
          }


          .rocker-button {
            width: 58px;
          }


          .rocker-top {

            border-radius:
              27px 27px 8px 8px;
          }


          .rocker-bottom {

            border-radius:
              8px 8px 27px 27px;
          }


          .rocker-name {

            display: flex;

            align-items: center;
            justify-content: center;

            background: #191919;

            color: #aaa;

            font-size: 10px;

            font-weight: 600;

            letter-spacing: 1.2px;
          }


          .mute {
            align-self: center;
          }


          /*
           * External audio mute indicator.
           */

          .mute.external-muted {

            color: #ff5252;

            box-shadow:
              0 2px 4px rgba(0,0,0,.35),
              0 0 10px rgba(255,82,82,.14),
              inset 0 1px rgba(255,255,255,.06);
          }



          /*
           * D-PAD
           */

          .dpad {

            position: relative;

            width: 224px;
            height: 224px;

            border-radius: 50%;

            background:
              linear-gradient(
                145deg,
                #383838,
                #1c1c1c
              );

            box-shadow:
              0 4px 10px rgba(0,0,0,.4),
              inset 0 1px rgba(255,255,255,.06);
          }


          .dpad-zone {

            position: absolute;

            background: transparent;

            display: flex;

            justify-content: center;

            align-items: center;
          }


          .dpad-zone ha-icon {
            --mdc-icon-size: 37px;
          }


          .dpad-up {

            width: 90px;
            height: 68px;

            top: 0;
            left: 67px;

            border-radius:
              40px 40px 12px 12px;
          }


          .dpad-down {

            width: 90px;
            height: 68px;

            bottom: 0;
            left: 67px;

            border-radius:
              12px 12px 40px 40px;
          }


          .dpad-left {

            width: 68px;
            height: 90px;

            left: 0;
            top: 67px;

            border-radius:
              40px 12px 12px 40px;
          }


          .dpad-right {

            width: 68px;
            height: 90px;

            right: 0;
            top: 67px;

            border-radius:
              12px 40px 40px 12px;
          }


          .dpad-ok {

            position: absolute;

            width: 86px;
            height: 86px;

            left: 69px;
            top: 69px;

            border-radius: 50%;

            background:
              linear-gradient(
                145deg,
                #444,
                #242424
              );

            box-shadow:
              0 2px 5px rgba(0,0,0,.4),
              inset 0 1px rgba(255,255,255,.08);

            font-size: 16px;
            font-weight: 600;
          }



          /*
           * FUNCTION BUTTONS
           */

          .function-row {

            width: 100%;

            display: grid;

            grid-template-columns:
              repeat(4, 54px);

            justify-content:
              space-between;
          }


          .function {

            width: 54px;
            height: 54px;

            border-radius: 50%;
          }


          .function ha-icon {
            --mdc-icon-size: 24px;
          }



          /*
           * APP SHORTCUTS
           */

          .shortcut-row {

            width: 100%;

            display: grid;

            grid-template-columns:
              repeat(4, 1fr);

            gap: 6px;
          }

          .shortcut {

            min-height: 42px;

            padding: 4px;

            box-sizing: border-box;

            border-radius: 8px;

            background: #242424;

            display: flex;

            align-items: center;
            justify-content: center;

            text-align: center;

            font-size: 10px;
            font-weight: 600;

            color: #ddd;

            border:
              1px solid rgba(255,255,255,.06);
          }



          /*
           * BRAND
           */

          .brand {

            color: #888;

            font-size: 12px;

            font-weight: 700;

            letter-spacing: 2.2px;

            margin-top: -4px;
          }



          /*
           * PHONE
           */

          @media (max-width: 350px) {

            .remote-shell {

              padding-left: 16px;
              padding-right: 16px;

              gap: 23px;
            }


            .dpad {

              width: 210px;
              height: 210px;
            }


            .dpad-up {
              left: 60px;
            }


            .dpad-down {
              left: 60px;
            }


            .dpad-left {
              top: 60px;
            }


            .dpad-right {
              top: 60px;
            }


            .dpad-ok {

              width: 82px;
              height: 82px;

              left: 64px;
              top: 64px;
            }

          }

        </style>

      </ha-card>
    `;



    /*
     * Standard Samsung commands.
     */

    this.querySelectorAll(
      "[data-command]"
    ).forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            this._sendCommand(
              button.dataset.command
            );

          }
        );

      }
    );



    /*
     * Audio controls.
     */

    this.querySelectorAll(
      "[data-audio-command]"
    ).forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            this._sendAudioCommand(
              button.dataset.audioCommand
            );

          }
        );

      }
    );



    /*
     * Power button.
     */

    const powerButton =
      this.querySelector(
        "[data-power-toggle]"
      );


    if (powerButton) {

      powerButton.addEventListener(
        "click",
        () => {

          this._togglePower();

        }
      );

    }



    /*
     * Samsung native application shortcuts.
     */

    this.querySelectorAll(
      "[data-app-id]"
    ).forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            this._launchApp(
              button.dataset.appId
            );

          }
        );

      }
    );


    this._updatePowerState();
    this._updateAudioState();
  }



  set hass(hass) {

    this._hass = hass;

    this._updatePowerState();
    this._updateAudioState();
  }



  /*
   * Locate the TV Mode sensor belonging to
   * the configured Samsung remote.
   */

  _findModeEntity() {

    if (
      !this._hass ||
      !this.config
    ) {
      return null;
    }


    for (
      const [entityId, state]
      of Object.entries(
        this._hass.states
      )
    ) {

      if (
        !entityId.startsWith(
          "sensor."
        )
      ) {
        continue;
      }


      if (
        state.attributes &&
        state.attributes.source_entity ===
          this.config.entity &&
        entityId.endsWith(
          "_tv_mode"
        )
      ) {

        return state;
      }

    }


    return null;
  }



  /*
   * Return current Samsung TV mode.
   */

  _getPowerMode() {

    const modeState =
      this._findModeEntity();


    if (!modeState) {
      return "unknown";
    }


    if (
      modeState.state === "on" ||
      modeState.state === "art" ||
      modeState.state === "off"
    ) {

      return modeState.state;
    }


    return "unknown";
  }



  /*
   * Determine whether this Samsung television
   * actually supports Samsung Art Mode.
   *
   * This comes from our companion integration's
   * TV Mode sensor.
   */

  _isArtModeSupported() {

    const modeState =
      this._findModeEntity();


    if (!modeState) {
      return false;
    }


    return (
      modeState.attributes
        .art_mode_supported === true
    );
  }



  /*
   * Update power button color.
   *
   * WHITE = ON
   * BLUE  = ART
   * RED   = OFF
   * GRAY  = UNKNOWN
   */

  _updatePowerState() {

    if (
      !this._hass ||
      !this.config
    ) {
      return;
    }


    const powerButton =
      this.querySelector(
        ".power"
      );


    if (!powerButton) {
      return;
    }


    const powerMode =
      this._getPowerMode();


    powerButton.classList.remove(
      "power-on",
      "power-art",
      "power-off",
      "power-unknown"
    );


    powerButton.classList.add(
      `power-${powerMode}`
    );


    if (
      powerMode === "on"
    ) {

      powerButton.setAttribute(
        "aria-label",
        "Power — TV on"
      );

      powerButton.title =
        "TV On";

    } else if (
      powerMode === "art"
    ) {

      powerButton.setAttribute(
        "aria-label",
        "Power — Art Mode"
      );

      powerButton.title =
        "Art Mode";

    } else if (
      powerMode === "off"
    ) {

      powerButton.setAttribute(
        "aria-label",
        "Power — TV off"
      );

      powerButton.title =
        "TV Off";

    } else {

      powerButton.setAttribute(
        "aria-label",
        "Power — state unknown"
      );

      powerButton.title =
        "State Unknown";
    }
  }



  /*
   * External audio state.
   */

  _updateAudioState() {

    if (
      !this._hass ||
      !this.config
    ) {
      return;
    }


    const muteButton =
      this.querySelector(
        ".mute"
      );


    if (!muteButton) {
      return;
    }


    muteButton.classList.remove(
      "external-muted"
    );


    if (
      !this.config.sound_entity
    ) {
      return;
    }


    const soundState =
      this._hass.states[
        this.config.sound_entity
      ];


    if (!soundState) {
      return;
    }


    if (
      soundState.attributes
        .is_volume_muted === true
    ) {

      muteButton.classList.add(
        "external-muted"
      );

    }
  }



  /*
   * POWER CONTROL
   *
   * FRAME:
   *
   * ON  -> short KEY_POWER -> ART
   * ART -> short KEY_POWER -> ON
   * OFF -> backend WOL -> ART
   *
   *
   * STANDARD SAMSUNG:
   *
   * ON  -> backend -> OFF
   * OFF -> backend WOL -> ON
   */

  _togglePower() {

    if (!this._hass) {
      return;
    }


    const powerMode =
      this._getPowerMode();


    const artModeSupported =
      this._isArtModeSupported();



    /*
     * SAMSUNG FRAME
     */

    if (artModeSupported) {


      /*
       * Frame currently ON or in ART.
       *
       * A short Samsung Power command toggles
       * between normal viewing and Art Mode.
       */

      if (
        powerMode === "on" ||
        powerMode === "art"
      ) {

        this._sendCommand(
          "KEY_POWER"
        );

        return;
      }



      /*
       * Frame is fully OFF.
       *
       * Ask backend for ART.
       * Backend performs WOL and the Frame
       * naturally wakes into Art Mode.
       */

      if (
        powerMode === "off"
      ) {

        this._hass.callService(
          "samsung_smart_remote",
          "set_mode",
          {
            entity_id:
              this.config.entity,

            mode:
              "art"
          }
        );

        return;
      }

    }



    /*
     * STANDARD SAMSUNG TV
     */

    else {


      /*
       * Standard TV currently ON.
       *
       * Fully shut down.
       */

      if (
        powerMode === "on"
      ) {

        this._hass.callService(
          "samsung_smart_remote",
          "set_mode",
          {
            entity_id:
              this.config.entity,

            mode:
              "off"
          }
        );

        return;
      }



      /*
       * Standard TV currently OFF.
       *
       * Wake it and request normal viewing.
       */

      if (
        powerMode === "off"
      ) {

        this._hass.callService(
          "samsung_smart_remote",
          "set_mode",
          {
            entity_id:
              this.config.entity,

            mode:
              "on"
          }
        );

        return;
      }

    }



    /*
     * Never blindly toggle a TV when
     * its state is unknown.
     */

    console.warn(
      "Samsung Smart Remote: " +
      "TV power state is unknown; " +
      "Power command not sent."
    );
  }



  /*
   * AUDIO CONTROL
   *
   * If sound_entity is configured,
   * volume and mute are sent to that
   * Home Assistant media player.
   *
   * Otherwise the Samsung TV receives
   * normal KEY_VOLUP / KEY_VOLDOWN /
   * KEY_MUTE commands.
   */

  _sendAudioCommand(command) {

    if (!this._hass) {
      return;
    }



    /*
     * NO EXTERNAL AUDIO
     */

    if (
      !this.config.sound_entity
    ) {

      if (
        command === "volume_up"
      ) {

        this._sendCommand(
          "KEY_VOLUP"
        );

        return;
      }


      if (
        command === "volume_down"
      ) {

        this._sendCommand(
          "KEY_VOLDOWN"
        );

        return;
      }


      if (
        command === "mute"
      ) {

        this._sendCommand(
          "KEY_MUTE"
        );

        return;
      }

    }



    /*
     * EXTERNAL AUDIO
     */

    const soundEntity =
      this.config.sound_entity;



    /*
     * Volume Up
     */

    if (
      command === "volume_up"
    ) {

      this._hass.callService(
        "media_player",
        "volume_up",
        {
          entity_id:
            soundEntity
        }
      );

      return;
    }



    /*
     * Volume Down
     */

    if (
      command === "volume_down"
    ) {

      this._hass.callService(
        "media_player",
        "volume_down",
        {
          entity_id:
            soundEntity
        }
      );

      return;
    }



    /*
     * Mute / Unmute
     */

    if (
      command === "mute"
    ) {

      const soundState =
        this._hass.states[
          soundEntity
        ];


      if (!soundState) {

        console.warn(
          "Samsung Smart Remote: " +
          "external sound entity not found: " +
          soundEntity
        );

        return;
      }


      const currentMute =
        soundState.attributes
          .is_volume_muted;


      if (
        typeof currentMute !==
        "boolean"
      ) {

        console.warn(
          "Samsung Smart Remote: " +
          soundEntity +
          " does not expose is_volume_muted."
        );

        return;
      }


      this._hass.callService(
        "media_player",
        "volume_mute",
        {
          entity_id:
            soundEntity,

          is_volume_muted:
            !currentMute
        }
      );
    }
  }



  /*
   * Send standard Samsung remote command
   * through Home Assistant's native
   * remote entity.
   */

  _sendCommand(command) {

    if (!this._hass) {
      return;
    }


    this._hass.callService(
      "remote",
      "send_command",
      {
        entity_id:
          this.config.entity,

        command:
          command
      }
    );
  }



  /*
   * Launch Samsung native application
   * through companion backend.
   */

  _launchApp(appId) {

    if (!this._hass) {
      return;
    }


    this._hass.callService(
      "samsung_smart_remote",
      "launch_app",
      {
        entity_id:
          this.config.entity,

        app_id:
          appId
      }
    );
  }



  getCardSize() {
    return 10;
  }

}



/*
 * Register card.
 */

if (
  !customElements.get(
    "samsung-smart-remote-card"
  )
) {

  customElements.define(
    "samsung-smart-remote-card",
    SamsungSmartRemoteCard
  );
}



/*
 * Register visual editor.
 */

if (
  !customElements.get(
    "samsung-smart-remote-card-editor"
  )
) {

  customElements.define(
    "samsung-smart-remote-card-editor",
    SamsungSmartRemoteCardEditor
  );
}



/*
 * Register with Home Assistant's
 * custom-card picker.
 */

window.customCards =
  window.customCards || [];


if (
  !window.customCards.some(
    card =>
      card.type ===
      "samsung-smart-remote-card"
  )
) {

  window.customCards.push({

    type:
      "samsung-smart-remote-card",

    name:
      "Samsung Smart Remote Card",

    description:
      "Local Samsung TV remote with Frame Art Mode, optional external audio, and configurable app shortcuts"

  });
}



console.info(
  "Samsung Smart Remote Card v0.0.15 loaded"
);