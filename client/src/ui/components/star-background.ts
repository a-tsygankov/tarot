import { LitElement, html, css } from 'lit';
import { customElement, query } from 'lit/decorators.js';

interface StarPoint {
    x: number;
    y: number;
    radius: number;
    opacity: number;
    hue: number;
    twinkleSpeed: number;
    twinklePhase: number;
    depth: number;
    cross: boolean;
}

interface NebulaCloud {
    x: number;
    y: number;
    radiusX: number;
    radiusY: number;
    rotation: number;
    opacity: number;
    color: string;
    depth: number;
}

interface GlowCluster {
    x: number;
    y: number;
    radius: number;
    opacity: number;
    depth: number;
}

function createSeededRandom(seed: number): () => number {
    let value = seed >>> 0;
    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

/**
 * Deep-space starfield background tuned for phones.
 * Uses canvas so Safari/Chrome mobile render the same layer reliably.
 */
@customElement('star-background')
export class StarBackground extends LitElement {
    @query('canvas') private _canvas!: HTMLCanvasElement;

    private readonly _random = createSeededRandom(70231);
    private readonly _stars = this._buildStars();
    private readonly _nebulae = this._buildNebulae();
    private readonly _clusters = this._buildGlowClusters();
    private _offsetX = 0;
    private _offsetY = 0;
    private _rafId: number | null = null;
    private _resizeObserver: ResizeObserver | null = null;
    private _needsRender = true;

    static override styles = css`
        :host {
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
            display: block;
        }

        canvas {
            width: 100%;
            height: 100%;
            display: block;
            opacity: 0.94;
        }

        @media (prefers-reduced-motion: reduce) {
            canvas {
                opacity: 0.9;
            }
        }
    `;

    override connectedCallback(): void {
        super.connectedCallback();
        window.addEventListener('pointermove', this._handlePointerMove, { passive: true });
        window.addEventListener('deviceorientation', this._handleDeviceOrientation, { passive: true });
    }

    override firstUpdated(): void {
        this._resizeObserver = new ResizeObserver(() => {
            this._resizeCanvas();
            this._scheduleRender();
        });
        this._resizeObserver.observe(this);
        this._resizeCanvas();
        this._scheduleRender();
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        window.removeEventListener('pointermove', this._handlePointerMove);
        window.removeEventListener('deviceorientation', this._handleDeviceOrientation);
        this._resizeObserver?.disconnect();
        if (this._rafId != null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    override render() {
        return html`<canvas aria-hidden="true"></canvas>`;
    }

    private _buildStars(): StarPoint[] {
        const stars: StarPoint[] = [];
        for (let index = 0; index < 220; index += 1) {
            const sizeBias = this._random();
            const radius = sizeBias > 0.92
                ? 2.4 + this._random() * 2.8
                : sizeBias > 0.72
                    ? 1.2 + this._random() * 1.8
                    : 0.35 + this._random() * 1.1;
            stars.push({
                x: this._random(),
                y: this._random(),
                radius,
                opacity: 0.18 + this._random() * 0.7,
                hue: 210 + this._random() * 25,
                twinkleSpeed: 0.4 + this._random() * 1.4,
                twinklePhase: this._random() * Math.PI * 2,
                depth: 0.2 + this._random() * 1.1,
                cross: radius > 1.9 && this._random() > 0.42,
            });
        }
        return stars;
    }

    private _buildNebulae(): NebulaCloud[] {
        return [
            { x: 0.46, y: 0.2, radiusX: 0.18, radiusY: 0.33, rotation: -0.28, opacity: 0.22, color: '#8fb1ff', depth: 0.15 },
            { x: 0.53, y: 0.48, radiusX: 0.12, radiusY: 0.42, rotation: 0.2, opacity: 0.28, color: '#7a97eb', depth: 0.34 },
            { x: 0.66, y: 0.68, radiusX: 0.16, radiusY: 0.3, rotation: 0.42, opacity: 0.2, color: '#90b5ff', depth: 0.48 },
            { x: 0.33, y: 0.1, radiusX: 0.12, radiusY: 0.22, rotation: -0.5, opacity: 0.12, color: '#b1c0ff', depth: 0.12 },
            { x: 0.74, y: 0.46, radiusX: 0.11, radiusY: 0.2, rotation: 0.18, opacity: 0.13, color: '#d9e2ff', depth: 0.55 },
        ];
    }

    private _buildGlowClusters(): GlowCluster[] {
        return [
            { x: 0.18, y: 0.34, radius: 0.055, opacity: 0.28, depth: 0.75 },
            { x: 0.67, y: 0.58, radius: 0.07, opacity: 0.22, depth: 0.82 },
            { x: 0.57, y: 0.42, radius: 0.06, opacity: 0.16, depth: 0.68 },
        ];
    }

    private _resizeCanvas(): void {
        if (!this._canvas) {
            return;
        }

        const bounds = this.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.8);
        this._canvas.width = Math.max(1, Math.floor(bounds.width * dpr));
        this._canvas.height = Math.max(1, Math.floor(bounds.height * dpr));
        const context = this._canvas.getContext('2d');
        if (context) {
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    private _scheduleRender(): void {
        this._needsRender = true;
        if (this._rafId != null) {
            return;
        }

        const renderFrame = (time: number) => {
            this._rafId = null;
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const shouldAnimate = !reducedMotion;
            if (this._needsRender || shouldAnimate) {
                this._renderScene(time);
                this._needsRender = false;
            }
            if (shouldAnimate) {
                this._rafId = requestAnimationFrame(renderFrame);
            }
        };

        this._rafId = requestAnimationFrame(renderFrame);
    }

    private _renderScene(time: number): void {
        if (!this._canvas) {
            return;
        }

        const context = this._canvas.getContext('2d');
        if (!context) {
            return;
        }

        const width = this._canvas.clientWidth || 1;
        const height = this._canvas.clientHeight || 1;
        const elapsed = time * 0.001;
        context.clearRect(0, 0, width, height);

        const baseGradient = context.createLinearGradient(0, 0, 0, height);
        baseGradient.addColorStop(0, '#11172b');
        baseGradient.addColorStop(0.45, '#0d1428');
        baseGradient.addColorStop(1, '#050912');
        context.fillStyle = baseGradient;
        context.fillRect(0, 0, width, height);

        this._drawNebulae(context, width, height);
        this._drawGlowClusters(context, width, height);
        this._drawStars(context, width, height, elapsed);

        const vignette = context.createRadialGradient(
            width * 0.5,
            height * 0.42,
            height * 0.1,
            width * 0.5,
            height * 0.5,
            height * 0.76,
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
        context.fillStyle = vignette;
        context.fillRect(0, 0, width, height);
    }

    private _drawNebulae(context: CanvasRenderingContext2D, width: number, height: number): void {
        for (const cloud of this._nebulae) {
            const offsetX = this._offsetX * cloud.depth * 0.65;
            const offsetY = this._offsetY * cloud.depth * 0.45;
            const centerX = (cloud.x * width) + offsetX;
            const centerY = (cloud.y * height) + offsetY;
            const radiusX = cloud.radiusX * width;
            const radiusY = cloud.radiusY * height;

            context.save();
            context.translate(centerX, centerY);
            context.rotate(cloud.rotation);
            context.scale(1, radiusY / Math.max(radiusX, 1));

            const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radiusX);
            gradient.addColorStop(0, this._alpha(cloud.color, cloud.opacity));
            gradient.addColorStop(0.42, this._alpha(cloud.color, cloud.opacity * 0.46));
            gradient.addColorStop(1, this._alpha(cloud.color, 0));

            context.fillStyle = gradient;
            context.fillRect(-radiusX, -radiusX, radiusX * 2, radiusX * 2);
            context.restore();
        }
    }

    private _drawGlowClusters(context: CanvasRenderingContext2D, width: number, height: number): void {
        for (const cluster of this._clusters) {
            const offsetX = this._offsetX * cluster.depth * 0.82;
            const offsetY = this._offsetY * cluster.depth * 0.58;
            const centerX = (cluster.x * width) + offsetX;
            const centerY = (cluster.y * height) + offsetY;
            const radius = cluster.radius * Math.min(width, height);

            const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, `rgba(180, 205, 255, ${cluster.opacity})`);
            gradient.addColorStop(0.4, `rgba(124, 154, 236, ${cluster.opacity * 0.5})`);
            gradient.addColorStop(1, 'rgba(90, 120, 220, 0)');
            context.fillStyle = gradient;
            context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        }
    }

    private _drawStars(context: CanvasRenderingContext2D, width: number, height: number, elapsed: number): void {
        for (const star of this._stars) {
            const offsetX = this._offsetX * star.depth;
            const offsetY = this._offsetY * star.depth * 0.74;
            const x = (star.x * width) + offsetX;
            const y = (star.y * height) + offsetY;
            const pulse = 0.84 + (Math.sin(elapsed * star.twinkleSpeed + star.twinklePhase) * 0.16);
            const radius = star.radius * pulse;
            const alpha = Math.min(1, star.opacity * pulse);
            const color = `hsla(${star.hue}, 85%, 88%, ${alpha})`;

            const glow = context.createRadialGradient(x, y, 0, x, y, radius * 6);
            glow.addColorStop(0, color);
            glow.addColorStop(0.22, `hsla(${star.hue}, 95%, 85%, ${alpha * 0.6})`);
            glow.addColorStop(1, `hsla(${star.hue}, 95%, 70%, 0)`);
            context.fillStyle = glow;
            context.fillRect(x - radius * 6, y - radius * 6, radius * 12, radius * 12);

            context.beginPath();
            context.fillStyle = `hsla(${star.hue}, 100%, 96%, ${Math.min(1, alpha + 0.08)})`;
            context.arc(x, y, Math.max(0.45, radius), 0, Math.PI * 2);
            context.fill();

            if (star.cross) {
                context.strokeStyle = `hsla(${star.hue}, 95%, 92%, ${alpha * 0.8})`;
                context.lineWidth = Math.max(0.35, radius * 0.22);
                context.beginPath();
                context.moveTo(x - radius * 2.6, y);
                context.lineTo(x + radius * 2.6, y);
                context.moveTo(x, y - radius * 2.6);
                context.lineTo(x, y + radius * 2.6);
                context.stroke();
            }
        }
    }

    private _alpha(hex: string, alpha: number): string {
        const normalized = hex.replace('#', '');
        const chunk = normalized.length === 3
            ? normalized.split('').map(part => part + part).join('')
            : normalized;
        const red = parseInt(chunk.slice(0, 2), 16);
        const green = parseInt(chunk.slice(2, 4), 16);
        const blue = parseInt(chunk.slice(4, 6), 16);
        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    private _handlePointerMove = (event: PointerEvent): void => {
        const viewportWidth = window.innerWidth || 1;
        const viewportHeight = window.innerHeight || 1;
        const normalizedX = (event.clientX / viewportWidth) - 0.5;
        const normalizedY = (event.clientY / viewportHeight) - 0.5;
        this._offsetX = normalizedX * 18;
        this._offsetY = normalizedY * 18;
        this._scheduleRender();
    };

    private _handleDeviceOrientation = (event: DeviceOrientationEvent): void => {
        if (event.gamma == null || event.beta == null) {
            return;
        }
        this._offsetX = Math.max(-18, Math.min(18, event.gamma * 0.92));
        this._offsetY = Math.max(-18, Math.min(18, event.beta * 0.22));
        this._scheduleRender();
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'star-background': StarBackground;
    }
}
