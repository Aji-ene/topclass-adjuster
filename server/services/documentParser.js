// services/documentParser.js
const fs = require('fs-extra');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

/**
 * Parse document content based on file extension
 * @param {string} filePath - Path to the document
 * @returns {Promise<string>} - Text content of the document
 */
exports.parseDocument = async (filePath) => {
  if (!filePath) {
    throw new Error('File path is required');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const extension = path.extname(filePath).toLowerCase();
  
  try {
    switch (extension) {
      case '.docx':
        return await parseDocx(filePath);
      case '.pdf':
        return await parsePdf(filePath);
      case '.txt':
        return await parseTxt(filePath);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  } catch (error) {
    console.error(`Error parsing ${extension} file:`, error);
    throw new Error(`Failed to parse ${extension} file: ${error.message}`);
  }
};

/**
 * Parse .docx file
 * @param {string} filePath - Path to the .docx file
 * @returns {Promise<string>} - Text content of the document
 */
async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({
    path: filePath
  });
  return result.value;
}

/**
 * Parse .pdf file
 * @param {string} filePath - Path to the .pdf file
 * @returns {Promise<string>} - Text content of the document
 */
async function parsePdf(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * Parse .txt file
 * @param {string} filePath - Path to the .txt file
 * @returns {Promise<string>} - Text content of the document
 */
async function parseTxt(filePath) {
  const data = await fs.readFile(filePath, 'utf8');
  return data;
}

