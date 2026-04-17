import { TtsSession, HF_BASE, WASM_BASE } from '@realtimex/piper-tts-web';
import { PIPER_ONNX_CDN_BASE, PIPER_ONNX_LEGACY_CDN_BASE } from '@shared/config/piper-runtime.js';

type PiperWorkerRequest =
    | {
        id: string;
        type: 'synthesize';
        text: string;
        voiceId: string;
        assetBase: string;
      }
    | {
        id: string;
        type: 'warmup';
        voiceId: string;
        assetBase: string;
      };

type PiperWorkerResponse =
    | { id: string; type: 'progress'; message: string }
    | { id: string; type: 'ready'; voiceId: string }
    | { id: string; type: 'audio'; audioBuffer: ArrayBuffer }
    | { id: string; type: 'error'; message: string };

const sessions = new Map<string, TtsSession>();
const proxiedBases = new Set<string>();

self.onmessage = async (event: MessageEvent<PiperWorkerRequest>) => {
    const message = event.data;
    try {
        installFetchProxy(message.assetBase);
        if (message.type === 'warmup') {
            await getOrCreateSession(message.voiceId, message.assetBase, message.id);
            post({ id: message.id, type: 'ready', voiceId: message.voiceId });
            return;
        }

        const session = await getOrCreateSession(message.voiceId, message.assetBase, message.id);
        const blob = await session.predict(message.text);
        const buffer = await blob.arrayBuffer();
        post({ id: message.id, type: 'audio', audioBuffer: buffer }, [buffer]);
    } catch (error) {
        post({
            id: message.id,
            type: 'error',
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

async function getOrCreateSession(voiceId: string, assetBase: string, requestId: string): Promise<TtsSession> {
    const existing = sessions.get(voiceId);
    if (existing) {
        return existing;
    }

    post({ id: requestId, type: 'progress', message: `Loading Piper voice ${voiceId}...` });
    const session = await TtsSession.create({
        voiceId,
        fallbackStrategy: 'local',
        allowLocalModels: true,
        wasmPaths: {
            onnxWasm: `${trimTrailingSlash(assetBase)}/piper/runtime/onnx/`,
            piperData: `${trimTrailingSlash(assetBase)}/piper/runtime/piper/piper_phonemize.data`,
            piperWasm: `${trimTrailingSlash(assetBase)}/piper/runtime/piper/piper_phonemize.wasm`,
        },
        progress: (progress) => {
            const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
            post({ id: requestId, type: 'progress', message: `Downloading ${progress.url} (${percent}%)` });
        },
        logger: (message) => {
            post({ id: requestId, type: 'progress', message });
        },
    });
    sessions.set(voiceId, session);
    return session;
}

function installFetchProxy(assetBase: string): void {
    const normalizedBase = trimTrailingSlash(assetBase);
    if (proxiedBases.has(normalizedBase)) {
        return;
    }

    const nativeFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const originalUrl = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.toString()
                : input.url;

        const rewritten = rewritePiperUrl(originalUrl, normalizedBase);
        if (!rewritten) {
            return nativeFetch(input as RequestInfo, init);
        }

        return nativeFetch(rewritten, init);
    }) as typeof fetch;

    proxiedBases.add(normalizedBase);
}

function rewritePiperUrl(url: string, assetBase: string): string | null {
    if (url.startsWith(`${HF_BASE}/`)) {
        const relative = url.slice(HF_BASE.length + 1);
        return `${assetBase}/piper/voices/${relative}`;
    }

    if (url.startsWith(PIPER_ONNX_CDN_BASE)) {
        const filename = url.slice(PIPER_ONNX_CDN_BASE.length);
        return `${assetBase}/piper/runtime/onnx/${filename}`;
    }

    if (url.startsWith(PIPER_ONNX_LEGACY_CDN_BASE)) {
        const filename = url.slice(PIPER_ONNX_LEGACY_CDN_BASE.length);
        return `${assetBase}/piper/runtime/onnx/${filename}`;
    }

    if (url.startsWith(WASM_BASE)) {
        const filename = url.slice(WASM_BASE.length).replace(/^\/+/, '');
        return `${assetBase}/piper/runtime/piper/${filename}`;
    }

    return null;
}

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
}

function post(message: PiperWorkerResponse, transfer: Transferable[] = []): void {
    (self as unknown as { postMessage: (payload: PiperWorkerResponse, transferList?: Transferable[]) => void })
        .postMessage(message, transfer);
}
