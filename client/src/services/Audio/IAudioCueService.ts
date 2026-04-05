export interface IAudioCueService {
    playCardReveal(): Promise<void>;
    startOracleWaiting(): Promise<void>;
    stopOracleWaiting(): Promise<void>;
}
