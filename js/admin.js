// ===== Admin State =====
let currentAdminTab = 'images';
let uploadFiles = [];
let repoContent = { images: [], videos: [], audios: [] };

const GITHUB_TOKEN = sessionStorage.getItem('github_token') || '';
const REPO = 'alhashedalfatimy/al-hashd-fatimi';
const BRANCH = 'main';

// ===== Initialize Admin =====
document.addEventListener('DOMContentLoaded', async () => {
  if (!sessionStorage.getItem('admin_auth')) {
    window.location.href = 'index.html';
    return;
  }

  // Ask for GitHub token if not stored
  if (!GITHUB_TOKEN) {
    const token = prompt('أدخل توكن GitHub الخاص بك (لرفع الملفات):\n\nيمكنك الحصول عليه من:\nhttps://github.com/settings/tokens\n\nاختر صلاحية repo فقط');
    if (token) {
      sessionStorage.setItem('github_token', token);
      location.reload();
    } else {
      showToast('التوكن مطلوب لرفع الملفات', 'error');
    }
    return;
  }

  try {
    await loadContent();
    setupAdminListeners();
    loadAdminTab('images');
  } catch (err) {
    console.error('Admin init error:', err);
    showToast('خطأ في التحميل', 'error');
  }
});

// ===== Load Content from GitHub =====
async function loadContent() {
  try {
    const resp = await fetch('https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/content.json?nocache=' + Date.now());
    if (resp.ok) {
      repoContent = await resp.json();
    }
  } catch (err) {
    console.error('Load content error:', err);
    repoContent = { images: [], videos: [], audios: [] };
  }
}

// ===== GitHub API Helper =====
async function githubApi(path, method = 'GET', body = null) {
  const url = path.startsWith('http') ? path : 'https://api.github.com/repos/' + REPO + path;
  const options = {
    method: method,
    headers: {
      'Authorization': 'token ' + GITHUB_TOKEN,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'AlHashdAdmin'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const resp = await fetch(url, options);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err);
  }
  if (resp.status === 204) return null;
  return await resp.json();
}

// ===== Event Listeners =====
function setupAdminListeners() {
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadAdminTab(btn.dataset.tab);
    });
  });

  document.getElementById('admin-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('admin_auth');
    sessionStorage.removeItem('github_token');
    window.location.href = 'index.html';
  });

  const uploadArea = document.getElementById('upload-area');
  if (uploadArea) {
    uploadArea.addEventListener('click', () => document.getElementById('file-input').click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', handleFileDrop);
  }

  document.getElementById('file-input')?.addEventListener('change', handleFileSelect);

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  document.getElementById('save-item-btn')?.addEventListener('click', saveItem);
}

// ===== Load Admin Tab =====
function loadAdminTab(tab) {
  currentAdminTab = tab;
  const container = document.getElementById('admin-content');

  const items = repoContent[tab] || [];
  renderAdminTable(container, items, tab);
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

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>المعاينة</th>
          <th>العنوان</th>
          <th>الوصف</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    html += `
      <tr>
        <td><img src="${item.thumbnail || item.cover || item.url || ''}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/60x40'"></td>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.description || '').substring(0, 50)}...</td>
        <td>
          <button class="admin-action-btn delete" onclick="deleteItem(${i}, '${type}')">حذف</button>
        </td>
      </tr>
    `;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
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
    openUploadModal(files[0]);
  }
}

function openUploadModal(file) {
  const modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = 'إضافة ' + (currentAdminTab === 'images' ? 'صورة' : currentAdminTab === 'videos' ? 'فيديو' : 'مقطع صوتي');
  document.getElementById('item-title').value = '';
  document.getElementById('item-desc').value = '';

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

async function saveItem() {
  const title = document.getElementById('item-title').value.trim();
  const description = document.getElementById('item-desc').value.trim();

  if (!title) {
    showToast('العنوان مطلوب', 'error');
    return;
  }

  showToast('جاري الرفع...', 'info');

  try {
    if (uploadFiles.length > 0) {
      // Upload file to GitHub
      const file = uploadFiles[0];
      const filename = Date.now() + '_' + file.name.replace(/\s+/g, '_');
      const repoPath = 'uploads/' + filename;

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async function() {
        const base64 = reader.result.split(',')[1];

        // Upload to GitHub
        await githubApi('/contents/' + repoPath, 'PUT', {
          message: 'Upload ' + filename,
          content: base64,
          branch: BRANCH
        });

        const fileUrl = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + repoPath;

        const newItem = {
          id: Date.now(),
          title: title,
          description: description,
          url: fileUrl,
          type: currentAdminTab === 'images' ? 'image' : currentAdminTab === 'videos' ? 'video' : 'audio'
        };

        if (currentAdminTab === 'images') {
          newItem.thumbnail = fileUrl;
        } else if (currentAdminTab === 'videos') {
          newItem.thumbnail = fileUrl;
        } else {
          newItem.cover = fileUrl;
          newItem.duration = '--:--';
        }

        repoContent[currentAdminTab].push(newItem);
        await saveContentJson();

        closeModal();
        loadAdminTab(currentAdminTab);
        showToast('تم الرفع بنجاح!', 'success');
      };
    } else {
      // URL only (for external links)
      const url = prompt('أدخل رابط الملف:');
      if (!url) return;

      const newItem = {
        id: Date.now(),
        title: title,
        description: description,
        url: url,
        type: currentAdminTab === 'images' ? 'image' : currentAdminTab === 'videos' ? 'video' : 'audio'
      };

      if (currentAdminTab === 'images') {
        newItem.thumbnail = url;
      } else if (currentAdminTab === 'videos') {
        newItem.thumbnail = url;
      } else {
        newItem.cover = url;
        newItem.duration = '--:--';
      }

      repoContent[currentAdminTab].push(newItem);
      await saveContentJson();

      closeModal();
      loadAdminTab(currentAdminTab);
      showToast('تم الإضافة!', 'success');
    }
  } catch (err) {
    console.error(err);
    showToast('خطأ في الرفع: ' + err.message, 'error');
  }
}

async function deleteItem(index, type) {
  if (!confirm('هل أنت متأكد من الحذف؟')) return;

  repoContent[type].splice(index, 1);
  await saveContentJson();
  loadAdminTab(type);
  showToast('تم الحذف', 'success');
}

async function saveContentJson() {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(repoContent, null, 2))));

  // Get current SHA
  let sha = null;
  try {
    const data = await githubApi('/contents/content.json');
    sha = data.sha;
  } catch (e) {}

  const body = {
    message: 'Update content.json via admin panel',
    content: content,
    branch: BRANCH
  };
  if (sha) body.sha = sha;

  await githubApi('/contents/content.json', 'PUT', body);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
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
