// server/controllers/claimsController.js
const fs = require('fs-extra');
const path = require('path');
const { parseDocument } = require('../services/documentParser');
const { analyzeWithAI } = require('../services/aiService');
const { generateReport, convertReportFormat } = require('../services/reportGenerator');

/**
 * Analyze a claim based on uploaded files
 * @route POST /api/claims/analyze
 */
exports.analyzeClaim = async (req, res) => {
  try {
    const { questionnaireFileId, analyzedFileId } = req.body;

    // Validate input
    if (!questionnaireFileId || !analyzedFileId) {
      return res.status(400).json({
        success: false,
        message: 'Both questionnaire and analyzed file IDs are required',
      });
    }

    // Construct file paths
    const uploadsDir = path.join(__dirname, '../uploads');
    const questionnaireFilePath = path.join(uploadsDir, questionnaireFileId);
    const analyzedFilePath = path.join(uploadsDir, analyzedFileId);

    // Check if files exist
    if (!fs.existsSync(questionnaireFilePath) || !fs.existsSync(analyzedFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'One or both files not found',
      });
    }

    // Parse documents
    const questionnaireContent = await parseDocument(questionnaireFilePath);
    const analyzedContent = await parseDocument(analyzedFilePath);

    // Analyze with AI
    const analysisResult = await analyzeWithAI(questionnaireContent, analyzedContent);

    // Generate report
    const reportFilePath = await generateReport(analysisResult);

    // Respond with report details
    res.status(200).json({
      success: true,
      message: 'Claim analyzed successfully',
      report: {
        id: path.basename(reportFilePath),
        summary: analysisResult.summary,
        fraudRisk: analysisResult.fraudRisk,
        claimValue: analysisResult.claimValue,
        consistencyScore: analysisResult.consistencyScore,
        claimType: analysisResult.claimType,
        recommendations: analysisResult.recommendations,
      },
    });
  } catch (error) {
    console.error('Error analyzing claim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze claim',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
    });
  }
};

/**
 * Get specific claim report details
 * @route GET /api/claims/report/:reportId
 */
exports.getReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const reportPath = path.join(__dirname, '../uploads', reportId);

    // Check if report exists
    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Basic response with report metadata
    // Note: You could enhance this by parsing the report file
    res.status(200).json({
      success: true,
      message: 'Report retrieved successfully',
      report: {
        id: reportId,
        path: reportPath,
        format: path.extname(reportPath).slice(1).toLowerCase(),
        size: (await fs.stat(reportPath)).size,
      },
    });
  } catch (error) {
    console.error('Error retrieving report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
    });
  }
};

/**
 * Convert report to specified format
 * @route POST /api/claims/convert-report
 */
exports.convertReportFormat = async (req, res) => {
  try {
    const { reportId, format } = req.body;

    // Validate input
    if (!reportId || !format) {
      return res.status(400).json({
        success: false,
        message: 'Report ID and format are required',
      });
    }

    const validFormats = ['docx', 'pdf'];
    if (!validFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
      });
    }

    // Construct report path
    const reportPath = path.join(__dirname, '../uploads', reportId);

    // Check if report exists
    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Convert report
    const convertedPath = await convertReportFormat(reportPath, format.toLowerCase());

    res.status(200).json({
      success: true,
      message: `Report converted to ${format} successfully`,
      report: {
        id: path.basename(convertedPath),
        path: convertedPath,
        format: format.toLowerCase(),
        size: (await fs.stat(convertedPath)).size,
      },
    });
  } catch (error) {
    console.error('Error converting report format:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert report format',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
    });
  }
};

module.exports = exports;

