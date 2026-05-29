import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';
import type { CardDraw } from '@shared/contracts/api-contracts.js';
import './tarot-card.js';

/**
 * Clarification layout: up to two extra cards for a single-card reading/follow-up.
 * Already-drawn cards render face-up; the next slot is tappable (face-down) until
 * the limit is reached. Revealing a slot emits `reveal` — the parent draws the card,
 * updates the game, and re-requests the reading/answer.
 */
@customElement('clarification-cards')
export class ClarificationCards extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            .clarify {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5em;
                padding: 0.8em 0;
            }

            .clarify-title {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 0.85em;
                letter-spacing: 0.05em;
            }

            .clarify-hint {
                color: var(--text-dim);
                font-size: 0.8em;
                text-align: center;
                max-width: 280px;
            }

            .clarify-row {
                display: flex;
                gap: 0.6em;
                justify-content: center;
            }

            .clarify-slot {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
        `,
    ];

    @property({ attribute: false }) services!: AppServices;
    @property({ attribute: false }) cards: CardDraw[] = [];
    @property({ type: Number }) max = 2;
    @property({ type: Boolean }) disabled = false;

    override render() {
        if (!this.services) return nothing;
        const noReversed = this.services.userContext.noReversedCards;
        const slots = [];
        for (let i = 0; i < this.max; i++) {
            const card = this.cards[i];
            if (card) {
                slots.push(html`
                    <div class="clarify-slot">
                        <tarot-card
                            face="front"
                            size="insight"
                            .cardName=${card.name}
                            .position=${card.position}
                            .reversed=${noReversed ? false : card.reversed}
                            .showMeta=${true}
                            .previewEnabled=${true}
                            .audioCueService=${this.services.audioCueService}
                            .width=${64}
                            .height=${104}
                        ></tarot-card>
                    </div>
                `);
                continue;
            }

            const isNext = i === this.cards.length && !this.disabled;
            slots.push(html`
                <div class="clarify-slot" style=${isNext ? '' : 'opacity:0.4;'}>
                    <tarot-card
                        face="back"
                        size="insight"
                        .position=${`Clarification ${i + 1}`}
                        .previewEnabled=${false}
                        .audioCueService=${this.services.audioCueService}
                        .activateOnTap=${isNext}
                        .interactive=${isNext}
                        .width=${64}
                        .height=${104}
                        @card-activate=${() => this._onReveal(isNext)}
                    ></tarot-card>
                </div>
            `);
        }

        const full = this.cards.length >= this.max;
        return html`
            <div class="clarify">
                <div class="clarify-title">Need a clearer answer?</div>
                <div class="clarify-row">${slots}</div>
                ${full ? nothing : html`
                    <div class="clarify-hint">Tap a clarification card to draw it and refine the reading.</div>
                `}
            </div>
        `;
    }

    private _onReveal(allowed: boolean): void {
        if (!allowed || this.disabled) return;
        this.dispatchEvent(new CustomEvent('reveal', { bubbles: true, composed: true }));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'clarification-cards': ClarificationCards;
    }
}
