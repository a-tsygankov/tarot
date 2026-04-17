import { PIPER_VOICE_PATHS } from '@shared/config/piper-voice-map.js';
import { PIPER_ONNX_RUNTIME_FILES, PIPER_PHONEMIZE_RUNTIME_FILES } from '@shared/config/piper-runtime.js';
import type { PiperAssetManifest } from '@shared/contracts/piper-contracts.js';

type Env = {
    R2: R2Bucket;
    ALLOWED_ORIGINS?: string;
};

const ONNX_RUNTIME_FILES = new Set<string>(PIPER_ONNX_RUNTIME_FILES);
const PIPER_RUNTIME_FILES = new Set<string>(PIPER_PHONEMIZE_RUNTIME_FILES);

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: createCorsHeaders(request, env) });
        }

        const url = new URL(request.url);
        if (url.pathname === '/piper/manifest.json') {
            return jsonResponse(buildManifest(), createCorsHeaders(request, env));
        }

        if (url.pathname.startsWith('/piper/runtime/onnx/')) {
            const filename = url.pathname.slice('/piper/runtime/onnx/'.length);
            if (!ONNX_RUNTIME_FILES.has(filename)) {
                return notFound(request, env);
            }
            return proxyAsset(`piper/runtime/onnx/${filename}`, request, env, guessContentType(filename));
        }

        if (url.pathname.startsWith('/piper/runtime/piper/')) {
            const filename = url.pathname.slice('/piper/runtime/piper/'.length);
            if (!PIPER_RUNTIME_FILES.has(filename)) {
                return notFound(request, env);
            }
            const contentType = filename.endsWith('.wasm')
                ? 'application/wasm'
                : 'application/octet-stream';
            return proxyAsset(`piper/runtime/piper/${filename}`, request, env, contentType);
        }

        if (url.pathname.startsWith('/piper/voices/')) {
            const relativePath = url.pathname.slice('/piper/voices/'.length);
            return proxyAsset(`piper/voices/${relativePath}`, request, env, guessContentType(relativePath));
        }

        return notFound(request, env);
    },
};

function buildManifest(): PiperAssetManifest {
    return {
        version: '2.3.1',
        runtime: {
            onnx: [...ONNX_RUNTIME_FILES].map(file => `/piper/runtime/onnx/${file}`),
            piper: [...PIPER_RUNTIME_FILES].map(file => `/piper/runtime/piper/${file}`),
        },
        voices: Object.entries(PIPER_VOICE_PATHS).map(([voiceId, modelPath]) => ({
            voiceId,
            languageCode: voiceId.slice(0, 3).toUpperCase(),
            modelPath: `/piper/voices/${modelPath}`,
            configPath: `/piper/voices/${modelPath}.json`,
        })),
    };
}

async function proxyAsset(
    key: string,
    request: Request,
    env: Env,
    contentType: string,
): Promise<Response> {
    const object = await env.R2.get(key);
    if (!object) {
        return notFound(request, env);
    }

    const headers = createCorsHeaders(request, env);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Content-Type', contentType);
    if (object.httpEtag) {
        headers.set('ETag', object.httpEtag);
    }

    return new Response(object.body, { status: 200, headers });
}

function notFound(request: Request, env: Env): Response {
    const headers = createCorsHeaders(request, env);
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
}

function jsonResponse(body: PiperAssetManifest, headers: Headers): Response {
    headers.set('Cache-Control', 'public, max-age=300');
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(body), { status: 200, headers });
}

function guessContentType(path: string): string {
    if (path.endsWith('.mjs') || path.endsWith('.js')) {
        return 'text/javascript; charset=utf-8';
    }
    if (path.endsWith('.json')) {
        return 'application/json';
    }
    if (path.endsWith('.wasm')) {
        return 'application/wasm';
    }
    if (path.endsWith('.onnx')) {
        return 'application/octet-stream';
    }
    return 'application/octet-stream';
}

function createCorsHeaders(request: Request, env: Env): Headers {
    const headers = new Headers();
    const origin = request.headers.get('Origin');
    const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
    }

    headers.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type,If-None-Match');
    headers.set('Vary', 'Origin');
    return headers;
}
