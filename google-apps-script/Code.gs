/**
 * Google Apps Script - Student Submission System Backend
 * ระบบส่งงานนักเรียน (Thai Student Submission System)
 * Uses Google Sheets as database storage
 */

// ===== Configuration =====
const CONFIG = {
  ASSIGNMENTS_SHEET: 'Assignments',
  SUBMISSIONS_SHEET: 'Submissions'
};

const ASSIGNMENT_HEADERS = [
  'id', 'title', 'subject', 'description', 'dueDate', 'maxScore', 'createdAt', 'updatedAt'
];

const SUBMISSION_HEADERS = [
  'id', 'assignmentId', 'studentName', 'studentId', 'fileName', 'fileUrl',
  'submittedAt', 'grade', 'feedback', 'gradedAt', 'status'
];

// ===== Initialization =====

/**
 * Initialize sheets with headers if they don't exist
 */
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create Assignments sheet
  let assignmentsSheet = ss.getSheetByName(CONFIG.ASSIGNMENTS_SHEET);
  if (!assignmentsSheet) {
    assignmentsSheet = ss.insertSheet(CONFIG.ASSIGNMENTS_SHEET);
    assignmentsSheet.getRange(1, 1, 1, ASSIGNMENT_HEADERS.length).setValues([ASSIGNMENT_HEADERS]);
    assignmentsSheet.getRange(1, 1, 1, ASSIGNMENT_HEADERS.length).setFontWeight('bold');
    assignmentsSheet.setFrozenRows(1);
  }

  // Create Submissions sheet
  let submissionsSheet = ss.getSheetByName(CONFIG.SUBMISSIONS_SHEET);
  if (!submissionsSheet) {
    submissionsSheet = ss.insertSheet(CONFIG.SUBMISSIONS_SHEET);
    submissionsSheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length).setValues([SUBMISSION_HEADERS]);
    submissionsSheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length).setFontWeight('bold');
    submissionsSheet.setFrozenRows(1);
  }

  return { success: true, message: 'Sheets initialized successfully' };
}


// ===== Web App Handlers =====

/**
 * Handle GET requests
 */
function doGet(e) {
  const params = e.parameter;
  const action = params.action || '';
  const result = handleRequest(action, params);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests
 */
function doPost(e) {
  let params = {};
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    params = e.parameter || {};
  }
  const action = params.action || '';
  const result = handleRequest(action, params);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Route requests to appropriate handler functions
 */
function handleRequest(action, params) {
  try {
    switch (action) {
      case 'init':
        return initSheets();

      case 'getAssignments':
        return getAssignments();

      case 'createAssignment':
        return createAssignment(params);

      case 'deleteAssignment':
        return deleteAssignment(params.id);

      case 'getSubmissions':
        return getSubmissions(params.assignmentId);

      case 'createSubmission':
        return createSubmission(params);

      case 'gradeSubmission':
        return gradeSubmission(params);

      default:
        return { success: false, error: 'Unknown action: ' + action };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// ===== Assignment CRUD Functions =====

/**
 * Get all assignments
 */
function getAssignments() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ASSIGNMENTS_SHEET);
  if (!sheet) {
    return { success: false, error: 'Assignments sheet not found. Please initialize first.' };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true, data: [] };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, ASSIGNMENT_HEADERS.length).getValues();
  const assignments = data.map(function(row) {
    const obj = {};
    ASSIGNMENT_HEADERS.forEach(function(header, index) {
      obj[header] = row[index];
    });
    return obj;
  });

  // Sort by createdAt descending (newest first)
  assignments.sort(function(a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return { success: true, data: assignments };
}

/**
 * Create a new assignment
 */
function createAssignment(params) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ASSIGNMENTS_SHEET);
  if (!sheet) {
    initSheets();
  }

  const assignmentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ASSIGNMENTS_SHEET);

  const id = Utilities.getUuid();
  const now = new Date().toISOString();

  const newRow = [
    id,
    params.title || '',
    params.subject || '',
    params.description || '',
    params.dueDate || '',
    params.maxScore || 100,
    now,
    now
  ];

  assignmentSheet.appendRow(newRow);

  const assignment = {};
  ASSIGNMENT_HEADERS.forEach(function(header, index) {
    assignment[header] = newRow[index];
  });

  return { success: true, data: assignment, message: 'Assignment created successfully' };
}

/**
 * Delete an assignment by ID
 */
function deleteAssignment(id) {
  if (!id) {
    return { success: false, error: 'Assignment ID is required' };
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ASSIGNMENTS_SHEET);
  if (!sheet) {
    return { success: false, error: 'Assignments sheet not found' };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: false, error: 'Assignment not found' };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 2); // +2 because array is 0-indexed and row 1 is headers

      // Also delete related submissions
      deleteSubmissionsByAssignment(id);

      return { success: true, message: 'Assignment deleted successfully' };
    }
  }

  return { success: false, error: 'Assignment not found' };
}

/**
 * Delete all submissions for a given assignment
 */
function deleteSubmissionsByAssignment(assignmentId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SUBMISSIONS_SHEET);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  // Get assignmentId column (index 1)
  const data = sheet.getRange(2, 2, lastRow - 1, 1).getValues();

  // Delete from bottom to top to preserve row indices
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === assignmentId) {
      sheet.deleteRow(i + 2);
    }
  }
}


// ===== Submission CRUD Functions =====

/**
 * Get submissions, optionally filtered by assignmentId
 */
function getSubmissions(assignmentId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SUBMISSIONS_SHEET);
  if (!sheet) {
    return { success: false, error: 'Submissions sheet not found. Please initialize first.' };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true, data: [] };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, SUBMISSION_HEADERS.length).getValues();
  var submissions = data.map(function(row) {
    const obj = {};
    SUBMISSION_HEADERS.forEach(function(header, index) {
      obj[header] = row[index];
    });
    return obj;
  });

  // Filter by assignmentId if provided
  if (assignmentId) {
    submissions = submissions.filter(function(sub) {
      return sub.assignmentId === assignmentId;
    });
  }

  // Sort by submittedAt descending
  submissions.sort(function(a, b) {
    return new Date(b.submittedAt) - new Date(a.submittedAt);
  });

  return { success: true, data: submissions };
}

/**
 * Create a new submission
 */
function createSubmission(params) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SUBMISSIONS_SHEET);
  if (!sheet) {
    initSheets();
  }

  const submissionsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SUBMISSIONS_SHEET);

  if (!params.assignmentId) {
    return { success: false, error: 'Assignment ID is required' };
  }

  if (!params.studentName) {
    return { success: false, error: 'Student name is required' };
  }

  const id = Utilities.getUuid();
  const now = new Date().toISOString();

  const newRow = [
    id,
    params.assignmentId,
    params.studentName || '',
    params.studentId || '',
    params.fileName || '',
    params.fileUrl || '',
    now,
    '',       // grade (empty initially)
    '',       // feedback (empty initially)
    '',       // gradedAt (empty initially)
    'submitted'  // status
  ];

  submissionsSheet.appendRow(newRow);

  const submission = {};
  SUBMISSION_HEADERS.forEach(function(header, index) {
    submission[header] = newRow[index];
  });

  return { success: true, data: submission, message: 'Submission created successfully' };
}

/**
 * Grade a submission
 */
function gradeSubmission(params) {
  if (!params.id) {
    return { success: false, error: 'Submission ID is required' };
  }

  if (params.grade === undefined || params.grade === null || params.grade === '') {
    return { success: false, error: 'Grade is required' };
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SUBMISSIONS_SHEET);
  if (!sheet) {
    return { success: false, error: 'Submissions sheet not found' };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: false, error: 'Submission not found' };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, SUBMISSION_HEADERS.length).getValues();

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === params.id) {
      const rowIndex = i + 2; // +2 for 0-index + header row
      const now = new Date().toISOString();

      // Update grade (column 8), feedback (column 9), gradedAt (column 10), status (column 11)
      sheet.getRange(rowIndex, 8).setValue(params.grade);
      sheet.getRange(rowIndex, 9).setValue(params.feedback || '');
      sheet.getRange(rowIndex, 10).setValue(now);
      sheet.getRange(rowIndex, 11).setValue('graded');

      return {
        success: true,
        message: 'Submission graded successfully',
        data: {
          id: params.id,
          grade: params.grade,
          feedback: params.feedback || '',
          gradedAt: now,
          status: 'graded'
        }
      };
    }
  }

  return { success: false, error: 'Submission not found' };
}


// ===== Menu =====

/**
 * Add custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📚 Student Submissions')
    .addItem('Initialize Sheets', 'initSheets')
    .addSeparator()
    .addItem('View All Assignments', 'showAssignmentsSummary')
    .addItem('View All Submissions', 'showSubmissionsSummary')
    .addToUi();
}

/**
 * Show assignments summary in a dialog
 */
function showAssignmentsSummary() {
  const result = getAssignments();
  const count = result.data ? result.data.length : 0;
  SpreadsheetApp.getUi().alert(
    'Assignments Summary',
    'Total assignments: ' + count,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Show submissions summary in a dialog
 */
function showSubmissionsSummary() {
  const result = getSubmissions();
  const count = result.data ? result.data.length : 0;
  const graded = result.data ? result.data.filter(function(s) { return s.status === 'graded'; }).length : 0;
  SpreadsheetApp.getUi().alert(
    'Submissions Summary',
    'Total submissions: ' + count + '\nGraded: ' + graded + '\nPending: ' + (count - graded),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
