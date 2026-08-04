// ===== Admin State =====
let currentAdminTab = 'images';
let editingItem = null;
let uploadFiles = [];

// ===== Initialize Admin =====
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  if (!sessionStorage.getItem('admin_auth')) {
    window.location.href = 'index.html';
    return;
  }

  try {
    await initDB();
    setupAdminListeners();
    loadAdminTab('images');

    // Prevent screenshots (best effort)
    if (document.documentElement.requestFullscreen) {
      // Optional: auto fullscreen
    }
  } catch (err) {
    console.error('Admin init error:', err);
  }
});

// ===== Event Listeners =====
function setupAdminListeners() {
  // Navigation
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadAdminTab(btn.dataset.tab);
    });
  });

  // Logout
  document.getElementById('admin-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('admin_auth');
    window.location.href = 'index.html';
  });

  // Upload area
  const uploadArea = document.getElementById('upload-area');
  if (uploadArea) {
    uploadArea.addEventListener('click', () => document.getElementById('file-input').click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', handleFileDrop);
  }

  document.getElementById('file-input')?.addEventListener('change', handleFileSelect);

  // Modal
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  document.getElementById('save-item-btn')?.addEventListener('click', saveItem);
}

// ===== Load Admin Tab =====
async function loadAdminTab(tab) {
  currentAdminTab = tab;
  const container = document.getElementById('admin-content');
  container.innerHTML = '<div class="loading-spinner"></div>';

  const storeMap = { images: STORES.IMAGES, videos: STORES.VIDEOS, audios: STORES.AUDIOS };
  const store = storeMap[tab];

  try {
    const items = await getAllItems(store);
    renderAdminTable(container, items, tab);
  } catch (err) {
    container.innerHTML = '<div class="empty-state">خطأ في التحميل</div>';
  }
}

function renderAdminTable(container, items, type) {
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-text">لا يوجد محتوى</div>
      </div>
    `;
    return;
  }

  const typeLabel = type === 'images' ? 'صورة' : type === 'videos' ? 'فيديو' : 'مقطع صوتي';

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>المعاينة</th>
          <th>العنوان</th>
          <th>الوصف</th>
          <th>مخفي</th>
          <th>مميز</th>
          <th>جديد</th>
          <th>المشاهدات</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const item of items) {
    html += `
      <tr data-id="${item.id}">
        <td><img src="${item.thumbnail || item.url || item.cover || ''}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/60x40'"></td>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.description || '').substring(0, 50)}...</td>
        <td><div class="toggle-switch ${item.hidden ? 'active' : ''}" data-field="hidden" data-id="${item.id}"></div></td>
        <td><div class="toggle-switch ${item.featured ? 'active' : ''}" data-field="featured" data-id="${item.id}"></div></td>
        <td><div class="toggle-switch ${item.latest ? 'active' : ''}" data-field="latest" data-id="${item.id}"></div></td>
        <td>${item.views || 0}</td>
        <td>
          <button class="admin-action-btn edit" data-id="${item.id}">تعديل</button>
          <button class="admin-action-btn delete" data-id="${item.id}">حذف</button>
        </td>
      </tr>
    `;
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  // Attach listeners
  container.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', async () => {
      const id = parseInt(toggle.dataset.id);
      const field = toggle.dataset.field;
      const storeMap = { images: STORES.IMAGES, videos: STORES.VIDEOS, audios: STORES.AUDIOS };
      const item = await getItem(storeMap[currentAdminTab], id);
      item[field] = !item[field];
      await updateItem(storeMap[currentAdminTab], item);
      toggle.classList.toggle('active');
      showToast('تم التحديث', 'success');
    });
  });

  container.querySelectorAll('.admin-action-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
  });

  container.querySelectorAll('.admin-action-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteAdminItem(parseInt(btn.dataset.id)));
  });
}

// ===== File Upload =====
function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('upload-area').classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files);
  processFiles(files);
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  processFiles(files);
}

function processFiles(files) {
  uploadFiles = files;
  if (files.length > 0) {
    openUploadModal(files);
  }
}

function openUploadModal(files) {
  editingItem = null;
  const modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = 'إضافة محتوى جديد';
  document.getElementById('item-title').value = '';
  document.getElementById('item-desc').value = '';
  document.getElementById('item-hidden').checked = false;
  document.getElementById('item-featured').checked = false;
  document.getElementById('item-latest').checked = true;

  // Preview first file
  const file = files[0];
  const preview = document.getElementById('modal-preview');
  const url = URL.createObjectURL(file);

  if (file.type.startsWith('image/')) {
    preview.innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px;border-radius:12px;">`;
  } else if (file.type.startsWith('video/')) {
    preview.innerHTML = `<video src="${url}" controls style="max-width:100%;max-height:200px;border-radius:12px;"></video>`;
  } else if (file.type.startsWith('audio/')) {
    preview.innerHTML = `<audio src="${url}" controls style="width:100%;"></audio>`;
  }

  modal.classList.add('active');
}

function openEditModal(id) {
  editingItem = id;
  const storeMap = { images: STORES.IMAGES, videos: STORES.VIDEOS, audios: STORES.AUDIOS };

  getItem(storeMap[currentAdminTab], id).then(item => {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'تعديل المحتوى';
    document.getElementById('item-title').value = item.title || '';
    document.getElementById('item-desc').value = item.description || '';
    document.getElementById('item-hidden').checked = item.hidden || false;
    document.getElementById('item-featured').checked = item.featured || false;
    document.getElementById('item-latest').checked = item.latest || false;

    const preview = document.getElementById('modal-preview');
    if (item.url) {
      if (currentAdminTab === 'images') {
        preview.innerHTML = `<img src="${item.url}" style="max-width:100%;max-height:200px;border-radius:12px;">`;
      } else if (currentAdminTab === 'videos') {
        preview.innerHTML = `<video src="${item.url}" controls style="max-width:100%;max-height:200px;border-radius:12px;"></video>`;
      } else {
        preview.innerHTML = `<audio src="${item.url}" controls style="width:100%;"></audio>`;
      }
    }

    modal.classList.add('active');
  });
}

async function saveItem() {
  const title = document.getElementById('item-title').value.trim();
  const description = document.getElementById('item-desc').value.trim();
  const hidden = document.getElementById('item-hidden').checked;
  const featured = document.getElementById('item-featured').checked;
  const latest = document.getElementById('item-latest').checked;

  if (!title) {
    showToast('العنوان مطلوب', 'error');
    return;
  }

  const storeMap = { images: STORES.IMAGES, videos: STORES.VIDEOS, audios: STORES.AUDIOS };
  const store = storeMap[currentAdminTab];

  if (editingItem) {
    // Update existing
    const item = await getItem(store, editingItem);
    item.title = title;
    item.description = description;
    item.hidden = hidden;
    item.featured = featured;
    item.latest = latest;
    await updateItem(store, item);
    showToast('تم التحديث بنجاح', 'success');
  } else {
    // Create new from files
    for (const file of uploadFiles) {
      const url = URL.createObjectURL(file);
      const item = {
        title: title,
        description: description,
        url: url,
        hidden: hidden,
        featured: featured,
        latest: latest,
        type: currentAdminTab === 'images' ? 'image' : currentAdminTab === 'videos' ? 'video' : 'audio'
      };

      if (currentAdminTab === 'images') {
        item.thumbnail = url;
      } else if (currentAdminTab === 'videos') {
        item.thumbnail = url;
      } else {
        item.cover = url;
        item.duration = '--:--';
      }

      await addItem(store, item);
    }
    showToast('تم الإضافة بنجاح', 'success');
  }

  closeModal();
  loadAdminTab(currentAdminTab);
}

async function deleteAdminItem(id) {
  if (!confirm('هل أنت متأكد من الحذف؟')) return;

  const storeMap = { images: STORES.IMAGES, videos: STORES.VIDEOS, audios: STORES.AUDIOS };
  await deleteItem(storeMap[currentAdminTab], id);
  showToast('تم الحذف بنجاح', 'success');
  loadAdminTab(currentAdminTab);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  editingItem = null;
  uploadFiles = [];
}

// ===== Utilities =====
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}
