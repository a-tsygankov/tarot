import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';
import { BrowserTtsService } from '../../services/Tts/BrowserTtsService.js';
import { PiperTtsService } from '../../services/Tts/PiperTtsService.js';
import { clearTtsDiagnostics, getTtsDiagnostics, type TtsDiagnosticsEntry } from '../../services/Tts/tts-diagnostics.js';
import { SpeechPreferencesResolver } from '../../services/Speech/SpeechPreferencesResolver.js';

type DebugScenario = 'web-tts' | 'piper-tts' | 'web-stt';

@customElement('tts-debug-panel')
export class TtsDebugPanel extends LitElement {
    static override styles = [sharedStyles, css`
        .root { padding: .5em 0 1.5em; animation: fadeIn .25s ease-out; }
        .panel { background: var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:1em; margin-bottom:1em; }
        .title, .section { font-family: var(--font-display); color: var(--gold); }
        .title { font-size: 1.28em; margin-bottom: .25em; }
        .section { font-size: 1em; margin-bottom: .55em; }
        .subtle { color: var(--text-dim); font-size: .85em; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; gap:.8em; }
        .row { display:flex; gap:.6em; flex-wrap:wrap; align-items:center; }
        .grid { display:grid; grid-template-columns:minmax(140px,auto) 1fr; gap:.35em .9em; font-size:.88em; }
        .k { color: var(--text-faint); }
        .v { color: var(--text); word-break: break-word; }
        .scenario-grid { display:grid; gap:.5em; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
        .scenario-btn {
            padding:.7em .8em;
            border:1px solid var(--border);
            border-radius:10px;
            background:transparent;
            color:var(--text-dim);
            font:inherit;
            text-align:left;
            cursor:pointer;
            transition: all .2s ease;
        }
        .scenario-btn:hover { border-color: var(--gold-dim); color: var(--text); }
        .scenario-btn.selected {
            border-color: var(--gold);
            background: rgba(201,168,76,.08);
            color: var(--gold);
        }
        .scenario-title { display:block; font-family: var(--font-display); color: inherit; margin-bottom:.15em; }
        .scenario-copy { display:block; font-size:.8em; color: var(--text-faint); }
        .field {
            width: 100%;
            min-height: 7.5em;
            box-sizing: border-box;
            padding: .75em .85em;
            background: rgba(255,255,255,.02);
            border: 1px solid var(--border);
            border-radius: 10px;
            color: var(--text);
            font: inherit;
            resize: vertical;
        }
        .field:focus {
            outline: none;
            border-color: var(--gold-dim);
        }
        .logs { display:flex; flex-direction:column; gap:.6em; }
        .entry { border:1px solid rgba(255,255,255,.06); border-radius:10px; padding:.7em .8em; background:rgba(255,255,255,.02); }
        .entry-head { display:flex; gap:.6em; flex-wrap:wrap; align-items:center; margin-bottom:.35em; }
        .badge { padding:.18em .5em; border-radius:999px; border:1px solid var(--border); color: var(--gold); font-size:.78em; }
        pre { margin:0; white-space:pre-wrap; word-break:break-word; font-size:.78em; color:var(--text); font-family:ui-monospace,Consolas,monospace; }
    `];

    @property({ attribute: false }) services!: AppServices;

    @state() private logs: TtsDiagnosticsEntry[] = [];
    @state() private status = '';
    @state() private testing = false;
    @state() private sampleText = 'This is a speech test for Tarot Oracle.';
    @state() private sttListening = false;
    @state() private sttStatus = '';
    @state() private sttTranscript = '';
    @state() private scenario: DebugScenario = 'web-tts';

    private readonly browserTts = new BrowserTtsService();
    private piperTts?: PiperTtsService;
    private unsubscribe?: () => void;

    override connectedCallback(): void {
        super.connectedCallback();
        this.piperTts = new PiperTtsService(this.services.config);
        this.logs = getTtsDiagnostics();
        const onUpdate = () => { this.logs = getTtsDiagnostics(); };
        window.addEventListener('tarot:tts-diagnostics', onUpdate as EventListener);
        window.addEventListener('tarot:tts-diagnostics-cleared', onUpdate as EventListener);
        this.unsubscribe = () => {
            window.removeEventListener('tarot:tts-diagnostics', onUpdate as EventListener);
            window.removeEventListener('tarot:tts-diagnostics-cleared', onUpdate as EventListener);
        };
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.unsubscribe?.();
    }

    override render() {
        const resolver = new SpeechPreferencesResolver(this.services.config);
        const locale = resolver.resolveBrowserLocale(this.services.userContext);
        const speakOptions = resolver.resolveSpeechOptions(this.services.userContext);
        const languageConfig = this.services.config.languages.find(entry => entry.code === this.services.userContext.language);
        const scenarioTitle = this.scenario === 'web-tts'
            ? 'Web API TTS'
            : this.scenario === 'piper-tts'
                ? 'Piper TTS'
                : 'Web API STT';
        const scenarioStatus = this.scenario === 'web-stt' ? this.sttStatus : this.status;

        return html`
            <div class="root">
                <div class="panel">
                    <div class="header">
                        <div>
                            <div class="title">Speech Debug</div>
                            <div class="subtle">Run targeted checks for browser speech and Piper on the device itself.</div>
                        </div>
                        <button class="btn btn-ghost" @click=${this._close} aria-label="Close speech debug">✕</button>
                    </div>
                </div>

                <div class="panel">
                    <div class="section">Scenario</div>
                    <div class="scenario-grid">
                        ${this._renderScenarioButton('web-tts', 'Web API TTS', 'speechSynthesis voice playback')}
                        ${this._renderScenarioButton('piper-tts', 'Piper TTS', 'offline worker-backed playback')}
                        ${this._renderScenarioButton('web-stt', 'Web API STT', 'browser speech recognition')}
                    </div>
                </div>

                <div class="panel">
                    <div class="section">Current Resolution</div>
                    <div class="grid">
                        <span class="k">App language</span><span class="v">${this.services.userContext.language}</span>
                        <span class="k">Browser locale</span><span class="v">${locale}</span>
                        <span class="k">Piper voice id</span><span class="v">${speakOptions.voiceId ?? 'none'}</span>
                        <span class="k">Language label</span><span class="v">${languageConfig?.label ?? 'unknown'}</span>
                        <span class="k">speechSynthesis</span><span class="v">${'speechSynthesis' in window ? 'available' : 'missing'}</span>
                        <span class="k">Active scenario</span><span class="v">${scenarioTitle}</span>
                    </div>
                </div>

                ${this.scenario !== 'web-stt' ? html`
                <div class="panel">
                    <div class="section">Sample Text</div>
                    <textarea
                        class="field"
                        placeholder="Enter text for TTS testing..."
                        .value=${this.sampleText}
                        @input=${(e: InputEvent) => { this.sampleText = (e.target as HTMLTextAreaElement).value; }}
                    ></textarea>
                </div>` : ''}

                <div class="panel">
                    <div class="section">${scenarioTitle}</div>
                    ${this.scenario === 'web-stt' ? html`
                        <div class="row">
                            <button class="btn btn-primary" ?disabled=${this.testing || this.sttListening} @click=${this.startSttTest}>Start STT</button>
                            <button class="btn" ?disabled=${!this.sttListening} @click=${this.stopSttTest}>Stop STT</button>
                            <button class="btn btn-ghost" @click=${this.clearSttResult}>Clear Transcript</button>
                        </div>
                    ` : html`
                        <div class="row">
                            <button class="btn btn-primary" ?disabled=${this.testing} @click=${this._runScenarioTest}>
                                ${this.scenario === 'web-tts' ? 'Test Web API TTS' : 'Test Piper TTS'}
                            </button>
                            <button class="btn btn-ghost" @click=${this.clearLogs}>Clear Logs</button>
                        </div>
                    `}
                    ${scenarioStatus ? html`<div class="subtle" style="margin-top:.7em;">${scenarioStatus}</div>` : ''}
                </div>

                ${this.scenario === 'web-stt' ? html`
                    <div class="panel">
                        <div class="section">Transcript</div>
                        <pre>${this.sttTranscript || 'No transcript captured yet.'}</pre>
                    </div>
                ` : ''}

                <div class="panel">
                    <div class="section">Diagnostics</div>
                    <div class="logs">
                        ${this.logs.length ? this.logs.slice().reverse().map(entry => html`
                            <div class="entry">
                                <div class="entry-head">
                                    <span class="badge">${entry.provider}</span>
                                    <span class="badge">${entry.phase}</span>
                                    <span class="subtle">${entry.timestamp}</span>
                                </div>
                                <pre>${JSON.stringify(entry.details, null, 2)}</pre>
                            </div>
                        `) : html`<div class="subtle">No TTS diagnostics yet.</div>`}
                    </div>
                </div>
            </div>
        `;
    }

    private _renderScenarioButton(id: DebugScenario, title: string, copy: string) {
        return html`
            <button
                class="scenario-btn ${this.scenario === id ? 'selected' : ''}"
                @click=${() => this._selectScenario(id)}
            >
                <span class="scenario-title">${title}</span>
                <span class="scenario-copy">${copy}</span>
            </button>
        `;
    }

    private _selectScenario(scenario: DebugScenario): void {
        this.scenario = scenario;
        this.status = '';
        if (scenario !== 'web-stt') {
            this.sttListening = false;
            this.sttStatus = '';
        }
    }

    private _close = (): void => {
        this.dispatchEvent(new CustomEvent('close'));
    };

    private clearLogs = (): void => {
        clearTtsDiagnostics();
        this.status = '';
    };

    private _runScenarioTest = async (): Promise<void> => {
        if (this.scenario === 'piper-tts') {
            await this.testPiperTts();
            return;
        }
        await this.testBrowserTts();
    };

    private async testBrowserTts(): Promise<void> {
        const resolver = new SpeechPreferencesResolver(this.services.config);
        const locale = resolver.resolveBrowserLocale(this.services.userContext);
        this.testing = true;
        this.status = 'Testing Web API TTS...';
        try {
            await this.browserTts.speakAsync(
                this.sampleText.trim() || 'This is a browser speech test for Tarot Oracle.',
                locale,
                { speed: resolver.resolveSpeechOptions(this.services.userContext).speed },
            );
            this.status = 'Browser TTS completed.';
        } catch (error) {
            this.status = error instanceof Error ? error.message : String(error);
        } finally {
            this.testing = false;
            this.logs = getTtsDiagnostics();
        }
    }

    private async testPiperTts(): Promise<void> {
        const resolver = new SpeechPreferencesResolver(this.services.config);
        const locale = resolver.resolveBrowserLocale(this.services.userContext);
        const speakOptions = resolver.resolveSpeechOptions(this.services.userContext);
        this.testing = true;
        this.status = 'Testing Piper TTS...';
        try {
            await this.piperTts?.speakAsync(
                this.sampleText.trim() || 'This is a Piper speech test for Tarot Oracle.',
                locale,
                speakOptions,
            );
            this.status = 'Piper TTS completed.';
        } catch (error) {
            this.status = error instanceof Error ? error.message : String(error);
        } finally {
            this.testing = false;
            this.logs = getTtsDiagnostics();
        }
    }

    private startSttTest = (): void => {
        const resolver = new SpeechPreferencesResolver(this.services.config);
        const locale = resolver.resolveBrowserLocale(this.services.userContext);
        this.sttStatus = `Listening with ${locale}...`;
        this.sttTranscript = '';

        this.services.sttService.start(locale, {
            onStart: () => {
                this.sttListening = true;
                this.sttStatus = `Listening with ${locale}...`;
            },
            onInterim: (transcript) => {
                this.sttTranscript = transcript.trim();
                this.sttStatus = 'Receiving interim transcript...';
            },
            onResult: (transcript) => {
                this.sttTranscript = transcript.trim();
                this.sttStatus = 'STT captured final transcript.';
            },
            onEnd: () => {
                this.sttListening = false;
                if (!this.sttStatus.startsWith('STT captured')) {
                    this.sttStatus = 'STT ended.';
                }
            },
            onError: (error) => {
                this.sttListening = false;
                this.sttStatus = `STT error: ${error}`;
            },
        });
    };

    private stopSttTest = (): void => {
        this.services.sttService.stop();
        this.sttListening = false;
        this.sttStatus = 'STT stopped.';
    };

    private clearSttResult = (): void => {
        this.sttListening = false;
        this.sttStatus = '';
        this.sttTranscript = '';
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'tts-debug-panel': TtsDebugPanel;
    }
}
