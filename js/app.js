// ===== App State =====
let currentSection = 'home';
let currentMedia = [];
let currentMediaIndex = 0;
let audioPlayer = null;
let isPlaying = false;
let currentAudioIndex = 0;
let audioList = [];
let logoClickCount = 0;
let logoPressTimer = null;
let deferredPrompt = null;

// ===== DOM Elements =====
const sections = {
  home: document.getElementById('section-home'),
  images: document.getElementById('section-images'),
  videos: document.getElementById('section-videos'),
  audios: document.getElementById('section-audios'),
  latest: document.getElementById('section-latest'),
  popular: document.getElementById('section-popular'),
  favorites: document.getElementById('section-favorites'),
  about: document.getElementById('section-about'),
  contact: document.getElementById('section-contact')
};

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initDB();
    await seedDemoData();
    setupEventListeners();
    setupPWA();
    loadHomeStats();
    showToast('مرحباً بك في الحشد الفاطمي', 'success');
  } catch (err) {
    console.error('Init error:', err);
    showToast('خطأ في تحميل التطبيق', 'error');
  }
});

// ===== Event Listeners =====
function setupEventListeners() {
  // Logo secret access
  const logo = document.getElementById('app-logo');
  if (logo) {
    logo.addEventListener('click', handleLogoClick);
    logo.addEventListener('touchstart', handleLogoPressStart);
    logo.addEventListener('touchend', handleLogoPressEnd);
    logo.addEventListener('mousedown', handleLogoPressStart);
    logo.addEventListener('mouseup', handleLogoPressEnd);
    logo.addEventListener('mouseleave', handleLogoPressEnd);
  }

  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }

  // Media viewer
  document.getElementById('viewer-close')?.addEventListener('click', closeViewer);
  document.getElementById('viewer-prev')?.addEventListener('click', () => navigateViewer(-1));
  document.getElementById('viewer-next')?.addEventListener('click', () => navigateViewer(1));
  document.getElementById('viewer-download')?.addEventListener('click', downloadCurrentMedia);
  document.getElementById('viewer-share')?.addEventListener('click', shareCurrentMedia);

  // Audio player
  document.getElementById('player-play')?.addEventListener('click', toggleAudioPlay);
  document.getElementById('player-prev')?.addEventListener('click', playPrevAudio);
  document.getElementById('player-next')?.addEventListener('click', playNextAudio);
  document.getElementById('player-progress')?.addEventListener('click', seekAudio);

  // Admin login
  document.getElementById('admin-login-btn')?.addEventListener('click', handleAdminLogin);
  document.getElementById('admin-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'admin-overlay') closeAdminLogin();
  });

  // Contact form
  document.getElementById('contact-form')?.addEventListener('submit', handleContactSubmit);

  // Install button
  document.getElementById('install-btn')?.addEventListener('click', installPWA);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);

  // Swipe gestures for viewer
  setupSwipeGestures();
}

// ===== Logo Secret Access =====
function handleLogoClick() {
  logoClickCount++;
  if (logoClickCount >= 5) {
    logoClickCount = 0;
    openAdminLogin();
  }
  setTimeout(() => { logoClickCount = 0; }, 2000);
}

function handleLogoPressStart(e) {
  e.preventDefault();
  logoPressTimer = setTimeout(() => {
    openAdminLogin();
  }, 8000);
}

function handleLogoPressEnd(e) {
  e.preventDefault();
  if (logoPressTimer) {
    clearTimeout(logoPressTimer);
    logoPressTimer = null;
  }
}

// ===== Navigation =====
function navigateTo(section) {
  Object.values(sections).forEach(s => s?.classList.remove('active'));
  if (sections[section]) {
    sections[section].classList.add('active');
    currentSection = section;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load section data
    switch(section) {
      case 'images': loadImages(); break;
      case 'videos': loadVideos(); break;
      case 'audios': loadAudios(); break;
    }
  }
}

function goHome() {
  navigateTo('home');
}

// ===== Home Stats =====
async function loadHomeStats() {
  try {
    const images = await getAllItems(STORES.IMAGES, { hidden: false });
    const videos = await getAllItems(STORES.VIDEOS, { hidden: false });
    const audios = await getAllItems(STORES.AUDIOS, { hidden: false });
    document.getElementById('count-images').textContent = images.length;
    document.getElementById('count-videos').textContent = videos.length;
    document.getElementById('count-audios').textContent = audios.length;
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ===== Load Media Sections =====
async function loadImages() {
  const container = document.getElementById('images-grid');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const images = await getAllItems(STORES.IMAGES, { hidden: false });
    renderMediaGrid(container, images, 'image');
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🖼</div><div class="empty-state-text">لا توجد صور</div></div>';
  }
}

async function loadVideos() {
  const container = document.getElementById('videos-grid');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const videos = await getAllItems(STORES.VIDEOS, { hidden: false });
    renderMediaGrid(container, videos, 'video');
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎥</div><div class="empty-state-text">لا توجد فيديوهات</div></div>';
  }
}

async function loadAudios() {
  const container = document.getElementById('audios-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const audios = await getAllItems(STORES.AUDIOS, { hidden: false });
    audioList = audios;
    renderAudioList(container, audios);
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎧</div><div class="empty-state-text">لا توجد مقاطع صوتية</div></div>';
  }
}

async function loadLatest() {
  const imgContainer = document.getElementById('latest-images');
  const vidContainer = document.getElementById('latest-videos');
  const audContainer = document.getElementById('latest-audios');

  try {
    const images = await getAllItems(STORES.IMAGES, { hidden: false, latest: true });
    const videos = await getAllItems(STORES.VIDEOS, { hidden: false, latest: true });
    const audios = await getAllItems(STORES.AUDIOS, { hidden: false, latest: true });

    if (imgContainer) renderMediaGrid(imgContainer, images, 'image');
    if (vidContainer) renderMediaGrid(vidContainer, videos, 'video');
    if (audContainer) renderAudioList(audContainer, audios);
  } catch (err) {
    console.error('Latest error:', err);
  }
}

async function loadPopular() {
  const imgContainer = document.getElementById('popular-images');
  const vidContainer = document.getElementById('popular-videos');
  const audContainer = document.getElementById('popular-audios');

  try {
    let images = await getAllItems(STORES.IMAGES, { hidden: false });
    let videos = await getAllItems(STORES.VIDEOS, { hidden: false });
    let audios = await getAllItems(STORES.AUDIOS, { hidden: false });

    images = images.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
    videos = videos.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
    audios = audios.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);

    if (imgContainer) renderMediaGrid(imgContainer, images, 'image');
    if (vidContainer) renderMediaGrid(vidContainer, videos, 'video');
    if (audContainer) renderAudioList(audContainer, audios);
  } catch (err) {
    console.error('Popular error:', err);
  }
}

async function loadFavorites() {
  const container = document.getElementById('favorites-grid');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const favorites = await getFavorites();
    if (favorites.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❤️</div><div class="empty-state-text">لا توجد مفضلات</div></div>';
      return;
    }

    let html = '';
    for (const fav of favorites) {
      const item = fav.data;
      if (item.type === 'audio') {
        html += createAudioCard(item);
      } else {
        html += createMediaCard(item, item.type);
      }
    }
    container.innerHTML = html;
    attachMediaListeners(container);
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❤️</div><div class="empty-state-text">لا توجد مفضلات</div></div>';
  }
}

// ===== Render Functions =====
function renderMediaGrid(container, items, type) {
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📂</div><div class="empty-state-text">لا يوجد محتوى</div></div>';
    return;
  }

  container.innerHTML = items.map(item => createMediaCard(item, type)).join('');
  attachMediaListeners(container);
}

function createMediaCard(item, type) {
  const isFav = item.isFavorite ? 'active' : '';
  return `
    <div class="glass-card media-card fade-in" data-id="${item.id}" data-type="${type}">
      <img src="${item.thumbnail || item.url}" alt="${item.title}" loading="lazy">
      <div class="media-overlay">
        <div class="media-title">${escapeHtml(item.title)}</div>
        <div class="media-desc">${escapeHtml(item.description || '')}</div>
      </div>
      <div class="media-actions">
        <button class="action-btn fav-btn ${isFav}" data-id="${item.id}" data-type="${type}" title="مفضلة">❤</button>
        <button class="action-btn share-btn" data-id="${item.id}" data-type="${type}" title="مشاركة">↗</button>
      </div>
    </div>
  `;
}

function renderAudioList(container, items) {
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎧</div><div class="empty-state-text">لا توجد مقاطع صوتية</div></div>';
    return;
  }

  container.innerHTML = items.map((item, index) => createAudioCard(item, index)).join('');
  attachAudioListeners(container);
}

function createAudioCard(item, index = 0) {
  return `
    <div class="glass-card audio-item fade-in" data-id="${item.id}" data-index="${index}">
      <img src="${item.cover || item.thumbnail || 'https://via.placeholder.com/60'}" alt="${item.title}" class="audio-cover">
      <div class="audio-info">
        <div class="audio-title">${escapeHtml(item.title)}</div>
        <div class="audio-desc">${escapeHtml(item.description || '')}</div>
      </div>
      <div class="audio-duration">${item.duration || '--:--'}</div>
      <button class="audio-play-btn" data-id="${item.id}" data-index="${index}">▶</button>
    </div>
  `;
}

function attachMediaListeners(container) {
  // Card click - open viewer
  container.querySelectorAll('.media-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.action-btn')) return;
      const id = parseInt(card.dataset.id);
      const type = card.dataset.type;
      await openViewer(id, type);
    });
  });

  // Favorite button
  container.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const type = btn.dataset.type;
      const store = type === 'image' ? STORES.IMAGES : type === 'video' ? STORES.VIDEOS : STORES.AUDIOS;
      const item = await getItem(store, id);
      item.type = type;
      const added = await toggleFavorite(item);
      btn.classList.toggle('active', added);
      showToast(added ? 'تمت الإضافة للمفضلة' : 'تمت الإزالة من المفضلة', 'success');
    });
  });

  // Share button
  container.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const type = btn.dataset.type;
      await shareMedia(id, type);
    });
  });
}

function attachAudioListeners(container) {
  container.querySelectorAll('.audio-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.audio-play-btn')) return;
      const index = parseInt(item.dataset.index);
      playAudioAt(index);
    });
  });

  container.querySelectorAll('.audio-play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      playAudioAt(index);
    });
  });
}

// ===== Media Viewer =====
async function openViewer(id, type) {
  const store = type === 'image' ? STORES.IMAGES : type === 'video' ? STORES.VIDEOS : STORES.AUDIOS;
  const items = await getAllItems(store, { hidden: false });
  currentMedia = items;
  currentMediaIndex = items.findIndex(i => i.id === id);

  if (currentMediaIndex === -1) return;

  await incrementViews(store, id);
  updateViewerContent();

  const viewer = document.getElementById('media-viewer');
  viewer.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function updateViewerContent() {
  const item = currentMedia[currentMediaIndex];
  const content = document.getElementById('viewer-content');
  const isVideo = item.type === 'video' || item.url?.match(/\.(mp4|webm|ogg)$/);

  if (isVideo) {
    content.innerHTML = `<video src="${item.url}" controls autoplay style="max-width:100%;max-height:90vh;"></video>`;
  } else {
    content.innerHTML = `<img src="${item.url}" alt="${item.title}" style="max-width:100%;max-height:90vh;">`;
  }
}

function closeViewer() {
  const viewer = document.getElementById('media-viewer');
  viewer.classList.remove('active');
  document.body.style.overflow = '';
  const video = viewer.querySelector('video');
  if (video) video.pause();
}

function navigateViewer(direction) {
  currentMediaIndex += direction;
  if (currentMediaIndex < 0) currentMediaIndex = currentMedia.length - 1;
  if (currentMediaIndex >= currentMedia.length) currentMediaIndex = 0;
  updateViewerContent();
}

async function downloadCurrentMedia() {
  const item = currentMedia[currentMediaIndex];
  try {
    const response = await fetch(item.url);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.title + (item.type === 'video' ? '.mp4' : item.type === 'audio' ? '.mp3' : '.jpg');
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم التحميل', 'success');
  } catch (err) {
    showToast('خطأ في التحميل', 'error');
  }
}

async function shareCurrentMedia() {
  const item = currentMedia[currentMediaIndex];
  await shareMedia(item.id, item.type);
}

async function shareMedia(id, type) {
  const store = type === 'image' ? STORES.IMAGES : type === 'video' ? STORES.VIDEOS : STORES.AUDIOS;
  const item = await getItem(store, id);

  if (navigator.share) {
    try {
      await navigator.share({
        title: item.title,
        text: item.description,
        url: item.url
      });
    } catch (err) {
      // User cancelled
    }
  } else {
    await navigator.clipboard.writeText(item.url);
    showToast('تم نسخ الرابط', 'success');
  }
}

// ===== Audio Player =====
function playAudioAt(index) {
  if (!audioList.length) return;
  currentAudioIndex = index;
  const item = audioList[index];

  if (!audioPlayer) {
    audioPlayer = new Audio();
    audioPlayer.addEventListener('timeupdate', updatePlayerProgress);
    audioPlayer.addEventListener('ended', playNextAudio);
  }

  audioPlayer.src = item.url;
  audioPlayer.play();
  isPlaying = true;

  // Update player bar
  document.getElementById('player-cover').src = item.cover || item.thumbnail || 'https://via.placeholder.com/48';
  document.getElementById('player-title').textContent = item.title;
  document.getElementById('player-play').textContent = '⏸';
  document.getElementById('audio-player-bar').classList.add('active');

  incrementViews(STORES.AUDIOS, item.id);
}

function toggleAudioPlay() {
  if (!audioPlayer) return;
  if (isPlaying) {
    audioPlayer.pause();
    document.getElementById('player-play').textContent = '▶';
  } else {
    audioPlayer.play();
    document.getElementById('player-play').textContent = '⏸';
  }
  isPlaying = !isPlaying;
}

function playNextAudio() {
  currentAudioIndex = (currentAudioIndex + 1) % audioList.length;
  playAudioAt(currentAudioIndex);
}

function playPrevAudio() {
  currentAudioIndex = (currentAudioIndex - 1 + audioList.length) % audioList.length;
  playAudioAt(currentAudioIndex);
}

function updatePlayerProgress() {
  if (!audioPlayer) return;
  const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  document.getElementById('player-progress-bar').style.width = progress + '%';
}

function seekAudio(e) {
  if (!audioPlayer) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audioPlayer.currentTime = percent * audioPlayer.duration;
}

// ===== Search =====
async function handleSearch(e) {
  const query = e.target.value.trim();
  if (!query) {
    if (currentSection !== 'home') navigateTo(currentSection);
    return;
  }

  const imgResults = await searchItems(STORES.IMAGES, query);
  const vidResults = await searchItems(STORES.VIDEOS, query);
  const audResults = await searchItems(STORES.AUDIOS, query);

  // Show search results in current section or dedicated search view
  navigateTo('images');
  const container = document.getElementById('images-grid');
  const allResults = [
    ...imgResults.map(i => ({...i, type: 'image'})),
    ...vidResults.map(i => ({...i, type: 'video'}))
  ];
  renderMediaGrid(container, allResults, 'mixed');

  // Also show audio results
  const audContainer = document.getElementById('audios-list');
  if (audContainer && audResults.length > 0) {
    renderAudioList(audContainer, audResults);
  }
}

// ===== Admin =====
function openAdminLogin() {
  const overlay = document.getElementById('admin-overlay');
  overlay.classList.add('active');
  document.getElementById('admin-username').focus();
  document.body.style.overflow = 'hidden';
}

function closeAdminLogin() {
  document.getElementById('admin-overlay').classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('admin-error').classList.remove('active');
}

async function handleAdminLogin() {
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value;

  if (username === 'admin' && password === 'admin123') {
    sessionStorage.setItem('admin_auth', 'true');
    window.location.href = 'admin.html';
  } else {
    document.getElementById('admin-error').classList.add('active');
    document.getElementById('admin-password').value = '';
  }
}

// ===== Contact =====
function handleContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('contact-name').value;
  const email = document.getElementById('contact-email').value;
  const message = document.getElementById('contact-message').value;

  // In a real app, send to server
  showToast('تم إرسال رسالتك بنجاح', 'success');
  e.target.reset();
}

// ===== PWA =====
function setupPWA() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('SW error:', err));
  }

  // Install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-btn')?.classList.add('active');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.getElementById('install-btn')?.classList.remove('active');
    showToast('تم تثبيت التطبيق بنجاح', 'success');
  });
}

async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  if (result.outcome === 'accepted') {
    showToast('تم تثبيت التطبيق', 'success');
  }
  deferredPrompt = null;
  document.getElementById('install-btn')?.classList.remove('active');
}

// ===== Utilities =====
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

function handleKeyboard(e) {
  if (e.key === 'Escape') {
    closeViewer();
    closeAdminLogin();
  }
  if (document.getElementById('media-viewer').classList.contains('active')) {
    if (e.key === 'ArrowLeft') navigateViewer(1);
    if (e.key === 'ArrowRight') navigateViewer(-1);
  }
}

function setupSwipeGestures() {
  let startX = 0;
  const viewer = document.getElementById('media-viewer');

  viewer.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; });
  viewer.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    if (Math.abs(diff) > 50) {
      navigateViewer(diff > 0 ? 1 : -1);
    }
  });
}
