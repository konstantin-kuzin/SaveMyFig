export interface BackupRecord {
    file_key: string;
    project_name: string;
    file_name: string;
    last_backup_date: string | null;
    last_modified_date: string;
    next_attempt_date: string | null;
}
export declare class DatabaseManager {
    private logger;
    private dbPath;
    private db;
    constructor();
    private initializeDatabase;
    private getDB;
    query(sql: string, params?: any[]): Promise<any[]>;
    getBackupsNeedingBackup(): Promise<BackupRecord[]>;
    getAllBackups(): Promise<BackupRecord[]>;
    getStatistics(): Promise<{
        total: number;
        needingBackup: number;
        withErrors: number;
    }>;
    resetErrors(): Promise<{
        success: boolean;
        message: string;
    }>;
    close(): void;
}
//# sourceMappingURL=db-reader.d.ts.map