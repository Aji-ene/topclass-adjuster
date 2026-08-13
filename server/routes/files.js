const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const fsSynch = require('fs');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch'); // Standard node-fetch, or uses native global fetch if available
const { htmlToText } = require('html-to-text');
const pdfParse = require('pdf-parse');

const llmService = require('../services/llmService.js');
const reportGenerator = require('../services/reportGenerator.js');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'temp');
    fsSynch.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${Math.trunc(Math.random() * 1e6)}-${file.originalname.replace(/[^a-z0-9.]/gi, '_')}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|docx?|txt|jpe?g|png|gif|xlsx?)$/i.test(file.originalname);
    cb(null, ok);
  }
});

const cpUpload = upload.fields([
  { name: 'questionnaire', maxCount: 1 },
  { name: 'policyDocument', maxCount: 1 },
  { name: 'endorsement', maxCount: 1 },
  { name: 'additionalDocs', maxCount: 12 },
  { name: 'receipts', maxCount: 12 },
  { name: 'photos', maxCount: 50 },
]);

const trainingUpload = upload.fields([
  { name: 'trainingReports', maxCount: 20 }
]);

// Used by /export/docx — the frontend re-submits the same photo File
// objects (same original filenames the LLM was told to cite) alongside the
// report text so they can be embedded into the generated .docx.
const exportUpload = upload.fields([
  { name: 'photos', maxCount: 50 },
]);

const AI_MODELS = {
  claude: {
    scrutiny: 'claude-sonnet-5',
    interim: 'claude-sonnet-5',
    final: 'claude-opus-4-8'
  },
  chatgpt: {
    scrutiny: 'gpt-5',
    interim: 'gpt-5-mini',
    final: 'gpt-5'
  },
  grok: {
    scrutiny: 'grok-4.5',
    interim: 'grok-4.5',
    final: 'grok-4.5'
  },
  gemini: {
    scrutiny: 'gemini-3.1-pro-preview',
    interim: 'gemini-3.5-flash',
    final: 'gemini-3.1-pro-preview'
  }
};

const TEMPERATURE_CONFIG = {
  scrutiny: 0.35,
  interim: 0.5,
  final: 0.6
};

const MAX_TOKENS_CONFIG = {
  scrutiny: 6200,
  interim: 5000,
  final: 8000
};

const MAX_LINK_BYTES = 25 * 1024 * 1024;

// In-memory storage for training reports (use database in production)
let trainingReportsDB = [];

// Helper function to load training reports metadata from file
async function loadTrainingReportsDB() {
  try {
    const dbPath = path.join(process.cwd(), 'uploads', 'training', 'metadata.json');
    const data = await fs.readFile(dbPath, 'utf-8');
    trainingReportsDB = JSON.parse(data);
  } catch (err) {
    console.log('No existing training reports database found, starting fresh');
    trainingReportsDB = [];
  }
}

// Helper function to save training reports metadata to file
async function saveTrainingReportsDB() {
  try {
    const trainingDir = path.join(process.cwd(), 'uploads', 'training');
    await fs.mkdir(trainingDir, { recursive: true });
    const dbPath = path.join(trainingDir, 'metadata.json');
    await fs.writeFile(dbPath, JSON.stringify(trainingReportsDB, null, 2));
  } catch (err) {
    console.error('Error saving training reports database:', err);
  }
}

// Load training reports on startup
loadTrainingReportsDB();

// ────────────────────────────────────────────────
// Upload training reports
// ────────────────────────────────────────────────
router.post('/upload-training', trainingUpload, async (req, res) => {
  try {
    const { metadata } = req.body;

    if (!req.files?.trainingReports || req.files.trainingReports.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No training reports uploaded'
      });
    }

    const parsedMetadata = JSON.parse(metadata);

    if (!parsedMetadata.reportType || !parsedMetadata.classOfBusiness) {
      return res.status(400).json({
        success: false,
        message: 'Report type and class of business are required'
      });
    }

    // Create training directory
    const trainingDir = path.join(process.cwd(), 'uploads', 'training', 'reports');
    await fs.mkdir(trainingDir, { recursive: true });

    // Process each uploaded file
    const uploadedReports = [];

    for (const file of req.files.trainingReports) {
      const reportId = uuidv4();
      const ext = path.extname(file.originalname);
      const newFilename = `${reportId}${ext}`;
      const newPath = path.join(trainingDir, newFilename);

      // Move file to training directory
      await fs.rename(file.path, newPath);

      // Extract text content for training
      const textContent = await llmService.extractTextFromFile(newPath);

      const reportRecord = {
        id: reportId,
        filename: file.originalname,
        storedFilename: newFilename,
        path: newPath,
        reportType: parsedMetadata.reportType,
        classOfBusiness: parsedMetadata.classOfBusiness,
        description: parsedMetadata.description || '',
        author: parsedMetadata.author || '',
        yearWritten: parsedMetadata.yearWritten || new Date().getFullYear(),
        uploadedAt: new Date().toISOString(),
        textContent: textContent.substring(0, 50000), // Store first 50k chars
        fileSize: file.size
      };

      trainingReportsDB.push(reportRecord);
      uploadedReports.push(reportRecord);
    }

    // Save updated database
    await saveTrainingReportsDB();

    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedReports.length} training report(s)`,
      reports: uploadedReports.map(r => ({
        id: r.id,
        filename: r.filename,
        reportType: r.reportType,
        classOfBusiness: r.classOfBusiness
      }))
    });

  } catch (err) {
    console.error('Error uploading training reports:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to upload training reports'
    });
  }
});

// ────────────────────────────────────────────────
// Get all training reports
// ────────────────────────────────────────────────
router.get('/training-reports', async (req, res) => {
  try {
    // Return metadata only (not full text content)
    const reports = trainingReportsDB.map(r => ({
      id: r.id,
      filename: r.filename,
      reportType: r.reportType,
      classOfBusiness: r.classOfBusiness,
      description: r.description,
      author: r.author,
      yearWritten: r.yearWritten,
      uploadedAt: r.uploadedAt,
      fileSize: r.fileSize
    }));

    res.json({
      success: true,
      reports: reports
    });
  } catch (err) {
    console.error('Error fetching training reports:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch training reports'
    });
  }
});

// ────────────────────────────────────────────────
// Delete a training report
// ────────────────────────────────────────────────
router.delete('/training-reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const reportIndex = trainingReportsDB.findIndex(r => r.id === id);

    if (reportIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Training report not found'
      });
    }

    const report = trainingReportsDB[reportIndex];

    // Delete the file
    try {
      await fs.unlink(report.path);
    } catch (err) {
      console.warn('Could not delete file:', err);
    }

    // Remove from database
    trainingReportsDB.splice(reportIndex, 1);
    await saveTrainingReportsDB();

    res.json({
      success: true,
      message: 'Training report deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting training report:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete training report'
    });
  }
});

// ────────────────────────────────────────────────
// Fetch field report content from a link
// ────────────────────────────────────────────────
router.post('/fetch-link', async (req, res) => {
  const { url, agent = 'claude' } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'url is required' });

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ success: false, message: 'Not a valid URL' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const resp = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`Link returned ${resp.status}`);

    const contentType = resp.headers.get('content-type') || '';
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length > MAX_LINK_BYTES) throw new Error('Linked file is too large');

    let text = null;
    if (contentType.includes('text/html')) {
      text = htmlToText(buffer.toString('utf-8'), { wordwrap: false });
    } else if (contentType.includes('application/pdf')) {
      text = (await pdfParse(buffer)).text;
    } else if (contentType.includes('text/plain')) {
      text = buffer.toString('utf-8');
    }

    let source = 'direct-extraction';
    if (!text || text.trim().length < 40) {
      // Fallback: save the buffer to a temp file and let the same
      // extractTextFromFile()/callLLM() path take a shot at it
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const tempPath = path.join(tempDir, `${uuidv4()}-link-fetch`);
      await fs.writeFile(tempPath, buffer);

      const extracted = await llmService.extractTextFromFile(tempPath).catch(() => null);

      // Cleanup the temporary fallback fetch file
      fs.unlink(tempPath).catch(() => {});

      if (extracted && extracted.trim().length >= 40) {
        text = extracted;
        source = 'file-extraction-fallback';
      } else {
        const result = await llmService.callLLM({
          agent,
          model: AI_MODELS[agent]?.scrutiny,
          prompt:
            'The following is raw fetched content from a field-report link. ' +
            'Extract and return the full readable report text, preserving section headings.\n\n' +
            buffer.toString('utf-8').slice(0, 8000),
          textFiles: [],
          imageFiles: [],
        });
        text = result.content;
        source = `ai-agent-fallback:${agent}`;
      }
    }

    res.json({ success: true, text, source, contentType });
  } catch (err) {
    console.error('Error fetching field-report link:', err);
    res.status(502).json({
      success: false,
      message: `Could not read that link: ${err.message}. Try uploading the document instead.`,
    });
  }
});

// ────────────────────────────────────────────────
// Process files and generate report (with training support & link field reports)
// ────────────────────────────────────────────────
router.post('/process-files', cpUpload, async (req, res) => {
  let fieldReportTempPath = null;
  try {
    const {
      reportType,
      classOfBusiness,
      aiAgent,
      claimNumber = '',
      policyNumber = '',
      insuredName = '',
      dateOfLoss = '',
      locationOfLoss = '',
      lossDescription = '',
      headlines,
      excludePhotosFromAI = 'false',
      customScrutinyPrompt = '',
      interviews = '[]',
      useTraining = 'true',
      fieldReportText,
      fieldReportSourceUrl,
    } = req.body;

    if (!reportType || !classOfBusiness || !aiAgent) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reportType, classOfBusiness, or aiAgent'
      });
    }

    if (!['scrutiny', 'interim', 'final'].includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reportType. Must be: scrutiny, interim, or final'
      });
    }

    if (!['claude', 'chatgpt', 'grok', 'gemini'].includes(aiAgent)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid aiAgent. Must be: claude, chatgpt, grok, or gemini'
      });
    }

    if (!req.files?.questionnaire?.[0] && !fieldReportText) {
      return res.status(400).json({
        success: false,
        message: 'Field report is required (upload a file or provide a link)'
      });
    }

    if (reportType === 'final' && !req.files?.policyDocument?.[0]) {
      return res.status(400).json({
        success: false,
        message: 'Policy document is required for final report'
      });
    }

    // A link-sourced field report has no uploaded file — write the extracted
    // text to a temp .txt file so it flows through the standard filesToSend path
    if (!req.files?.questionnaire?.[0] && fieldReportText) {
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      fieldReportTempPath = path.join(tempDir, `${uuidv4()}-field-report-link.txt`);
      const header = fieldReportSourceUrl ? `[Source: ${fieldReportSourceUrl}]\n\n` : '';
      await fs.writeFile(fieldReportTempPath, header + fieldReportText, 'utf-8');
    }

    // Find relevant training reports
    let trainingExamples = [];
    if (useTraining === 'true') {
      trainingExamples = trainingReportsDB.filter(r => 
        r.classOfBusiness === classOfBusiness && 
        r.reportType === reportType
      );

      console.log(`Found ${trainingExamples.length} training examples for ${classOfBusiness} ${reportType}`);
    }

    const metadata = {
      reportType,
      classOfBusiness,
      aiAgent,
      claimNumber: claimNumber.trim() || 'Not provided',
      policyNumber: policyNumber.trim() || 'Not provided',
      insuredName: insuredName.trim() || 'Not provided',
      dateOfLoss: dateOfLoss.trim() || 'Not provided',
      locationOfLoss: locationOfLoss.trim() || 'Not provided',
      lossDescription: lossDescription.trim() || 'Not provided',
      structuredHeadlines: headlines ? JSON.parse(headlines) : [],
      excludePhotos: excludePhotosFromAI === 'true',
      customPrompt: customScrutinyPrompt.trim(),
      interviews: JSON.parse(interviews),
      trainingExamples: trainingExamples,
    };

    let promptFn;
    switch (reportType) {
      case 'scrutiny':
        promptFn = llmService.buildScrutinyPrompt;
        break;
      case 'interim':
        promptFn = llmService.buildPreliminaryPrompt;
        break;
      case 'final':
        promptFn = llmService.buildFinalPrompt;
        break;
      default:
        throw new Error('Invalid report type');
    }

    const model = AI_MODELS[aiAgent]?.[reportType];
    if (!model) {
      return res.status(400).json({
        success: false,
        message: `No model configured for agent: ${aiAgent}, reportType: ${reportType}`
      });
    }

    const prompt = promptFn(metadata);

    const filesToSend = [
      req.files.questionnaire?.[0]?.path || fieldReportTempPath,
      ...(req.files.policyDocument?.[0]
        ? [req.files.policyDocument[0].path]
        : []),
      ...(req.files.endorsement?.[0]
        ? [req.files.endorsement[0].path]
        : []),
      ...(req.files.additionalDocs || []).map(f => f.path),
      ...(req.files.receipts || []).map(f => f.path),
    ].filter(Boolean);

    // Pass both the on-disk path (to read bytes) and the original browser
    // filename (so the "[Photo: ...]" marker the model is shown — and asked
    // to cite in the report — matches what the frontend will re-upload
    // later for DOCX export, not multer's randomized storage filename).
    const images = metadata.excludePhotos
      ? []
      : (req.files.photos || []).map(f => ({ path: f.path, originalName: f.originalname }));

    console.log(`Processing ${reportType} report using ${aiAgent} (${model})`);
    if (trainingExamples.length > 0) {
      console.log(`Using ${trainingExamples.length} training examples`);
    }

    const llmResult = await llmService.callLLM({
      agent: aiAgent,
      model,
      prompt,
      textFiles: filesToSend,
      imageFiles: images,
      temperature: TEMPERATURE_CONFIG[reportType],
      max_tokens: MAX_TOKENS_CONFIG[reportType],
      metadata,
    });

    res.json({
      success: true,
      report: llmResult.content,
      metadata: {
        aiAgent,
        model,
        reportType,
        claimNumber: metadata.claimNumber,
        trainingUsed: trainingExamples.length > 0,
        trainingExamplesCount: trainingExamples.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('Error processing files:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Processing failed',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    // Clean up temporary text file created for link-sourced field reports
    if (fieldReportTempPath) {
      fs.unlink(fieldReportTempPath).catch(err => {
        console.warn('Could not remove temporary field report file:', err);
      });
    }
  }
});

// ────────────────────────────────────────────────
// Rework report based on user feedback
// ────────────────────────────────────────────────
router.post('/rework', async (req, res) => {
  try {
    const {
      currentReport, feedback, aiAgent, reportType,
      classOfBusiness, claimNumber, policyNumber, insuredName,
      dateOfLoss, locationOfLoss, lossDescription,
    } = req.body;

    if (!currentReport || !feedback) {
      return res.status(400).json({ success: false, message: 'currentReport and feedback are required' });
    }
    if (!['claude', 'chatgpt', 'grok', 'gemini'].includes(aiAgent)) {
      return res.status(400).json({ success: false, message: 'Invalid aiAgent' });
    }

    const model = AI_MODELS[aiAgent]?.[reportType] || AI_MODELS[aiAgent]?.final;

    const prompt = `You are revising an already-drafted ${classOfBusiness || ''} insurance loss adjuster's report. Apply ONLY the requested change below — preserve every other section, all figures, and the existing structure, numbering, table formatting, and institutional third-person voice exactly as they are. If the report contains "Photo: <filename> — <caption>" lines, preserve them exactly as they are (filename and caption unchanged) unless the requested change specifically concerns a photo.

CLAIM CONTEXT:
Claim Number: ${claimNumber || 'Not provided'}
Policy Number: ${policyNumber || 'Not provided'}
Insured: ${insuredName || 'Not provided'}
Date of Loss: ${dateOfLoss || 'Not provided'}
Location of Loss: ${locationOfLoss || 'Not provided'}
Loss Description: ${lossDescription || 'Not provided'}

REQUESTED CHANGE:
${feedback}

CURRENT REPORT:
${currentReport}

Return the FULL revised report text, not just the changed section.`;

    const result = await llmService.callLLM({
      agent: aiAgent,
      model,
      prompt,
      textFiles: [],
      imageFiles: [],
    });

    res.json({ success: true, report: result.content });
  } catch (err) {
    console.error('Error reworking report:', err);
    res.status(500).json({ success: false, message: err.message || 'Rework failed' });
  }
});

// ────────────────────────────────────────────────
// Export report as DOCX
// ────────────────────────────────────────────────
// Multipart route: the frontend sends `reportText` and `metadata` (JSON
// string) as regular fields, plus the same `photos` File objects used to
// generate the report, so their original filenames match the
// "Photo: <filename> — <caption>" lines reportGenerator looks for.
router.post('/export/docx', exportUpload, async (req, res) => {
  const photoTempPaths = (req.files?.photos || []).map(f => f.path);

  try {
    const { reportText } = req.body;
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

    if (!reportText) {
      return res.status(400).json({
        success: false,
        message: 'reportText is required'
      });
    }

    const outputDir = path.join(process.cwd(), 'uploads', 'reports');
    await fs.mkdir(outputDir, { recursive: true });

    const safeName = `report-${metadata?.claimNumber || 'gen'}-${Date.now()}.docx`;
    const outputPath = path.join(outputDir, safeName);

    // original filename -> path on disk, for reportGenerator to embed
    const photoMap = {};
    (req.files?.photos || []).forEach(f => {
      photoMap[f.originalname] = f.path;
    });

    await reportGenerator.generateReport(reportText, outputPath, {
      reportType: metadata?.reportType || 'final',
      aiAgent: metadata?.aiAgent || 'unknown',
      claimNumber: metadata?.claimNumber || 'UNKNOWN',
      policyNumber: metadata?.policyNumber || 'UNKNOWN',
      insuredName: metadata?.insuredName || 'UNKNOWN',
      dateOfLoss: metadata?.dateOfLoss || 'UNKNOWN',
      locationOfLoss: metadata?.locationOfLoss || 'UNKNOWN',
      classOfBusiness: metadata?.classOfBusiness || '',
      generatedAt: metadata?.generatedAt || new Date().toISOString(),
    }, photoMap);

    // The photo bytes are already read into the generated .docx buffer at
    // this point, so the temp uploads can be cleaned up now rather than
    // waiting on the download to finish.
    await Promise.all(photoTempPaths.map(p => fs.unlink(p).catch(() => {})));

    res.download(outputPath, safeName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      setTimeout(() => {
        fs.unlink(outputPath).catch(error => {
          console.error('Error deleting temporary file:', error);
        });
      }, 30000);
    });

  } catch (err) {
    console.error('Error exporting DOCX:', err);
    await Promise.all(photoTempPaths.map(p => fs.unlink(p).catch(() => {})));
    res.status(500).json({
      success: false,
      message: err.message || 'Export failed'
    });
  }
});

module.exports = router;
