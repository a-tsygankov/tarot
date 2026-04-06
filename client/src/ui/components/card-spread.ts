import { LitElement, html, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';
import type { IProgressReporter } from '../../services/IProgressReporter.js';
import './tarot-card.js';

// Major arcana names for random draw
const MAJOR_ARCANA = [
    'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
    'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
    'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
    'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
    'Judgement', 'The World',
];

const MINOR_SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'];
const MINOR_RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];

const POSITION_LABELS: Record<number, string[]> = {
    1: ['Insight'],
    3: ['Past', 'Present', 'Future'],
    5: ['Core', 'Challenge', 'Past', 'Future', 'Guidance'],
};

interface CardLayout {
    width: string;
    height: string;
    tilt: number; // degrees
    offsetY: number; // px, vertical offset
}

interface SpreadLayout {
    cards: CardLayout[];
    gap: string;
    wrapStyle?: string; // additional CSS for the cards-row container
}

const SPREAD_LAYOUTS: Record<number, SpreadLayout> = {
    1: {
        gap: '0',
        cards: [
            { width: '130px', height: '212px', tilt: 0, offsetY: 0 },
        ],
    },
    3: {
        gap: '0.6em',
        cards: [
            { width: '110px', height: '180px', tilt: -15, offsetY: 8 },
            { width: '120px', height: '196px', tilt: 0, offsetY: 0 },
            { width: '110px', height: '180px', tilt: 15, offsetY: 8 },
        ],
    },
    5: {
        gap: '0.3em',
        wrapStyle: 'flex-wrap: wrap; max-width: 300px;',
        cards: [
            // Row 1: center
            { width: '80px', height: '130px', tilt: 0, offsetY: 0 },
            // Row 2: left, center, right
            { width: '80px', height: '130px', tilt: -5, offsetY: 0 },
            { width: '80px', height: '130px', tilt: 0, offsetY: -12 },
            { width: '80px', height: '130px', tilt: 5, offsetY: 0 },
            // Row 3: center
            { width: '80px', height: '130px', tilt: 0, offsetY: 0 },
        ],
    },
};

/**
 * Card spread screen — deal cards, ask optional question, fetch reading.
 */
@customElement('card-spread')
export class CardSpread extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            .spread-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1.85em;
                width: 100%;
                box-sizing: border-box;
                padding: 1em 1rem 0;
            }

            .cards-row {
                display: flex;
                gap: 0.8em;
                justify-content: center;
                flex-wrap: wrap;
            }

            .cards-row.three-card {
                margin-bottom: 1.9em;
            }

            .card-slot {
                width: var(--card-w, 80px);
                min-height: var(--card-h, 130px);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                position: relative;
                touch-action: manipulation;
            }

            .card-slot:hover:not(.dealt) {
                transform: translateY(-2px);
            }

            .card-slot.dealt {
                cursor: default;
            }

            .question-section {
                width: min(100%, 340px);
                box-sizing: border-box;
                align-self: center;
                margin-top: 2.25em;
                position: relative;
            }

            .question-input-wrap {
                position: relative;
                width: 100%;
            }

            .question-input {
                width: 100%;
                box-sizing: border-box;
                padding: 0.7em 3.2em 0.7em 0.8em;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 8px;
                color: var(--text);
                font-family: var(--font-body);
                font-size: 0.92em;
                outline: none;
                transition: border-color 0.2s, box-shadow 0.2s ease;
                height: 2.8em;
                line-height: 1.2;
                white-space: nowrap;
            }

            .question-input:focus {
                border-color: var(--gold-dim);
                box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.08);
            }

            .question-input::placeholder {
                color: var(--text-faint);
            }

            .topic-chips {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4em;
                justify-content: center;
                margin-top: 0.6em;
            }

            .topic-chip {
                padding: 0.3em 0.7em;
                border: 1px solid var(--border);
                border-radius: 20px;
                background: transparent;
                color: var(--text-dim);
                font-size: 0.8em;
                cursor: pointer;
                transition: all 0.2s;
            }

            .topic-chip:hover, .topic-chip.selected {
                border-color: var(--gold-dim);
                color: var(--gold);
                background: var(--purple-dim);
            }

            .progress-section {
                text-align: center;
                margin-top: 2.35em;
            }

            .progress-text {
                color: var(--text-dim);
                font-size: 0.9em;
                margin-top: 0.5em;
            }

            .actions {
                display: flex;
                gap: 0.8em;
            }

            .question-label {
                color: var(--text-dim);
                font-size: 0.78em;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                margin-bottom: 0.35em;
            }

            .mic-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 2.25em;
                height: 2.25em;
                border-radius: 999px;
                border: 1px solid var(--border);
                background: rgba(15, 9, 26, 0.88);
                color: var(--gold);
                cursor: pointer;
                transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
                position: absolute;
                top: 50%;
                right: 0.45em;
                transform: translateY(-50%);
            }

            .mic-btn:hover {
                transform: translateY(-50%) translateY(-1px);
                border-color: var(--gold-dim);
            }

            .mic-btn.listening {
                background: rgba(201, 168, 76, 0.14);
                border-color: var(--gold);
                box-shadow: 0 0 0 5px rgba(201, 168, 76, 0.08);
            }

            .question-status {
                color: var(--text-faint);
                font-size: 0.75em;
                min-height: 1.1em;
            }

            /* Celtic cross layout: 3 rows */
            .cross-layout {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.45em;
            }

            .cross-row {
                display: flex;
                gap: 0.3em;
                justify-content: center;
            }

            tarot-card {
                touch-action: manipulation;
            }
        `,
    ];

    @property({ attribute: false }) services!: AppServices;
    @query('.question-input') private _questionInput?: HTMLInputElement;

    @state() private _dealtCards: Array<{ name: string; position: string; reversed: boolean }> = [];
    @state() private _question = '';
    @state() private _selectedTopic = '';
    @state() private _loading = false;
    @state() private _progressText = '';
    @state() private _questionFocused = false;
    @state() private _sttListening = false;
    @state() private _sttStatus = '';

    private _sttBaseQuestion = '';

    private get _spreadSize(): number {
        return this.services?.gameContext?.spreadType ?? 3;
    }

    private get _positions(): string[] {
        return POSITION_LABELS[this._spreadSize] ?? POSITION_LABELS[3];
    }

    private get _layout(): SpreadLayout {
        return SPREAD_LAYOUTS[this._spreadSize] ?? SPREAD_LAYOUTS[3];
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        void this.services?.audioCueService.stopOracleWaiting();
        this.services?.sttService.stop();
    }

    override render() {
        const layout = this._layout;
        const rowStyle = `gap: ${layout.gap}; ${layout.wrapStyle ?? ''}`;

        return html`
            <div class="spread-container">
                <div class="display-text" style="font-size:1.1em;">
                    ${this._spreadSize}-Card Spread
                </div>

                ${this._spreadSize === 5 ? this._renderCrossLayout() : html`
                    <div class="cards-row ${this._spreadSize === 3 ? 'three-card' : ''}" style=${rowStyle}>
                        ${this._positions.map((pos, i) => this._renderCardSlot(pos, i))}
                    </div>
                `}

                ${this._dealtCards.length < this._spreadSize ? html`
                    <div class="dim-text" style="margin-top:1.35em;">Tap a card to draw</div>
                ` : this._loading ? html`
                    <div class="progress-section">
                        <div class="spinner spinner-lg"></div>
                        <div class="progress-text">${this._progressText || 'Reading the cards...'}</div>
                    </div>
                ` : html`
                    <div class="question-section stack gap-sm">
                        <div class="question-label">Ask Your Question</div>
                        <div class="question-input-wrap">
                        <input
                            class="question-input"
                            placeholder="Ask a question (optional)..."
                            .value=${this._question}
                            @focus=${() => {
                                this._questionFocused = true;
                                if (this.services.sttService.isAvailable() && !this._sttStatus) {
                                    this._sttStatus = 'Tap the microphone to dictate your question.';
                                }
                            }}
                            @blur=${() => {
                                this._questionFocused = false;
                                if (!this._sttListening && this._sttStatus === 'Tap the microphone to dictate your question.') {
                                    this._sttStatus = '';
                                }
                            }}
                            @input=${(e: InputEvent) => {
                                this._question = (e.target as HTMLInputElement).value;
                            }}
                        />
                        ${(this._questionFocused || this._sttListening) && this.services.sttService.isAvailable() ? html`
                            <button
                                class="mic-btn ${this._sttListening ? 'listening' : ''}"
                                title=${this._sttListening ? 'Stop dictation' : 'Speak your question'}
                                @click=${this._toggleQuestionDictation}
                            >${this._sttListening ? '■' : '🎙'}</button>
                        ` : ''}
                        </div>
                        <div class="question-status">${this._sttStatus}</div>

                        <div class="topic-chips">
                            ${(['Love', 'Career', 'Health', 'Spirit', 'Finance', 'Change'] as const).map(t => html`
                                <button
                                    class="topic-chip ${this._selectedTopic === t ? 'selected' : ''}"
                                    @click=${() => { this._selectedTopic = this._selectedTopic === t ? '' : t; }}
                                >${t}</button>
                            `)}
                        </div>

                        <div class="actions center">
                            <button class="btn btn-primary" @click=${this._fetchReading}>
                                Get Reading
                            </button>
                        </div>
                    </div>
                `}
            </div>
        `;
    }

    private _renderCrossLayout() {
        const positions = this._positions;
        // Row 1: card 0 (Core) centered
        // Row 2: cards 1 (Challenge), 2 (Past), 3 (Future) in a row
        // Row 3: card 4 (Guidance) centered
        return html`
            <div class="cross-layout">
                <div class="cross-row">
                    ${this._renderCardSlot(positions[0], 0)}
                </div>
                <div class="cross-row">
                    ${this._renderCardSlot(positions[1], 1)}
                    ${this._renderCardSlot(positions[2], 2)}
                    ${this._renderCardSlot(positions[3], 3)}
                </div>
                <div class="cross-row">
                    ${this._renderCardSlot(positions[4], 4)}
                </div>
            </div>
        `;
    }

    private _renderCardSlot(position: string, index: number) {
        const layout = this._layout;
        const cardLayout = layout.cards[index] ?? layout.cards[0];
        const slotStyle = `--card-w: ${cardLayout.width}; --card-h: ${cardLayout.height};`;

        const card = this._dealtCards[index];
        if (card) {
            return html`
                <div class="card-slot dealt" style=${slotStyle}>
                    <tarot-card
                        face="front"
                        size=${this._spreadSize === 1 ? 'insight' : 'spread'}
                        .cardName=${card.name}
                        .position=${card.position}
                        .reversed=${card.reversed}
                        .showMeta=${true}
                        .previewEnabled=${true}
                        .audioCueService=${this.services.audioCueService}
                        .width=${this._pixelValue(cardLayout.width)}
                        .height=${this._pixelValue(cardLayout.height)}
                        .tiltDeg=${cardLayout.tilt}
                        .offsetY=${cardLayout.offsetY}
                    ></tarot-card>
                </div>
            `;
        }

        const canDeal = index === this._dealtCards.length;
        return html`
            <div
                class="card-slot"
                style="${slotStyle} opacity: ${canDeal ? 1 : 0.4}"
            >
                <tarot-card
                    face="back"
                    size=${this._spreadSize === 1 ? 'insight' : 'spread'}
                    .position=${position}
                    .previewEnabled=${true}
                    .audioCueService=${this.services.audioCueService}
                    .activateOnTap=${canDeal}
                    .interactive=${canDeal}
                    .width=${this._pixelValue(cardLayout.width)}
                    .height=${this._pixelValue(cardLayout.height)}
                    .tiltDeg=${cardLayout.tilt}
                    .offsetY=${cardLayout.offsetY}
                    @card-activate=${() => this._dealCard(position)}
                ></tarot-card>
            </div>
        `;
    }

    private _dealCard(position: string): void {
        const name = this._drawRandomCard();
        const reversed = Math.random() < 0.3;

        const card = { name, position, reversed };
        this._dealtCards = [...this._dealtCards, card];
        void this.services.audioCueService.playCardReveal();

        // Add to game context
        this.services.gameContext.addCard({ position, name, reversed });
    }

    private _drawRandomCard(): string {
        // Avoid duplicates
        const used = new Set(this._dealtCards.map(c => c.name));

        const allCards: string[] = [...MAJOR_ARCANA];
        for (const suit of MINOR_SUITS) {
            for (const rank of MINOR_RANKS) {
                allCards.push(`${rank} of ${suit}`);
            }
        }

        const available = allCards.filter(c => !used.has(c));
        return available[Math.floor(Math.random() * available.length)];
    }

    private async _fetchReading(): Promise<void> {
        if (!this.services || this._loading) return;

        this._loading = true;
        this.dispatchEvent(new CustomEvent('loading', { detail: true }));

        const game = this.services.gameContext;
        game.question = this._question || null;
        game.topic = this._selectedTopic || null;

        const progress: IProgressReporter = {
            report: (status: string) => { this._progressText = status; },
        };

        try {
            await this.services.audioCueService.startOracleWaiting();
            const response = await this.services.apiService.fetchReadingAsync(
                game,
                { progress },
            );

            game.applyReading(response);

            // Apply user context delta if present
            if (response.userContextDelta) {
                this.services.userContext.applyAiUpdate(response.userContextDelta);
            }

            this.dispatchEvent(new CustomEvent('reading-ready'));
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const stack = err instanceof Error ? err.stack : '';
            console.error(`Reading failed: ${msg}`);
            if (stack) console.error('Stack:', stack);
            this._progressText = `Error: ${msg}`;
        } finally {
            await this.services.audioCueService.stopOracleWaiting();
            this._loading = false;
            this.dispatchEvent(new CustomEvent('loading', { detail: false }));
        }
    }

    private _pixelValue(value: string): number {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 110;
    }

    private _toggleQuestionDictation(): void {
        if (!this.services.sttService.isAvailable()) {
            this._sttStatus = 'Speech input is not available in this browser.';
            return;
        }

        if (this._sttListening) {
            this.services.sttService.stop();
            return;
        }

        const language = this.services.config.languages.find(
            entry => entry.code === this.services.userContext.language,
        )?.sttLang ?? 'en-US';

        this._sttBaseQuestion = this._question.trim();
        this._sttStatus = 'Listening...';

        this.services.sttService.start(language, {
            onStart: () => {
                this._sttListening = true;
            },
            onInterim: (transcript) => {
                const clean = transcript.trim();
                this._question = this._mergeTranscript(clean);
                this._sttStatus = clean ? `Listening: ${clean}` : 'Listening...';
            },
            onResult: (transcript) => {
                const clean = transcript.trim();
                this._question = this._mergeTranscript(clean);
                this._sttStatus = clean ? 'Question captured.' : '';
                this.updateComplete.then(() => {
                    this._questionInput?.focus();
                });
            },
            onEnd: () => {
                this._sttListening = false;
                if (this._sttStatus === 'Listening...') {
                    this._sttStatus = '';
                }
            },
            onError: (error) => {
                this._sttListening = false;
                this._sttStatus = `Speech input error: ${error}`;
            },
        });
    }

    private _mergeTranscript(transcript: string): string {
        if (!transcript) {
            return this._sttBaseQuestion;
        }

        return [this._sttBaseQuestion, transcript].filter(Boolean).join(this._sttBaseQuestion ? ' ' : '');
    }

}

declare global {
    interface HTMLElementTagNameMap {
        'card-spread': CardSpread;
    }
}
