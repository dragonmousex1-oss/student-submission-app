/**
 * ระบบส่งงานออนไลน์ - Google Apps Script
 * โรงเรียนสันติวิทยา จังหวัดกระบี่
 * ครูธีรพงษ์ เขาทอง
 *
 * วิธีติดตั้ง:
 * 1. สร้าง Google Sheets > Extensions > Apps Script
 * 2. วางโค้ดนี้ > Save > Deploy > New deployment > Web app
 * 3. Execute as: Me / Who has access: Anyone
 * 4. คัดลอก URL ไปใส่ js/config.js
 */

function doGet(e) {
  var action = e.parameter.action || '';
  var dataStr = e.parameter.data || '{}';
  var params = {};
  
  try {
    params = JSON.parse(dataStr);
  } catch(err) {
    params = {};
  }
  
  var result = route(action, params);
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var action = '';
  var params = {};
  
  if (e.parameter && e.parameter.action) {
    action = e.parameter.action;
  }
  if (e.parameter && e.parameter.data) {
    try { params = JSON.parse(e.parameter.data); } catch(err) {}
  }
  if (e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      if (body.action) action = body.action;
      params = body;
    } catch(err) {}
  }
  
  var result = route(action, params);
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function route(action, params) {
  try {
    switch(action) {
      case 'init': return initSheets();
      case 'getAssignments': return getAssignments();
      case 'createAssignment': return createAssignment(params);
      case 'deleteAssignment': return deleteAssignment(params.id);
      case 'getSubmissions': return getSubmissions();
      case 'createSubmission': return createSubmission(params);
      case 'gradeSubmission': return gradeSubmission(params);
      default: return { success: false, error: 'Unknown action: ' + action };
    }
  } catch(error) {
    return { success: false, error: error.message };
  }
}

// ===== Initialize =====
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName('Assignments')) {
    var s = ss.insertSheet('Assignments');
    s.appendRow(['id','title','description','subject','level','room','deadline','createdAt']);
    s.getRange(1,1,1,8).setFontWeight('bold');
    s.setFrozenRows(1);
  }
  if (!ss.getSheetByName('Submissions')) {
    var s = ss.insertSheet('Submissions');
    s.appendRow(['id','assignmentId','studentName','studentNumber','level','room','type','content','note','graded','score','totalScore','comment','submittedAt','gradedAt']);
    s.getRange(1,1,1,15).setFontWeight('bold');
    s.setFrozenRows(1);
  }
  return { success: true, message: 'Sheets created!' };
}

// ===== Assignments =====
function getAssignments() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Assignments');
  if (!sheet) return { success: true, data: [] };
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: true, data: [] };
  
  var data = sheet.getRange(2,1,lastRow-1,8).getValues();
  var headers = ['id','title','description','subject','level','room','deadline','createdAt'];
  var result = [];
  for (var i = 0; i < data.length; i++) {
    if (!data[i][0]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = data[i][j] || '';
    result.push(obj);
  }
  result.reverse();
  return { success: true, data: result };
}

function createAssignment(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Assignments');
  if (!sheet) { initSheets(); sheet = ss.getSheetByName('Assignments'); }
  
  var id = p.id || Utilities.getUuid();
  sheet.appendRow([id, p.title||'', p.description||'', p.subject||'', p.level||'', p.room||'', p.deadline||'', p.createdAt||new Date().toISOString()]);
  return { success: true, id: id };
}

function deleteAssignment(id) {
  if (!id) return { success: false };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Assignments');
  if (!sheet) return { success: false };
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) { sheet.deleteRow(i+1); break; }
  }
  return { success: true };
}

// ===== Submissions =====
function getSubmissions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Submissions');
  if (!sheet) return { success: true, data: [] };
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: true, data: [] };
  
  var data = sheet.getRange(2,1,lastRow-1,15).getValues();
  var headers = ['id','assignmentId','studentName','studentNumber','level','room','type','content','note','graded','score','totalScore','comment','submittedAt','gradedAt'];
  var result = [];
  for (var i = 0; i < data.length; i++) {
    if (!data[i][0]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
      if (headers[j] === 'graded') obj[headers[j]] = (data[i][j] === true || data[i][j] === 'TRUE');
    }
    result.push(obj);
  }
  result.reverse();
  return { success: true, data: result };
}

function createSubmission(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Submissions');
  if (!sheet) { initSheets(); sheet = ss.getSheetByName('Submissions'); }
  
  var id = p.id || Utilities.getUuid();
  sheet.appendRow([id, p.assignmentId||'', p.studentName||'', p.studentNumber||'', p.level||'', p.room||'', p.type||'', p.content||'', p.note||'', false, '', '', '', p.submittedAt||new Date().toISOString(), '']);
  return { success: true, id: id };
}

function gradeSubmission(p) {
  if (!p.id) return { success: false };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Submissions');
  if (!sheet) return { success: false };
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == p.id) {
      var row = i + 1;
      sheet.getRange(row,10).setValue(true);
      sheet.getRange(row,11).setValue(p.score||'');
      sheet.getRange(row,12).setValue(p.totalScore||'');
      sheet.getRange(row,13).setValue(p.comment||'');
      sheet.getRange(row,15).setValue(new Date().toISOString());
      return { success: true };
    }
  }
  return { success: false, error: 'Not found' };
}

// ===== Menu =====
function onOpen() {
  SpreadsheetApp.getUi().createMenu('ระบบส่งงาน').addItem('สร้าง Sheets', 'initSheets').addToUi();
}
