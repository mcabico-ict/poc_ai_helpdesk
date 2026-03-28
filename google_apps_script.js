
// UBI Tech Support AI Backend
const SPREADSHEET_ID = "1F41Jf4o8fJNWA2Laon1FFLe3lWvnqiUOVumUJKG6VMk"; 
const TICKETS_SHEET = "Tickets";
const AUDIT_SHEET = "Audit Logs";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (data.action === "logAudit") {
      let sheet = ss.getSheetByName(AUDIT_SHEET) || ss.insertSheet(AUDIT_SHEET);
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["DateTime", "Activity", "UserMessage", "AIMessage"]).getRange(1,1,1,4).setFontWeight("bold");
      }
      sheet.appendRow([new Date(), data.activity, data.userMessage || "", data.aiMessage || ""]);
      return ContentService.createTextOutput("Logged").setMimeType(ContentService.MimeType.TEXT);
    }

    if (data.action === "create") {
      let sheet = ss.getSheetByName(TICKETS_SHEET) || ss.insertSheet(TICKETS_SHEET);
      sheet.appendRow([data.id, data.dateCreated, data.pid, data.requesterEmail, data.employeePin, data.subject, data.category, data.description, data.technician, data.location, data.status, data.severity, data.contactNumber]);
      return ContentService.createTextOutput("Created").setMimeType(ContentService.MimeType.TEXT);
    }
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // If the user visits ?page=tech, show the dashboard
  if (e && e.parameter && e.parameter.page === 'tech') {
    return HtmlService.createHtmlOutputFromFile('TechDashboard')
      .setTitle('UBI IT Technician Terminal')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Default: Return JSON for the React App
  const sheet = ss.getSheetByName(TICKETS_SHEET);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Server-side functions for the Tech Dashboard
 */
function getTechData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ticketSheet = ss.getSheetByName(TICKETS_SHEET);
    if (!ticketSheet) throw new Error("Sheet '" + TICKETS_SHEET + "' not found.");
    
    const tickets = ticketSheet.getDataRange().getValues();
    if (tickets.length < 2) return { tickets: [], stats: { closedMonth: 0, openTotal: 0, stale24h: 0, techs: {} }, userEmail: Session.getActiveUser().getEmail() };
    
    const headers = tickets[0];
    const rows = tickets.slice(1);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let stats = {
      closedMonth: 0,
      openTotal: 0,
      stale24h: 0,
      techs: {}
    };

    const data = rows.map(row => {
      let t = {};
      headers.forEach((h, i) => t[h] = row[i]);
      
      const createdDate = new Date(t.dateCreated);
      const isClosed = t.status === 'Done' || t.status === 'Closed';
      const isOpen = t.status === 'Open' || t.status === 'In-Progress';
      
      if (isClosed && createdDate >= startOfMonth) stats.closedMonth++;
      if (isOpen) stats.openTotal++;
      if (isOpen && (now - createdDate) > (24 * 60 * 60 * 1000)) stats.stale24h++;
      
      const tech = t.technician || 'Unassigned';
      if (!stats.techs[tech]) stats.techs[tech] = { closedToday: 0, open: 0 };
      if (isOpen) stats.techs[tech].open++;
      if (isClosed && createdDate >= startOfDay) stats.techs[tech].closedToday++;

      return t;
    });

    return {
      tickets: data.reverse(),
      stats: stats,
      userEmail: Session.getActiveUser().getEmail() || "Unknown User"
    };
  } catch (e) {
    throw new Error("Backend Error: " + e.message);
  }
}

function closeTicket(ticketId, reason) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TICKETS_SHEET);
  const data = sheet.getDataRange().getValues();
  const idCol = data[0].indexOf('id');
  const statusCol = data[0].indexOf('status');
  const notesCol = data[0].indexOf('techNotes');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol].toString() === ticketId.toString()) {
      sheet.getRange(i + 1, statusCol + 1).setValue('Closed');
      sheet.getRange(i + 1, notesCol + 1).setValue(reason);
      return true;
    }
  }
  return false;
}

function assignTicket(ticketId, techEmail) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TICKETS_SHEET);
  const data = sheet.getDataRange().getValues();
  const idCol = data[0].indexOf('id');
  const techCol = data[0].indexOf('technician');
  const statusCol = data[0].indexOf('status');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol].toString() === ticketId.toString()) {
      sheet.getRange(i + 1, techCol + 1).setValue(techEmail);
      sheet.getRange(i + 1, statusCol + 1).setValue('In-Progress');
      return true;
    }
  }
  return false;
}
