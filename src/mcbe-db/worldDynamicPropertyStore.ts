import { world } from "@minecraft/server";

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

interface MetaV1 {
  v: 1;
  chunksUsed: number;
  totalLength: number;
  /** Legacy fields */
  n?: number;
  l?: number;
}

const DEFAULT_CHUNK_SIZE = 30_000;
const DEFAULT_MAX_CHUNKS = 8;

export class WorldDynamicPropertyJsonStore {
  readonly prefix: string;
  readonly chunkSize: number;
  readonly maxChunks: number;

  constructor(options: WorldDynamicPropertyStoreOptions) {
    this.prefix = options.prefix;
    this.chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    this.maxChunks = options.maxChunks ?? DEFAULT_MAX_CHUNKS;
  }

  private metaKey(): string {
    return `${this.prefix}:m`;
  }

  private chunkKey(index: number): string {
    return `${this.prefix}:${index}`;
  }

  private readMeta(metaRaw: string): { chunksUsed: number; totalLength: number } | undefined {
    let meta: Partial<MetaV1>;
    try {
      meta = JSON.parse(metaRaw) as Partial<MetaV1>;
    } catch {
      return undefined;
    }

    if (meta.v !== 1) return undefined;

    const chunksUsed =
      typeof meta.chunksUsed === "number" ? meta.chunksUsed : typeof meta.n === "number" ? meta.n : undefined;
    const totalLength =
      typeof meta.totalLength === "number" ? meta.totalLength : typeof meta.l === "number" ? meta.l : undefined;
    if (chunksUsed === undefined || totalLength === undefined) return undefined;
    if (!Number.isInteger(chunksUsed) || chunksUsed < 0 || chunksUsed > this.maxChunks) return undefined;
    if (!Number.isInteger(totalLength) || totalLength < 0) return undefined;

    return { chunksUsed, totalLength };
  }

  load(): string | undefined {
    const metaRaw = world.getDynamicProperty(this.metaKey());
    if (metaRaw === undefined) return undefined;
    if (typeof metaRaw !== "string") return undefined;

    const meta = this.readMeta(metaRaw);
    if (!meta) return undefined;

    let combined = "";
    for (let i = 0; i < meta.chunksUsed; i++) {
      const chunkRaw = world.getDynamicProperty(this.chunkKey(i));
      if (typeof chunkRaw !== "string") return undefined;
      combined += chunkRaw;
    }

    if (combined.length !== meta.totalLength) return undefined;

    return combined;
  }

  save(json: string): void {
    const needed = Math.ceil(json.length / this.chunkSize);
    if (needed > this.maxChunks) {
      throw new Error(
        `DB too large (${json.length} chars). Increase maxChunks or reduce data. needed=${needed} max=${this.maxChunks}`,
      );
    }

    const metaKey = this.metaKey();
    const prevMetaRaw = world.getDynamicProperty(metaKey);
    let prevChunks = 0;
    if (typeof prevMetaRaw === "string") {
      const prevMeta = this.readMeta(prevMetaRaw);
      if (prevMeta) prevChunks = prevMeta.chunksUsed;
    }

    const values: Record<string, string | undefined> = {};
    // チャンク分割して保存するためのメタ情報を保持する。
    values[metaKey] = JSON.stringify({ v: 1, chunksUsed: needed, totalLength: json.length } satisfies MetaV1);

    for (let i = 0; i < needed; i++) {
      const start = i * this.chunkSize;
      values[this.chunkKey(i)] = json.slice(start, start + this.chunkSize);
    }

    for (let i = needed; i < prevChunks; i++) {
      values[this.chunkKey(i)] = undefined;
    }

    world.setDynamicProperties(values);
  }

  clear(): void {
    const values: Record<string, string | undefined> = {};
    const metaRaw = world.getDynamicProperty(this.metaKey());
    if (typeof metaRaw === "string") {
      const meta = this.readMeta(metaRaw);
      if (meta) {
        for (let i = 0; i < meta.chunksUsed; i++) values[this.chunkKey(i)] = undefined;
      }
    }

    values[this.metaKey()] = undefined;
    world.setDynamicProperties(values);
  }
}
