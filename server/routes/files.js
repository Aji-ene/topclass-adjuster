const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const fsSynch = require('fs');
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
  { name: 'photos', maxCount: 30 },
]);

const AI_MODELS = {
  claude: {
    scrutiny: 'claude-sonnet-4-5-20250929',
    interim: 'claude-sonnet-4-5-20250929',
    final: 'claude-opus-4-5-20251101'
  },
  chatgpt: {
    scrutiny: 'gpt-4o',
    interim: 'gpt-4o-mini',
    final: 'gpt-4o'
  },
  grok: {
    scrutiny: 'grok-3',
    interim: 'grok-3',
    final: 'grok-3'
  },
  gemini: {
    scrutiny: 'gemini-2.5-pro',
    interim: 'gemini-3-flash-preview',
    final: 'gemini-2.5-pro'
  }
};

const TEMPERATURE_CONFIG = {
  scrutiny: 0.35,
  interim: 0.5,
  final: 0.6
};

const MAX_TOKENS_CONFIG = {
  scrutiny: 7200,
  interim: 6000,
  final: 8800
};

router.post('/process-files', cpUpload, async (req, res) => {
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

    if (!req.files?.questionnaire?.[0]) {
      return res.status(400).json({
        success: false,
        message: 'Field report (questionnaire) is required'
      });
    }

    if (reportType === 'final' && !req.files?.policyDocument?.[0]) {
      return res.status(400).json({
        success: false,
        message: 'Policy document is required for final report'
      });
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
      req.files.questionnaire[0].path,
      ...(req.files.policyDocument?.[0]
        ? [req.files.policyDocument[0].path]
        : []),
      ...(req.files.endorsement?.[0]
        ? [req.files.endorsement[0].path]
        : []),
      ...(req.files.additionalDocs || []).map(f => f.path),
    ].filter(Boolean);

    const images = metadata.excludePhotos
      ? []
      : (req.files.photos || []).map(f => f.path);

    console.log(`Processing ${reportType} report using ${aiAgent} (${model})`);

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

router.post('/export/docx', async (req, res) => {
  try {
    const { reportText, metadata } = req.body;

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
    });

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
    res.status(500).json({
      success: false,
      message: err.message || 'Export failed'
    });
  }
});

module.exports = router;
