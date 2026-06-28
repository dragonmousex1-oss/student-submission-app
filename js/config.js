const CONFIG = {
  GOOGLE_SCRIPT_URL: '',
  USE_GOOGLE_SHEETS: false,
  SCHOOL_NAME: 'โรงเรียนสันติวิทยา',
  PROVINCE: 'กระบี่',
  TEACHER_NAME: 'ครูธีรพงษ์ เขาทอง',
  SUBJECT: 'เทคโนโลยี'
};
if (CONFIG.GOOGLE_SCRIPT_URL && CONFIG.GOOGLE_SCRIPT_URL.length > 10) {
  CONFIG.USE_GOOGLE_SHEETS = true;
}
