// ===== Database Configuration =====
const DB_NAME = 'AlHashdFatimiDB';
const DB_VERSION = 1;

// ===== Store Names =====
const STORES = {
  IMAGES: 'images',
  VIDEOS: 'videos',
  AUDIOS: 'audios',
  FAVORITES: 'favorites',
  SETTINGS: 'settings'
};

let db = null;

// ===== Initialize Database =====
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Images store
      if (!database.objectStoreNames.contains(STORES.IMAGES)) {
        const imgStore = database.createObjectStore(STORES.IMAGES, { keyPath: 'id', autoIncrement: true });
        imgStore.createIndex('title', 'title', { unique: false });
        imgStore.createIndex('hidden', 'hidden', { unique: false });
        imgStore.createIndex('featured', 'featured', { unique: false });
        imgStore.createIndex('latest', 'latest', { unique: false });
      }

      // Videos store
      if (!database.objectStoreNames.contains(STORES.VIDEOS)) {
        const vidStore = database.createObjectStore(STORES.VIDEOS, { keyPath: 'id', autoIncrement: true });
        vidStore.createIndex('title', 'title', { unique: false });
        vidStore.createIndex('hidden', 'hidden', { unique: false });
        vidStore.createIndex('featured', 'featured', { unique: false });
        vidStore.createIndex('latest', 'latest', { unique: false });
      }

      // Audios store
      if (!database.objectStoreNames.contains(STORES.AUDIOS)) {
        const audStore = database.createObjectStore(STORES.AUDIOS, { keyPath: 'id', autoIncrement: true });
        audStore.createIndex('title', 'title', { unique: false });
        audStore.createIndex('hidden', 'hidden', { unique: false });
        audStore.createIndex('featured', 'featured', { unique: false });
        audStore.createIndex('latest', 'latest', { unique: false });
      }

      // Favorites store
      if (!database.objectStoreNames.contains(STORES.FAVORITES)) {
        database.createObjectStore(STORES.FAVORITES, { keyPath: 'id' });
      }

      // Settings store
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });
}

// ===== Generic CRUD Operations =====
function addItem(storeName, item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    item.createdAt = new Date().toISOString();
    item.views = 0;
    const request = store.add(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllItems(storeName, filters = {}) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => {
      let items = request.result;
      if (filters.hidden !== undefined) {
        items = items.filter(i => i.hidden === filters.hidden);
      }
      if (filters.featured !== undefined) {
        items = items.filter(i => i.featured === filters.featured);
      }
      if (filters.latest !== undefined) {
        items = items.filter(i => i.latest === filters.latest);
      }
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

function getItem(storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function updateItem(storeName, item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    item.updatedAt = new Date().toISOString();
    const request = store.put(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteItem(storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function searchItems(storeName, query) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => {
      const items = request.result.filter(item => 
        (item.title && item.title.includes(query)) ||
        (item.description && item.description.includes(query))
      );
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

function incrementViews(storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => {
      const item = request.result;
      if (item) {
        item.views = (item.views || 0) + 1;
        store.put(item);
      }
      resolve(item);
    };
    request.onerror = () => reject(request.error);
  });
}

// ===== Favorites =====
function toggleFavorite(item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.FAVORITES], 'readwrite');
    const store = transaction.objectStore(STORES.FAVORITES);
    const getReq = store.get(item.id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.delete(item.id);
        resolve(false);
      } else {
        store.add({ id: item.id, type: item.type, data: item, addedAt: new Date().toISOString() });
        resolve(true);
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

function getFavorites() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.FAVORITES], 'readonly');
    const store = transaction.objectStore(STORES.FAVORITES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function isFavorite(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.FAVORITES], 'readonly');
    const store = transaction.objectStore(STORES.FAVORITES);
    const request = store.get(id);
    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => reject(request.error);
  });
}

// ===== Settings =====
function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getSetting(key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SETTINGS], 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ? request.result.value : null);
    request.onerror = () => reject(request.error);
  });
}

// ===== Demo Data =====
async function seedDemoData() {
  const seeded = await getSetting('seeded');
  if (seeded) return;

  // Demo Images
  await addItem(STORES.IMAGES, {
    title: 'صورة توضيحية 1',
    description: 'وصف الصورة الأولى',
    url: 'https://picsum.photos/800/600?random=1',
    thumbnail: 'https://picsum.photos/400/300?random=1',
    hidden: false,
    featured: true,
    latest: true,
    type: 'image'
  });
  await addItem(STORES.IMAGES, {
    title: 'صورة توضيحية 2',
    description: 'وصف الصورة الثانية',
    url: 'https://picsum.photos/800/600?random=2',
    thumbnail: 'https://picsum.photos/400/300?random=2',
    hidden: false,
    featured: false,
    latest: true,
    type: 'image'
  });

  // Demo Videos
  await addItem(STORES.VIDEOS, {
    title: 'فيديو توضيحي 1',
    description: 'وصف الفيديو الأول',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://picsum.photos/800/450?random=3',
    hidden: false,
    featured: true,
    latest: true,
    type: 'video'
  });

  // Demo Audios
  await addItem(STORES.AUDIOS, {
    title: 'مقطع صوتي توضيحي 1',
    description: 'وصف المقطع الصوتي الأول',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    cover: 'https://picsum.photos/400/400?random=4',
    duration: '3:45',
    hidden: false,
    featured: false,
    latest: true,
    type: 'audio'
  });

  await setSetting('seeded', true);
}

// Export for modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initDB, addItem, getAllItems, getItem, updateItem, deleteItem, searchItems, toggleFavorite, getFavorites, isFavorite, setSetting, getSetting, incrementViews, seedDemoData, STORES };
}
