import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';
import { ReadingImageExporter } from '../../services/Export/ReadingImageExporter.js';
import './tarot-card.js';

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

            .card-reading-body {
                display: block;
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
                font-size: var(--font-reading-size, 0.92em);
            }

            .insight-card {
                float: inline-start;
                margin: 0.15em 0.85em 0.45em 0;
                shape-margin: 0.6em;
            }

            .card-reading::after {
                content: '';
                display: block;
                clear: both;
            }

            .overall-section {
                position: relative;
                padding: 1.2em;
                background: linear-gradient(135deg, var(--bg-card), var(--purple-dim));
                border: 1px solid var(--gold-dim);
                border-radius: 10px;
                animation: fadeIn 0.5s ease-out 0.5s both;
                overflow: visible;
                cursor: pointer;
                touch-action: manipulation;
            }

            .overall-title {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 1.1em;
                margin-bottom: 0.6em;
            }

            .overall-text {
                line-height: 1.7;
                font-size: var(--font-reading-size, 0.95em);
            }

            .overall-actions {
                position: absolute;
                top: -18px;
                right: 14px;
                display: flex;
                gap: 0.45em;
                z-index: 2;
            }

            .overall-action {
                width: 42px;
                height: 42px;
                border-radius: 999px;
                border: 1px solid rgba(201, 168, 76, 0.72);
                background: linear-gradient(180deg, rgba(15, 9, 26, 0.98), rgba(50, 28, 72, 0.96));
                color: var(--gold);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
            }

            .overall-action:hover {
                transform: translateY(-1px);
                border-color: var(--gold);
                box-shadow: 0 14px 30px rgba(0, 0, 0, 0.32);
            }

            .overall-action svg {
                width: 20px;
                height: 20px;
                stroke: currentColor;
                fill: none;
                stroke-width: 1.8;
                stroke-linecap: round;
                stroke-linejoin: round;
            }

            .copy-tooltip {
                position: absolute;
                top: -54px;
                right: 10px;
                padding: 0.35em 0.7em;
                border-radius: 999px;
                border: 1px solid rgba(201, 168, 76, 0.45);
                background: rgba(9, 6, 18, 0.96);
                color: var(--gold);
                font-size: 0.78em;
                white-space: nowrap;
                box-shadow: 0 12px 26px rgba(0, 0, 0, 0.28);
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
    @property({ type: Number }) version = 0;

    @state() private _speaking = false;
    @state() private _paused = false;
    @state() private _ttsStatus = '';
    @state() private _copyTooltip = false;

    private _copyTooltipTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly _readingImageExporter = new ReadingImageExporter();

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
        const dealtCards = this._game.cards ?? [];

        return html`
            <div class="reading-container">
                ${cards.map((card, index) => {
                    const dealt = dealtCards[index];
                    return html`
                    <div class="card-reading">
                        <div class="card-reading-header">
                            <span class="card-reading-position">${card.position}</span>
                            <span class="card-reading-name">— ${card.name}</span>
                        </div>
                        <div class="card-reading-body">
                            <div class="insight-card">
                                <tarot-card
                                    face="front"
                                    size="insight"
                                    .cardName=${dealt?.name ?? card.name}
                                    .position=${dealt?.position ?? card.position}
                                    .reversed=${dealt?.reversed ?? false}
                                    .previewEnabled=${true}
                                    .audioCueService=${this.services.audioCueService}
                                    .showMeta=${false}
                                    .width=${70}
                                    .height=${114}
                                ></tarot-card>
                            </div>
                            <div class="card-reading-text">${card.reading}</div>
                        </div>
                    </div>
                `})}

                ${overall ? html`
                    <div class="overall-section">
                        <div class="overall-actions">
                            <button class="overall-action" title="Download reading image" @click=${this._downloadReadingImage}>
                                ${this._pictureIcon()}
                            </button>
                            <button class="overall-action" title="Copy reading text" @click=${this._copyOverallReading}>
                                ${this._copyIcon()}
                            </button>
                        </div>
                        ${this._copyTooltip ? html`
                            <div class="copy-tooltip">Text copied to clipboard</div>
                        ` : nothing}
                        <div class="overall-title">Overall Reading</div>
                        <div class="overall-text">${overall}</div>
                    </div>
                ` : nothing}

                <div class="actions-bar">
                    <button class="btn" @click=${this._toggleTts}>
                        ${this._speaking ? (this._paused ? '▶ Resume' : '⏸ Pause') : '🔊 Listen'}
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
        const speech = this.services.speechService;

        if (this._speaking) {
            if (this._paused) {
                speech.resume();
                this._paused = false;
                this._ttsStatus = 'Playing...';
            } else {
                speech.pause();
                this._paused = true;
                this._ttsStatus = 'Paused';
            }
            return;
        }

        const reading = this._game.reading;
        const overall = (reading as any)?.overall ?? '';
        if (!overall) return;

        this._speaking = true;
        this._paused = false;
        this._ttsStatus = 'Loading voice...';

        void speech.speakReadingAsync(overall, this.services.userContext)
            .then(() => {
                this._ttsStatus = '';
            })
            .catch((err) => {
                this._ttsStatus = `TTS: ${err instanceof Error ? err.message : 'unavailable'}`;
            })
            .finally(() => {
                this._speaking = false;
                this._paused = false;
            });
    }

    private _askFollowUp(): void {
        this.dispatchEvent(new CustomEvent('ask-followup'));
    }

    private _enterVoiceMode(): void {
        this.services.speechService.stop();
        this._speaking = false;
        this._paused = false;
        this._ttsStatus = '';
        this.dispatchEvent(new CustomEvent('enter-voice'));
    }

    private _newReading(): void {
        this.services.speechService.stop();
        this._speaking = false;
        this._paused = false;
        this._ttsStatus = '';
        this.dispatchEvent(new CustomEvent('new-reading'));
    }

    private _copyIcon() {
        return html`
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="9" y="8" width="10" height="12" rx="2"></rect>
                <path d="M7 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;
    }

    private _pictureIcon() {
        return html`
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                <circle cx="9" cy="10" r="1.5"></circle>
                <path d="M21 16l-4.5-4.5L9 19"></path>
            </svg>
        `;
    }

    private async _copyOverallReading(event: Event): Promise<void> {
        event.stopPropagation();
        const overall = ((this._game?.reading as any)?.overall as string | undefined) ?? '';
        if (!overall) {
            return;
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(overall);
            } else {
                const area = document.createElement('textarea');
                area.value = overall;
                area.setAttribute('readonly', 'true');
                area.style.position = 'absolute';
                area.style.left = '-9999px';
                document.body.appendChild(area);
                area.select();
                document.execCommand('copy');
                document.body.removeChild(area);
            }

            this._copyTooltip = true;
            if (this._copyTooltipTimer) {
                clearTimeout(this._copyTooltipTimer);
            }
            this._copyTooltipTimer = setTimeout(() => {
                this._copyTooltip = false;
            }, 1000);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    }

    private async _downloadReadingImage(event: Event): Promise<void> {
        event.stopPropagation();
        const game = this._game;
        const reading = game?.reading as any;
        if (!game || !reading?.overall) {
            return;
        }

        try {
            const blob = await this._readingImageExporter.exportBlob({
                title: 'Tarot Oracle',
                subtitle: 'Overall Reading',
                overallReading: String(reading.overall),
                cards: (game.cards ?? []).map(card => ({
                    name: card.name,
                    position: card.position,
                    reversed: card.reversed,
                })),
            });
            if (!blob) {
                return;
            }

            const fileName = `tarot-reading-${new Date().toISOString().slice(0, 10)}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            const shareCapable = typeof navigator.canShare === 'function'
                && navigator.canShare({ files: [file] });

            if (shareCapable && typeof navigator.share === 'function') {
                await navigator.share({
                    files: [file],
                    title: 'Tarot Oracle Reading',
                    text: 'Tarot Oracle reading',
                });
            } else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
        } catch (error) {
            console.error('Reading image export failed:', error);
        }
    }


    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.services?.speechService.stop();
        if (this._copyTooltipTimer) {
            clearTimeout(this._copyTooltipTimer);
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'reading-display': ReadingDisplay;
    }
}
