# "Buy Me a Coffee" button — integration reference

Verified against the Tarot Oracle codebase (v2.4.9). This documents exactly
how the ☕ button is implemented and connected, and everything needed to add
the same button to another app.

## Account connection

The entire account linkage is **one static URL** — nothing else:

```
https://buymeacoffee.com/tsygankov9
```

- Buy Me a Coffee username: **`tsygankov9`** (the page is tied to the BMC
  account registered under tsygankov@gmail.com).
- Payments, thank-you flow, and supporter records all happen on Buy Me a
  Coffee's hosted page. The app never touches money or supporter data.
- **No API key, no widget script, no webhooks, no secrets** are used
  anywhere (client, workers, CI). There is nothing to rotate or configure
  server-side, and no Content-Security-Policy or CORS changes are needed.

To connect a different app to the same account, reuse the same URL. For a
different account, replace the slug: `https://buymeacoffee.com/<username>`.

## Where the button appears in this app

Two placements, both plain `<a>` anchors:

### 1. Header bar chip — `client/src/ui/components/tarot-app.ts`

A small gold pill with the ☕ emoji in the top bar (`bar-right` section,
~line 631). Hidden in debug mode: triple-tapping the logo toggles
`_debugMode`, which swaps the chip for the TTS / Dash / Console buttons
(see `tarot-header.ts` header comment).

```html
<a class="coffee-link"
   href="https://buymeacoffee.com/tsygankov9"
   target="_blank"
   rel="noopener">☕</a>
```

```css
.coffee-link {
    background: var(--gold);
    color: #1a0800;
    font-size: 0.7em;
    font-weight: 700;
    padding: 0.3em 0.6em;
    border-radius: 7px;
    font-family: var(--font-display);
    text-decoration: none;
    white-space: nowrap;
    transition: opacity 0.2s;
}
.coffee-link:hover {
    opacity: 0.85;
}
```

### 2. Settings footer link — `client/src/ui/components/settings-panel.ts`

A quiet text link under the version line (~line 489).

```html
<div class="version-footer">
    Tarot Oracle v2.4.9<br>
    <a class="coffee-support"
       href="https://buymeacoffee.com/tsygankov9"
       target="_blank"
       rel="noopener">☕ Support</a>
</div>
```

```css
.coffee-support {
    color: var(--gold);
    text-decoration: none;
    cursor: pointer;
}
.coffee-support:hover {
    text-decoration: underline;
}
```

## Drop-in snippet for any app (framework-agnostic)

```html
<a href="https://buymeacoffee.com/tsygankov9"
   target="_blank"
   rel="noopener"
   style="background:#c9a84c; color:#1a0800; font-weight:700;
          padding:0.3em 0.6em; border-radius:7px; text-decoration:none;
          white-space:nowrap;">☕ Buy me a coffee</a>
```

Notes:
- `target="_blank"` opens BMC's page without leaving the app;
  `rel="noopener"` prevents the opened page from scripting the opener
  (always pair it with `_blank`).
- The ☕ emoji avoids shipping any image asset. If brand imagery is wanted,
  BMC provides hosted buttons at
  `https://img.buymeacoffee.com/button-api/?...&slug=tsygankov9` — this app
  deliberately does not use them to avoid a third-party image request.
- Works inside a standalone PWA: the link opens in the system browser /
  in-app browser sheet, which is the desired behavior.

## Checklist for adding the button to another app

1. Link to `https://buymeacoffee.com/tsygankov9` (or the target account's
   slug) with `target="_blank" rel="noopener"`.
2. Style to taste — no BMC assets or scripts required.
3. No config, env vars, keys, backend, or CSP changes needed.
4. Optional: a second, quieter placement (settings/about footer) converts
   users who missed the header chip.
5. If the app has a debug/admin mode that crowds the header, hide the chip
   there (this app swaps it for debug buttons when `_debugMode` is on).

## What this integration deliberately does NOT use

| BMC feature | Used? | Why not |
|---|---|---|
| Official widget (`widget.prod.js` floating button) | No | Third-party script, CSP surface, ~50 KB for a link |
| Button image API (`img.buymeacoffee.com`) | No | Extra third-party request; emoji is enough |
| BMC API / webhooks (supporter events) | No | App has no server-side supporter features |
| Memberships / shop deep links | No | Plain profile link covers the use case |

## History

Introduced in commit `c0d3e9b` ("Add dual card art decks, debug console,
star bg, and enhanced settings") together with the debug-mode header swap.
