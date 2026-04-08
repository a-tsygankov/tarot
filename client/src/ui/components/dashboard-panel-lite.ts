import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.js';
import type { AppServices } from '../../app/composition-root.js';

type Tab = 'readings' | 'users' | 'sessions' | 'locations';
type DetailKind = 'overview' | 'user' | 'reading' | 'session' | 'location';
type JsonMap = Record<string, any>;

@customElement('dashboard-panel')
export class DashboardPanelLite extends LitElement {
    static override styles = [sharedStyles, css`
        .root { padding: .5em 0 1.5em; animation: fadeIn .25s ease-out; }
        .row, .tabs { display:flex; gap:.55em; flex-wrap:wrap; align-items:center; }
        .header, .panel, .stat { background: var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:.9em; }
        .header, .controls { display:flex; justify-content:space-between; gap:.6em; flex-wrap:wrap; align-items:center; margin-bottom:1em; }
        .title, .section { font-family: var(--font-display); color: var(--gold); }
        .title { font-size:1.28em; } .section { font-size:.95em; margin-bottom:.55em; }
        .subtle { color: var(--text-dim); font-size:.82em; }
        .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:.8em; margin-bottom:1em; }
        .value { font-family: var(--font-display); color: var(--gold); font-size:1.35em; display:flex; align-items:flex-end; gap:.35em; flex-wrap:wrap; }
        .scope-add { color:#86d79a; font-size:.62em; line-height:1.1; font-family: var(--font-body); }
        .field { flex:1; min-width:220px; padding:.55em .7em; background:var(--bg-card); border:1px solid var(--border); border-radius:8px; color:var(--text); font:inherit; }
        .field:focus { outline:none; border-color:var(--gold-dim); }
        .toggle, .linkish { padding:.35em .7em; border:1px solid var(--border); border-radius:8px; background:transparent; color:var(--text-dim); cursor:pointer; font:inherit; }
        .toggle.active, .toggle:hover, .linkish:hover { border-color:var(--gold-dim); color:var(--gold); background:var(--purple-dim); }
        .tabs { margin-bottom:1em; }
        .panel { margin-bottom:1em; }
        .error { background:rgba(180,50,50,.12); border:1px solid rgba(180,50,50,.28); border-radius:10px; padding:.85em; color:var(--text); margin-bottom:1em; }
        .table-wrap { overflow-x:auto; }
        table { width:100%; border-collapse:collapse; font-size:.82em; }
        th, td { text-align:left; padding:.55em; border-bottom:1px solid rgba(255,255,255,.05); vertical-align:top; }
        th { color:var(--gold); font-family:var(--font-display); font-weight:400; }
        td { color:var(--text-dim); }
        details { border:1px solid rgba(255,255,255,.05); border-radius:10px; padding:.6em .7em; background:rgba(255,255,255,.02); }
        summary { cursor:pointer; color:var(--text); }
        .pills { display:flex; gap:.4em; flex-wrap:wrap; margin-top:.5em; }
        .pill { padding:.2em .5em; border-radius:999px; border:1px solid var(--border); background:rgba(255,255,255,.03); color:var(--text); font-size:.8em; }
        .grid { display:grid; grid-template-columns:minmax(110px,auto) 1fr; gap:.35em .9em; font-size:.85em; }
        .k { color:var(--text-faint); } .v { color:var(--text); word-break:break-word; }
        .crumbs { display:flex; gap:.45em; flex-wrap:wrap; align-items:center; color:var(--text-dim); font-size:.83em; margin-bottom:1em; }
        pre { margin:0; white-space:pre-wrap; word-break:break-word; font-size:.78em; color:var(--text); font-family:ui-monospace,Consolas,monospace; }
    `];

    @property({ attribute: false }) services!: AppServices;

    @state() private data: JsonMap | null = null;
    @state() private detail: JsonMap | null = null;
    @state() private detailKind: DetailKind = 'overview';
    @state() private tab: Tab = 'readings';
    @state() private loading = false;
    @state() private detailLoading = false;
    @state() private validating = false;
    @state() private authenticated = false;
    @state() private error = '';
    @state() private keyInput = '';
    @state() private days = 7;
    @state() private lastRefresh = '';

    private adminKey = '';
    private timer: ReturnType<typeof setInterval> | null = null;
    private static readonly STORAGE_KEY = 'tarot_admin_key';

    override connectedCallback(): void {
        super.connectedCallback();
        const stored = localStorage.getItem(DashboardPanelLite.STORAGE_KEY);
        if (stored) {
            this.adminKey = stored;
            void this.validateAndLoad(stored);
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.timer) clearInterval(this.timer);
    }

    override render() {
        return html`
            <div class="root">
                <div class="header">
                    <div>
                        <div class="title">Dashboard</div>
                        ${this.authenticated && this.data ? html`<div class="subtle">${this.getObj(this.data, 'period')?.from} to ${this.getObj(this.data, 'period')?.to}</div>` : nothing}
                    </div>
                    <div class="row">
                        ${this.authenticated ? html`<button class="btn btn-ghost" @click=${this.logout}>Logout</button>` : nothing}
                        <button class="btn btn-ghost" @click=${() => this.dispatchEvent(new CustomEvent('close'))}>Close</button>
                    </div>
                </div>
                ${this.authenticated ? this.renderDashboard() : this.renderGate()}
            </div>
        `;
    }

    private renderGate() {
        return html`
            <div class="panel">
                <div class="section">Admin Access</div>
                <div class="subtle" style="margin-bottom:.75em;">Load users, sessions, locations, questions, and reading details.</div>
                <form class="controls" @submit=${this.onSubmit}>
                    <input class="field" type="password" placeholder="Admin key..." .value=${this.keyInput}
                        @input=${(e: InputEvent) => { this.keyInput = (e.target as HTMLInputElement).value; this.error = ''; }} />
                    <button class="btn btn-primary" type="submit" ?disabled=${this.validating || !this.keyInput.trim()}>
                        ${this.validating ? html`<span class="spinner"></span>` : 'Unlock'}
                    </button>
                </form>
                ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
            </div>
        `;
    }

    private renderDashboard() {
        if (this.detailLoading) return html`<div class="center" style="padding:3em 0;"><div class="spinner spinner-lg"></div></div>`;
        if (this.detailKind !== 'overview' && this.detail) return this.renderDetail();
        const d = this.data;
        if (!d) return this.loading ? html`<div class="center" style="padding:3em 0;"><div class="spinner spinner-lg"></div></div>` : nothing;
        const totals = this.getObj(d, 'totals');
        const perf = this.getObj(d, 'performance');
        const scopeDays = Number(d.scopeDays ?? this.days);
        return html`
            <div class="controls">
                <div class="row">
                    ${([1, 7, 30] as const).map(days => html`<button class="toggle ${this.days === days ? 'active' : ''}" @click=${() => this.changeDays(days)}>${days}d</button>`)}
                    <button class="toggle" @click=${this.fetchDashboard}>Refresh</button>
                    <button class="toggle" @click=${this.toggleAuto}>Auto</button>
                </div>
                ${this.lastRefresh ? html`<div class="subtle">Updated ${this.lastRefresh}</div>` : nothing}
            </div>
            ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
            <div class="stats">
                ${this.stat(totals?.users?.total, totals?.users?.scope, 'Users')}
                ${this.stat(totals?.sessions?.total, totals?.sessions?.scope, 'Sessions')}
                ${this.stat(totals?.readings?.total, totals?.readings?.scope, 'Readings')}
                ${this.stat(totals?.followUps?.total, totals?.followUps?.scope, 'Follow-ups')}
                ${this.stat(d.activeUsersToday, 'Active Today')}
                ${this.stat(perf ? `${(Number(perf.avgResponseMs ?? 0) / 1000).toFixed(1)}s` : '-', 'Avg Reading')}
            </div>
            <div class="subtle" style="margin:-.45em 0 1em;">Green +N shows additions in the current ${scopeDays}d scope. Active Today ignores scope.</div>
            <div class="panel">
                <div class="section">Top Languages</div>
                <div class="pills">
                    ${this.getArr(d, 'topLanguages').map((item: any) => html`<span class="pill">${item.language} ${item.count}</span>`)}
                </div>
            </div>
            <div class="tabs">
                ${this.tabBtn('readings', 'Readings')}
                ${this.tabBtn('users', 'Users')}
                ${this.tabBtn('sessions', 'Sessions')}
                ${this.tabBtn('locations', 'Locations')}
            </div>
            ${this.renderTab(d)}
        `;
    }

    private renderTab(d: JsonMap) {
        if (this.tab === 'users') {
            const users = this.getArr(d, 'users');
            return html`<div class="panel"><div class="section">Users</div><div class="table-wrap"><table><thead><tr><th>User</th><th>Profile</th><th>Traits</th><th>Sessions</th><th>Locations</th></tr></thead><tbody>
                ${users.map((u: any) => html`<tr>
                    <td><button class="linkish" @click=${() => this.openDetail('user', u.uid)}>${u.name ?? this.short(u.uid)}</button><div class="subtle">${this.short(u.uid)} · ${u.language}/${u.tone}</div></td>
                    <td><div>${[u.gender, u.birthdate].filter(Boolean).join(' · ') || 'No profile fields'}</div><div class="subtle">Readings ${u.totalReadings} · Follow-ups ${u.totalFollowUps}</div><div class="subtle">${[u.lastCity, u.lastCountry].filter(Boolean).join(', ') || 'Unknown'} · ${this.time(u.lastSeenAt)}</div><div class="subtle">${u.latestDevice ?? 'Unknown device'}</div></td>
                    <td>${this.detailList('Traits', this.traitEntries(u.userTraits))}</td>
                    <td>${this.detailActionList('Sessions', u.sessionIds ?? [], (id: string) => this.openDetail('session', id))}</td>
                    <td>${this.detailActionList('Locations', (u.locationKeys ?? []).map((v: string) => this.prettyLocation(v)), (key: string) => this.openDetail('location', this.locationKeyFromPretty(key)))}</td>
                </tr>`)}
            </tbody></table></div></div>`;
        }
        if (this.tab === 'sessions') {
            const sessions = this.getArr(d, 'sessions');
            return html`<div class="panel"><div class="section">Sessions</div><div class="table-wrap"><table><thead><tr><th>Session</th><th>User</th><th>Location</th><th>Activity</th><th>Questions</th></tr></thead><tbody>
                ${sessions.map((s: any) => html`<tr>
                    <td><button class="linkish" @click=${() => this.openDetail('session', s.sessionId)}>${this.short(s.sessionId)}</button><div class="subtle">${this.time(s.createdAt)}</div></td>
                    <td><button class="linkish" @click=${() => this.openDetail('user', s.uid)}>${this.short(s.uid)}</button></td>
                    <td>${s.city || s.country ? html`<button class="linkish" @click=${() => this.openDetail('location', this.locationKey(s.city, s.country))}>${[s.city, s.country].filter(Boolean).join(', ')}</button>` : '-'}</td>
                    <td>${s.gameCount} readings · ${s.device ?? 'unknown'} · v${s.appVersion}</td>
                    <td>${s.questionCount}</td>
                </tr>`)}
            </tbody></table></div></div>`;
        }
        if (this.tab === 'locations') {
            const locations = this.getArr(d, 'locations');
            return html`<div class="panel"><div class="section">Locations</div><div class="table-wrap"><table><thead><tr><th>Location</th><th>Users</th><th>Sessions</th><th>Readings</th><th>Last Played</th></tr></thead><tbody>
                ${locations.map((l: any) => html`<tr>
                    <td><button class="linkish" @click=${() => this.openDetail('location', l.key)}>${[l.city, l.country].filter(Boolean).join(', ')}</button></td>
                    <td>${l.userCount}</td><td>${l.sessionCount}</td><td>${l.gameCount}</td><td>${this.time(l.lastPlayedAt)}</td>
                </tr>`)}
            </tbody></table></div></div>`;
        }
        const readings = this.getArr(d, 'recentGames');
        return html`<div class="panel"><div class="section">Recent Readings</div><div class="table-wrap"><table><thead><tr><th>Time</th><th>Reading</th><th>User</th><th>Session</th><th>Location</th><th>Question</th></tr></thead><tbody>
            ${readings.map((g: any) => html`<tr>
                <td>${this.time(g.createdAt)}</td>
                <td><button class="linkish" @click=${() => this.openDetail('reading', g.gameId)}>${g.spreadType}-card</button></td>
                <td><button class="linkish" @click=${() => this.openDetail('user', g.uid)}>${this.short(g.uid)}</button></td>
                <td><button class="linkish" @click=${() => this.openDetail('session', g.sessionId)}>${this.short(g.sessionId)}</button></td>
                <td>${g.city || g.country ? html`<button class="linkish" @click=${() => this.openDetail('location', this.locationKey(g.city, g.country))}>${[g.city, g.country].filter(Boolean).join(', ')}</button>` : '-'}</td>
                <td>${g.question ?? '-'}</td>
            </tr>`)}
        </tbody></table></div></div>`;
    }

    private renderDetail() {
        const d = this.detail!;
        if (this.detailKind === 'user') {
            const user = this.getObj(d, 'user')!;
            return html`${this.crumb('User', user.name ?? this.short(String(user.uid ?? '')))}
                <div class="panel"><div class="section">User Profile</div><div class="grid">
                    <span class="k">UID</span><span class="v">${user.uid}</span>
                    <span class="k">Language</span><span class="v">${user.preferences?.language}</span>
                    <span class="k">Tone</span><span class="v">${user.preferences?.tone}</span>
                    <span class="k">Readings</span><span class="v">${user.stats?.totalReadings}</span>
                    <span class="k">Follow-ups</span><span class="v">${user.stats?.totalFollowUps}</span>
                    <span class="k">Last location</span><span class="v">${[user.locations?.lastCity, user.locations?.lastCountry].filter(Boolean).join(', ') || 'Unknown'}</span>
                    <span class="k">Latest device</span><span class="v">${user.latestDevice ?? 'Unknown'}</span>
                </div>${this.traitEntries(user.userTraits).length ? html`<div class="section" style="margin-top:.9em;">Traits</div><div class="pills">${this.traitEntries(user.userTraits).map(value => html`<span class="pill">${value}</span>`)}</div>` : nothing}</div>
                <div class="panel"><div class="section">Sessions</div><div class="stack">${this.getArr(d, 'sessions').map((s: any) => html`<details><summary>${this.time(s.createdAt)} · ${[s.city, s.country].filter(Boolean).join(', ') || 'Unknown'} · ${s.gameCount} readings</summary><div class="pills"><button class="linkish" @click=${() => this.openDetail('session', s.sessionId)}>Open session</button>${s.lastGameId ? html`<button class="linkish" @click=${() => this.openDetail('reading', s.lastGameId)}>Latest reading</button>` : nothing}</div></details>`)}</div></div>
                <div class="panel"><div class="section">Readings</div><div class="table-wrap"><table><thead><tr><th>Time</th><th>Reading</th><th>Session</th><th>Location</th><th>Question</th></tr></thead><tbody>${this.getArr(d, 'games').map((g: any) => html`<tr><td>${this.time(g.createdAt)}</td><td><button class="linkish" @click=${() => this.openDetail('reading', g.gameId)}>${g.spreadType}-card</button></td><td><button class="linkish" @click=${() => this.openDetail('session', g.sessionId)}>${this.short(g.sessionId)}</button></td><td>${[g.location?.city, g.location?.country].filter(Boolean).join(', ') || '-'}</td><td>${g.question ?? '-'}</td></tr>`)}</tbody></table></div></div>`;
        }
        if (this.detailKind === 'reading') {
            const game = this.getObj(d, 'game')!;
            return html`${this.crumb('Reading', this.short(String(game.gameId ?? '')))}
                <div class="panel"><div class="section">Reading Detail</div><div class="grid">
                    <span class="k">Reading ID</span><span class="v">${game.gameId}</span>
                    <span class="k">User</span><span class="v"><button class="linkish" @click=${() => this.openDetail('user', String(game.uid))}>${this.short(String(game.uid))}</button></span>
                    <span class="k">Session</span><span class="v"><button class="linkish" @click=${() => this.openDetail('session', String(game.sessionId))}>${this.short(String(game.sessionId))}</button></span>
                    <span class="k">Location</span><span class="v">${[game.location?.city, game.location?.country].filter(Boolean).join(', ') || 'Unknown'}</span>
                    <span class="k">Question</span><span class="v">${game.question ?? '-'}</span>
                </div>${game.originalRequest ? html`<div class="section" style="margin-top:.9em;">Original Request</div><pre>${JSON.stringify(game.originalRequest, null, 2)}</pre>` : nothing}</div>
                <div class="panel"><div class="section">Reading And Follow-up Turns</div><div class="stack">${this.getArr(d, 'turns').map((t: any) => html`<div><div class="subtle">${t.turnType} · ${t.aiProvider}/${t.aiModel} · ${(Number(t.responseTimeMs ?? 0) / 1000).toFixed(1)}s · ${this.time(t.createdAt)}</div>${t.question ? html`<div class="subtle">${t.question}</div>` : nothing}<pre>${t.answerText}</pre>${t.userContextDelta ? html`<div class="subtle">Extracted: ${JSON.stringify(t.userContextDelta)}</div>` : nothing}</div>`)}</div></div>`;
        }
        if (this.detailKind === 'session') {
            const session = this.getObj(d, 'session')!;
            return html`${this.crumb('Session', this.short(String(session.sessionId ?? '')))}
                <div class="panel"><div class="section">Session Detail</div><div class="grid">
                    <span class="k">User</span><span class="v"><button class="linkish" @click=${() => this.openDetail('user', String(session.uid))}>${this.short(String(session.uid))}</button></span>
                    <span class="k">Location</span><span class="v">${[session.city, session.country].filter(Boolean).join(', ') || 'Unknown'}</span>
                    <span class="k">Timezone</span><span class="v">${session.timezone ?? '-'}</span>
                    <span class="k">Device</span><span class="v">${session.device ?? '-'} · v${session.appVersion}</span>
                    <span class="k">Device type</span><span class="v">${session.deviceInfo?.deviceType ?? '-'}</span>
                    <span class="k">Model</span><span class="v">${session.deviceInfo?.model ?? '-'}</span>
                    <span class="k">OS</span><span class="v">${[session.deviceInfo?.osName, session.deviceInfo?.osVersion].filter(Boolean).join(' ') || '-'}</span>
                    <span class="k">Browser</span><span class="v">${[session.deviceInfo?.browserName, session.deviceInfo?.browserVersion].filter(Boolean).join(' ') || '-'}</span>
                    <span class="k">Screen</span><span class="v">${session.screenWidth ?? '-'} × ${session.screenHeight ?? '-'}</span>
                </div></div>
                <div class="panel"><div class="section">Readings In Session</div><div class="table-wrap"><table><thead><tr><th>Time</th><th>Reading</th><th>Question</th><th>Location</th></tr></thead><tbody>${this.getArr(d, 'games').map((g: any) => html`<tr><td>${this.time(g.createdAt)}</td><td><button class="linkish" @click=${() => this.openDetail('reading', g.gameId)}>${g.gameId}</button></td><td>${g.question ?? '-'}</td><td>${[g.location?.city, g.location?.country].filter(Boolean).join(', ') || '-'}</td></tr>`)}</tbody></table></div></div>
                <div class="panel"><div class="section">All Questions And Answers</div><div class="stack">${this.getArr(d, 'turns').map((t: any) => html`<div><div class="subtle">${t.gameId} · ${t.turnType} · ${this.time(t.createdAt)}</div>${t.question ? html`<div class="subtle">${t.question}</div>` : nothing}<pre>${t.answerText}</pre></div>`)}</div></div>`;
        }
        const location = this.getObj(d, 'location')!;
        return html`${this.crumb('Location', [location.city, location.country].filter(Boolean).join(', '))}
            <div class="panel"><div class="section">Players In This Location</div><div class="stack">${this.getArr(d, 'users').map((u: any) => html`<details><summary>${u.name ?? this.short(u.uid)} · ${u.totalReadings} readings</summary><div class="pills"><button class="linkish" @click=${() => this.openDetail('user', u.uid)}>Open user</button>${this.traitEntries(u.userTraits).map(value => html`<span class="pill">${value}</span>`)}</div></details>`)}</div></div>
            <div class="panel"><div class="section">Sessions</div><div class="table-wrap"><table><thead><tr><th>Session</th><th>User</th><th>Readings</th><th>Questions</th></tr></thead><tbody>${this.getArr(d, 'sessions').map((s: any) => html`<tr><td><button class="linkish" @click=${() => this.openDetail('session', s.sessionId)}>${this.short(s.sessionId)}</button></td><td><button class="linkish" @click=${() => this.openDetail('user', s.uid)}>${this.short(s.uid)}</button></td><td>${s.gameCount}</td><td>${s.questionCount}</td></tr>`)}</tbody></table></div></div>
            <div class="panel"><div class="section">Readings</div><div class="table-wrap"><table><thead><tr><th>Reading</th><th>User</th><th>Session</th><th>Question</th></tr></thead><tbody>${this.getArr(d, 'games').map((g: any) => html`<tr><td><button class="linkish" @click=${() => this.openDetail('reading', g.gameId)}>${g.gameId}</button></td><td><button class="linkish" @click=${() => this.openDetail('user', g.uid)}>${this.short(g.uid)}</button></td><td><button class="linkish" @click=${() => this.openDetail('session', g.sessionId)}>${this.short(g.sessionId)}</button></td><td>${g.question ?? '-'}</td></tr>`)}</tbody></table></div></div>`;
    }

    private stat(value: unknown, scopeOrLabel: unknown, maybeLabel?: string) {
        const scope = typeof maybeLabel === 'string' ? scopeOrLabel as number | string | undefined : undefined;
        const label = typeof maybeLabel === 'string' ? maybeLabel : scopeOrLabel as string;
        return html`<div class="stat"><div class="value">${value ?? '-'}${typeof scope === 'number' && scope > 0 ? html`<span class="scope-add">+${scope}</span>` : nothing}</div><div class="subtle">${label}</div></div>`;
    }
    private tabBtn(tab: Tab, label: string) { return html`<button class="toggle ${this.tab === tab ? 'active' : ''}" @click=${() => { this.tab = tab; }}>${label}</button>`; }
    private crumb(label: string, value: string) { return html`<div class="crumbs"><button class="linkish" @click=${this.back}>Dashboard</button><span>/</span><span>${label}</span><span>/</span><span>${value}</span></div>`; }
    private detailList(title: string, values: string[]) { return values.length ? html`<details><summary>${title} (${values.length})</summary><div class="pills">${values.map(v => html`<span class="pill">${v}</span>`)}</div></details>` : html`<span class="subtle">None</span>`; }
    private detailActionList(title: string, values: string[], fn: (value: string) => void) { return values.length ? html`<details><summary>${title} (${values.length})</summary><div class="pills">${values.map(v => html`<button class="linkish" @click=${() => fn(v)}>${v}</button>`)}</div></details>` : html`<span class="subtle">None</span>`; }

    private onSubmit = async (event: Event) => { event.preventDefault(); if (this.keyInput.trim()) await this.validateAndLoad(this.keyInput.trim()); };
    private logout = () => { this.authenticated = false; this.adminKey = ''; this.data = null; this.detail = null; this.detailKind = 'overview'; this.error = ''; localStorage.removeItem(DashboardPanelLite.STORAGE_KEY); if (this.timer) clearInterval(this.timer); };
    private back = () => { this.detail = null; this.detailKind = 'overview'; this.error = ''; };
    private changeDays(days: number) { this.days = days; void this.fetchDashboard(); }
    private toggleAuto = () => { if (this.timer) { clearInterval(this.timer); this.timer = null; return; } this.timer = setInterval(() => void this.fetchDashboard(), 60_000); };

    private async validateAndLoad(key: string): Promise<void> {
        this.validating = true; this.error = '';
        try {
            const base = this.services?.config?.apiBase ?? '';
            const response = await fetch(`${base}/api/admin/auth`, { method: 'POST', headers: { 'X-Admin-Key': key } });
            if (!response.ok) throw new Error('Invalid admin key');
            this.authenticated = true; this.adminKey = key; localStorage.setItem(DashboardPanelLite.STORAGE_KEY, key); await this.fetchDashboard();
        } catch (error) {
            this.logout(); this.error = error instanceof Error ? error.message : String(error);
        } finally {
            this.validating = false;
        }
    }

    private fetchDashboard = async (): Promise<void> => {
        if (!this.adminKey || this.loading) return;
        this.loading = true; this.error = '';
        try {
            this.data = await this.fetchJson(`/api/admin/dashboard?days=${this.days}`); this.lastRefresh = new Date().toLocaleTimeString();
        } catch (error) {
            this.error = error instanceof Error ? error.message : String(error);
        } finally {
            this.loading = false;
        }
    };

    private async openDetail(kind: Exclude<DetailKind, 'overview'>, id: string): Promise<void> {
        this.detailLoading = true; this.error = '';
        try {
            const apiKind = kind === 'reading' ? 'game' : kind;
            this.detail = await this.fetchJson(`/api/admin/${apiKind}/${id}`);
            this.detailKind = kind;
        } catch (error) {
            this.error = error instanceof Error ? error.message : String(error);
        } finally {
            this.detailLoading = false;
        }
    }

    private async fetchJson(path: string): Promise<JsonMap> {
        const base = this.services?.config?.apiBase ?? '';
        const response = await fetch(`${base}${path}`, { headers: { 'X-Admin-Key': this.adminKey } });
        if (response.status === 401) { this.logout(); throw new Error('Admin key expired or invalid.'); }
        if (!response.ok) {
            const body = await response.json().catch(() => ({})) as Record<string, string>;
            throw new Error(body.message || body.error || `HTTP ${response.status}`);
        }
        return await response.json() as JsonMap;
    }

    private short(value: string): string { return value.length <= 10 ? value : `${value.slice(0, 8)}...`; }
    private time(iso: string): string { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; }
    private locationKey(city: string | null, country: string | null): string { return encodeURIComponent(`${city ?? ''}|${country ?? ''}`); }
    private prettyLocation(key: string): string { return decodeURIComponent(key).replace('|', ', '); }
    private locationKeyFromPretty(label: string): string { const [city, country] = label.split(',').map(v => v.trim()); return this.locationKey(city || null, country || null); }
    private getObj(source: JsonMap, key: string): JsonMap | undefined { const value = source[key]; return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonMap : undefined; }
    private getArr(source: JsonMap, key: string): unknown[] { return Array.isArray(source[key]) ? source[key] as unknown[] : []; }
    private traitEntries(source: Record<string, string[]> | undefined): string[] {
        return Object.entries(source ?? {}).flatMap(([key, values]) =>
            (values ?? []).map(value => `${key}: ${value}`),
        );
    }
}

declare global {
    interface HTMLElementTagNameMap { 'dashboard-panel': DashboardPanelLite; }
}
