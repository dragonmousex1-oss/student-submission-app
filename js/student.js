let selectedFile = null;

document.addEventListener('DOMContentLoaded', () => { setupDragDrop(); loadStudentAssignments(); });

function loadStudentAssignments() {
  const session = getSession();
  if (!session) return;
  const container = document.getElementById('student-assignments');
  const emptyState = document.getElementById('student-empty');
  let assignments = getAssignments().filter(a => a.level === session.level && a.room === session.room);
  if (assignments.length === 0) { container.innerHTML = ''; emptyState.style.display = 'block'; return; }
  emptyState.style.display = 'none';
  const submissions = getSubmissions();
  container.innerHTML = assignments.map(a => {
    const existing = submissions.find(s => s.assignmentId === a.id && s.studentName === session.name && s.studentNumber === session.number);
    const statusHtml = existing ? '<span class="grade-badge graded" style="position:absolute;top:1rem;right:1rem;">✓ ส่งแล้ว</span>' : '<span class="grade-badge pending" style="position:absolute;top:1rem;right:1rem;">⏳ ยังไม่ส่ง</span>';
    const buttonHtml = existing ? '<button class="btn btn-sm btn-outline" disabled>ส่งแล้ว</button>' : '<button class="btn btn-sm btn-success" onclick="openSubmissionModal(\'' + a.id + '\')">ส่งงาน</button>';
    let gradeInfo = '';
    if (existing && existing.graded) {
      gradeInfo = '<div style="margin-top:0.75rem;padding:0.75rem;background:#ecfdf5;border-radius:8px;font-size:0.85rem;"><strong style="color:#059669;">✓ คะแนน: ' + existing.score + '/' + existing.totalScore + '</strong>' + (existing.comment ? '<br><em style="color:var(--text-secondary);">💬 ' + existing.comment + '</em>' : '') + '</div>';
    }
    return '<div class="assignment-card" style="position:relative;">' + statusHtml + '<span class="subject-badge">' + a.subject + '</span><h3>' + a.title + '</h3>' + (a.description ? '<p style="color:var(--text-secondary);font-size:0.9rem;margin-top:0.25rem;">' + a.description + '</p>' : '') + '<div class="meta"><span>กำหนดส่ง: ' + formatDate(a.deadline) + '</span></div>' + gradeInfo + '<div class="actions">' + buttonHtml + '</div></div>';
  }).join('');
}

function openSubmissionModal(assignmentId) {
  const assignment = getAssignments().find(a => a.id === assignmentId);
  if (!assignment) return;
  document.getElementById('sub-assignment-title').textContent = assignment.title;
  document.getElementById('sub-assignment-desc').textContent = assignment.description || 'ไม่มีรายละเอียดเพิ่มเติม';
  document.getElementById('sub-assignment-id').value = assignmentId;
  document.getElementById('submission-form').reset();
  selectedFile = null;
  document.getElementById('file-preview').innerHTML = '';
  hideAllInputs();
  document.getElementById('submission-modal').classList.add('active');
}
function closeSubmissionModal() { document.getElementById('submission-modal').classList.remove('active'); selectedFile = null; }

function toggleSubmissionType() {
  const type = document.getElementById('submission-type').value;
  hideAllInputs();
  if (type === 'link') document.getElementById('input-link').style.display = 'block';
  else if (type === 'image' || type === 'pdf' || type === 'video') {
    document.getElementById('input-file').style.display = 'block';
    const fi = document.getElementById('file-input');
    fi.accept = type === 'image' ? 'image/*' : type === 'pdf' ? 'application/pdf' : 'video/*';
  } else if (type === 'text') document.getElementById('input-text').style.display = 'block';
}
function hideAllInputs() { ['input-link','input-file','input-text'].forEach(id => document.getElementById(id).style.display = 'none'); }

function setupDragDrop() {
  const dropArea = document.getElementById('file-drop-area');
  if (!dropArea) return;
  ['dragenter','dragover','dragleave','drop'].forEach(e => dropArea.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); }));
  ['dragenter','dragover'].forEach(e => dropArea.addEventListener(e, () => dropArea.classList.add('dragover')));
  ['dragleave','drop'].forEach(e => dropArea.addEventListener(e, () => dropArea.classList.remove('dragover')));
  dropArea.addEventListener('drop', e => { if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); });
}

function handleFileSelect(event) { if (event.target.files[0]) handleFile(event.target.files[0]); }

function handleFile(file) {
  if (file.size > 10 * 1024 * 1024) { showToast('ไฟล์ใหญ่เกินไป (สูงสุด 10MB)', 'error'); return; }
  selectedFile = file;
  const preview = document.getElementById('file-preview');
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => { preview.innerHTML = '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:#ecfdf5;border-radius:8px;"><img src="' + e.target.result + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px;"><div><p style="font-weight:600;font-size:0.9rem;">' + file.name + '</p><p style="font-size:0.8rem;color:var(--text-secondary);">' + (file.size / 1024).toFixed(1) + ' KB</p></div><button type="button" onclick="removeFile()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:1.2rem;">❌</button></div>'; };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:#ecfdf5;border-radius:8px;"><span style="font-size:2rem;">' + (file.type.includes('pdf') ? '📄' : '🎬') + '</span><div><p style="font-weight:600;font-size:0.9rem;">' + file.name + '</p><p style="font-size:0.8rem;color:var(--text-secondary);">' + (file.size / 1024 / 1024).toFixed(2) + ' MB</p></div><button type="button" onclick="removeFile()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:1.2rem;">❌</button></div>';
  }
}
function removeFile() { selectedFile = null; document.getElementById('file-preview').innerHTML = ''; document.getElementById('file-input').value = ''; }

async function submitWork(e) {
  e.preventDefault();
  const session = getSession();
  if (!session) return;
  const assignmentId = document.getElementById('sub-assignment-id').value;
  const type = document.getElementById('submission-type').value;
  const note = document.getElementById('submission-note').value.trim();
  if (!type) { showToast('กรุณาเลือกประเภทการส่ง', 'error'); return; }
  let content = '';
  switch(type) {
    case 'link': content = document.getElementById('submission-link').value.trim(); if (!content) { showToast('กรุณาใส่ลิงก์', 'error'); return; } break;
    case 'text': content = document.getElementById('submission-text').value.trim(); if (!content) { showToast('กรุณาพิมพ์คำตอบ', 'error'); return; } break;
    default: if (!selectedFile) { showToast('กรุณาเลือกไฟล์', 'error'); return; }
      try { content = await fileToBase64(selectedFile); } catch(err) { showToast('เกิดข้อผิดพลาด', 'error'); return; }
  }
  const submission = { id: generateId(), assignmentId, studentName: session.name, studentNumber: session.number, level: session.level, room: session.room, type, content, note, graded: false, score: null, totalScore: null, comment: '', submittedAt: new Date().toISOString() };
  syncCreateSubmission(submission);
  closeSubmissionModal(); loadStudentAssignments(); showToast('ส่งงานสำเร็จ! 🎉');
}
