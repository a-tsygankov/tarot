import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';
import { BrowserTtsService } from '../../services/Tts/BrowserTtsService.js';
import { ElevenLabsTtsService } from '../../services/Tts/ElevenLabsTtsService.js';
import { clearTtsDiagnostics, getTtsDiagnostics, type TtsDiagnosticsEntry } from '../../services/Tts/tts-diagnostics.js';
import { SpeechPreferencesResolver } from '../../services/Speech/SpeechPreferencesResolver.js';

@customElement('tts-debug-panel')
export class TtsDebugPanel extends LitElement {
    static override styles = [sharedStyles, css`
        .root { padding: .5em 0 1.5em; animation: fadeIn .25s ease-out; }
        .panel { background: var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:1em; margin-bottom:1em; }
        .title, .section { font-family: var(--font-display); color: var(--gold); }
        .title { font-size: 1.28em; margin-bottom: .25em; }
        .section { font-size: 1em; margin-bottom: .55em; }
        .subtle { color: var(--text-dim); font-size: .85em; }
        .row { display:flex; gap:.6em; flex-wrap:wrap; align-items:center; }
        .grid { display:grid; grid-template-columns:minmax(140px,auto) 1fr; gap:.35em .9em; font-size:.88em; }
        .k { color: var(--text-faint); }
        .v { color: var(--text); word-break: break-word; }
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

    private readonly browserTts = new BrowserTtsService();
    private elevenTts?: ElevenLabsTtsService;
    private unsubscribe?: () => void;

    override connectedCallback(): void {
        super.connectedCallback();
        this.elevenTts = new ElevenLabsTtsService(this.services.apiService, this.services.config);
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

        return html`
            <div class="root">
                <div class="panel">
                    <div class="title">TTS Debug</div>
                    <div class="subtle">Run these checks on the iPhone itself. Results are logged below and also mirrored into the in-app console.</div>
                </div>

                <div class="panel">
                    <div class="section">Current Resolution</div>
                    <div class="grid">
                        <span class="k">App language</span><span class="v">${this.services.userContext.language}</span>
                        <span class="k">Browser locale</span><span class="v">${locale}</span>
                        <span class="k">Configured voice id</span><span class="v">${speakOptions.voiceId ?? 'none'}</span>
                        <span class="k">Language label</span><span class="v">${languageConfig?.label ?? 'unknown'}</span>
                        <span class="k">speechSynthesis</span><span class="v">${'speechSynthesis' in window ? 'available' : 'missing'}</span>
                    </div>
                </div>

                <div class="panel">
                    <div class="section">Actions</div>
                    <div class="row">
                        <button class="btn btn-primary" ?disabled=${this.testing} @click=${this.testBrowserTts}>Test Browser TTS</button>
                        <button class="btn" ?disabled=${this.testing} @click=${this.testElevenLabsTts}>Test ElevenLabs TTS</button>
                        <button class="btn btn-ghost" @click=${this.clearLogs}>Clear Logs</button>
                        <button class="btn btn-ghost" @click=${() => this.dispatchEvent(new CustomEvent('close'))}>Close</button>
                    </div>
                    ${this.status ? html`<div class="subtle" style="margin-top:.7em;">${this.status}</div>` : ''}
                </div>

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

    private clearLogs = (): void => {
        clearTtsDiagnostics();
        this.status = '';
    };

    private async testBrowserTts(): Promise<void> {
        const resolver = new SpeechPreferencesResolver(this.services.config);
        const locale = resolver.resolveBrowserLocale(this.services.userContext);
        this.testing = true;
        this.status = 'Testing browser TTS...';
        try {
            await this.browserTts.speakAsync(
                'This is a browser speech test for Tarot Oracle.',
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

    private async testElevenLabsTts(): Promise<void> {
        const resolver = new SpeechPreferencesResolver(this.services.config);
        const locale = resolver.resolveBrowserLocale(this.services.userContext);
        const speakOptions = resolver.resolveSpeechOptions(this.services.userContext);
        this.testing = true;
        this.status = 'Testing ElevenLabs TTS...';
        try {
            await this.elevenTts?.speakAsync(
                'This is an ElevenLabs speech test for Tarot Oracle.',
                locale,
                speakOptions,
            );
            this.status = 'ElevenLabs TTS completed.';
        } catch (error) {
            this.status = error instanceof Error ? error.message : String(error);
        } finally {
            this.testing = false;
            this.logs = getTtsDiagnostics();
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'tts-debug-panel': TtsDebugPanel;
    }
}
