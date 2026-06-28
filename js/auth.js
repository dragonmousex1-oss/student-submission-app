const TEACHER_CREDENTIALS = {
  username: 'teacher',
  password: 'santiwittaya2567',
  name: 'ครูธีรพงษ์ เขาทอง',
  subject: 'เทคโนโลยี',
  school: 'โรงเรียนสันติวิทยา',
  province: 'กระบี่'
};

function switchLoginTab(role) {
  document.querySelectorAll('.login-tab').forEach(tab => tab.classList.remove('active'));
  event.target.closest('.login-tab').classList.add('active');
  if (role === 'student') {
    document.getElementById('student-login-form').style.display = 'block';
    document.getElementById('teacher-login-form').style.display = 'none';
  } else {
    document.getElementById('student-login-form').style.display = 'none';
    document.getElementById('teacher-login-form').style.display = 'block';
  }
}

function loginStudent(e) {
  e.preventDefault();
  const name = document.getElementById('login-student-name').value.trim();
  const number = document.getElementById('login-student-number').value.trim();
  const level = document.getElementById('login-student-level').value;
  const room = document.getElementById('login-student-room').value.trim();
  if (!name || !number || !level || !room) { showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error'); return; }
  const session = { role: 'student', name, number, level, room, loggedInAt: new Date().toISOString() };
  sessionStorage.setItem('ss_session', JSON.stringify(session));
  showToast('เข้าสู่ระบบสำเร็จ!');
  setTimeout(() => { window.location.href = 'student.html'; }, 500);
}

function loginTeacher(e) {
  e.preventDefault();
  const username = document.getElementById('login-teacher-username').value.trim();
  const password = document.getElementById('login-teacher-password').value;
  if (username === TEACHER_CREDENTIALS.username && password === TEACHER_CREDENTIALS.password) {
    const session = { role: 'teacher', name: TEACHER_CREDENTIALS.name, subject: TEACHER_CREDENTIALS.subject, school: TEACHER_CREDENTIALS.school, province: TEACHER_CREDENTIALS.province, loggedInAt: new Date().toISOString() };
    sessionStorage.setItem('ss_session', JSON.stringify(session));
    showToast('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ' + TEACHER_CREDENTIALS.name);
    setTimeout(() => { window.location.href = 'teacher.html'; }, 500);
  } else {
    showToast('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
  }
}

function getSession() {
  const data = sessionStorage.getItem('ss_session');
  return data ? JSON.parse(data) : null;
}

function requireAuth(requiredRole) {
  const session = getSession();
  if (!session || (requiredRole && session.role !== requiredRole)) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

function logout() {
  sessionStorage.removeItem('ss_session');
  window.location.href = 'login.html';
}
