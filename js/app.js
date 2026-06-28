const STORAGE_KEYS = { ASSIGNMENTS: 'ss_assignments', SUBMISSIONS: 'ss_submissions' };

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }

function getAssignments() { const d = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS); return d ? JSON.parse(d) : []; }
function saveAssignments(a) { localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(a)); }
function getSubmissions() { const d = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS); return d ? JSON.parse(d) : []; }
function saveSubmissions(s) { localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(s)); }

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

function formatDate(dateString) {
  if (!dateString) return 'ไม่กำหนด';
  return new Date(dateString).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getFileTypeIcon(type) {
  switch(type) { case 'image': return '🖼️'; case 'pdf': return '📄'; case 'video': return '🎬'; case 'link': return '🔗'; case 'text': return '📝'; default: return '📎'; }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
