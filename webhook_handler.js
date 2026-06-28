/**
 * Google Apps Script Webhook Handler for Autonomous AI QA Reviewer
 * Processes multi-agent inference telemetry data and logs it into Google Sheets.
 */
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = e.parameter;
    
    // Extract raw string payload containing inference output
    const fullText = data.strengths || ""; 
    
    let strengthsClean = "";
    let growthClean = "";
    
    // Primary parsing layer: Attempt deterministic JSON parsing with regex text-trimming
    try {
      const cleanJsonText = fullText.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      const parsed = JSON.parse(cleanJsonText);
      strengthsClean = parsed.strengths || "";
      growthClean = parsed.growth_areas || "";
    } catch (jsonError) {
      // Fallback parsing layer: Extract datasets using explicit Regex mapping if LLM misses JSON formatting
      const strengthsMatch = fullText.match(/"strengths":\s*"([\s\S]*?)"/i) || fullText.match(/strengths=([\s\S]*?)(?:,|\s*growth_areas|$)/i);
      const growthMatch = fullText.match(/"growth_areas":\s*"([\s\S]*?)"/i) || fullText.match(/growth_areas=([\s\S]*?)(?:\s*\}|$)/i);
      
      strengthsClean = strengthsMatch ? strengthsMatch[1].trim() : fullText;
      growthClean = growthMatch ? growthMatch[1].trim() : "";
    }
    
    // Data normalization: Clean trailing JSON syntactical artifacts if fallback was triggered
    if (growthClean === "") {
      strengthsClean = strengthsClean.replace(/^\{|^\s*\{\s*|\}\s*$/g, '');
    }
    
    // Commit structured telemetry data to the spreadsheet repository
    sheet.appendRow([
      new Date(),           // Column A: Telemetry Timestamp
      data.tester_name,     // Column B: Engineer Name
      data.artifact_type,   // Column C: Artifact Typology
      data.score,           // Column D: Normalized Evaluation Score
      strengthsClean,       // Column E: Extracted Strengths
      growthClean           // Column F: Identified Growth Areas
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (error) {
    // Graceful error logging and response delivery
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
