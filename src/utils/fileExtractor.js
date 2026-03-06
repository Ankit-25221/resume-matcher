/**
 * PDF & Text Extraction Utility
 */

const fs   = require("fs");
const path = require("path");

async function extractTextFromPDF(filePath) {
  try {
    const pdfParse  = require("pdf-parse");
    const dataBuffer = fs.readFileSync(filePath);
    const data       = await pdfParse(dataBuffer);
    return data.text;
  } catch (err) {
    throw new Error(`PDF extraction failed: ${err.message}`);
  }
}

function extractTextFromTXT(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf")                    return await extractTextFromPDF(filePath);
  if (ext === ".txt" || ext === ".text") return extractTextFromTXT(filePath);
  throw new Error(`Unsupported file type: ${ext}`);
}

async function extractTextFromBuffer(buffer, mimetype) {
  if (mimetype === "application/pdf") {
    try {
      const pdfParse = require("pdf-parse");
      const data     = await pdfParse(buffer);
      return data.text;
    } catch (err) {
      throw new Error(`PDF extraction failed: ${err.message}`);
    }
  }
  if (mimetype === "text/plain") return buffer.toString("utf8");
  throw new Error(`Unsupported mimetype: ${mimetype}`);
}

module.exports = { extractText, extractTextFromPDF, extractTextFromBuffer };