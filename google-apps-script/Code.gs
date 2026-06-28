/**
 * Google Apps Script - ระบบส่งงานออนไลน์
 * โรงเรียนสันติวิทยา จังหวัดกระบี่
 * ครูธีรพงษ์ เขาทอง
 * 
 * วิธีใช้:
 * 1. สร้าง Google Sheets ใหม่
 * 2. Extensions > Apps Script
 * 3. วาง Code นี้ทั้งหมด
 * 4. Deploy > New Deployment > Web app
 * 5. Execute as: Me, Who has access: Anyone
 * 6. คัดลอก URL ไปใส่ในไฟล์ js/config.js
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var params = {};
    
    // Parse parameters from GET or POST
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    }
    if (e.parameter && e.parameter.action) {
      params.action = e.parameter.action;
    }
    
    var action = params.action || '';
    var result = {};
    
    switch(action) {
      case 'getAssignments':
        result = getAssignments();
        break;
      case 'createAssignment':
        result = createAssignment(params);
        break;
      case 'deleteAssignment':
        result = deleteAssignment(params.id);
        break;
      case 'getSubmissions':
        result = getSubmissions();
        break;
      case 'createSubmission':
        result = createSubmission(params);
        break;
      case 'gradeSubmission':
        result = gradeSubmission(params);
        break;
      case 'init':
        result = initSheets();
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== Initialize Sheets =====
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var assignSheet = ss.getSheetByName('Assignments');
  if (!assignSheet) {
    assignSheet = ss.insertSheet('Assignments');
    assignSheet.appendRow(['id', 'title', 'description', 'subject', 'level', 'room', 'deadline', 'createdAt']);
    assignSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#4f46e5').setFontColor('white');
    assignSheet.setFrozenRows(1);
  }
  
  var subSheet = ss.getSheetByName('Submissions');
  if (!subSheet) {
    subSheet = ss.insertSheet('Submissions');
    subSheet.appendRow(['id', 'assignmentId', 'studentName', 'studentNumber', 'level', 'room', 'type', 'content', 'note', 'graded', 'score', 'totalScore', 'comment', 'submittedAt', 'gradedAt']);
    subSheet.getRange(1, 1, 1, 15).setFontWeight('bold').setBackground('#059669').setFontColor('white');
    subSheet.setFrozenRows(1);
  }
  
  return { success: true, message: 'สร้าง Sheets สำเร็จ!' };
}

// ===== Assignments =====
function getAssignments() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Assignments');
  if (!sheet) return { success: true, data: [] };
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: true, data: [] };
  
  var data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  var headers = ['id', 'title', 'description', 'subject', 'level', 'room', 'deadline', 'createdAt'];
  var assignments = [];
  
  for (var i = 0; i < data.length; i++) {
    if (!data[i][0]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j] || '';
    }
    assignments.push(obj);
  }
  
  assignments.reverse();
  return { success: true, data: assignments };
}

function createAssignment(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Assignments');
  if (!sheet) { initSheets(); sheet = ss.getSheetByName('Assignments'); }
  
  var id = params.id || Utilities.getUuid();
  sheet.appendRow([
    id,
    params.title || '',
    params.description || '',
    params.subject || '',
    params.level || '',
    params.room || '',
    params.deadline || '',
    params.createdAt || new Date().toISOString()
  ]);
  
  return { success: true, id: id };
}

function deleteAssignment(id) {
  if (!id) return { success: false, error: 'No ID' };
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Assignments');
  if (!sheet) return { success: false };
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  
  // Delete related submissions
  var subSheet = ss.getSheetByName('Submissions');
  if (subSheet) {
    var subData = subSheet.getDataRange().getValues();
    for (var i = subData.length - 1; i >= 1; i--) {
      if (subData[i][1] === id) {
        subSheet.deleteRow(i + 1);
      }
    }
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
  
  var data = sheet.getRange(2, 1, lastRow - 1, 15).getValues();
  var headers = ['id', 'assignmentId', 'studentName', 'studentNumber', 'level', 'room', 'type', 'content', 'note', 'graded', 'score', 'totalScore', 'comment', 'submittedAt', 'gradedAt'];
  var submissions = [];
  
  for (var i = 0; i < data.length; i++) {
    if (!data[i][0]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
      if (headers[j] === 'graded') {
        obj[headers[j]] = (data[i][j] === true || data[i][j] === 'TRUE' || data[i][j] === 'true');
      }
    }
    submissions.push(obj);
  }
  
  submissions.reverse();
  return { success: true, data: submissions };
}

function createSubmission(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Submissions');
  if (!sheet) { initSheets(); sheet = ss.getSheetByName('Submissions'); }
  
  var id = params.id || Utilities.getUuid();
  sheet.appendRow([
    id,
    params.assignmentId || '',
    params.studentName || '',
    params.studentNumber || '',
    params.level || '',
    params.room || '',
    params.type || '',
    params.content || '',
    params.note || '',
    false,
    '',
    '',
    '',
    params.submittedAt || new Date().toISOString(),
    ''
  ]);
  
  return { success: true, id: id };
}

function gradeSubmission(params) {
  if (!params.id) return { success: false, error: 'No submission ID' };
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Submissions');
  if (!sheet) return { success: false };
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === params.id) {
      var row = i + 1;
      sheet.getRange(row, 10).setValue(true);
      sheet.getRange(row, 11).setValue(params.grade || params.score || '');
      sheet.getRange(row, 12).setValue(params.totalScore || '');
      sheet.getRange(row, 13).setValue(params.feedback || params.comment || '');
      sheet.getRange(row, 15).setValue(new Date().toISOString());
      return { success: true };
    }
  }
  
  return { success: false, error: 'Submission not found' };
}

// ===== Menu =====
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ระบบส่งงาน')
    .addItem('สร้าง Sheets เริ่มต้น', 'initSheets')
    .addToUi();
}
