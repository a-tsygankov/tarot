import { LitElement, html, css, nothing } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';

import { CONFIG } from '../../app/config.js';

// Import child components (registers custom elements)
import './card-spread.js';
import './reading-display.js';
import './followup-chat.js';
import './settings-panel.js';
import './voice-mode.js';
import './debug-console.js';
import './tts-debug-panel.js';
import './star-background.js';
import './dashboard-panel-lite.js';
import type { DebugConsole } from './debug-console.js';

export type AppScreen = 'home' | 'spread' | 'reading' | 'chat' | 'voice' | 'dashboard' | 'tts-debug';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

/**
 * Root application shell — manages screen navigation and services.
 */
@customElement('tarot-app')
export class TarotApp extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                min-height: 100dvh;
                background: var(--bg);
                position: relative;
                overflow: hidden;
                isolation: isolate;
                /* Keep content clear of the Dynamic Island / notch when run as an
                   iOS PWA (apple-mobile-web-app-status-bar-style: black-translucent
                   makes the status bar overlay the app). */
                padding-top: env(safe-area-inset-top, 0px);
            }

            .screen {
                flex: 1;
                /* Horizontal insets keep content clear of the phone's rounded
                   corners (especially in landscape). Bottom inset keeps it
                   clear of the home indicator and the fixed bottom bar. */
                padding:
                    0
                    calc(1em + env(safe-area-inset-right, 0px))
                    calc(8rem + env(safe-area-inset-bottom, 0px))
                    calc(1em + env(safe-area-inset-left, 0px));
                animation: fadeIn 0.3s ease-out;
                position: relative;
                z-index: 1;
            }

            .home-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 2em;
                min-height: 70vh;
                text-align: center;
                padding: 2em 1em;
                position: relative;
            }

            .hero-lockup {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1.1em;
                max-width: 340px;
                margin-top: 1.3em;
            }

            .oracle-mark {
                position: relative;
                width: 220px;
                height: 180px;
                display: flex;
                align-items: center;
                justify-content: center;
                filter: drop-shadow(0 22px 42px rgba(0, 0, 0, 0.3));
            }

            .oracle-ring {
                position: absolute;
                border-radius: 50%;
                border: 3px solid rgba(236, 207, 134, 0.88);
                box-shadow:
                    0 0 0 1px rgba(236, 207, 134, 0.18),
                    0 0 18px rgba(236, 207, 134, 0.36),
                    0 0 38px rgba(236, 207, 134, 0.18),
                    inset 0 0 12px rgba(255, 243, 210, 0.18);
            }

            .oracle-ring.main {
                width: 120px;
                height: 120px;
                top: 16px;
            }

            .oracle-ring.echo {
                width: 130px;
                height: 130px;
                top: 11px;
                opacity: 0.28;
                transform: scaleX(1.06);
            }

            .oracle-glow {
                position: absolute;
                width: 160px;
                height: 58px;
                bottom: 28px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255, 236, 191, 0.3), rgba(201, 168, 76, 0.12) 42%, transparent 72%);
            }

            .oracle-horizon {
                position: absolute;
                bottom: 53px;
                width: 126px;
                height: 3px;
                border-radius: 999px;
                background: linear-gradient(90deg, transparent, rgba(240, 216, 120, 0.9), transparent);
                box-shadow: 0 0 16px rgba(240, 216, 120, 0.4);
            }

            .oracle-flare {
                position: absolute;
                width: 12px;
                height: 12px;
                bottom: 49px;
                border-radius: 50%;
                background: radial-gradient(circle, #fff4d7, rgba(236, 207, 134, 0.78) 56%, transparent 76%);
                box-shadow: 0 0 18px rgba(255, 236, 191, 0.5);
            }

            .oracle-orbit,
            .oracle-orbit-secondary {
                position: absolute;
                bottom: 8px;
                width: 168px;
                height: 50px;
                border-radius: 50%;
                border: 2px solid rgba(236, 207, 134, 0.42);
                border-left-color: transparent;
                border-right-color: transparent;
                transform: rotate(10deg);
                opacity: 0.9;
            }

            .oracle-orbit-secondary {
                width: 146px;
                height: 38px;
                bottom: 17px;
                opacity: 0.5;
                transform: rotate(-6deg);
            }

            .oracle-mist {
                position: absolute;
                inset: 44px 10px 18px;
                background:
                    radial-gradient(circle at 50% 58%, rgba(255, 226, 182, 0.14), transparent 18%),
                    radial-gradient(circle at 50% 80%, rgba(201, 168, 76, 0.08), transparent 40%);
            }

            .oracle-title {
                font-family: var(--font-display);
                font-size: clamp(2.1rem, 5vw, 2.8rem);
                color: var(--gold);
                letter-spacing: 0.06em;
                line-height: 0.92;
                text-transform: uppercase;
                text-shadow: 0 4px 22px rgba(0, 0, 0, 0.2);
            }

            .oracle-kicker {
                font-family: var(--font-display);
                color: var(--text-dim);
                letter-spacing: 0.28em;
                text-transform: uppercase;
                font-size: 0.72rem;
            }

            .oracle-subtitle {
                color: var(--text-dim);
                font-style: italic;
                max-width: 320px;
                line-height: 1.65;
                font-size: 0.98rem;
                text-wrap: balance;
            }

            @media (max-width: 430px) {
                .hero-lockup {
                    margin-top: 2.1em;
                }

                .oracle-subtitle {
                    max-width: 16.5em;
                    line-height: 1.5;
                }
            }

            .spread-choices {
                display: flex;
                flex-direction: column;
                gap: 0.8em;
                width: 100%;
                max-width: 280px;
            }

            .spread-choice {
                padding: 1em;
                border: 1px solid var(--border);
                border-radius: 10px;
                background: var(--bg-card);
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: left;
            }

            .spread-choice:hover {
                border-color: var(--gold-dim);
                background: var(--purple-dim);
            }

            .spread-choice-title {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 1.05em;
            }

            .spread-choice-desc {
                color: var(--text-dim);
                font-size: 0.85em;
                margin-top: 0.3em;
            }

            /* ── Bottom bar (only navigation) ── */
            .bottom-bar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                max-width: 480px;
                margin: 0 auto;
                background: rgba(10, 7, 20, 0.97);
                border-top: 1px solid var(--border);
                /* Respect rounded bottom corners and home-indicator on iOS PWA. */
                padding:
                    0.55em
                    calc(0.8em + env(safe-area-inset-right, 0px))
                    calc(0.55em + env(safe-area-inset-bottom, 0px))
                    calc(0.8em + env(safe-area-inset-left, 0px));
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                align-items: center;
                z-index: 50;
                touch-action: manipulation;
            }

            .bar-left {
                display: flex;
                justify-content: flex-start;
                touch-action: manipulation;
            }

            .bar-center {
                display: flex;
                justify-content: center;
                touch-action: manipulation;
            }

            .bar-right {
                display: flex;
                justify-content: flex-end;
                gap: 0.4em;
                touch-action: manipulation;
            }

            .bar-logo {
                display: inline-flex;
                align-items: center;
                gap: 0.4em;
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 1em;
                letter-spacing: 0.05em;
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                padding: 0.15em 0.3em;
                transition: text-shadow 0.2s;
                touch-action: manipulation;
            }

            .bar-logo:active {
                text-shadow: 0 0 8px rgba(201, 168, 76, 0.6);
            }

            .coffee-link {
                background: var(--gold);
                color: #1a0800;
                font-size: 0.7em;
                font-weight: 700;
                padding: 0.3em 0.6em;
                border-radius: 7px;
                font-family: var(--font-display);
                text-decoration: none;
                white-space: nowrap;
                transition: opacity 0.2s;
            }

            .coffee-link:hover {
                opacity: 0.85;
            }

            .console-toggle {
                background: transparent;
                border: 1px solid var(--border);
                color: var(--text-dim);
                font-size: 0.7em;
                padding: 0.3em 0.6em;
                border-radius: 7px;
                font-family: var(--font-display);
                cursor: pointer;
                transition: all 0.2s;
            }

            .console-toggle:hover {
                border-color: var(--gold-dim);
                color: var(--gold);
            }

            .install-btn {
                background: transparent;
                border: 1px solid var(--border);
                color: var(--gold-dim);
                width: 32px;
                height: 32px;
                padding: 0;
                border-radius: 8px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .install-btn:hover, .install-btn:focus-visible {
                border-color: var(--gold);
                color: var(--gold);
                outline: none;
            }

            .install-btn svg {
                width: 18px;
                height: 18px;
                display: block;
            }

            .install-help {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                z-index: 110;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1em;
                animation: fadeIn 0.15s ease-out;
            }

            .install-help-card {
                background: var(--bg-deep, #0d0a1a);
                border: 1px solid var(--border);
                border-radius: 14px;
                max-width: 360px;
                width: 100%;
                padding: 1.2em;
                color: var(--text);
                font-size: 0.9em;
                line-height: 1.5;
            }

            .install-help-card h3 {
                margin: 0 0 0.8em;
                color: var(--gold);
                font-family: var(--font-display);
                font-size: 1.1em;
            }

            .install-help-card ol {
                padding-left: 1.2em;
                margin: 0.5em 0;
            }

            .install-help-card li {
                margin-bottom: 0.4em;
            }

            .install-help-card .ios-share-icon {
                display: inline-block;
                width: 0.9em;
                height: 0.9em;
                vertical-align: -2px;
                margin: 0 0.1em;
            }

            .install-help-actions {
                display: flex;
                justify-content: flex-end;
                margin-top: 1em;
            }

            /* Loading stars in bottom bar */
            .bar-star-main {
                display: inline-block;
                animation: star-spin 1.8s ease-in-out infinite;
            }

            .bar-star-cluster {
                display: inline-flex;
                align-items: center;
                gap: 0.1em;
                min-width: 1.5em;
                justify-content: center;
            }

            .bar-title {
                line-height: 1;
            }

            .bar-star-sm {
                font-size: 0.6em;
                display: inline-block;
                vertical-align: middle;
                opacity: 0.7;
            }

            .bar-star-1 {
                animation: star-spin-reverse 1.4s ease-in-out infinite;
                margin-right: 0.15em;
            }

            .bar-star-2 {
                animation: star-spin 1.4s ease-in-out infinite 0.3s;
                margin-left: 0.3em;
            }

            @keyframes star-spin {
                0% { transform: rotate(0deg) scale(1); opacity: 0.6; }
                50% { transform: rotate(180deg) scale(1.2); opacity: 1; text-shadow: 0 0 8px rgba(201, 168, 76, 0.6); }
                100% { transform: rotate(360deg) scale(1); opacity: 0.6; }
            }

            @keyframes star-spin-reverse {
                0% { transform: rotate(0deg) scale(1); opacity: 0.5; }
                50% { transform: rotate(-180deg) scale(1.3); opacity: 1; text-shadow: 0 0 8px rgba(201, 168, 76, 0.5); }
                100% { transform: rotate(-360deg) scale(1); opacity: 0.5; }
            }

            /* ── Settings / Console overlay ── */
            .overlay-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 90;
                animation: fadeIn 0.15s ease-out;
            }

            .settings-overlay {
                position: fixed;
                bottom: 48px;
                left: 0;
                right: 0;
                max-height: 75vh;
                max-width: 480px;
                margin: 0 auto;
                background: var(--bg-deep, #0d0a1a);
                border: 1px solid var(--border);
                border-bottom: none;
                border-radius: 14px 14px 0 0;
                z-index: 100;
                overflow-y: auto;
                padding: 1em;
                animation: slideUp 0.2s ease-out;
            }

            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `,
    ];

    private _services!: AppServices;

    @state() private _screen: AppScreen = 'home';
    @state() private _debugMode = false;
    @state() private _isLoading = false;
    @state() private _settingsOpen = false;
    @state() private _readingVersion = 0;
    @state() private _isStandalone = false;
    @state() private _showInstallHelp = false;

    private _deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
    private _standaloneMql: MediaQueryList | null = null;

    @query('debug-console') private _debugConsole!: DebugConsole;

    override connectedCallback(): void {
        super.connectedCallback();
        this._standaloneMql = window.matchMedia('(display-mode: standalone)');
        this._isStandalone = this._standaloneMql.matches
            || (navigator as Navigator & { standalone?: boolean }).standalone === true;
        this._standaloneMql.addEventListener('change', this._onStandaloneChange);
        window.addEventListener('beforeinstallprompt', this._onBeforeInstallPrompt as EventListener);
        window.addEventListener('appinstalled', this._onAppInstalled);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._standaloneMql?.removeEventListener('change', this._onStandaloneChange);
        window.removeEventListener('beforeinstallprompt', this._onBeforeInstallPrompt as EventListener);
        window.removeEventListener('appinstalled', this._onAppInstalled);
    }

    private _onStandaloneChange = (event: MediaQueryListEvent): void => {
        this._isStandalone = event.matches;
    };

    private _onBeforeInstallPrompt = (event: BeforeInstallPromptEvent): void => {
        event.preventDefault();
        this._deferredInstallPrompt = event;
    };

    private _onAppInstalled = (): void => {
        this._isStandalone = true;
        this._deferredInstallPrompt = null;
        this._showInstallHelp = false;
    };

    /** Inject services from composition root. */
    setServices(services: AppServices): void {
        this._services = services;
    }

    get services(): AppServices {
        return this._services;
    }

    navigate(screen: AppScreen): void {
        this._screen = screen;
    }

    private _tapCount = 0;
    private _tapTimer: ReturnType<typeof setTimeout> | null = null;
    private _bottomBarLastTouchMs = 0;

    override render() {
        return html`
            <star-background></star-background>

            <div class="screen">
                ${this._renderScreen()}
            </div>

            <!-- Settings overlay -->
            ${this._settingsOpen ? html`
                <div class="overlay-backdrop" @click=${this._toggleSettings}></div>
                <div class="settings-overlay">
                    <settings-panel
                        .services=${this._services}
                        @close=${this._toggleSettings}
                        @language-changed=${this._onLanguageOrToneChanged}
                        @tone-changed=${this._onLanguageOrToneChanged}
                        @reading-options-changed=${this._onReadingOptionsChanged}
                        @audio-settings-changed=${this._onAudioSettingsChanged}
                    ></settings-panel>
                </div>
            ` : nothing}

            ${this._showInstallHelp ? this._renderInstallHelp() : nothing}

            <div class="bottom-bar" @touchend=${this._preventBottomBarDoubleTapZoom}>
                <div class="bar-left">
                    ${this._renderInstallButton()}
                    ${this._screen !== 'home' ? html`
                        <button class="btn btn-ghost" @click=${() => this.navigate('home')}
                            style="margin-left: 0.4em;">Home</button>
                    ` : ''}
                </div>
                <div class="bar-center">
                    <div class="bar-logo" @click=${this._onLogoTap}>
                        <span class="bar-star-cluster" aria-hidden="true">
                            ${this._isLoading ? html`<span class="bar-star bar-star-sm bar-star-1">&#10022;</span>` : nothing}
                            <span class="bar-star ${this._isLoading ? 'bar-star-main' : ''}">&#10022;</span>
                            ${this._isLoading ? html`<span class="bar-star bar-star-sm bar-star-2">&#10022;</span>` : nothing}
                        </span>
                        <span class="bar-title">Tarot</span>
                    </div>
                </div>
                <div class="bar-right">
                    ${this._debugMode ? html`
                        <button class="console-toggle" @click=${this._toggleTtsDebug}>
                            TTS
                        </button>
                        <button class="console-toggle" @click=${() => this.navigate('dashboard')}>
                            Dash
                        </button>
                        <button class="console-toggle" @click=${this._toggleConsole}>
                            Console
                        </button>
                    ` : html`
                        <a class="coffee-link"
                           href="https://buymeacoffee.com/tsygankov9"
                           target="_blank"
                           rel="noopener">☕</a>
                    `}
                    <button class="btn btn-ghost" @click=${this._toggleSettings}
                        style="font-size: 1.1em; padding: 0.15em 0.3em;">⚙</button>
                </div>
            </div>

            <debug-console></debug-console>
        `;
    }

    private _renderScreen() {
        switch (this._screen) {
            case 'home':
                return this._renderHome();
            case 'spread':
                return html`
                    <card-spread
                        .services=${this._services}
                        .version=${this._readingVersion}
                        @reading-ready=${this._onReadingReady}
                        @loading=${(e: CustomEvent) => { this._isLoading = e.detail; }}
                    ></card-spread>
                `;
            case 'reading':
                return html`
                    <reading-display
                        .services=${this._services}
                        .version=${this._readingVersion}
                        @ask-followup=${() => this.navigate('chat')}
                        @enter-voice=${() => this.navigate('voice')}
                        @new-reading=${() => this._startNewReading()}
                    ></reading-display>
                `;
            case 'chat':
                return html`
                    <followup-chat
                        .services=${this._services}
                        @back=${() => this.navigate('reading')}
                        @loading=${(e: CustomEvent) => { this._isLoading = e.detail; }}
                    ></followup-chat>
                `;
            case 'voice':
                return html`
                    <voice-mode
                        .services=${this._services}
                        @exit-voice=${() => this.navigate('reading')}
                    ></voice-mode>
                `;
            case 'dashboard':
                return html`
                    <dashboard-panel
                        .services=${this._services}
                        @close=${() => this.navigate('home')}
                    ></dashboard-panel>
                `;
            case 'tts-debug':
                return html`
                    <tts-debug-panel
                        .services=${this._services}
                        @close=${() => this.navigate('home')}
                    ></tts-debug-panel>
                `;
        }
    }

    private _renderHome() {
        return html`
            <div class="home-content fade-in">
                <div class="hero-lockup">
                    <div class="oracle-mark" aria-hidden="true">
                        <div class="oracle-mist"></div>
                        <div class="oracle-ring echo"></div>
                        <div class="oracle-ring main"></div>
                        <div class="oracle-glow"></div>
                        <div class="oracle-horizon"></div>
                        <div class="oracle-flare"></div>
                        <div class="oracle-orbit"></div>
                        <div class="oracle-orbit-secondary"></div>
                    </div>
                    <div class="oracle-title">Tarot Oracle</div>
                    <div class="oracle-subtitle">
                    Ask the cards a question, or let fate guide your reading.
                    </div>
                </div>

                <div class="spread-choices">
                    <div class="spread-choice" @click=${() => this._selectSpread(1)}>
                        <div class="spread-choice-title">Single Card</div>
                        <div class="spread-choice-desc">Quick insight — one card, one answer.</div>
                    </div>
                    <div class="spread-choice" @click=${() => this._selectSpread(3)}>
                        <div class="spread-choice-title">Past · Present · Future</div>
                        <div class="spread-choice-desc">Classic 3-card spread for life's journey.</div>
                    </div>
                    <div class="spread-choice" @click=${() => this._selectSpread(5)}>
                        <div class="spread-choice-title">Cross Spread</div>
                        <div class="spread-choice-desc">Deep 5-card reading for complex questions.</div>
                    </div>
                </div>
            </div>
        `;
    }

    private _selectSpread(count: 1 | 3 | 5): void {
        if (!this._services) return;
        this._services.gameContext.reset(count);
        this.navigate('spread');
    }

    private _onReadingReady(): void {
        this.navigate('reading');
    }

    private _startNewReading(): void {
        this.navigate('home');
    }

    private _onLogoTap(): void {
        this._tapCount++;

        if (this._tapTimer) clearTimeout(this._tapTimer);
        this._tapTimer = setTimeout(() => { this._tapCount = 0; }, CONFIG.debugTripleTapMs);

        if (this._tapCount >= 3) {
            if (this._tapTimer) clearTimeout(this._tapTimer);
            this._tapCount = 0;
            this._debugMode = !this._debugMode;
            if (!this._debugMode && this._debugConsole?.isOpen) {
                this._debugConsole.toggle();
            }
        }
    }

    private _toggleConsole(): void {
        this._debugConsole?.toggle();
    }

    private _toggleTtsDebug(): void {
        this.navigate(this._screen === 'tts-debug' ? 'home' : 'tts-debug');
    }

    private _toggleSettings(): void {
        this._settingsOpen = !this._settingsOpen;
    }

    private _renderInstallButton() {
        if (this._isStandalone) return nothing;
        return html`
            <button
                class="install-btn"
                title="Add Tarot to your home screen"
                aria-label="Add Tarot to your home screen"
                @click=${this._onInstallClick}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                    aria-hidden="true">
                    <rect x="5" y="2.5" width="14" height="19" rx="2.5"/>
                    <line x1="12" y1="9" x2="12" y2="16"/>
                    <line x1="8.5" y1="12.5" x2="15.5" y2="12.5"/>
                </svg>
            </button>
        `;
    }

    private _renderInstallHelp() {
        const ua = navigator.userAgent ?? '';
        const isIos = /iPhone|iPad|iPod/i.test(ua)
            || ((navigator.platform ?? '') === 'MacIntel' && navigator.maxTouchPoints > 1);
        return html`
            <div class="install-help" @click=${(e: Event) => { if (e.target === e.currentTarget) this._closeInstallHelp(); }}>
                <div class="install-help-card">
                    <h3>Add Tarot to your home screen</h3>
                    ${isIos ? html`
                        <ol>
                            <li>Tap the
                                <svg class="ios-share-icon" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="1.8"
                                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M12 3v12"/>
                                    <path d="M8 7l4-4 4 4"/>
                                    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>
                                </svg>
                                Share button at the bottom of Safari.
                            </li>
                            <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
                            <li>Tap <b>Add</b> in the top-right corner.</li>
                        </ol>
                    ` : html`
                        <ol>
                            <li>Open your browser menu (usually <b>⋮</b> in the top-right).</li>
                            <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
                            <li>Confirm to place the Tarot icon on your home screen.</li>
                        </ol>
                    `}
                    <div class="install-help-actions">
                        <button class="btn btn-ghost" @click=${this._closeInstallHelp}>Got it</button>
                    </div>
                </div>
            </div>
        `;
    }

    private _onInstallClick = async (): Promise<void> => {
        const deferred = this._deferredInstallPrompt;
        if (deferred) {
            try {
                await deferred.prompt();
                const choice = await deferred.userChoice;
                if (choice.outcome === 'accepted') {
                    this._isStandalone = true;
                }
            } catch (err) {
                console.warn('Install prompt failed:', err);
            } finally {
                this._deferredInstallPrompt = null;
            }
            return;
        }
        this._showInstallHelp = true;
    };

    private _closeInstallHelp = (): void => {
        this._showInstallHelp = false;
    };

    private _preventBottomBarDoubleTapZoom(event: TouchEvent): void {
        const now = Date.now();
        if (now - this._bottomBarLastTouchMs < 350) {
            event.preventDefault();
        }
        this._bottomBarLastTouchMs = now;
    }

    /**
     * When language or tone changes mid-game, re-request the reading
     * so card descriptions and predictions update to the new language/tone.
     */
    private async _onLanguageOrToneChanged(): Promise<void> {
        const game = this._services?.gameContext;
        if (!game?.reading) return; // no reading to re-request

        this._isLoading = true;
        try {
            const response = await this._services.apiService.fetchReadingAsync(game, {});
            game.applyReading(response);
            if (response.userContextDelta) {
                this._services.userContext.applyAiUpdate(response.userContextDelta);
            }
            this._services.userContext.applyUserTraits(response.userTraits);
            this._readingVersion += 1;
        } catch (err) {
            console.error('Re-request reading failed:', err instanceof Error ? err.message : err);
        } finally {
            this._isLoading = false;
        }
    }

    private async _onReadingOptionsChanged(): Promise<void> {
        const game = this._services?.gameContext;
        if (!game) return;

        game.normalizeCards(this._services.userContext.noReversedCards);
        this._readingVersion += 1;

        if (!game.reading) {
            return;
        }

        this._isLoading = true;
        try {
            const response = await this._services.apiService.fetchReadingAsync(game, {});
            game.applyReading(response);
            if (response.userContextDelta) {
                this._services.userContext.applyAiUpdate(response.userContextDelta);
            }
            this._readingVersion += 1;
        } catch (err) {
            console.error('Re-request reading failed:', err instanceof Error ? err.message : err);
        } finally {
            this._isLoading = false;
        }
    }

    private _onAudioSettingsChanged(): void {
        this._services.speechService.stop();
        void this._services.audioCueService.syncSettings();
        this._readingVersion += 1;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'tarot-app': TarotApp;
    }
}
