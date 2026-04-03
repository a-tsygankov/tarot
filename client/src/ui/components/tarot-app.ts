import { LitElement, html, css } from 'lit';
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
import './star-background.js';
import './dashboard-panel.js';
import type { DebugConsole } from './debug-console.js';

export type AppScreen = 'home' | 'spread' | 'reading' | 'chat' | 'settings' | 'voice' | 'dashboard';

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
            }

            .screen {
                flex: 1;
                padding: 0 1em 4.5em; /* extra bottom padding for bottom bar */
                animation: fadeIn 0.3s ease-out;
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
            }

            .oracle-title {
                font-family: var(--font-display);
                font-size: 2em;
                color: var(--gold);
                letter-spacing: 0.08em;
            }

            .oracle-subtitle {
                color: var(--text-dim);
                font-style: italic;
                max-width: 280px;
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
            }

            .bar-left {
                display: flex;
                justify-content: flex-start;
            }

            .bar-center {
                display: flex;
                justify-content: center;
            }

            .bar-right {
                display: flex;
                justify-content: flex-end;
                gap: 0.4em;
            }

            .bar-logo {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 1em;
                letter-spacing: 0.05em;
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                padding: 0.15em 0.3em;
                transition: text-shadow 0.2s;
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

            /* Loading spinner in bottom bar center */
            .bar-spinner {
                display: flex;
                gap: 4px;
                color: var(--gold);
                font-size: 0.85em;
            }

            .bar-spinner-star {
                animation: bar-star-fade 1.4s ease-in-out infinite;
            }

            .bar-spinner-star:nth-child(1) { animation-delay: 0s; }
            .bar-spinner-star:nth-child(2) { animation-delay: 0.2s; }
            .bar-spinner-star:nth-child(3) { animation-delay: 0.4s; }

            @keyframes bar-star-fade {
                0%, 100% { opacity: 0.2; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1.3); text-shadow: 0 0 8px rgba(201, 168, 76, 0.5); }
            }
        `,
    ];

    private _services!: AppServices;

    @state() private _screen: AppScreen = 'home';
    @state() private _debugMode = false;
    @state() private _isLoading = false;

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

    override render() {
        return html`
            <star-background></star-background>

            <div class="screen">
                ${this._renderScreen()}
            </div>

            <div class="bottom-bar">
                <div class="bar-left">
                    ${this._screen !== 'home' ? html`
                        <button class="btn btn-ghost" @click=${() => this.navigate('home')}>Home</button>
                    ` : ''}
                </div>
                <div class="bar-center">
                    ${this._isLoading
                        ? html`<div class="bar-spinner"><span class="bar-spinner-star">&#10022;</span><span class="bar-spinner-star">&#10022;</span><span class="bar-spinner-star">&#10022;</span></div>`
                        : html`<div class="bar-logo" @click=${this._onLogoTap}>&#10022; Tarot</div>`
                    }
                </div>
                <div class="bar-right">
                    ${this._debugMode ? html`
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
                    <button class="btn btn-ghost" @click=${() => this.navigate('settings')}
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
            case 'settings':
                return html`
                    <settings-panel
                        .services=${this._services}
                        @close=${() => this.navigate('home')}
                    ></settings-panel>
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
        }
    }

    private _renderHome() {
        return html`
            <div class="home-content fade-in">
                <div class="oracle-title">✦ Tarot Oracle ✦</div>
                <div class="oracle-subtitle">
                    Ask the cards a question, or let fate guide your reading.
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
}

declare global {
    interface HTMLElementTagNameMap {
        'tarot-app': TarotApp;
    }
}
