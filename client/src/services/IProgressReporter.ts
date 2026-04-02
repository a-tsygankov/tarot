/**
 * Standard progress reporting interface.
 * Used by all long-running async operations.
 */
export interface IProgressReporter {
    report(status: string, percent?: number): void;
}

export interface OperationOptions {
    progress?: IProgressReporter;
    cancellationToken?: AbortSignal;
}
