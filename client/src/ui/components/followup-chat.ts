import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';

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
                height: calc(100dvh - 60px);
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
                font-size: 0.92em;
                animation: fadeIn 0.3s ease-out;
            }

            .message.user {
                align-self: flex-end;
                background: var(--purple-dim);
                border: 1px solid var(--purple);
                color: var(--text);
                border-bottom-right-radius: 4px;
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
                display: flex;
                gap: 0.5em;
                padding: 0.6em 0;
                border-top: 1px solid var(--border);
            }

            .chat-input {
                flex: 1;
                padding: 0.7em 1em;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 20px;
                color: var(--text);
                font-family: var(--font-body);
                font-size: 0.92em;
                outline: none;
            }

            .chat-input:focus {
                border-color: var(--gold-dim);
            }

            .chat-input::placeholder {
                color: var(--text-faint);
            }

            .send-btn {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: none;
                background: var(--gold-dim);
                color: var(--bg-deep);
                font-size: 1.1em;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }

            .send-btn:hover:not(:disabled) {
                background: var(--gold);
            }

            .send-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .mic-btn {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: 1px solid var(--border);
                background: transparent;
                color: var(--text-dim);
                font-size: 1.1em;
                cursor: pointer;
                transition: all 0.2s;
            }

            .mic-btn.listening {
                border-color: var(--accent);
                color: var(--accent);
                animation: pulse 1.5s infinite;
            }

            @keyframes pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(200,96,122,0.4); }
                50% { box-shadow: 0 0 0 8px rgba(200,96,122,0); }
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
    @state() private _listening = false;

    @query('.messages') private _messagesEl!: HTMLElement;

    private get _canAsk(): boolean {
        const game = this.services?.gameContext;
        if (!game) return false;
        return game.turnCount < (this.services.config.maxFollowUpsPerGame + 1);
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
                    ${this.services?.sttService?.isAvailable() ? html`
                        <button
                            class="mic-btn ${this._listening ? 'listening' : ''}"
                            @click=${this._toggleMic}
                        >🎤</button>
                    ` : nothing}

                    <input
                        class="chat-input"
                        type="text"
                        placeholder="Ask the Oracle..."
                        .value=${this._input}
                        @input=${(e: InputEvent) => {
                            this._input = (e.target as HTMLInputElement).value;
                        }}
                        @keydown=${(e: KeyboardEvent) => {
                            if (e.key === 'Enter' && !e.shiftKey) this._send();
                        }}
                        ?disabled=${this._loading}
                    />

                    <button
                        class="send-btn"
                        @click=${this._send}
                        ?disabled=${!this._input.trim() || this._loading}
                    >➤</button>
                </div>
            ` : html`
                <div class="turn-limit">
                    Conversation limit reached. Start a new reading for more guidance.
                </div>
            `}
        `;
    }

    private async _send(): Promise<void> {
        const text = this._input.trim();
        if (!text || this._loading) return;

        this._input = '';
        this._messages = [...this._messages, {
            role: 'user',
            text,
            timestamp: Date.now(),
        }];
        this._scrollToBottom();

        this._loading = true;

        try {
            const response = await this.services.apiService.askFollowUpAsync(
                this.services.gameContext,
                text,
            );

            // Store digests in game context (not full text)
            this.services.gameContext.addQA(
                response.questionDigest,
                response.answerDigest,
            );

            if (response.userContextDelta) {
                this.services.userContext.applyAiUpdate(response.userContextDelta);
            }

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

    private _toggleMic(): void {
        const stt = this.services.sttService;

        if (this._listening) {
            stt.stop();
            this._listening = false;
            return;
        }

        this._listening = true;
        const lang = this.services.config.languages.find(
            l => l.code === this.services.userContext.language,
        )?.sttLang ?? 'en-US';

        stt.start(lang, {
            onResult: (text: string) => {
                this._input = text;
                this._listening = false;
            },
            onError: (err: string) => {
                console.warn('STT error:', err);
                this._listening = false;
            },
            onEnd: () => {
                this._listening = false;
            },
        });
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
