/**
 * Passive geolocation service — no user permission required.
 *
 * Available methods (no permission dialog):
 *
 * 1. **Intl timezone** — `Intl.DateTimeFormat().resolvedOptions().timeZone`
 *    returns IANA timezone (e.g. "Europe/Berlin"). Available in all browsers.
 *    Accuracy: timezone region only.
 *
 * 2. **Cloudflare CF headers** (server-side) — `cf-ipcountry`, `cf.city`,
 *    `cf.timezone` are attached to every Cloudflare Worker request automatically.
 *    Accuracy: city-level. This is the primary geo source and is handled by
 *    the worker, not the client.
 *
 * 3. **Timezone-to-region mapping** — we can infer a rough region from the
 *    IANA timezone string (e.g. "America/New_York" → North America, Eastern).
 *
 * Methods NOT used (require permission or leak data):
 * - `navigator.geolocation` — requires explicit user permission popup
 * - Third-party IP APIs — sends user IP to external services (GDPR risk)
 *
 * This service extracts what the browser can tell us passively and provides
 * it for display and as a fallback when CF headers aren't available.
 */
export class GeoService {
    private _timezone: string | null = null;
    private _region: string | null = null;

    constructor() {
        this._resolve();
    }

    /** IANA timezone string, e.g. "Europe/Berlin" */
    get timezone(): string | null {
        return this._timezone;
    }

    /** Human-readable region derived from timezone, e.g. "Europe" */
    get region(): string | null {
        return this._region;
    }

    /** Representative city from IANA timezone, e.g. "Berlin" */
    get inferredCity(): string | null {
        if (!this._timezone) return null;
        // IANA format is "Continent/City" or "Continent/Sub/City"
        const parts = this._timezone.split('/');
        if (parts.length < 2) return null;
        return parts[parts.length - 1].replace(/_/g, ' ');
    }

    /** Summary for console/diagnostics */
    toSummary(): string {
        const parts: string[] = [];
        if (this._timezone) parts.push(`TZ: ${this._timezone}`);
        if (this._region) parts.push(`Region: ${this._region}`);
        if (this.inferredCity) parts.push(`~City: ${this.inferredCity}`);
        return parts.length > 0 ? parts.join(' | ') : 'Unknown';
    }

    /** Payload for API requests (fallback when CF geo is unavailable) */
    toPayload(): { timezone: string | null; inferredCity: string | null; region: string | null } {
        return {
            timezone: this._timezone,
            inferredCity: this.inferredCity,
            region: this._region,
        };
    }

    private _resolve(): void {
        try {
            this._timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            this._timezone = null;
        }

        if (this._timezone) {
            const continent = this._timezone.split('/')[0];
            this._region = this._mapContinent(continent);
        }
    }

    private _mapContinent(continent: string): string {
        const map: Record<string, string> = {
            'Africa': 'Africa',
            'America': 'Americas',
            'Antarctica': 'Antarctica',
            'Arctic': 'Arctic',
            'Asia': 'Asia',
            'Atlantic': 'Atlantic',
            'Australia': 'Oceania',
            'Europe': 'Europe',
            'Indian': 'Indian Ocean',
            'Pacific': 'Oceania',
            'US': 'North America',
            'Canada': 'North America',
            'Brazil': 'South America',
            'Chile': 'South America',
            'Mexico': 'North America',
            'Etc': 'Unknown',
        };
        return map[continent] ?? continent;
    }
}
