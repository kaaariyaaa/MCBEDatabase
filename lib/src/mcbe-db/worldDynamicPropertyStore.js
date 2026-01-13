import { world } from "@minecraft/server";
const DEFAULT_CHUNK_SIZE = 30_000;
const DEFAULT_MAX_CHUNKS = 8;
export class WorldDynamicPropertyJsonStore {
    constructor(options) {
        this.prefix = options.prefix;
        this.chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
        this.maxChunks = options.maxChunks ?? DEFAULT_MAX_CHUNKS;
    }
    metaKey() {
        return `${this.prefix}:m`;
    }
    chunkKey(index) {
        return `${this.prefix}:${index}`;
    }
    readMeta(metaRaw) {
        let meta;
        try {
            meta = JSON.parse(metaRaw);
        }
        catch {
            return undefined;
        }
        if (meta.v !== 1)
            return undefined;
        const chunksUsed = typeof meta.chunksUsed === "number" ? meta.chunksUsed : typeof meta.n === "number" ? meta.n : undefined;
        const totalLength = typeof meta.totalLength === "number" ? meta.totalLength : typeof meta.l === "number" ? meta.l : undefined;
        if (chunksUsed === undefined || totalLength === undefined)
            return undefined;
        if (!Number.isInteger(chunksUsed) || chunksUsed < 0 || chunksUsed > this.maxChunks)
            return undefined;
        if (!Number.isInteger(totalLength) || totalLength < 0)
            return undefined;
        return { chunksUsed, totalLength };
    }
    load() {
        const metaRaw = world.getDynamicProperty(this.metaKey());
        if (metaRaw === undefined)
            return undefined;
        if (typeof metaRaw !== "string")
            return undefined;
        const meta = this.readMeta(metaRaw);
        if (!meta)
            return undefined;
        let combined = "";
        for (let i = 0; i < meta.chunksUsed; i++) {
            const chunkRaw = world.getDynamicProperty(this.chunkKey(i));
            if (typeof chunkRaw !== "string")
                return undefined;
            combined += chunkRaw;
        }
        if (combined.length !== meta.totalLength)
            return undefined;
        return combined;
    }
    save(json) {
        const needed = Math.ceil(json.length / this.chunkSize);
        if (needed > this.maxChunks) {
            throw new Error(`DB too large (${json.length} chars). Increase maxChunks or reduce data. needed=${needed} max=${this.maxChunks}`);
        }
        const metaKey = this.metaKey();
        const prevMetaRaw = world.getDynamicProperty(metaKey);
        let prevChunks = 0;
        if (typeof prevMetaRaw === "string") {
            const prevMeta = this.readMeta(prevMetaRaw);
            if (prevMeta)
                prevChunks = prevMeta.chunksUsed;
        }
        const values = {};
        // チャンク分割して保存するためのメタ情報を保持する。
        values[metaKey] = JSON.stringify({ v: 1, chunksUsed: needed, totalLength: json.length });
        for (let i = 0; i < needed; i++) {
            const start = i * this.chunkSize;
            values[this.chunkKey(i)] = json.slice(start, start + this.chunkSize);
        }
        for (let i = needed; i < prevChunks; i++) {
            values[this.chunkKey(i)] = undefined;
        }
        world.setDynamicProperties(values);
    }
    clear() {
        const values = {};
        const metaRaw = world.getDynamicProperty(this.metaKey());
        if (typeof metaRaw === "string") {
            const meta = this.readMeta(metaRaw);
            if (meta) {
                for (let i = 0; i < meta.chunksUsed; i++)
                    values[this.chunkKey(i)] = undefined;
            }
        }
        values[this.metaKey()] = undefined;
        world.setDynamicProperties(values);
    }
}
