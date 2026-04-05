import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import { CONFIG } from '../../app/config.js';
import type { AppScreen } from './tarot-app.js';

/**
 * Top navigation bar — app title + nav buttons.
 * Triple-tap on logo toggles debug mode (swaps coffee link for console).
 */
@customElement('tarot-header')
export class TarotHeader extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            :host {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.8em 1em;
                background: var(--bg-deep);
                border-bottom: 1px solid var(--border);
            }

            .logo {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 1.15em;
                letter-spacing: 0.05em;
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
            }

            .nav-actions {
                display: flex;
                gap: 0.4em;
            }
        `,
    ];

    @property({ type: String }) screen: AppScreen = 'home';
    @state() private _tapCount = 0;
    private _tapTimer: ReturnType<typeof setTimeout> | null = null;

    override render() {
        return html`
            <div class="logo" @click=${this._onLogoTap}>✦ Tarot</div>
            <div class="nav-actions">
                ${this.screen !== 'home' ? html`
                    <button class="btn btn-ghost" @click=${this._goHome}>Home</button>
                ` : ''}
                <button class="btn btn-ghost" @click=${this._openSettings}>⚙</button>
            </div>
        `;
    }

    private _onLogoTap(): void {
        this._tapCount++;

        if (this._tapTimer) clearTimeout(this._tapTimer);
        this._tapTimer = setTimeout(() => {
            this._tapCount = 0;
        }, CONFIG.debugTripleTapMs);

        if (this._tapCount >= 3) {
            if (this._tapTimer) clearTimeout(this._tapTimer);
            this._tapCount = 0;
            this.dispatchEvent(new CustomEvent('toggle-debug', {
                bubbles: true,
                composed: true,
            }));
        }

        // Single tap also navigates home
        if (this._tapCount === 1) {
            // Delay home navigation so triple-tap has time
            setTimeout(() => {
                if (this._tapCount <= 1) {
                    this._goHome();
                }
            }, CONFIG.debugTripleTapMs + 50);
        }
    }

    private _goHome(): void {
        this.dispatchEvent(new CustomEvent<AppScreen>('navigate', {
            detail: 'home',
            bubbles: true,
            composed: true,
        }));
    }

    private _openSettings(): void {
        this.dispatchEvent(new CustomEvent('toggle-settings', {
            bubbles: true,
            composed: true,
        }));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'tarot-header': TarotHeader;
    }
}
