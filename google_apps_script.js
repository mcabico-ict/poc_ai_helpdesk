
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
// 3. RUN THE "setup" FUNCTION manually in the editor.
// 4. Deploy -> New Deployment -> Select "Web app".
//    - Execute as: **Me** (your email)
//    - Who has access: **Anyone**
// -----------------------------------------------------------------------------

const SPREADSHEET_ID = "1F41Jf4o8fJNWA2Laon1FFLe3lWvnqiUOVumUJKG6VMk"; 
const SHEET_NAME = "Tickets";
const FOLDER_ID = "1LzRc9AXeWAwu4rONAO67bVe7mPxmrbnO"; 

function setup() {
  Logger.log("--- STARTING DIAGNOSTIC SETUP ---");
  
  // CHECK 1: GENERAL DRIVE ACCESS (TESTS SCOPE)
  try {
    const root = DriveApp.getRootFolder();
    Logger.log("   ✅ STEP 1 SUCCESS: Drive Scope is Active (Accessed Root Folder).");
  } catch (e) {
    Logger.log("   ❌ STEP 1 FAILED: Script does not have Drive Scope.");
    Logger.log("      FIX: Ensure 'appsscript.json' is updated AND SAVED with the 'https://www.googleapis.com/auth/drive' scope.");
    return; // Exit if basic access fails
  }

  // CHECK 2: SPECIFIC FOLDER ACCESS (TESTS PERMISSIONS/ID)
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log("   ✅ STEP 2 SUCCESS: Connected to Target Folder '" + folder.getName() + "'");
  } catch (e) {
    Logger.log("   ❌ STEP 2 FAILED: Could not access the specific folder ID: " + FOLDER_ID);
    Logger.log("      FIX: Ensure your Google Account has 'Editor' access to this folder link: https://drive.google.com/drive/folders/" + FOLDER_ID);
    Logger.log("      Error Details: " + e.toString());
  }

  // CHECK 3: SPREADSHEET ACCESS
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log("   ✅ STEP 3 SUCCESS: Connected to Spreadsheet '" + ss.getName() + "'");
  } catch (e) {
    Logger.log("   ❌ STEP 3 FAILED: Could not access Spreadsheet ID: " + SPREADSHEET_ID);
  }
  
  Logger.log("--- DIAGNOSTIC COMPLETE ---");
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
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const contentType = data.mimeType || "application/octet-stream";
      const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData), contentType, data.fileName);
      const file = folder.createFile(blob);
      
      // Ensure file is publicly viewable by anyone with the link (so AI/Users can see it)
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
      // COLUMN MAPPING (0-indexed in array, 1-indexed in sheet)
      // A=0: id
      // B=1: dateCreated
      // C=2: pid
      // D=3: requesterEmail
      // E=4: employeePin
      // F=5: immediateSuperior
      // G=6: superiorContact
      // H=7: subject
      // I=8: category
      // J=9: description
      // K=10: technician
      // L=11: location
      // M=12: status
      // N=13: severity
      // O=14: contactNumber
      // P=15: techNotes
      // Q=16: troubleshootingLog
      // R=17: attachments

      sheet.appendRow([
        data.id,                // A
        data.dateCreated,       // B
        data.pid,               // C
        data.requesterEmail,    // D
        data.employeePin,       // E
        data.immediateSuperior, // F
        data.superiorContact,   // G
        data.subject,           // H
        data.category,          // I
        data.description,       // J
        data.technician,        // K
        data.location,          // L
        data.status,            // M
        data.severity,          // N
        data.contactNumber,     // O
        data.techNotes,         // P
        data.troubleshootingLog,// Q
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
      
      // Target: Column Q (Troubleshooting Log) -> Index 17 (1-based)
      const LOG_COL_INDEX = 17; 

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) { 
           const currentLog = values[i][16]; // Array Index 16 is Col Q
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
      
      // Target: Column M (Status) -> Index 13
      // Target: Column Q (Log) -> Index 17
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
      id: row[0],               // A
      dateCreated: row[1],      // B
      pid: row[2],              // C
      requesterEmail: row[3],   // D
      employeePin: row[4],      // E
      immediateSuperior: row[5],// F
      superiorContact: row[6],  // G
      subject: row[7],          // H
      category: row[8],         // I
      description: row[9],      // J
      technician: row[10],      // K
      location: row[11],        // L
      status: row[12],          // M
      severity: row[13],        // N
      contactNumber: row[14],   // O
      techNotes: row[15],       // P
      troubleshootingLog: row[16], // Q
      attachmentUrl: row[17]    // R
    };
  });

  return ContentService.createTextOutput(JSON.stringify(tickets)).setMimeType(ContentService.MimeType.JSON);
}
