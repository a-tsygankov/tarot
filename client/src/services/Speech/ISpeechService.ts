import type { IProgressReporter } from '../IProgressReporter.js';
import type { UserContext } from '../../models/UserContext.js';

export interface ISpeechService {
    isAvailable(): boolean;
    speakReadingAsync(text: string, userContext: UserContext, progress?: IProgressReporter): Promise<void>;
    speakConversationAsync(text: string, userContext: UserContext, progress?: IProgressReporter): Promise<void>;
    stop(): void;
    pause(): void;
    resume(): void;
}
