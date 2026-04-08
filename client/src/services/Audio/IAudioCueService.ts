export interface IAudioCueService {
    playCardReveal(): Promise<void>;
    playCardPreviewOpen(): Promise<void>;
    playCardPreviewClose(): Promise<void>;
    playButtonPress(): Promise<void>;
    playPanelOpen(): Promise<void>;
    playPanelClose(): Promise<void>;
    playOracleArrival(): Promise<void>;
    playErrorPulse(): Promise<void>;
    startOracleWaiting(): Promise<void>;
    stopOracleWaiting(): Promise<void>;
}
