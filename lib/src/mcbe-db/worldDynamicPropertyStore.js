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
        if (meta.v === 1) {
            const chunksUsed = typeof meta.chunksUsed === "number" ? meta.chunksUsed : typeof meta.n === "number" ? meta.n : undefined;
            const totalLength = typeof meta.totalLength === "number" ? meta.totalLength : typeof meta.l === "number" ? meta.l : undefined;
            if (chunksUsed === undefined || totalLength === undefined)
                return undefined;
            if (!Number.isInteger(chunksUsed) || chunksUsed < 0 || chunksUsed > this.maxChunks)
                return undefined;
            if (!Number.isInteger(totalLength) || totalLength < 0)
                return undefined;
            return { v: 1, chunksUsed, totalLength };
        }
        if (meta.v === 2) {
            const meta2 = meta;
            if (meta2.encoding !== "utf8" ||
                typeof meta2.chunksUsed !== "number" ||
                typeof meta2.totalBytes !== "number") {
                return undefined;
            }
            if (!Number.isInteger(meta2.chunksUsed) || meta2.chunksUsed < 0 || meta2.chunksUsed > this.maxChunks) {
                return undefined;
            }
            if (!Number.isInteger(meta2.totalBytes) || meta2.totalBytes < 0)
                return undefined;
            return { v: 2, chunksUsed: meta2.chunksUsed, totalBytes: meta2.totalBytes };
        }
        return undefined;
    }
    utf8ByteLength(value) {
        let bytes = 0;
        for (let i = 0; i < value.length; i++) {
            const code = value.codePointAt(i);
            bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
            if (code > 0xffff)
                i++;
        }
        return bytes;
    }
    utf8ByteLengthForCodePoint(code) {
        return code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    }
    splitByUtf8Bytes(value, maxBytes) {
        if (maxBytes <= 0)
            throw new Error("chunkSize must be positive.");
        if (value.length === 0)
            return [];
        const chunks = [];
        let start = 0;
        let usedBytes = 0;
        for (let i = 0; i < value.length; i++) {
            const code = value.codePointAt(i);
            const charBytes = this.utf8ByteLengthForCodePoint(code);
            if (usedBytes + charBytes > maxBytes) {
                if (start === i) {
                    throw new Error(`chunkSize too small to fit character (${charBytes} bytes).`);
                }
                chunks.push(value.slice(start, i));
                start = i;
                usedBytes = 0;
            }
            usedBytes += charBytes;
            if (code > 0xffff)
                i++;
        }
        if (start < value.length)
            chunks.push(value.slice(start));
        return chunks;
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
        if (meta.v === 1) {
            if (combined.length !== meta.totalLength)
                return undefined;
        }
        else {
            if (this.utf8ByteLength(combined) !== meta.totalBytes)
                return undefined;
        }
        return combined;
    }
    save(json) {
        const chunks = this.splitByUtf8Bytes(json, this.chunkSize);
        const needed = chunks.length;
        if (needed > this.maxChunks) {
            throw new Error(`DB too large (${this.utf8ByteLength(json)} bytes). Increase maxChunks or reduce data. needed=${needed} max=${this.maxChunks}`);
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
        values[metaKey] = JSON.stringify({
            v: 2,
            chunksUsed: needed,
            totalBytes: this.utf8ByteLength(json),
            encoding: "utf8",
        });
        for (let i = 0; i < needed; i++)
            values[this.chunkKey(i)] = chunks[i];
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
