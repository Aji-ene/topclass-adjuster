// routes/collaboration-routes.js
//
// Two new endpoints to mount alongside the existing /api/files router:
//   POST /api/files/letterhead-rewrite
//   POST /api/files/collaborate
//
// Both accept multipart/form-data (files + a JSON "metadata" field),
// matching the pattern already used by /api/files/process-files.

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { rewriteToLetterhead, runCollaboration } = require('../services/aiService');

const upload = multer({ dest: 'uploads/tmp/' }); // reuse whatever storage config the app already uses

// -----------------------------------------------------------------
// POST /api/files/letterhead-rewrite
//
// fields (multipart/form-data):
//   letterhead        (file, required on first call — the official letterhead template)
//   letterheadImages   (file[], optional — if the letterhead is a scan/image)
//   fieldReports       (file[], required — one or many field reports)
//   policyDocument     (file, optional)
//   endorsement        (file, optional)
//   additionalDocs     (file[], optional)
//   photos             (file[], optional)
//   instructions       (string, optional — free-form ask, e.g. "add a paragraph on X")
//   sessionId          (string, optional — pass back the sessionId returned from a
//                        prior call in this thread to continue the same conversation)
//   isFollowUp         ('true'/'false' string, optional)
//   agent              ('claude'|'chatgpt'|'grok'|'gemini', default 'claude')
//   metadata           (JSON string: claimNumber, policyNumber, insuredName,
//                        dateOfLoss, locationOfLoss, classOfBusiness)
// -----------------------------------------------------------------
router.post(
  '/letterhead-rewrite',
  upload.fields([
    { name: 'letterhead', maxCount: 1 },
    { name: 'letterheadImages', maxCount: 10 },
    { name: 'fieldReports', maxCount: 10 },
    { name: 'policyDocument', maxCount: 1 },
    { name: 'endorsement', maxCount: 1 },
    { name: 'additionalDocs', maxCount: 20 },
    { name: 'photos', maxCount: 30 },
  ]),
  async (req, res) => {
    try {
      const files = req.files || {};
      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
      const agent = req.body.agent || 'claude';
      const isFollowUp = req.body.isFollowUp === 'true';
      const sessionId = req.body.sessionId || undefined;
      const instructions = req.body.instructions || '';

      const pathsOf = (arr) => (arr || []).map(f => f.path);

      const result = await rewriteToLetterhead({
        agent,
        sessionId,
        isFollowUp,
        instructions,
        metadata,
        letterheadFiles: pathsOf(files.letterhead).filter(p =>
          !/\.(jpe?g|png|gif|webp)$/i.test(p)
        ),
        letterheadImages: [
          ...pathsOf(files.letterhead).filter(p => /\.(jpe?g|png|gif|webp)$/i.test(p)),
          ...pathsOf(files.letterheadImages),
        ],
        fieldReportFiles: pathsOf(files.fieldReports),
        policyFiles: pathsOf(files.policyDocument),
        endorsementFiles: pathsOf(files.endorsement),
        additionalFiles: pathsOf(files.additionalDocs),
        photoFiles: pathsOf(files.photos),
      });

      res.json({ success: true, report: result.content, sessionId: result.sessionId });
    } catch (err) {
      console.error('Letterhead rewrite error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// -----------------------------------------------------------------
// POST /api/files/collaborate
//
// fields (multipart/form-data):
//   prompt         (string, required — the task for the agents)
//   agents         (JSON array string, e.g. '["claude","chatgpt","grok"]')
//   discuss        ('true'/'false' string — parallel vs sequential-discussion mode)
//   rounds         (number, optional, default 2, only used when discuss=true)
//   synthesizerAgent (string, optional — which agent writes the final merged answer)
//   sessionId      (string, optional — continue an existing collaboration thread)
//   documents      (file[], optional — shared context documents for all agents)
//   photos         (file[], optional)
//   metadata       (JSON string, optional — claim fields)
// -----------------------------------------------------------------
router.post(
  '/collaborate',
  upload.fields([
    { name: 'documents', maxCount: 20 },
    { name: 'photos', maxCount: 30 },
  ]),
  async (req, res) => {
    try {
      const files = req.files || {};
      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
      const agents = req.body.agents ? JSON.parse(req.body.agents) : ['claude', 'chatgpt'];
      const discuss = req.body.discuss === 'true';
      const rounds = req.body.rounds ? parseInt(req.body.rounds, 10) : 2;
      const synthesizerAgent = req.body.synthesizerAgent || undefined;
      const sessionId = req.body.sessionId || undefined;
      const prompt = req.body.prompt;

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ success: false, message: 'A prompt is required' });
      }
      if (!agents.length) {
        return res.status(400).json({ success: false, message: 'Select at least one AI agent' });
      }

      const pathsOf = (arr) => (arr || []).map(f => f.path);

      const result = await runCollaboration({
        agents,
        discuss,
        rounds,
        synthesizerAgent,
        prompt,
        sessionId,
        metadata,
        textFiles: pathsOf(files.documents),
        imageFiles: pathsOf(files.photos),
      });

      res.json({ success: true, ...result });
    } catch (err) {
      console.error('Collaboration error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;

// In your main files router (e.g. routes/files.js) or app.js, mount this with:
//   const collaborationRoutes = require('./routes/collaboration-routes');
//   app.use('/api/files', collaborationRoutes);
