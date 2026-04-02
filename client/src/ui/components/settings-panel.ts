import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import { THEMES, applyTheme } from '../styles/themes.js';
import type { AppServices } from '../../app/composition-root.js';

/**
 * Settings panel — language, tone, theme, user profile.
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

            .version-info {
                text-align: center;
                color: var(--text-faint);
                font-size: 0.8em;
                padding-top: 1em;
                border-top: 1px solid var(--border);
            }
        `,
    ];

    @property({ attribute: false }) services!: AppServices;

    @state() private _language = 'ENG';
    @state() private _tone = 'Mystical';
    @state() private _theme = 'dusk';
    @state() private _name = '';

    override connectedCallback(): void {
        super.connectedCallback();
        if (this.services) {
            const uc = this.services.userContext;
            this._language = uc.language ?? 'ENG';
            this._tone = uc.tone ?? 'Mystical';
            this._name = uc.name ?? '';
            this._theme = localStorage.getItem('tarot-theme') ?? 'dusk';
        }
    }

    override render() {
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

                <div class="version-info">
                    Tarot Oracle v${this.services?.config.version ?? '?.?.?'}
                </div>
            </div>
        `;
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
