export interface IAudioCueService {
    playCardReveal(): Promise<void>;
    playCardPreviewOpen(): Promise<void>;
    playCardPreviewClose(): Promise<void>;
    startOracleWaiting(): Promise<void>;
    stopOracleWaiting(): Promise<void>;
    syncSettings(): Promise<void>;
}
