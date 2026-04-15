import type { IUserContext, DeviceInfo } from '@shared/models/user-context.js';
import type { TraitValueMap, UserContextDelta, UserTraitsPayload } from '@shared/contracts/api-contracts.js';

const STORAGE_KEYS = {
    uid: 'tarot_uid',
    lang: 'tarot_lang',
    tone: 'tarot_tone',
    theme: 'tarot_theme',
    noReversedCards: 'tarot_no_reversed_cards',
    muted: 'tarot_muted',
    voicePreference: 'tarot_voice_preference',
    ttsProvider: 'tarot_tts_provider',
    ttsSpeed: 'tarot_tts_speed',
    font: 'tarot_font',
    userName: 'tarot_user_name',
    userGender: 'tarot_user_gender',
    userBirthdate: 'tarot_user_birthdate',
    userTraits: 'tarot_user_traits',
    totalReadings: 'tarot_total_readings',
    version: 'tarot_version',
} as const;

/**
 * Accumulated user profile built from AI-extracted data across sessions.
 * Persisted to localStorage on client.
 */
export class UserContext implements IUserContext {
    uid: string;
    sessionId: string;
    name: string | null = null;
    gender: string | null = null;
    birthdate: string | null = null;
    location: string | null = null;
    userTraits: UserTraitsPayload | null = null;
    language = 'ENG';
    tone = 'Mystical';
    theme = 'dusk';
    noReversedCards = false;
    muted = false;
    voicePreference: 'female' | 'male' | 'off' = 'female';
    ttsProvider: 'browser' | 'piper';
    totalReadings = 0;
    deviceInfo: DeviceInfo;

    constructor() {
        this.uid = this.getOrCreateUid();
        this.sessionId = crypto.randomUUID();
        this.deviceInfo = this.buildDeviceInfo();
        this.ttsProvider = this.detectDefaultTtsProvider();
    }

    /** Restore saved fields from localStorage. */
    restore(): void {
        this.name = localStorage.getItem(STORAGE_KEYS.userName);
        this.gender = localStorage.getItem(STORAGE_KEYS.userGender);
        this.birthdate = localStorage.getItem(STORAGE_KEYS.userBirthdate);
        this.language = localStorage.getItem(STORAGE_KEYS.lang) ?? 'ENG';
        this.tone = localStorage.getItem(STORAGE_KEYS.tone) ?? 'Mystical';
        this.theme = localStorage.getItem(STORAGE_KEYS.theme) ?? 'dusk';
        this.noReversedCards = (localStorage.getItem(STORAGE_KEYS.noReversedCards) ?? 'false') === 'true';
        this.muted = (localStorage.getItem(STORAGE_KEYS.muted) ?? 'false') === 'true';
        this.voicePreference = (localStorage.getItem(STORAGE_KEYS.voicePreference) as 'female' | 'male' | 'off' | null) ?? 'female';
        this.ttsProvider = (localStorage.getItem(STORAGE_KEYS.ttsProvider) as 'browser' | 'piper' | null) ?? this.detectDefaultTtsProvider();
        this.totalReadings = parseInt(localStorage.getItem(STORAGE_KEYS.totalReadings) ?? '0', 10);
        this.location = null;

        const traitsJson = localStorage.getItem(STORAGE_KEYS.userTraits);
        if (traitsJson) {
            try {
                const parsed = JSON.parse(traitsJson) as UserTraitsPayload | TraitValueMap;
                this.userTraits = this.normalizeStoredTraits(parsed);
            } catch {
                this.userTraits = null;
            }
        }
    }

    /** Persist saveable fields to localStorage. */
    save(): void {
        localStorage.setItem(STORAGE_KEYS.uid, this.uid);
        this.setIfNotNull(STORAGE_KEYS.userName, this.name);
        this.setIfNotNull(STORAGE_KEYS.userGender, this.gender);
        this.setIfNotNull(STORAGE_KEYS.userBirthdate, this.birthdate);
        localStorage.setItem(STORAGE_KEYS.lang, this.language);
        localStorage.setItem(STORAGE_KEYS.tone, this.tone);
        localStorage.setItem(STORAGE_KEYS.theme, this.theme);
        localStorage.setItem(STORAGE_KEYS.noReversedCards, String(this.noReversedCards));
        localStorage.setItem(STORAGE_KEYS.muted, String(this.muted));
        localStorage.setItem(STORAGE_KEYS.voicePreference, this.voicePreference);
        localStorage.setItem(STORAGE_KEYS.ttsProvider, this.ttsProvider);
        localStorage.setItem(STORAGE_KEYS.totalReadings, String(this.totalReadings));
        if (this.userTraits) {
            localStorage.setItem(STORAGE_KEYS.userTraits, JSON.stringify(this.userTraits));
        } else {
            localStorage.removeItem(STORAGE_KEYS.userTraits);
        }
    }

    /**
     * Merge AI-returned top-level user context delta.
     * Traits are server-owned and replaced separately via applyUserTraits().
     */
    applyAiUpdate(delta: UserContextDelta | null): void {
        if (!delta) return;

        const changes: string[] = [];

        if (delta.name != null && delta.name !== this.name) {
            this.name = delta.name;
            changes.push(`name: ${delta.name}`);
        }
        if (delta.gender != null && delta.gender !== this.gender) {
            this.gender = delta.gender;
            changes.push(`gender: ${delta.gender}`);
        }
        if (delta.birthdate != null && delta.birthdate !== this.birthdate) {
            this.birthdate = delta.birthdate;
            changes.push(`birthdate: ${delta.birthdate}`);
        }
        if (delta.location != null && delta.location !== this.location) {
            this.location = delta.location;
            changes.push(`location: ${delta.location}`);
        }

        if (changes.length > 0) {
            console.log(
                '%cAI updated user context:',
                'color: #c9a84c; font-weight: bold;',
                changes.join(' | '),
            );
        }

        this.save();
    }

    applyUserTraits(userTraits: UserTraitsPayload | null): void {
        this.userTraits = userTraits ? {
            ...userTraits,
            traits: this.normalizeTraitMap(userTraits.traits),
        } : null;
        this.save();
    }

    /** Client IP address (populated from GeoService after IP geo fetch) */
    ip: string | null = null;

    /** City-level location from CF IP geo (more precise than timezone) */
    ipCity: string | null = null;

    /** Country from CF IP geo */
    ipCountry: string | null = null;

    applyGeoLocation(city: string | null, country: string | null, ip: string | null = null): void {
        this.ipCity = city;
        this.ipCountry = country;
        this.ip = ip;
        this.location = [city, country].filter(Boolean).join(', ') || null;
    }

    /** Serialize for API requests. */
    toApiPayload() {
        return {
            uid: this.uid,
            sessionId: this.sessionId,
            name: this.name,
            gender: this.gender,
            birthdate: this.birthdate,
            location: this.location,
            userTraits: this.userTraits,
            language: this.language,
            tone: this.tone,
            ip: this.ip,
            ipCity: this.ipCity,
            ipCountry: this.ipCountry,
        };
    }

    /** Build human-readable summary for prompt context. */
    toPromptSummary(): string {
        const parts: string[] = [];
        if (this.name) parts.push('Name: ' + this.name);
        if (this.gender) parts.push('Gender: ' + this.gender);
        if (this.birthdate) parts.push('Born: ' + this.birthdate);
        if (this.location) parts.push('Location: ' + this.location);

        for (const [key, values] of Object.entries(this.userTraits?.traits ?? {})) {
            if (!values.length) continue;
            parts.push(key.replace(/_/g, ' ') + ': ' + values.join(', '));
        }

        return parts.length > 0 ? parts.join(' | ') : 'No personal details known.';
    }

    // ── Private helpers ──────────────────────────────────────────────

    private getOrCreateUid(): string {
        const existing = localStorage.getItem(STORAGE_KEYS.uid);
        if (existing) return existing;

        const uid = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEYS.uid, uid);
        return uid;
    }

    private buildDeviceInfo(): DeviceInfo {
        const userAgent = navigator.userAgent ?? '';
        const platform = navigator.platform ?? '';
        const maxTouchPoints = navigator.maxTouchPoints ?? 0;
        const isIpad = /iPad/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
        const isIphone = /iPhone/i.test(userAgent);
        const isAndroid = /Android/i.test(userAgent);
        const isMobile = /Mobile/i.test(userAgent) || isIphone || isAndroid;
        const deviceType: DeviceInfo['deviceType'] = isIphone || (isAndroid && isMobile)
            ? 'phone'
            : isIpad || (isAndroid && !isMobile)
                ? 'tablet'
                : /Windows|Macintosh|Linux|X11/i.test(userAgent)
                    ? 'desktop'
                    : 'unknown';

        const os = this.parseOs(userAgent, platform, isIpad);
        const browser = this.parseBrowser(userAgent);
        const model = this.parseDeviceModel(userAgent, deviceType, os.name);
        const summaryParts = [model, os.label, browser.label].filter(Boolean);

        return {
            userAgent,
            platform,
            deviceType,
            osName: os.name,
            osVersion: os.version,
            browserName: browser.name,
            browserVersion: browser.version,
            model,
            summary: summaryParts.join(' · ') || platform || 'Unknown device',
            screenWidth: screen.width,
            screenHeight: screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }

    private detectDefaultTtsProvider(): 'browser' | 'piper' {
        const userAgent = navigator.userAgent ?? '';
        const platform = navigator.platform ?? '';
        const isIos = /iPhone|iPad|iPod/i.test(userAgent)
            || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        return isIos ? 'browser' : 'piper';
    }

    private setIfNotNull(key: string, value: string | null): void {
        if (value != null) {
            localStorage.setItem(key, value);
            return;
        }

        localStorage.removeItem(key);
    }

    private normalizeStoredTraits(
        value: UserTraitsPayload | TraitValueMap | null,
    ): UserTraitsPayload | null {
        if (!value || typeof value !== 'object') {
            return null;
        }

        if ('traits' in value && 'id' in value && 'userId' in value) {
            const payload = value as UserTraitsPayload;
            return {
                ...payload,
                traits: this.normalizeTraitMap(payload.traits),
            };
        }

        const legacyTraits = this.normalizeTraitMap(value as TraitValueMap);
        if (Object.keys(legacyTraits).length === 0) {
            return null;
        }

        const now = new Date().toISOString();
        return {
            id: `traits-${this.uid}`,
            userId: this.uid,
            traits: legacyTraits,
            createdAt: now,
            updatedAt: now,
        };
    }

    private normalizeTraitMap(traits: TraitValueMap | null | undefined): TraitValueMap {
        if (!traits || typeof traits !== 'object') {
            return {};
        }

        const normalized: TraitValueMap = {};
        for (const [key, rawValues] of Object.entries(traits)) {
            const values = Array.isArray(rawValues) ? rawValues : [String(rawValues)];
            const cleaned = values
                .map(value => String(value).trim())
                .filter(Boolean);
            if (cleaned.length > 0) {
                normalized[key] = Array.from(new Set(cleaned));
            }
        }

        return normalized;
    }

    private parseOs(userAgent: string, platform: string, isIpad: boolean): { name: string | null; version: string | null; label: string | null } {
        const iosMatch = userAgent.match(/OS (\d+)[._](\d+)(?:[._](\d+))?/i);
        if (/iPhone|iPad|iPod/i.test(userAgent) || isIpad) {
            const version = iosMatch ? [iosMatch[1], iosMatch[2], iosMatch[3]].filter(Boolean).join('.') : null;
            return { name: 'iOS', version, label: version ? `iOS ${version}` : 'iOS' };
        }

        const androidMatch = userAgent.match(/Android\s+([\d.]+)/i);
        if (androidMatch) {
            return { name: 'Android', version: androidMatch[1], label: `Android ${androidMatch[1]}` };
        }

        const windowsMatch = userAgent.match(/Windows NT\s+([\d.]+)/i);
        if (windowsMatch) {
            return { name: 'Windows', version: windowsMatch[1], label: `Windows ${windowsMatch[1]}` };
        }

        const macMatch = userAgent.match(/Mac OS X\s+([\d_]+)/i);
        if (macMatch) {
            const version = macMatch[1].replace(/_/g, '.');
            return { name: 'macOS', version, label: `macOS ${version}` };
        }

        if (/Linux/i.test(platform) || /Linux/i.test(userAgent)) {
            return { name: 'Linux', version: null, label: 'Linux' };
        }

        return { name: null, version: null, label: null };
    }

    private parseBrowser(userAgent: string): { name: string | null; version: string | null; label: string | null } {
        const rules: Array<{ name: string; pattern: RegExp }> = [
            { name: 'Edge', pattern: /Edg\/([\d.]+)/i },
            { name: 'Chrome', pattern: /Chrome\/([\d.]+)/i },
            { name: 'Firefox', pattern: /Firefox\/([\d.]+)/i },
            { name: 'Safari', pattern: /Version\/([\d.]+).*Safari/i },
            { name: 'Samsung Internet', pattern: /SamsungBrowser\/([\d.]+)/i },
        ];

        for (const rule of rules) {
            const match = userAgent.match(rule.pattern);
            if (match) {
                return { name: rule.name, version: match[1], label: `${rule.name} ${match[1]}` };
            }
        }

        return { name: null, version: null, label: null };
    }

    private parseDeviceModel(userAgent: string, deviceType: DeviceInfo['deviceType'], osName: string | null): string | null {
        if (deviceType === 'desktop') {
            if (/Macintosh/i.test(userAgent)) return 'Mac';
            if (/Windows/i.test(userAgent)) return 'PC';
            if (/Linux/i.test(userAgent)) return 'Linux PC';
            return 'Desktop';
        }

        if (osName === 'iOS') {
            if (/iPhone/i.test(userAgent)) return 'iPhone';
            if (/iPad/i.test(userAgent)) return 'iPad';
            return 'iOS device';
        }

        const androidModelMatch = userAgent.match(/Android[\s/][\d.]+;\s*([^;)]+?)(?:\sBuild|\))/i);
        if (androidModelMatch) {
            return androidModelMatch[1].trim();
        }

        if (osName === 'Android') {
            return deviceType === 'tablet' ? 'Android tablet' : 'Android phone';
        }

        return null;
    }
}
