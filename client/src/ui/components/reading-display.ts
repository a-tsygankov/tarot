import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';

/**
 * Displays the AI reading — card-by-card + overall summary.
 * Supports TTS playback and follow-up navigation.
 */
@customElement('reading-display')
export class ReadingDisplay extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            .reading-container {
                display: flex;
                flex-direction: column;
                gap: 1.2em;
                padding-top: 0.5em;
            }

            .card-reading {
                padding: 1em;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 10px;
                animation: fadeIn 0.5s ease-out both;
            }

            .card-reading:nth-child(2) { animation-delay: 0.1s; }
            .card-reading:nth-child(3) { animation-delay: 0.2s; }
            .card-reading:nth-child(4) { animation-delay: 0.3s; }
            .card-reading:nth-child(5) { animation-delay: 0.4s; }

            .card-reading-header {
                display: flex;
                align-items: center;
                gap: 0.5em;
                margin-bottom: 0.6em;
            }

            .card-reading-position {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 0.85em;
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }

            .card-reading-name {
                font-family: var(--font-display);
                color: var(--purple-light);
                font-size: 0.95em;
            }

            .card-reading-text {
                color: var(--text);
                line-height: 1.6;
                font-size: 0.92em;
            }

            .overall-section {
                padding: 1.2em;
                background: linear-gradient(135deg, var(--bg-card), var(--purple-dim));
                border: 1px solid var(--gold-dim);
                border-radius: 10px;
                animation: fadeIn 0.5s ease-out 0.5s both;
            }

            .overall-title {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 1.1em;
                margin-bottom: 0.6em;
            }

            .overall-text {
                line-height: 1.7;
                font-size: 0.95em;
            }

            .actions-bar {
                display: flex;
                gap: 0.6em;
                justify-content: center;
                flex-wrap: wrap;
                padding: 0.5em 0;
            }

            .tts-status {
                text-align: center;
                color: var(--text-dim);
                font-size: 0.8em;
            }
        `,
    ];

    @property({ attribute: false }) services!: AppServices;

    @state() private _speaking = false;
    @state() private _ttsStatus = '';

    private get _game() {
        return this.services?.gameContext;
    }

    override render() {
        if (!this._game?.reading) {
            return html`<div class="center" style="min-height:50vh">
                <div class="dim-text">No reading yet.</div>
            </div>`;
        }

        const reading = this._game.reading;
        const cards = (reading as any).cards as Array<{
            position: string;
            name: string;
            reading: string;
        }> ?? [];
        const overall = (reading as any).overall as string ?? '';

        return html`
            <div class="reading-container">
                ${cards.map(card => html`
                    <div class="card-reading">
                        <div class="card-reading-header">
                            <span class="card-reading-position">${card.position}</span>
                            <span class="card-reading-name">— ${card.name}</span>
                        </div>
                        <div class="card-reading-text">${card.reading}</div>
                    </div>
                `)}

                ${overall ? html`
                    <div class="overall-section">
                        <div class="overall-title">Overall Reading</div>
                        <div class="overall-text">${overall}</div>
                    </div>
                ` : nothing}

                <div class="actions-bar">
                    <button class="btn" @click=${this._toggleTts}>
                        ${this._speaking ? '⏸ Pause' : '🔊 Listen'}
                    </button>
                    <button class="btn btn-primary" @click=${this._askFollowUp}>
                        💬 Ask Follow-up
                    </button>
                    <button class="btn" @click=${this._enterVoiceMode}>
                        🎙 Voice Mode
                    </button>
                    <button class="btn btn-ghost" @click=${this._newReading}>
                        New Reading
                    </button>
                </div>

                ${this._ttsStatus ? html`
                    <div class="tts-status">${this._ttsStatus}</div>
                ` : nothing}
            </div>
        `;
    }

    private async _toggleTts(): Promise<void> {
        const tts = this.services.ttsService;

        if (this._speaking) {
            tts.pause();
            this._speaking = false;
            return;
        }

        const reading = this._game.reading;
        const overall = (reading as any)?.overall ?? '';
        if (!overall) return;

        this._speaking = true;
        this._ttsStatus = 'Loading voice...';

        try {
            const lang = this.services.userContext.language ?? 'ENG';
            await tts.speakAsync(overall, lang);
            this._ttsStatus = '';
        } catch (err) {
            this._ttsStatus = `TTS: ${err instanceof Error ? err.message : 'unavailable'}`;
        } finally {
            this._speaking = false;
        }
    }

    private _askFollowUp(): void {
        this.dispatchEvent(new CustomEvent('ask-followup'));
    }

    private _enterVoiceMode(): void {
        this.services.ttsService.stop();
        this.dispatchEvent(new CustomEvent('enter-voice'));
    }

    private _newReading(): void {
        this.services.ttsService.stop();
        this.dispatchEvent(new CustomEvent('new-reading'));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'reading-display': ReadingDisplay;
    }
}
