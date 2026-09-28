const fs = require("fs");
const path = require("path");

const CSV_FILE_PATH = path.join(__dirname, "..", "user_registrations_spreadsheet.csv");

// Initialize CSV header if file doesn't exist
function initCsvFile() {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    const headers = "Timestamp,Full Name,Email Address,Mobile Number,Password,Auth Method\n";
    fs.writeFileSync(CSV_FILE_PATH, headers, "utf8");
  }
}

// Append a new registration or login record to CSV spreadsheet
function logUserToSpreadsheet(userData) {
  try {
    initCsvFile();
    const timestamp = new Date().toLocaleString().replace(/,/g, "");
    const name = (userData.name || "N/A").replace(/,/g, " ");
    const email = (userData.email || "N/A").replace(/,/g, " ");
    const phone = (userData.phone || "N/A").replace(/,/g, " ");
    const password = (userData.password || "N/A (OTP)").replace(/,/g, " ");
    const authMethod = (userData.authMethod || "Registration").replace(/,/g, " ");

    const row = `"${timestamp}","${name}","${email}","${phone}","${password}","${authMethod}"\n`;
    fs.appendFileSync(CSV_FILE_PATH, row, "utf8");
    console.log(`📊 Spreadsheet Updated: Added user "${name}" (${email})`);
  } catch (err) {
    console.error("Error writing to spreadsheet CSV:", err);
  }
}

module.exports = {
  logUserToSpreadsheet
};
