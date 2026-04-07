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
            }

            .screen {
                flex: 1;
                padding: 0 1em 4.5em; /* extra bottom padding for bottom bar */
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
                max-width: 320px;
            }

            .oracle-seal {
                position: relative;
                width: 142px;
                aspect-ratio: 1;
                border-radius: 50%;
                display: grid;
                place-items: center;
                background:
                    radial-gradient(circle at 50% 50%, rgba(201, 168, 76, 0.18), rgba(201, 168, 76, 0.04) 42%, transparent 70%),
                    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.06), transparent 34%);
                box-shadow:
                    0 0 0 1px rgba(201, 168, 76, 0.26),
                    0 0 28px rgba(201, 168, 76, 0.14);
            }

            .oracle-seal::before,
            .oracle-seal::after {
                content: '';
                position: absolute;
                inset: 10px;
                border-radius: 50%;
                border: 1px solid rgba(201, 168, 76, 0.32);
            }

            .oracle-seal::after {
                inset: 22px;
                border-color: rgba(201, 168, 76, 0.18);
            }

            .seal-stars {
                position: absolute;
                inset: 0;
                display: block;
                color: var(--gold-light);
                pointer-events: none;
                filter: drop-shadow(0 0 10px rgba(201, 168, 76, 0.24));
            }

            .seal-star {
                position: absolute;
                font-size: 0.9rem;
                opacity: 0.82;
            }

            .seal-star.top { top: 10px; left: 50%; transform: translateX(-50%); }
            .seal-star.left { left: 12px; top: 50%; transform: translateY(-50%); }
            .seal-star.right { right: 12px; top: 50%; transform: translateY(-50%); }
            .seal-star.bottom { bottom: 10px; left: 50%; transform: translateX(-50%); }

            .oracle-eye {
                position: relative;
                width: 74px;
                height: 104px;
                border-radius: 38px / 52px;
                border: 1px solid rgba(201, 168, 76, 0.68);
                background:
                    radial-gradient(circle at 50% 34%, rgba(240, 216, 120, 0.12), transparent 25%),
                    linear-gradient(180deg, rgba(22, 14, 36, 0.92), rgba(11, 8, 20, 0.98));
                box-shadow:
                    inset 0 0 24px rgba(201, 168, 76, 0.08),
                    0 18px 30px rgba(0, 0, 0, 0.24);
                transform: translateY(-2px);
            }

            .oracle-eye::before {
                content: '';
                position: absolute;
                inset: 12px 18px;
                border-radius: 50%;
                border: 1px solid rgba(201, 168, 76, 0.46);
            }

            .oracle-eye::after {
                content: '';
                position: absolute;
                left: 50%;
                top: 50%;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: radial-gradient(circle at 35% 35%, var(--gold-light), var(--gold));
                transform: translate(-50%, -50%);
                box-shadow:
                    0 0 18px rgba(201, 168, 76, 0.45),
                    0 0 0 6px rgba(201, 168, 76, 0.12);
            }

            .oracle-arc,
            .oracle-arc-secondary {
                position: absolute;
                border-radius: 50%;
                border: 1px solid rgba(201, 168, 76, 0.36);
            }

            .oracle-arc {
                width: 106px;
                height: 106px;
                border-left-color: transparent;
                border-bottom-color: transparent;
                transform: rotate(20deg);
            }

            .oracle-arc-secondary {
                width: 126px;
                height: 126px;
                border-right-color: transparent;
                border-top-color: transparent;
                transform: rotate(18deg);
                opacity: 0.65;
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
                padding: 0.55em 0.8em calc(0.55em + env(safe-area-inset-bottom, 0px));
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

    @query('debug-console') private _debugConsole!: DebugConsole;

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
                    ></settings-panel>
                </div>
            ` : nothing}

            <div class="bottom-bar" @touchend=${this._preventBottomBarDoubleTapZoom}>
                <div class="bar-left">
                    ${this._screen !== 'home' ? html`
                        <button class="btn btn-ghost" @click=${() => this.navigate('home')}>Home</button>
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
                    <div class="oracle-seal" aria-hidden="true">
                        <div class="seal-stars">
                            <span class="seal-star top">✦</span>
                            <span class="seal-star left">✦</span>
                            <span class="seal-star right">✦</span>
                            <span class="seal-star bottom">✦</span>
                        </div>
                        <div class="oracle-arc-secondary"></div>
                        <div class="oracle-arc"></div>
                        <div class="oracle-eye"></div>
                    </div>
                    <div class="oracle-kicker">Velvet Arcana</div>
                    <div class="oracle-title">Tarot Oracle</div>
                    <div class="oracle-subtitle">
                        Ask the cards a question, or let fate guide your reading through a more ornate celestial ritual.
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
            this._readingVersion += 1;
        } catch (err) {
            console.error('Re-request reading failed:', err instanceof Error ? err.message : err);
        } finally {
            this._isLoading = false;
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'tarot-app': TarotApp;
    }
}
