
// -----------------------------------------------------------------------------
// UBI TECH SUPPORT AI - BACKEND SCRIPT
// VERSION: 2.1 (Soft Setup & Strict Columns)
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
  Logger.log("--- STARTING SETUP (v2.1) ---");
  
  // SOFT CHECK: We catch errors here to avoid 'Server Error' crashing the setup process.
  // This allows the permissions dialog to trigger if needed, but proceeds even if Folder check is flaky in Editor.
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log("✅ SUCCESS: Connected to Drive Folder '" + folder.getName() + "'");
  } catch (e) {
    Logger.log("⚠️ WARNING: Could not verify Drive Folder in Editor.");
    Logger.log("   Details: " + e.toString());
    Logger.log("   NOTE: This is common in the Script Editor. If you have Edit access, the Web App will likely still work.");
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log("✅ SUCCESS: Connected to Spreadsheet '" + ss.getName() + "'");
  } catch (e) {
    Logger.log("❌ FAILED: Could not access Spreadsheet ID: " + SPREADSHEET_ID);
    Logger.log("   Details: " + e.toString());
  }
  
  Logger.log("--- SETUP FINISHED ---");
  Logger.log("Please proceed to Deploy > New Deployment.");
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
      
      // Ensure public visibility for the AI/User to view it
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
      // STRICT COLUMN ALIGNMENT (18 Columns)
      // Index: 0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16  17
      // Col:   A   B   C   D   E   F   G   H   I   J   K   L   M   N   O   P   Q   R
      
      sheet.appendRow([
        data.id,                 // A: Ticket ID
        data.dateCreated,        // B: Date Created
        data.pid,                // C: Property ID
        data.requesterEmail,     // D: Requester Email
        data.employeePin,        // E: Employee PIN
        data.immediateSuperior,  // F: Immediate Superior
        data.superiorContact,    // G: Superior Contact
        data.subject,            // H: Subject
        data.category,           // I: Category
        data.description,        // J: Description
        data.technician,         // K: Technician
        data.location,           // L: Location
        data.status,             // M: Status
        data.severity,           // N: Severity
        data.contactNumber,      // O: Contact Number
        data.techNotes,          // P: Tech Notes
        data.troubleshootingLog, // Q: Troubleshooting Log
        data.attachmentUrl || "" // R: Attachments (Links)
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
      
      // Target: Column Q (Log) -> Index 17 (1-based in getRange, 16 in array)
      const LOG_COL_INDEX = 17; 

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) { 
           const currentLog = values[i][16]; // Col Q is index 16
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
      
      // Target: Column M (Status) -> Index 13 (1-based)
      // Target: Column Q (Log) -> Index 17 (1-based)
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
