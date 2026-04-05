import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { sharedStyles } from '../styles/shared.js';
import { cardBackSvg, getCardArt } from './card-art-registry.js';

type CardFace = 'back' | 'front';
type CardSize = 'spread' | 'compact' | 'insight';

@customElement('tarot-card')
export class TarotCard extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            :host {
                display: inline-block;
                touch-action: manipulation;
                -webkit-touch-callout: none;
            }

            .card-shell {
                position: relative;
                width: var(--card-width, 110px);
                height: var(--card-height, 180px);
                border-radius: 10px;
                transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
                user-select: none;
                -webkit-user-select: none;
            }

            .card-shell.can-activate {
                cursor: pointer;
            }

            .card-shell.can-activate:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
            }

            .card-frame {
                width: 100%;
                height: 100%;
                border-radius: 10px;
                overflow: hidden;
                border: 1px solid var(--border);
                background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08));
            }

            .card-frame svg {
                width: 100%;
                height: 100%;
                display: block;
            }

            .card-meta {
                margin-top: 0.45em;
                text-align: center;
                min-height: 2.2em;
            }

            .card-name {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 0.8em;
                line-height: 1.2;
            }

            .card-position {
                color: var(--text-dim);
                font-size: 0.7em;
                margin-top: 0.2em;
            }

            .card-reversed {
                color: var(--accent);
                font-size: 0.65em;
                margin-top: 0.2em;
            }

            :host([size='compact']) .card-shell {
                --card-width: 78px;
                --card-height: 126px;
            }

            :host([size='insight']) .card-shell {
                --card-width: 92px;
                --card-height: 150px;
            }

            .preview-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(8, 5, 16, 0.72);
                backdrop-filter: blur(6px);
                z-index: 200;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 5vh 5vw;
                pointer-events: none;
            }

            .preview-card {
                width: var(--preview-width, 320px);
                height: var(--preview-height, 552px);
                border-radius: 18px;
                overflow: hidden;
                border: 1px solid rgba(240, 216, 120, 0.5);
                box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
                background: var(--bg-card);
                transform: translateY(-2vh) scale(1);
                transform-origin: center center;
                animation: preview-grow 220ms ease-out both;
            }

            .preview-card.closing {
                animation: preview-shrink 240ms ease-in both;
            }

            .preview-card svg {
                width: 100%;
                height: 100%;
                display: block;
            }

            @keyframes preview-grow {
                from {
                    opacity: 0;
                    transform: translateY(2vh) scale(0.88);
                }
                to {
                    opacity: 1;
                    transform: translateY(-2vh) scale(1);
                }
            }

            @keyframes preview-shrink {
                from {
                    opacity: 1;
                    transform: translateY(-2vh) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translateY(1vh) scale(0.84);
                }
            }
        `,
    ];

    @property() cardName: string | null = null;
    @property() position = '';
    @property({ type: Boolean }) reversed = false;
    @property() face: CardFace = 'back';
    @property() size: CardSize = 'spread';
    @property({ type: Boolean, attribute: 'preview-enabled' }) previewEnabled = false;
    @property({ type: Boolean, attribute: 'activate-on-tap' }) activateOnTap = false;
    @property({ type: Boolean, attribute: 'show-meta' }) showMeta = false;
    @property({ type: Number }) width = 110;
    @property({ type: Number }) height = 180;
    @property({ type: Number, attribute: 'tilt-deg' }) tiltDeg = 0;
    @property({ type: Number, attribute: 'offset-y' }) offsetY = 0;
    @property({ type: Number, attribute: 'long-press-ms' }) longPressMs = 260;
    @property({ type: Boolean, reflect: true }) interactive = false;

    @state() private previewState: 'closed' | 'open' | 'closing' = 'closed';
    @state() private previewWidth = 320;
    @state() private previewHeight = 552;

    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    private previewReleaseTimer: ReturnType<typeof setTimeout> | null = null;
    private previewCloseTimer: ReturnType<typeof setTimeout> | null = null;
    private suppressActivate = false;

    override render() {
        const previewMarkup = this.previewState !== 'closed'
            ? html`
                <div class="preview-backdrop">
                    <div
                        class="preview-card ${this.previewState === 'closing' ? 'closing' : ''}"
                        style=${`--preview-width:${this.previewWidth}px; --preview-height:${this.previewHeight}px;`}
                    >${unsafeHTML(this.renderFaceSvg(420, 725))}</div>
                </div>
            `
            : nothing;

        return html`
            <div
                class="card-shell ${this.activateOnTap ? 'can-activate' : ''}"
                style=${`--card-width:${this.width}px; --card-height:${this.height}px; transform: rotate(${this.tiltDeg}deg) translateY(${this.offsetY}px);`}
                @pointerdown=${this.onPointerDown}
                @pointerup=${this.onPointerUp}
                @pointerleave=${this.onPointerCancel}
                @pointercancel=${this.onPointerCancel}
                @contextmenu=${this.onContextMenu}
                @click=${this.onClick}
            >
                <div class="card-frame">${unsafeHTML(this.renderFaceSvg(200, 345))}</div>
                ${this.showMeta && this.face === 'front' ? html`
                    <div class="card-meta">
                        <div class="card-name">${this.cardName ?? 'Unknown'}</div>
                        ${this.position ? html`<div class="card-position">${this.position}</div>` : nothing}
                        ${this.reversed ? html`<div class="card-reversed">Reversed</div>` : nothing}
                    </div>
                ` : nothing}
            </div>
            ${previewMarkup}
        `;
    }

    private renderFaceSvg(width: number, height: number): string {
        if (this.face === 'front' && this.cardName) {
            return getCardArt(this.cardName, width, height) ?? cardBackSvg(width, height);
        }

        return cardBackSvg(width, height);
    }

    private onPointerDown(): void {
        if (!this.previewEnabled) {
            return;
        }

        this.clearLongPressTimer();
        this.clearPreviewCloseTimers();
        this.longPressTimer = setTimeout(() => {
            this.openPreview();
            this.suppressActivate = true;
        }, this.longPressMs);
    }

    private onPointerUp(): void {
        this.clearLongPressTimer();
        if (this.previewState === 'open') {
            this.schedulePreviewClose();
        }
    }

    private onPointerCancel(): void {
        this.clearLongPressTimer();
        if (this.previewState === 'open') {
            this.schedulePreviewClose();
        }
    }

    private onContextMenu(event: Event): void {
        if (!this.previewEnabled) {
            return;
        }

        event.preventDefault();
    }

    private onClick(event: Event): void {
        if (!this.activateOnTap) {
            if (this.suppressActivate) {
                event.preventDefault();
                event.stopPropagation();
            }
            return;
        }

        if (this.suppressActivate) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        this.dispatchEvent(new CustomEvent('card-activate', {
            bubbles: true,
            composed: true,
        }));
    }

    private clearLongPressTimer(): void {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    private openPreview(): void {
        this.computePreviewSize();
        this.previewState = 'open';
    }

    private schedulePreviewClose(): void {
        this.clearPreviewCloseTimers();
        this.previewReleaseTimer = setTimeout(() => {
            this.previewState = 'closing';
            this.previewCloseTimer = setTimeout(() => {
                this.previewState = 'closed';
                this.suppressActivate = false;
            }, 240);
        }, 1000);
    }

    private clearPreviewCloseTimers(): void {
        if (this.previewReleaseTimer) {
            clearTimeout(this.previewReleaseTimer);
            this.previewReleaseTimer = null;
        }
        if (this.previewCloseTimer) {
            clearTimeout(this.previewCloseTimer);
            this.previewCloseTimer = null;
        }
        if (this.previewState === 'closing') {
            this.previewState = 'open';
        }
    }

    private computePreviewSize(): void {
        const aspectRatio = 200 / 345;
        const maxWidth = window.innerWidth * 0.84;
        const maxHeight = window.innerHeight * 0.76;
        const width = Math.min(maxWidth, maxHeight * aspectRatio);
        this.previewWidth = Math.max(180, Math.round(width));
        this.previewHeight = Math.round(this.previewWidth / aspectRatio);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.clearLongPressTimer();
        this.clearPreviewCloseTimers();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'tarot-card': TarotCard;
    }
}
