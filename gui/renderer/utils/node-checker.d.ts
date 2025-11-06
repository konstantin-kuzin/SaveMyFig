export declare class NodeChecker {
    private logger;
    constructor();
    checkNodeJS(): Promise<{
        installed: boolean;
        version?: string;
        path?: string;
        meetsRequirement?: boolean;
    }>;
    installNodeJS(): Promise<{
        success: boolean;
        message: string;
    }>;
    checkPermissions(): Promise<{
        canWrite: boolean;
        needsSudo?: boolean;
        suggestion?: string;
    }>;
}
//# sourceMappingURL=node-checker.d.ts.map