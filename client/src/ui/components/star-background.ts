import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface StarLayerPoint {
    x: number;
    y: number;
    r: number;
    opacity: number;
    fill: string;
}

function buildLayer(count: number, seed: number, fill: string, sizeRange: [number, number], opacityBase: number): StarLayerPoint[] {
    return Array.from({ length: count }, (_, index) => {
        const x = (index * (31 + seed) + seed * 7) % 100;
        const y = (index * (47 + seed) + seed * 11) % 100;
        const spread = ((index * 13 + seed) % 10) / 10;
        return {
            x,
            y,
            r: sizeRange[0] + ((sizeRange[1] - sizeRange[0]) * spread),
            opacity: opacityBase + (((index + seed) % 6) * 0.05),
            fill,
        };
    });
}

/**
 * Decorative starfield background with layered parallax drift.
 * Keeps layout deterministic and cheap to render on mobile.
 */
@customElement('star-background')
export class StarBackground extends LitElement {
    @state() private _offsetX = 0;
    @state() private _offsetY = 0;

    private readonly _layers = {
        far: buildLayer(28, 3, 'rgba(255,255,255,0.8)', [0.28, 0.62], 0.14),
        mid: buildLayer(20, 9, 'rgba(201,168,76,0.95)', [0.4, 0.95], 0.18),
        near: buildLayer(12, 17, 'rgba(255,244,214,0.95)', [0.6, 1.35], 0.24),
    };

    static override styles = css`
        :host {
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
            display: block;
        }

        .field {
            position: absolute;
            inset: -8%;
            width: 100%;
            height: 100%;
            will-change: transform;
        }

        svg {
            width: 100%;
            height: 100%;
        }

        .nebula {
            position: absolute;
            inset: -12%;
            background:
                radial-gradient(circle at 20% 18%, rgba(201, 168, 76, 0.12), transparent 26%),
                radial-gradient(circle at 78% 24%, rgba(117, 88, 171, 0.14), transparent 24%),
                radial-gradient(circle at 50% 72%, rgba(201, 168, 76, 0.08), transparent 32%);
            filter: blur(18px);
            opacity: 0.9;
            transform: translate3d(calc(var(--parallax-x, 0px) * -0.4), calc(var(--parallax-y, 0px) * -0.25), 0);
        }

        .layer {
            position: absolute;
            inset: 0;
            transition: transform 180ms ease-out;
        }

        .layer.far {
            transform: translate3d(calc(var(--parallax-x, 0px) * 0.18), calc(var(--parallax-y, 0px) * 0.12), 0);
        }

        .layer.mid {
            transform: translate3d(calc(var(--parallax-x, 0px) * 0.38), calc(var(--parallax-y, 0px) * 0.26), 0);
        }

        .layer.near {
            transform: translate3d(calc(var(--parallax-x, 0px) * 0.64), calc(var(--parallax-y, 0px) * 0.46), 0);
        }

        .twinkle {
            animation: twinkle 5.6s ease-in-out infinite;
            transform-origin: center;
        }

        .twinkle.alt {
            animation-duration: 7.2s;
        }

        .twinkle.slow {
            animation-duration: 9.4s;
        }

        @keyframes twinkle {
            0%, 100% { opacity: 0.35; transform: scale(0.92); }
            50% { opacity: 1; transform: scale(1.18); }
        }

        @media (prefers-reduced-motion: reduce) {
            .layer,
            .nebula,
            .twinkle,
            .twinkle.alt,
            .twinkle.slow {
                animation: none;
                transition: none;
                transform: none;
            }
        }
    `;

    override connectedCallback(): void {
        super.connectedCallback();
        window.addEventListener('pointermove', this._handlePointerMove, { passive: true });
        window.addEventListener('deviceorientation', this._handleDeviceOrientation, { passive: true });
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        window.removeEventListener('pointermove', this._handlePointerMove);
        window.removeEventListener('deviceorientation', this._handleDeviceOrientation);
    }

    override render() {
        return html`
            <div class="field" style=${`--parallax-x:${this._offsetX}px; --parallax-y:${this._offsetY}px;`}>
                <div class="nebula"></div>
                <div class="layer far">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        ${this._layers.far.map((star, index) => html`
                            <circle
                                class="twinkle ${index % 3 === 0 ? 'alt' : ''}"
                                cx=${star.x}
                                cy=${star.y}
                                r=${star.r}
                                fill=${star.fill}
                                opacity=${star.opacity}
                            ></circle>
                        `)}
                    </svg>
                </div>
                <div class="layer mid">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        ${this._layers.mid.map((star, index) => html`
                            <circle
                                class="twinkle ${index % 2 === 0 ? 'slow' : ''}"
                                cx=${star.x}
                                cy=${star.y}
                                r=${star.r}
                                fill=${star.fill}
                                opacity=${star.opacity}
                            ></circle>
                        `)}
                    </svg>
                </div>
                <div class="layer near">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        ${this._layers.near.map((star, index) => html`
                            <g class="twinkle ${index % 2 === 0 ? 'alt' : ''}" opacity=${star.opacity}>
                                <circle cx=${star.x} cy=${star.y} r=${star.r} fill=${star.fill}></circle>
                                ${index % 4 === 0 ? html`
                                    <path
                                        d=${`M ${star.x - (star.r * 2.3)} ${star.y} L ${star.x + (star.r * 2.3)} ${star.y} M ${star.x} ${star.y - (star.r * 2.3)} L ${star.x} ${star.y + (star.r * 2.3)}`}
                                        stroke=${star.fill}
                                        stroke-width=${star.r * 0.18}
                                        stroke-linecap="round"
                                    ></path>
                                ` : ''}
                            </g>
                        `)}
                    </svg>
                </div>
            </div>
        `;
    }

    private _handlePointerMove = (event: PointerEvent): void => {
        const viewportWidth = window.innerWidth || 1;
        const viewportHeight = window.innerHeight || 1;
        const normalizedX = (event.clientX / viewportWidth) - 0.5;
        const normalizedY = (event.clientY / viewportHeight) - 0.5;
        this._offsetX = normalizedX * 20;
        this._offsetY = normalizedY * 20;
    };

    private _handleDeviceOrientation = (event: DeviceOrientationEvent): void => {
        if (event.gamma == null || event.beta == null) {
            return;
        }
        this._offsetX = Math.max(-14, Math.min(14, event.gamma * 0.8));
        this._offsetY = Math.max(-14, Math.min(14, event.beta * 0.18));
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'star-background': StarBackground;
    }
}
