const STORAGE_KEYS = { ASSIGNMENTS: 'ss_assignments', SUBMISSIONS: 'ss_submissions' };

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }

// ===== Google Sheets API =====
function isGoogleMode() {
  return typeof CONFIG !== 'undefined' && CONFIG.USE_GOOGLE_SHEETS && CONFIG.GOOGLE_SCRIPT_URL;
}

async function callGoogleAPI(action, data = null) {
  if (!isGoogleMode()) return null;
  try {
    let url = CONFIG.GOOGLE_SCRIPT_URL;
    let options = {};
    if (data) {
      // POST request
      options = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: action, ...data })
      };
    } else {
      // GET request
      url += '?action=' + action;
      options = { method: 'GET' };
    }
    const response = await fetch(url, { ...options, redirect: 'follow' });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Google Sheets Error:', error);
    showToast('เชื่อมต่อ Google Sheets ไม่ได้ ใช้ข้อมูลในเครื่องแทน', 'error');
    return null;
  }
}

// ===== Local Storage Functions =====
function getAssignmentsLocal() { const d = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS); return d ? JSON.parse(d) : []; }
function saveAssignmentsLocal(a) { localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(a)); }
function getSubmissionsLocal() { const d = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS); return d ? JSON.parse(d) : []; }
function saveSubmissionsLocal(s) { localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(s)); }

// ===== Unified Data Functions (used by teacher.js & student.js) =====
// These always return data synchronously from localStorage
// But also sync with Google Sheets in background when configured

function getAssignments() { return getAssignmentsLocal(); }
function saveAssignments(a) { saveAssignmentsLocal(a); }
function getSubmissions() { return getSubmissionsLocal(); }
function saveSubmissions(s) { saveSubmissionsLocal(s); }

// ===== Sync Functions (call Google Sheets AND update localStorage) =====

async function syncCreateAssignment(assignment) {
  // Always save locally first (instant)
  const assignments = getAssignmentsLocal();
  assignments.unshift(assignment);
  saveAssignmentsLocal(assignments);

  // Then sync to Google Sheets if configured
  if (isGoogleMode()) {
    const result = await callGoogleAPI('createAssignment', assignment);
    if (result && result.success) {
      console.log('✅ Synced to Google Sheets:', result);
    }
  }
}

async function syncDeleteAssignment(id) {
  // Delete locally
  let assignments = getAssignmentsLocal();
  assignments = assignments.filter(a => a.id !== id);
  saveAssignmentsLocal(assignments);
  let submissions = getSubmissionsLocal();
  submissions = submissions.filter(s => s.assignmentId !== id);
  saveSubmissionsLocal(submissions);

  // Sync to Google Sheets
  if (isGoogleMode()) {
    await callGoogleAPI('deleteAssignment', { id: id });
  }
}

async function syncCreateSubmission(submission) {
  // Save locally first
  const submissions = getSubmissionsLocal();
  submissions.unshift(submission);
  saveSubmissionsLocal(submissions);

  // Sync to Google Sheets
  if (isGoogleMode()) {
    // Don't send base64 file content to Google Sheets (too large)
    const syncData = { ...submission };
    if (syncData.type === 'image' || syncData.type === 'pdf' || syncData.type === 'video') {
      if (syncData.content && syncData.content.startsWith('data:')) {
        syncData.content = '[ไฟล์อัพโหลด - เก็บในเครื่อง]';
      }
    }
    const result = await callGoogleAPI('createSubmission', syncData);
    if (result && result.success) {
      console.log('✅ Submission synced to Google Sheets');
    }
  }
}

async function syncGradeSubmission(submissionId, score, totalScore, comment) {
  // Grade locally
  let submissions = getSubmissionsLocal();
  const index = submissions.findIndex(s => s.id === submissionId);
  if (index !== -1) {
    submissions[index].graded = true;
    submissions[index].score = score;
    submissions[index].totalScore = totalScore;
    submissions[index].comment = comment;
    submissions[index].gradedAt = new Date().toISOString();
    saveSubmissionsLocal(submissions);
  }

  // Sync to Google Sheets
  if (isGoogleMode()) {
    await callGoogleAPI('gradeSubmission', {
      id: submissionId,
      grade: score + '/' + totalScore,
      feedback: comment
    });
  }
}

// ===== Load data from Google Sheets on page load =====
async function syncFromGoogleSheets() {
  if (!isGoogleMode()) return;

  try {
    // Load assignments
    const assignResult = await callGoogleAPI('getAssignments');
    if (assignResult && assignResult.success && assignResult.data) {
      // Merge: keep local data + add Google data that's not local
      const localAssignments = getAssignmentsLocal();
      const localIds = new Set(localAssignments.map(a => a.id));
      const merged = [...localAssignments];
      assignResult.data.forEach(a => {
        if (!localIds.has(a.id)) merged.push(a);
      });
      saveAssignmentsLocal(merged);
    }

    // Load submissions
    const subResult = await callGoogleAPI('getSubmissions');
    if (subResult && subResult.success && subResult.data) {
      const localSubmissions = getSubmissionsLocal();
      const localIds = new Set(localSubmissions.map(s => s.id));
      const merged = [...localSubmissions];
      subResult.data.forEach(s => {
        if (!localIds.has(s.id)) merged.push(s);
      });
      saveSubmissionsLocal(merged);
    }

    console.log('✅ Synced from Google Sheets');
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Auto-sync on page load
document.addEventListener('DOMContentLoaded', () => {
  if (isGoogleMode()) {
    syncFromGoogleSheets().then(() => {
      // Refresh UI after sync (if functions exist)
      if (typeof updateStats === 'function') updateStats();
      if (typeof renderAssignments === 'function') renderAssignments();
      if (typeof loadStudentAssignments === 'function') loadStudentAssignments();
    });
  }
});

// ===== UI Utilities =====
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
