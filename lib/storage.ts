import {promises as fs} from 'node:fs';
import path from 'node:path';
import {getStore} from '@netlify/blobs';

export interface Storage {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown): Promise<void>;
  getFile(key: string): Promise<{data: ArrayBuffer; type: string} | null>;
  setFile(key: string, data: Uint8Array, type: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const onNetlify = () =>
  process.env.STORAGE !== 'local' &&
  Boolean(process.env.NETLIFY_BLOBS_CONTEXT || (globalThis as {netlifyBlobsContext?: unknown}).netlifyBlobsContext || process.env.NETLIFY || process.env.SITE_ID);

function netlifyStorage(): Storage {
  const data = getStore({name: 'catalog', consistency: 'strong'});
  const media = getStore({name: 'media'});
  return {
    getJSON: async <T,>(key: string) => (await data.get(key, {type: 'json'})) as T | null,
    setJSON: async (key, value) => { await data.setJSON(key, value); },
    async getFile(key) {
      const hit = await media.getWithMetadata(key, {type: 'arrayBuffer'});
      if (!hit) return null;
      return {data: hit.data, type: String(hit.metadata?.type || 'application/octet-stream')};
    },
    async setFile(key, bytes, type) {
      await media.set(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, {metadata: {type}});
    },
    async remove(key) { await data.delete(key); },
  };
}

function localStorage(): Storage {
  const root = path.join(process.cwd(), '.data');
  const safe = (key: string) => {
    const full = path.resolve(root, key);
    if (!full.startsWith(path.resolve(root) + path.sep)) throw Error('Invalid storage key');
    return full;
  };
  return {
    async getJSON<T>(key: string) {
      try { return JSON.parse(await fs.readFile(safe(key + '.json'), 'utf8')) as T; } catch { return null; }
    },
    async setJSON(key, value) {
      const file = safe(key + '.json');
      await fs.mkdir(path.dirname(file), {recursive: true});
      await fs.writeFile(file, JSON.stringify(value));
    },
    async getFile(key) {
      try {
        const file = safe(path.join('media', key));
        const [buf, type] = await Promise.all([fs.readFile(file), fs.readFile(file + '.type', 'utf8')]);
        return {data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, type};
      } catch { return null; }
    },
    async setFile(key, bytes, type) {
      const file = safe(path.join('media', key));
      await fs.mkdir(path.dirname(file), {recursive: true});
      await fs.writeFile(file, bytes);
      await fs.writeFile(file + '.type', type);
    },
    async remove(key) { await fs.rm(safe(key + '.json'), {force: true}); },
  };
}

export const storage = (): Storage => (onNetlify() ? netlifyStorage() : localStorage());
