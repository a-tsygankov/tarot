export const PIPER_ONNX_RUNTIME_VERSION = '1.24.3';
export const PIPER_ONNX_CDN_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${PIPER_ONNX_RUNTIME_VERSION}/dist/`;
export const PIPER_ONNX_LEGACY_CDN_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';

export const PIPER_ONNX_RUNTIME_FILES = [
    'ort-wasm-simd-threaded.wasm',
] as const;

export const PIPER_PHONEMIZE_RUNTIME_FILES = [
    'piper_phonemize.data',
    'piper_phonemize.wasm',
] as const;
