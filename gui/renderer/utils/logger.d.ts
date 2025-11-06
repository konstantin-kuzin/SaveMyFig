export declare class Logger {
    private logFile;
    private maxLogSize;
    private maxLogFiles;
    constructor();
    private log;
    private rotateLogsIfNeeded;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    debug(message: string): void;
}
//# sourceMappingURL=logger.d.ts.map