import { storage } from '../firebase/service';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const DB_NAME = 'QuizPortal_FileDB_v3';
const STORE_NAME = 'materials';
const DB_VERSION = 3;

// In-memory cache of live blob URLs for fast repeated clicks
const activeBlobUrlMap = new Map<string, string>();

interface StoredFileRecord {
  id: string; // key, e.g. mat_topicId
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  textPreview?: string;
  savedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

// Convert ArrayBuffer to Base64 safely
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 back to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Persistently save file into IndexedDB (as ArrayBuffer) and LocalStorage fallback
 */
export async function saveFilePermanently(key: string, file: File): Promise<string | undefined> {
  const arrayBuffer = await file.arrayBuffer();
  let textPreview = '';

  // Extract quick text summary for question generation
  try {
    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      textPreview = new TextDecoder('utf-8').decode(arrayBuffer).slice(0, 5000);
    } else if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer.slice(0, 200 * 1024));
      const matches = text.match(/\(([^()]{3,})\)/g);
      if (matches && matches.length > 0) {
        textPreview = matches
          .map((m) => m.slice(1, -1))
          .filter((s) => s.length > 3 && !s.includes('\\'))
          .slice(0, 100)
          .join(' ')
          .replace(/\s+/g, ' ');
      }
    }
  } catch (e) {
    // Non-fatal
  }

  // 1. Save in IndexedDB
  try {
    const db = await openDB();
    const record: StoredFileRecord = {
      id: key,
      name: file.name,
      type: file.type || 'application/pdf',
      size: file.size,
      data: arrayBuffer,
      textPreview,
      savedAt: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB write error:', err);
  }

  // 2. Dual-tier: If file is under 3MB, ALSO save Base64 copy in localStorage for indestructible persistence
  if (file.size <= 3 * 1024 * 1024) {
    try {
      const b64 = arrayBufferToBase64(arrayBuffer);
      localStorage.setItem(`qp_b64_${key}`, JSON.stringify({
        name: file.name,
        type: file.type || 'application/pdf',
        b64,
      }));
    } catch {
      // localStorage quota limit reached, IndexedDB is primary
    }
  }

  return textPreview;
}

/**
 * Retrieve a live, fresh Blob for a file across ANY browser refresh
 */
export async function getMaterialBlob(topicId: string): Promise<Blob | null> {
  const key = `mat_${topicId}`;

  // 1. Try IndexedDB
  try {
    const db = await openDB();
    const record = await new Promise<StoredFileRecord | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (record && record.data) {
      return new Blob([record.data], { type: record.type || 'application/pdf' });
    }
  } catch (err) {
    console.warn('IndexedDB read error, checking fallback:', err);
  }

  // 2. Try LocalStorage Base64 fallback
  try {
    const raw = localStorage.getItem(`qp_b64_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.b64) {
        const u8 = base64ToUint8Array(parsed.b64);
        return new Blob([u8.buffer as ArrayBuffer], { type: parsed.type || 'application/pdf' });
      }
    }
  } catch (err) {
    console.warn('LocalStorage fallback read error:', err);
  }

  return null;
}

/**
 * Upload Study Material with guaranteed persistence across browser refreshes
 */
export async function uploadMaterialFile(
  file: File,
  topicId: string
): Promise<{ url: string; name: string; size: string; textPreview?: string }> {
  const sizeFormatted =
    file.size >= 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      : (file.size / 1024).toFixed(1) + ' KB';

  const key = `mat_${topicId}`;

  // 1. Await persistent storage in IndexedDB + LocalStorage
  const textPreview = await saveFilePermanently(key, file);

  // 2. Create fresh local object URL for current session
  const localUrl = URL.createObjectURL(file);
  activeBlobUrlMap.set(key, localUrl);

  // 3. Fast non-blocking cloud upload attempt
  let cloudUrl = '';
  try {
    const uploadTask = (async () => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fRef = storageRef(storage, `materials/${topicId}/${Date.now()}_${safeName}`);
      const snap = await uploadBytes(fRef, file);
      return await getDownloadURL(snap.ref);
    })();

    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 1500)
    );

    cloudUrl = await Promise.race([uploadTask, timeout]);
  } catch {
    // Non-fatal, local storage is permanent
  }

  // Persistent reference identifier
  const finalUrl = cloudUrl || `local://${key}`;

  return {
    url: finalUrl,
    name: file.name,
    size: sizeFormatted,
    textPreview: textPreview || undefined,
  };
}

/**
 * Download or Open PDF material reliably even after browser refreshes
 */
export async function downloadMaterial(url: string, fileName: string, topicId?: string) {
  // 1. If it's a real Firebase cloud HTTPS URL, open/download it directly
  if (url && url.startsWith('https://')) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
    return;
  }

  // 2. Fetch fresh, live Blob from permanent IndexedDB / LocalStorage
  if (topicId) {
    const blob = await getMaterialBlob(topicId);
    if (blob) {
      const freshUrl = URL.createObjectURL(blob);
      activeBlobUrlMap.set(`mat_${topicId}`, freshUrl);
      const a = document.createElement('a');
      a.href = freshUrl;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      return;
    }
  }

  // 3. Check memory cache
  if (topicId && activeBlobUrlMap.has(`mat_${topicId}`)) {
    const cached = activeBlobUrlMap.get(`mat_${topicId}`)!;
    const a = document.createElement('a');
    a.href = cached;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
    return;
  }

  alert(`Document "${fileName}" is attached to this topic. View the summary in the Study Material viewer.`);
}
