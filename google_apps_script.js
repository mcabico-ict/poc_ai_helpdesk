
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
//    - Description: "v4 - Column Alignment"
//    - Execute as: **Me** (your email)  <-- CRITICAL for file creation
//    - Who has access: **Anyone**       <-- CRITICAL for public access
// -----------------------------------------------------------------------------

const SPREADSHEET_ID = "1F41Jf4o8fJNWA2Laon1FFLe3lWvnqiUOVumUJKG6VMk"; 
const SHEET_NAME = "Tickets";
const FOLDER_ID = "1LzRc9AXeWAwu4rONAO67bVe7mPxmrbnO"; 

// RUN THIS ONCE TO AUTHORIZE PERMISSIONS
function setup() {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log("Access to folder confirmed: " + folder.getName());
    SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log("Access to sheet confirmed.");
    Logger.log("Permissions authorized! You can now Deploy.");
  } catch (e) {
    Logger.log("Error during setup: " + e.toString());
    Logger.log("Please ensure appsscript.json has the correct oauthScopes and you have Edit access to the Drive Folder/Sheet.");
  }
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
      // NEW COLUMN ORDER (18 Columns):
      // A: id
      // B: dateCreated
      // C: pid
      // D: requesterEmail
      // E: employeePin
      // F: immediateSuperior
      // G: superiorContact
      // H: subject
      // I: category
      // J: description
      // K: technician
      // L: location
      // M: status
      // N: severity
      // O: contactNumber
      // P: techNotes
      // Q: troubleshootingLog
      // R: attachments

      sheet.appendRow([
        data.id,               // A
        data.dateCreated,      // B
        data.pid,              // C
        data.requesterEmail,   // D
        data.employeePin,      // E
        data.immediateSuperior,// F
        data.superiorContact,  // G
        data.subject,          // H
        data.category,         // I
        data.description,      // J
        data.technician,       // K
        data.location,         // L
        data.status,           // M
        data.severity,         // N
        data.contactNumber,    // O
        data.techNotes,        // P
        data.troubleshootingLog,// Q
        data.attachmentUrl || "" // R
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
      
      // Troubleshooting Log is now Column Q (17th column)
      // Array index is 16. Sheet column index is 17.
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
      
      // Status is Column M (13th column) -> Index 12 -> Sheet Col 13
      // Log is Column Q (17th column) -> Index 16 -> Sheet Col 17
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

  // Map columns to JSON object based on NEW structure
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
      attachmentUrl: row[17]    // R (New)
    };
  });

  return ContentService.createTextOutput(JSON.stringify(tickets)).setMimeType(ContentService.MimeType.JSON);
}
