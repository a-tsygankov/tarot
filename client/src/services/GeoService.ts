/**
 * Passive geolocation service — no user permission required.
 *
 * Two-tier approach:
 *
 * 1. **Intl timezone** (instant, client-side) — `Intl.DateTimeFormat().resolvedOptions().timeZone`
 *    returns IANA timezone (e.g. "Europe/Berlin"). Accuracy: timezone region only.
 *    Cannot distinguish cities in the same timezone (e.g. NY, Boston, Philadelphia).
 *
 * 2. **Cloudflare IP geolocation** (async, server-side via `/api/geo`) — uses CF headers
 *    (`cf-ipcountry`, `cf.city`, `cf.region`, `cf.timezone`, `cf.latitude`, `cf.longitude`)
 *    attached to every Cloudflare Worker request. Accuracy: city-level.
 *    CAN distinguish NY from Boston from Philadelphia.
 *    Also returns the client's IP address.
 *
 * Methods NOT used (require permission or leak data):
 * - `navigator.geolocation` — requires explicit user permission popup
 * - Third-party IP APIs — sends user IP to external services (GDPR risk)
 */

export interface GeoIpResult {
    ip: string | null;
    country: string | null;
    city: string | null;
    region: string | null;
    timezone: string | null;
    latitude: string | null;
    longitude: string | null;
}

export class GeoService {
    private _timezone: string | null = null;
    private _region: string | null = null;
    private _ipGeo: GeoIpResult | null = null;
    private _ipGeoPromise: Promise<GeoIpResult | null> | null = null;

    constructor(private _apiBase: string = '') {
        this._resolveTimezone();
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
        const parts = this._timezone.split('/');
        if (parts.length < 2) return null;
        return parts[parts.length - 1].replace(/_/g, ' ');
    }

    /** IP-based geo data from Cloudflare (null until fetched) */
    get ipGeo(): GeoIpResult | null {
        return this._ipGeo;
    }

    /** Client IP address (null until fetched from server) */
    get clientIp(): string | null {
        return this._ipGeo?.ip ?? null;
    }

    /** Best available city: CF city > timezone-inferred city */
    get city(): string | null {
        return this._ipGeo?.city ?? this.inferredCity;
    }

    /** Best available country */
    get country(): string | null {
        return this._ipGeo?.country ?? null;
    }

    /**
     * Fetch IP-based geolocation from the server (Cloudflare headers).
     * Call once at app startup; result is cached.
     */
    async fetchIpGeo(): Promise<GeoIpResult | null> {
        if (this._ipGeo) return this._ipGeo;
        if (this._ipGeoPromise) return this._ipGeoPromise;

        this._ipGeoPromise = this._doFetchIpGeo();
        return this._ipGeoPromise;
    }

    /** Summary for console/diagnostics */
    toSummary(): string {
        const parts: string[] = [];
        if (this._timezone) parts.push(`TZ: ${this._timezone}`);
        if (this._region) parts.push(`Region: ${this._region}`);
        if (this._ipGeo?.city) parts.push(`City: ${this._ipGeo.city}`);
        else if (this.inferredCity) parts.push(`~City: ${this.inferredCity}`);
        if (this._ipGeo?.country) parts.push(`Country: ${this._ipGeo.country}`);
        if (this._ipGeo?.ip) parts.push(`IP: ${this._ipGeo.ip}`);
        return parts.length > 0 ? parts.join(' | ') : 'Unknown';
    }

    /** Payload for API requests (fallback when CF geo is unavailable) */
    toPayload(): { timezone: string | null; inferredCity: string | null; region: string | null; ip: string | null; city: string | null; country: string | null } {
        return {
            timezone: this._timezone,
            inferredCity: this.inferredCity,
            region: this._region,
            ip: this.clientIp,
            city: this.city,
            country: this.country,
        };
    }

    private _resolveTimezone(): void {
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

    private async _doFetchIpGeo(): Promise<GeoIpResult | null> {
        try {
            const resp = await fetch(`${this._apiBase}/api/geo`);
            if (!resp.ok) return null;
            this._ipGeo = await resp.json() as GeoIpResult;
            console.log(
                '%cGeo (IP):',
                'color: #70c080; font-weight: bold;',
                this._ipGeo.city ?? 'unknown city',
                this._ipGeo.country ?? '',
                this._ipGeo.ip ?? '',
            );
            return this._ipGeo;
        } catch (err) {
            console.warn('IP geo fetch failed:', err instanceof Error ? err.message : err);
            return null;
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
