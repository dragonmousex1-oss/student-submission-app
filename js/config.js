const CONFIG = {
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyudx4zsM4zwByDLOw8lxGOjpZblI0LoR3G-2JdEtLBFG07wWHnyNd85mOdu-BAyBrMcw/exec',
  USE_GOOGLE_SHEETS: false,
  SCHOOL_NAME: 'โรงเรียนสันติวิทยา',
  PROVINCE: 'กระบี่',
  TEACHER_NAME: 'ครูธีรพงษ์ เขาทอง',
  SUBJECT: 'เทคโนโลยี'
};
if (CONFIG.GOOGLE_SCRIPT_URL && CONFIG.GOOGLE_SCRIPT_URL.length > 10) {
  CONFIG.USE_GOOGLE_SHEETS = true;
}
