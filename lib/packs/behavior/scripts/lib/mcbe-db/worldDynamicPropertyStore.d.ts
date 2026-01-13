export interface WorldDynamicPropertyStoreOptions {
    /**
     * Dynamic property key prefix. Keep it short and include your namespace.
     * Example: "myaddon:db"
     */
    prefix: string;
    /** Maximum chars per chunk. Keep below the engine's string dynamic property limit. */
    chunkSize?: number;
    /** Maximum number of chunks to use. */
    maxChunks?: number;
}
export declare class WorldDynamicPropertyJsonStore {
    readonly prefix: string;
    readonly chunkSize: number;
    readonly maxChunks: number;
    constructor(options: WorldDynamicPropertyStoreOptions);
    private metaKey;
    private chunkKey;
    private readMeta;
    load(): string | undefined;
    save(json: string): void;
    clear(): void;
}
