import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { ISttService } from '../../services/Stt/ISttService.js';

/**
 * Text input with optional microphone dictation and optional send button.
 *
 * Used by both the initial question field (card-spread) and the follow-up
 * chat input. The component owns its own STT session lifecycle and guarantees
 * the microphone is released on teardown — including the phone/Safari case
 * where the component can be unmounted mid-recognition.
 *
 * Microphone release is independent of the send button: whether or not
 * `showSend` is true, the mic is stopped on:
 *   - `disconnectedCallback`
 *   - `pagehide` / `visibilitychange(hidden)` on the window (phones closing the tab)
 *   - `beforeunload`
 *   - external `.stopDictation()` calls
 *
 * Events emitted:
 *   - `input-change` → detail: { value: string }  (fires as the user types or dictates)
 *   - `submit`        → detail: { value: string } (Enter key; or Send button click if shown)
 *   - `dictation-state` → detail: { listening: boolean, status: string }
 */
@customElement('dictation-input')
export class DictationInput extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            :host {
                display: block;
                width: 100%;
            }

            .wrap {
                display: flex;
                gap: 0.5em;
                align-items: center;
            }

            input {
                flex: 1;
                min-width: 0;
                box-sizing: border-box;
                padding: 0.7em 0.9em;
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
            }

            input:focus {
                border-color: var(--gold-dim);
                box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.08);
            }

            input::placeholder {
                color: var(--text-faint);
            }

            input:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            /* Circular control buttons share the same sizing for visual unity. */
            .mic-btn,
            .send-btn {
                flex-shrink: 0;
                width: 2.8em;
                height: 2.8em;
                border-radius: 999px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1em;
                padding: 0;
                transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
            }

            .mic-btn {
                border: 1px solid var(--border);
                background: rgba(15, 9, 26, 0.88);
                color: var(--gold);
            }

            .mic-btn:hover:not(:disabled) {
                transform: translateY(-1px);
                border-color: var(--gold-dim);
            }

            .mic-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .mic-btn.listening {
                background: rgba(201, 168, 76, 0.14);
                border-color: var(--gold);
                box-shadow: 0 0 0 5px rgba(201, 168, 76, 0.08);
            }

            .send-btn {
                border: none;
                background: var(--gold-dim);
                color: var(--bg-deep);
            }

            .send-btn:hover:not(:disabled) {
                background: var(--gold);
            }

            .send-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .status {
                color: var(--text-faint);
                font-size: 0.75em;
                min-height: 1.1em;
                margin-top: 0.35em;
            }
        `,
    ];

    /** STT service (required for dictation — component still works for text-only if omitted) */
    @property({ attribute: false }) sttService?: ISttService;

    /** BCP-47 language tag for recognition (defaults to en-US) */
    @property() sttLang = 'en-US';

    /** Input value (controlled) */
    @property() value = '';

    /** Placeholder text */
    @property() placeholder = '';

    /** Disable the input (typically while a reading is loading) */
    @property({ type: Boolean }) disabled = false;

    /** Show a circular send button to the right (Enter also submits regardless) */
    @property({ type: Boolean, attribute: 'show-send' }) showSend = false;

    /** Disable the send button (independent from mic). If omitted, send is disabled when input is empty. */
    @property({ type: Boolean, attribute: 'send-disabled' }) sendDisabled = false;

    /** Default idle hint when the input is focused and STT is available */
    @property({ attribute: 'idle-hint' }) idleHint = '';

    @state() private _listening = false;
    @state() private _status = '';

    @query('input') private _inputEl!: HTMLInputElement;

    /** Captured at start; interim/final transcripts are merged onto this base */
    private _sttBase = '';
    private _pageHideHandler?: () => void;
    private _visibilityHandler?: () => void;
    private _beforeUnloadHandler?: () => void;

    /** Public: allow parent to force-stop dictation (e.g. user tapped a chip) */
    stopDictation(): void {
        this._releaseMic();
    }

    /** Public: focus the underlying input */
    override focus(): void {
        this._inputEl?.focus();
    }

    override connectedCallback(): void {
        super.connectedCallback();

        // Phones/Safari: if the page hides or the tab is closed mid-recognition,
        // the element may be torn down without disconnectedCallback firing reliably.
        // Register window-level fallbacks so the mic is always released.
        this._pageHideHandler = () => this._releaseMic();
        this._visibilityHandler = () => {
            if (document.visibilityState === 'hidden') this._releaseMic();
        };
        this._beforeUnloadHandler = () => this._releaseMic();

        window.addEventListener('pagehide', this._pageHideHandler);
        document.addEventListener('visibilitychange', this._visibilityHandler);
        window.addEventListener('beforeunload', this._beforeUnloadHandler);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._releaseMic();

        if (this._pageHideHandler) {
            window.removeEventListener('pagehide', this._pageHideHandler);
            this._pageHideHandler = undefined;
        }
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = undefined;
        }
        if (this._beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this._beforeUnloadHandler);
            this._beforeUnloadHandler = undefined;
        }
    }

    override render() {
        const sttAvailable = this.sttService?.isAvailable() === true;
        const showMic = sttAvailable;
        const sendIsDisabled = this.sendDisabled || !this.value.trim() || this.disabled;

        return html`
            <div class="wrap">
                ${showMic ? html`
                    <button
                        type="button"
                        class="mic-btn ${this._listening ? 'listening' : ''}"
                        title=${this._listening ? 'Stop dictation' : 'Speak'}
                        ?disabled=${this.disabled}
                        @click=${this._onMicClick}
                    >${this._listening ? '■' : '🎙'}</button>
                ` : nothing}
                <input
                    type="text"
                    .value=${this.value}
                    placeholder=${this.placeholder}
                    ?disabled=${this.disabled}
                    @focus=${this._onFocus}
                    @input=${this._onInput}
                    @keydown=${this._onKeyDown}
                />
                ${this.showSend ? html`
                    <button
                        type="button"
                        class="send-btn"
                        ?disabled=${sendIsDisabled}
                        @click=${this._onSendClick}
                        title="Send"
                    >➤</button>
                ` : nothing}
            </div>
            <div class="status">${this._status}</div>
        `;
    }

    private _onFocus(): void {
        if (this.sttService?.isAvailable() && !this._status && this.idleHint) {
            this._setStatus(this.idleHint);
        }
    }

    private _onInput(e: InputEvent): void {
        const newValue = (e.target as HTMLInputElement).value;
        this.value = newValue;
        // Typing during dictation replaces the STT base, so transcripts merge onto what the user actually typed.
        if (this._listening) {
            this._sttBase = newValue;
        }
        this.dispatchEvent(new CustomEvent('input-change', {
            detail: { value: newValue },
            bubbles: true,
            composed: true,
        }));
    }

    private _onKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this._submit();
        }
    }

    private _onSendClick(): void {
        this._submit();
    }

    private _submit(): void {
        const trimmed = this.value.trim();
        if (!trimmed || this.disabled) return;
        // Stop mic on submit; mic release is NOT gated on whether Send exists
        this._releaseMic();
        this.dispatchEvent(new CustomEvent('submit', {
            detail: { value: this.value },
            bubbles: true,
            composed: true,
        }));
    }

    private _onMicClick(): void {
        if (!this.sttService?.isAvailable()) {
            this._setStatus('Speech input is not available in this browser.');
            return;
        }
        if (this._listening) {
            this._releaseMic();
            return;
        }
        this._startMic();
    }

    private _startMic(): void {
        if (!this.sttService) return;

        this._sttBase = this.value.trim();
        this._setStatus('Listening...');
        this._listening = true;

        try {
            this.sttService.start(this.sttLang, {
                onStart: () => {
                    this._listening = true;
                },
                onInterim: (transcript) => {
                    const clean = transcript.trim();
                    this._applyTranscript(clean);
                    this._setStatus(clean ? `Listening: ${clean}` : 'Listening...');
                },
                onResult: (transcript) => {
                    const clean = transcript.trim();
                    this._applyTranscript(clean);
                    this._listening = false;
                    this._setStatus(clean ? 'Captured.' : '');
                    // Ensure the recogniser fully releases the mic; some browsers keep it
                    // warm for a moment after `onResult` if we don't stop explicitly.
                    this.sttService?.stop();
                    this.updateComplete.then(() => this._inputEl?.focus());
                },
                onEnd: () => {
                    this._listening = false;
                    if (this._status.startsWith('Listening')) this._setStatus('');
                },
                onError: (error) => {
                    this._listening = false;
                    this._setStatus(`Speech input error: ${error}`);
                    this.sttService?.stop();
                },
            });
        } catch (err) {
            this._listening = false;
            this._setStatus(err instanceof Error ? err.message : 'Failed to start dictation');
        }
    }

    /** Release the mic no matter what state we're in. Safe to call multiple times. */
    private _releaseMic(): void {
        // Always call stop() even if we think we're not listening — the service may
        // still hold the hardware (e.g. if onend never fired on iOS after a navigation).
        try {
            this.sttService?.stop();
        } catch {
            // best effort
        }
        if (this._listening) {
            this._listening = false;
            if (this._status.startsWith('Listening')) this._setStatus('');
            this.dispatchEvent(new CustomEvent('dictation-state', {
                detail: { listening: false, status: this._status },
                bubbles: true,
                composed: true,
            }));
        }
    }

    private _applyTranscript(transcript: string): void {
        const merged = !transcript
            ? this._sttBase
            : [this._sttBase, transcript].filter(Boolean).join(this._sttBase ? ' ' : '');
        if (merged !== this.value) {
            this.value = merged;
            this.dispatchEvent(new CustomEvent('input-change', {
                detail: { value: merged },
                bubbles: true,
                composed: true,
            }));
        }
    }

    private _setStatus(status: string): void {
        this._status = status;
        this.dispatchEvent(new CustomEvent('dictation-state', {
            detail: { listening: this._listening, status },
            bubbles: true,
            composed: true,
        }));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'dictation-input': DictationInput;
    }
}
