import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SECURE_CHUNK_BYTES = 1800;

interface ChunkManifest {
  generation: string;
  count: number;
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export async function checkSupabaseConnection(): Promise<void> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variables Supabase absentes.');
  }
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/settings`, {
    headers: { apikey: supabaseAnonKey },
  });
  if (!response.ok) throw new Error(`Supabase répond HTTP ${response.status}.`);
}

function utf8Length(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function splitIntoSecureChunks(value: string): string[] {
  const chunks: string[] = [];
  let chunk = '';
  let chunkBytes = 0;

  for (const character of value) {
    const characterBytes = utf8Length(character);
    if (chunk && chunkBytes + characterBytes > SECURE_CHUNK_BYTES) {
      chunks.push(chunk);
      chunk = '';
      chunkBytes = 0;
    }
    chunk += character;
    chunkBytes += characterBytes;
  }

  if (chunk || chunks.length === 0) chunks.push(chunk);
  return chunks;
}

const manifestKey = (key: string) => `${key}.manifest`;
const chunkKey = (key: string, generation: string, index: number) => `${key}.${generation}.${index}`;

async function readManifest(key: string): Promise<ChunkManifest | null> {
  const rawManifest = await SecureStore.getItemAsync(manifestKey(key));
  if (!rawManifest) return null;
  try {
    const parsed = JSON.parse(rawManifest) as Partial<ChunkManifest>;
    if (typeof parsed.generation === 'string' && Number.isInteger(parsed.count) && (parsed.count ?? 0) >= 1) {
      return parsed as ChunkManifest;
    }
  } catch {
    return null;
  }
  return null;
}

async function removeChunks(key: string, manifest: ChunkManifest): Promise<void> {
  await Promise.all(Array.from({ length: manifest.count }, (_, index) =>
    SecureStore.deleteItemAsync(chunkKey(key, manifest.generation, index)).catch(() => undefined),
  ));
}

const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;

    const manifest = await readManifest(key);
    if (manifest) {
      const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, manifest.generation, index)),
      ));
      if (chunks.some((chunk) => chunk === null)) return null;
      return chunks.join('');
    }

    const legacyValue = await SecureStore.getItemAsync(key);
    if (legacyValue !== null) {
      await sessionStorage.setItem(key, legacyValue);
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
    }
    return legacyValue;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }

    const previousManifest = await readManifest(key);
    const generation = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const chunks = splitIntoSecureChunks(value);

    try {
      await Promise.all(chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, generation, index), chunk),
      ));
      await SecureStore.setItemAsync(manifestKey(key), JSON.stringify({ generation, count: chunks.length }));
    } catch (error) {
      await removeChunks(key, { generation, count: chunks.length });
      throw error;
    }

    if (previousManifest) await removeChunks(key, previousManifest);
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }

    const manifest = await readManifest(key);
    if (manifest) await removeChunks(key, manifest);
    await Promise.all([
      SecureStore.deleteItemAsync(manifestKey(key)).catch(() => undefined),
      SecureStore.deleteItemAsync(key).catch(() => undefined),
    ]);
  },
};

export const supabase = createClient(
  supabaseUrl ?? 'https://setup-required.supabase.co',
  supabaseAnonKey ?? 'setup-required',
  {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);
