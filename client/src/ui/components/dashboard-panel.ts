import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';

interface DailySummary {
    date: string;
    sessions: number;
    uniqueUsers: number;
    readings: number;
    followUps: number;
    topLanguages: Array<{ language: string; count: number }>;
}

interface DashboardData {
    period: { from: string; to: string };
    totals: {
        users: number;
        readings: number;
        followUps: number;
        sessions: number;
    };
    daily: DailySummary[];
    topLanguages: Array<{ language: string; count: number }>;
    recentGames: Array<{
        gameId: string;
        uid: string;
        spreadType: number;
        question: string | null;
        topic: string | null;
        language: string;
        tone: string;
        turnCount: number;
        city: string | null;
        createdAt: string;
    }>;
    performance: {
        avgResponseMs: number;
        totalTurns: number;
        providerBreakdown: Record<string, number>;
    };
    activeUsersToday: number;
    schemaVersion: string;
    workerVersion: string;
}

interface UserDetailData {
    user: {
        uid: string;
        name: string | null;
        gender: string | null;
        birthdate: string | null;
        traits: Record<string, string>;
        stats: { totalReadings: number; totalFollowUps: number };
        preferences: { language: string; tone: string };
        locations: { lastCountry: string | null; lastCity: string | null };
        firstSeenAt: string;
        lastSeenAt: string;
    };
    games: Array<{
        gameId: string;
        spreadType: number;
        question: string | null;
        topic: string | null;
        language: string;
        tone: string;
        turnCount: number;
        createdAt: string;
        location: { country: string | null; city: string | null; timezone: string | null } | null;
    }>;
    locations: Array<{
        country: string | null;
        city: string | null;
        timezone: string | null;
        lastSeen: string;
    }>;
    totalGames: number;
}

interface GameDetailData {
        game: {
            gameId: string;
            uid: string;
        spreadType: number;
        cards: Array<{ position: string; name: string; reversed: boolean }>;
        question: string | null;
        topic: string | null;
        language: string;
        tone: string;
        reading: Record<string, unknown>;
            readingDigest: string | null;
            turnCount: number;
            createdAt: string;
            location?: { country: string | null; city: string | null; timezone: string | null };
            originalRequest?: Record<string, unknown>;
        };
    turns: Array<{
        turnNumber: number;
        turnType: 'reading' | 'followup';
        question: string | null;
        questionDigest: string | null;
        answerText: string;
        answerDigest: string;
        userContextDelta: Record<string, unknown> | null;
        aiProvider: string;
        aiModel: string;
        responseTimeMs: number;
        createdAt: string;
    }>;
}

type DashView = 'overview' | 'user' | 'game';

/**
 * Admin dashboard — analytics overview, accessible from debug mode.
 */
@customElement('dashboard-panel')
export class DashboardPanel extends LitElement {
    static override styles = [
        sharedStyles,
        css`
            .dashboard {
                padding: 0.5em 0;
                animation: fadeIn 0.3s ease-out;
            }

            .dash-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1.2em;
            }

            .dash-title {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 1.3em;
            }

            .dash-period {
                color: var(--text-dim);
                font-size: 0.8em;
            }

            .controls {
                display: flex;
                gap: 0.5em;
                align-items: center;
                margin-bottom: 1em;
            }

            .period-btn {
                padding: 0.3em 0.7em;
                border: 1px solid var(--border);
                border-radius: 6px;
                background: transparent;
                color: var(--text-dim);
                font-size: 0.8em;
                cursor: pointer;
                transition: all 0.2s;
                font-family: var(--font-body);
            }

            .period-btn:hover, .period-btn.active {
                border-color: var(--gold-dim);
                color: var(--gold);
                background: var(--purple-dim);
            }

            .admin-key-input {
                flex: 1;
                padding: 0.4em 0.7em;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 6px;
                color: var(--text);
                font-family: var(--font-body);
                font-size: 0.85em;
            }

            .admin-key-input:focus {
                border-color: var(--gold-dim);
                outline: none;
            }

            /* ── Stat cards ── */
            .stat-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: 0.8em;
                margin-bottom: 1.2em;
            }

            .stat-card {
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 10px;
                padding: 0.8em;
                text-align: center;
            }

            .stat-value {
                font-family: var(--font-display);
                font-size: 1.6em;
                color: var(--gold);
                line-height: 1.2;
            }

            .stat-label {
                color: var(--text-dim);
                font-size: 0.75em;
                margin-top: 0.2em;
            }

            .sparkline {
                width: 100%;
                height: 24px;
                margin-top: 0.3em;
                display: block;
            }

            /* ── Chart (text-based bar chart) ── */
            .chart-section {
                margin-bottom: 1.2em;
            }

            .section-title {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 0.95em;
                margin-bottom: 0.6em;
            }

            .chart-row {
                display: flex;
                align-items: center;
                gap: 0.5em;
                margin-bottom: 0.3em;
                font-size: 0.8em;
            }

            .chart-label {
                width: 50px;
                color: var(--text-dim);
                text-align: right;
                flex-shrink: 0;
                font-size: 0.85em;
            }

            .chart-bar-wrap {
                flex: 1;
                height: 16px;
                background: var(--bg-card);
                border-radius: 4px;
                overflow: hidden;
            }

            .chart-bar {
                height: 100%;
                border-radius: 4px;
                transition: width 0.5s ease;
                min-width: 2px;
            }

            .chart-bar.readings {
                background: linear-gradient(90deg, var(--gold-dim), var(--gold));
            }

            .chart-bar.followups {
                background: linear-gradient(90deg, var(--purple-dim), var(--accent));
            }

            .chart-bar.users {
                background: linear-gradient(90deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.8));
            }

            .chart-value {
                width: 30px;
                color: var(--text-faint);
                font-size: 0.85em;
                flex-shrink: 0;
            }

            /* ── Table ── */
            .table-wrap {
                overflow-x: auto;
                margin-bottom: 1.2em;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.8em;
            }

            th {
                text-align: left;
                color: var(--gold);
                font-family: var(--font-display);
                font-weight: normal;
                padding: 0.5em;
                border-bottom: 1px solid var(--border);
                white-space: nowrap;
            }

            td {
                padding: 0.5em;
                color: var(--text-dim);
                border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                white-space: nowrap;
            }

            tr:hover td {
                background: var(--purple-dim);
            }

            .tag {
                display: inline-block;
                padding: 0.15em 0.5em;
                border-radius: 4px;
                font-size: 0.85em;
                background: var(--purple-dim);
                color: var(--text);
            }

            .tag.topic { border-left: 2px solid var(--gold); }
            .tag.lang { border-left: 2px solid var(--accent); }

            /* ── Performance ── */
            .perf-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 0.8em;
                margin-bottom: 1.2em;
            }

            .perf-card {
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 10px;
                padding: 0.7em;
            }

            .perf-title {
                color: var(--text-faint);
                font-size: 0.7em;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .perf-value {
                font-family: var(--font-display);
                color: var(--text);
                font-size: 1.1em;
                margin-top: 0.2em;
            }

            /* ── Language pills ── */
            .lang-pills {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4em;
            }

            .lang-pill {
                padding: 0.3em 0.6em;
                border-radius: 6px;
                background: var(--bg-card);
                border: 1px solid var(--border);
                font-size: 0.8em;
                color: var(--text-dim);
            }

            .lang-pill .count {
                color: var(--gold);
                font-family: var(--font-display);
                margin-left: 0.3em;
            }

            /* ── Key entry gate ── */
            .key-entry {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 4em 1em;
            }

            .key-prompt {
                text-align: center;
                max-width: 300px;
                width: 100%;
            }

            .key-icon {
                font-size: 2.5em;
                margin-bottom: 0.3em;
                opacity: 0.7;
            }

            .key-form {
                display: flex;
                gap: 0.5em;
            }

            .key-form .admin-key-input {
                flex: 1;
            }

            .error-box {
                background: rgba(180, 50, 50, 0.15);
                border: 1px solid rgba(180, 50, 50, 0.3);
                border-radius: 8px;
                padding: 1em;
                color: var(--text);
                font-size: 0.9em;
            }

            .legend {
                display: flex;
                gap: 1em;
                margin-bottom: 0.5em;
            }

            .legend-item {
                display: flex;
                align-items: center;
                gap: 0.3em;
                font-size: 0.75em;
                color: var(--text-dim);
            }

            .legend-dot {
                width: 8px;
                height: 8px;
                border-radius: 2px;
            }

            /* ── Drill-down links ── */
            .drill-link {
                color: var(--gold);
                cursor: pointer;
                text-decoration: none;
                transition: opacity 0.2s;
            }

            .drill-link:hover {
                opacity: 0.7;
                text-decoration: underline;
            }

            .breadcrumb {
                display: flex;
                align-items: center;
                gap: 0.4em;
                margin-bottom: 1em;
                font-size: 0.85em;
                color: var(--text-dim);
            }

            .breadcrumb .sep { color: var(--text-faint); }

            /* ── Detail view ── */
            .detail-section {
                margin-bottom: 1.5em;
            }

            .detail-grid {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 0.3em 1em;
                font-size: 0.85em;
            }

            .detail-key {
                color: var(--text-faint);
                text-align: right;
                white-space: nowrap;
            }

            .detail-val {
                color: var(--text);
                word-break: break-word;
            }

            .trait-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4em;
            }

            .trait-pill {
                padding: 0.2em 0.6em;
                border-radius: 6px;
                background: var(--purple-dim);
                border: 1px solid var(--border);
                font-size: 0.8em;
                color: var(--text);
            }

            .trait-pill .trait-key {
                color: var(--text-faint);
                margin-right: 0.3em;
            }

            .location-list {
                display: flex;
                flex-direction: column;
                gap: 0.3em;
            }

            .location-row {
                display: flex;
                align-items: center;
                gap: 0.5em;
                font-size: 0.85em;
                padding: 0.3em 0.5em;
                border-radius: 6px;
                background: var(--bg-card);
            }

            .location-flag { font-size: 1.1em; }

            .location-place { color: var(--text); flex: 1; }

            .location-time { color: var(--text-faint); font-size: 0.85em; }

            /* ── Turn card (reading/followup display) ── */
            .turn-card {
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 10px;
                padding: 1em;
                margin-bottom: 0.8em;
            }

            .turn-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.6em;
            }

            .turn-type {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 0.9em;
            }

            .turn-meta {
                color: var(--text-faint);
                font-size: 0.75em;
            }

            .turn-question {
                color: var(--text-dim);
                font-style: italic;
                margin-bottom: 0.5em;
                font-size: 0.9em;
            }

            .turn-answer {
                color: var(--text);
                font-size: 0.85em;
                line-height: 1.5;
                white-space: pre-wrap;
                max-height: 300px;
                overflow-y: auto;
            }

            .card-list {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5em;
                margin-bottom: 0.8em;
            }

            .card-chip {
                padding: 0.3em 0.7em;
                border-radius: 6px;
                background: var(--bg-card);
                border: 1px solid var(--border);
                font-size: 0.8em;
            }

            .card-chip .pos { color: var(--text-faint); margin-right: 0.3em; }
            .card-chip .name { color: var(--gold); }
            .card-chip .rev { color: var(--accent); margin-left: 0.2em; }
        `,
    ];

    @property({ attribute: false }) services!: AppServices;

    @state() private _data: DashboardData | null = null;
    @state() private _loading = false;
    @state() private _error = '';
    @state() private _keyInput = '';
    @state() private _days = 7;
    @state() private _authenticated = false;
    @state() private _validating = false;

    @state() private _autoRefresh = false;
    @state() private _lastRefresh = '';
    @state() private _view: DashView = 'overview';
    @state() private _userData: UserDetailData | null = null;
    @state() private _gameData: GameDetailData | null = null;
    @state() private _drillLoading = false;

    /** Validated key — only set after server confirms it. */
    private _adminKey = '';
    private _refreshTimer: ReturnType<typeof setInterval> | null = null;

    private static readonly STORAGE_KEY = 'tarot_admin_key';
    private static readonly REFRESH_INTERVAL_MS = 60_000; // 1 minute

    override connectedCallback(): void {
        super.connectedCallback();
        // Try stored key — validate it silently
        const stored = localStorage.getItem(DashboardPanel.STORAGE_KEY);
        if (stored) {
            this._adminKey = stored;
            this._validateAndLoad(stored);
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._stopAutoRefresh();
    }

    override render() {
        return html`
            <div class="dashboard">
                <div class="dash-header">
                    <div>
                        <div class="dash-title">Dashboard</div>
                        ${this._authenticated && this._data ? html`
                            <div class="dash-period">${this._data.period.from} to ${this._data.period.to}</div>
                        ` : nothing}
                    </div>
                    <div class="row gap-sm">
                        ${this._authenticated ? html`
                            <button class="btn btn-ghost" style="font-size:0.8em;" @click=${this._logout}>Logout</button>
                        ` : nothing}
                        <button class="btn btn-ghost" @click=${() => this.dispatchEvent(new CustomEvent('close'))}>
                            Close
                        </button>
                    </div>
                </div>

                ${this._authenticated ? this._renderDashboard() : this._renderKeyEntry()}
            </div>
        `;
    }

    // ── Auth gate ──────────────────────────────────────────────────────

    private _renderKeyEntry() {
        return html`
            <div class="key-entry fade-in">
                <div class="key-prompt">
                    <div class="key-icon">&#128272;</div>
                    <div class="dim-text" style="margin-bottom: 1em;">
                        Enter admin key to access the dashboard.
                    </div>
                    <form class="key-form" @submit=${this._onKeySubmit}>
                        <input
                            class="admin-key-input"
                            type="password"
                            placeholder="Admin key..."
                            autocomplete="off"
                            .value=${this._keyInput}
                            @input=${(e: InputEvent) => {
                                this._keyInput = (e.target as HTMLInputElement).value;
                                this._error = '';
                            }}
                        />
                        <button
                            class="btn btn-primary"
                            type="submit"
                            ?disabled=${this._validating || !this._keyInput.trim()}
                        >
                            ${this._validating ? html`<span class="spinner"></span>` : 'Unlock'}
                        </button>
                    </form>
                    ${this._error ? html`
                        <div class="error-box" style="margin-top: 1em;">${this._error}</div>
                    ` : nothing}
                </div>
            </div>
        `;
    }

    private async _onKeySubmit(e: Event): Promise<void> {
        e.preventDefault();
        const key = this._keyInput.trim();
        if (!key || this._validating) return;
        await this._validateAndLoad(key);
    }

    /**
     * Validate key against the server.
     * On success: store it, set authenticated, load dashboard.
     * On failure: clear stored key, show error.
     */
    private async _validateAndLoad(key: string): Promise<void> {
        this._validating = true;
        this._error = '';

        try {
            const base = this.services?.config?.apiBase ?? '';
            const res = await fetch(`${base}/api/admin/auth`, {
                method: 'POST',
                headers: { 'X-Admin-Key': key },
            });

            if (!res.ok) {
                // Key is invalid — clear any stored key
                localStorage.removeItem(DashboardPanel.STORAGE_KEY);
                this._adminKey = '';
                this._authenticated = false;
                this._error = 'Invalid admin key.';
                return;
            }

            // Key is valid — persist and proceed
            this._adminKey = key;
            this._authenticated = true;
            localStorage.setItem(DashboardPanel.STORAGE_KEY, key);
            this._error = '';

            // Auto-load dashboard data
            await this._fetchDashboard();
        } catch (err) {
            this._error = `Connection failed: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
            this._validating = false;
        }
    }

    private _logout(): void {
        this._stopAutoRefresh();
        localStorage.removeItem(DashboardPanel.STORAGE_KEY);
        this._adminKey = '';
        this._keyInput = '';
        this._authenticated = false;
        this._data = null;
        this._error = '';
        this._lastRefresh = '';
    }

    // ── Authenticated dashboard ───────────────────────────────────────

    private _renderDashboard() {
        if (this._view === 'user' && this._userData) return this._renderUserDetail();
        if (this._view === 'game' && this._gameData) return this._renderGameDetail();
        if (this._drillLoading) return html`<div class="center" style="padding:3em 0;"><div class="spinner spinner-lg"></div></div>`;

        return html`
            <div class="controls">
                ${([7, 14, 30] as const).map(d => html`
                    <button
                        class="period-btn ${this._days === d ? 'active' : ''}"
                        @click=${() => { this._days = d; this._fetchDashboard(); }}
                    >${d}d</button>
                `)}
                <button
                    class="period-btn ${this._autoRefresh ? 'active' : ''}"
                    @click=${this._toggleAutoRefresh}
                    title="Auto-refresh every 60s"
                >Auto</button>
                <button class="btn btn-ghost" @click=${this._fetchDashboard}
                    ?disabled=${this._loading}>
                    ${this._loading ? html`<span class="spinner"></span>` : 'Refresh'}
                </button>
                ${this._lastRefresh ? html`
                    <span class="faint-text" style="font-size:0.7em; margin-left: auto;">${this._lastRefresh}</span>
                ` : nothing}
            </div>

            ${this._error ? html`
                <div class="error-box">${this._error}</div>
            ` : nothing}

            ${this._data ? this._renderData() : this._loading ? html`
                <div class="center" style="padding: 3em 0;">
                    <div class="spinner spinner-lg"></div>
                </div>
            ` : nothing}
        `;
    }

    private _renderData() {
        const d = this._data!;

        return html`
            <!-- Stat Cards -->
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-value">${d.totals.users}</div>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${d.activeUsersToday}</div>
                    <div class="stat-label">Active Today</div>
                    ${this._sparkline(d.daily.map(x => x.uniqueUsers), '#4caf50')}
                </div>
                <div class="stat-card">
                    <div class="stat-value">${d.totals.readings}</div>
                    <div class="stat-label">Readings (${this._days}d)</div>
                    ${this._sparkline(d.daily.map(x => x.readings), '#c9a84c')}
                </div>
                <div class="stat-card">
                    <div class="stat-value">${d.totals.followUps}</div>
                    <div class="stat-label">Follow-ups (${this._days}d)</div>
                    ${this._sparkline(d.daily.map(x => x.followUps), '#9a8eb0')}
                </div>
                <div class="stat-card">
                    <div class="stat-value">${d.totals.sessions}</div>
                    <div class="stat-label">Sessions (${this._days}d)</div>
                    ${this._sparkline(d.daily.map(x => x.sessions), '#5e9cbf')}
                </div>
            </div>

            <!-- Daily chart -->
            ${d.daily.length > 0 ? html`
                <div class="chart-section">
                    <div class="section-title">Daily Activity</div>
                    <div class="legend">
                        <div class="legend-item">
                            <div class="legend-dot" style="background: var(--gold);"></div> Readings
                        </div>
                        <div class="legend-item">
                            <div class="legend-dot" style="background: var(--accent);"></div> Follow-ups
                        </div>
                        <div class="legend-item">
                            <div class="legend-dot" style="background: rgba(76,175,80,0.8);"></div> Users
                        </div>
                    </div>
                    ${d.daily.map(day => {
                        const maxVal = Math.max(
                            ...d.daily.map(x => Math.max(x.readings, x.followUps, x.uniqueUsers)),
                            1,
                        );
                        return html`
                            <div class="chart-row">
                                <div class="chart-label">${day.date.slice(5)}</div>
                                <div class="chart-bar-wrap">
                                    <div class="chart-bar readings" style="width: ${(day.readings / maxVal) * 100}%"></div>
                                </div>
                                <div class="chart-value">${day.readings}</div>
                                <div class="chart-bar-wrap">
                                    <div class="chart-bar followups" style="width: ${(day.followUps / maxVal) * 100}%"></div>
                                </div>
                                <div class="chart-value">${day.followUps}</div>
                                <div class="chart-bar-wrap">
                                    <div class="chart-bar users" style="width: ${(day.uniqueUsers / maxVal) * 100}%"></div>
                                </div>
                                <div class="chart-value">${day.uniqueUsers}</div>
                            </div>
                        `;
                    })}
                </div>
            ` : nothing}

            <!-- Performance -->
            <div class="chart-section">
                <div class="section-title">Performance</div>
                <div class="perf-grid">
                    <div class="perf-card">
                        <div class="perf-title">Avg Response</div>
                        <div class="perf-value">${d.performance.avgResponseMs > 0
                            ? (d.performance.avgResponseMs / 1000).toFixed(1) + 's'
                            : 'N/A'}</div>
                    </div>
                    <div class="perf-card">
                        <div class="perf-title">Sampled Turns</div>
                        <div class="perf-value">${d.performance.totalTurns}</div>
                    </div>
                    ${Object.entries(d.performance.providerBreakdown).map(([provider, count]) => html`
                        <div class="perf-card">
                            <div class="perf-title">${provider}</div>
                            <div class="perf-value">${count} calls</div>
                        </div>
                    `)}
                    <div class="perf-card">
                        <div class="perf-title">Worker</div>
                        <div class="perf-value">v${d.workerVersion}</div>
                    </div>
                    <div class="perf-card">
                        <div class="perf-title">Schema</div>
                        <div class="perf-value">${d.schemaVersion.slice(0, 10)}</div>
                    </div>
                </div>
            </div>

            <!-- Languages -->
            ${d.topLanguages.length > 0 ? html`
                <div class="chart-section">
                    <div class="section-title">Languages</div>
                    <div class="lang-pills">
                        ${d.topLanguages.map(l => html`
                            <div class="lang-pill">${l.language}<span class="count">${l.count}</span></div>
                        `)}
                    </div>
                </div>
            ` : nothing}

            <!-- Recent Games -->
            ${d.recentGames.length > 0 ? html`
                <div class="chart-section">
                    <div class="section-title">Recent Games</div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>User</th>
                                    <th>City</th>
                                    <th>Spread</th>
                                    <th>Topic</th>
                                    <th>Lang</th>
                                    <th>Turns</th>
                                    <th>Question</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${d.recentGames.map(g => html`
                                    <tr>
                                        <td>${this._formatTime(g.createdAt)}</td>
                                        <td><a class="drill-link" @click=${() => this._openUser(g.uid)}>${g.uid}</a></td>
                                        <td>${g.city ?? '-'}</td>
                                        <td><a class="drill-link" @click=${() => this._openGame(g.gameId)}>${g.spreadType}-card</a></td>
                                        <td>${g.topic ? html`<span class="tag topic">${g.topic}</span>` : '-'}</td>
                                        <td><span class="tag lang">${g.language}</span></td>
                                        <td>${g.turnCount}</td>
                                        <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis;">
                                            ${g.question ?? '-'}
                                        </td>
                                    </tr>
                                `)}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : nothing}
        `;
    }

    private _formatTime(iso: string): string {
        if (!iso) return '-';
        try {
            const d = new Date(iso);
            return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        } catch {
            return iso.slice(0, 16);
        }
    }

    // ── Sparkline SVG generator ───────────────────────────────────────

    private _sparkline(values: number[], color: string) {
        if (values.length < 2) return nothing;
        const w = 100;
        const h = 24;
        const max = Math.max(...values, 1);
        const step = w / (values.length - 1);
        const points = values.map((v, i) =>
            `${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`
        ).join(' ');

        // Area fill path: line then back along the bottom
        const areaPath = `M0,${h} ` +
            values.map((v, i) =>
                `L${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`
            ).join(' ') +
            ` L${w},${h} Z`;

        return html`
            <svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
                <path d="${areaPath}" fill="${color}" opacity="0.15" />
                <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;
    }

    // ── Auto-refresh ──────────────────────────────────────────────────

    private _toggleAutoRefresh(): void {
        this._autoRefresh = !this._autoRefresh;
        if (this._autoRefresh) {
            this._startAutoRefresh();
        } else {
            this._stopAutoRefresh();
        }
    }

    private _startAutoRefresh(): void {
        this._stopAutoRefresh();
        this._refreshTimer = setInterval(() => {
            this._fetchDashboard();
        }, DashboardPanel.REFRESH_INTERVAL_MS);
    }

    private _stopAutoRefresh(): void {
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
        this._autoRefresh = false;
    }

    // ── Data fetch ────────────────────────────────────────────────────

    private async _fetchDashboard(): Promise<void> {
        if (!this._adminKey || this._loading) return;

        this._loading = true;
        this._error = '';

        try {
            const base = this.services?.config?.apiBase ?? '';
            const response = await fetch(
                `${base}/api/admin/dashboard?days=${this._days}`,
                {
                    headers: { 'X-Admin-Key': this._adminKey },
                },
            );

            if (response.status === 401) {
                this._stopAutoRefresh();
                this._logout();
                this._error = 'Admin key expired or invalid. Please re-enter.';
                return;
            }

            if (!response.ok) {
                const body = await response.json().catch(() => ({})) as Record<string, string>;
                throw new Error(body.message || body.error || `HTTP ${response.status}`);
            }

            this._data = await response.json() as DashboardData;
            const now = new Date();
            this._lastRefresh = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        } catch (err) {
            this._error = err instanceof Error ? err.message : String(err);
        } finally {
            this._loading = false;
        }
    }

    // ── Drill-down navigation ─────────────────────────────────────────

    private async _openUser(uidFragment: string): Promise<void> {
        // uid in overview table is truncated (first 8 chars + "..."), resolve from recent games
        const fullUid = this._data?.recentGames.find(g => g.uid === uidFragment)
            ? uidFragment : uidFragment;
        // We pass the fragment as-is; the API will match by full uid
        this._drillLoading = true;
        this._error = '';
        try {
            const base = this.services?.config?.apiBase ?? '';
            // The uid fragment from the dashboard includes "..." suffix — strip it
            const uid = fullUid.replace(/\.+$/, '');
            const res = await fetch(`${base}/api/admin/user/${uid}`, {
                headers: { 'X-Admin-Key': this._adminKey },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({})) as Record<string, string>;
                throw new Error(body.message || body.error || `HTTP ${res.status}`);
            }
            this._userData = await res.json() as UserDetailData;
            this._view = 'user';
        } catch (err) {
            this._error = err instanceof Error ? err.message : String(err);
        } finally {
            this._drillLoading = false;
        }
    }

    private async _openGame(gameId: string): Promise<void> {
        this._drillLoading = true;
        this._error = '';
        try {
            const base = this.services?.config?.apiBase ?? '';
            const res = await fetch(`${base}/api/admin/game/${gameId}`, {
                headers: { 'X-Admin-Key': this._adminKey },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({})) as Record<string, string>;
                throw new Error(body.message || body.error || `HTTP ${res.status}`);
            }
            this._gameData = await res.json() as GameDetailData;
            this._view = 'game';
        } catch (err) {
            this._error = err instanceof Error ? err.message : String(err);
        } finally {
            this._drillLoading = false;
        }
    }

    private _backToOverview(): void {
        this._view = 'overview';
        this._userData = null;
        this._gameData = null;
        this._error = '';
    }

    // ── User detail view ──────────────────────────────────────────────

    private _renderUserDetail() {
        const d = this._userData!;
        const u = d.user;

        return html`
            <div class="fade-in">
                <div class="breadcrumb">
                    <a class="drill-link" @click=${this._backToOverview}>Dashboard</a>
                    <span class="sep">/</span>
                    <span>User ${u.name ?? u.uid.slice(0, 8)}</span>
                </div>

                ${this._error ? html`<div class="error-box">${this._error}</div>` : nothing}

                <!-- Profile -->
                <div class="detail-section">
                    <div class="section-title">Profile</div>
                    <div class="detail-grid">
                        <span class="detail-key">UID</span>
                        <span class="detail-val">${u.uid}</span>
                        ${u.name ? html`
                            <span class="detail-key">Name</span>
                            <span class="detail-val">${u.name}</span>
                        ` : nothing}
                        ${u.gender ? html`
                            <span class="detail-key">Gender</span>
                            <span class="detail-val">${u.gender}</span>
                        ` : nothing}
                        ${u.birthdate ? html`
                            <span class="detail-key">Born</span>
                            <span class="detail-val">${u.birthdate}</span>
                        ` : nothing}
                        <span class="detail-key">Language</span>
                        <span class="detail-val">${u.preferences.language}</span>
                        <span class="detail-key">Tone</span>
                        <span class="detail-val">${u.preferences.tone}</span>
                        <span class="detail-key">Readings</span>
                        <span class="detail-val">${u.stats.totalReadings}</span>
                        <span class="detail-key">Follow-ups</span>
                        <span class="detail-val">${u.stats.totalFollowUps}</span>
                        <span class="detail-key">First seen</span>
                        <span class="detail-val">${this._formatTime(u.firstSeenAt)}</span>
                        <span class="detail-key">Last seen</span>
                        <span class="detail-val">${this._formatTime(u.lastSeenAt)}</span>
                        ${u.locations.lastCountry ? html`
                            <span class="detail-key">Last country</span>
                            <span class="detail-val">${u.locations.lastCountry}</span>
                        ` : nothing}
                        ${u.locations.lastCity ? html`
                            <span class="detail-key">Last city</span>
                            <span class="detail-val">${u.locations.lastCity}</span>
                        ` : nothing}
                    </div>
                </div>

                <!-- Traits -->
                ${Object.keys(u.traits).length > 0 ? html`
                    <div class="detail-section">
                        <div class="section-title">Traits</div>
                        <div class="trait-grid">
                            ${Object.entries(u.traits).map(([k, v]) => html`
                                <div class="trait-pill">
                                    <span class="trait-key">${k.replace(/_/g, ' ')}:</span>${v}
                                </div>
                            `)}
                        </div>
                    </div>
                ` : nothing}

                <!-- Locations -->
                ${d.locations.length > 0 ? html`
                    <div class="detail-section">
                        <div class="section-title">Recent Locations</div>
                        <div class="location-list">
                            ${d.locations.map(loc => html`
                                <div class="location-row">
                                    <span class="location-flag">${this._countryFlag(loc.country)}</span>
                                    <span class="location-place">
                                        ${[loc.city, loc.country].filter(Boolean).join(', ') || 'Unknown'}
                                        ${loc.timezone ? html` <span class="faint-text">(${loc.timezone})</span>` : nothing}
                                    </span>
                                    <span class="location-time">${this._formatTime(loc.lastSeen)}</span>
                                </div>
                            `)}
                        </div>
                    </div>
                ` : nothing}

                <!-- Games -->
                <div class="detail-section">
                    <div class="section-title">Games (${d.totalGames} total, showing last ${d.games.length})</div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Spread</th>
                                    <th>Topic</th>
                                    <th>Lang</th>
                                    <th>Turns</th>
                                    <th>Location</th>
                                    <th>Question</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${d.games.map(g => html`
                                    <tr>
                                        <td>${this._formatTime(g.createdAt)}</td>
                                        <td><a class="drill-link" @click=${() => this._openGame(g.gameId)}>${g.spreadType}-card</a></td>
                                        <td>${g.topic ? html`<span class="tag topic">${g.topic}</span>` : '-'}</td>
                                        <td><span class="tag lang">${g.language}</span></td>
                                        <td>${g.turnCount}</td>
                                        <td>${g.location
                                            ? html`${this._countryFlag(g.location.country)} ${g.location.city ?? g.location.country ?? ''}`
                                            : '-'}</td>
                                        <td style="max-width: 160px; overflow: hidden; text-overflow: ellipsis;">
                                            ${g.question ?? '-'}
                                        </td>
                                    </tr>
                                `)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // ── Game detail view ──────────────────────────────────────────────

    private _renderGameDetail() {
        const d = this._gameData!;
        const g = d.game;
        const reading = g.reading as { cards?: Array<{ position: string; name: string; reading: string }>; overall?: string } | null;

        return html`
            <div class="fade-in">
                <div class="breadcrumb">
                    <a class="drill-link" @click=${this._backToOverview}>Dashboard</a>
                    <span class="sep">/</span>
                    <a class="drill-link" @click=${() => this._openUser(g.uid)}>User ${g.uid.slice(0, 8)}</a>
                    <span class="sep">/</span>
                    <span>Game ${g.gameId.slice(0, 8)}</span>
                </div>

                ${this._error ? html`<div class="error-box">${this._error}</div>` : nothing}

                <!-- Game info -->
                <div class="detail-section">
                    <div class="section-title">${g.spreadType}-Card Spread</div>
                    <div class="detail-grid">
                        <span class="detail-key">Game ID</span>
                        <span class="detail-val">${g.gameId}</span>
                        <span class="detail-key">Created</span>
                        <span class="detail-val">${this._formatTime(g.createdAt)}</span>
                        ${g.question ? html`
                            <span class="detail-key">Question</span>
                            <span class="detail-val">${g.question}</span>
                        ` : nothing}
                        ${g.topic ? html`
                            <span class="detail-key">Topic</span>
                            <span class="detail-val">${g.topic}</span>
                        ` : nothing}
                        <span class="detail-key">Language</span>
                        <span class="detail-val">${g.language}</span>
                        <span class="detail-key">Tone</span>
                        <span class="detail-val">${g.tone}</span>
                        <span class="detail-key">Turns</span>
                        <span class="detail-val">${g.turnCount}</span>
                        ${g.location?.country ? html`
                            <span class="detail-key">Location</span>
                            <span class="detail-val">${this._countryFlag(g.location.country)} ${[g.location.city, g.location.country].filter(Boolean).join(', ')}</span>
                        ` : nothing}
                    </div>
                </div>

                ${g.originalRequest ? html`
                    <div class="detail-section">
                        <div class="section-title">Original Request</div>
                        <div class="turn-card">
                            <div class="turn-answer">${JSON.stringify(g.originalRequest, null, 2)}</div>
                        </div>
                    </div>
                ` : nothing}

                <!-- Cards dealt -->
                <div class="detail-section">
                    <div class="section-title">Cards</div>
                    <div class="card-list">
                        ${g.cards.map(c => html`
                            <div class="card-chip">
                                <span class="pos">${c.position}:</span>
                                <span class="name">${c.name}</span>
                                ${c.reversed ? html`<span class="rev">(Rev)</span>` : nothing}
                            </div>
                        `)}
                    </div>
                </div>

                <!-- AI Reading -->
                ${reading?.cards ? html`
                    <div class="detail-section">
                        <div class="section-title">Reading</div>
                        ${reading.cards.map(c => html`
                            <div class="turn-card">
                                <div class="turn-header">
                                    <span class="turn-type">${c.position}: ${c.name}</span>
                                </div>
                                <div class="turn-answer">${c.reading}</div>
                            </div>
                        `)}
                        ${reading.overall ? html`
                            <div class="turn-card">
                                <div class="turn-header">
                                    <span class="turn-type">Overall Synthesis</span>
                                </div>
                                <div class="turn-answer">${reading.overall}</div>
                            </div>
                        ` : nothing}
                    </div>
                ` : nothing}

                <!-- Turns (follow-ups) -->
                ${d.turns.filter(t => t.turnType === 'followup').length > 0 ? html`
                    <div class="detail-section">
                        <div class="section-title">Follow-up Conversations</div>
                        ${d.turns.filter(t => t.turnType === 'followup').map(t => html`
                            <div class="turn-card">
                                <div class="turn-header">
                                    <span class="turn-type">Turn ${t.turnNumber}</span>
                                    <span class="turn-meta">${t.aiProvider}/${t.aiModel} | ${(t.responseTimeMs / 1000).toFixed(1)}s</span>
                                </div>
                                ${t.question ? html`
                                    <div class="turn-question">"${t.question}"</div>
                                ` : nothing}
                                <div class="turn-answer">${t.answerText}</div>
                                ${t.userContextDelta && Object.keys(t.userContextDelta).some(k => {
                                    const v = t.userContextDelta![k];
                                    if (k === 'traits' && typeof v === 'object') return Object.keys(v as object).length > 0;
                                    return v != null;
                                }) ? html`
                                    <div style="margin-top: 0.5em;">
                                        <span class="faint-text">Extracted: </span>
                                        <span class="dim-text">${JSON.stringify(t.userContextDelta)}</span>
                                    </div>
                                ` : nothing}
                            </div>
                        `)}
                    </div>
                ` : nothing}

                <!-- Reading turn performance -->
                ${d.turns.length > 0 ? html`
                    <div class="detail-section">
                        <div class="section-title">Performance</div>
                        <div class="perf-grid">
                            ${d.turns.map(t => html`
                                <div class="perf-card">
                                    <div class="perf-title">Turn ${t.turnNumber} (${t.turnType})</div>
                                    <div class="perf-value">${(t.responseTimeMs / 1000).toFixed(1)}s</div>
                                    <div class="faint-text" style="font-size:0.7em;">${t.aiProvider}/${t.aiModel}</div>
                                </div>
                            `)}
                        </div>
                    </div>
                ` : nothing}
            </div>
        `;
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private _countryFlag(countryCode: string | null): string {
        if (!countryCode || countryCode.length !== 2) return '';
        const code = countryCode.toUpperCase();
        return String.fromCodePoint(
            ...code.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65),
        );
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'dashboard-panel': DashboardPanel;
    }
}
