import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';
import { VoiceModeService } from '../../services/VoiceMode/VoiceModeService.js';
import type { VoiceModeState } from '../../services/VoiceMode/VoiceModeService.js';

interface VoiceEntry {
    role: 'user' | 'oracle' | 'status';
    text: string;
}

/**
 * Voice Mode UI — full-screen hands-free conversation overlay.
 */
@customElement('voice-mode')
export class VoiceMode extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            :host {
                position: fixed;
                inset: 0;
                background: var(--bg-deep);
                z-index: 100;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .voice-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1em;
                border-bottom: 1px solid var(--border);
            }

            .voice-title {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 1.1em;
            }

            .transcript-area {
                flex: 1;
                overflow-y: auto;
                padding: 1em;
                display: flex;
                flex-direction: column;
                gap: 0.8em;
            }

            .voice-entry {
                padding: 0.6em 1em;
                border-radius: 10px;
                font-size: 0.92em;
                line-height: 1.5;
                animation: fadeIn 0.3s ease-out;
            }

            .voice-entry.user {
                align-self: flex-end;
                max-width: 80%;
                background: var(--purple-dim);
                border: 1px solid var(--purple);
                color: var(--text);
            }

            .voice-entry.oracle {
                align-self: flex-start;
                max-width: 85%;
                background: var(--bg-card);
                border: 1px solid var(--border);
            }

            .voice-entry.status {
                align-self: center;
                color: var(--text-faint);
                font-size: 0.8em;
                font-style: italic;
            }

            .voice-controls {
                padding: 1.5em;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1em;
                border-top: 1px solid var(--border);
            }

            .orb-container {
                position: relative;
                width: 100px;
                height: 100px;
            }

            .orb {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 2px solid var(--gold-dim);
                background: var(--bg-card);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2em;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .orb.listening {
                border-color: var(--accent);
                box-shadow: 0 0 30px rgba(200,96,122,0.3);
                animation: orbPulse 2s ease-in-out infinite;
            }

            .orb.processing {
                border-color: var(--purple);
                animation: orbSpin 1.5s linear infinite;
            }

            .orb.speaking {
                border-color: var(--gold);
                box-shadow: 0 0 30px rgba(201,168,76,0.3);
                animation: orbGlow 1s ease-in-out infinite;
            }

            @keyframes orbPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            @keyframes orbSpin {
                from { border-color: var(--purple-dim); }
                50% { border-color: var(--purple-light); }
                to { border-color: var(--purple-dim); }
            }

            @keyframes orbGlow {
                0%, 100% { box-shadow: 0 0 20px rgba(201,168,76,0.2); }
                50% { box-shadow: 0 0 40px rgba(201,168,76,0.4); }
            }

            .state-label {
                color: var(--text-dim);
                font-size: 0.9em;
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
        `,
    ];

    @property({ attribute: false }) services!: AppServices;

    @state() private _voiceState: VoiceModeState = 'idle';
    @state() private _entries: VoiceEntry[] = [];
    @state() private _active = false;

    private _voiceService: VoiceModeService | null = null;

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._voiceService?.stop();
    }

    override render() {
        return html`
            <div class="voice-header">
                <span class="voice-title">✦ Voice Mode</span>
                <button class="btn btn-ghost" @click=${this._exit}>✕ Exit</button>
            </div>

            <div class="transcript-area">
                ${this._entries.length === 0 ? html`
                    <div class="voice-entry status">
                        Tap the orb to begin speaking with the Oracle.
                    </div>
                ` : nothing}

                ${this._entries.map(e => html`
                    <div class="voice-entry ${e.role}">
                        ${e.role === 'oracle' ? html`<strong style="color:var(--gold)">✦</strong> ` : nothing}
                        ${e.text}
                    </div>
                `)}
            </div>

            <div class="voice-controls">
                <div class="orb-container">
                    <div
                        class="orb ${this._voiceState}"
                        @click=${this._toggleVoice}
                    >
                        ${this._orbIcon}
                    </div>
                </div>
                <div class="state-label">${this._stateLabel}</div>
            </div>
        `;
    }

    private get _orbIcon(): string {
        switch (this._voiceState) {
            case 'listening': return '🎤';
            case 'processing': return '✦';
            case 'speaking': return '🔊';
            default: return '🎤';
        }
    }

    private get _stateLabel(): string {
        switch (this._voiceState) {
            case 'listening': return 'Listening...';
            case 'processing': return 'Oracle is thinking...';
            case 'speaking': return 'Oracle speaks...';
            default: return 'Tap to start';
        }
    }

    private _toggleVoice(): void {
        if (this._active) {
            this._voiceService?.stop();
            this._active = false;
            this._voiceState = 'idle';
            return;
        }

        if (!this.services) return;

        const lang = this.services.config.languages.find(
            l => l.code === this.services.userContext.language,
        )?.sttLang ?? 'en-US';

        this._voiceService = new VoiceModeService(
            this.services.sttService,
            this.services.ttsService,
            this.services.apiService,
            this.services.userContext,
            lang,
        );

        this._active = true;
        this._voiceService.start(this.services.gameContext, {
            onStateChange: (state) => {
                this._voiceState = state;
            },
            onUserTranscript: (text) => {
                this._entries = [...this._entries, { role: 'user', text }];
                this._scrollToBottom();
            },
            onOracleResponse: (text) => {
                this._entries = [...this._entries, { role: 'oracle', text }];
                this._scrollToBottom();
            },
            onError: (error) => {
                this._entries = [...this._entries, { role: 'status', text: error }];
            },
        });
    }

    private _scrollToBottom(): void {
        requestAnimationFrame(() => {
            const area = this.shadowRoot?.querySelector('.transcript-area');
            if (area) area.scrollTop = area.scrollHeight;
        });
    }

    private _exit(): void {
        this._voiceService?.stop();
        this._active = false;
        this._voiceState = 'idle';
        this.dispatchEvent(new CustomEvent('exit-voice'));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'voice-mode': VoiceMode;
    }
}
