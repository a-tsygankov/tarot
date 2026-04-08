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
        far: buildLayer(34, 3, '#ffffff', [0.9, 1.8], 0.18),
        mid: buildLayer(24, 9, '#d8b35a', [1.1, 2.3], 0.24),
        near: buildLayer(14, 17, '#fff1c3', [1.5, 3.2], 0.32),
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
            inset: 0;
        }

        .nebula {
            position: absolute;
            inset: -14%;
            background:
                radial-gradient(circle at 20% 18%, rgba(201, 168, 76, 0.14), transparent 26%),
                radial-gradient(circle at 78% 24%, rgba(117, 88, 171, 0.16), transparent 24%),
                radial-gradient(circle at 50% 72%, rgba(201, 168, 76, 0.1), transparent 34%),
                radial-gradient(circle at 52% 48%, rgba(255, 238, 201, 0.03), transparent 40%);
            opacity: 0.95;
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

        .star {
            position: absolute;
            border-radius: 999px;
            transform-origin: center;
            box-shadow: 0 0 10px currentColor;
        }

        .star.cross::before,
        .star.cross::after {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            background: currentColor;
            border-radius: 999px;
            transform: translate(-50%, -50%);
            opacity: 0.78;
        }

        .star.cross::before {
            width: 220%;
            height: 0.8px;
        }

        .star.cross::after {
            width: 0.8px;
            height: 220%;
        }

        .twinkle {
            animation: twinkle 5.6s ease-in-out infinite;
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
                    ${this._layers.far.map((star, index) => this._renderStar(star, index))}
                </div>
                <div class="layer mid">
                    ${this._layers.mid.map((star, index) => this._renderStar(star, index, index % 5 === 0))}
                </div>
                <div class="layer near">
                    ${this._layers.near.map((star, index) => this._renderStar(star, index, true))}
                </div>
            </div>
        `;
    }

    private _renderStar(star: StarLayerPoint, index: number, cross = false) {
        const classes = [
            'star',
            'twinkle',
            index % 2 === 0 ? 'alt' : '',
            index % 3 === 0 ? 'slow' : '',
            cross ? 'cross' : '',
        ].filter(Boolean).join(' ');

        return html`
            <span
                class=${classes}
                style=${[
                    `left:${star.x}%`,
                    `top:${star.y}%`,
                    `width:${star.r}px`,
                    `height:${star.r}px`,
                    `background:${star.fill}`,
                    `color:${star.fill}`,
                    `opacity:${star.opacity}`,
                ].join(';')}
                aria-hidden="true"
            ></span>
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
