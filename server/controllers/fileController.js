


// controllers/fileController.js
const fs = require('fs-extra');
const path = require('path');
const { parseDocument } = require('../services/documentParser');
const { analyzeWithAI } = require('../services/aiService');
const { generateReport } = require('../services/reportGenerator');

// Upload questionnaire file
exports.uploadQuestionnaire = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Return file info
    res.status(200).json({
      success: true,
      message: 'Questionnaire file uploaded successfully',
      file: {
        id: path.basename(req.file.path),
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Error uploading questionnaire:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload questionnaire file',
      error: error.message
    });
  }
};

// Upload analyzed file
exports.uploadAnalyzedFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Return file info
    res.status(200).json({
      success: true,
      message: 'Analyzed file uploaded successfully',
      file: {
        id: path.basename(req.file.path),
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Error uploading analyzed file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload analyzed file',
      error: error.message
    });
  }
};

// Process both files
// controllers/fileController.js

// const fs = require('fs-extra');

// const path = require('path');

// const { parseDocument } = require('../services/documentParser');

// const { generateReport } = require('../services/reportGenerator');


exports.processFiles = async (req, res) => {

  try {

    if (!req.files || !req.files['questionnaire'] || !req.files['analyzedFile']) {

      return res.status(400).json({ success: false, message: 'Both files required' });

    }


    const { reportType } = req.body; // "interim" or "final"

    if (!['interim', 'final'].includes(reportType)) {

      return res.status(400).json({ success: false, message: 'Invalid report type' });

    }


    const questionnaireFilePath = req.files['questionnaire'][0].path;

    const analyzedFilePath = req.files['analyzedFile'][0].path;

    const questionnaireContent = await parseDocument(questionnaireFilePath);

    const analyzedContent = await parseDocument(analyzedFilePath);


    const qText = typeof questionnaireContent === 'string' ? questionnaireContent : questionnaireContent.text || '';

    const aText = typeof analyzedContent === 'string' ? analyzedContent : analyzedContent.text || '';


    const aiService = require('../services/aiService');

    const analysisResult = reportType === 'interim'

      ? await aiService.analyzeInterim(qText, aText)

      : await aiService.analyzeFull(qText, aText);


    console.log(`${reportType} Analysis Result:`, analysisResult);


    const reportFilePath = await generateReport(analysisResult);

    res.status(200).json({

      success: true,

      message: `${reportType} report generated successfully`,

      report: {

        id: path.basename(reportFilePath),

        filename: path.basename(reportFilePath),

        ...analysisResult

      }

    });

  } catch (error) {

    res.status(500).json({ success: false, message: 'Failed to process', error: error.message });

  }

};





// Download generated report
exports.downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { format } = req.query; // 'docx' or 'pdf'
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required'
      });
    }
    
    const filePath = path.join(__dirname, '../uploads', fileId);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // If format conversion is requested
    if (format && ['docx', 'pdf'].includes(format.toLowerCase())) {
      const outputPath = await convertReportFormat(filePath, format.toLowerCase());
      res.download(outputPath);
    } else {
      // Download the original file
      res.download(filePath);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message
    });
  }
};
