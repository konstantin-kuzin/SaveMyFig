export declare class ScriptRunner {
    private logger;
    private currentProcess;
    constructor();
    installDependencies(): Promise<{
        success: boolean;
        message: string;
    }>;
    runScript(command: string, onOutput?: (data: string) => void, onProgress?: (progress: any) => void): Promise<{
        success: boolean;
        message?: string;
    }>;
    stopScript(): void;
    private parseProgress;
    private getErrorMessage;
}
//# sourceMappingURL=script-runner.d.ts.map