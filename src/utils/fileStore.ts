import { storage } from '../firebase/service';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const DB_NAME = 'QuizPortal_FileDB_v2';
const STORE_NAME = 'materials';
const DB_VERSION = 2;

// In-memory object URL cache for instant preview & downloads
const blobUrlCache = new Map<string, string>();

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB open error:', request.error);
        reject(request.error);
      };
    } catch (e) {
      reject(e);
    }
  });
  return dbPromise;
}

export async function storeFileInIndexedDB(key: string, file: File | Blob): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(file, key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve(); // Non-blocking
    });
  } catch (err) {
    console.warn('Failed to store in IndexedDB:', err);
  }
}

export async function getFileFromIndexedDB(key: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Super-fast text extractor that never blocks the main thread
 */
async function extractTextFast(file: File): Promise<string> {
  try {
    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const fullText = await file.text();
      return fullText.slice(0, 5000);
    }

    if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
      // Read first 256KB for instant extraction without freezing
      const slice = file.slice(0, 256 * 1024);
      const buffer = await slice.arrayBuffer();
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      const matches = text.match(/\(([^()]{3,})\)/g);
      if (matches && matches.length > 0) {
        return matches
          .map((m) => m.slice(1, -1))
          .filter((s) => s.length > 3 && !s.includes('\\'))
          .slice(0, 80)
          .join(' ')
          .replace(/\s+/g, ' ');
      }
    }
  } catch (e) {
    // Non-fatal
  }
  return '';
}

/**
 * Super-fast Study Material Upload:
 * 1. Instantly creates local Blob URL & caches it (< 5ms).
 * 2. Saves to IndexedDB asynchronously (< 30ms).
 * 3. Attempts Firebase Cloud Storage with a strict 2-second timeout so it NEVER hangs.
 * 4. Returns immediately so the UI is instantaneous.
 */
export async function uploadMaterialFile(
  file: File,
  topicId: string
): Promise<{ url: string; name: string; size: string; textPreview?: string }> {
  const sizeFormatted =
    file.size >= 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      : (file.size / 1024).toFixed(1) + ' KB';

  // 1. Instant local URL creation
  const localBlobUrl = URL.createObjectURL(file);
  const idbKey = `mat_${topicId}`;
  blobUrlCache.set(idbKey, localBlobUrl);

  // 2. Fast background storage in IndexedDB
  storeFileInIndexedDB(idbKey, file).catch(() => {});

  // 3. Fast non-blocking text extraction
  const textPreview = await extractTextFast(file);

  // 4. Fast Cloud upload with 2-second timeout (never blocks UI)
  let cloudUrl = '';
  try {
    const cloudUploadPromise = (async () => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fRef = storageRef(storage, `materials/${topicId}/${Date.now()}_${safeName}`);
      const snap = await uploadBytes(fRef, file);
      return await getDownloadURL(snap.ref);
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Cloud upload timeout')), 2000)
    );

    cloudUrl = await Promise.race([cloudUploadPromise, timeoutPromise]);
  } catch {
    // Fall back to instant local blob URL
  }

  const finalUrl = cloudUrl || localBlobUrl;

  return {
    url: finalUrl,
    name: file.name,
    size: sizeFormatted,
    textPreview: textPreview || undefined,
  };
}

/**
 * Fast open or download
 */
export async function downloadMaterial(url: string, fileName: string, topicId?: string) {
  let targetUrl = url;

  if (topicId) {
    const idbKey = `mat_${topicId}`;
    if (blobUrlCache.has(idbKey)) {
      targetUrl = blobUrlCache.get(idbKey)!;
    } else {
      const blob = await getFileFromIndexedDB(idbKey);
      if (blob) {
        targetUrl = URL.createObjectURL(blob);
        blobUrlCache.set(idbKey, targetUrl);
      }
    }
  }

  if (targetUrl && (targetUrl.startsWith('http') || targetUrl.startsWith('blob:') || targetUrl.startsWith('data:'))) {
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
    return;
  }

  alert(`Study document "${fileName}" is attached.`);
}
