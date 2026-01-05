
// -----------------------------------------------------------------------------
// UBI TECH SUPPORT AI - BACKEND SCRIPT
// VERSION: 4.6 (Audit Logging Fixed)
// -----------------------------------------------------------------------------

const SPREADSHEET_ID = "1F41Jf4o8fJNWA2Laon1FFLe3lWvnqiUOVumUJKG6VMk"; 
const TICKETS_SHEET = "Tickets";
const AUDIT_SHEET = "Audit Logs";

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
     return ContentService.createTextOutput(JSON.stringify({ error: "Server busy." })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "create";
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // =========================================================
    // 📊 LOG AUDIT ACTION
    // =========================================================
    if (action === "logAudit") {
      let sheet = ss.getSheetByName(AUDIT_SHEET);
      if (!sheet) {
        sheet = ss.insertSheet(AUDIT_SHEET);
        sheet.appendRow(["DateTime", "Activity", "UserMessage", "AIMessage"]);
        sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#f8fafc");
        sheet.setFrozenRows(1);
      }
      
      const now = new Date();
      sheet.appendRow([
        now,
        data.activity || "System Event",
        data.userMessage || "",
        data.aiMessage || ""
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================
    // 📝 TICKET CREATION
    // =========================================================
    const sheet = ss.getSheetByName(TICKETS_SHEET) || ss.insertSheet(TICKETS_SHEET);
    if (action === "create") {
      sheet.appendRow([
        data.id, data.dateCreated, data.pid, data.requesterEmail, data.employeePin,
        data.immediateSuperior, data.superiorContact, data.subject, data.category,
        data.description, data.technician, data.location, data.status, data.severity,
        data.contactNumber, data.techNotes, data.troubleshootingLog, data.attachmentUrl || ""
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, id: data.id })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default response for unknown action
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TICKETS_SHEET);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  const data = sheet.getDataRange().getValues();
  const tickets = data.slice(1).map(row => ({
    id: row[0], dateCreated: row[1], pid: row[2], requesterEmail: row[3], employeePin: row[4],
    subject: row[7], category: row[8], description: row[9], technician: row[10],
    location: row[11], status: row[12], severity: row[13]
  }));
  return ContentService.createTextOutput(JSON.stringify(tickets)).setMimeType(ContentService.MimeType.JSON);
}
