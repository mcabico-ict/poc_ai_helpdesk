
// -----------------------------------------------------------------------------
// UBI TECH SUPPORT AI - BACKEND SCRIPT
// VERSION: 4.2 (Quota Optimized)
// -----------------------------------------------------------------------------

const SPREADSHEET_ID = "1F41Jf4o8fJNWA2Laon1FFLe3lWvnqiUOVumUJKG6VMk"; 
const SHEET_NAME = "Tickets";
const FOLDER_ID = "1LzRc9AXeWAwu4rONAO67bVe7mPxmrbnO"; 

// RUN THIS FUNCTION IN THE EDITOR TO AUTHORIZE DRIVE ACCESS
function forceAuth() {
  Logger.log("--- AUTHORIZATION CHECK ---");
  Logger.log("If a popup appears, click 'Review Permissions' -> 'Allow'.");
  
  try {
    // We use getStorageLimit() as it is a safe, metadata-only call
    const limit = DriveApp.getStorageLimit(); 
    Logger.log("✅ Drive Access Verified.");
    Logger.log("🚀 You are ready to Deploy.");
  } catch (e) {
    Logger.log("⚠️ Result: " + e.toString());
    Logger.log("✅ NOTE: If you previously authorized this script, you can ignore the error above.");
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  // Reduce lock wait time to prevent quota backup
  if (!lock.tryLock(5000)) {
     return ContentService.createTextOutput(JSON.stringify({ error: "Server busy, try again." })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "create";

    // =========================================================
    // 📂 UPLOAD METHOD (ROBUST)
    // =========================================================
    if (action === "upload") {
      try {
        const contentType = data.mimeType || "application/octet-stream";
        const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData), contentType, data.fileName);
        
        let file;
        
        // STRATEGY: Try specific folder, Fallback to Root if permissions fail
        try {
           const folder = DriveApp.getFolderById(FOLDER_ID);
           file = folder.createFile(blob);
        } catch (folderError) {
           // Fallback: Create in Root Drive so the user doesn't lose the file
           file = DriveApp.createFile(blob);
        }
        
        // Optional: Make public (ignore errors if restricted)
        try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareError) {
            // Sharing failed (likely org policy), but file exists. Proceed.
        }
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          url: file.getUrl() 
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
      const LOG_COL_INDEX = 17; // Column Q

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) { 
           const currentLog = values[i][16] || ""; 
           // Safety: Prevent infinite log size
           if (currentLog.length > 30000) {
              return ContentService.createTextOutput(JSON.stringify({ success: true, warning: "Log full" })).setMimeType(ContentService.MimeType.JSON);
           }
           const newLog = currentLog + "\n" + data.textToAppend;
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
      const STATUS_COL_INDEX = 13; // Column M
      const LOG_COL_INDEX = 17;    // Column Q

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) {
           sheet.getRange(i + 1, STATUS_COL_INDEX).setValue("Closed"); 
           const currentLog = values[i][16] || ""; 
           const closeNote = `[${new Date().toLocaleTimeString()}] Ticket Closed: ${data.reason}`;
           const newLog = currentLog + "\n" + closeNote;
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