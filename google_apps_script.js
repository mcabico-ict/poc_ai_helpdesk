
// -----------------------------------------------------------------------------
// UBI TECH SUPPORT AI - BACKEND SCRIPT
// VERSION: 3.0 (Robust Uploads)
// -----------------------------------------------------------------------------

const SPREADSHEET_ID = "1F41Jf4o8fJNWA2Laon1FFLe3lWvnqiUOVumUJKG6VMk"; 
const SHEET_NAME = "Tickets";
const FOLDER_ID = "1LzRc9AXeWAwu4rONAO67bVe7mPxmrbnO"; 

function testDrivePermissions() {
  Logger.log("--- TESTING DRIVE PERMISSIONS ---");
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log("✅ ACCESS GRANTED to Folder: " + folder.getName());
    const tempFile = folder.createFile("auth_test.txt", "Write test.");
    tempFile.setTrashed(true);
    Logger.log("✅ WRITE SUCCESS.");
  } catch (e) {
    Logger.log("❌ FAILED: " + e.toString());
  }
}

function setup() {
  testDrivePermissions();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "create";

    // =========================================================
    // 📂 UPLOAD METHOD IS HERE
    // =========================================================
    if (action === "upload") {
      try {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const contentType = data.mimeType || "application/octet-stream";
        const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData), contentType, data.fileName);
        
        // 1. Create the file in Drive
        const file = folder.createFile(blob);
        let fileUrl = file.getUrl();

        // 2. Try to make it accessible (link sharing)
        // Wrapped in try/catch so it doesn't crash if Org Policy blocks it
        try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (permError) {
            // Fallback: If we can't make it public, just return the private link.
            // The technician can still open it if they have access to the folder.
        }
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          url: fileUrl 
        })).setMimeType(ContentService.MimeType.JSON);
        
      } catch (uploadError) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: "Upload Failed: " + uploadError.toString() 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // =========================================================
    // 📝 CREATE TICKET
    // =========================================================
    if (action === "create") {
      sheet.appendRow([
        data.id,                 // A
        data.dateCreated,        // B
        data.pid,                // C
        data.requesterEmail,     // D
        data.employeePin,        // E
        data.immediateSuperior,  // F
        data.superiorContact,    // G
        data.subject,            // H
        data.category,           // I
        data.description,        // J
        data.technician,         // K
        data.location,           // L
        data.status,             // M
        data.severity,           // N
        data.contactNumber,      // O
        data.techNotes,          // P
        data.troubleshootingLog, // Q
        data.attachmentUrl || "" // R
      ]);

      return ContentService.createTextOutput(JSON.stringify({ success: true, id: data.id }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================
    // 🔄 UPDATE LOG
    // =========================================================
    if (action === "updateLog") {
      const ticketId = String(data.ticketId);
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const LOG_COL_INDEX = 17; 

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) { 
           const currentLog = values[i][16]; 
           const newLog = currentLog ? currentLog + "\n" + data.textToAppend : data.textToAppend;
           sheet.getRange(i + 1, LOG_COL_INDEX).setValue(newLog);
           return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ error: "Ticket not found" })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================
    // 🔒 CLOSE TICKET
    // =========================================================
    if (action === "closeTicket") {
      const ticketId = String(data.ticketId);
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const STATUS_COL_INDEX = 13;
      const LOG_COL_INDEX = 17;

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) {
           sheet.getRange(i + 1, STATUS_COL_INDEX).setValue("Closed"); 
           const currentLog = values[i][16]; 
           const closeNote = `[${new Date().toLocaleTimeString()}] Ticket Closed: ${data.reason}`;
           const newLog = currentLog ? currentLog + "\n" + closeNote : closeNote;
           sheet.getRange(i + 1, LOG_COL_INDEX).setValue(newLog);
           return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ error: "Ticket not found" })).setMimeType(ContentService.MimeType.JSON);
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

  const tickets = rows.map(row => {
    return {
      id: row[0],
      dateCreated: row[1],
      pid: row[2],
      requesterEmail: row[3],
      employeePin: row[4],
      immediateSuperior: row[5],
      superiorContact: row[6],
      subject: row[7],
      category: row[8],
      description: row[9],
      technician: row[10],
      location: row[11],
      status: row[12],
      severity: row[13],
      contactNumber: row[14],
      techNotes: row[15],
      troubleshootingLog: row[16],
      attachmentUrl: row[17]
    };
  });

  return ContentService.createTextOutput(JSON.stringify(tickets)).setMimeType(ContentService.MimeType.JSON);
}
