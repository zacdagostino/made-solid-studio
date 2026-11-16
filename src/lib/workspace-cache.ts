import type { AgentPackage, AgentPackageProposal, Business, ProspectWorkspace } from './domain';

export type WorkspaceCacheSnapshot = {
  key: string;
  savedAt: string;
  businesses: Business[];
  workspaces: ProspectWorkspace[];
  agentPackages: AgentPackage[];
  agentPackageProposals: AgentPackageProposal[];
};

const databaseName = 'made-solid-studio-workspace-cache';
const storeName = 'snapshots';
const maximumCacheAge = 7 * 24 * 60 * 60 * 1_000;
const cacheHintPrefix = 'made-solid-studio-workspace-cache.';
let databasePromise: Promise<IDBDatabase> | undefined;

function cacheHintKey(key: string) {
  return `${cacheHintPrefix}${key}`;
}

export function hasWorkspaceCache(key: string) {
  if (!key) return false;
  try {
    const savedAt = window.localStorage.getItem(cacheHintKey(key));
    return Boolean(savedAt && Date.now() - Date.parse(savedAt) <= maximumCacheAge);
  } catch {
    return false;
  }
}

function database() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return databasePromise;
}

export async function readWorkspaceCache(key: string) {
  if (!key || !('indexedDB' in window)) return undefined;
  try {
    const cacheDatabase = await database();
    const snapshot = await new Promise<WorkspaceCacheSnapshot | undefined>((resolve, reject) => {
      const request = cacheDatabase
        .transaction(storeName, 'readonly')
        .objectStore(storeName)
        .get(key);
      request.onsuccess = () => resolve(request.result as WorkspaceCacheSnapshot | undefined);
      request.onerror = () => reject(request.error);
    });
    if (!snapshot) {
      window.localStorage.removeItem(cacheHintKey(key));
      return undefined;
    }
    if (Date.now() - Date.parse(snapshot.savedAt) <= maximumCacheAge) return snapshot;
    await clearWorkspaceCache(key);
  } catch {
    // Cached rendering is an optimisation; the repository remains the source of truth.
  }
  return undefined;
}

export async function writeWorkspaceCache(snapshot: WorkspaceCacheSnapshot) {
  if (!snapshot.key || !('indexedDB' in window)) return;
  try {
    const cacheDatabase = await database();
    await new Promise<void>((resolve, reject) => {
      const request = cacheDatabase
        .transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .put(snapshot);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    window.localStorage.setItem(cacheHintKey(snapshot.key), snapshot.savedAt);
  } catch {
    // Continue without cached startup when storage is unavailable or full.
  }
}

export async function clearWorkspaceCache(key: string) {
  if (!key || !('indexedDB' in window)) return;
  try {
    const cacheDatabase = await database();
    await new Promise<void>((resolve, reject) => {
      const request = cacheDatabase
        .transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    window.localStorage.removeItem(cacheHintKey(key));
  } catch {
    // The authenticated repository remains usable when cache cleanup is unavailable.
  }
}
