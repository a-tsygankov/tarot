import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';

// Import child components (registers custom elements)
import './tarot-header.js';
import './card-spread.js';
import './reading-display.js';
import './followup-chat.js';
import './settings-panel.js';
import './voice-mode.js';

export type AppScreen = 'home' | 'spread' | 'reading' | 'chat' | 'settings' | 'voice';

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
                padding: 0 1em 1em;
                animation: fadeIn 0.3s ease-out;
            }

            .home-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 2em;
                min-height: 60vh;
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

            .status-bar {
                padding: 0.6em 1em;
                text-align: center;
                color: var(--text-faint);
                font-size: 0.8em;
            }
        `,
    ];

    private _services!: AppServices;

    @state() private _screen: AppScreen = 'home';
    @state() private _statusMessage = '';

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

    override render() {
        return html`
            <tarot-header
                .screen=${this._screen}
                @navigate=${(e: CustomEvent<AppScreen>) => this.navigate(e.detail)}
            ></tarot-header>

            <div class="screen">
                ${this._renderScreen()}
            </div>

            ${this._statusMessage ? html`
                <div class="status-bar">${this._statusMessage}</div>
            ` : ''}
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
}

declare global {
    interface HTMLElementTagNameMap {
        'tarot-app': TarotApp;
    }
}
