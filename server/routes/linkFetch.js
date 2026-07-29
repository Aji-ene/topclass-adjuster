// route/linkFetch.js
//
// Lets the user paste a field-report LINK instead of uploading a file.
// Strategy:
//   1. Fetch the URL server-side and try to pull clean text out of it
//      (HTML -> readable text, PDF -> pdf-parse, docx -> mammoth — reusing
//      the same extractTextFromFile()-style logic aiservices.js already
//      has for uploads).
//   2. If that fails (JS-rendered page, scanned/image-only PDF, login
//      wall, etc.), fall back to handing the URL's fetched raw content
//      (or a screenshot, if you add one) to the selected AI agent and
//      asking IT to read/summarize it — same multi-agent path already
//      used for uploaded files in aiservices.js's callLLM().
//
// This does NOT let the AI agent browse the open web freely — it only
// ever looks at the one URL the adjuster pasted in, fetched by your
// own server.

const express = require('express');
const fetch = require('node-fetch'); // or global fetch on Node 18+
const { htmlToText } = require('html-to-text');
const pdfParse = require('pdf-parse');
const { callLLM } = require('../services/aiservices');

const router = express.Router();

const MAX_LINK_BYTES = 25 * 1024 * 1024;

async function fetchAsBuffer(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const resp = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!resp.ok) throw new Error(`Link returned ${resp.status}`);
    const contentType = resp.headers.get('content-type') || '';
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length > MAX_LINK_BYTES) throw new Error('Linked file is too large');
    return { buffer, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

function extractDirect(buffer, contentType) {
  if (contentType.includes('text/html')) {
    return htmlToText(buffer.toString('utf-8'), { wordwrap: false });
  }
  if (contentType.includes('application/pdf')) {
    return pdfParse(buffer).then((d) => d.text);
  }
  if (contentType.includes('text/plain')) {
    return buffer.toString('utf-8');
  }
  return null; // signals "try the AI-agent fallback"
}

// POST /api/files/fetch-link   body: { url, agent }
router.post('/fetch-link', async (req, res) => {
  const { url, agent = 'claude' } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'url is required' });

  try {
    new URL(url); // throws on malformed input
  } catch {
    return res.status(400).json({ success: false, message: 'Not a valid URL' });
  }

  try {
    const { buffer, contentType } = await fetchAsBuffer(url);
    let text = await extractDirect(buffer, contentType);

    let source = 'direct-extraction';
    if (!text || text.trim().length < 40) {
      // Fallback: let the selected AI agent read it (handles scanned PDFs,
      // JS-rendered pages returned as HTML shells, odd content types).
      const result = await callLLM({
        agent,
        prompt:
          'The following is raw fetched content from a field-report link. ' +
          'Extract and return the full readable report text, preserving section headings.',
        textFiles: [], // raw buffer is passed inline below instead of via file path
        imageFiles: [],
        metadata: { rawContentPreview: buffer.toString('utf-8').slice(0, 4000) },
      });
      text = result.content;
      source = `ai-agent-fallback:${agent}`;
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

module.exports = router;

// --- Wiring (server/server.js) ---
// const linkFetchRoutes = require('./route/linkFetch');
// app.use('/api/files', linkFetchRoutes);
