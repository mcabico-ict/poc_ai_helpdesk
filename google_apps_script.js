
// -----------------------------------------------------------------------------
// UBI TECH SUPPORT AI - BACKEND SCRIPT
// VERSION: 2.2 (Drive Auth Fix)
// -----------------------------------------------------------------------------
//
// ⚠️ CRITICAL SETUP:
// 1. Paste this code.
// 2. Select the function "testDrivePermissions" from the dropdown menu.
// 3. Click "Run".
// 4. A popup will appear. Click "Review Permissions" -> Choose Account -> Allow.
//    (If it says "Unsafe", click Advanced -> Go to ... (unsafe)).
// 5. Once "testDrivePermissions" completes successfully, Deploy -> New Version.
// -----------------------------------------------------------------------------

const SPREADSHEET_ID = "1F41Jf4o8fJNWA2Laon1FFLe3lWvnqiUOVumUJKG6VMk"; 
const SHEET_NAME = "Tickets";
const FOLDER_ID = "1LzRc9AXeWAwu4rONAO67bVe7mPxmrbnO"; 

function testDrivePermissions() {
  Logger.log("--- TESTING DRIVE PERMISSIONS ---");
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log("✅ ACCESS GRANTED to Folder: " + folder.getName());
    
    // Create a temporary file to PROVE write access
    const tempFile = folder.createFile("auth_test.txt", "This verifies the script can write to Drive.");
    Logger.log("✅ WRITE SUCCESS: Created temp file.");
    tempFile.setTrashed(true);
    Logger.log("✅ DELETE SUCCESS: Cleaned up temp file.");
    
    Logger.log("------------------------------------------------");
    Logger.log("🎉 PERMISSIONS ARE GOOD! You can now Deploy.");
    Logger.log("------------------------------------------------");
  } catch (e) {
    Logger.log("❌ FAILED: " + e.toString());
    Logger.log("👉 ACTION: Please ensure 'appsscript.json' has the drive scope and you clicked 'Allow' in the popup.");
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

    // ---------------------------------------------------------
    // ACTION: UPLOAD FILE
    // ---------------------------------------------------------
    if (action === "upload") {
      try {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const contentType = data.mimeType || "application/octet-stream";
        const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData), contentType, data.fileName);
        const file = folder.createFile(blob);
        
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          url: file.getUrl() 
        })).setMimeType(ContentService.MimeType.JSON);
        
      } catch (uploadError) {
        // Detailed error for upload failures
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: "Drive Upload Failed: " + uploadError.toString() 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // ---------------------------------------------------------
    // ACTION: CREATE TICKET
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // ACTION: UPDATE LOG
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // ACTION: CLOSE TICKET
    // ---------------------------------------------------------
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
