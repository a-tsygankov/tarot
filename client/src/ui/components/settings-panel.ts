import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import { THEMES, applyTheme } from '../styles/themes.js';
import { DECK_STYLES, getCurrentDeckStyle, setDeckStyle } from './card-art-registry.js';
import type { AppServices } from '../../app/composition-root.js';

const FONT_OPTIONS = [
    { id: 'Palatino', label: 'Palatino', family: "'Palatino Linotype', Palatino, Georgia, serif" },
    { id: 'Garamond', label: 'Garamond', family: "'EB Garamond', Garamond, serif" },
    { id: 'Cinzel', label: 'Cinzel', family: "Cinzel, serif" },
    { id: 'Fraktur', label: 'Fraktur', family: "UnifrakturMaguntia, serif" },
    { id: 'Philosopher', label: 'Philosopher', family: "Philosopher, serif" },
] as const;

const SPEED_OPTIONS = ['0.75×', '1×', '1.5×', '2×'] as const;
const SPEED_VALUES: Record<string, number> = { '0.75×': 0.75, '1×': 1.0, '1.5×': 1.5, '2×': 2.0 };
const SPEED_LABELS: Record<number, string> = { 0.75: '0.75×', 1: '1×', 1.5: '1.5×', 2: '2×' };

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
    @state() private _speed = 1.0;
    @state() private _font = 'Palatino';
    @state() private _deckStyle = 'classic';
    @state() private _italic = true;

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
            this._italic = (localStorage.getItem('tarot-italic') ?? 'true') === 'true';
            // Determine voice from voiceId
            const lang = this.services.config.languages.find(l => l.code === this._language);
            if (lang?.voiceId) {
                this._voice = 'Female'; // default; could be expanded
            } else {
                this._voice = 'Off';
            }
        }
    }

    override render() {
        const speedLabel = SPEED_LABELS[this._speed] ?? '1×';

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
                        ${DECK_STYLES.map(d => html`
                            <button
                                class="option-btn ${this._deckStyle === d.id ? 'selected' : ''}"
                                @click=${() => this._setDeckStyle(d.id)}
                                title=${d.description}
                            >${d.label}</button>
                        `)}
                    </div>
                </div>

                <!-- Voice -->
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
                    <div class="option-grid">
                        ${SPEED_OPTIONS.map(s => html`
                            <button
                                class="option-btn ${speedLabel === s ? 'selected' : ''}"
                                @click=${() => this._setSpeed(s)}
                            >${s}</button>
                        `)}
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
                    <div class="option-grid" style="margin-top: 0.5em;">
                        <button
                            class="option-btn ${this._italic ? 'selected' : ''}"
                            @click=${() => this._setItalic(!this._italic)}
                        ><em>Italic</em></button>
                    </div>
                    <div class="font-preview">
                        <div class="font-preview-label">preview:</div>
                        <div class="font-preview-text" style="font-family: ${this._currentFontFamily}; font-style: ${this._italic ? 'italic' : 'normal'}">
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

    private _setLanguage(code: string): void {
        this._language = code;
        if (this.services) {
            this.services.userContext.language = code;
            this.services.userContext.save();
        }
    }

    private _setTone(tone: string): void {
        this._tone = tone;
        if (this.services) {
            this.services.userContext.tone = tone;
            this.services.userContext.save();
        }
    }

    private _setTheme(themeId: string): void {
        this._theme = themeId;
        applyTheme(themeId);
    }

    private _setVoice(voice: string): void {
        this._voice = voice;
        if (this.services) {
            if (voice === 'Off') {
                this.services.userContext.voiceId = null;
            } else {
                // Use language-specific voice
                const lang = this.services.config.languages.find(l => l.code === this._language);
                this.services.userContext.voiceId = lang?.voiceId ?? null;
            }
            this.services.userContext.save();
        }
    }

    private _setSpeed(label: string): void {
        const value = SPEED_VALUES[label] ?? 1.0;
        this._speed = value;
        localStorage.setItem('tarot-tts-speed', String(value));
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
}

declare global {
    interface HTMLElementTagNameMap {
        'settings-panel': SettingsPanel;
    }
}
