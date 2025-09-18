/*
 * File System Access helpers for persisting directory handles and
 * reading/writing attachments. Handles are stored in IndexedDB so that
 * permissions survive reloads (subject to browser support).
 */

const DB_NAME = 'work-checklist-fs';
const STORE_NAME = 'handles';
const KEY_DIRECTORY = 'attachment-directory';

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

const withStore = async (mode, callback) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let request;
    try {
      request = callback(store);
    } catch (err) {
      reject(err);
      return;
    }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveAttachmentDirectoryHandle = async (handle) => {
  if (!handle) return;
  await withStore('readwrite', (store) => store.put(handle, KEY_DIRECTORY));
};

export const getAttachmentDirectoryHandle = async () => {
  try {
    return await withStore('readonly', (store) => store.get(KEY_DIRECTORY));
  } catch (err) {
    console.warn('Failed to read attachment directory handle', err);
    return null;
  }
};

export const clearAttachmentDirectoryHandle = async () => {
  await withStore('readwrite', (store) => store.delete(KEY_DIRECTORY));
};

export const ensureDirectoryPermission = async (handle) => {
  if (!handle) return 'denied';
  try {
    const options = { mode: 'readwrite' };
    if ((await handle.queryPermission(options)) === 'granted') {
      return 'granted';
    }
    if ((await handle.requestPermission(options)) === 'granted') {
      return 'granted';
    }
    return 'denied';
  } catch (err) {
    console.warn('ensureDirectoryPermission error', err);
    return 'denied';
  }
};

const resolveDirectory = async (rootHandle, segments, { create } = { create: false }) => {
  let dirHandle = rootHandle;
  for (const segment of segments) {
    if (!segment) continue;
    dirHandle = await dirHandle.getDirectoryHandle(segment, { create });
  }
  return dirHandle;
};

export const writeFileToDirectory = async (directoryHandle, filePath, file) => {
  if (!directoryHandle) throw new Error('No directory handle configured');
  const segments = Array.isArray(filePath) ? [...filePath] : filePath.split('/');
  const fileName = segments.pop();
  const targetDir = await resolveDirectory(directoryHandle, segments, { create: true });
  const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
  return fileHandle;
};

export const readFileFromDirectory = async (directoryHandle, filePath) => {
  if (!directoryHandle) throw new Error('No directory handle configured');
  const segments = Array.isArray(filePath) ? [...filePath] : filePath.split('/');
  const fileName = segments.pop();
  const targetDir = await resolveDirectory(directoryHandle, segments, { create: false });
  const fileHandle = await targetDir.getFileHandle(fileName, { create: false });
  return fileHandle.getFile();
};

export const deleteFileFromDirectory = async (directoryHandle, filePath) => {
  if (!directoryHandle) throw new Error('No directory handle configured');
  const segments = Array.isArray(filePath) ? [...filePath] : filePath.split('/');
  const fileName = segments.pop();
  const targetDir = await resolveDirectory(directoryHandle, segments, { create: false });
  await targetDir.removeEntry(fileName);
};
