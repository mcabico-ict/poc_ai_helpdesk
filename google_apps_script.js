
// -----------------------------------------------------------------------------
// UBI TECH SUPPORT AI - BACKEND SCRIPT
// -----------------------------------------------------------------------------
//
// ⚠️ CRITICAL DEPLOYMENT INSTRUCTIONS:
// 1. Paste this code into "code.gs".
// 2. Update "appsscript.json" with the scopes below (Project Settings -> Show manifest).
//    "oauthScopes": [
//      "https://www.googleapis.com/auth/spreadsheets",
//      "https://www.googleapis.com/auth/drive",
//      "https://www.googleapis.com/auth/script.external_request"
//    ]
// 3. RUN THE "setup" FUNCTION manually in the editor to authorize the Drive permissions.
//    (Select "setup" from dropdown -> Click "Run" -> Review Permissions).
// 4. Deploy -> New Deployment -> Select "Web app".
//    - Description: "v5 - Aligned Columns"
//    - Execute as: **Me** (your email)  <-- CRITICAL for file creation
//    - Who has access: **Anyone**       <-- CRITICAL for public access
// -----------------------------------------------------------------------------

const SPREADSHEET_ID = "1F41Jf4o8fJNWA2Laon1FFLe3lWvnqiUOVumUJKG6VMk"; 
const SHEET_NAME = "Tickets";
const FOLDER_ID = "1LzRc9AXeWAwu4rONAO67bVe7mPxmrbnO"; 

// RUN THIS ONCE TO AUTHORIZE PERMISSIONS
function setup() {
  Logger.log("--- STARTING SETUP DIAGNOSTIC ---");
  
  // CHECK 1: DRIVE
  try {
    Logger.log("1. Attempting to access Drive Folder: " + FOLDER_ID);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log("   ✅ SUCCESS: Connected to Folder '" + folder.getName() + "'");
  } catch (e) {
    Logger.log("   ❌ FAILED: Could not access Drive Folder.");
    Logger.log("      Error: " + e.toString());
    Logger.log("      Fix: Check Folder ID, Check Permissions, Ensure 'appsscript.json' includes drive scope.");
  }

  // CHECK 2: SPREADSHEET
  try {
    Logger.log("2. Attempting to access Spreadsheet: " + SPREADSHEET_ID);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log("   ✅ SUCCESS: Connected to Spreadsheet '" + ss.getName() + "'");
  } catch (e) {
    Logger.log("   ❌ FAILED: Could not access Spreadsheet.");
    Logger.log("      Error: " + e.toString());
  }
  
  Logger.log("--- SETUP COMPLETE ---");
  Logger.log("If both succeeded, you are ready to Deploy.");
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "create";

    // ---------------------------------------------------------
    // ACTION: UPLOAD FILE (Base64)
    // ---------------------------------------------------------
    if (action === "upload") {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const contentType = data.mimeType || "application/octet-stream";
      const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData), contentType, data.fileName);
      const file = folder.createFile(blob);
      
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        url: file.getUrl() 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // ---------------------------------------------------------
    // ACTION: CREATE TICKET
    // ---------------------------------------------------------
    if (action === "create") {
      // EXACT COLUMN ORDER REQUESTED:
      // 1. id
      // 2. dateCreated
      // 3. pid
      // 4. requesterEmail
      // 5. employeePin
      // 6. immediateSuperior
      // 7. superiorContact
      // 8. subject
      // 9. category
      // 10. description
      // 11. technician
      // 12. location
      // 13. status
      // 14. severity
      // 15. contactNumber
      // 16. techNotes
      // 17. troubleshootingLog
      // 18. attachments

      sheet.appendRow([
        data.id,                // 1. id
        data.dateCreated,       // 2. dateCreated
        data.pid,               // 3. pid
        data.requesterEmail,    // 4. requesterEmail
        data.employeePin,       // 5. employeePin
        data.immediateSuperior, // 6. immediateSuperior
        data.superiorContact,   // 7. superiorContact
        data.subject,           // 8. subject
        data.category,          // 9. category
        data.description,       // 10. description
        data.technician,        // 11. technician
        data.location,          // 12. location
        data.status,            // 13. status
        data.severity,          // 14. severity
        data.contactNumber,     // 15. contactNumber
        data.techNotes,         // 16. techNotes
        data.troubleshootingLog,// 17. troubleshootingLog
        data.attachmentUrl || "" // 18. attachments
      ]);

      return ContentService.createTextOutput(JSON.stringify({ success: true, id: data.id }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------------------------------
    // ACTION: UPDATE LOG (Append text)
    // ---------------------------------------------------------
    if (action === "updateLog") {
      const ticketId = String(data.ticketId);
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      
      // Troubleshooting Log is Column 17 (Q)
      // Array index is 16.
      const LOG_COL_INDEX = 17; 

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) { // Col A is ID
           const currentLog = values[i][16]; // Index 16 (Col Q)
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
      
      // Status is Column 13 (M)
      // Log is Column 17 (Q)
      const STATUS_COL_INDEX = 13;
      const LOG_COL_INDEX = 17;

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) { // Col A
           sheet.getRange(i + 1, STATUS_COL_INDEX).setValue("Closed"); 
           const currentLog = values[i][16]; // Index 16 (Col Q)
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
      id: row[0],               // 1
      dateCreated: row[1],      // 2
      pid: row[2],              // 3
      requesterEmail: row[3],   // 4
      employeePin: row[4],      // 5
      immediateSuperior: row[5],// 6
      superiorContact: row[6],  // 7
      subject: row[7],          // 8
      category: row[8],         // 9
      description: row[9],      // 10
      technician: row[10],      // 11
      location: row[11],        // 12
      status: row[12],          // 13
      severity: row[13],        // 14
      contactNumber: row[14],   // 15
      techNotes: row[15],       // 16
      troubleshootingLog: row[16], // 17
      attachmentUrl: row[17]    // 18
    };
  });

  return ContentService.createTextOutput(JSON.stringify(tickets)).setMimeType(ContentService.MimeType.JSON);
}
