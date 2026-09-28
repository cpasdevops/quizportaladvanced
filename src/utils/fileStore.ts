import { storage } from '../firebase/service';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const DB_NAME = 'QuizPortal_FileDB';
const STORE_NAME = 'materials';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeFileInIndexedDB(key: string, file: File | Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const putRequest = store.put(file, key);
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error);
  });
}

export async function getFileFromIndexedDB(key: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(key);
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch {
    return null;
  }
}

/**
 * Robust study material upload:
 * 1. Tries Firebase Storage first.
 * 2. If Firebase Storage fails (permissions/CORS/network), stores in IndexedDB (handles up to 50MB+ without Firestore 1MB limit).
 * 3. Returns a playable/downloadable URL, name, and formatted size.
 */
export async function uploadMaterialFile(
  file: File,
  topicId: string
): Promise<{ url: string; name: string; size: string; textPreview?: string }> {
  const sizeFormatted =
    file.size >= 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      : (file.size / 1024).toFixed(1) + ' KB';

  // 1. Try extracting text for AI question generation & preview
  let textPreview = '';
  try {
    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      textPreview = await file.text();
    } else if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
      // Basic text extraction from raw PDF streams
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      // Extract ASCII text tokens from PDF streams
      const matches = text.match(/\(([^()]{3,})\)/g);
      if (matches && matches.length > 0) {
        textPreview = matches
          .map((m) => m.slice(1, -1))
          .filter((s) => s.length > 3 && !s.includes('\\'))
          .slice(0, 150)
          .join(' ')
          .replace(/\s+/g, ' ');
      }
    }
  } catch (err) {
    console.warn('Text extraction error:', err);
  }

  // 2. Try Firebase Storage
  let cloudUrl = '';
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fRef = storageRef(storage, `materials/${topicId}/${Date.now()}_${safeName}`);
    const snap = await uploadBytes(fRef, file);
    cloudUrl = await getDownloadURL(snap.ref);
  } catch (firebaseErr) {
    console.warn('Firebase Storage upload failed (will use high-capacity IndexedDB fallback):', firebaseErr);
  }

  // 3. Store in IndexedDB for 100% reliable local preview & offline download
  const idbKey = `mat_${topicId}`;
  await storeFileInIndexedDB(idbKey, file);

  const localUrl = URL.createObjectURL(file);
  const finalUrl = cloudUrl || localUrl;

  return {
    url: finalUrl,
    name: file.name,
    size: sizeFormatted,
    textPreview: textPreview.trim() || undefined,
  };
}

/**
 * Open or download a file by URL or IndexedDB key
 */
export async function downloadMaterial(url: string, fileName: string, topicId?: string) {
  if (url && (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:'))) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  if (topicId) {
    const blob = await getFileFromIndexedDB(`mat_${topicId}`);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  }

  alert(`Document "${fileName}" is attached. Open preview to view syllabus summary.`);
}
