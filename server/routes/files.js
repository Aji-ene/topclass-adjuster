// routes/files.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSynch = require('fs');

const router = express.Router();

// Import your LLM service
const { 
  callLLM,
  buildScrutinyPrompt,
  buildPreliminaryPrompt,
  buildFinalPrompt 
} = require('../services/llmService');

// ────────────────────────────────────────────────
// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'temp');
    fsSynch.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${Math.trunc(Math.random()*1e6)}-${file.originalname.replace(/[^a-z0-9.]/gi,'_')}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|docx?|txt|jpe?g|png|gif|xlsx?)$/i.test(file.originalname);
    cb(null, ok);
  }
});

const cpUpload = upload.fields([
  { name: 'questionnaire',   maxCount: 1  },
  { name: 'analyzedFile',    maxCount: 1  },
  { name: 'endorsement',     maxCount: 1  },
  { name: 'additionalDocs',  maxCount: 12 },
  { name: 'photos',          maxCount: 30 },
]);

// ────────────────────────────────────────────────
// Model mapping by AI agent
const AI_MODELS = {
  claude: {
    scrutiny: 'claude-3-5-sonnet-20241022',
    interim: 'claude-3-5-sonnet-20241022',
    final: 'claude-3-opus-20240229'
  },
  chatgpt: {
    scrutiny: 'gpt-4o',
    interim: 'gpt-4o-mini',
    final: 'gpt-4o'
  },
  grok: {
    scrutiny: 'grok-beta',
    interim: 'grok-beta',
    final: 'grok-beta'
  },
  gemini: {
    scrutiny: 'gemini-1.5-pro',
    interim: 'gemini-1.5-flash',
    final: 'gemini-1.5-pro'
  }
};

// Temperature settings by report type
const TEMPERATURE_CONFIG = {
  scrutiny: 0.35,
  interim: 0.5,
  final: 0.6
};

// Max tokens by report type
const MAX_TOKENS_CONFIG = {
  scrutiny: 7200,
  interim: 6000,
  final: 8800
};

// ────────────────────────────────────────────────
router.post('/process-files', cpUpload, async (req, res) => {
  try {
    const {
      reportType,             // scrutiny | interim | final
      classOfBusiness,
      aiAgent,                // claude | chatgpt | grok | gemini
      claimNumber    = '',
      policyNumber   = '',
      insuredName    = '',
      dateOfLoss     = '',
      locationOfLoss = '',
      lossDescription = '',
      headlines,              // JSON string
      excludePhotosFromAI = 'false',
    } = req.body;

    // ─── Validation ────────────────────────────────────────────────
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

    if (!req.files?.questionnaire?.[0]) {
      return res.status(400).json({ 
        success: false, 
        message: 'Field report (questionnaire) is required' 
      });
    }

    if (reportType === 'final' && !req.files?.analyzedFile?.[0]) {
      return res.status(400).json({ 
        success: false, 
        message: 'Policy document is required for final report' 
      });
    }

    // ─── Prepare metadata for LLM ──────────────────────────────────
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
    };

    // ─── Select prompt builder ─────────────────────────────────────
    let promptFn;
    switch (reportType) {
      case 'scrutiny':
        promptFn = buildScrutinyPrompt;
        break;
      case 'interim':
        promptFn = buildPreliminaryPrompt;
        break;
      case 'final':
        promptFn = buildFinalPrompt;
        break;
      default:
        throw new Error('Invalid report type');
    }

    // ─── Select model based on AI agent and report type ───────────
    const model = AI_MODELS[aiAgent]?.[reportType];
    if (!model) {
      return res.status(400).json({
        success: false,
        message: `No model configured for agent: ${aiAgent}, reportType: ${reportType}`
      });
    }

    // ─── Build prompt ──────────────────────────────────────────────
    const prompt = promptFn(metadata);

    // ─── Collect files to send to LLM ──────────────────────────────
    const filesToSend = [
      req.files.questionnaire[0].path,
      ...(reportType === 'final' && req.files.analyzedFile?.[0] 
          ? [req.files.analyzedFile[0].path] 
          : []),
      ...(req.files.endorsement?.[0] 
          ? [req.files.endorsement[0].path] 
          : []),
      ...(req.files.additionalDocs || []).map(f => f.path),
    ].filter(Boolean);

    // ─── Collect photos if not excluded ────────────────────────────
    const images = metadata.excludePhotos 
      ? [] 
      : (req.files.photos || []).map(f => f.path);

    // ─── Call LLM service ──────────────────────────────────────────
    console.log(`Processing ${reportType} report using ${aiAgent} (${model})`);

    const llmResult = await callLLM({
      agent: aiAgent,
      model,
      prompt,
      textFiles: filesToSend,
      imageFiles: images,
      temperature: TEMPERATURE_CONFIG[reportType],
      max_tokens: MAX_TOKENS_CONFIG[reportType],
    });

    // ─── Return report to frontend ─────────────────────────────────
    res.json({
      success: true,
      report: llmResult.content,
      metadata: {
        aiAgent,
        model,
        reportType,
        claimNumber: metadata.claimNumber,
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
  }
});


// ────────────────────────────────────────────────
// Export report as DOCX
// ────────────────────────────────────────────────
router.post('/export/docx', async (req, res) => {
  try {
    const { reportText, metadata } = req.body;

    if (!reportText) {
      return res.status(400).json({ 
        success: false, 
        message: 'reportText is required' 
      });
    }

    const { generateReport } = require('../services/reportGenerator');

    // Ensure reports directory exists
    const outputDir = path.join(__dirname, '..', 'uploads', 'reports');
    await fs.mkdir(outputDir, { recursive: true });

    // Create safe filename
    const safeName = `report-${metadata?.claimNumber || 'gen'}-${Date.now()}.docx`;
    const outputPath = path.join(outputDir, safeName);

    // Generate the report
    await generateReport(reportText, outputPath, {
      reportType: metadata?.reportType || 'final',
      aiAgent: metadata?.aiAgent || 'unknown',
      claimNumber: metadata?.claimNumber || 'UNKNOWN',
      classOfBusiness: metadata?.classOfBusiness || '',
      generatedAt: metadata?.generatedAt || new Date().toISOString(),
    });

    // Send file to client
    res.download(outputPath, safeName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      // Clean up file after 30 seconds
      setTimeout(() => {
        fs.unlink(outputPath).catch(error => {
          console.error('Error deleting temporary file:', error);
        });
      }, 30000);
    });

  } catch (err) {
    console.error('Error exporting DOCX:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Export failed' 
    });
  }
});

module.exports = router;


