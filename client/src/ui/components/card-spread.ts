import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';
import type { IProgressReporter } from '../../services/IProgressReporter.js';

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
                gap: 1.5em;
                padding-top: 1em;
            }

            .cards-row {
                display: flex;
                gap: 0.8em;
                justify-content: center;
                flex-wrap: wrap;
            }

            .card-slot {
                width: 80px;
                height: 130px;
                border: 2px dashed var(--border);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                perspective: 600px;
            }

            .card-slot:hover:not(.dealt) {
                border-color: var(--gold-dim);
                background: var(--purple-dim);
            }

            .card-slot.dealt {
                border-color: var(--gold);
                cursor: default;
            }

            .card-face {
                width: 100%;
                height: 100%;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 0.4em;
                text-align: center;
                transition: transform 0.6s ease;
                backface-visibility: hidden;
            }

            .card-back {
                background: linear-gradient(135deg, var(--purple-dim), var(--bg-card));
                border: 1px solid var(--border);
                color: var(--gold-dim);
                font-size: 2em;
            }

            .card-front {
                background: linear-gradient(135deg, var(--bg-card), var(--purple-dim));
                border: 1px solid var(--gold-dim);
                animation: cardReveal 0.6s ease-out;
            }

            @keyframes cardReveal {
                from { transform: rotateY(90deg); opacity: 0.5; }
                to { transform: rotateY(0); opacity: 1; }
            }

            .card-name {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 0.65em;
                line-height: 1.2;
            }

            .card-position {
                color: var(--text-dim);
                font-size: 0.55em;
                margin-top: 0.3em;
            }

            .card-reversed {
                color: var(--accent);
                font-size: 0.5em;
                font-style: italic;
            }

            .question-section {
                width: 100%;
                max-width: 320px;
            }

            .question-input {
                width: 100%;
                padding: 0.8em;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 8px;
                color: var(--text);
                font-family: var(--font-body);
                font-size: 0.95em;
                resize: none;
                outline: none;
                transition: border-color 0.2s;
            }

            .question-input:focus {
                border-color: var(--gold-dim);
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
        `,
    ];

    @property({ attribute: false }) services!: AppServices;

    @state() private _dealtCards: Array<{ name: string; position: string; reversed: boolean }> = [];
    @state() private _question = '';
    @state() private _selectedTopic = '';
    @state() private _loading = false;
    @state() private _progressText = '';

    private get _spreadSize(): number {
        return this.services?.gameContext?.spreadType ?? 3;
    }

    private get _positions(): string[] {
        return POSITION_LABELS[this._spreadSize] ?? POSITION_LABELS[3];
    }

    override render() {
        return html`
            <div class="spread-container">
                <div class="display-text" style="font-size:1.1em;">
                    ${this._spreadSize}-Card Spread
                </div>

                <div class="cards-row">
                    ${this._positions.map((pos, i) => this._renderCardSlot(pos, i))}
                </div>

                ${this._dealtCards.length < this._spreadSize ? html`
                    <div class="dim-text">Tap a card to draw</div>
                ` : this._loading ? html`
                    <div class="progress-section">
                        <div class="spinner spinner-lg"></div>
                        <div class="progress-text">${this._progressText || 'Reading the cards...'}</div>
                    </div>
                ` : html`
                    <div class="question-section stack gap-sm">
                        <textarea
                            class="question-input"
                            rows="2"
                            placeholder="Ask a question (optional)..."
                            .value=${this._question}
                            @input=${(e: InputEvent) => {
                                this._question = (e.target as HTMLTextAreaElement).value;
                            }}
                        ></textarea>

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

    private _renderCardSlot(position: string, index: number) {
        const card = this._dealtCards[index];
        if (card) {
            return html`
                <div class="card-slot dealt">
                    <div class="card-face card-front">
                        <div class="card-name">${card.name}</div>
                        <div class="card-position">${card.position}</div>
                        ${card.reversed ? html`<div class="card-reversed">Reversed</div>` : nothing}
                    </div>
                </div>
            `;
        }

        const canDeal = index === this._dealtCards.length;
        return html`
            <div
                class="card-slot"
                style="opacity: ${canDeal ? 1 : 0.4}"
                @click=${canDeal ? () => this._dealCard(position) : undefined}
            >
                <div class="card-face card-back">✦</div>
            </div>
        `;
    }

    private _dealCard(position: string): void {
        const name = this._drawRandomCard();
        const reversed = Math.random() < 0.3;

        const card = { name, position, reversed };
        this._dealtCards = [...this._dealtCards, card];

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
            console.error('Reading failed:', err);
            this._progressText = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
        } finally {
            this._loading = false;
            this.dispatchEvent(new CustomEvent('loading', { detail: false }));
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'card-spread': CardSpread;
    }
}
