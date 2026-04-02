import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

/**
 * Decorative starfield background — subtle gold and white dots.
 * Uses a seeded layout (based on index) so stars are consistent.
 */
@customElement('star-background')
export class StarBackground extends LitElement {
    static override styles = css`
        :host {
            position: fixed;
            inset: 0;
            z-index: -1;
            pointer-events: none;
            overflow: hidden;
        }

        svg {
            width: 100%;
            height: 100%;
        }
    `;

    override render() {
        const stars = Array.from({ length: 40 }, (_, i) => {
            const x = (i * 37 + 11) % 100;
            const y = (i * 53 + 7) % 100;
            const r = i % 3 === 0 ? 1.1 : i % 5 === 0 ? 0.9 : 0.6;
            const opacity = 0.08 + (i % 7) * 0.04;
            const fill = i % 4 === 0 ? '#c9a84c' : '#ffffff';
            return { x, y, r, opacity, fill };
        });

        return html`
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                ${stars.map(s => html`
                    <circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.fill}" opacity="${s.opacity}" />
                `)}
            </svg>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'star-background': StarBackground;
    }
}
