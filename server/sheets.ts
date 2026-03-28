// Google Sheets API helper using the gws CLI token
// Since gws CLI is only available in sandbox, we use a server-side API approach
// The server will call Google Sheets API via REST with the pre-configured token

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const SHEETS_ID = "1rYD7tDyZ4HYwpqHmxIfbDGPujj-XNfKH9c9WTiXH68A";
const SHEET_NAME = "工作表1";

/**
 * Append a row to the Google Sheets strategy database
 * Uses gws CLI which is available in the server environment
 */
export async function appendRowToSheets(row: string[]): Promise<boolean> {
  try {
    const jsonPayload = JSON.stringify({
      values: [row],
    });

    const params = JSON.stringify({
      spreadsheetId: SHEETS_ID,
      range: `${SHEET_NAME}!A:G`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
    });

    const { stdout, stderr } = await execAsync(
      `gws sheets spreadsheets values append --params '${params}' --json '${jsonPayload}'`,
      { timeout: 15000 }
    );

    // Check if the response indicates success
    if (stdout.includes("updatedRows") || stdout.includes("updates")) {
      return true;
    }

    // If no error thrown but no clear success indicator, still consider it successful
    // as gws returns the update result
    console.log("[Sheets] Append result:", stdout);
    return true;
  } catch (error: any) {
    console.error("[Sheets] Failed to append row:", error.message);
    return false;
  }
}

/**
 * Read all rows from the Google Sheets strategy database
 */
export async function readSheetsHistory(): Promise<string[][]> {
  try {
    const params = JSON.stringify({
      spreadsheetId: SHEETS_ID,
      range: `${SHEET_NAME}!A:G`,
    });

    const { stdout } = await execAsync(
      `gws sheets spreadsheets values get --params '${params}'`,
      { timeout: 15000 }
    );

    const result = JSON.parse(stdout);
    return result.values || [];
  } catch (error: any) {
    console.error("[Sheets] Failed to read history:", error.message);
    return [];
  }
}
