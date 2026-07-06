const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

async function main() {
  try {
    const homeDir = os.homedir();
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
    const dbPath = path.join(appData, 'EGDesk/database/financehub.db');
    
    console.log("Connecting to:", dbPath);
    const db = new Database(dbPath);
    
    const startDate = "2026-05-27";
    const endDate = "2026-06-03";
    const cardCompanyId = "all";
    const cardNumber = "all";
    const searchText = "";

    let query = `SELECT * FROM card_transactions WHERE 1=1`;
    const params = [];
    
    if (startDate) {
      const normalizedStart = startDate.replace(/-/g, ".");
      query += ` AND (approval_date >= ? OR approval_date >= ?)`;
      params.push(startDate, normalizedStart);
    }
    if (endDate) {
      const normalizedEnd = endDate.replace(/-/g, ".");
      query += ` AND (approval_date <= ? OR approval_date <= ?)`;
      params.push(endDate, normalizedEnd);
    }
    if (searchText) {
      query += ` AND merchant_name LIKE ?`;
      params.push(`%${searchText}%`);
    }
    
    // 전체 카운트 구하기
    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as cnt");
    console.log("Executing countQuery:", countQuery);
    console.log("With params:", params);
    
    const totalCount = db.prepare(countQuery).get(...params).cnt;
    console.log("Result totalCount:", totalCount);
    
    db.close();
  } catch (err) {
    console.error("Error executing query:", err);
  }
}

main();
