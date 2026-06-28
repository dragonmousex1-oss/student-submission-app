const STORAGE_KEYS = { ASSIGNMENTS: 'ss_assignments', SUBMISSIONS: 'ss_submissions' };

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }

// ===== Google Sheets API =====
function isGoogleMode() {
  return typeof CONFIG !== 'undefined' && CONFIG.USE_GOOGLE_SHEETS && CONFIG.GOOGLE_SCRIPT_URL;
}

// Google Apps Script ONLY works with GET requests from cross-origin websites
// Data is sent as URL parameter (encoded JSON)
async function callGoogleAPI(action, data = null) {
  if (!isGoogleMode()) return null;
  try {
    var url = CONFIG.GOOGLE_SCRIPT_URL + '?action=' + encodeURIComponent(action);
    if (data) {
      url += '&data=' + encodeURIComponent(JSON.stringify(data));
    }
    
    const response = await fetch(url);
    const text = await response.text();
    
    try {
      return JSON.parse(text);
    } catch(e) {
      console.log('Response:', text);
      return null;
    }
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

// ===== Unified Data Functions =====
function getAssignments() { return getAssignmentsLocal(); }
function saveAssignments(a) { saveAssignmentsLocal(a); }
function getSubmissions() { return getSubmissionsLocal(); }
function saveSubmissions(s) { saveSubmissionsLocal(s); }

// ===== Sync Functions =====
async function syncCreateAssignment(assignment) {
  const assignments = getAssignmentsLocal();
  assignments.unshift(assignment);
  saveAssignmentsLocal(assignments);
  if (isGoogleMode()) {
    await callGoogleAPI('createAssignment', assignment);
  }
}

async function syncDeleteAssignment(id) {
  let assignments = getAssignmentsLocal();
  assignments = assignments.filter(a => a.id !== id);
  saveAssignmentsLocal(assignments);
  let submissions = getSubmissionsLocal();
  submissions = submissions.filter(s => s.assignmentId !== id);
  saveSubmissionsLocal(submissions);
  if (isGoogleMode()) {
    await callGoogleAPI('deleteAssignment', { id: id });
  }
}

async function syncCreateSubmission(submission) {
  const submissions = getSubmissionsLocal();
  submissions.unshift(submission);
  saveSubmissionsLocal(submissions);
  if (isGoogleMode()) {
    var syncData = { ...submission };
    // Don't send large base64 files to Google Sheets
    if (syncData.content && syncData.content.length > 500) {
      syncData.content = '[ไฟล์ขนาดใหญ่ - เก็บในเครื่อง]';
    }
    await callGoogleAPI('createSubmission', syncData);
  }
}

async function syncGradeSubmission(submissionId, score, totalScore, comment) {
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
  if (isGoogleMode()) {
    await callGoogleAPI('gradeSubmission', { id: submissionId, score: score, totalScore: totalScore, comment: comment });
  }
}

// ===== Sync from Google Sheets on page load =====
async function syncFromGoogleSheets() {
  if (!isGoogleMode()) return;
  try {
    var result = await callGoogleAPI('getAssignments');
    if (result && result.success && result.data) {
      var local = getAssignmentsLocal();
      var localIds = new Set(local.map(a => a.id));
      result.data.forEach(a => { if (!localIds.has(a.id)) local.push(a); });
      saveAssignmentsLocal(local);
    }
    var subResult = await callGoogleAPI('getSubmissions');
    if (subResult && subResult.success && subResult.data) {
      var localSub = getSubmissionsLocal();
      var localSubIds = new Set(localSub.map(s => s.id));
      subResult.data.forEach(s => { if (!localSubIds.has(s.id)) localSub.push(s); });
      saveSubmissionsLocal(localSub);
    }
  } catch (e) { console.error('Sync error:', e); }
}

document.addEventListener('DOMContentLoaded', () => {
  if (isGoogleMode()) {
    syncFromGoogleSheets().then(() => {
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
