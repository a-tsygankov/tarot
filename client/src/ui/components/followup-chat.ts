import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';
import './dictation-input.js';
import type { DictationInput } from './dictation-input.js';

interface ChatMessage {
    role: 'user' | 'oracle';
    text: string;
    timestamp: number;
}

/**
 * Follow-up Q&A chat interface — digest-only history in prompts.
 */
@customElement('followup-chat')
export class FollowupChat extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                /* Reserve room for top safe area (Dynamic Island / notch),
                   bottom bar (~60px) and bottom safe area (home indicator).
                   The parent .screen already applies its own horizontal and
                   bottom safe-area padding, so we only need to size the host. */
                height: calc(
                    100dvh
                    - 60px
                    - env(safe-area-inset-top, 0px)
                    - env(safe-area-inset-bottom, 0px)
                );
            }

            .chat-header {
                padding: 0.6em 0;
                display: flex;
                align-items: center;
                gap: 0.5em;
            }

            .messages {
                flex: 1;
                overflow-y: auto;
                padding: 0.5em 0;
                display: flex;
                flex-direction: column;
                gap: 0.8em;
            }

            .message {
                max-width: 85%;
                padding: 0.8em 1em;
                border-radius: 12px;
                line-height: 1.5;
                font-family: var(--font-reading, 'Palatino Linotype', Palatino, Georgia, serif);
                font-style: var(--font-reading-style, italic);
                font-size: var(--font-reading-size, 0.92em);
                animation: fadeIn 0.3s ease-out;
            }

            /* Seeker's own messages: normal style so the user can read their question cleanly. */
            .message.user {
                align-self: flex-end;
                background: var(--purple-dim);
                border: 1px solid var(--purple);
                color: var(--text);
                border-bottom-right-radius: 4px;
                font-style: normal;
            }

            .message.oracle {
                align-self: flex-start;
                background: var(--bg-card);
                border: 1px solid var(--border);
                color: var(--text);
                border-bottom-left-radius: 4px;
            }

            .message.oracle .oracle-label {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 0.8em;
                margin-bottom: 0.3em;
            }

            .typing-indicator {
                align-self: flex-start;
                padding: 0.8em 1em;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 12px;
                border-bottom-left-radius: 4px;
                display: flex;
                gap: 0.3em;
                align-items: center;
            }

            .typing-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--gold-dim);
                animation: typingBounce 1.2s ease-in-out infinite;
            }

            .typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .typing-dot:nth-child(3) { animation-delay: 0.4s; }

            @keyframes typingBounce {
                0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                40% { transform: translateY(-4px); opacity: 1; }
            }

            .input-bar {
                padding: 0.6em 0;
                border-top: 1px solid var(--border);
            }

            .turn-limit {
                text-align: center;
                color: var(--text-dim);
                font-size: 0.85em;
                padding: 0.5em;
            }
        `,
    ];

    @property({ attribute: false }) services!: AppServices;

    @state() private _messages: ChatMessage[] = [];
    @state() private _input = '';
    @state() private _loading = false;

    @query('.messages') private _messagesEl!: HTMLElement;
    @query('dictation-input') private _dictationEl?: DictationInput;

    private get _canAsk(): boolean {
        const game = this.services?.gameContext;
        if (!game) return false;
        return game.turnCount < (this.services.config.maxFollowUpsPerGame + 1);
    }

    private get _sttLang(): string {
        return this.services.config.languages.find(
            l => l.code === this.services.userContext.language,
        )?.sttLang ?? 'en-US';
    }

    override render() {
        return html`
            <div class="chat-header">
                <button class="btn btn-ghost" @click=${this._goBack}>← Reading</button>
                <span class="dim-text" style="margin-left:auto">
                    Turn ${this.services?.gameContext?.turnCount ?? 0}
                </span>
            </div>

            <div class="messages">
                ${this._messages.map(msg => html`
                    <div class="message ${msg.role}">
                        ${msg.role === 'oracle' ? html`<div class="oracle-label">✦ Oracle</div>` : nothing}
                        ${msg.text}
                    </div>
                `)}

                ${this._loading ? html`
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                ` : nothing}
            </div>

            ${this._canAsk ? html`
                <div class="input-bar">
                    <dictation-input
                        .sttService=${this.services?.sttService}
                        .sttLang=${this._sttLang}
                        .value=${this._input}
                        .placeholder=${'Ask the Oracle...'}
                        ?disabled=${this._loading}
                        show-send
                        @input-change=${(e: CustomEvent) => { this._input = e.detail.value; }}
                        @submit=${(e: CustomEvent) => this._send(e.detail.value)}
                    ></dictation-input>
                </div>
            ` : html`
                <div class="turn-limit">
                    Conversation limit reached. Start a new reading for more guidance.
                </div>
            `}
        `;
    }

    private async _send(rawText: string): Promise<void> {
        const text = rawText.trim();
        if (!text || this._loading) return;

        // Mic is already stopped by dictation-input on submit; call again defensively.
        this._dictationEl?.stopDictation();

        this._input = '';
        this._messages = [...this._messages, {
            role: 'user',
            text,
            timestamp: Date.now(),
        }];
        this._scrollToBottom();

        this._loading = true;
        this.dispatchEvent(new CustomEvent('loading', { detail: true }));

        try {
            const response = await this.services.apiService.askFollowUpAsync(
                this.services.gameContext,
                text,
            );

            this.services.gameContext.addQA(
                response.questionDigest,
                response.answerDigest,
            );

            if (response.userContextDelta) {
                this.services.userContext.applyAiUpdate(response.userContextDelta);
            }
            this.services.userContext.applyUserTraits(response.userTraits);

            this._messages = [...this._messages, {
                role: 'oracle',
                text: response.answer,
                timestamp: Date.now(),
            }];
        } catch (err) {
            this._messages = [...this._messages, {
                role: 'oracle',
                text: `I'm sorry, I couldn't respond. ${err instanceof Error ? err.message : 'Please try again.'}`,
                timestamp: Date.now(),
            }];
        } finally {
            this._loading = false;
            this.dispatchEvent(new CustomEvent('loading', { detail: false }));
            this._scrollToBottom();
        }
    }

    private _scrollToBottom(): void {
        requestAnimationFrame(() => {
            if (this._messagesEl) {
                this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
            }
        });
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        // Belt-and-suspenders: dictation-input has its own disconnect handler,
        // but call through the service directly too in case the child was
        // removed before us.
        this.services?.sttService?.stop();
    }

    private _goBack(): void {
        this.dispatchEvent(new CustomEvent('back'));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'followup-chat': FollowupChat;
    }
}
