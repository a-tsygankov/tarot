import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';

/**
 * Error boundary component — catches and displays errors gracefully.
 * Wrap around any component that might throw during render or async ops.
 */
@customElement('error-boundary')
export class ErrorBoundary extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            .error-panel {
                padding: 1.5em;
                background: var(--bg-card);
                border: 1px solid var(--accent);
                border-radius: 10px;
                text-align: center;
                animation: fadeIn 0.3s ease-out;
            }

            .error-icon {
                font-size: 2em;
                margin-bottom: 0.5em;
            }

            .error-title {
                font-family: var(--font-display);
                color: var(--accent);
                font-size: 1.1em;
                margin-bottom: 0.4em;
            }

            .error-message {
                color: var(--text-dim);
                font-size: 0.9em;
                line-height: 1.5;
                margin-bottom: 1em;
            }

            .error-details {
                color: var(--text-faint);
                font-size: 0.8em;
                font-family: monospace;
                text-align: left;
                padding: 0.6em;
                background: var(--bg-deep);
                border-radius: 4px;
                margin-bottom: 1em;
                max-height: 100px;
                overflow-y: auto;
                word-break: break-all;
            }
        `,
    ];

    @property({ type: String }) errorTitle = 'Something went wrong';
    @property({ type: String }) errorMessage = '';

    @state() private _error: Error | null = null;
    @state() private _showDetails = false;

    /** Programmatically set an error to display. */
    setError(err: Error | string): void {
        this._error = err instanceof Error ? err : new Error(err);
    }

    /** Clear the error state. */
    clear(): void {
        this._error = null;
    }

    override render() {
        if (!this._error && !this.errorMessage) {
            return html`<slot></slot>`;
        }

        const message = this.errorMessage || this._error?.message || 'An unexpected error occurred.';

        return html`
            <div class="error-panel">
                <div class="error-icon">⚠</div>
                <div class="error-title">${this.errorTitle}</div>
                <div class="error-message">${message}</div>

                ${this._error?.stack ? html`
                    <button
                        class="btn btn-ghost"
                        @click=${() => { this._showDetails = !this._showDetails; }}
                    >
                        ${this._showDetails ? 'Hide' : 'Show'} details
                    </button>
                    ${this._showDetails ? html`
                        <div class="error-details">${this._error.stack}</div>
                    ` : ''}
                ` : ''}

                <button class="btn" @click=${this._retry}>Try Again</button>
            </div>
        `;
    }

    private _retry(): void {
        this._error = null;
        this.errorMessage = '';
        this.dispatchEvent(new CustomEvent('retry'));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'error-boundary': ErrorBoundary;
    }
}
