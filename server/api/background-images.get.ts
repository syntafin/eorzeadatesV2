import { promises as fsp } from 'node:fs';
import { join } from 'node:path';
import { setResponseHeader, getQuery } from 'h3';

type CacheState = {
    lastAt: number,
    data: string[]
}

const CACHE_TTL_MS = 24* 60 * 60 * 1000; // 24h
let CACHE: CacheState | null = null;

async function readBackgroundImages(): Promise<string[]> {
    const dir = join(process.cwd(), 'public', 'backgroundImages')
    const entries = await fsp.readdir(dir);
    return entries
        .filter(name => /\.(png|jpe?g|webp)$/i.test(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map(name => `/backgroundImages/${name}`);
}

export default defineEventHandler(async (event) => {
    const q = getQuery(event);
    const force = q.force === '1' || q.force === true;

    const now = Date.now();
    const isValid = CACHE && (now - CACHE.lastAt) < CACHE_TTL_MS;

    if (!force && isValid) {
        setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        return CACHE!.data;
    }

    try {
        const files = await readBackgroundImages();
        CACHE = { lastAt: now, data: files }

        setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        return files;
    } catch {
        if (CACHE?.data) {
            setResponseHeader(event, 'Cache-Control', 'no-store');
            return CACHE.data;
        }

        setResponseHeader(event, 'Cache-Control', 'no-store');
        return [];
    }
})