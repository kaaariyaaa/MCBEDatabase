import type { DatabaseSnapshotV1, Row, JsonValue, TableDef } from "./types.js";
export interface WorldSqlDatabaseOptions {
    /** Dynamic property prefix (include your namespace). Example: "myaddon:db:main" */
    prefix: string;
    chunkSize?: number;
    maxChunks?: number;
    /** If true, load immediately in constructor. */
    autoload?: boolean;
    /** If false, explicit save() is required to persist changes. */
    autoSave?: boolean;
}
export declare class WorldSqlDatabase {
    private readonly store;
    private readonly autoSave;
    private snapshot;
    private dirty;
    private lastInsertId;
    private lastChanges;
    private totalChangesValue;
    constructor(options: WorldSqlDatabaseOptions);
    load(): void;
    save(): void;
    export(): string;
    import(data: string | DatabaseSnapshotV1): void;
    clear(): void;
    exec(sql: string, params?: JsonValue[]): {
        changes: number;
    };
    query<T extends Row = Row>(sql: string, params?: JsonValue[]): T[];
    getTables(): string[];
    getSchema(table: string): TableDef | undefined;
    getLastInsertId(): number | null;
    changes(): number;
    totalChanges(): number;
    tableExists(name: string): boolean;
    columnExists(table: string, column: string): boolean;
    rowCount(table: string): number;
    transaction<T>(fn: () => T): T;
    private getTable;
    private getTableFromContext;
    private validateValueType;
    private primaryKeyColumn;
    private ensureTable;
    private createTable;
    private dropTable;
    private createTableAsSelect;
    private selectColumnsForEmpty;
    private runSelectLike;
    private executeSetQuery;
    private createCteTableData;
    private createSingleRowTable;
    private replaceTriggerRefs;
    private fireTriggers;
    private alterTableAddColumn;
    private alterTableRenameColumn;
    private alterTableDropColumn;
    private resolveInsertColumns;
    private findConflictingRows;
    private insertRow;
    private rowWithPrefixes;
    private mergeRows;
    private select;
    private projectSelectRow;
    private evalScalarSubquery;
    private evalExpr;
    private evalFunction;
    private rowMatchesWhere;
    private update;
    private delete;
    private execute;
    private executeWithCtes;
}
