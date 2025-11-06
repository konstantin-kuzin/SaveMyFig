export declare class EnvManager {
    private logger;
    private envPath;
    constructor();
    readEnv(): Promise<Record<string, string>>;
    writeEnv(config: Record<string, string>): Promise<{
        success: boolean;
        message: string;
    }>;
    validateConfig(config: Record<string, string>): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=env-manager.d.ts.map