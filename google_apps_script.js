// -----------------------------------------------------------------------------
// UBI TECH SUPPORT AI - BACKEND SCRIPT
// -----------------------------------------------------------------------------
// INSTRUCTIONS:
// 1. Paste this code into your Google Apps Script editor (code.gs).
// 2. Click "Save".
// 3. SELECT "checkPermissions" from the function dropdown menu.
// 4. Click "Run" and Authorize the permissions.
// 5. Deploy -> New Deployment.
// -----------------------------------------------------------------------------

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; // <--- REPLACE THIS WITH YOUR SHEET ID IF NOT LINKED
const SHEET_NAME = "Tickets";
const FOLDER_ID = "1LzRc9AXeWAwu4rONAO67bVe7mPxmrbnO"; // The specific Drive Folder ID provided

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
      
      // Ensure the file is viewable by anyone with the link
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        url: file.getUrl() 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet(); // Or openById(SPREADSHEET_ID)
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // ---------------------------------------------------------
    // ACTION: CREATE TICKET
    // ---------------------------------------------------------
    if (action === "create") {
      // Append Row
      // Mapping based on your types:
      // A: ID, B: PID, C: Date, D: Requester, E: PIN, F: Subject, G: Category, H: Description, 
      // I: Technician, J: Location, K: Contact, L: Status, M: Severity, N: TechNotes, 
      // O: Superior, P: SuperiorContact, Q: Log, R: AttachmentURL
      
      sheet.appendRow([
        data.id, 
        data.pid, 
        data.dateCreated, 
        data.requesterEmail, 
        data.employeePin, 
        data.subject, 
        data.category, 
        data.description, 
        data.technician, 
        data.location, 
        data.contactNumber, 
        data.status, 
        data.severity, 
        data.techNotes, 
        data.immediateSuperior, 
        data.superiorContact, 
        data.troubleshootingLog,
        data.attachmentUrl || "" // Column R
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
      
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) { // Col A is ID
           const currentLog = values[i][16]; // Col Q is Log (index 16)
           const newLog = currentLog ? currentLog + "\n" + data.textToAppend : data.textToAppend;
           sheet.getRange(i + 1, 17).setValue(newLog); // set value in Col Q
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
      
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === ticketId) { // Col A
           // Update Status (Col L -> index 11)
           sheet.getRange(i + 1, 12).setValue("Closed");
           
           // Append closing note to Log (Col Q -> index 16)
           const currentLog = values[i][16];
           const closeNote = `[${new Date().toLocaleTimeString()}] Ticket Closed: ${data.reason}`;
           const newLog = currentLog ? currentLog + "\n" + closeNote : closeNote;
           sheet.getRange(i + 1, 17).setValue(newLog);

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const tickets = rows.map(row => {
    return {
      id: row[0],
      pid: row[1],
      dateCreated: row[2],
      requesterEmail: row[3],
      employeePin: row[4],
      subject: row[5],
      category: row[6],
      description: row[7],
      technician: row[8],
      location: row[9],
      contactNumber: row[10],
      status: row[11],
      severity: row[12],
      techNotes: row[13],
      immediateSuperior: row[14],
      superiorContact: row[15],
      troubleshootingLog: row[16],
      attachmentUrl: row[17] // Return attachment URL
    };
  });

  return ContentService.createTextOutput(JSON.stringify(tickets)).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------
// IMPORTANT: RUN THIS FUNCTION MANUALLY ONCE TO AUTHORIZE PERMISSIONS
// ------------------------------------------------------------------
function checkPermissions() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log("Success! Script has access to folder: " + folder.getName());
}