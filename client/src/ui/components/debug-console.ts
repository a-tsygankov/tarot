import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';

interface LogEntry {
    time: string;
    msg: string;
    level: 'log' | 'warn' | 'error' | 'info';
}

const LEVEL_COLORS: Record<string, string> = {
    log: 'var(--text)',
    info: 'var(--purple-light)',
    warn: '#e8a040',
    error: '#e04040',
};

/**
 * In-app debug console — captures console.log/warn/error/info.
 * Toggle visibility via the `open` property.
 * Activated by triple-tap on header logo.
 */
@customElement('debug-console')
export class DebugConsole extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            :host {
                display: block;
            }

            .console-overlay {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                max-height: 50vh;
                background: rgba(8, 5, 14, 0.97);
                border-top: 1.5px solid var(--border-bright, rgba(201, 168, 76, 0.5));
                z-index: 200;
                display: flex;
                flex-direction: column;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 0.75em;
                animation: slideUp 0.2s ease-out;
            }

            @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }

            .console-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.5em 0.8em;
                background: rgba(20, 15, 30, 0.95);
                border-bottom: 1px solid var(--border);
                position: sticky;
                top: 0;
            }

            .console-title {
                color: var(--gold);
                font-size: 0.85em;
                letter-spacing: 0.12em;
                font-family: var(--font-display);
            }

            .console-actions {
                display: flex;
                gap: 0.5em;
            }

            .console-btn {
                padding: 0.25em 0.6em;
                border: 1px solid var(--border);
                border-radius: 4px;
                background: transparent;
                color: var(--text-dim);
                font-family: inherit;
                font-size: 0.9em;
                cursor: pointer;
            }

            .console-btn:hover {
                border-color: var(--gold-dim);
                color: var(--gold);
            }

            .console-logs {
                flex: 1;
                overflow-y: auto;
                padding: 0.4em 0.8em;
                max-height: 40vh;
            }

            .log-entry {
                padding: 0.2em 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                display: flex;
                gap: 0.6em;
                line-height: 1.4;
                word-break: break-word;
            }

            .log-time {
                color: var(--text-faint);
                flex-shrink: 0;
                min-width: 5.5em;
            }

            .log-msg {
                flex: 1;
            }

            .error-badge {
                position: fixed;
                bottom: 8px;
                right: 8px;
                min-width: 18px;
                height: 18px;
                border-radius: 9px;
                background: #c02020;
                color: white;
                font-size: 0.7em;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                z-index: 201;
                cursor: pointer;
                animation: fadeIn 0.3s ease-out;
            }
        `,
    ];

    @state() private _open = false;
    @state() private _entries: LogEntry[] = [];
    @state() private _errorCount = 0;

    private _origLog?: typeof console.log;
    private _origWarn?: typeof console.warn;
    private _origError?: typeof console.error;
    private _origInfo?: typeof console.info;
    private _origGroup?: typeof console.group;
    private _origGroupEnd?: typeof console.groupEnd;
    private _intercepted = false;

    override connectedCallback(): void {
        super.connectedCallback();
        this._interceptConsole();
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._restoreConsole();
    }

    toggle(): void {
        this._open = !this._open;
        if (this._open) this._errorCount = 0;
    }

    clear(): void {
        this._entries = [];
        this._errorCount = 0;
    }

    get isOpen(): boolean {
        return this._open;
    }

    override render() {
        // Show error badge when closed and errors exist
        if (!this._open && this._errorCount > 0) {
            return html`
                <div class="error-badge" @click=${this.toggle}>
                    ${this._errorCount}
                </div>
            `;
        }

        if (!this._open) return html``;

        return html`
            <div class="console-overlay">
                <div class="console-toolbar">
                    <span class="console-title">IN-APP CONSOLE</span>
                    <div class="console-actions">
                        <button class="console-btn" @click=${this.clear}>CLEAR</button>
                        <button class="console-btn" @click=${this.toggle}>✕</button>
                    </div>
                </div>
                <div class="console-logs">
                    ${this._entries.map(entry => html`
                        <div class="log-entry">
                            <span class="log-time">[${entry.time}]</span>
                            <span class="log-msg" style="color: ${LEVEL_COLORS[entry.level]}">${entry.msg}</span>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }

    private _interceptConsole(): void {
        if (this._intercepted) return;

        // Global guard: if another instance already wrapped console, restore first
        const w = window as unknown as Record<string, unknown>;
        const prev = w.__debugConsoleInstance as DebugConsole | undefined;
        if (prev && prev !== this) {
            prev._restoreConsole();
        }
        w.__debugConsoleInstance = this;
        this._intercepted = true;

        this._origLog = console.log;
        this._origWarn = console.warn;
        this._origError = console.error;
        this._origInfo = console.info;
        this._origGroup = console.group;
        this._origGroupEnd = console.groupEnd;

        const capture = (level: LogEntry['level'], orig: (...args: unknown[]) => void) => {
            return (...args: unknown[]) => {
                orig.apply(console, args);
                this._addEntry(level, args);
            };
        };

        console.log = capture('log', this._origLog);
        console.warn = capture('warn', this._origWarn);
        console.error = capture('error', this._origError);
        console.info = capture('info', this._origInfo);

        // Intercept group/groupEnd as styled log entries
        console.group = (...args: unknown[]) => {
            this._origGroup!.apply(console, args);
            this._addEntry('info', ['▸ ' + args.map(String).join(' ')]);
        };
        console.groupEnd = () => {
            this._origGroupEnd!.apply(console);
            // no visible entry for groupEnd
        };
    }

    private _restoreConsole(): void {
        if (!this._intercepted) return;
        this._intercepted = false;

        if (this._origLog) console.log = this._origLog;
        if (this._origWarn) console.warn = this._origWarn;
        if (this._origError) console.error = this._origError;
        if (this._origInfo) console.info = this._origInfo;
        if (this._origGroup) console.group = this._origGroup;
        if (this._origGroupEnd) console.groupEnd = this._origGroupEnd;

        const w = window as unknown as Record<string, unknown>;
        if (w.__debugConsoleInstance === this) {
            delete w.__debugConsoleInstance;
        }
    }

    private _addEntry(level: LogEntry['level'], args: unknown[]): void {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const msg = args.map(a => {
            if (typeof a === 'string') return a;
            try { return JSON.stringify(a); } catch { return String(a); }
        }).join(' ');

        const entry: LogEntry = { time, msg, level };
        this._entries = [...this._entries, entry];

        if (level === 'error' || level === 'warn') {
            this._errorCount++;
        }

        // Cap at 200 entries
        if (this._entries.length > 200) {
            this._entries = this._entries.slice(-200);
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'debug-console': DebugConsole;
    }
}
