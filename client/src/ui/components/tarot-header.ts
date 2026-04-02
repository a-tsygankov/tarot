import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppScreen } from './tarot-app.js';

/**
 * Top navigation bar — app title + nav buttons.
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
            }

            .nav-actions {
                display: flex;
                gap: 0.4em;
            }
        `,
    ];

    @property({ type: String }) screen: AppScreen = 'home';

    override render() {
        return html`
            <div class="logo" @click=${this._goHome}>✦ Tarot</div>
            <div class="nav-actions">
                ${this.screen !== 'home' ? html`
                    <button class="btn btn-ghost" @click=${this._goHome}>Home</button>
                ` : ''}
                <button class="btn btn-ghost" @click=${this._openSettings}>⚙</button>
            </div>
        `;
    }

    private _goHome(): void {
        this.dispatchEvent(new CustomEvent<AppScreen>('navigate', {
            detail: 'home',
            bubbles: true,
            composed: true,
        }));
    }

    private _openSettings(): void {
        this.dispatchEvent(new CustomEvent<AppScreen>('navigate', {
            detail: 'settings',
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
