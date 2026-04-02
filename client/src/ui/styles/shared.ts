import { css } from 'lit';

/**
 * Shared CSS for all components — reset + utility classes.
 */
export const sharedStyles = css`
    :host {
        display: block;
        font-family: var(--font-body);
        color: var(--text);
    }

    /* ── Buttons ─────────────────────────────────────── */

    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5em;
        padding: 0.7em 1.4em;
        border: 1px solid var(--border-bright);
        border-radius: 8px;
        background: transparent;
        color: var(--gold);
        font-family: var(--font-display);
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
    }

    .btn:hover, .btn:focus-visible {
        background: var(--gold-dim);
        color: var(--text);
        outline: none;
    }

    .btn:active {
        transform: scale(0.97);
    }

    .btn-primary {
        background: linear-gradient(135deg, var(--gold-dim), var(--gold));
        color: var(--bg-deep);
        border: none;
        font-weight: 600;
    }

    .btn-primary:hover {
        background: linear-gradient(135deg, var(--gold), var(--gold-light));
        color: var(--bg-deep);
    }

    .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .btn-icon {
        width: 44px;
        height: 44px;
        padding: 0;
        border-radius: 50%;
        font-size: 1.2rem;
    }

    .btn-ghost {
        border: none;
        color: var(--text-dim);
        padding: 0.4em 0.8em;
    }

    .btn-ghost:hover {
        color: var(--gold);
        background: var(--purple-dim);
    }

    /* ── Panels ──────────────────────────────────────── */

    .panel {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.2em;
    }

    .panel-header {
        font-family: var(--font-display);
        color: var(--gold);
        font-size: 1.1em;
        margin-bottom: 0.8em;
    }

    /* ── Typography ──────────────────────────────────── */

    .display-text {
        font-family: var(--font-display);
        color: var(--gold);
    }

    .dim-text {
        color: var(--text-dim);
        font-size: 0.9em;
    }

    .faint-text {
        color: var(--text-faint);
        font-size: 0.85em;
    }

    /* ── Layout ──────────────────────────────────────── */

    .stack {
        display: flex;
        flex-direction: column;
    }

    .row {
        display: flex;
        align-items: center;
    }

    .center {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .gap-sm { gap: 0.5em; }
    .gap-md { gap: 1em; }
    .gap-lg { gap: 1.5em; }

    /* ── Spinner ──────────────────────────────────────── */

    .spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid var(--text-faint);
        border-top-color: var(--gold);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    .spinner-lg {
        width: 40px;
        height: 40px;
        border-width: 3px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* ── Transitions ─────────────────────────────────── */

    .fade-in {
        animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* ── Scrollbar ────────────────────────────────────── */

    ::-webkit-scrollbar {
        width: 6px;
    }

    ::-webkit-scrollbar-track {
        background: transparent;
    }

    ::-webkit-scrollbar-thumb {
        background: var(--purple-dim);
        border-radius: 3px;
    }
`;
