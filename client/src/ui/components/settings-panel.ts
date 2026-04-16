import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import { THEMES, applyTheme } from '../styles/themes.js';
import { getAvailableDeckStyles, getCurrentDeckStyle, setDeckStyle, type DeckStyleInfo } from './card-art-registry.js';
import type { AppServices } from '../../app/composition-root.js';

const FONT_OPTIONS = [
    { id: 'Palatino', label: 'Palatino', family: "'Palatino Linotype', Palatino, Georgia, serif" },
    { id: 'Garamond', label: 'Garamond', family: "'EB Garamond', Garamond, serif" },
    { id: 'Cinzel', label: 'Cinzel', family: "Cinzel, serif" },
    { id: 'Helvetica', label: 'Helvetica', family: "Helvetica, 'Helvetica Neue', Arial, sans-serif" },
    { id: 'Philosopher', label: 'Philosopher', family: "Philosopher, serif" },
] as const;

const FONT_SIZE_OPTIONS = [
    { id: 'small', label: 'S', value: '0.85em' },
    { id: 'medium', label: 'M', value: '1em' },
    { id: 'large', label: 'L', value: '1.15em' },
    { id: 'xlarge', label: 'XL', value: '1.3em' },
] as const;

const SPEED_STEPS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

/**
 * Settings panel — language, tone, theme, voice, speed, font, profile.
 */
@customElement('settings-panel')
export class SettingsPanel extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            .settings-container {
                display: flex;
                flex-direction: column;
                gap: 1.2em;
                padding-top: 0.5em;
            }

            .settings-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .section-label {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 0.9em;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                margin-bottom: 0.5em;
            }

            .option-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 0.5em;
            }

            .option-btn {
                padding: 0.6em 0.8em;
                border: 1px solid var(--border);
                border-radius: 8px;
                background: transparent;
                color: var(--text-dim);
                font-family: var(--font-body);
                font-size: 0.85em;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
            }

            .option-btn:hover {
                border-color: var(--gold-dim);
                color: var(--text);
            }

            .option-btn.selected {
                border-color: var(--gold);
                background: var(--purple-dim);
                color: var(--gold);
            }

            .profile-field {
                display: flex;
                flex-direction: column;
                gap: 0.3em;
            }

            .profile-field label {
                font-size: 0.8em;
                color: var(--text-dim);
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }

            .profile-input {
                padding: 0.6em 0.8em;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 6px;
                color: var(--text);
                font-family: var(--font-body);
                font-size: 0.9em;
                outline: none;
            }

            .profile-input:focus {
                border-color: var(--gold-dim);
            }

            .profile-input::placeholder {
                color: var(--text-faint);
            }

            .theme-preview {
                display: flex;
                gap: 0.5em;
            }

            .speed-slider-wrap {
                display: flex;
                flex-direction: column;
                gap: 0.7em;
            }

            .speed-slider {
                width: 100%;
                accent-color: var(--gold);
            }

            .speed-scale {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 0.35em;
                font-size: 0.72em;
                color: var(--text-faint);
            }

            .speed-scale span {
                text-align: center;
            }

            .speed-current {
                color: var(--gold);
                font-family: var(--font-display);
                font-size: 0.92em;
            }

            .theme-swatch {
                width: 44px;
                height: 44px;
                border-radius: 8px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: border-color 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7em;
                color: white;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }

            .theme-swatch.selected {
                border-color: var(--gold);
            }

            /* ── Font picker ── */
            .font-list {
                display: flex;
                flex-direction: column;
                gap: 0.4em;
            }

            .font-option {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.5em 0.7em;
                border: 1px solid var(--border);
                border-radius: 8px;
                background: transparent;
                cursor: pointer;
                transition: all 0.15s;
            }

            .font-option:hover {
                border-color: var(--gold-dim);
            }

            .font-option.selected {
                border-color: var(--gold);
                background: var(--purple-dim);
            }

            .font-label {
                font-size: 0.75em;
                color: var(--text-dim);
                letter-spacing: 0.08em;
                font-family: var(--font-display);
            }

            .font-sample {
                font-size: 1em;
                color: var(--text-dim);
                transition: color 0.2s;
            }

            .font-option.selected .font-sample {
                color: var(--gold);
            }

            .font-check {
                font-size: 0.75em;
                color: var(--gold);
            }

            .font-preview {
                margin-top: 0.5em;
                padding: 0.6em 0.8em;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 8px;
            }

            .font-preview-label {
                font-size: 0.7em;
                color: var(--text-faint);
                margin-bottom: 0.3em;
                font-family: var(--font-display);
            }

            .font-preview-text {
                font-size: 0.9em;
                color: var(--text);
                font-style: italic;
                line-height: 1.6;
            }

            /* ── Footer ── */
            .version-footer {
                text-align: center;
                color: var(--text-faint);
                font-size: 0.8em;
                padding-top: 1em;
                border-top: 1px solid var(--border);
                line-height: 1.8;
            }

            .coffee-support {
                color: var(--gold);
                text-decoration: none;
                cursor: pointer;
            }

            .coffee-support:hover {
                text-decoration: underline;
            }
        `,
    ];

    @property({ attribute: false }) services!: AppServices;

    @state() private _language = 'ENG';
    @state() private _tone = 'Mystical';
    @state() private _theme = 'dusk';
    @state() private _name = '';
    @state() private _voice = 'Female';
    @state() private _noReversedCards = false;
    @state() private _muted = false;
    @state() private _ttsProvider: 'browser' | 'piper' = 'browser';
    @state() private _speed = 1.0;
    @state() private _font = 'Palatino';
    @state() private _deckStyle = 'classic';
    @state() private _deckStyles: DeckStyleInfo[] = [];
    @state() private _italic = true;
    @state() private _fontSize = 'medium';

    override connectedCallback(): void {
        super.connectedCallback();
        if (this.services) {
            const uc = this.services.userContext;
            this._language = uc.language ?? 'ENG';
            this._tone = uc.tone ?? 'Mystical';
            this._name = uc.name ?? '';
            this._theme = localStorage.getItem('tarot-theme') ?? 'dusk';
            this._speed = parseFloat(localStorage.getItem('tarot-tts-speed') ?? '1.0');
            this._font = localStorage.getItem('tarot-font') ?? 'Palatino';
            this._deckStyle = getCurrentDeckStyle();
            this._deckStyles = getAvailableDeckStyles();
            this._italic = (localStorage.getItem('tarot-italic') ?? 'true') === 'true';
            this._fontSize = localStorage.getItem('tarot-font-size') ?? 'medium';
            this._noReversedCards = uc.noReversedCards;
            this._muted = uc.muted;
            this._voice = this._voiceLabelFromPreference(uc.voicePreference);
            this._ttsProvider = uc.ttsProvider;
        }
    }

    override render() {
        const speedLabel = `${Number(this._speed).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}×`;

        return html`
            <div class="settings-container">
                <div class="settings-header">
                    <span class="display-text" style="font-size:1.2em">Settings</span>
                    <button class="btn btn-ghost" @click=${this._close}>✕</button>
                </div>

                <!-- Language -->
                <div class="panel">
                    <div class="section-label">Language</div>
                    <div class="option-grid">
                        ${this.services?.config.languages.map(lang => html`
                            <button
                                class="option-btn ${this._language === lang.code ? 'selected' : ''}"
                                @click=${() => this._setLanguage(lang.code)}
                            >${lang.label}</button>
                        `)}
                    </div>
                </div>

                <!-- Tone -->
                <div class="panel">
                    <div class="section-label">Tone</div>
                    <div class="option-grid">
                        ${this.services?.config.tones.map(tone => html`
                            <button
                                class="option-btn ${this._tone === tone ? 'selected' : ''}"
                                @click=${() => this._setTone(tone)}
                            >${tone}</button>
                        `)}
                    </div>
                </div>

                <!-- Theme -->
                <div class="panel">
                    <div class="section-label">Theme</div>
                    <div class="theme-preview">
                        ${THEMES.map(theme => html`
                            <div
                                class="theme-swatch ${this._theme === theme.id ? 'selected' : ''}"
                                style="background: ${theme.vars['--bg']}; border-color: ${this._theme === theme.id ? theme.vars['--gold'] : 'transparent'}"
                                @click=${() => this._setTheme(theme.id)}
                                title=${theme.label}
                            >
                                <span style="color: ${theme.vars['--gold']}">${theme.label.charAt(0)}</span>
                            </div>
                        `)}
                    </div>
                </div>

                <!-- Deck Style -->
                <div class="panel">
                    <div class="section-label">Card Deck</div>
                    <div class="option-grid">
                        ${this._deckStyles.map(d => html`
                            <button
                                class="option-btn ${this._deckStyle === d.id ? 'selected' : ''}"
                                @click=${() => this._setDeckStyle(d.id)}
                                title=${d.description}
                            >${d.label}</button>
                        `)}
                    </div>
                </div>

                <div class="panel">
                    <div class="section-label">Card Orientation</div>
                    <div class="option-grid">
                        <button
                            class="option-btn ${!this._noReversedCards ? 'selected' : ''}"
                            @click=${() => this._setNoReversedCards(false)}
                        >Allow Reversed</button>
                        <button
                            class="option-btn ${this._noReversedCards ? 'selected' : ''}"
                            @click=${() => this._setNoReversedCards(true)}
                        >No Reversed Cards</button>
                    </div>
                </div>

                <div class="panel">
                    <div class="section-label">Sound</div>
                    <div class="option-grid">
                        <button
                            class="option-btn ${!this._muted ? 'selected' : ''}"
                            @click=${() => this._setMuted(false)}
                        >Sound On</button>
                        <button
                            class="option-btn ${this._muted ? 'selected' : ''}"
                            @click=${() => this._setMuted(true)}
                        >Mute All</button>
                    </div>
                </div>

                <!-- Voice -->
                <div class="panel">
                    <div class="section-label">TTS Engine</div>
                    <div class="option-grid">
                        ${([
                            { id: 'browser', label: 'Browser' },
                            { id: 'piper', label: 'Piper' },
                        ] as const).map(option => html`
                            <button
                                class="option-btn ${this._ttsProvider === option.id ? 'selected' : ''}"
                                @click=${() => this._setTtsProvider(option.id)}
                            >${option.label}</button>
                        `)}
                    </div>
                </div>

                <div class="panel">
                    <div class="section-label">Voice</div>
                    <div class="option-grid">
                        ${(['Female', 'Male', 'Off'] as const).map(v => html`
                            <button
                                class="option-btn ${this._voice === v ? 'selected' : ''}"
                                @click=${() => this._setVoice(v)}
                            >${v}</button>
                        `)}
                    </div>
                </div>

                <!-- Speed -->
                <div class="panel">
                    <div class="section-label">Speed</div>
                    <div class="speed-slider-wrap">
                        <div class="speed-current">${speedLabel}</div>
                        <input
                            class="speed-slider"
                            type="range"
                            min="0.75"
                            max="2"
                            step="0.25"
                            .value=${String(this._speed)}
                            @input=${(e: InputEvent) => this._setSpeed((e.target as HTMLInputElement).value)}
                        />
                        <div class="speed-scale">
                            ${SPEED_STEPS.map(step => html`<span>${step}×</span>`)}
                        </div>
                    </div>
                </div>

                <!-- Reading Font -->
                <div class="panel">
                    <div class="section-label">Reading Font</div>
                    <div class="font-list">
                        ${FONT_OPTIONS.map(f => html`
                            <div
                                class="font-option ${this._font === f.id ? 'selected' : ''}"
                                @click=${() => this._setFont(f.id)}
                            >
                                <span class="font-label">${f.label}</span>
                                <span class="font-sample" style="font-family: ${f.family}">The Oracle</span>
                                ${this._font === f.id ? html`<span class="font-check">✓</span>` : ''}
                            </div>
                        `)}
                    </div>
                    <div style="display:flex; gap:0.5em; margin-top:0.5em; align-items:center;">
                        <button
                            class="option-btn ${this._italic ? 'selected' : ''}"
                            style="flex:0 0 auto;"
                            @click=${() => this._setItalic(!this._italic)}
                        ><em>Italic</em></button>
                        <span style="color:var(--text-dim);font-size:0.75em;margin-left:0.3em;">Size:</span>
                        ${FONT_SIZE_OPTIONS.map(s => html`
                            <button
                                class="option-btn ${this._fontSize === s.id ? 'selected' : ''}"
                                style="flex:0 0 auto; min-width:36px; padding:0.4em 0.5em; font-size:0.8em;"
                                @click=${() => this._setFontSize(s.id)}
                            >${s.label}</button>
                        `)}
                    </div>
                    <div class="font-preview">
                        <div class="font-preview-label">preview:</div>
                        <div class="font-preview-text" style="font-family: ${this._currentFontFamily}; font-style: ${this._italic ? 'italic' : 'normal'}; font-size: ${this._currentFontSize}">
                            The cards whisper of change and transformation…
                        </div>
                    </div>
                </div>

                <!-- Profile -->
                <div class="panel">
                    <div class="section-label">Profile</div>
                    <div class="stack gap-sm">
                        <div class="profile-field">
                            <label>Your Name</label>
                            <input
                                class="profile-input"
                                type="text"
                                placeholder="Optional — helps personalize readings"
                                .value=${this._name}
                                @change=${(e: Event) => this._setName((e.target as HTMLInputElement).value)}
                            />
                        </div>
                    </div>
                </div>

                <div class="version-footer">
                    Tarot Oracle v${this.services?.config.version ?? '?.?.?'}<br>
                    <a class="coffee-support"
                       href="https://buymeacoffee.com/tsygankov9"
                       target="_blank"
                       rel="noopener">☕ Support</a>
                </div>
            </div>
        `;
    }

    private get _currentFontFamily(): string {
        return FONT_OPTIONS.find(f => f.id === this._font)?.family ?? FONT_OPTIONS[0].family;
    }

    private get _currentFontSize(): string {
        return FONT_SIZE_OPTIONS.find(s => s.id === this._fontSize)?.value ?? '1em';
    }

    private _setLanguage(code: string): void {
        this._language = code;
        if (this.services) {
            this.services.userContext.language = code;
            this._syncVoiceSelection();
            this.services.userContext.save();
            this.dispatchEvent(new CustomEvent('language-changed', { bubbles: true, composed: true }));
        }
    }

    private _setTone(tone: string): void {
        this._tone = tone;
        if (this.services) {
            this.services.userContext.tone = tone;
            this.services.userContext.save();
            this.dispatchEvent(new CustomEvent('tone-changed', { bubbles: true, composed: true }));
        }
    }

    private _setTheme(themeId: string): void {
        this._theme = themeId;
        applyTheme(themeId);
    }

    private _setVoice(voice: string): void {
        this._voice = voice;
        if (this.services) {
            this.services.userContext.voicePreference = this._voicePreferenceFromLabel(voice);
            this._syncVoiceSelection();
            this.services.userContext.save();
        }
    }

    private _setTtsProvider(provider: 'browser' | 'piper'): void {
        this._ttsProvider = provider;
        if (this.services) {
            this.services.userContext.ttsProvider = provider;
            this.services.userContext.save();
        }
    }

    private _setNoReversedCards(enabled: boolean): void {
        this._noReversedCards = enabled;
        if (this.services) {
            this.services.userContext.noReversedCards = enabled;
            this.services.userContext.save();
            this.dispatchEvent(new CustomEvent('reading-options-changed', { bubbles: true, composed: true }));
        }
    }

    private async _setMuted(enabled: boolean): Promise<void> {
        this._muted = enabled;
        if (this.services) {
            this.services.userContext.muted = enabled;
            this.services.userContext.save();
            if (enabled) {
                this.services.speechService.stop();
            }
            await this.services.audioCueService.syncSettings();
            this.dispatchEvent(new CustomEvent('audio-settings-changed', { bubbles: true, composed: true }));
        }
    }

    private _setSpeed(rawValue: string): void {
        const parsed = parseFloat(rawValue);
        const value = Number.isFinite(parsed) ? Math.min(2, Math.max(0.75, parsed)) : 1.0;
        this._speed = value;
        localStorage.setItem('tarot-tts-speed', value.toFixed(2));
    }

    private _setFont(fontId: string): void {
        this._font = fontId;
        localStorage.setItem('tarot-font', fontId);
        // Apply font to body for reading text
        const font = FONT_OPTIONS.find(f => f.id === fontId);
        if (font) {
            document.documentElement.style.setProperty('--font-reading', font.family);
        }
    }

    private _setItalic(italic: boolean): void {
        this._italic = italic;
        localStorage.setItem('tarot-italic', String(italic));
        document.documentElement.style.setProperty('--font-reading-style', italic ? 'italic' : 'normal');
    }

    private _setFontSize(sizeId: string): void {
        this._fontSize = sizeId;
        localStorage.setItem('tarot-font-size', sizeId);
        const value = FONT_SIZE_OPTIONS.find(s => s.id === sizeId)?.value ?? '1em';
        document.documentElement.style.setProperty('--font-reading-size', value);
    }

    private async _setDeckStyle(styleId: string): Promise<void> {
        this._deckStyle = styleId;
        await setDeckStyle(styleId);
    }

    private _setName(name: string): void {
        this._name = name;
        if (this.services) {
            this.services.userContext.name = name || null;
            this.services.userContext.save();
        }
    }

    private _close(): void {
        this.dispatchEvent(new CustomEvent('close'));
    }

    private _syncVoiceSelection(): void {
        if (!this.services) return;
    }

    private _voiceLabelFromPreference(preference: 'female' | 'male' | 'off'): 'Female' | 'Male' | 'Off' {
        switch (preference) {
            case 'male':
                return 'Male';
            case 'off':
                return 'Off';
            default:
                return 'Female';
        }
    }

    private _voicePreferenceFromLabel(label: string): 'female' | 'male' | 'off' {
        switch (label) {
            case 'Male':
                return 'male';
            case 'Off':
                return 'off';
            default:
                return 'female';
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'settings-panel': SettingsPanel;
    }
}
