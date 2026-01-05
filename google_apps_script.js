
// -----------------------------------------------------------------------------
// UBI TECH SUPPORT AI - BACKEND SCRIPT
// VERSION: 4.3 (Includes Audit Logging)
// -----------------------------------------------------------------------------

const SPREADSHEET_ID = "1F41Jf4o8fJNWA2Laon1FFLe3lWvnqiUOVumUJKG6VMk"; 
const SHEET_NAME = "Tickets";
const AUDIT_SHEET_NAME = "Audit Logs";
const FOLDER_ID = "1LzRc9AXeWAwu4rONAO67bVe7mPxmrbnO"; 

function forceAuth() {
  Logger.log("--- AUTHORIZATION CHECK ---");
  try {
    const limit = DriveApp.getStorageLimit(); 
    Logger.log("✅ Drive Access Verified.");
  } catch (e) {
    Logger.log("⚠️ Result: " + e.toString());
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
     return ContentService.createTextOutput(JSON.stringify({ error: "Server busy." })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "create";

    // =========================================================
    // 📊 AUDIT LOGGING (NEW)
    // =========================================================
    if (action === "logAudit") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let auditSheet = ss.getSheetByName(AUDIT_SHEET_NAME);
      if (!auditSheet) {
        auditSheet = ss.insertSheet(AUDIT_SHEET_NAME);
        auditSheet.appendRow(["DateTime", "Activity", "UserMessage", "AIMessage"]);
        auditSheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#f3f3f3");
      }
      
      auditSheet.appendRow([
        new Date(),
        data.activity || "System",
        data.userMessage || "",
        data.aiMessage || ""
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================
    // 📂 UPLOAD METHOD
    // =========================================================
    if (action === "upload") {
      const contentType = data.mimeType || "application/octet-stream";
      const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData), contentType, data.fileName);
      let file;
      try {
         const folder = DriveApp.getFolderById(FOLDER_ID);
         file = folder.createFile(blob);
      } catch (folderError) {
         file = DriveApp.createFile(blob);
      }
      try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareError) {}
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, url: file.getUrl() })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // =========================================================
    // 📝 CREATE TICKET
    // =========================================================
    if (action === "create") {
      sheet.appendRow([
        data.id, data.dateCreated, data.pid, data.requesterEmail, data.employeePin,
        data.immediateSuperior, data.superiorContact, data.subject, data.category,
        data.description, data.technician, data.location, data.status, data.severity,
        data.contactNumber, data.techNotes, data.troubleshootingLog, data.attachmentUrl || ""
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, id: data.id })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================
    // 🔄 UPDATE LOG
    // =========================================================
    if (action === "updateLog") {
      const ticketId = String(data.ticketId);
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) { 
           const newLog = (values[i][16] || "") + "\n" + data.textToAppend;
           sheet.getRange(i + 1, 17).setValue(newLog);
           return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // =========================================================
    // 🔒 CLOSE TICKET
    // =========================================================
    if (action === "closeTicket") {
      const ticketId = String(data.ticketId);
      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) {
           sheet.getRange(i + 1, 13).setValue("Closed"); 
           const newLog = (values[i][16] || "") + `\n[${new Date().toLocaleTimeString()}] Ticket Closed: ${data.reason}`;
           sheet.getRange(i + 1, 17).setValue(newLog);
           return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  const tickets = rows.map(row => ({
    id: row[0], dateCreated: row[1], pid: row[2], requesterEmail: row[3], employeePin: row[4],
    immediateSuperior: row[5], superiorContact: row[6], subject: row[7], category: row[8],
    description: row[9], technician: row[10], location: row[11], status: row[12],
    severity: row[13], contactNumber: row[14], techNotes: row[15], troubleshootingLog: row[16], attachmentUrl: row[17]
  }));
  return ContentService.createTextOutput(JSON.stringify(tickets)).setMimeType(ContentService.MimeType.JSON);
}
