let currentTab = 'assignments';

document.addEventListener('DOMContentLoaded', () => { updateStats(); renderAssignments(); populateFilters(); });

function updateStats() {
  const assignments = getAssignments();
  const submissions = getSubmissions();
  document.getElementById('stat-total-assignments').textContent = assignments.length;
  document.getElementById('stat-total-submissions').textContent = submissions.length;
  document.getElementById('stat-pending').textContent = submissions.filter(s => !s.graded).length;
  document.getElementById('stat-graded').textContent = submissions.filter(s => s.graded).length;
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('tab-assignments').style.display = tab === 'assignments' ? 'block' : 'none';
  document.getElementById('tab-submissions').style.display = tab === 'submissions' ? 'block' : 'none';
  if (tab === 'submissions') { renderSubmissions(); populateSubmissionFilters(); }
}

function openCreateModal() { document.getElementById('create-modal').classList.add('active'); document.getElementById('assignment-form').reset(); document.getElementById('assignment-subject').value = 'เทคโนโลยี'; }
function closeCreateModal() { document.getElementById('create-modal').classList.remove('active'); }

function createAssignment(e) {
  e.preventDefault();
  const assignment = {
    id: generateId(),
    title: document.getElementById('assignment-title').value.trim(),
    description: document.getElementById('assignment-desc').value.trim(),
    subject: document.getElementById('assignment-subject').value.trim(),
    level: document.getElementById('assignment-level').value,
    room: document.getElementById('assignment-room').value.trim(),
    deadline: document.getElementById('assignment-deadline').value,
    createdAt: new Date().toISOString()
  };
  const assignments = getAssignments();
  assignments.unshift(assignment);
  saveAssignments(assignments);
  closeCreateModal(); renderAssignments(); updateStats(); populateFilters();
  showToast('สร้างงานสำเร็จ!');
}

function renderAssignments(filteredData = null) {
  const assignments = filteredData || getAssignments();
  const submissions = getSubmissions();
  const container = document.getElementById('assignments-list');
  const emptyState = document.getElementById('empty-assignments');
  if (assignments.length === 0) { container.innerHTML = ''; emptyState.style.display = 'block'; return; }
  emptyState.style.display = 'none';
  container.innerHTML = assignments.map(a => {
    const subCount = submissions.filter(s => s.assignmentId === a.id).length;
    return '<div class="assignment-card"><span class="submission-count"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg> ' + subCount + ' ผลงาน</span><span class="subject-badge">' + a.subject + '</span><h3>' + a.title + '</h3>' + (a.description ? '<p style="color:var(--text-secondary);font-size:0.9rem;margin-top:0.25rem;">' + a.description.substring(0, 80) + (a.description.length > 80 ? '...' : '') + '</p>' : '') + '<div class="meta"><span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 14l9-5-9-5-9 5 9 5z"/></svg> ' + a.level + '</span><span>ห้อง ' + a.room + '</span><span>กำหนดส่ง: ' + formatDate(a.deadline) + '</span></div><div class="actions"><button class="btn btn-sm btn-primary" onclick="viewSubmissions(\'' + a.id + '\')">ดูผลงาน</button><button class="btn btn-sm btn-danger" onclick="deleteAssignment(\'' + a.id + '\')">ลบ</button></div></div>';
  }).join('');
}

function deleteAssignment(id) {
  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?')) return;
  let assignments = getAssignments(); assignments = assignments.filter(a => a.id !== id); saveAssignments(assignments);
  let submissions = getSubmissions(); submissions = submissions.filter(s => s.assignmentId !== id); saveSubmissions(submissions);
  renderAssignments(); updateStats(); populateFilters(); showToast('ลบงานสำเร็จ');
}

function viewSubmissions(assignmentId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-btn')[1].classList.add('active');
  document.getElementById('tab-assignments').style.display = 'none';
  document.getElementById('tab-submissions').style.display = 'block';
  populateSubmissionFilters();
  document.getElementById('sub-filter-assignment').value = assignmentId;
  renderSubmissions(assignmentId);
}

function renderSubmissions(filterAssignmentId = null, filterStatus = null) {
  let submissions = getSubmissions();
  const assignments = getAssignments();
  const container = document.getElementById('submissions-list');
  const emptyState = document.getElementById('empty-submissions');
  if (filterAssignmentId) submissions = submissions.filter(s => s.assignmentId === filterAssignmentId);
  if (filterStatus === 'pending') submissions = submissions.filter(s => !s.graded);
  else if (filterStatus === 'graded') submissions = submissions.filter(s => s.graded);
  if (submissions.length === 0) { container.innerHTML = ''; emptyState.style.display = 'block'; return; }
  emptyState.style.display = 'none';
  container.innerHTML = submissions.map(s => {
    const assignment = assignments.find(a => a.id === s.assignmentId);
    const assignmentTitle = assignment ? assignment.title : 'งานที่ถูกลบ';
    let contentHtml = '';
    switch(s.type) {
      case 'link': contentHtml = '<div class="file-preview"><a href="' + s.content + '" target="_blank">🔗 ' + s.content + '</a></div>'; break;
      case 'image': contentHtml = '<div class="file-preview"><img src="' + s.content + '" alt="ผลงาน" style="max-width:100%;max-height:200px;border-radius:8px;"></div>'; break;
      case 'pdf': contentHtml = '<div class="file-preview"><a href="' + s.content + '" target="_blank">📄 ดูไฟล์ PDF</a></div>'; break;
      case 'video': contentHtml = '<div class="file-preview"><video controls src="' + s.content + '" style="max-width:100%;max-height:200px;border-radius:8px;"></video></div>'; break;
      case 'text': contentHtml = '<div style="padding:0.5rem;background:white;border-radius:6px;white-space:pre-wrap;">' + s.content + '</div>'; break;
    }
    const gradeHtml = s.graded 
      ? '<span class="grade-badge graded">✓ ' + s.score + '/' + s.totalScore + ' คะแนน</span>' + (s.comment ? '<p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.5rem;"><strong>ความคิดเห็น:</strong> ' + s.comment + '</p>' : '')
      : '<span class="grade-badge pending">⏳ รอตรวจ</span>';
    return '<div class="submission-item"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;"><div><div class="student-name">' + s.studentName + '</div><div class="student-id">เลขที่ ' + s.studentNumber + ' | ' + s.level + ' ห้อง ' + s.room + '</div></div>' + gradeHtml + '</div><div style="margin-top:0.5rem;font-size:0.85rem;color:var(--primary);font-weight:500;">📋 ' + assignmentTitle + '</div><div class="submission-content"><div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.5rem;">' + getFileTypeIcon(s.type) + ' ประเภท: ' + (s.type === 'link' ? 'ลิงก์' : s.type === 'image' ? 'รูปภาพ' : s.type === 'pdf' ? 'PDF' : s.type === 'video' ? 'วิดีโอ' : 'ข้อความ') + '</div>' + contentHtml + (s.note ? '<p style="font-size:0.85rem;margin-top:0.5rem;color:var(--text-secondary);"><em>💬 ' + s.note + '</em></p>' : '') + '</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.75rem;flex-wrap:wrap;gap:0.5rem;"><span class="submission-time">🕐 ส่งเมื่อ: ' + formatDateTime(s.submittedAt) + '</span>' + (!s.graded ? '<button class="btn btn-sm btn-success" onclick="openGradeModal(\'' + s.id + '\')">✏️ ให้คะแนน</button>' : '') + '</div></div>';
  }).join('');
}

function filterAssignments() {
  const level = document.getElementById('filter-level').value;
  const subject = document.getElementById('filter-subject').value;
  const room = document.getElementById('filter-room').value;
  let assignments = getAssignments();
  if (level) assignments = assignments.filter(a => a.level === level);
  if (subject) assignments = assignments.filter(a => a.subject === subject);
  if (room) assignments = assignments.filter(a => a.room === room);
  renderAssignments(assignments);
}

function filterSubmissions() {
  const assignmentId = document.getElementById('sub-filter-assignment').value;
  const status = document.getElementById('sub-filter-status').value;
  renderSubmissions(assignmentId || null, status || null);
}

function populateFilters() {
  const assignments = getAssignments();
  const subjects = [...new Set(assignments.map(a => a.subject))];
  document.getElementById('filter-subject').innerHTML = '<option value="">ทุกวิชา</option>' + subjects.map(s => '<option value="' + s + '">' + s + '</option>').join('');
  const rooms = [...new Set(assignments.map(a => a.room))];
  document.getElementById('filter-room').innerHTML = '<option value="">ทุกห้อง</option>' + rooms.map(r => '<option value="' + r + '">ห้อง ' + r + '</option>').join('');
}

function populateSubmissionFilters() {
  const assignments = getAssignments();
  document.getElementById('sub-filter-assignment').innerHTML = '<option value="">ทุกงาน</option>' + assignments.map(a => '<option value="' + a.id + '">' + a.title + ' (' + a.level + '/' + a.room + ')</option>').join('');
}

function openGradeModal(submissionId) { document.getElementById('grade-modal').classList.add('active'); document.getElementById('grade-form').reset(); document.getElementById('grade-submission-id').value = submissionId; }
function closeGradeModal() { document.getElementById('grade-modal').classList.remove('active'); }

function submitGrade(e) {
  e.preventDefault();
  const submissionId = document.getElementById('grade-submission-id').value;
  const score = document.getElementById('grade-score').value;
  const totalScore = document.getElementById('grade-total').value;
  const comment = document.getElementById('grade-comment').value.trim();
  let submissions = getSubmissions();
  const index = submissions.findIndex(s => s.id === submissionId);
  if (index !== -1) {
    submissions[index].graded = true; submissions[index].score = score;
    submissions[index].totalScore = totalScore; submissions[index].comment = comment;
    submissions[index].gradedAt = new Date().toISOString();
    saveSubmissions(submissions);
  }
  closeGradeModal(); filterSubmissions(); updateStats(); showToast('ให้คะแนนสำเร็จ!');
}
