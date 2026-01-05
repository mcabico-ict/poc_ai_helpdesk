
// UBI Tech Support AI Backend
const SPREADSHEET_ID = "1F41Jf4o8fJNWA2Laon1FFLe3lWvnqiUOVumUJKG6VMk"; 
const TICKETS_SHEET = "Tickets";
const AUDIT_SHEET = "Audit Logs";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (data.action === "logAudit") {
      let sheet = ss.getSheetByName(AUDIT_SHEET) || ss.insertSheet(AUDIT_SHEET);
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["DateTime", "Activity", "UserMessage", "AIMessage"]).getRange(1,1,1,4).setFontWeight("bold");
      }
      sheet.appendRow([new Date(), data.activity, data.userMessage || "", data.aiMessage || ""]);
      return ContentService.createTextOutput("Logged").setMimeType(ContentService.MimeType.TEXT);
    }

    if (data.action === "create") {
      let sheet = ss.getSheetByName(TICKETS_SHEET) || ss.insertSheet(TICKETS_SHEET);
      sheet.appendRow([data.id, data.dateCreated, data.pid, data.requesterEmail, data.employeePin, data.subject, data.category, data.description, data.technician, data.location, data.status, data.severity, data.contactNumber]);
      return ContentService.createTextOutput("Created").setMimeType(ContentService.MimeType.TEXT);
    }
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TICKETS_SHEET);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
