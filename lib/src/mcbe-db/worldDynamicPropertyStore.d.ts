export interface WorldDynamicPropertyStoreOptions {
    /**
     * Dynamic property key prefix. Keep it short and include your namespace.
     * Example: "myaddon:db"
     */
    prefix: string;
    /** Maximum UTF-8 bytes per chunk. Keep below the engine's string dynamic property limit. */
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
    private utf8ByteLength;
    private utf8ByteLengthForCodePoint;
    private splitByUtf8Bytes;
    load(): string | undefined;
    save(json: string): void;
    clear(): void;
}
